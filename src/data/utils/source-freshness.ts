import type {LeagueDetails} from "../league/league-details";

export interface SourceFreshness {
    resultsThrough: string | null;
    season?: string;
}

interface FreshnessSnapshot {
    frame: Readonly<Record<string, SourceFreshness>>;
    api: SourceFreshness | null;
}

let snapshot: FreshnessSnapshot = {frame: {}, api: null};
const listeners = new Set<() => void>();

/** A result date is a calendar date, never the time the import or page ran. */
export function normalizeResultsDate(value: string | null | undefined): string | null {
    if (!value) return null;
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
    if (!iso && !us) return null;
    const year = Number(iso?.[1] ?? us?.[3]);
    const month = Number(iso?.[2] ?? us?.[1]);
    const day = Number(iso?.[3] ?? us?.[2]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function frameFreshness(league: LeagueDetails, teamId?: string): SourceFreshness {
    let resultsThrough: string | null = null;
    const teams = teamId ? league.teams.filter(team => team.id === teamId) : league.teams;
    for (const team of teams) {
        for (const matchup of team.matchups) {
            // Scheduled dates, empty score placeholders, and blind-only lineups
            // do not establish that any bowling results have been received.
            const hasPlayedGame = matchup.scores?.playerScores.some(player =>
                player.games.some(game => !game.blind && !game.vacant)
            );
            if (!hasPlayedGame) continue;
            const played = matchup.bowlDate ?? matchup.scheduledDate;
            const date = played?.isValid() ? normalizeResultsDate(played.format("YYYY-MM-DD")) : null;
            if (date && (!resultsThrough || date > resultsThrough)) resultsThrough = date;
        }
    }
    return {resultsThrough, season: league.season};
}

/** Called by existing loaders, so displaying freshness adds no data requests. */
export function recordFrameFreshness(league: LeagueDetails): void {
    if (!league.id) return;
    const next = frameFreshness(league);
    const previous = snapshot.frame[league.id];
    if (previous?.resultsThrough === next.resultsThrough && previous?.season === next.season) return;
    snapshot = {...snapshot, frame: {...snapshot.frame, [league.id]: next}};
    listeners.forEach(listener => { listener(); });
}

export function recordApiFreshness(data: {status?: string; league?: {date?: string | null; season?: string | null}}): void {
    if (data.status !== "ready") return;
    const next = {resultsThrough: normalizeResultsDate(data.league?.date), season: data.league?.season ?? undefined};
    if (snapshot.api?.resultsThrough === next.resultsThrough && snapshot.api?.season === next.season) return;
    snapshot = {...snapshot, api: next};
    listeners.forEach(listener => { listener(); });
}

export function subscribeToFreshness(listener: () => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function freshnessSnapshot(): FreshnessSnapshot { return snapshot; }

export function latestFrameResults(frame: Readonly<Record<string, SourceFreshness>>): string | null {
    return Object.values(frame).reduce<string | null>((latest, source) =>
        source.resultsThrough && (!latest || source.resultsThrough > latest) ? source.resultsThrough : latest,
    null);
}
