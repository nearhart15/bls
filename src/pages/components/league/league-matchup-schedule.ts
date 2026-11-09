import moment, {type Moment} from "moment";
import type {LeagueMatchup} from "../../../data/league/league-matchup";

function hasRecordedResults(matchup: LeagueMatchup): boolean {
    return (matchup.scores?.playerScores.length ?? 0) > 0 || (matchup.scores?.games.length ?? 0) > 0;
}

/** Keep overdue results separate from the next date on the league schedule. */
export function matchupSchedule(matchups: LeagueMatchup[], today: Moment = moment()) {
    const scheduled = matchups
        .filter((matchup): matchup is LeagueMatchup & {scheduledDate: Moment} => Boolean(matchup.scheduledDate?.isValid()))
        .slice()
        .sort((a, b) => a.scheduledDate.valueOf() - b.scheduledDate.valueOf());
    const unscored = scheduled.filter(matchup => !hasRecordedResults(matchup));
    const nextMatchup = unscored.find(matchup => matchup.scheduledDate.isSameOrAfter(today, "day")) ?? null;
    const pendingMatchups = unscored.filter(matchup => matchup.scheduledDate.isBefore(today, "day"));
    const recorded = scheduled.filter(hasRecordedResults).sort((a, b) => {
        const aDate = a.bowlDate?.isValid() ? a.bowlDate : a.scheduledDate;
        const bDate = b.bowlDate?.isValid() ? b.bowlDate : b.scheduledDate;
        return aDate.valueOf() - bDate.valueOf();
    });
    const lastMatchup = recorded[recorded.length - 1] ?? null;
    return {nextMatchup, pendingMatchups, lastMatchup};
}
