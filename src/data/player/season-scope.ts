import type {PlayerListEntry, PlayerListSeasonSlice} from "./player-aggregate";

/** Seasons are shared across the table; a player missing one must not fall back to an older season. */
export function availableSeasons(entries: Pick<PlayerListEntry, "seasonSlices">[]): string[] {
    return [...new Set(entries.flatMap(entry => entry.seasonSlices.map(slice => slice.season)).filter(Boolean))]
        .sort((a, b) => b.localeCompare(a, undefined, {numeric: true}));
}

export function slicesForSeason(slices: PlayerListSeasonSlice[], season: string | undefined): PlayerListSeasonSlice[] {
    return season ? slices.filter(slice => slice.season === season) : [];
}
