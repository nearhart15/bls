import type {PlayerStats} from "./player-stats";

function ratioPct(rg: {pct: number; denominator: number}): number | null {
    return rg.denominator <= 0 ? null : Math.round(rg.pct * 1000) / 10;
}
export function statsValues(s: PlayerStats) {
    const games = s.gameStats.count;
    return {
        average: games > 0 ? s.gameStats.average : null,
        games,
        pinfall: s.pinfall,
        highGame: s.gameStats.max || 0,
        highSeries: s.seriesStats.max || 0,
        games200: s.games200,
        games300: s.games300,
        series600: s.series600,
        series800: s.series800,
        cleanGames: s.cleanGames,
        hungCount: s.hungCount,
        turkeyCount: s.turkeyCount,
        firstBall: s.firstBallCount > 0 ? s.firstBallAverage : null,
        strikePct: ratioPct(s.strikes),
        sparePct: ratioPct(s.spares),
        singlePinPct: ratioPct(s.singlePinSpares),
        openPct: ratioPct(s.opens),
        splitPct: ratioPct(s.splits),
        strikeToSparePct: s.strikesToSpares.denominator > 0 ? Math.round(s.strikesToSpares.pct * 100) / 100 : null,
        singlePinPickup: s.singlePinGameCount > 0 ? Math.round(s.allSinglePinsPickedUpAverage * 10) / 10 : null,
        lowGame: s.gameStats.min || null,
        lowSeries: s.seriesStats.min || null,
        seriesCount: s.seriesStats.count || 0
    };
}
