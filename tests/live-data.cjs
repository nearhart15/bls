// Optional read-only integration check against the data source configured for the test copy.
const load=require('./load-source.cjs');
global.window={location:{href:'http://localhost:5173/bls/'}};
(async()=>{
 const {leagueInfoListFetcher,leagueDetailsFetcher}=load('src/data/league/league-api.ts');
 const leagues=await leagueInfoListFetcher();let passed=0,failed=0;
 for(const season of leagues.seasons)for(const league of season.leagues){if(!league.hasData() || !league.dataLoc)continue;try{const d=await leagueDetailsFetcher(league.dataLoc);console.log('PASS',league.id,d.teams.length,'teams');passed++;}catch(e){console.log('FAIL',league.id,e.message);failed++;}}
 console.log({passed,failed});if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
