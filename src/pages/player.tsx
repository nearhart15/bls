/*
 * Player routes © 2026
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

import {type FC, useCallback} from "react";
import {useParams} from "react-router";

import Loader from "./components/loader";
import ErrorDisplay from "./components/error-display";
import PlayerList from "./components/player/player-list";
import PlayerDetail from "./components/player/player-detail";
import {useCachedFetcher} from "./components/cache/data-loader";
import {
    aggregatePlayerData,
    type AggregatedPlayerData,
    PLAYER_DETAIL_CACHE_CATEGORY,
} from "../data/player/player-aggregate";

const PlayerDetailPage: FC<{playerId: string}> = ({playerId}) => {
    const fetcher = useCallback(() => aggregatePlayerData(playerId), [playerId]);
    const {data, isLoading, error} = useCachedFetcher<AggregatedPlayerData>(
        fetcher,
        PLAYER_DETAIL_CACHE_CATEGORY,
        playerId
    );

    if (isLoading) {
        return <Loader/>;
    }
    if (error) {
        return <ErrorDisplay message="Error loading player stats." error={error}/>;
    }
    if (!data) {
        return <ErrorDisplay message={`Player not found: ${playerId}`}/>;
    }
    return <PlayerDetail data={data}/>;
};

const Player: FC = () => {
    const {playerId} = useParams();

    if (playerId) {
        return <PlayerDetailPage playerId={playerId}/>;
    }

    return (
        <div className="container-md">
            <PlayerList/>
        </div>
    );
};

export default Player;
