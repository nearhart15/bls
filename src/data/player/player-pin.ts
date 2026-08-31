/*
 * Pin favorite bowlers to the top of player lists.
 */

const PINNED = ["nick", "bindul", "luke", "brian"];

export function pinnedPlayerRank(name: string | null | undefined): number {
    const tokens = (name ?? "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    for (let i = 0; i < PINNED.length; i++) {
        if (tokens.includes(PINNED[i])) return i;
    }
    return PINNED.length;
}

export function comparePinnedThen(aName: string, bName: string, fallback: number): number {
    const pin = pinnedPlayerRank(aName) - pinnedPlayerRank(bName);
    return pin !== 0 ? pin : fallback;
}
