import {useCallback} from "react";

import {apiPlayerListFetcher} from "../../../data/player/api-player-data";
import {buildFullPlayerList, PLAYER_INDEX_CACHE_CATEGORY, type PlayerListEntry} from "../../../data/player/player-aggregate";
import {useCachedFetcher} from "../cache/data-loader";
import {useDataSource} from "../data-source";

export function usePlayerIndexData() {
    const {source} = useDataSource();
    const fetcher = useCallback(
        () => source === "api" ? apiPlayerListFetcher() : buildFullPlayerList(),
        [source],
    );
    const result = useCachedFetcher<PlayerListEntry[]>(fetcher, `${PLAYER_INDEX_CACHE_CATEGORY}-${source}`);
    return {...result, source};
}
