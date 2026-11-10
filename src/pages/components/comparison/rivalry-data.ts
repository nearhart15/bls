import {comparePinnedThen} from "../../../data/player/player-pin";
import type {DataSource} from "../data-source";

export interface RivalBowler {
    id: string;
    name: string;
    average: number | null;
    games: number;
    teamName?: string;
}
export interface RivalSuggestion extends RivalBowler {gap: number}
export interface RivalryScope {mode: "career" | "season"; season?: string; leagueId?: string}

function hasGames(row: RivalBowler): boolean {
    return Boolean(row.id) && Number.isFinite(row.games) && row.games > 0;
}
function byName(a: RivalBowler, b: RivalBowler): number {
    return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}
export function recommendRivals(rows: RivalBowler[], anchorId: string, limit = 3): RivalSuggestion[] {
    const anchor = rows.find(row => row.id === anchorId && hasGames(row));
    if (!anchor || anchor.average == null || !Number.isFinite(anchor.average)) return [];
    const average = anchor.average;
    return rows.filter(row => row.id !== anchorId && hasGames(row) && row.average != null && Number.isFinite(row.average))
        .map(row => ({...row, gap: Math.abs(row.average! - average)}))
        .sort((a, b) => a.gap - b.gap || byName(a, b))
        .slice(0, Math.max(0, Math.floor(limit)));
}
export function resolveRivalry(rows: RivalBowler[], requestedA: string | null, requestedB: string | null, savedA: string | null) {
    const eligible = rows.filter(hasGames).sort((a, b) => comparePinnedThen(a.name, b.name, byName(a, b)));
    const a = eligible.find(row => row.id === requestedA) ?? eligible.find(row => row.id === savedA) ?? eligible[0];
    const suggestions = a ? recommendRivals(eligible, a.id) : [];
    const b = eligible.find(row => row.id === requestedB && row.id !== a?.id)
        ?? suggestions[0] ?? eligible.find(row => row.id !== a?.id);
    return {a, b, suggestions};
}
export function buildRivalryPath(source: DataSource, a: string, b?: string, scope?: RivalryScope): string {
    const params = new URLSearchParams({source});
    if (a) params.set("a", a);
    if (b && b !== a) params.set("b", b);
    if (scope) {
        params.set("mode", scope.mode);
        if (scope.mode === "season" && scope.season) {
            params.set("season", scope.season);
            if (scope.leagueId) params.set("leagueId", scope.leagueId);
        }
    }
    return "/player/compare?" + params.toString();
}
