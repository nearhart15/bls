import moment from "moment";
import type {LeagueDetails} from "./league-details";
import type {TrackedLeagueTeam} from "./league-team-details";
import type {LeagueMatchup} from "./league-matchup";
import {opponentDisplay} from "./opponent-display";

export function matchupComparisonUrl(league: LeagueDetails | null, team: TrackedLeagueTeam, matchup: LeagueMatchup): string | null {
    if (!league?.id || !team.id) return null;
    const trackedOpponent = league.teams.find(candidate => candidate.id === matchup.opponent?.teamId);
    const params = new URLSearchParams({league: league.id});
    if (trackedOpponent?.id) {
        params.set("source", "frame");
        params.set("a", team.id);
        params.set("b", trackedOpponent.id);
    } else {
        const opponent = opponentDisplay(league, matchup.opponent);
        if (team.number <= 0 || (opponent.number ?? 0) <= 0 || matchup.opponent?.absent || matchup.opponent?.vacant) return null;
        params.set("source", "api");
        params.set("a", String(team.number));
        params.set("b", String(opponent.number));
    }
    return `/team/compare?${params.toString()}`;
}

interface ComparisonTeam {number: number; name?: string}
interface ComparisonSheet {league?: {date?: string | null}; standings: ComparisonTeam[]}

const normalizedName = (value?: string) => (value ?? "").trim().toLocaleLowerCase()
    // The A.B.C. sheet stylizes this name with symbols that would otherwise be dropped.
    .replace(/^\$h!t\s+a\s+brick$/, "shit a brick")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");

/** Team numbers are reusable; a linked comparison must match the league schedule and names. */
export function apiComparisonIssue(sheet: ComparisonSheet, league: LeagueDetails, teamA?: ComparisonTeam, teamB?: ComparisonTeam): string | null {
    const date = moment(sheet.league?.date ?? "", ["MM/DD/YYYY", "YYYY-MM-DD"], true);
    if (!date.isValid() || !league.teams.some(team => team.matchups.some(matchup => matchup.scheduledDate?.isSame(date, "day")))) {
        return "This league is not covered by the current A.B.C. sheet. Historical team numbers can belong to different teams.";
    }
    const leagueTeams = [...league.teams, ...league.otherTeams];
    for (const selected of [teamA, teamB]) {
        const expected = leagueTeams.find(team => team.number === selected?.number);
        if (!selected || !expected?.name || normalizedName(expected.name) !== normalizedName(selected.name)) {
            return "The selected teams do not match this league's teams on the current A.B.C. sheet.";
        }
    }
    return teamA?.number === teamB?.number ? "Choose two different teams to compare." : null;
}
