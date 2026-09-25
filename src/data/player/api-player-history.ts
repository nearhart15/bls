import {fetchJson} from "../utils/fetch-json";

/* LeagueSecretary historical player trend data © 2026 */

export interface ApiHistoricalPlayerPoint {
    season: string;
    seasonKey: string;
    week: number;
    date: string;
    teamId: number;
    teamName: string;
    teamNumber: number;
    games: number;
    pins: number;
    seasonAverage: number | null;
    weekGames: number | null;
    weekPins: number | null;
    weekAverage: number | null;
    weekSeries: number | null;
    weekScores?: number[];
    handicap?: number | null;
    highGame: number;
    highSeries: number;
}

export interface ApiHistoricalPlayer {
    playerKey?: string;
    sourcePlayerId: number;
    sourcePlayerIds?: number[];
    name: string;
    sourceName: string;
    normalizedName: string;
    aliases?: string[];
    history: ApiHistoricalPlayerPoint[];
}

export interface ApiHistoricalPlayerIndexEntry {
    playerKey?: string;
    historyFile?: string;
    sourcePlayerId: number;
    sourcePlayerIds?: number[];
    name: string;
    sourceName: string;
    normalizedName: string;
    aliases?: string[];
    teamNames: string[];
}

export interface ApiPlayerHistoryIndexFile {
    generatedAt: string;
    importedWeeks: number;
    qualifyingTeam: string;
    seasons: {key: string; label: string; year: number; seasonCode: string; weeks: number; firstDate: string; lastDate: string}[];
    players: ApiHistoricalPlayerIndexEntry[];
}

export interface ApiHistoricalPlayerResult {
    player: ApiHistoricalPlayer | null;
}

export interface ApiHistoricalLeagueBowlerWeek {
    playerKey: string;
    weekGames: number | null;
    weekPins: number | null;
    weekSeries: number | null;
    weekScores: number[];
    handicap: number | null;
}

export interface ApiHistoricalLeagueWeek {
    season: string;
    seasonKey: string;
    week: number;
    date: string;
    bowlers: ApiHistoricalLeagueBowlerWeek[];
}

export interface ApiHistoricalLeagueHistory {
    generatedAt: string;
    qualifyingTeam: string;
    weeks: ApiHistoricalLeagueWeek[];
}

type CompactLeagueBowler = [
    playerIndex: number,
    weekGames: number | null,
    weekPins: number | null,
    weekSeries: number | null,
    handicap: number | null,
    ...weekScores: number[],
];

interface CompactHistoricalLeagueHistory {
    version: 2;
    generatedAt: string;
    qualifyingTeam: string;
    players: string[];
    weeks: [date: string, week: number, bowlers: CompactLeagueBowler[]][];
}

export const API_PLAYER_HISTORY_INDEX_CACHE_CATEGORY = "api-player-history-index-v3";
export const API_PLAYER_HISTORY_CACHE_CATEGORY = "api-player-history-v3";
export const API_LEAGUE_HISTORY_CACHE_CATEGORY = "api-league-history-v2";

export function normalizeHistoricalPlayerName(name: string): string {
    return name.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "");
}

export function findHistoricalPlayer(data: ApiPlayerHistoryIndexFile, playerName: string, teamName?: string): ApiHistoricalPlayerIndexEntry | null {
    const normalized = normalizeHistoricalPlayerName(playerName);
    const matches = data.players.filter(player =>
        player.normalizedName === normalized
        || normalizeHistoricalPlayerName(player.name) === normalized
        || (player.aliases ?? []).some(alias => normalizeHistoricalPlayerName(alias) === normalized),
    );
    if (matches.length === 1) return matches[0];
    if (!teamName || matches.length === 0) return null;
    const normalizedTeam = normalizeHistoricalPlayerName(teamName);
    const teamMatches = matches.filter(player => player.teamNames.some(name => normalizeHistoricalPlayerName(name) === normalizedTeam));
    return teamMatches.length === 1 ? teamMatches[0] : null;
}

export async function apiPlayerHistoryIndexFetcher(): Promise<ApiPlayerHistoryIndexFile> {
    const base = import.meta.env.BASE_URL || "/";
    return await fetchJson(`${base}data/leaguesecretary-beer-history/player-history-index.json`) as unknown as ApiPlayerHistoryIndexFile;
}

export async function apiHistoricalPlayerFetcher(source: number | string): Promise<ApiHistoricalPlayer> {
    const historyFile = typeof source === "number" ? `${source}.json` : source;
    if (!/^[a-z0-9][a-z0-9._-]*\.json$/i.test(historyFile)) throw new Error("Invalid historical player file.");
    const base = import.meta.env.BASE_URL || "/";
    return await fetchJson(`${base}data/leaguesecretary-beer-history/players/${historyFile}`) as unknown as ApiHistoricalPlayer;
}


export function expandHistoricalLeagueHistory(data: CompactHistoricalLeagueHistory): ApiHistoricalLeagueHistory {
    return {
        generatedAt: data.generatedAt,
        qualifyingTeam: data.qualifyingTeam,
        weeks: data.weeks.map(([date, week, bowlers]) => ({
            season: "",
            seasonKey: "",
            week,
            date,
            bowlers: bowlers.map(([playerIndex, weekGames, weekPins, weekSeries, handicap, ...weekScores]) => ({
                playerKey: data.players[playerIndex] ?? String(playerIndex),
                weekGames,
                weekPins,
                weekSeries,
                weekScores,
                handicap,
            })),
        })),
    };
}

export async function apiHistoricalLeagueFetcher(): Promise<ApiHistoricalLeagueHistory> {
    const base = import.meta.env.BASE_URL || "/";
    const data = await fetchJson(`${base}data/leaguesecretary-beer-history/league-week-history.json`) as unknown as CompactHistoricalLeagueHistory;
    if (data.version !== 2 || !Array.isArray(data.players) || !Array.isArray(data.weeks)) {
        throw new Error("Historical league stats are in an unsupported format.");
    }
    return expandHistoricalLeagueHistory(data);
}
