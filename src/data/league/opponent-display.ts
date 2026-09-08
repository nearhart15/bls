import type {LeagueDetails} from "./league-details";
import type {OpponentTeam} from "./league-matchup";

interface OpponentDisplay {
    name: string;
    number?: number;
    division?: string;
    enteringRank?: string;
}

/** Resolve schedule labels without inventing an identity for an unassigned opponent. */
export function opponentDisplay(league: LeagueDetails | null, opponent: OpponentTeam | undefined): OpponentDisplay {
    const id = opponent?.teamId;
    const team = id && league
        ? [...league.teams, ...league.otherTeams].find(candidate => candidate.id === id)
        : undefined;
    const unassigned = !id || id === "PENDING";
    let fallback = unassigned ? "Opponent to be determined" : `Team name unavailable (${id})`;
    if (opponent?.vacant) fallback = "Vacant team";
    else if (opponent?.absent) fallback = unassigned ? "Absent team" : `Absent team (${id})`;
    return {
        name: team?.name?.trim() ? team.name : fallback,
        number: team && team.number > 0 ? team.number : undefined,
        division: team?.division,
        enteringRank: opponent?.enteringRank && opponent.enteringRank !== "PENDING" ? opponent.enteringRank : undefined,
    };
}
