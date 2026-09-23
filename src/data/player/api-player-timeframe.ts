import type {ApiHistoricalPlayerPoint} from "./api-player-history";

export type ApiPlayerTimeframe = "career" | "this-season" | "last-year" | "last-2-years";
export type ApiPlayerProgressMetric =
    | "average"
    | "handicap"
    | "games"
    | "seriesCount"
    | "pinfall"
    | "averageSeries"
    | "highGame"
    | "highSeries"
    | "highHandicapGame"
    | "highHandicapSeries"
    | "known200Games"
    | "known600Series"
    | "known700Series";

export const API_PLAYER_TIMEFRAME_OPTIONS: {value: ApiPlayerTimeframe; label: string}[] = [
    {value: "career", label: "Career"},
    {value: "this-season", label: "This Season"},
    {value: "last-year", label: "Last Year"},
    {value: "last-2-years", label: "Last 2 Years"},
];

export const API_PLAYER_PROGRESS_OPTIONS: {value: ApiPlayerProgressMetric; label: string; integer?: boolean}[] = [
    {value: "average", label: "Average"},
    {value: "handicap", label: "Handicap", integer: true},
    {value: "games", label: "Games", integer: true},
    {value: "seriesCount", label: "Series Bowled", integer: true},
    {value: "pinfall", label: "Pinfall", integer: true},
    {value: "averageSeries", label: "Avg Series"},
    {value: "highGame", label: "High Game", integer: true},
    {value: "highSeries", label: "High Series", integer: true},
    {value: "highHandicapGame", label: "High Hdcp Game", integer: true},
    {value: "highHandicapSeries", label: "High Hdcp Series", integer: true},
    {value: "known200Games", label: "Known 200+ Games", integer: true},
    {value: "known600Series", label: "Known 600+ Series", integer: true},
    {value: "known700Series", label: "Known 700+ Series", integer: true},
];

export interface ApiPlayerTimeframeSummary {
    average: number | null;
    handicap: number | null;
    games: number;
    pinfall: number;
    seriesCount: number;
    averageSeries: number | null;
    highGame: number | null;
    highSeries: number | null;
    highHandicapGame: number | null;
    highHandicapSeries: number | null;
    known200Games: number | null;
    known600Series: number;
    known700Series: number;
}

export interface ApiPlayerProgressPoint {
    date: string;
    value: number | null;
    weeklyValue?: number | null;
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

function finiteScores(point: ApiHistoricalPlayerPoint): number[] {
    return (point.weekScores ?? []).filter(score => Number.isFinite(score) && score >= 0);
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

export function buildApiPlayerProgress(
    points: ApiHistoricalPlayerPoint[],
    metric: ApiPlayerProgressMetric,
): ApiPlayerProgressPoint[] {
    const ordered = [...points].sort((a, b) => pointDate(a) - pointDate(b) || a.week - b.week);
    let games = 0;
    let pinfall = 0;
    let seriesCount = 0;
    let seriesPins = 0;
    let highGame: number | null = null;
    let highSeries: number | null = null;
    let highHandicapGame: number | null = null;
    let highHandicapSeries: number | null = null;
    let known200Games = 0;
    let known600Series = 0;
    let known700Series = 0;
    let hasIndividualGames = false;

    return ordered.map(point => {
        const scores = finiteScores(point);
        if (scores.length > 0) hasIndividualGames = true;
        const weekGames = point.weekGames ?? scores.length;
        const weekPins = point.weekPins ?? (scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) : null);
        if (weekGames > 0 && weekPins != null) {
            games += weekGames;
            pinfall += weekPins;
        }
        if (point.weekSeries != null && Number.isFinite(point.weekSeries)) {
            seriesCount += 1;
            seriesPins += point.weekSeries;
            highSeries = highSeries == null ? point.weekSeries : Math.max(highSeries, point.weekSeries);
            if (point.weekSeries >= 600) known600Series += 1;
            if (point.weekSeries >= 700) known700Series += 1;
        }
        for (const score of scores) {
            highGame = highGame == null ? score : Math.max(highGame, score);
            if (score >= 200) known200Games += 1;
            if (point.handicap != null && Number.isFinite(point.handicap)) {
                const hdcpScore = score + point.handicap;
                highHandicapGame = highHandicapGame == null ? hdcpScore : Math.max(highHandicapGame, hdcpScore);
            }
        }
        if (scores.length === 0 && point.highGame > 0) {
            highGame = highGame == null ? point.highGame : Math.max(highGame, point.highGame);
        }
        if (point.weekSeries != null && point.handicap != null && Number.isFinite(point.handicap) && weekGames > 0) {
            const hdcpSeries = point.weekSeries + point.handicap * weekGames;
            highHandicapSeries = highHandicapSeries == null ? hdcpSeries : Math.max(highHandicapSeries, hdcpSeries);
        }

        let value: number | null;
        switch (metric) {
            case "average": value = games > 0 ? pinfall / games : null; break;
            case "handicap": value = point.handicap ?? null; break;
            case "games": value = games; break;
            case "seriesCount": value = seriesCount; break;
            case "pinfall": value = pinfall; break;
            case "averageSeries": value = seriesCount > 0 ? seriesPins / seriesCount : null; break;
            case "highGame": value = highGame; break;
            case "highSeries": value = highSeries; break;
            case "highHandicapGame": value = highHandicapGame; break;
            case "highHandicapSeries": value = highHandicapSeries; break;
            case "known200Games": value = hasIndividualGames ? known200Games : null; break;
            case "known600Series": value = known600Series; break;
            case "known700Series": value = known700Series; break;
        }

        return {
            date: point.date,
            value,
            ...(metric === "average" ? {weeklyValue: point.weekAverage} : {}),
        };
    });
}

export function summarizeApiPlayerHistory(points: ApiHistoricalPlayerPoint[]): ApiPlayerTimeframeSummary {
    const progress = new Map<ApiPlayerProgressMetric, ApiPlayerProgressPoint[]>();
    const lastValue = (metric: ApiPlayerProgressMetric): number | null => {
        let rows = progress.get(metric);
        if (!rows) {
            rows = buildApiPlayerProgress(points, metric);
            progress.set(metric, rows);
        }
        for (let index = rows.length - 1; index >= 0; index -= 1) {
            const value = rows[index].value;
            if (value != null && Number.isFinite(value)) return value;
        }
        return null;
    };

    return {
        average: lastValue("average"),
        handicap: lastValue("handicap"),
        games: lastValue("games") ?? 0,
        pinfall: lastValue("pinfall") ?? 0,
        seriesCount: lastValue("seriesCount") ?? 0,
        averageSeries: lastValue("averageSeries"),
        highGame: lastValue("highGame"),
        highSeries: lastValue("highSeries"),
        highHandicapGame: lastValue("highHandicapGame"),
        highHandicapSeries: lastValue("highHandicapSeries"),
        known200Games: lastValue("known200Games"),
        known600Series: lastValue("known600Series") ?? 0,
        known700Series: lastValue("known700Series") ?? 0,
    };
}
