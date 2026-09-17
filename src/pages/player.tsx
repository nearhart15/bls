/*
 * Player routes (c) 2026
 */

import {type FC, useCallback} from "react";
import {Navigate, useParams} from "react-router";

import Loader from "./components/loader";
import ErrorDisplay from "./components/error-display";
import PlayerList from "./components/player/player-list";
import PlayerDetail from "./components/player/player-detail";
import PlayerCompare from "./components/player/player-compare";
import ApiPlayerCompare from "./components/player/api-player-compare";
import PlayerLeaderboard from "./components/player/player-leaderboard";
import HandicapGuide from "./components/player/handicap-guide";
import {ApiPlayerDetail, ApiPlayerLeaderboard, ApiPlayerList} from "./components/player/api-player-screens";
import {useDataSource} from "./components/data-source";
import {useCachedFetcher} from "./components/cache/data-loader";
import {
    aggregatePlayerData,
    type AggregatedPlayerData,
    PLAYER_DETAIL_CACHE_CATEGORY,
    PLAYER_INDEX_CACHE_CATEGORY,
    type PlayerListEntry,
} from "../data/player/player-aggregate";
import {apiPlayerListFetcher} from "../data/player/api-player-data";

const API_PLAYER_INDEX_CACHE_CATEGORY = `${PLAYER_INDEX_CACHE_CATEGORY}-api`;
const normalizePlayerName = (name: string) => name.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");

const PlayerDetailPage: FC<{playerId: string}> = ({playerId}) => {
    const fetcher = useCallback(() => aggregatePlayerData(playerId), [playerId]);
    const apiFetcher = useCallback(() => apiPlayerListFetcher(), []);
    const {data, isLoading, error} = useCachedFetcher<AggregatedPlayerData>(fetcher, PLAYER_DETAIL_CACHE_CATEGORY, playerId);
    const {data: apiPlayers, isLoading: apiLoading} = useCachedFetcher<PlayerListEntry[]>(apiFetcher, API_PLAYER_INDEX_CACHE_CATEGORY);
    if (isLoading) return <Loader />;
    if (error) return <ErrorDisplay message="Error loading player stats." error={error} />;
    if (!data) return <ErrorDisplay message={`Player not found: ${playerId}`} />;

    if (data.careerStats.gameStats.count === 0) {
        if (apiLoading) return <Loader />;
        const normalizedName = normalizePlayerName(data.player.name ?? playerId);
        const apiPlayer = apiPlayers?.find(player => normalizePlayerName(player.name) === normalizedName);
        if (apiPlayer) return <Navigate replace to={`/player/${apiPlayer.id}`} />;
    }

    return <PlayerDetail data={data} />;
};

const Player: FC = () => {
    const {playerId} = useParams();
    const {source} = useDataSource();

    if (playerId === "handicap") return <HandicapGuide />;
    if (playerId?.startsWith("api-")) return <ApiPlayerDetail key={playerId} playerId={playerId} />;

    if (source === "api") {
        if (playerId === "compare") return <ApiPlayerCompare />;
        if (playerId === "leaderboard") return <ApiPlayerLeaderboard />;
        if (playerId) return <ApiPlayerDetail key={playerId} playerId={playerId} />;
        return <div className="container-md"><ApiPlayerList /></div>;
    }

    if (playerId === "compare") return <PlayerCompare />;
    if (playerId === "leaderboard") return <PlayerLeaderboard />;
    if (playerId) return <PlayerDetailPage key={playerId} playerId={playerId} />;
    return <div className="container-md"><PlayerList /></div>;
};

export default Player;
