/*
 * Player cross-league aggregation © 2026
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {leagueDetailsFetcher, leagueInfoListFetcher} from "../league/league-api";
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

export interface AggregatedPlayerData {
    player: PlayerInfo;
    appearances: PlayerLeagueAppearance[];
    careerStats: PlayerStats;
}

export const PLAYER_DETAIL_CACHE_CATEGORY = "player-detail";

/**
 * Load a player and aggregate their stats across all tracked leagues/teams.
 */
export async function aggregatePlayerData(playerId: string): Promise<AggregatedPlayerData> {
    const [players, leagues] = await Promise.all([
        playerListFetcher(),
        leagueInfoListFetcher(),
    ]);

    const player = players.players.find((p) => p.id === playerId);
    if (!player) {
        throw new Error(`Player not found: ${playerId}`);
    }

    const appearances: PlayerLeagueAppearance[] = [];
    const allSeries: TeamPlayerGameScore[][] = [];

    for (const season of leagues.seasons) {
        for (const league of season.leagues) {
            if (!league.hasData() || !league.dataLoc || !league.id) {
                continue;
            }
            try {
                const details = await leagueDetailsFetcher(league.dataLoc);
                for (const team of details.teams) {
                    const rosterPlayer = team.roster.find((rp) => rp.id === playerId);
                    if (!rosterPlayer) {
                        continue;
                    }

                    appearances.push({
                        season: season.season ?? "",
                        leagueId: league.id,
                        leagueName: league.name ?? league.id,
                        teamId: team.id ?? "",
                        teamName: team.name ?? "",
                        teamNumber: team.number,
                        status: rosterPlayer.status ?? "REGULAR",
                        stats: rosterPlayer.playerStats,
                    });

                    // Collect game series for career aggregation
                    for (const matchup of team.matchups) {
                        const ps = matchup.scores?.playerScores.find((s) => s.player === playerId);
                        if (ps && ps.games.length > 0) {
                            allSeries.push(ps.games);
                        }
                    }
                }
            } catch (err) {
                console.warn(`Skipping league ${league.id} for player aggregate:`, err);
            }
        }
    }

    const careerStats = new PlayerStats();
    if (allSeries.length > 0) {
        calculatePlayerStats(allSeries, careerStats);
    }

    return {player, appearances, careerStats};
}
