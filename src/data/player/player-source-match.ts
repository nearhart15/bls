import {normalizePlayerName} from "../league/beer-sheet";
import type {PlayerListEntry} from "./player-aggregate";

// The frame archive labels this bowler by first name only.
const apiNamesByFrameId = new Map([["ne1", "Nick Earhart"]]);

export function findApiPlayerForFrameProfile(
    frameId: string,
    frameName: string | undefined,
    apiPlayers: readonly PlayerListEntry[] | null,
): PlayerListEntry | undefined {
    const name = apiNamesByFrameId.get(frameId) ?? frameName ?? frameId;
    const normalizedName = normalizePlayerName(name);
    return apiPlayers?.find(player => normalizePlayerName(player.name) === normalizedName);
}
