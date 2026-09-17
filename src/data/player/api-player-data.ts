import type {PlayerAppearanceSlice, PlayerListEntry, PlayerListSeasonSlice} from "./player-aggregate";

interface ApiPlayer {
    name: string;
    average: number;
    handicap: number;
    pins: number;
    games: number;
    highGame: number;
    highSeries: number;
}

interface ApiTeam {
    number: number;
    name: string;
    players: ApiPlayer[];
}

interface ApiLeagueData {
    status: "pending" | "ready";
    league?: {name: string; date: string | null; season: string | null};
    teams: ApiTeam[];
    substitutes?: ApiPlayer[];
}

function slug(value: string): string {
    return value.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function seasonLabel(data: ApiLeagueData): string {
    return data.league?.season?.trim() || data.league?.date?.slice(-4) || String(new Date().getFullYear());
}

function calendarYear(data: ApiLeagueData): string {
    const match = data.league?.date?.match(/(\d{4})$/);
    return match?.[1] ?? String(new Date().getFullYear());
}

function slice(player: ApiPlayer, season: string): PlayerListSeasonSlice {
    return {
        season,
        average: player.games > 0 ? player.average : null,
        games: player.games,
        pinfall: player.pins,
        highGame: player.highGame,
        highSeries: player.highSeries,
        games200: 0,
        games300: player.highGame === 300 ? 1 : 0,
        series600: player.highSeries >= 600 ? 1 : 0,
        series800: player.highSeries >= 800 ? 1 : 0,
        cleanGames: 0,
        hungCount: 0,
        turkeyCount: 0,
        firstBall: null,
        strikePct: null,
        sparePct: null,
        singlePinPct: null,
        openPct: null,
        splitPct: null,
        strikeToSparePct: null,
        singlePinPickup: null,
        lowGame: null,
        lowSeries: null,
        seriesCount: player.games > 0 ? Math.ceil(player.games / 3) : 0,
        ratingDelta: null,
        ratingGameCount: 0,
    };
}

function entry(player: ApiPlayer, team: ApiTeam | null, data: ApiLeagueData, index: number): PlayerListEntry {
    const season = seasonLabel(data);
    const year = calendarYear(data);
    const leagueId = "beer-league-api";
    const teamId = team ? `beer-team-${team.number}` : "beer-subs";
    const teamName = team?.name ?? "Substitutes";
    const seasonSlice = slice(player, season);
    const calendarSlice = slice(player, year);
    const appearance: PlayerAppearanceSlice = {
        ...seasonSlice,
        season,
        leagueId,
        leagueName: data.league?.name ?? "Beer League",
        teamId,
        teamName,
        calendarSlices: [{
            ...calendarSlice,
            season: year,
            leagueId,
            leagueName: data.league?.name ?? "Beer League",
            teamId,
            teamName,
        }],
    };
    return {
        id: `api-${team?.number ?? "sub"}-${slug(player.name)}-${index}`,
        name: player.name,
        average: player.games > 0 ? player.average : null,
        games: player.games,
        pinfall: player.pins,
        highGame: player.highGame,
        highSeries: player.highSeries,
        games200: 0,
        seasonSlices: [seasonSlice],
        calendarSlices: [calendarSlice],
        appearanceSlices: [appearance],
        ratingDelta: null,
        ratingGameCount: 0,
    };
}

export async function apiPlayerListFetcher(): Promise<PlayerListEntry[]> {
    const response = await fetch(`${import.meta.env.BASE_URL}data/beer-league.json?ts=${Date.now()}`, {cache: "no-store"});
    if (!response.ok) throw new Error(`API data returned ${response.status}.`);
    const data = await response.json() as ApiLeagueData;
    if (data.status !== "ready") throw new Error("API data is not ready yet.");

    const rows: PlayerListEntry[] = [];
    for (const team of data.teams) {
        team.players.forEach((player, index) => rows.push(entry(player, team, data, index)));
    }
    (data.substitutes ?? []).forEach((player, index) => rows.push(entry(player, null, data, index)));
    return rows;
}
