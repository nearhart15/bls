import type {LeagueBlindPenalty} from "./league-setup-config";
export function blindPenalty(rules: LeagueBlindPenalty | undefined, consecutive: number, total: number, mode: string = import.meta.env.VITE_MISSED_MATCHUP_MODE ?? "strict"): number {
 if(!rules?.allowed)return 0;
 if(!rules.missedMatchupsPenalty || !rules.missedMatchupsThreshold)return rules.defaultPenalty;
 const threshold=rules.missedMatchupsThreshold;
 const consecutivePenalty=consecutive>=threshold?rules.missedMatchupsPenalty:rules.defaultPenalty;
 const totalPenalty=total>=threshold?rules.missedMatchupsPenalty:rules.defaultPenalty;
 if(mode==="consecutive")return consecutivePenalty;
 if(mode==="total")return totalPenalty;
 if(consecutivePenalty!==totalPenalty)throw new Error("Choose consecutive or total missed-matchup penalties in VITE_MISSED_MATCHUP_MODE before calculating this league");
 return consecutivePenalty;
}
