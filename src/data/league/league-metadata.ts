import type {LeagueDetails} from "./league-details";

/** Reconcile copied metadata only when the selected index and team schedules prove it. */
export function reconcileLeagueMetadata(league: LeagueDetails, expectedLeagueId?: string): void {
    if (expectedLeagueId && league.id !== expectedLeagueId) {
        // Some upstream Fall files still contain a copied Summer ID. The index
        // owns navigation identity; require the loaded teams to confirm that ID.
        if (league.teams.length === 0 || league.teams.some(team => !team.id?.startsWith(`${expectedLeagueId}-`))) {
            throw new Error("League data does not match the selected league");
        }
        league.id = expectedLeagueId;
    }

    // Use scheduled dates, never pre/post-bowl dates or the viewer's current
    // year. Do not infer a start date from partial or conflicting week-one data.
    const firstWeeks = league.teams.map(team => team.matchups.filter(matchup => matchup.week === 1));
    if (!league.bowlingDays || firstWeeks.length === 0 || firstWeeks.some(weeks => weeks.length !== 1 || !weeks[0].scheduledDate?.isValid())) return;
    const firstDate = firstWeeks[0][0].scheduledDate!;
    if (firstWeeks.every(weeks => weeks[0].scheduledDate!.isSame(firstDate, "day"))) {
        league.bowlingDays.startDate = firstDate.clone();
    }
}
