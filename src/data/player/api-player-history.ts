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
    seasonAverage: number;
    weekGames: number | null;
    weekPins: number | null;
    weekAverage: number | null;
    weekSeries: number | null;
    highGame: number;
    highSeries: number;
}

export interface ApiHistoricalPlayer {
    sourcePlayerId: number;
    name: string;
    sourceName: string;
    normalizedName: string;
    history: ApiHistoricalPlayerPoint[];
}

export interface ApiPlayerHistoryFile {
    generatedAt: string;
    importedWeeks: number;
    qualifyingTeam: string;
    seasons: {key: string; label: string; year: number; seasonCode: string; weeks: number; firstDate: string; lastDate: string}[];
    players: ApiHistoricalPlayer[];
}

export const API_PLAYER_HISTORY_CACHE_CATEGORY = "api-player-history-v1";

export function normalizeHistoricalPlayerName(name: string): string {
    return name.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "");
}

export function findHistoricalPlayer(data: ApiPlayerHistoryFile, playerName: string): ApiHistoricalPlayer | null {
    const normalized = normalizeHistoricalPlayerName(playerName);
    const matches = data.players.filter(player => player.normalizedName === normalized || normalizeHistoricalPlayerName(player.name) === normalized);
    return matches.length === 1 ? matches[0] : null;
}

export async function apiPlayerHistoryFetcher(): Promise<ApiPlayerHistoryFile> {
    const base = import.meta.env.BASE_URL || "/";
    const response = await fetch(`${base}data/leaguesecretary-beer-history/player-history.json`, {cache: "no-cache"});
    if (!response.ok) throw new Error(`Historical player stats unavailable (${response.status}).`);
    return await response.json() as ApiPlayerHistoryFile;
}
