/*
 * Player cross-league aggregation © 2026
 */

import {leagueDetailsFetcher, leagueInfoListFetcher} from "../league/league-api";
import type {LeaguePlayerStats} from "../league/league-team-details";
import type {TeamPlayerGameScore} from "../league/league-matchup";
import {PlayerStats} from "./player-stats";
import {calculatePlayerStats} from "./player-stats-calculator";
import {playerListFetcher} from "./player-api";
import {PlayerInfo} from "./player-info";
import moment from "moment";

export interface PlayerLeagueAppearance {
    season: string;
    leagueId: string;
    leagueName: string;
    teamId: string;
    teamName: string;
    teamNumber: number;
    status: string;
    stats?: LeaguePlayerStats;
}

export interface PlayerSeasonStats {
    season: string;
    leagues: number;
    games: number;
    average: number;
    pinfall: number;
    highGame: number;
    highSeries: number;
    games200: number;
    cleanGames: number;
    hungCount: number;
    turkeyCount: number;
}

export interface PlayerSliceStats {
    season?: string;
    leagueId?: string;
    leagueName?: string;
    stats: PlayerStats;
}

export interface AggregatedPlayerData {
    player: PlayerInfo;
    appearances: PlayerLeagueAppearance[];
    careerStats: PlayerStats;
    seasonStats: PlayerSeasonStats[];
    seasonSlicesFull: PlayerSliceStats[];
    appearanceSlicesFull: PlayerSliceStats[];
}

export interface PlayerListSeasonSlice {
    season: string;
    average: number | null;
    games: number;
    pinfall: number;
    highGame: number;
    highSeries: number;
    games200: number;
    games300: number;
    series600: number;
    series800: number;
    cleanGames: number;
    hungCount: number;
    turkeyCount: number;
    firstBall: number | null;
    strikePct: number | null;
    sparePct: number | null;
    singlePinPct: number | null;
    openPct: number | null;
    splitPct: number | null;
    strikeToSparePct: number | null;
    singlePinPickup: number | null;
    lowGame: number | null;
    lowSeries: number | null;
    seriesCount: number;
}

export interface PlayerAppearanceSlice {
    season: string;
    leagueId: string;
    leagueName: string;
    teamId: string;
    teamName: string;
    average: number | null;
    games: number;
    pinfall: number;
    highGame: number;
    highSeries: number;
    games200: number;
    games300: number;
    series600: number;
    series800: number;
    cleanGames: number;
    hungCount: number;
    turkeyCount: number;
    firstBall: number | null;
    strikePct: number | null;
    sparePct: number | null;
    singlePinPct: number | null;
    openPct: number | null;
    splitPct: number | null;
    strikeToSparePct: number | null;
    singlePinPickup: number | null;
    lowGame: number | null;
    lowSeries: number | null;
    seriesCount: number;
}

export interface PlayerListEntry {
    id: string;
    name: string;
    average: number | null;
    games: number;
    pinfall: number;
    highGame: number;
    highSeries: number;
    games200: number;
    seasonSlices: PlayerListSeasonSlice[];
    appearanceSlices: PlayerAppearanceSlice[];
    weekAverages?: number[];
    weekSeries?: number[];
    lastBowled?: moment.Moment;
}

export const PLAYER_DETAIL_CACHE_CATEGORY = "player-detail-v4-frame-pace";
export const PLAYER_INDEX_CACHE_CATEGORY = "player-index-v8-team-league";

interface RosterScanResult {
    playerMap: Map<string, {name: string; lastBowled?: moment.Moment}>;
    seriesByPlayerSeason: Map<string, Map<string, TeamPlayerGameScore[][]>>;
    seriesByPlayer: Map<string, TeamPlayerGameScore[][]>;
    seriesByPlayerLeague: Map<string, Map<string, TeamPlayerGameScore[][]>>;
    appearancesByPlayer: Map<string, PlayerLeagueAppearance[]>;
    weekSeriesByPlayer: Map<string, number[]>;
    weekAveragesByPlayer: Map<string, number[]>;
}

async function scanAllRosters(): Promise<RosterScanResult> {
    const [players, leagues] = await Promise.all([
        playerListFetcher(),
        leagueInfoListFetcher(),
    ]);

    const playerMap = new Map<string, {name: string; lastBowled?: moment.Moment}>();
    for (const p of players.players) {
        playerMap.set(p.id, {name: p.name ?? p.id, lastBowled: p.lastBowled});
    }

    const seriesByPlayerSeason = new Map<string, Map<string, TeamPlayerGameScore[][]>>();
    const seriesByPlayer = new Map<string, TeamPlayerGameScore[][]>();
    const appearancesByPlayer = new Map<string, PlayerLeagueAppearance[]>();
    const weekSeriesByPlayer = new Map<string, number[]>();
    const weekAveragesByPlayer = new Map<string, number[]>();
    const seriesByPlayerLeague = new Map<string, Map<string, TeamPlayerGameScore[][]>>();

    const addSeries = (playerId: string, season: string, leagueId: string, games: TeamPlayerGameScore[]) => {
        if (!seriesByPlayer.has(playerId)) seriesByPlayer.set(playerId, []);
        seriesByPlayer.get(playerId)!.push(games);
        if (!seriesByPlayerSeason.has(playerId)) seriesByPlayerSeason.set(playerId, new Map());
        const bySeason = seriesByPlayerSeason.get(playerId)!;
        if (!bySeason.has(season)) bySeason.set(season, []);
        bySeason.get(season)!.push(games);
        const leagueKey = `${season}::${leagueId}`;
        if (!seriesByPlayerLeague.has(playerId)) seriesByPlayerLeague.set(playerId, new Map());
        const byLeague = seriesByPlayerLeague.get(playerId)!;
        if (!byLeague.has(leagueKey)) byLeague.set(leagueKey, []);
        byLeague.get(leagueKey)!.push(games);
    };

    for (const season of leagues.seasons) {
        const seasonLabel = season.season ?? "";
        for (const league of season.leagues) {
            if (!league.hasData() || !league.dataLoc || !league.id) continue;
            try {
                const details = await leagueDetailsFetcher(league.dataLoc);
                for (const team of details.teams) {
                    for (const rosterPlayer of team.roster) {
                        if (!rosterPlayer.id) continue;
                        if (!playerMap.has(rosterPlayer.id)) {
                            playerMap.set(rosterPlayer.id, {name: rosterPlayer.name ?? rosterPlayer.id});
                        } else if (rosterPlayer.name) {
                            const existing = playerMap.get(rosterPlayer.id)!;
                            if (!existing.name || existing.name === rosterPlayer.id) existing.name = rosterPlayer.name;
                        }
                        const appearance: PlayerLeagueAppearance = {
                            season: seasonLabel,
                            leagueId: league.id,
                            leagueName: league.name ?? league.id,
                            teamId: team.id ?? "",
                            teamName: team.name ?? "",
                            teamNumber: team.number,
                            status: rosterPlayer.status ?? "REGULAR",
                            stats: rosterPlayer.playerStats,
                        };
                        if (!appearancesByPlayer.has(rosterPlayer.id)) appearancesByPlayer.set(rosterPlayer.id, []);
                        appearancesByPlayer.get(rosterPlayer.id)!.push(appearance);
                        const weekSeries: number[] = [];
                        const weekAvgs: number[] = [];
                        for (const matchup of team.matchups) {
                            const ps = matchup.scores?.playerScores.find((s) => s.player === rosterPlayer.id);
                            if (ps && ps.games.length > 0) {
                                addSeries(rosterPlayer.id, seasonLabel, league.id, ps.games);
                                if (ps.series?.scratchScore) weekSeries.push(ps.series.scratchScore);
                                if (ps.series?.average) weekAvgs.push(ps.series.average);
                            }
                        }
                        if (weekSeries.length > 0) {
                            weekSeriesByPlayer.set(rosterPlayer.id, weekSeries);
                            weekAveragesByPlayer.set(rosterPlayer.id, weekAvgs);
                        }
                    }
                }
            } catch (err) {
                console.warn(`Skipping league ${league.id} during roster scan:`, err);
            }
        }
    }

    return {playerMap, seriesByPlayerSeason, seriesByPlayer, seriesByPlayerLeague, appearancesByPlayer, weekSeriesByPlayer, weekAveragesByPlayer};
}

function statsFromSeries(allSeries: TeamPlayerGameScore[][]): PlayerStats {
    const stats = new PlayerStats();
    if (allSeries.length > 0) calculatePlayerStats(allSeries, stats);
    return stats;
}

function ratioPct(rg: {pct: number; denominator: number}): number | null {
    if (rg.denominator <= 0) return null;
    return Math.round(rg.pct * 1000) / 10;
}

function richFromStats(s: PlayerStats) {
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
        firstBall: s.firstBallAverage || null,
        strikePct: ratioPct(s.strikes),
        sparePct: ratioPct(s.spares),
        singlePinPct: ratioPct(s.singlePinSpares),
        openPct: ratioPct(s.opens),
        splitPct: ratioPct(s.splits),
        strikeToSparePct: s.strikesToSpares.denominator > 0
            ? Math.round(s.strikesToSpares.pct * 100) / 100
            : null,
        singlePinPickup: s.allSinglePinsPickedUpAverage > 0
            ? Math.round(s.allSinglePinsPickedUpAverage * 10) / 10 : null,
        lowGame: s.gameStats.min || null,
        lowSeries: s.seriesStats.min || null,
        seriesCount: s.seriesStats.count || 0,
    };
}

function buildSeasonStats(seriesBySeason: Map<string, TeamPlayerGameScore[][]> | undefined): PlayerSeasonStats[] {
    if (!seriesBySeason) return [];
    const rows: PlayerSeasonStats[] = [];
    for (const [season, series] of seriesBySeason.entries()) {
        const stats = statsFromSeries(series);
        rows.push({
            season, leagues: 0, games: stats.gameStats.count, average: stats.gameStats.average,
            pinfall: stats.pinfall, highGame: stats.gameStats.max, highSeries: stats.seriesStats.max, games200: stats.games200,
            cleanGames: stats.cleanGames, hungCount: stats.hungCount, turkeyCount: stats.turkeyCount,
        });
    }
    rows.sort((a, b) => b.season.localeCompare(a.season));
    return rows;
}

export async function buildFullPlayerList(): Promise<PlayerListEntry[]> {
    const scan = await scanAllRosters();
    const entries: PlayerListEntry[] = [];
    for (const [id, info] of scan.playerMap.entries()) {
        const series = scan.seriesByPlayer.get(id) ?? [];
        const stats = statsFromSeries(series);
        const bySeason = scan.seriesByPlayerSeason.get(id);
        const seasonSlices: PlayerListSeasonSlice[] = [];
        if (bySeason) {
            for (const [season, seasonSeries] of bySeason.entries()) {
                seasonSlices.push({season, ...richFromStats(statsFromSeries(seasonSeries))});
            }
            seasonSlices.sort((a, b) => b.season.localeCompare(a.season));
        }
        const appearanceSlices: PlayerAppearanceSlice[] = [];
        const leagueSeries = scan.seriesByPlayerLeague.get(id);
        for (const ap of scan.appearancesByPlayer.get(id) ?? []) {
            const key = `${ap.season}::${ap.leagueId}`;
            const leagueGames = leagueSeries?.get(key) ?? [];
            const computed = leagueGames.length > 0 ? richFromStats(statsFromSeries(leagueGames)) : null;
            const st = ap.stats;
            const games = computed?.games ?? st?.gameStats.count ?? 0;
            appearanceSlices.push({
                season: ap.season,
                leagueId: ap.leagueId,
                leagueName: ap.leagueName,
                teamId: ap.teamId,
                teamName: ap.teamName,
                average: computed?.average ?? (games > 0 && st ? st.gameStats.average : null),
                games,
                pinfall: computed?.pinfall ?? st?.pinfall ?? 0,
                highGame: computed?.highGame ?? st?.gameStats.max ?? 0,
                highSeries: computed?.highSeries ?? st?.seriesStats.max ?? 0,
                games200: computed?.games200 ?? st?.games200 ?? 0,
                games300: computed?.games300 ?? 0,
                series600: computed?.series600 ?? 0,
                series800: computed?.series800 ?? 0,
                cleanGames: computed?.cleanGames ?? 0,
                hungCount: computed?.hungCount ?? 0,
                turkeyCount: computed?.turkeyCount ?? 0,
                firstBall: computed?.firstBall ?? null,
                strikePct: computed?.strikePct ?? null,
                sparePct: computed?.sparePct ?? null,
                singlePinPct: computed?.singlePinPct ?? null,
                openPct: computed?.openPct ?? null,
                splitPct: computed?.splitPct ?? null,
                strikeToSparePct: computed?.strikeToSparePct ?? null,
                singlePinPickup: computed?.singlePinPickup ?? null,
                lowGame: computed?.lowGame ?? null,
                lowSeries: computed?.lowSeries ?? null,
                seriesCount: computed?.seriesCount ?? 0,
            });
        }
        entries.push({
            id, name: info.name,
            average: stats.gameStats.count > 0 ? stats.gameStats.average : null,
            games: stats.gameStats.count, pinfall: stats.pinfall,
            highGame: stats.gameStats.max, highSeries: stats.seriesStats.max, games200: stats.games200,
            seasonSlices, appearanceSlices,
            weekAverages: scan.weekAveragesByPlayer.get(id),
            weekSeries: scan.weekSeriesByPlayer.get(id),
            lastBowled: info.lastBowled,
        });
    }
    entries.sort((a, b) => {
        if (b.games !== a.games) return b.games - a.games;
        if (a.average == null && b.average == null) return a.name.localeCompare(b.name);
        if (a.average == null) return 1;
        if (b.average == null) return -1;
        if (b.average !== a.average) return b.average - a.average;
        return a.name.localeCompare(b.name);
    });
    return entries;
}

export async function aggregatePlayerData(playerId: string): Promise<AggregatedPlayerData> {
    const scan = await scanAllRosters();
    const info = scan.playerMap.get(playerId);
    if (!info) throw new Error(`Player not found: ${playerId}`);
    const player = new PlayerInfo();
    player.id = playerId;
    player.name = info.name;
    player.lastBowled = info.lastBowled;
    const appearances = scan.appearancesByPlayer.get(playerId) ?? [];
    const careerStats = statsFromSeries(scan.seriesByPlayer.get(playerId) ?? []);
    const seasonStats = buildSeasonStats(scan.seriesByPlayerSeason.get(playerId));
    for (const row of seasonStats) {
        row.leagues = new Set(appearances.filter((a) => a.season === row.season).map((a) => a.leagueId)).size;
    }
    const seasonSlicesFull: PlayerSliceStats[] = [];
    const bySeason = scan.seriesByPlayerSeason.get(playerId);
    if (bySeason) {
        for (const [season, series] of bySeason.entries()) {
            seasonSlicesFull.push({season, stats: statsFromSeries(series)});
        }
        seasonSlicesFull.sort((a, b) => (b.season ?? "").localeCompare(a.season ?? ""));
    }
    const appearanceSlicesFull: PlayerSliceStats[] = [];
    const byLeague = scan.seriesByPlayerLeague.get(playerId);
    for (const ap of appearances) {
        const key = `${ap.season}::${ap.leagueId}`;
        const series = byLeague?.get(key) ?? [];
        appearanceSlicesFull.push({
            season: ap.season,
            leagueId: ap.leagueId,
            leagueName: ap.leagueName,
            stats: series.length > 0 ? statsFromSeries(series) : (ap.stats ?? new PlayerStats()),
        });
    }
    return {player, appearances, careerStats, seasonStats, seasonSlicesFull, appearanceSlicesFull};
}
