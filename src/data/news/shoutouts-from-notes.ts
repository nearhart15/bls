/*
 * Shout-outs from notes on the last bowled matchups © 2026
 */

import type {Moment} from "moment";

import {leagueDetailsFetcher, leagueInfoListFetcher} from "../league/league-api";
import type {LeagueMatchup} from "../league/league-matchup";

export const SHOUTOUT_CACHE_CATEGORY = "shoutouts-from-notes-v1";

export interface MatchNoteShoutOut {
    date: Moment;
    week: number;
    leagueId: string;
    leagueName: string;
    teamId: string;
    teamName: string;
    opponentName?: string;
    notes: string[];
}

function matchDate(m: LeagueMatchup): Moment | undefined {
    return m.bowlDate || m.scheduledDate;
}

function isPlayed(m: LeagueMatchup): boolean {
    if (m.bowlDate) return true;
    if (m.scores) return true;
    return false;
}

export async function shoutOutsFromLastGameNotes(): Promise<MatchNoteShoutOut[]> {
    const leagues = await leagueInfoListFetcher();
    const items: MatchNoteShoutOut[] = [];

    for (const season of leagues.seasons) {
        for (const league of season.leagues) {
            if (!league.hasData() || !league.dataLoc || !league.id) continue;
            try {
                const details = await leagueDetailsFetcher(league.dataLoc);
                const teamNames = new Map<string, string>();
                for (const team of details.teams) {
                    if (team.id) teamNames.set(team.id, team.name ?? team.id);
                }
                for (const team of details.teams) {
                    for (const matchup of team.matchups) {
                        if (!isPlayed(matchup)) continue;
                        const notes = (matchup.notes ?? []).map((n) => n.trim()).filter(Boolean);
                        if (notes.length === 0) continue;
                        const date = matchDate(matchup);
                        if (!date) continue;
                        const oppId = matchup.opponent?.teamId;
                        items.push({
                            date,
                            week: matchup.week,
                            leagueId: league.id,
                            leagueName: league.name ?? league.id,
                            teamId: team.id ?? "",
                            teamName: team.name ?? "Team",
                            opponentName: oppId ? teamNames.get(oppId) : undefined,
                            notes,
                        });
                    }
                }
            } catch (err) {
                console.warn(`Skipping league ${league.id} while gathering shout-outs:`, err);
            }
        }
    }

    if (items.length === 0) return [];

    items.sort((a, b) => b.date.valueOf() - a.date.valueOf());
    const latestDay = items[0].date.clone().startOf("day");
    const onLatest = items.filter((i) => i.date.clone().startOf("day").isSame(latestDay));

    const seen = new Set<string>();
    const unique: MatchNoteShoutOut[] = [];
    for (const item of onLatest) {
        const key = `${item.leagueId}|${item.week}|${item.notes.join("||")}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(item);
    }
    return unique;
}
