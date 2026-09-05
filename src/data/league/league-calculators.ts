import {blindPenalty} from "./blind-penalty";
import {validateFrames} from "../utils/bowling-input";
/*
 * Copyright (c) 2025. Bindul Bhowmik
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {type LeagueAccolade, LeagueDetails} from "./league-details";
import {
    Frame,
    type GameScore,
    LeagueMatchup,
    LeagueTeamPlayerScore, LeagueTeamScore,
    MatchupGameScore, SeriesScore,
    TeamPlayerGameScore, TeamScore
} from "./league-matchup";
import {LeagueBowlingDays, LeagueScoringRules, VacantOrAbsentOpponentScoring} from "./league-setup-config";
import {isNumeric} from "../utils/utils";
import {LeaguePlayer, LeaguePlayerStats, TeamStats, type TrackedLeagueTeam} from "./league-team-details";
import {calculatePlayerStats} from "../player/player-stats-calculator";

// ---------------------------------------------------------------------------------------------------------------------
// Interfaces and Implementations
// ---------------------------------------------------------------------------------------------------------------------

interface HandicapCalculator {
    calculateAverge(games: GameScore[], carryOverPins?: number, carryOverGames?: number): number;
    calculateHandicap(average: number): number;
}

class ZeroHandicapCalculator implements HandicapCalculator {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    calculateHandicap(_average: number): number {
        return 0;
    }

    calculateAverge(games: GameScore[], carryOverPins?: number, carryOverGames?: number): number {
        let pinFall = games.reduce((accum, g) => accum + g.scratchScore, 0);
        let gameCount = games.length;
        if (carryOverPins && carryOverGames) {
            pinFall += carryOverPins;
            gameCount += carryOverGames;
        }
        return pinFall / gameCount;
    }
}

class PercentAverageToTargetHandicapCapculator extends ZeroHandicapCalculator implements HandicapCalculator {
    targetPins: number;
    pctToTarget: number;

    constructor(targetPins: number, pctToTarget: number) {
        super();
        this.targetPins = targetPins;
        this.pctToTarget = pctToTarget;
    }

    calculateHandicap(average: number): number {
        return (average >= this.targetPins) ? 0 : Math.floor((this.targetPins - Math.floor(average)) * (this.pctToTarget / 100));
    }
}

interface PointsCalculator {
    assignPoints(teamScoreA: LeagueTeamScore, teamScoreB: TeamScore): void;
    assignVacantOrAbsentOpponentPoints(teamScoreA: LeagueTeamScore, isVacantTeam: boolean, isAbsentTeam: boolean): void;
}

class PpgPpsPointsCalculator implements PointsCalculator {
    pointsOnGameWin: number;
    pointsOnSeriesWin: number;
    pointsOnGameTie: number;
    pointsOnSeriesTie: number;
    vacantOpponentScoring?: VacantOrAbsentOpponentScoring;
    absentOpponentScoring?: VacantOrAbsentOpponentScoring;
    zeroHandicapCalculator: HandicapCalculator = new ZeroHandicapCalculator();

    constructor(pointsOnGameWin: number, pointsOnGameTie: number, pointsOnSeriesWin: number, pointsOnSeriesTie: number,
                vacantOpponentScoring?: VacantOrAbsentOpponentScoring, absentOpponentScoring?: VacantOrAbsentOpponentScoring) {
        this.pointsOnGameWin = pointsOnGameWin;
        this.pointsOnGameTie = pointsOnGameTie;
        this.pointsOnSeriesWin = pointsOnSeriesWin;
        this.pointsOnSeriesTie = pointsOnSeriesTie;
        this.vacantOpponentScoring = vacantOpponentScoring;
        this.absentOpponentScoring = absentOpponentScoring;
    }

    assignVacantOrAbsentOpponentPoints(teamScoreA: LeagueTeamScore, isVacantTeam: boolean, isAbsentTeam: boolean): void {
        if (isAbsentTeam) {
            this.assignVacantOrAbsentOpporentPoints(teamScoreA, this.absentOpponentScoring);
        } else if (isVacantTeam) {
            this.assignVacantOrAbsentOpporentPoints(teamScoreA, this.vacantOpponentScoring);
        }
    }

    private assignVacantOrAbsentOpporentPoints(teamScoreA: LeagueTeamScore, scoringRules?: VacantOrAbsentOpponentScoring) {
        if (scoringRules?.allowed) {
            if (scoringRules.scoringType === "FORFEIT") {
                // Team gets all the points
                teamScoreA.games.forEach(ga => ga.pointsWon = this.pointsOnGameWin);
                teamScoreA.series.pointsWon = this.pointsOnSeriesWin;
            } else if (scoringRules.scoringType === "POINTS_WITHIN_AVG" && scoringRules.pointsWithinAverageConfig) {
                let targetScore = 0;
                teamScoreA.playerScores.forEach((ps) => {
                    targetScore += ps.enteringHdcp;
                    if (ps.hdcpSettingDay) {
                        // TODO Refactor this to remove handicap calculator dependency when this gets moved to the backend
                        targetScore += this.zeroHandicapCalculator.calculateAverge(ps.games);
                    } else {
                        targetScore += ps.enteringAverage;
                    }
                })
                targetScore -= scoringRules.pointsWithinAverageConfig.pointsWithinTeamAverage;

                teamScoreA.absentVacantHdcpGameTarget = targetScore;
                teamScoreA.absentVacantHdcpSeriesTarget = targetScore * teamScoreA.games.length;

                teamScoreA.games.forEach(ga => {
                    if (ga.hdcpScore >= targetScore) {
                        ga.pointsWon = this.pointsOnGameWin;
                    }
                });
                if (teamScoreA.series.hdcpScore >= (targetScore * teamScoreA.games.length)) {
                    teamScoreA.series.pointsWon = this.pointsOnSeriesWin;
                }
            } else {
                console.error("Unable to assign points for team against absent or vacant ooponent due to invalid or missing config: ", scoringRules);
                throw new Error("Unable to assign points for team against absent or vacant ooponent due to invalid or missing config.");
            }
        }
        // If scoring is not allowed team will get 0 points
    }

    assignPoints(teamScoreA: TeamScore, teamScoreB: TeamScore) {
        teamScoreA.games.forEach((ga: MatchupGameScore, i: number) => {
            const gb = teamScoreB.games[i];
            if (ga.hdcpScore == gb.hdcpScore) {
                ga.pointsWon = this.pointsOnGameTie;
                gb.pointsWon = this.pointsOnGameTie;
            } else if (ga.hdcpScore > gb.hdcpScore) {
                ga.pointsWon = this.pointsOnGameWin;
            } else {
                gb.pointsWon = this.pointsOnGameWin;
            }
        });
        if (teamScoreA.series.hdcpScore == teamScoreB.series.hdcpScore) {
            teamScoreA.series.pointsWon = this.pointsOnSeriesTie;
            teamScoreB.series.pointsWon = this.pointsOnSeriesTie;
        } else if (teamScoreA.series.hdcpScore > teamScoreB.series.hdcpScore) {
            teamScoreA.series.pointsWon = this.pointsOnSeriesWin;
        } else {
            teamScoreB.series.pointsWon = this.pointsOnSeriesWin;
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------------------------------------------------

function selectHandicapCalculator(leagueScoringRules: LeagueScoringRules | undefined): HandicapCalculator {
    const type = leagueScoringRules?.handicap?.type;
    if (type) {
        if (type === "NONE") {
            return new ZeroHandicapCalculator();
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        } else if (type === "PCT_AVG_TO_TGT" && leagueScoringRules.handicap?.pctAvgToTargetConfig) {
            const config = leagueScoringRules.handicap.pctAvgToTargetConfig;
            return new PercentAverageToTargetHandicapCapculator(config.target, config.pctToTarget)
        }
    }
    console.debug("Missing or incorrect handicap calcualtor config, returning Zero Handicap Calculator", leagueScoringRules?.handicap);
    return new ZeroHandicapCalculator();
}

function selectPointsCalculator(leagueScoringRules: LeagueScoringRules | undefined): PointsCalculator {
    const type = leagueScoringRules?.pointScoring?.matchupPointScoringRule;
    if (type) {
        if (type === "PPG_PPS" && leagueScoringRules.pointScoring?.ppgPpsMatchupPointScoringConfig) {
            const config = leagueScoringRules.pointScoring.ppgPpsMatchupPointScoringConfig;
            return new PpgPpsPointsCalculator(config.pointsPerGame, config.pointsPerGameOnTie, config.pointsPerSeries, config.pointsPerSeriesOnTie,
                leagueScoringRules.pointScoring.vacantOpponentScoring, leagueScoringRules.pointScoring.absentOpponentScoring);
        }
    }
    console.debug("Missing or incorrect League Points Calculator, returning O points assignment", leagueScoringRules?.pointScoring);
    return new PpgPpsPointsCalculator(0, 0, 0, 0, undefined, undefined);
}

// ---------------------------------------------------------------------------------------------------------------------
// Loops through leagues
// ---------------------------------------------------------------------------------------------------------------------

export function accumulateFrameScores (frames: Frame[]) {
    const getNextNScores = (frames: Frame[], curIdx: number, count: number): number => {
        let toGet: number = count;
        let accum = 0;
        for (let i = curIdx + 1; i < frames.length && toGet > 0; i++) {
            accum += frames[i].ballScores[0][0];
            toGet--;
            if (toGet > 0 && frames[i].ballScores.length > 1) {
                accum += frames[i].ballScores[1][0];
                toGet--;
            }
        }
        return accum;
    }

    let scoreAccum = 0;
    frames.forEach((currFrame, i) => {
        currFrame.ballScores.forEach((score) => {
            scoreAccum += score[0];
            if (i < 9) {
                // Not the 10th frame
                if (score[1] == "X") {
                    scoreAccum += getNextNScores(frames, i, 2);
                } else if (score[1] == "/") {
                    scoreAccum += getNextNScores(frames, i, 1);
                }
            }
        })
        currFrame.cumulativeScore = scoreAccum;
    });

    return scoreAccum;
}

export function buildFrames(inFrames: string[][]) {
    validateFrames(inFrames);
    const frames: Frame[] = [];
    for (let f = 0; f < inFrames.length; f++) {
        // We assume Frame objects are not set, we set them
        const frame = new Frame();
        frame.number = f + 1;
        const inFrame = inFrames[f];

        for (let b = 0; b < inFrame.length; b++) {
            const lbl = inFrame[b];
            if ((b == 0 || f == 9) && (lbl == "X" || (isNumeric(lbl) && Number(lbl) == 10))) {
                frame.ballScores[b] = [10, "X"];
            } else if (lbl == "F" || lbl == "-") {
                frame.ballScores[b] = [0, lbl];
            } else if (lbl == "/" && b > 0) {
                frame.ballScores[b] = [10 - frame.ballScores[b - 1][0], lbl];
            } else if (lbl.endsWith("S") && (b == 0 || (f == 9 && b < 2))) {
                frame.ballScores[b] = [Number.parseInt(lbl.substring(0, 1)), "S"];
            } else if (isNumeric(lbl)) {
                frame.ballScores[b] = [Number.parseInt(lbl)];
            }
        }
        frames.push(frame);
    }
    return frames;
}

function calculateFrameScores(playerGame: TeamPlayerGameScore, player?: LeaguePlayer) {

    // Build the Frame Objects
    playerGame.frames = buildFrames(playerGame.inFrames);

    // Calculate cumulative scores
    const scoreAccum = accumulateFrameScores(playerGame.frames); // Also sets the cumulative scores
    let strikesInARow = 0;
    let potentialCleanGame = true;
    for (const currFrame of playerGame.frames) {
        currFrame.ballScores.forEach((score) => {
            if (score[1] == "X") {
                strikesInARow++;
            } else {
                strikesInARow = 0;
            }

            // Frame Attributes - Do this inside the ball loop, or it misses turkeys across 9th and 10th frame
            if (strikesInARow == 3) {
                currFrame.attributes.push("Turkey");
            } else if (strikesInARow == 12) {
                currFrame.attributes.push("Perfect-Game");
            }
        })

        // Frame Attributes
        const lastBallLabel = currFrame.ballScores[currFrame.ballScores.length - 1][1];
        if (currFrame.number < 10 && (lastBallLabel == undefined || (lastBallLabel !== "X" && lastBallLabel !== "/"))) {
            // 10th frame is handled below as the last ball may not decide clean game
            potentialCleanGame = false;
        }
        if (currFrame.ballScores.length > 1) {
            if (currFrame.ballScores[1][1] === "/") {
                if (currFrame.ballScores[0][1] === "-") {
                    currFrame.attributes.push("Gutter-Spare");
                } else if (currFrame.ballScores[0][1] === "S") {
                    currFrame.attributes.push("Split-Picked-Up");
                }
            }
            if (currFrame.number == 10 && currFrame.ballScores.length > 2) {
                if (currFrame.ballScores[2][1] === "/") {
                    if (currFrame.ballScores[1][1] === "-") {
                        currFrame.attributes.push("Gutter-Spare");
                    } else if (currFrame.ballScores[1][1] === "S") {
                        currFrame.attributes.push("Split-Picked-Up");
                    }
                }
            }
        }
        if (currFrame.number == 10) {
            if(potentialCleanGame &&
                (currFrame.ballScores[0][1] == "X" || (currFrame.ballScores.length > 1 && currFrame.ballScores[1][1] === "/"))) {
                // Still a clean game if first ball is strike or second is spare
                currFrame.attributes.push("Clean-Game");
            }
            const parkingLotMin = player?.parkingLotThreshold ?? 100; // Default 100
            if (currFrame.cumulativeScore < parkingLotMin) {
                currFrame.attributes.push("Parking-Lot");
            }
        }
    }

    // Set the scratch for the game
    if (playerGame.scratchScore !== 0 && playerGame.scratchScore !== scoreAccum) {
        throw new Error("Supplied scratch score disagrees with frames");
    }
    if (playerGame.scratchScore == 0) {
        playerGame.scratchScore = scoreAccum;
    }
}

function setCrossPlayerFrameAttributes(matchup: LeagueMatchup) {
    const gameCount = matchup.scores?.games.length ?? 0;
    for (let i = 0; i < gameCount; i++) {
        const allPlayerFrames: Frame[][] = [];
        let missingFrames = false;
        matchup.scores?.playerScores.filter(ps => ps.games.length >= (i + 1)).forEach((playerScore) => {
            const gameScore = playerScore.games[i];
            if (!gameScore.blind) {
                if (gameScore.frames.length > 0) {
                    allPlayerFrames.push(gameScore.frames);
                } else {
                    missingFrames = true;
                }
            }
        });
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!missingFrames) {
            const playerCount = allPlayerFrames.length;
            for (let f = 0; f < 10; f++) {
                let xc = 0;
                for (let p = 0; p < playerCount; p++) {
                    if (allPlayerFrames[p][f].ballScores[0][1] === "X") {
                        xc++;
                    }
                }
                if (xc == playerCount) {
                    // Beer frame
                    for (let p = 0; p < playerCount; p++) {
                        allPlayerFrames[p][f].attributes.push("Star");
                    }
                } else if (xc == playerCount - 1) {
                    // Someone got hung
                    for (let p = 0; p < playerCount; p++) {
                        if (allPlayerFrames[p][f].ballScores[0][1] !== "X") {
                            allPlayerFrames[p][f].attributes.push("Hung");
                        }
                    }
                }
            }
        }
    }
}

function calculatePlayerScores(playerScore: LeagueTeamPlayerScore, hdcpCalculator: HandicapCalculator, scoringRules: LeagueScoringRules, player?: LeaguePlayer, penalty = scoringRules.blindPenalty?.defaultPenalty ?? 0) {
    // Handle frames
    for (const game of playerScore.games) {
        if (game.inFrames.length > 0) {
            calculateFrameScores(game, player);
        }
    }

    let hdcp = playerScore.enteringHdcp;
    if (hdcp == 0) {
        // Check if it is handicap setting day
        if (playerScore.hdcpSettingDay) {
            // TODO Handle Carry Over Pins
            hdcp = hdcpCalculator.calculateHandicap(hdcpCalculator.calculateAverge(playerScore.games));
        } else {
            hdcp = hdcpCalculator.calculateHandicap(playerScore.enteringAverage);
        }
        playerScore.enteringHdcp = hdcp;
    }

    // Update scores and series
    let seriesScratch = 0;
    let seriesEffectiveScratch = 0;
    let hdcpSeries = 0;
    let seriesHdcp = 0;
    playerScore.games.forEach(game => {
        game.hdcp = hdcp;
        if (game.blind) {
            // We don't have scratch score
            // Penalty is resolved from recorded absences by the league calculation pass.
            game.effectiveScratchScore = playerScore.enteringAverage - (scoringRules.blindPenalty?.allowed ? penalty : 0);
        } else if (game.vacant && scoringRules.vacancyScore?.allowed) {
            // Vacant position update handicap and score
            game.hdcp = scoringRules.vacancyScore.handicap ?? 0;
            game.effectiveScratchScore = scoringRules.vacancyScore.scratchScore ?? 0;
        } else {
            game.effectiveScratchScore = game.scratchScore;
        }
        game.hdcpScore = game.effectiveScratchScore + game.hdcp;
        seriesScratch += game.scratchScore;
        seriesEffectiveScratch += game.effectiveScratchScore;
        hdcpSeries += game.hdcpScore;
        seriesHdcp += game.hdcp;
    })

    // Update Series
    playerScore.series.scratchScore = seriesScratch;
    playerScore.series.effectiveScratchScore = seriesEffectiveScratch;
    playerScore.series.hdcp = seriesHdcp;
    playerScore.series.hdcpScore = hdcpSeries;
    playerScore.series.average = seriesScratch / playerScore.games.length;
    playerScore.series.games = playerScore.games.length;
}

export function assignScoresAndPoints(matchup: LeagueMatchup, scoringRules: LeagueScoringRules, hdcpCalculator: HandicapCalculator, pointsCalculator: PointsCalculator, teamRoster: LeaguePlayer[], absences = new Map<string, {consecutive: number; total: number}>()): void {
    const teamScores = matchup.scores;
    const addGamesToSeries = (seriesScore: SeriesScore, matchupGames: MatchupGameScore[]) => {
        matchupGames.forEach(game => {
            seriesScore.scratchScore += game.scratchScore;
            seriesScore.effectiveScratchScore += game.effectiveScratchScore;
            seriesScore.hdcpScore += game.hdcpScore;
            seriesScore.hdcp += game.hdcp;
            seriesScore.games++;
        })
    }
    if (teamScores) {
        const getWithSetGameScores = (game: number) => {
            if (teamScores.games.length <= game) {
                for (let i = 0; i < (game - teamScores.games.length + 1); i++) {
                    teamScores.games.push(new MatchupGameScore());
                }
            }
            return teamScores.games[game];
        }

        // Set individual team scores
        teamScores.playerScores.forEach((playerScore) => {
            const player = teamRoster.find(p => p.id === playerScore.player);
            const key = playerScore.player ?? "";
            const previous = absences.get(key) ?? {consecutive: 0, total: 0};
            const missed = playerScore.games.length > 0 && playerScore.games.every(game => game.blind);
            const current = {consecutive: missed ? previous.consecutive + 1 : 0, total: previous.total + (missed ? 1 : 0)};
            absences.set(key, current);
            const penalty = playerScore.games.some(game => game.blind) ? blindPenalty(scoringRules.blindPenalty, current.consecutive, current.total) : 0;
            calculatePlayerScores(playerScore, hdcpCalculator, scoringRules, player, penalty);
        })

        // Calculate Matchup Scores
        teamScores.playerScores.forEach((playerScore) => {
            playerScore.games.forEach((game, g) => {
                const matchupGame = getWithSetGameScores(g);
                matchupGame.scratchScore += game.scratchScore;
                matchupGame.effectiveScratchScore += game.effectiveScratchScore;
                matchupGame.hdcpScore += game.hdcpScore;
                matchupGame.hdcp += game.hdcp;
            })
        })

        // Sum Series
        addGamesToSeries(teamScores.series, teamScores.games);
    }

    if (matchup.opponent?.scores) {
        // Set Handicap and Calculate totals
        matchup.opponent.scores.games.forEach((game) => {
            game.hdcp = matchup.opponent?.teamHdcp ?? 0;
            game.effectiveScratchScore = game.scratchScore;
            game.hdcpScore = game.effectiveScratchScore + game.hdcp;
        })
        // Sum Series
        addGamesToSeries(matchup.opponent.scores.series, matchup.opponent.scores.games);
    }

    // Assign Points
    if (matchup.scores && matchup.opponent) {
        const opponent = matchup.opponent;
        if (opponent.absent || opponent.vacant) {
            pointsCalculator.assignVacantOrAbsentOpponentPoints(matchup.scores, opponent.vacant, opponent.absent);
        } else if (opponent.scores) {
            pointsCalculator.assignPoints(matchup.scores, opponent.scores);
        }

        let pointsWon = 0;
        let pointsLost = 0;
        matchup.scores.games.forEach((game) => {
            pointsWon += game.pointsWon
        });
        pointsWon += matchup.scores.series.pointsWon;
        matchup.opponent.scores?.games.forEach((game) => {
            pointsLost += game.pointsWon;
        });
        pointsLost += matchup.opponent.scores?.series.pointsWon ?? 0;
        matchup.pointsWonLost = [pointsWon, pointsLost];
    }
}

function rollupTeamScoresAndPoints(team: TrackedLeagueTeam) {
    let pointsWon = 0;
    let pointsLost = 0;
    let teamScratch = 0;
    let highGame = 0;
    let highSeries = 0;
    let lowGame: number = Number.MAX_SAFE_INTEGER;
    let lowSeries: number = Number.MAX_SAFE_INTEGER;
    team.matchups.forEach((matchup) => {
        pointsWon += matchup.pointsWonLost[0];
        pointsLost += matchup.pointsWonLost[1];
        if (matchup.scores) {
            const scores = matchup.scores;
            teamScratch += scores.series.effectiveScratchScore;
            if (scores.series.effectiveScratchScore > highSeries) {
                highSeries = scores.series.effectiveScratchScore;
            }
            if (scores.series.effectiveScratchScore < lowSeries) {
                lowSeries = scores.series.effectiveScratchScore;
            }
            scores.games.forEach((game) => {
                if (game.effectiveScratchScore > highGame) {
                    highGame = game.effectiveScratchScore;
                }
                if (game.effectiveScratchScore < lowGame) {
                    lowGame = game.effectiveScratchScore;
                }
            })
        }
    })
    team.pointsWonLost = [pointsWon, pointsLost];
    team.teamStats = new TeamStats();
    team.teamStats.scratchPins = teamScratch;
    team.teamStats.highGame = highGame;
    team.teamStats.highSeries = highSeries;
    team.teamStats.lowGame = lowGame;
    team.teamStats.lowSeries = lowSeries;
}

function calculateLeaguePlayerStats(team: TrackedLeagueTeam, hdcpCalculator: HandicapCalculator, bowlingDays: LeagueBowlingDays | undefined) {
  team.roster.forEach((player) => {
      const playerGames: TeamPlayerGameScore[][] = [];
      team.matchups.forEach((matchup) => {
          const games = matchup.scores?.playerScores.find(ps => ps.player == player.id);
          if (games) {
              playerGames.push(games.games);
          }
      })

      const playerStats = new LeaguePlayerStats();
      // Compute common game stats
      calculatePlayerStats(playerGames, playerStats);

      // Compute League Player Stats
      if (playerStats.gameStats.average > 0 || player.carryOverStats) {
          playerStats.leaguePinfall = playerStats.pinfall;
          playerStats.leagueGames = playerStats.gameStats.count;
          playerStats.leagueAverage = playerStats.gameStats.average;

          // Handle carry over stats from previous half league season
          if (player.carryOverStats) {
              playerStats.leaguePinfall += player.carryOverStats.pins ?? 0;
              playerStats.leagueGames += player.carryOverStats.games ?? 0;

              if (playerStats.leagueGames > 0) {
                  playerStats.leagueAverage = playerStats.leaguePinfall / playerStats.leagueGames;
              }

              if (player.carryOverStats.enteringHdcp && player.carryOverStats.enteringHdcp > 0) {
                  playerStats.leagueHandicap = player.carryOverStats.enteringHdcp;
              }
          }
      }
      if (playerStats.leagueAverage > 0) {
          playerStats.leagueHandicap = hdcpCalculator.calculateHandicap(playerStats.leagueAverage);
          const gamesPerSeries = bowlingDays?.gamesPerWeek ?? 3; // Default 3
          playerStats.averageBoosterSeries = Math.ceil(((Math.floor(playerStats.leagueAverage) + 1) * (playerStats.leagueGames + gamesPerSeries)) - playerStats.leaguePinfall);
      }

      const indGameOverAverage : LeagueAccolade = {type: "IND-GAME-OVER-AVERAGE", who: player.id ?? "UNKNOWN", when: undefined, howMuch: 0, description: ""};
      const indSeriesOverAverage : LeagueAccolade = {type: "IND-SERIES-OVER-AVERAGE", who: player.id ?? "UNKNOWN", when: undefined, howMuch: 0, description: ""};
      team.matchups.forEach((matchup) => {
          const playerScore = matchup.scores?.playerScores.find(ps => ps.player == player.id);
          if (playerScore?.enteringAverage) {
              const enteringAvg = playerScore.enteringAverage;
              playerScore.games.forEach((game) => {
                  if (game.scratchScore - enteringAvg > indGameOverAverage.howMuch) {
                      indGameOverAverage.howMuch = game.scratchScore - enteringAvg;
                      indGameOverAverage.when = matchup.bowlDate;
                      indGameOverAverage.description = String(game.scratchScore) + " - " + String(enteringAvg) + " = " + String(indGameOverAverage.howMuch);
                  }
              })
              if (playerScore.series.scratchScore - (3 * enteringAvg) > indSeriesOverAverage.howMuch) {
                  indSeriesOverAverage.howMuch = playerScore.series.scratchScore - (3 * enteringAvg);
                  indSeriesOverAverage.when = matchup.bowlDate;
                  indSeriesOverAverage.description = String(playerScore.series.scratchScore) + " - "
                      + String(enteringAvg * playerScore.series.games) + " = " + String(indSeriesOverAverage.howMuch);
              }
          }
      })
      if (indGameOverAverage.howMuch > 0) {
          playerStats.bestGameOverAverage = indGameOverAverage;
      }
      if (indSeriesOverAverage.howMuch > 0) {
          playerStats.bestSeriesOverAverage = indSeriesOverAverage;
      }

      player.playerStats = playerStats;
  })
}

function gatherLeagueStatsAndLeaders(league: LeagueDetails) {
    // "IND-SCRATCH-GAME" | "IND-SCRATCH-SERIES" | "TEAM-SCRATCH-GAME" | "TEAM-SCRATCH-SERIES" | "IND-HIGH-AVERAGE" | "IND-GAME-OVER-AVERAGE" | "IND-SERIES-OVER-AVERAGE";
    const indScratchGame : LeagueAccolade = {type: "IND-SCRATCH-GAME", who: "", when: undefined, howMuch: 0, description: ""};
    const indScratchSeries : LeagueAccolade = {type: "IND-SCRATCH-SERIES", who: "", when: undefined, howMuch: 0, description: ""};
    const teamScratchGame : LeagueAccolade = {type: "TEAM-SCRATCH-GAME", who: "", when: undefined, howMuch: 0, description: ""};
    const teamScratchSeries : LeagueAccolade = {type: "TEAM-SCRATCH-SERIES", who: "", when: undefined, howMuch: 0, description: ""};
    const indHighAverage : LeagueAccolade = {type: "IND-HIGH-AVERAGE", who: "", when: undefined, howMuch: 0, description: ""};
    const indGameOverAverage : LeagueAccolade = {type: "IND-GAME-OVER-AVERAGE", who: "", when: undefined, howMuch: 0, description: ""};
    const indSeriesOverAverage : LeagueAccolade = {type: "IND-SERIES-OVER-AVERAGE", who: "", when: undefined, howMuch: 0, description: ""};

    league.teams.forEach((team) => {
        const teamId = team.id ?? "UNKNOWN";
        team.matchups.forEach(matchup => {
            if (matchup.scores) {
                const bowlDate = matchup.bowlDate;
                matchup.scores.games.forEach((teamGame) => {
                    if (teamGame.scratchScore > teamScratchGame.howMuch) {
                        teamScratchGame.who = teamId;
                        teamScratchGame.when = bowlDate;
                        teamScratchGame.howMuch = teamGame.scratchScore;
                    }
                })
                if (matchup.scores.series.scratchScore > teamScratchSeries.howMuch) {
                    teamScratchSeries.who = teamId;
                    teamScratchSeries.when = bowlDate;
                    teamScratchSeries.howMuch = matchup.scores.series.scratchScore
                }

                matchup.scores.playerScores.forEach((playerScore) => {
                    const player = playerScore.player ?? "UNKNOWN";
                    const hdcpSettingDay = playerScore.hdcpSettingDay;
                    const enteringAverage = playerScore.enteringAverage;
                    playerScore.games.forEach((game) => {
                        if (game.scratchScore > indScratchGame.howMuch) {
                            indScratchGame.who = player;
                            indScratchGame.when = bowlDate;
                            indScratchGame.howMuch = game.scratchScore;
                        }
                        if (!hdcpSettingDay && !game.blind && !game.vacant && (game.scratchScore - enteringAverage) > indGameOverAverage.howMuch) {
                            indGameOverAverage.who = player;
                            indGameOverAverage.when = bowlDate;
                            indGameOverAverage.howMuch = game.scratchScore - enteringAverage;
                            indGameOverAverage.description = String(game.scratchScore) + " - " + String(enteringAverage) + " = " + String(indGameOverAverage.howMuch);
                        }
                    });
                    if (playerScore.series.scratchScore > indScratchSeries.howMuch) {
                        indScratchSeries.who = player;
                        indScratchSeries.when = bowlDate;
                        indScratchSeries.howMuch = playerScore.series.scratchScore;
                    }
                    if (!hdcpSettingDay && (playerScore.series.scratchScore - (enteringAverage * playerScore.series.games)) > indSeriesOverAverage.howMuch) {
                        indSeriesOverAverage.who = player;
                        indSeriesOverAverage.when = bowlDate;
                        indSeriesOverAverage.howMuch = playerScore.series.scratchScore - (enteringAverage * playerScore.series.games);
                        indSeriesOverAverage.description = String(playerScore.series.scratchScore) + " - "
                            + String(enteringAverage * playerScore.series.games) + " = " + String(indSeriesOverAverage.howMuch);
                    }
                })
            }
        });
        team.roster.forEach((p) => {
            if (p.playerStats && p.playerStats.gameStats.average > indHighAverage.howMuch) {
                indHighAverage.who = p.id ?? "UNKNOWN";
                indHighAverage.howMuch = p.playerStats.gameStats.average;
            }
        })
    })
    league.leagueAccolades.push(indScratchGame, indScratchSeries, teamScratchGame, teamScratchSeries, indGameOverAverage, indSeriesOverAverage, indHighAverage);
}

export function decorateLeagueDetails (league : LeagueDetails) :LeagueDetails {
    const hdcpCalculator :HandicapCalculator = selectHandicapCalculator(league.scoringRules);
    const pointsCalculator : PointsCalculator = selectPointsCalculator(league.scoringRules);
    // Calculate scores and points
    const scoringRules: LeagueScoringRules = league.scoringRules ?? new LeagueScoringRules(); // Without scoring rules and an empty object to avoid errors, calculations will be off

    league.teams.forEach(team => {
        const absences = new Map<string, {consecutive: number; total: number}>();
        const chronological = [...team.matchups].sort((a,b) => ((a.bowlDate ?? a.scheduledDate)?.valueOf() ?? 0) - ((b.bowlDate ?? b.scheduledDate)?.valueOf() ?? 0));
        chronological.forEach((matchup) => {
            assignScoresAndPoints(matchup, scoringRules, hdcpCalculator, pointsCalculator, team.roster, absences);
            // Cross Player Frame Attributes
            setCrossPlayerFrameAttributes(matchup);
        })
        rollupTeamScoresAndPoints(team);
        // Player Stats
        calculateLeaguePlayerStats(team, hdcpCalculator, league.bowlingDays);
        // Update Team stats from player stats
        const teamStats = team.teamStats;
        if (teamStats) {
            let pc = 0;
            team.roster.forEach((p) => {
                if (pc < scoringRules.lineup && p.status == "REGULAR" && p.playerStats) {
                    const playerStats = p.playerStats;
                    teamStats.average += Math.floor(playerStats.gameStats.average);
                    teamStats.handicap += Math.floor(playerStats.leagueHandicap);
                    pc++;
                }
            });
        }
    })

    // League stats and leaders
    gatherLeagueStatsAndLeaders(league);

    return league;
}
