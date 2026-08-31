/*
 * Aggregate player stats across leagues © 2026
 */

import moment from "moment";

import {leagueInfoListFetcher} from "../league/league-api";
import {leagueDetailsFetcher} from "../league/league-api";
import type {LeaguePlayerStats} from "../league/league-team-details";
import type {TeamPlayerGameScore} from "../league/league-matchup";
import {PlayerStats} from "./player-stats";
import {calculatePlayerStats} from "./player-stats-calculator";
import {playerListFetcher} from "./player-api";
import type {PlayerInfo} from "./player-info";

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
}

export interface AggregatedPlayerData {
    player: PlayerInfo;
    appearances: PlayerLeagueAppearance[];
    careerStats: PlayerStats;
    seasonStats: PlayerSeasonStats[];
}

/** Summary row for the home/player list */
export interface PlayerListEntry {
    id: string;
    name: string;
    average: number | null;
    games: number;
    pinfall: number;
    highGame: number;
    highSeries: number;
    games200: number;
    /** Per-week series averages for sparkline (most recent league activity) */
    weekAverages?: number[];
    /** Per-week series totals for micro-bars */
    weekSeries?: number[];
    lastBowled?: moment.Moment;
}

export const PLAYER_DETAIL_CACHE_CATEGORY = "player-detail";
export const PLAYER_INDEX_CACHE_CATEGORY = "player-index-full";

interface RosterScanResult {
    playerMap: Map<string, {name: string; lastBowled?: moment.Moment}>;
    seriesByPlayerSeason: Map<string, Map<string, TeamPlayerGameScore[][]>>;
    seriesByPlayer: Map<string, TeamPlayerGameScore[][]>;
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

    const addSeries = (playerId: string, season: string, games: TeamPlayerGameScore[]) => {
        if (!seriesByPlayer.has(playerId)) {
            seriesByPlayer.set(playerId, []);
        }
        seriesByPlayer.get(playerId)!.push(games);

        if (!seriesByPlayerSeason.has(playerId)) {
            seriesByPlayerSeason.set(playerId, new Map());
        }
        const bySeason = seriesByPlayerSeason.get(playerId)!;
        if (!bySeason.has(season)) {
            bySeason.set(season, []);
        }
        bySeason.get(season)!.push(games);
    };

    for (const season of leagues.seasons) {
        for (const league of season.leagues) {
            if (!league.hasData()) continue;
            try {
                const details = await leagueDetailsFetcher(league.id);
                for (const team of details.trackedTeams ?? []) {
                    for (const player of team.roster ?? []) {
                        if (!player.id) continue;
                        if (!playerMap.has(player.id)) {
                            playerMap.set(player.id, {name: player.name ?? player.id});
                        }

                        const appearance: PlayerLeagueAppearance = {
                            season: season.season,
                            leagueId: String(league.id),
                            leagueName: league.name ?? String(league.id),
                            teamId: String(team.id),
                            teamName: team.name ?? String(team.id),
                            teamNumber: team.number ?? 0,
                            status: player.status ?? "REGULAR",
                            stats: player.playerStats,
                        };
                        if (!appearancesByPlayer.has(player.id)) {
                            appearancesByPlayer.set(player.id, []);
                        }
                        appearancesByPlayer.get(player.id)!.push(appearance);

                        const weekSeries: number[] = [];
                        const weekAvgs: number[] = [];

                        for (const matchup of team.matchups ?? []) {
                            const score = matchup.scores?.playerScores?.find(
                                (ps) => ps.player === player.id
                            );
                            if (!score || score.games?.[0]?.blind) continue;
                            const games = score.games.filter((g) => !g.blind && !g.vacant);
                            if (games.length === 0) continue;
                            addSeries(player.id, season.season, games);
                            if (score.series?.scratchScore != null) {
                                weekSeries.push(score.series.scratchScore);
                            }
                            if (score.series?.average != null) {
                                weekAvgs.push(score.series.average);
                            }
                        }

                        // Prefer most recent league with data for trends
                        if (weekSeries.length > 0) {
                            weekSeriesByPlayer.set(player.id, weekSeries);
                            weekAveragesByPlayer.set(player.id, weekAvgs);
                        }
                    }
                }
            } catch {
                // skip league load failures
            }
        }
    }

    return {
        playerMap,
        seriesByPlayerSeason,
        seriesByPlayer,
        appearancesByPlayer,
        weekSeriesByPlayer,
        weekAveragesByPlayer,
    };
}

function statsFromSeries(allSeries: TeamPlayerGameScore[][]): PlayerStats {
    const stats = new PlayerStats();
    if (allSeries.length > 0) {
        calculatePlayerStats(allSeries, stats);
    }
    return stats;
}

function buildSeasonStats(
    seriesBySeason: Map<string, TeamPlayerGameScore[][]> | undefined
): PlayerSeasonStats[] {
    if (!seriesBySeason) return [];

    const rows: PlayerSeasonStats[] = [];
    for (const [season, series] of seriesBySeason.entries()) {
        const stats = statsFromSeries(series);
        rows.push({
            season,
            leagues: 0,
            games: stats.gameStats.count,
            average: stats.gameStats.average,
            pinfall: stats.pinfall,
            highGame: stats.gameStats.max,
            highSeries: stats.seriesStats.max,
            games200: stats.games200,
        });
    }
    rows.sort((a, b) => b.season.localeCompare(a.season));
    return rows;
}

export async function aggregatePlayerData(playerId: string): Promise<AggregatedPlayerData> {
    const scan = await scanAllRosters();
    const info = scan.playerMap.get(playerId);
    const player: PlayerInfo = {
        id: playerId,
        name: info?.name ?? playerId,
        lastBowled: info?.lastBowled,
    } as PlayerInfo;

    const series = scan.seriesByPlayer.get(playerId) ?? [];
    const careerStats = statsFromSeries(series);
    const appearances = scan.appearancesByPlayer.get(playerId) ?? [];
    const seasonStats = buildSeasonStats(scan.seriesByPlayerSeason.get(playerId));

    // Fill league counts per season from appearances
    for (const row of seasonStats) {
        row.leagues = new Set(
            appearances.filter((a) => a.season === row.season).map((a) => a.leagueId)
        ).size;
    }

    return {player, appearances, careerStats, seasonStats};
}

export async function buildFullPlayerList(): Promise<PlayerListEntry[]> {
    const scan = await scanAllRosters();
    const entries: PlayerListEntry[] = [];

    for (const [id, info] of scan.playerMap.entries()) {
        const series = scan.seriesByPlayer.get(id) ?? [];
        const stats = statsFromSeries(series);
        entries.push({
            id,
            name: info.name,
            average: stats.gameStats.count > 0 ? stats.gameStats.average : null,
            games: stats.gameStats.count,
            pinfall: stats.pinfall,
            highGame: stats.gameStats.max,
            highSeries: stats.seriesStats.max,
            games200: stats.games200,
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
