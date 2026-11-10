import {mergeMetrics, type MetricCounts} from "./metric-counts";

export interface SliceStats {
    metrics?: MetricCounts;
    ratingDelta?: number | null;
    ratingGameCount?: number;
    average: number | null;
    games: number;
    pinfall: number;
    highGame: number;
    highSeries: number;
    games200: number;
    games300?: number;
    series600?: number;
    series800?: number;
    cleanGames?: number;
    hungCount?: number;
    turkeyCount?: number;
    firstBall?: number | null;
    strikePct?: number | null;
    sparePct?: number | null;
    singlePinPct?: number | null;
    openPct?: number | null;
    splitPct?: number | null;
    strikeToSparePct?: number | null;
    singlePinPickup?: number | null;
    lowGame?: number | null;
    lowSeries?: number | null;
    seriesCount?: number;
}

export function aggregateSlices(slices: SliceStats[]) {
    let games = 0, pinfall = 0, highGame = 0, highSeries = 0, games200 = 0;
    let games300 = 0, series600 = 0, series800 = 0, cleanGames = 0, hungCount = 0, turkeyCount = 0, seriesCount = 0;
    let weighted = 0, ratingWeighted = 0, ratingGameCount = 0;
    let lowGame: number | null = null;
    let lowSeries: number | null = null;
    for (const s of slices) {
        if (s.ratingDelta != null && (s.ratingGameCount ?? 0) > 0) {
            ratingWeighted += s.ratingDelta * (s.ratingGameCount ?? 0);
            ratingGameCount += s.ratingGameCount ?? 0;
        }
        games += s.games;
        pinfall += s.pinfall;
        highGame = Math.max(highGame, s.highGame);
        highSeries = Math.max(highSeries, s.highSeries);
        games200 += s.games200;
        games300 += s.games300 ?? 0;
        series600 += s.series600 ?? 0;
        series800 += s.series800 ?? 0;
        cleanGames += s.cleanGames ?? 0;
        hungCount += s.hungCount ?? 0;
        turkeyCount += s.turkeyCount ?? 0;
        seriesCount += s.seriesCount ?? 0;
        if (s.average != null && s.games > 0) weighted += s.average * s.games;

        if (s.lowGame != null) lowGame = lowGame == null ? s.lowGame : Math.min(lowGame, s.lowGame);
        if (s.lowSeries != null) lowSeries = lowSeries == null ? s.lowSeries : Math.min(lowSeries, s.lowSeries);
    }
    return {
        average: games > 0 ? weighted / games : null,
        games, pinfall, highGame, highSeries, games200,
        games300, series600, series800, cleanGames, hungCount, turkeyCount, seriesCount,
        ...mergeMetrics(slices),
        lowGame, lowSeries,
        ratingDelta: ratingGameCount > 0 ? ratingWeighted / ratingGameCount : null,
        ratingGameCount,
    };
}
