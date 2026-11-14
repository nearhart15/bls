/*
 * Player routes (c) 2026
 */

import {lazy, type FC, useCallback} from "react";
import {Navigate, useParams, useSearchParams} from "react-router";

import Loader from "./components/loader";
import ErrorDisplay from "./components/error-display";
import PlayerList from "./components/player/player-list";
const PlayerDetail = lazy(() => import("./components/player/player-detail"));
const PlayerCompare = lazy(() => import("./components/player/player-compare"));
const HandicapGuide = lazy(() => import("./components/player/handicap-guide"));
const PlayerLeaderboard = lazy(() => import("./components/player/player-leaderboard"));
const ApiPlayerCompare = lazy(() => import("./components/player/api-player-compare"));
const ApiPlayerDetail = lazy(async () => ({default: (await import("./components/player/api-player-screens")).ApiPlayerDetail}));
const ApiPlayerLeaderboard = lazy(async () => ({default: (await import("./components/player/api-player-screens")).ApiPlayerLeaderboard}));
const ApiPlayerList = lazy(async () => ({default: (await import("./components/player/api-player-screens")).ApiPlayerList}));
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
import {findApiPlayerForFrameProfile} from "../data/player/player-source-match";

const API_PLAYER_INDEX_CACHE_CATEGORY = `${PLAYER_INDEX_CACHE_CATEGORY}-api`;

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
        const apiPlayer = findApiPlayerForFrameProfile(playerId, data.player.name, apiPlayers);
        if (apiPlayer) return <Navigate replace to={`/player/${apiPlayer.id}`} />;
    }

    return <PlayerDetail data={data} />;
};

const ApiPlayerDetailBridge: FC<{playerId: string}> = ({playerId}) => {
    const frameFetcher = useCallback(() => aggregatePlayerData(playerId), [playerId]);
    const apiFetcher = useCallback(() => apiPlayerListFetcher(), []);
    const {data: frameData, isLoading: frameLoading, error: frameError} = useCachedFetcher<AggregatedPlayerData>(
        frameFetcher,
        PLAYER_DETAIL_CACHE_CATEGORY,
        playerId,
    );
    const {data: apiPlayers, isLoading: apiLoading, error: apiError} = useCachedFetcher<PlayerListEntry[]>(
        apiFetcher,
        API_PLAYER_INDEX_CACHE_CATEGORY,
    );

    if (frameLoading || apiLoading) return <Loader />;
    if (frameError) return <ErrorDisplay message="Error matching this BinBin player to A.B.C. data." error={frameError} />;
    if (apiError) return <ErrorDisplay message="Error loading A.B.C. player data." error={apiError} />;

    const apiPlayer = findApiPlayerForFrameProfile(playerId, frameData?.player.name, apiPlayers);

    if (apiPlayer) return <Navigate replace to={`/player/${apiPlayer.id}`} />;

    // If this BinBin player has no A.B.C. counterpart, fall back to the A.B.C.
    // player list instead of leaving the user on a broken detail route.
    return <Navigate replace to="/player" />;
};

const Player: FC = () => {
    const {playerId} = useParams();
    const {source} = useDataSource();
    const [params] = useSearchParams();
    const linkedSource = params.get("source");
    const compareSource = linkedSource === "api" || linkedSource === "frame" ? linkedSource : source;
    if (playerId === "compare") return compareSource === "api" ? <ApiPlayerCompare key="api"/> : <PlayerCompare key="frame"/>;

    if (playerId === "handicap") return <HandicapGuide />;
    if (playerId?.startsWith("api-")) return <ApiPlayerDetail key={playerId} playerId={playerId} />;

    if (source === "api") {
        if (playerId === "leaderboard") return <ApiPlayerLeaderboard />;
        if (playerId) return <ApiPlayerDetailBridge key={playerId} playerId={playerId} />;
        return <div className="container-md"><ApiPlayerList /></div>;
    }

    if (playerId === "leaderboard") return <PlayerLeaderboard />;
    if (playerId) return <PlayerDetailPage key={playerId} playerId={playerId} />;
    return <div className="container-md"><PlayerList /></div>;
};

export default Player;
