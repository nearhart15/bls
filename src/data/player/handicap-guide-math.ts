import {calculatePercentageHandicap} from "../league/handicap";
import type {PlayerStats} from "./player-stats";

export const MAX_HANDICAP = 189;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

export function normalizeHandicap(value: number): number {
    return Number.isFinite(value) ? clamp(Math.round(value), 0, MAX_HANDICAP) : 0;
}

export function handicapForAverage(average: number): number {
    return calculatePercentageHandicap(average, 210, 90);
}

/** One whole book average giving this handicap; rounding makes the inverse non-unique. */
export function averageForHandicap(handicap: number): number {
    return Math.floor(210 - normalizeHandicap(handicap) / 0.9);
}

export interface ExpectedStats {
    hdcp: number;
    avg: number;
    hdcpGame: number;
    series: number;
    hdcpSeries: number;
    pinfallFrame: number;
    strike?: number;
    spare?: number;
    single?: number;
    open?: number;
    split?: number;
    firstBall?: number;
    clean?: number;
    hung?: number;
    turkey?: number;
    twoHundred?: number;
    threeHundred?: number;
    sixHundred?: number;
    sd?: number;
    highGame?: number;
    marksGame?: number;
    ballsGame?: number;
    frames50?: number;
    balls50?: number;
    frames100?: number;
    balls100?: number;
    frames150?: number;
    balls150?: number;
    frames200?: number;
    balls200?: number;
    games?: number;
    completeSeries?: number;
    frameGames?: number;
    frameCoverage?: number;
    lowGame?: number;
    lowSeries?: number;
    highSeries?: number;
    tenthMarks?: number;
    strikeToSpare?: number;
    splitConversion?: number;
    gameOneAverage?: number;
    gameTwoAverage?: number;
    gameThreeAverage?: number;
}

export type StatKey = keyof ExpectedStats;

export function predictHandicapStats(value: number): ExpectedStats {
    const hdcp = normalizeHandicap(value);
    const avg = averageForHandicap(hdcp);
    const core = {hdcp, avg, hdcpGame: avg + hdcp, series: avg * 3, hdcpSeries: (avg + hdcp) * 3, pinfallFrame: avg / 10};
    // These legacy performance assumptions are illustrations, not calibrated league benchmarks.
    // Do not extend them outside their original average range.
    if (avg < 100) return core;
    const strike = clamp(28 + (avg - 150) * 0.37, 12, 62);
    const spare = clamp(42 + (avg - 150) * 0.33, 28, 72);
    const single = clamp(70 + (avg - 150) * 0.33, 55, 96);
    const open = clamp(26 - (avg - 150) * 0.27, 6, 40);
    const split = clamp(12 - (avg - 150) * 0.08, 4, 16);
    const firstBall = clamp(7.6 + (avg - 150) * 0.023, 7.0, 9.6);
    const clean = clamp(8 + (avg - 150) * 0.2, 4, 28);
    const hung = clamp(18 - (avg - 150) * 0.1, 6, 22) / 100;
    const turkey = clamp(4 + (avg - 150) * 0.12, 2, 16) / 100;
    const twoHundred = clamp(8 + (avg - 150) * 0.35, 1, 45);
    const threeHundred = clamp((avg - 180) * 0.04, 0, 3);
    const sixHundred = clamp(12 + (avg - 150) * 0.4, 2, 55);
    const sd = clamp(32 - (avg - 150) * 0.08, 18, 36);
    const ballsPerFrame = 2 - strike / 100;
    const pace = (target: number) => {
        const frames = target / core.pinfallFrame;
        return frames > 10 ? {} : {frames: round2(frames), balls: round2(frames * ballsPerFrame)};
    };
    const p50 = pace(50), p100 = pace(100), p150 = pace(150), p200 = pace(200);
    return {
        ...core,
        strike: round2(strike), spare: round2(spare), single: round2(single), open: round2(open), split: round2(split),
        firstBall: round2(firstBall), clean: round2(clean), hung: round2(hung), turkey: round2(turkey),
        twoHundred: round2(twoHundred), threeHundred: round2(threeHundred), sixHundred: round2(sixHundred),
        sd: round2(sd), highGame: round2(avg + 1.65 * sd),
        marksGame: round2(10 * (1 - open / 100)), ballsGame: round2(9 * ballsPerFrame + 2.4),
        frames50: p50.frames, balls50: p50.balls, frames100: p100.frames, balls100: p100.balls,
        frames150: p150.frames, balls150: p150.balls, frames200: p200.frames, balls200: p200.balls,
    };
}

function ratioPct(ratio: {numerator: number; denominator: number}): number | undefined {
    return ratio.denominator > 0 ? round2(100 * ratio.numerator / ratio.denominator) : undefined;
}

export function actualHandicapStats(stats: PlayerStats): Partial<Record<StatKey, number>> {
    const games = stats.gameStats.count;
    const series = stats.seriesStats.count;
    const frameGames = stats.firstBallCount / 10;
    const average = stats.gameStats.average;
    const handicap = handicapForAverage(average);
    const opens = ratioPct(stats.opens);
    const result: Partial<Record<StatKey, number>> = {
        games,
        completeSeries: series,
        frameGames,
        frameCoverage: games > 0 ? round2(100 * frameGames / games) : undefined,
        avg: games > 0 ? round2(average) : undefined,
        hdcp: games > 0 ? handicap : undefined,
        hdcpGame: games > 0 ? round2(average + handicap) : undefined,
        series: series > 0 ? round2(stats.seriesStats.average) : undefined,
        hdcpSeries: series > 0 ? round2(stats.seriesStats.average + handicap * 3) : undefined,
        strike: ratioPct(stats.strikes), spare: ratioPct(stats.spares), single: ratioPct(stats.singlePinSpares),
        open: opens, split: ratioPct(stats.splitsOccurred),
        firstBall: stats.firstBallCount > 0 ? round2(stats.firstBallAverage) : undefined,
        clean: frameGames > 0 ? round2(100 * stats.cleanGames / frameGames) : undefined,
        hung: frameGames > 0 ? round2(stats.hungCount / frameGames) : undefined,
        turkey: frameGames > 0 ? round2(stats.turkeyCount / frameGames) : undefined,
        twoHundred: games > 0 ? round2(100 * stats.games200 / games) : undefined,
        threeHundred: games > 0 ? round2(100 * stats.games300 / games) : undefined,
        sixHundred: series > 0 ? round2(100 * stats.series600 / series) : undefined,
        sd: games > 0 ? round2(stats.gameStats.sd) : undefined,
        highGame: games > 0 ? stats.gameStats.max : undefined,
        lowGame: games > 0 ? stats.gameStats.min : undefined,
        highSeries: series > 0 ? stats.seriesStats.max : undefined,
        lowSeries: series > 0 ? stats.seriesStats.min : undefined,
        tenthMarks: stats.tenthMarkGames > 0 ? round2(stats.avgTenthMarks) : undefined,
        strikeToSpare: stats.spares.numerator > 0 ? round2(stats.strikes.numerator / stats.spares.numerator) : undefined,
        splitConversion: ratioPct(stats.splits),
        gameOneAverage: stats.gameAverageN[0] > 0 ? round2(stats.gameAverages[0]) : undefined,
        gameTwoAverage: stats.gameAverageN[1] > 0 ? round2(stats.gameAverages[1]) : undefined,
        gameThreeAverage: stats.gameAverageN[2] > 0 ? round2(stats.gameAverages[2]) : undefined,
        pinfallFrame: frameGames > 0 ? round2(stats.avgPinfallPerFrame) : undefined,
        marksGame: opens == null ? undefined : round2(10 * (1 - opens / 100)),
        // Every recorded delivery is either a first-ball strike opportunity or a spare attempt.
        ballsGame: frameGames > 0 ? round2((stats.strikes.denominator + stats.spares.denominator) / frameGames) : undefined,
    };
    const keys = ["frames50", "frames100", "frames150", "frames200"] as const;
    keys.forEach((key, i) => {
        if (stats.paceN[i] > 0) result[key] = round2(stats.paceAvgFrames[i]);
    });
    // Existing pace ball counts use finalized bonus credit, not the delivery when points were earned.
    // Leave actual ball thresholds unavailable instead of presenting them as measured pace.
    return result;
}
