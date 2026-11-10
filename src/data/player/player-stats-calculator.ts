/*
 * Copyright (c) 2025. Bindul Bhowmik
 */

import {Frame, TeamPlayerGameScore} from "../league/league-matchup";
import {PlayerStats, RatioGroup} from "./player-stats";
import * as ss from "simple-statistics";
import {accumulateFrameScores, isCleanGame, analyzeStrikes} from "../league/frame-scoring";

class FrameStatCalculator {
    firstBallAccum = 0;
    cleanGameCount = 0;
    hungCount = 0;
    turkeyCount = 0;
    strikeCountAccum = 0;
    strikeOpportunitiesAccum = 0;
    pickedUpSpareAccum = 0;
    spareOpportunitiesAccum = 0;
    pickedUpSinglePinSpareAccum = 0;
    singlePinSpareOppportunitiesAccum = 0;
    pickedUpSplitSpareAccum = 0;
    splitSpareOppportunitiesAccum = 0;
    openFramesAccum = 0;
    totalFramesAccum = 0;
    strikesInARow = new Map<number, number>();
    simulatedScoreSum = 0;
    simulatedScoreCount = 0;
    tenthMarksSum = 0;
    tenthMarkGames = 0;
    splitFrameCount = 0;
    pinfallByFrameSum = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    pinfallByFrameN = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    framePinfallTotal = 0;
    paceFramesSum = [0, 0, 0, 0];
    paceFramesN = [0, 0, 0, 0];
    paceBallsSum = [0, 0, 0, 0];

    private computeAllSinglePinsPickedUpGameScore (game: TeamPlayerGameScore) : number {
        if (game.frames.length === 0) return game.scratchScore;
        const copyFrame = (frame: Frame) : Frame => {
            const nf = new Frame();
            nf.number = frame.number;
            nf.ballScores = frame.ballScores.map(bs => [bs[0], bs[1]]);
            return nf;
        }
        const simulateSinglePinSpare = (frame: Frame, ball: number)=> {
            frame.ballScores[ball - 1][0] = 1;
            frame.ballScores[ball - 1][1] = "/";
        }
        const newFrames : Frame[] = game.frames.map(frame => copyFrame(frame));
        newFrames.forEach(frame => {
            if (frame.ballScores[0][0] == 9 && frame.ballScores[1][0] == 0) simulateSinglePinSpare(frame, 2);
            if (frame.number == 10 && frame.ballScores[0][0] == 10 && frame.ballScores[1][0] == 9 && frame.ballScores[2][0] == 0) simulateSinglePinSpare(frame, 3);
        })
        return accumulateFrameScores(newFrames);
    }

    addGame(game: TeamPlayerGameScore) {
        game.frames.forEach(frame => {
            if (frame.attributes.includes("Hung")) this.hungCount++;
            if (frame.attributes.includes("Turkey")) this.turkeyCount++;
            const ball1Score = frame.ballScores[0][0];
            const ball2Score = frame.ballScores.length > 1 ? frame.ballScores[1][0] : 0;
            const first2BallScores = ball1Score + ball2Score;
            const ball3Score = frame.ballScores.length > 2 ? frame.ballScores[2][0] : 0;
            const frameNum = frame.number;

            this.firstBallAccum += ball1Score;


            // A strike closes the tenth frame even when its bonus spare attempt is missed.
            if (first2BallScores < 10) {
                this.openFramesAccum++;
            }

            if (ball1Score == 10) this.strikeCountAccum++;
            if (frameNum == 10) {
                if (frame.ballScores[1]?.[1] === "X") this.strikeCountAccum++;
                if (frame.ballScores[2]?.[1] === "X") this.strikeCountAccum++;
            }

            if (ball1Score < 10) {
                this.spareOpportunitiesAccum++;
                const singlePin = ball1Score == 9;
                const split = !!(frame.ballScores[0][1] && frame.ballScores[0][1] == "S");
                if (split) this.splitFrameCount++;
                if (singlePin) this.singlePinSpareOppportunitiesAccum++;
                if (split) this.splitSpareOppportunitiesAccum++;
                if (first2BallScores == 10) {
                    this.pickedUpSpareAccum++;
                    if (singlePin) this.pickedUpSinglePinSpareAccum++;
                    if (split) this.pickedUpSplitSpareAccum++;
                }
            }

            if (frameNum == 10) {
                if (ball1Score == 10 && frame.ballScores[1]?.[1] === "X") this.strikeOpportunitiesAccum += 12;
                else if (ball1Score == 10 || first2BallScores == 10) this.strikeOpportunitiesAccum += 11;
                else this.strikeOpportunitiesAccum += 10;

                if (ball1Score == 10 && ball2Score < 10) {
                    this.spareOpportunitiesAccum++;
                    const singlePin = ball2Score == 9;
                    const split = !!(frame.ballScores[1][1] && frame.ballScores[1][1] == "S");
                    if (split) this.splitFrameCount++;
                    if (singlePin) this.singlePinSpareOppportunitiesAccum++;
                    if (split) this.splitSpareOppportunitiesAccum++;
                    if (ball2Score + ball3Score == 10) {
                        this.pickedUpSpareAccum++;
                        if (singlePin) this.pickedUpSinglePinSpareAccum++;
                        if (split) this.pickedUpSplitSpareAccum++;
                    }
                }
            }
        });
        this.totalFramesAccum += game.frames.length;
        for (const [length, count] of analyzeStrikes(game.frames).streaks) {
            this.strikesInARow.set(length, (this.strikesInARow.get(length) ?? 0) + count);
        }
        if (isCleanGame(game.frames)) this.cleanGameCount++;
        this.simulatedScoreSum += this.computeAllSinglePinsPickedUpGameScore(game);
        this.simulatedScoreCount++;
        this.addPaceAndFramePinfall(game);
    }

    private addPaceAndFramePinfall(game: TeamPlayerGameScore) {
        if (game.frames.some((f) => !f.cumulativeScore)) {
            accumulateFrameScores(game.frames);
        }
        const thresholds = [50, 100, 150, 200];
        const reached = [false, false, false, false];
        let prev = 0;
        let balls = 0;
        for (const frame of game.frames) {
            const idx = Math.max(0, Math.min(9, (frame.number || 1) - 1));
            const cum = frame.cumulativeScore || 0;
            const contrib = Math.max(0, cum - prev);
            this.pinfallByFrameSum[idx] += contrib;
            this.pinfallByFrameN[idx] += 1;
            this.framePinfallTotal += contrib;
            balls += frame.ballScores?.length ?? 0;
            for (let t = 0; t < thresholds.length; t++) {
                if (!reached[t] && cum >= thresholds[t]) {
                    reached[t] = true;
                    this.paceFramesSum[t] += frame.number;
                    this.paceFramesN[t] += 1;
                    this.paceBallsSum[t] += balls;
                }
            }
            prev = cum;
        }
        const tenth = game.frames.find((f) => f.number === 10);
        if (tenth) {
            let marks = 0;
            for (const ball of tenth.ballScores) {
                if (ball[1] === "X" || ball[1] === "/") marks++;
            }
            this.tenthMarksSum += marks;
            this.tenthMarkGames += 1;
        }
    }

    getFirstBallAverage() {
        return (this.totalFramesAccum == 0) ? 0 : this.firstBallAccum / this.totalFramesAccum;
    }
}

export function calculatePlayerStats(series: TeamPlayerGameScore[][], stats: PlayerStats, gamesCount = 0) {
    gamesCount = Math.max(gamesCount, ...series.map(games => games.length));
    if (!Number.isSafeInteger(gamesCount) || gamesCount < 0 || gamesCount > 12) throw new Error("Invalid series game count");
    const gameScoresByGame :number[][] = [];
    for (let i = 0; i < gamesCount; i++) gameScoresByGame.push([]);
    const allGameScores : number[] = [];
    const seriesScores :number[] = [];
    const frameStatsCalculator = new FrameStatCalculator();

    series.forEach(serie => {
        let seriesAccum = 0;
        let hasBlind = false;
        for (let i = 0; i < serie.length; i++) {
            const gameScore = serie[i];
            if (!gameScore.blind && !gameScore.vacant) {
                gameScoresByGame[i].push(gameScore.scratchScore);
                allGameScores.push(gameScore.scratchScore);
                seriesAccum += gameScore.scratchScore;
                if (gameScore.scratchScore >= 200) {
                    stats.games200 += 1;
                    if (gameScore.scratchScore == 300) stats.games300 += 1;
                }
                if (gameScore.frames.length > 0) frameStatsCalculator.addGame(gameScore);
                else stats.incompleteFrameData = true;
            } else {
                hasBlind = true
            }
        }
        if (!hasBlind && serie.length > 0) {
            seriesScores.push(seriesAccum);
            if (seriesAccum >= 600) {
                stats.series600 += 1;
                if (seriesAccum >= 800) stats.series800 += 1;
            }
        }
    });

    stats.seriesStats.count = seriesScores.length;
    if (seriesScores.length > 0) {
        stats.seriesStats.min = ss.min(seriesScores);
        stats.seriesStats.max = ss.max(seriesScores);
        stats.seriesStats.average = ss.mean(seriesScores);
        stats.seriesStats.sd = ss.standardDeviation(seriesScores);
    }

    gameScoresByGame.forEach((gameXScore) => {
        stats.gameAverageN.push(gameXScore.length);
        stats.gameAverages.push((gameXScore.length > 0) ? ss.mean(gameXScore) : 0);
    })

    stats.gameStats.count = allGameScores.length;
    if (allGameScores.length > 0) {
        stats.gameStats.min = ss.min(allGameScores);
        stats.gameStats.max = ss.max(allGameScores);
        stats.gameStats.average = ss.mean(allGameScores);
        stats.gameStats.sd = ss.standardDeviation(allGameScores);
        stats.pinfall = ss.sum(allGameScores);
    }

    stats.cleanGames = frameStatsCalculator.cleanGameCount;
    stats.hungCount = frameStatsCalculator.hungCount;
    stats.turkeyCount = frameStatsCalculator.turkeyCount;
    stats.firstBallCount = frameStatsCalculator.totalFramesAccum;
    stats.singlePinGameCount = frameStatsCalculator.simulatedScoreCount;
    stats.firstBallAverage = frameStatsCalculator.getFirstBallAverage();
    stats.strikes = new RatioGroup(frameStatsCalculator.strikeCountAccum, frameStatsCalculator.strikeOpportunitiesAccum);
    stats.spares = new RatioGroup(frameStatsCalculator.pickedUpSpareAccum, frameStatsCalculator.spareOpportunitiesAccum);
    stats.singlePinSpares = new RatioGroup(frameStatsCalculator.pickedUpSinglePinSpareAccum, frameStatsCalculator.singlePinSpareOppportunitiesAccum);
    stats.splits = new RatioGroup(frameStatsCalculator.pickedUpSplitSpareAccum, frameStatsCalculator.splitSpareOppportunitiesAccum);
    stats.opens = new RatioGroup(frameStatsCalculator.openFramesAccum, frameStatsCalculator.totalFramesAccum);
    stats.strikesToSpares = new RatioGroup(frameStatsCalculator.strikeCountAccum, frameStatsCalculator.pickedUpSpareAccum);

    frameStatsCalculator.strikesInARow.forEach((value, key) => {
        stats.strikesInARow.push([key, value]);
    })
    stats.strikesInARow.sort((a, b) => a[0] - b[0]);

    if (frameStatsCalculator.simulatedScoreCount > 0) {
        stats.allSinglePinsPickedUpAverage = frameStatsCalculator.simulatedScoreSum / frameStatsCalculator.simulatedScoreCount;
    }

    stats.avgPinfallPerFrame = frameStatsCalculator.totalFramesAccum > 0
        ? frameStatsCalculator.framePinfallTotal / frameStatsCalculator.totalFramesAccum
        : 0;
    stats.avgTenthMarks = frameStatsCalculator.tenthMarkGames > 0
        ? frameStatsCalculator.tenthMarksSum / frameStatsCalculator.tenthMarkGames
        : 0;
    stats.tenthMarkGames = frameStatsCalculator.tenthMarkGames;
    stats.splitsOccurred = new RatioGroup(frameStatsCalculator.splitFrameCount, frameStatsCalculator.totalFramesAccum);
    stats.framePinfallAvg = frameStatsCalculator.pinfallByFrameSum.map((sum, i) => {
        const n = frameStatsCalculator.pinfallByFrameN[i];
        return n > 0 ? sum / n : 0;
    });
    stats.framePinfallN = [...frameStatsCalculator.pinfallByFrameN];
    stats.paceAvgFrames = frameStatsCalculator.paceFramesSum.map((sum, i) => {
        const n = frameStatsCalculator.paceFramesN[i];
        return n > 0 ? sum / n : 0;
    });
    stats.paceAvgBalls = frameStatsCalculator.paceBallsSum.map((sum, i) => {
        const n = frameStatsCalculator.paceFramesN[i];
        return n > 0 ? sum / n : 0;
    });
    stats.paceN = [...frameStatsCalculator.paceFramesN];
}
