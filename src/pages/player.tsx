/*
 * Player routes (c) 2026
 */

import {type FC, useCallback} from "react";
import {useParams} from "react-router";

import Loader from "./components/loader";
import ErrorDisplay from "./components/error-display";
import PlayerList from "./components/player/player-list";
import PlayerDetail from "./components/player/player-detail";
import PlayerCompare from "./components/player/player-compare";
import PlayerLeaderboard from "./components/player/player-leaderboard";
import HandicapGuide from "./components/player/handicap-guide";
import {ApiPlayerCompare, ApiPlayerDetail, ApiPlayerLeaderboard, ApiPlayerList} from "./components/player/api-player-screens";
import {useDataSource} from "./components/data-source";
import {useCachedFetcher} from "./components/cache/data-loader";
import {
    aggregatePlayerData,
    type AggregatedPlayerData,
    PLAYER_DETAIL_CACHE_CATEGORY,
} from "../data/player/player-aggregate";

const PlayerDetailPage: FC<{playerId: string}> = ({playerId}) => {
    const fetcher = useCallback(() => aggregatePlayerData(playerId), [playerId]);
    const {data, isLoading, error} = useCachedFetcher<AggregatedPlayerData>(fetcher, PLAYER_DETAIL_CACHE_CATEGORY, playerId);
    if (isLoading) return <Loader />;
    if (error) return <ErrorDisplay message="Error loading player stats." error={error} />;
    if (!data) return <ErrorDisplay message={`Player not found: ${playerId}`} />;
    return <PlayerDetail data={data} />;
};

const Player: FC = () => {
    const {playerId} = useParams();
    const {source} = useDataSource();

    if (playerId === "handicap") return <HandicapGuide />;

    // API profile links are self-identifying so links from Full League Info work
    // even when the user's global selector is currently set to BinBin Data.
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
