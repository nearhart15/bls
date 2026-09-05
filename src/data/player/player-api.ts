import {fetchJson} from "../utils/fetch-json";
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

import moment from "moment";

import {PlayerInfo, Players} from "./player-info";
import {createJsonConverter} from "../utils/json-utils";
import {compareMoments} from "../utils/utils";

export const PLAYER_LIST_CACHE_CATEGORY = "player-list";
// const APP_URL_BASE = import.meta.env.VITE_DATA_URL_BASE;
const PLAYER_INDEX_RESOURCE = import.meta.env.VITE_DATA_PLAYERS_INDEX_RESOURCE;

function postProcessLoadedPlayers(players : Players) : Players {
    // Set default last bowled dates for every player
    players.players.forEach(player => {
        player.lastBowled ??= moment();
    })
    // Sort by last bowled and then by initials
    players.players.sort((a:PlayerInfo, b:PlayerInfo) => {
        const lbd = compareMoments(a.lastBowled, b.lastBowled);
        return lbd != 0 ? lbd : a.id.localeCompare(b.id);
    });
    return players;
}

export const playerListFetcher = async() =>
    fetchJson(PLAYER_INDEX_RESOURCE)
        .then((json :object) => createJsonConverter().deserialize<Players>(json, Players))
        .then(p => postProcessLoadedPlayers(p));
