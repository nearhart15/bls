import {PlayerStats} from "./player-stats";
export function mergeStats(list: PlayerStats[]): PlayerStats {
    const out = new PlayerStats();
    if (list.length === 0) return out;
    if (list.length === 1) return list[0];
    let firstCount = 0, singleCount = 0;
    let games = 0, pinfall = 0, firstBallW = 0, singlePinW = 0, tenthMarksW = 0;
    const streak = new Map<number, number>();
    const gameAvgW: number[] = [];
    const gameAvgN: number[] = [];
    const frameW: number[] = [];
    const frameNAcc: number[] = [];
    const paceFW = [0, 0, 0, 0];
    const paceBW = [0, 0, 0, 0];
    const paceN = [0, 0, 0, 0];
    for (const s of list) {
        const g = s.gameStats.count || 0;
        games += g;
        pinfall += s.pinfall || 0;
        out.cleanGames += s.cleanGames || 0;
        out.hungCount += s.hungCount || 0;
        out.turkeyCount += s.turkeyCount || 0;
        out.games200 += s.games200 || 0;
        out.games300 += s.games300 || 0;
        out.series600 += s.series600 || 0;
        out.series800 += s.series800 || 0;
        out.gameStats.count += s.gameStats.count || 0;
        out.seriesStats.count += s.seriesStats.count || 0;
        out.gameStats.max = Math.max(out.gameStats.max || 0, s.gameStats.max || 0);
        out.seriesStats.max = Math.max(out.seriesStats.max || 0, s.seriesStats.max || 0);
        if (s.gameStats.min > 0) out.gameStats.min = out.gameStats.min > 0 ? Math.min(out.gameStats.min, s.gameStats.min) : s.gameStats.min;
        if (s.seriesStats.min > 0) out.seriesStats.min = out.seriesStats.min > 0 ? Math.min(out.seriesStats.min, s.seriesStats.min) : s.seriesStats.min;
        out.strikes.numerator += s.strikes.numerator;
        out.strikes.denominator += s.strikes.denominator;
        out.spares.numerator += s.spares.numerator;
        out.spares.denominator += s.spares.denominator;
        out.singlePinSpares.numerator += s.singlePinSpares.numerator;
        out.singlePinSpares.denominator += s.singlePinSpares.denominator;
        out.opens.numerator += s.opens.numerator;
        out.opens.denominator += s.opens.denominator;
        out.splits.numerator += s.splits.numerator;
        out.splits.denominator += s.splits.denominator;
        out.strikesToSpares.numerator += s.strikesToSpares.numerator;
        out.strikesToSpares.denominator += s.strikesToSpares.denominator;
        if (g > 0) {
            firstBallW += s.firstBallAverage * s.firstBallCount;
            firstCount += s.firstBallCount;
            singlePinW += s.allSinglePinsPickedUpAverage * s.singlePinGameCount;
            singleCount += s.singlePinGameCount;
        }
        out.incompleteFrameData = out.incompleteFrameData || s.incompleteFrameData;
        for (const [len, count] of s.strikesInARow ?? []) streak.set(len, (streak.get(len) ?? 0) + count);
        (s.gameAverages ?? []).forEach((ga, i) => {
            if (!s.gameAverageN[i]) return;
            const seriesN = s.gameAverageN[i];
            gameAvgW[i] = (gameAvgW[i] ?? 0) + ga * seriesN;
            gameAvgN[i] = (gameAvgN[i] ?? 0) + seriesN;
        });
        out.splitsOccurred.numerator += s.splitsOccurred?.numerator ?? 0;
        out.splitsOccurred.denominator += s.splitsOccurred?.denominator ?? 0;
        out.tenthMarkGames += s.tenthMarkGames || 0;
        tenthMarksW += (s.avgTenthMarks || 0) * (s.tenthMarkGames || 0);
        const frameN = s.framePinfallN ?? [];
        const frameAvg = s.framePinfallAvg ?? [];
        for (let i = 0; i < 10; i++) {
            const n = frameN[i] || 0;
            if (!n) continue;
            frameW[i] = (frameW[i] ?? 0) + (frameAvg[i] || 0) * n;
            frameNAcc[i] = (frameNAcc[i] ?? 0) + n;
        }
        for (let i = 0; i < 4; i++) {
            const n = s.paceN?.[i] || 0;
            if (!n) continue;
            paceFW[i] += (s.paceAvgFrames?.[i] || 0) * n;
            paceBW[i] += (s.paceAvgBalls?.[i] || 0) * n;
            paceN[i] += n;
        }
    }
    out.pinfall = pinfall;
    out.gameStats.average = games > 0 ? pinfall / games : 0;
    let seriesWeighted = 0, seriesCount = 0;
    for (const s of list) {
        if (s.seriesStats.count > 0) {
            seriesWeighted += s.seriesStats.average * s.seriesStats.count;
            seriesCount += s.seriesStats.count;
        }
    }
    out.seriesStats.average = seriesCount > 0 ? seriesWeighted / seriesCount : 0;
    out.firstBallAverage = firstCount > 0 ? firstBallW / firstCount : 0;
    out.firstBallCount = firstCount;
    out.singlePinGameCount = singleCount;
    out.allSinglePinsPickedUpAverage = singleCount > 0 ? singlePinW / singleCount : 0;
    const ratio = (n: number, d: number) => (d === 0 ? 0 : n / d);
    out.strikes.pct = ratio(out.strikes.numerator, out.strikes.denominator);
    out.spares.pct = ratio(out.spares.numerator, out.spares.denominator);
    out.singlePinSpares.pct = ratio(out.singlePinSpares.numerator, out.singlePinSpares.denominator);
    out.opens.pct = ratio(out.opens.numerator, out.opens.denominator);
    out.splits.pct = ratio(out.splits.numerator, out.splits.denominator);
    out.strikesToSpares.pct = ratio(out.strikesToSpares.numerator, out.strikesToSpares.denominator);
    out.strikesInARow = [...streak.entries()].sort((a, b) => a[0] - b[0]);
    out.gameAverages = gameAvgW.map((sum, i) => (gameAvgN[i] ? sum / gameAvgN[i] : 0));
    const frameCount = frameNAcc.reduce((s, n) => s + (n || 0), 0);
    const framePinSum = frameW.reduce((s, v) => s + (v || 0), 0);
    out.avgPinfallPerFrame = frameCount > 0 ? framePinSum / frameCount : 0;
    out.avgTenthMarks = out.tenthMarkGames > 0 ? tenthMarksW / out.tenthMarkGames : 0;
    out.splitsOccurred.pct = ratio(out.splitsOccurred.numerator, out.splitsOccurred.denominator);
    out.framePinfallAvg = Array.from({length: 10}, (_, i) => frameNAcc[i] ? frameW[i] / frameNAcc[i] : 0);
    out.framePinfallN = Array.from({length: 10}, (_, i) => frameNAcc[i] || 0);
    out.paceAvgFrames = paceN.map((n, i) => n ? paceFW[i] / n : 0);
    out.paceAvgBalls = paceN.map((n, i) => n ? paceBW[i] / n : 0);
    out.paceN = [...paceN];
    for (const key of ["gameStats", "seriesStats"] as const) {
        const total = out[key].count;
        out[key].sd = total ? Math.sqrt(list.reduce((sum, s) => sum + s[key].count * (s[key].sd ** 2 + (s[key].average - out[key].average) ** 2), 0) / total) : 0;
        const observed = list.filter(s => s[key].count > 0);
        out[key].min = observed.length ? Math.min(...observed.map(s => s[key].min)) : 0;
    }
    out.gameAverageN = gameAvgN;
    return out;
}
