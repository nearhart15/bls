import type {ApiHistoricalPlayerPoint} from "./api-player-history";

export type ApiPlayerTimeframe = "career" | "this-season" | "last-year" | "last-2-years";

export const API_PLAYER_TIMEFRAME_OPTIONS: {value: ApiPlayerTimeframe; label: string}[] = [
    {value: "career", label: "Career"},
    {value: "this-season", label: "This Season"},
    {value: "last-year", label: "Last Year"},
    {value: "last-2-years", label: "Last 2 Years"},
];

export interface ApiPlayerTimeframeSummary {
    average: number | null;
    games: number;
    pinfall: number;
    seriesCount: number;
    averageSeries: number | null;
    highGame: number | null;
    highSeries: number | null;
    known600Series: number;
    known700Series: number;
}

function pointDate(point: ApiHistoricalPlayerPoint): number {
    const value = Date.parse(`${point.date}T12:00:00Z`);
    return Number.isFinite(value) ? value : 0;
}

function subtractYears(timestamp: number, years: number): number {
    const date = new Date(timestamp);
    date.setUTCFullYear(date.getUTCFullYear() - years);
    return date.getTime();
}

/**
 * Time windows are anchored to the newest archived LeagueSecretary week so a
 * stale archive never drifts just because the viewer's clock moves forward.
 */
export function pointsForApiPlayerTimeframe(
    points: ApiHistoricalPlayerPoint[],
    timeframe: ApiPlayerTimeframe,
): ApiHistoricalPlayerPoint[] {
    const ordered = [...points].sort((a, b) => pointDate(a) - pointDate(b) || a.week - b.week);
    if (ordered.length === 0 || timeframe === "career") return ordered;

    const latest = ordered[ordered.length - 1];
    if (timeframe === "this-season") {
        return ordered.filter(point => point.seasonKey === latest.seasonKey);
    }

    const latestDate = pointDate(latest);
    const cutoff = subtractYears(latestDate, timeframe === "last-year" ? 1 : 2);
    return ordered.filter(point => pointDate(point) >= cutoff && pointDate(point) <= latestDate);
}

export function summarizeApiPlayerHistory(points: ApiHistoricalPlayerPoint[]): ApiPlayerTimeframeSummary {
    const scoring = points.filter(point =>
        (point.weekGames ?? 0) > 0 &&
        point.weekPins != null &&
        Number.isFinite(point.weekPins),
    );
    const games = scoring.reduce((sum, point) => sum + (point.weekGames ?? 0), 0);
    const pinfall = scoring.reduce((sum, point) => sum + (point.weekPins ?? 0), 0);
    const series = scoring
        .map(point => point.weekSeries)
        .filter((value): value is number => value != null && Number.isFinite(value));
    const highGames = points
        .map(point => point.highGame)
        .filter(value => Number.isFinite(value) && value > 0);

    return {
        average: games > 0 ? pinfall / games : null,
        games,
        pinfall,
        seriesCount: series.length,
        averageSeries: series.length > 0 ? series.reduce((sum, value) => sum + value, 0) / series.length : null,
        highGame: highGames.length > 0 ? Math.max(...highGames) : null,
        highSeries: series.length > 0 ? Math.max(...series) : null,
        known600Series: series.filter(value => value >= 600).length,
        known700Series: series.filter(value => value >= 700).length,
    };
}
