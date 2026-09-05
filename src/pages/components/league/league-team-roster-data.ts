/*
 * Shared week-by-week player series extraction for roster UI © 2026
 */

import type {TrackedLeagueTeam} from "../../../data/league/league-team-details";
import type {LeagueMatchup, LeagueTeamPlayerScore} from "../../../data/league/league-matchup";

export interface PlayerDayData {
    week: number;
    bowlDate: Date;
    enteringAvg: number;
    games: (number | null)[];
    series: number;
    average: number;
    runningAverageAfter: number;
}

export function createGameTableData(
    teamDetails: TrackedLeagueTeam,
    playerId: string
): PlayerDayData[] {
    interface MatchupPlayerScore {
        matchup: LeagueMatchup;
        playerScore: LeagueTeamPlayerScore;
    }

    const currentPlayerAvg =
        teamDetails.roster.find((player) => player.id === playerId)?.playerStats?.gameStats
            .average ?? 0;

    const matchupPlayerScores: MatchupPlayerScore[] = [];
    teamDetails.matchups.forEach((matchup) => {
        const playerScore = matchup.scores?.playerScores.find((ps) => ps.player === playerId);
        if (playerScore && playerScore.games.some(game => !game.blind && !game.vacant)) {
            matchupPlayerScores.push({
                matchup,
                playerScore,
            });
        }
    });

    return matchupPlayerScores.map((mps, idx) => {
        let runningAvgAfter = currentPlayerAvg;
        if (matchupPlayerScores.length > idx + 1) {
            const next = matchupPlayerScores[idx + 1].playerScore;
            if (next.enteringAverage) {
                runningAvgAfter = next.enteringAverage;
            }
        }
        return {
            week: mps.matchup.week,
            bowlDate: mps.matchup.scheduledDate?.toDate() ?? new Date(),
            enteringAvg: mps.playerScore.hdcpSettingDay ? 0 : mps.playerScore.enteringAverage,
            games: mps.playerScore.games.map(game => game.blind || game.vacant ? null : game.scratchScore),
            series: mps.playerScore.series.scratchScore,
            average: mps.playerScore.series.average,
            runningAverageAfter: runningAvgAfter,
        };
    });
}
