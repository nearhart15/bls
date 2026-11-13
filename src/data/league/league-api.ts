import {validateFrames} from "../utils/bowling-input";
import {sharedLoad} from "../utils/shared-load";
import {validateLeague} from "./validate-league";
import {reconcileLeagueMetadata} from "./league-metadata";
import {recordFrameFreshness} from "../utils/source-freshness";
import {fetchJson, dataUrl} from "../utils/fetch-json";
/*
 * Copyright (c) 2025. Bindul Bhowmik
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

import {LeagueDetails} from "./league-details";
import {AvailableLeagues} from "./league-info";
import {TrackedLeagueTeam} from "./league-team-details";
import {createJsonConverter} from "../utils/json-utils";

export const LEAGUE_LIST_CACHE_CATEGORY = "league-list";
export const LEAGUE_DETAILS_CACHE_CATEGORY = "league-details";

const APP_URL_BASE = import.meta.env.VITE_DATA_URL_BASE;
const LEAGUE_INDEX_RESOURCE = import.meta.env.VITE_DATA_LEAGUES_INDEX_RESOURCE;

export const leagueInfoListFetcher = async() =>
    fetchJson(LEAGUE_INDEX_RESOURCE)
        .then((json :object) => createJsonConverter().deserialize<AvailableLeagues>(json, AvailableLeagues));

export const leagueTeamDetailsFetcher = async(dataLoc: string) => {
    const json = await fetchJson(dataUrl(APP_URL_BASE, dataLoc), {validateFrameScores: false});
    const team = createJsonConverter().deserialize<TrackedLeagueTeam>(json, TrackedLeagueTeam);
    return team;
};

const loadLeagueDetails = async(dataLoc: string, expectedLeagueId?: string) => {
    const leagueDetails: LeagueDetails = await fetchJson(dataUrl(APP_URL_BASE, dataLoc))
        .then((json: object) => createJsonConverter().deserialize<LeagueDetails>(json, LeagueDetails));

    // Load independent team files concurrently and overlap the heavy calculator chunk with I/O.
    const [teams, {decorateLeagueDetails}] = await Promise.all([
        Promise.all(leagueDetails.teams.map(async (team): Promise<TrackedLeagueTeam> =>
            team.dataLoc && team.dataLoc.length > 0 ? leagueTeamDetailsFetcher(team.dataLoc) : team
        )),
        import("./league-calculators"),
    ]);
    leagueDetails.teams = teams;

    reconcileLeagueMetadata(leagueDetails, expectedLeagueId);
    validateLeague(leagueDetails);
    for (const team of teams) {
        for (const matchup of team.matchups) {
            try {
                for (const player of matchup.scores?.playerScores ?? []) {
                    for (const game of player.games) {
                        if (game.inFrames.length > 0) validateFrames(game.inFrames);
                    }
                }
            } catch {
                matchup.resultsUnavailable = true;
                matchup.scores = undefined;
            }
        }
    }
    // Empty score objects are schedule placeholders, not bowled zero-score series.
    for (const team of leagueDetails.teams) {
        for (const matchup of team.matchups) {
            if (matchup.scores?.playerScores.length === 0 && matchup.scores.games.length === 0) {
                matchup.scores = undefined;
            }
            if (matchup.opponent?.scores?.games.length === 0) {
                matchup.opponent.scores = undefined;
            }
        }
    }
    decorateLeagueDetails(leagueDetails)
    recordFrameFreshness(leagueDetails);
    return leagueDetails;
}

export const leagueDetailsFetcher = (dataLoc: string, expectedLeagueId?: string): Promise<LeagueDetails> =>
    sharedLoad("loaded-leagues", JSON.stringify([APP_URL_BASE, dataLoc, expectedLeagueId]), () => loadLeagueDetails(dataLoc, expectedLeagueId));
