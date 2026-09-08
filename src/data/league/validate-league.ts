import type {LeagueDetails} from "./league-details";
export function validateLeague(league: LeagueDetails): void {
 const games=league.bowlingDays?.gamesPerWeek;
 const rules=league.scoringRules;
 if(!league.id || !rules || !games || !Number.isInteger(games) || games<1 || games>12)throw new Error("League requires an ID, scoring rules and 1–12 games per matchup");
 if(!Number.isInteger(rules.lineup) || rules.lineup<1 || rules.lineup>20)throw new Error("Invalid league lineup");
 const teamIds=new Set([...league.teams,...league.otherTeams].map(t=>t.id));
 for(const team of league.teams){
  const players=new Set(team.roster.map(p=>p.id));
  if(players.has(undefined) || players.has("") || players.size!==team.roster.length)throw new Error("Invalid or duplicate roster player ID");
  const matchupKeys = new Set<string>();
  for(const matchup of team.matchups){
   if (matchup.scores?.playerScores.length) {
    const date = matchup.bowlDate ?? matchup.scheduledDate;
    if (!date?.isValid()) throw new Error("Scored matchup requires a valid date");
    const key = `${date.format("YYYY-MM-DD")}::${matchup.week}`;
    if (matchupKeys.has(key)) throw new Error("Duplicate scored matchup date");
    matchupKeys.add(key);
   }
   const hasRecordedScores = Boolean(matchup.scores?.playerScores.length || matchup.scores?.games.length || matchup.opponent?.scores?.games.length);
   // Position-round opponents are assigned later; an unplayed PENDING entry is valid schedule data.
   const pendingOpponent = matchup.opponent?.teamId === "PENDING" && !hasRecordedScores;
   if(matchup.opponent?.teamId && !matchup.opponent.vacant && !pendingOpponent && !teamIds.has(matchup.opponent.teamId))throw new Error("Unknown opponent team");
   const seen=new Set<string>();
   for(const score of matchup.scores?.playerScores ?? []){
    if(!score.player || !players.has(score.player) || seen.has(score.player))throw new Error("Unknown or duplicate player score");seen.add(score.player);
    if(score.games.length!==games)throw new Error("Incomplete matchup: expected " + games + " games");
    for(const game of score.games){
     if (!Number.isFinite(game.scratchScore) || game.scratchScore < 0 || game.scratchScore > 300) throw new Error("Player scratch score must be between 0 and 300");
     if(game.blind && game.vacant)throw new Error("Game cannot be blind and vacant");
     if(game.blind && !rules.blindPenalty?.allowed)throw new Error("Blind scores are not allowed by league rules");
     if(game.vacant && !rules.vacancyScore?.allowed)throw new Error("Vacant scores are not allowed by league rules");
    }
   }
  }
 }
}
