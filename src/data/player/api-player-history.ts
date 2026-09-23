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
    highGame: number;
    highSeries: number;
}

export interface ApiHistoricalPlayer {
    sourcePlayerId: number;
    sourcePlayerIds?: number[];
    name: string;
    sourceName: string;
    normalizedName: string;
    history: ApiHistoricalPlayerPoint[];
}

export interface ApiHistoricalPlayerIndexEntry {
    sourcePlayerId: number;
    sourcePlayerIds?: number[];
    name: string;
    sourceName: string;
    normalizedName: string;
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

export const API_PLAYER_HISTORY_INDEX_CACHE_CATEGORY = "api-player-history-index-v3";
export const API_PLAYER_HISTORY_CACHE_CATEGORY = "api-player-history-v3";

export function normalizeHistoricalPlayerName(name: string): string {
    return name.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "");
}

export function findHistoricalPlayer(data: ApiPlayerHistoryIndexFile, playerName: string, teamName?: string): ApiHistoricalPlayerIndexEntry | null {
    const normalized = normalizeHistoricalPlayerName(playerName);
    const matches = data.players.filter(player => player.normalizedName === normalized || normalizeHistoricalPlayerName(player.name) === normalized);
    if (matches.length === 1) return matches[0];
    if (!teamName || matches.length === 0) return null;
    const normalizedTeam = normalizeHistoricalPlayerName(teamName);
    const teamMatches = matches.filter(player => player.teamNames.some(name => normalizeHistoricalPlayerName(name) === normalizedTeam));
    return teamMatches.length === 1 ? teamMatches[0] : null;
}

export async function apiPlayerHistoryIndexFetcher(): Promise<ApiPlayerHistoryIndexFile> {
    const base = import.meta.env.BASE_URL || "/";
    const response = await fetch(`${base}data/leaguesecretary-beer-history/player-history-index.json`, {cache: "no-cache"});
    if (!response.ok) throw new Error(`Historical player index unavailable (${response.status}).`);
    return await response.json() as ApiPlayerHistoryIndexFile;
}

export async function apiHistoricalPlayerFetcher(sourcePlayerId: number): Promise<ApiHistoricalPlayer> {
    const base = import.meta.env.BASE_URL || "/";
    const response = await fetch(`${base}data/leaguesecretary-beer-history/players/${sourcePlayerId}.json`, {cache: "no-cache"});
    if (!response.ok) throw new Error(`Historical player stats unavailable (${response.status}).`);
    return await response.json() as ApiHistoricalPlayer;
}
