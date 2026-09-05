const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-source.cjs');
const {convertScore, validateFrames} = load('src/data/utils/bowling-input.ts');
const calc = load('src/data/league/league-calculators.ts');
const model = load('src/data/league/league-matchup.ts');
const {PlayerStats} = load('src/data/player/player-stats.ts');
const {calculatePlayerStats} = load('src/data/player/player-stats-calculator.ts');
const {mergeStats} = load('src/data/player/merge-stats.ts');
const {mergeMetrics, metricCounts} = load('src/data/player/metric-counts.ts');
const {validateJson, fetchJson, dataUrl} = load('src/data/utils/fetch-json.ts');
const makeGame = scratchScore => Object.assign(new model.TeamPlayerGameScore(), {scratchScore});

test('complete legal games and impossible/trailing input', () => {
  for (const [raw, expected] of [['X'.repeat(12),300],['9-'.repeat(10),90],['5/'.repeat(10)+'5',150],['--'.repeat(9)+'-/X',20],['--'.repeat(10),0]]) {
    assert.equal(calc.accumulateFrameScores(calc.buildFrames(convertScore(raw))), expected);
  }
  for (const raw of ['X','X'.repeat(12)+'invalid','X'.repeat(12)+'S','99'.repeat(10),'X'.repeat(13),'--'.repeat(9)+'X5X','--'.repeat(9)+'X/5','--'.repeat(9)+'9-5']) assert.throws(()=>convertScore(raw));
  assert.throws(()=>validateFrames([['bad']]));
});

test('series supports two and four games and includes exactly 800', () => {
  for(const n of [2,4]){const s=new PlayerStats();calculatePlayerStats([Array.from({length:n},()=>makeGame(200))],s);assert.equal(s.gameStats.count,n);assert.equal(s.pinfall,n*200);}
  const s=new PlayerStats();calculatePlayerStats([[300,300,200].map(makeGame)],s);assert.equal(s.series800,1);
});

test('vacant and absent opponent rules remain distinct', () => {
  const points=new calc.PpgPpsPointsCalculator(1,.5,1,.5,{allowed:true,scoringType:'FORFEIT'},{allowed:false,scoringType:'FORFEIT'});
  const team=new model.LeagueTeamScore();team.games=Array.from({length:3},()=>new model.MatchupGameScore());
  points.assignVacantOrAbsentOpponentPoints(team,true,false);
  assert.equal(team.series.pointsWon+team.games.reduce((n,g)=>n+g.pointsWon,0),4);
});

test('precomputed score retains frames and mismatch is explicit', () => {
  const score=new model.LeagueTeamPlayerScore();score.games=[Object.assign(makeGame(300),{inFrames:convertScore('X'.repeat(12))})];
  calc.calculatePlayerScores(score,{calculateHandicap:()=>0},{},undefined);
  assert.equal(score.games[0].frames.length,10);
  score.games[0].scratchScore=299;assert.throws(()=>calc.calculatePlayerScores(score,{calculateHandicap:()=>0},{},undefined),/disagrees/);
});

test('tenth frame marks and fresh rack opportunities', () => {
  for(const [tenth,strikes,opportunities] of [['-/X',1,11],['X-/',1,11],['XXX',3,12],['XX9',2,12]]){
    const g=makeGame(0);g.frames=calc.buildFrames(convertScore('9-'.repeat(9)+tenth));g.scratchScore=calc.accumulateFrameScores(g.frames);
    const s=new PlayerStats();calculatePlayerStats([[g]],s);assert.equal(s.strikes.numerator,strikes);assert.equal(s.strikes.denominator,opportunities);
  }
});

test('merged standard deviation, covered observations and zero percent', () => {
  const a=new PlayerStats(),b=new PlayerStats();for(const s of [a,b]){s.gameStats.count=3;s.gameStats.average=200;s.pinfall=600;s.gameStats.sd=20;}
  assert.equal(mergeStats([a,b]).gameStats.sd,20);
  a.spares={numerator:1,denominator:1,pct:1};b.spares={numerator:0,denominator:9,pct:0};a.opens={numerator:0,denominator:10,pct:0};
  const merged=mergeMetrics([{metrics:metricCounts(a)},{metrics:metricCounts(b)}]);assert.equal(merged.sparePct,10);assert.equal(merged.openPct,0);
  assert.equal(mergeMetrics([{metrics:metricCounts(new PlayerStats())}]).sparePct,null);
});

test('cache expires at the configured millisecond boundary', () => {
  const {Cache}=load('src/pages/components/cache/context-cache.tsx');const real=Date.now;let now=1700000000000;Date.now=()=>now;
  try{const cache=new Cache();cache.put('test','x',{});now+=899999;assert.ok(cache.get('test','x'));now++;assert.equal(cache.get('test','x'),null);}finally{Date.now=real;}
});

test('remote input guards reject malformed counts and pollution fields', () => {
  for(const input of [{'games-per-week':-1},{'games-per-week':1e9},{frames:[['bad']]},JSON.parse('{"__proto__":{"polluted":true}}')])assert.throws(()=>validateJson(input));
  assert.equal({}.polluted,undefined);
  global.window={location:{href:'http://localhost/'}};
  for(const location of ['../private.json','https://evil.example/x','%2e%2e/private.json'])assert.throws(()=>dataUrl('https://bls.bindul.name/data/',location));
  assert.equal(dataUrl('https://bls.bindul.name/data/','league.json'),'https://bls.bindul.name/data/league.json');
});

test('HTTP errors and oversized bodies are rejected', async () => {
  const original=global.fetch;
  try{
    global.fetch=async()=>new Response('{}',{status:404});await assert.rejects(fetchJson('https://test/'),/HTTP 404/);
    global.fetch=async()=>new Response('{}',{headers:{'content-length':String(9*1024*1024)}});await assert.rejects(fetchJson('https://test/'),/too large/);
    global.fetch=async()=>new Response('{"ok":true}');assert.deepEqual(await fetchJson('https://test/'),{ok:true});
  }finally{global.fetch=original;}
});

test('team and calendar slices stay separate; failed leagues cannot masquerade as zero', async () => {
  const api=load('src/data/league/league-api.ts'),papi=load('src/data/player/player-api.ts');const moment=require('moment');
  papi.playerListFetcher=async()=>({players:[{id:'p',name:'Test'}]});
  api.leagueInfoListFetcher=async()=>({seasons:[{season:'2025-2026',leagues:[{id:'l',name:'League',dataLoc:'l.json',hasData:()=>true}]}]});
  api.leagueDetailsFetcher=async()=>({teams:[200,100].map((score,i)=>({id:'t'+i,name:'Team '+i,number:i,roster:[{id:'p',name:'Test'}],matchups:[{bowlDate:moment(i===0?'2025-12-31':'2026-01-01'),scores:{playerScores:[{player:'p',games:Array.from({length:3},()=>makeGame(score)),series:{scratchScore:score*3,average:score}}]}}]}))});
  const agg=load('src/data/player/player-aggregate.ts');const [p]=await agg.buildFullPlayerList();
  assert.equal(p.games,6);assert.deepEqual(p.appearanceSlices.map(s=>s.games),[3,3]);assert.deepEqual(p.appearanceSlices.map(s=>s.pinfall),[600,300]);
  assert.equal(p.calendarSlices.find(s=>s.season==='2025').pinfall,600);assert.equal(p.calendarSlices.find(s=>s.season==='2026').pinfall,300);
  const detail=await agg.aggregatePlayerData('p');assert.equal(detail.appearanceSlicesFull[0].calendarStats['2025'].gameStats.count,3);
  api.leagueDetailsFetcher=async()=>{throw Error('offline')};await assert.rejects(agg.buildFullPlayerList(),/could not be loaded/);
});

test('storage denial does not throw; dashboard URLs stay trusted', () => {
  const {readStorage,writeStorage}=load('src/pages/components/safe-storage.ts');Object.defineProperty(global,'localStorage',{configurable:true,get(){throw Error('blocked')}});
  assert.equal(readStorage('x'),null);assert.doesNotThrow(()=>writeStorage('x','y'));delete global.localStorage;
  const {safeLeagueLink}=load('src/data/utils/safe-link.ts');assert.equal(safeLeagueLink('https://evil.example'),undefined);assert.equal(safeLeagueLink('javascript:alert(1)'),undefined);assert.equal(safeLeagueLink('https://www.leaguesecretary.com/'),'https://www.leaguesecretary.com/');
});

test('missed-matchup policy is explicit when consecutive and total absences differ', () => {
  const {blindPenalty}=load('src/data/league/blind-penalty.ts');
  const rules={allowed:true,defaultPenalty:0,missedMatchupsPenalty:10,missedMatchupsThreshold:3};
  assert.equal(blindPenalty(rules,1,1,'strict'),0);
  assert.equal(blindPenalty(rules,3,3,'strict'),10);
  assert.throws(()=>blindPenalty(rules,1,3,'strict'),/Choose consecutive or total/);
  assert.equal(blindPenalty(rules,1,3,'consecutive'),0);
  assert.equal(blindPenalty(rules,1,3,'total'),10);
});

test('partial league loads include warnings and only successful league totals', async () => {
  const api=load('src/data/league/league-api.ts'),papi=load('src/data/player/player-api.ts');const moment=require('moment');
  papi.playerListFetcher=async()=>({players:[{id:'p',name:'Test'}]});
  api.leagueInfoListFetcher=async()=>({seasons:[{season:'2025',leagues:['good','bad'].map(id=>({id,name:id,dataLoc:id,hasData:()=>true}))}]});
  api.leagueDetailsFetcher=async loc=>{if(loc==='bad')throw Error('invalid frames');return {teams:[{id:'t',name:'Team',number:1,roster:[{id:'p',name:'Test'}],matchups:[{bowlDate:moment('2025-01-01'),scores:{playerScores:[{player:'p',games:[makeGame(200)],series:{scratchScore:200,average:200}}]}}]}]};};
  const data=await load('src/data/player/player-aggregate.ts').buildFullPlayerList();
  assert.equal(data[0].games,1);assert.equal(data[0].pinfall,200);assert.deepEqual(data.warnings,['bad: invalid frames']);
});
