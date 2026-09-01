/*
 * Player routes (c) 2026
 */

import {type FC, useCallback} from "react";
import {Link, useParams} from "react-router";

import Loader from "./components/loader";
import ErrorDisplay from "./components/error-display";
import PlayerList from "./components/player/player-list";
import PlayerDetail from "./components/player/player-detail";
import PlayerCompare from "./components/player/player-compare";
import PlayerLeaderboard from "./components/player/player-leaderboard";
import HandicapGuide from "./components/player/handicap-guide";
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
        return <Loader />;
    }
    if (error) {
        return <ErrorDisplay message="Error loading player stats." error={error} />;
    }
    if (!data) {
        return <ErrorDisplay message={`Player not found: ${playerId}`} />;
    }
    return <PlayerDetail data={data} />;
};

const Player: FC = () => {
    const {playerId} = useParams();

    if (playerId === "compare") {
        return <PlayerCompare />;
    }
    if (playerId === "leaderboard") {
        return <PlayerLeaderboard />;
    }
    if (playerId === "handicap") {
        return <HandicapGuide />;
    }

    if (playerId) {
        return <PlayerDetailPage key={playerId} playerId={playerId} />;
    }

    return (
        <div className="container-md">
            <div className="d-flex justify-content-end mb-2 gap-2">
                <Link to="/player/leaderboard" className="btn btn-outline-primary btn-sm">
                    Leaderboard
                </Link>
                <Link to="/player/compare" className="btn btn-outline-primary btn-sm">
                    Player Compare
                </Link>
                <Link to="/player/handicap" className="btn btn-outline-primary btn-sm">
                    Handicap Guide
                </Link>
            </div>
            <PlayerList />
        </div>
    );
};

export default Player;
