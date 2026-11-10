import type {PlayerListEntry} from "../../../data/player/player-aggregate";
import {comparePinnedThen} from "../../../data/player/player-pin";
import {availableSeasons, slicesForSeason} from "../../../data/player/season-scope";
import {aggregateSlices} from "../../../data/player/slice-stats";

function searchText(value: string): string {
    return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function bowlerTeamNames(player: PlayerListEntry, season?: string): string[] {
    return [...new Set(player.appearanceSlices
        .filter(slice => season === undefined || slice.season === season)
        .map(slice => slice.teamName.trim()).filter(Boolean))];
}

/** Every word can match the bowler or one of their teams. Prefer name matches. */
export function findBowlers(entries: PlayerListEntry[], query: string): PlayerListEntry[] {
    const normalizedQuery = searchText(query);
    const words = normalizedQuery.split(" ").filter(Boolean);
    const matches = entries.map(player => {
        const name = searchText(player.name);
        const context = `${name} ${searchText(bowlerTeamNames(player).join(" "))}`;
        const score = !normalizedQuery ? 0 : name === normalizedQuery ? 0
            : name.startsWith(normalizedQuery) ? 1
                : words.every(word => name.includes(word)) ? 2 : 3;
        return {player, name, context, score};
    }).filter(({context}) => words.every(word => context.includes(word)));
    matches.sort((a, b) => {
        const fallback = a.name.localeCompare(b.name) || a.player.id.localeCompare(b.player.id);
        return normalizedQuery ? a.score - b.score || fallback
            : comparePinnedThen(a.player.name, b.player.name, fallback);
    });
    return matches.map(({player}) => player);
}

export function currentBowlerSeason(entries: PlayerListEntry[]): string | undefined {
    return availableSeasons(entries)[0];
}

/** A missing current season stays empty instead of showing an older season's totals. */
export function bowlerSeasonPreview(player: PlayerListEntry, season: string | undefined) {
    const {average, games, highGame, highSeries} = aggregateSlices(slicesForSeason(player.seasonSlices, season));
    return {average, games, highGame, highSeries};
}
