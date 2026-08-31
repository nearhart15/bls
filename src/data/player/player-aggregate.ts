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
    /** Weekly series averages for sparkline */
    weekAverages?: number[];
    /** Weekly series pinfall for micro-bars */
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
        const seasonLabel = season.season ?? "";
        for (const league of season.leagues) {
            if (!league.hasData() || !league.dataLoc || !league.id) {
                continue;
            }
            try {
                const details = await leagueDetailsFetcher(league.dataLoc);
                for (const team of details.teams) {
                    for (const rosterPlayer of team.roster) {
                        if (!rosterPlayer.id) continue;

                        if (!playerMap.has(rosterPlayer.id)) {
                            playerMap.set(rosterPlayer.id, {
                                name: rosterPlayer.name ?? rosterPlayer.id,
                            });
                        } else if (rosterPlayer.name) {
                            const existing = playerMap.get(rosterPlayer.id)!;
                            if (!existing.name || existing.name === rosterPlayer.id) {
                                existing.name = rosterPlayer.name;
                            }
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
                        if (!appearancesByPlayer.has(rosterPlayer.id)) {
                            appearancesByPlayer.set(rosterPlayer.id, []);
                        }
                        appearancesByPlayer.get(rosterPlayer.id)!.push(appearance);

                        const weekSeries: number[] = [];
                        const weekAvgs: number[] = [];
                        for (const matchup of team.matchups) {
                            const ps = matchup.scores?.playerScores.find(
                                (s) => s.player === rosterPlayer.id
                            );
                            if (ps && ps.games.length > 0) {
                                addSeries(rosterPlayer.id, seasonLabel, ps.games);
                                if (ps.series?.scratchScore) {
                                    weekSeries.push(ps.series.scratchScore);
                                }
                                if (ps.series?.average) {
                                    weekAvgs.push(ps.series.average);
                                }
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

/** Full player list including everyone found on tracked rosters, with career average. */
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

/**
 * Load a player and aggregate their stats across all tracked leagues/teams.
 */
export async function aggregatePlayerData(playerId: string): Promise<AggregatedPlayerData> {
    const scan = await scanAllRosters();

    const info = scan.playerMap.get(playerId);
    if (!info) {
        throw new Error(`Player not found: ${playerId}`);
    }

    const player = new PlayerInfo();
    player.id = playerId;
    player.name = info.name;
    player.lastBowled = info.lastBowled;

    const appearances = scan.appearancesByPlayer.get(playerId) ?? [];
    const careerStats = statsFromSeries(scan.seriesByPlayer.get(playerId) ?? []);

    const seasonSeries = scan.seriesByPlayerSeason.get(playerId);
    const seasonStats = buildSeasonStats(seasonSeries);

    for (const row of seasonStats) {
        const leagueIds = new Set(
            appearances.filter((a) => a.season === row.season).map((a) => a.leagueId)
        );
        row.leagues = leagueIds.size;
    }

    return {player, appearances, careerStats, seasonStats};
}
