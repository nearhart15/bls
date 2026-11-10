const test=require('node:test');const assert=require('node:assert/strict');const load=require('./load-source.cjs');
const {PlayerStats,RatioGroup}=load('src/data/player/player-stats.ts');const {comparePerformance}=load('src/data/player/performance-insights.ts');
function session(date,average,{games=3,leagueId='a',strike=15,open=6,single=8,singleAttempts=10,incomplete=false}={}){
 const stats=new PlayerStats();stats.gameStats.count=games;stats.gameStats.average=average;stats.pinfall=games*average;stats.strikes=new RatioGroup(strike,30);stats.spares=new RatioGroup(10,20);stats.singlePinSpares=new RatioGroup(single,singleAttempts);stats.opens=new RatioGroup(open,30);stats.firstBallAverage=8;stats.firstBallCount=30;stats.incompleteFrameData=incomplete;
 return {date,leagueId,leagueName:leagueId==='a'?'Alpha':'Beta',stats};
}
test('recent comparisons sort dates and use disjoint equal windows with weighted game averages',()=>{
 const data=[session('2026-10-04',200,{games:6}),session('2026-10-01',160),session('2026-10-03',180),session('2026-10-02',170)];
 const result=comparePerformance(data,6);assert.equal(result.size,2);assert.deepEqual(result.recent.map(s=>s.date),['2026-10-04','2026-10-03']);assert.deepEqual(result.previous.map(s=>s.date),['2026-10-02','2026-10-01']);assert.equal(result.recentStats.gameStats.count,9);assert.equal(result.recentStats.gameStats.average,1740/9);assert.equal(result.previousStats.gameStats.average,165);assert.ok(result.strengths.some(s=>s.id==='average'));assert.equal(data[0].stats.gameStats.average,200);
});
test('same-date appearances stay together and filtering happens before choosing periods',()=>{
 const data=[session('2026-10-01',150),session('2026-10-02',160),session('2026-10-03',170),session('2026-10-04',180),session('2026-10-04',240,{leagueId:'b'}),session('2026-10-05',250,{leagueId:'b'})];
 const all=comparePerformance(data,3);assert.equal(all.history.find(s=>s.date==='2026-10-04').stats.gameStats.count,6);assert.equal(all.history.find(s=>s.date==='2026-10-04').stats.gameStats.average,210);
 const filtered=comparePerformance(data,3,'a');assert.deepEqual(filtered.recent.map(s=>s.date),['2026-10-04','2026-10-03']);assert.equal(filtered.recentStats.gameStats.average,175);
});
test('declines drive practice advice and fewer opens count as improvement',()=>{
 const data=[session('2026-10-01',190,{strike:18,open:9}),session('2026-10-02',190,{strike:18,open:9}),session('2026-10-03',180,{strike:12,open:3}),session('2026-10-04',180,{strike:12,open:3})];
 const result=comparePerformance(data,3);assert.ok(result.focus.some(t=>t.id==='strikes'));assert.ok(result.focus.some(t=>t.id==='average'));assert.ok(result.strengths.some(t=>t.id==='opens'));assert.equal(result.trends.find(t=>t.id==='strikes').delta,-20);
});
test('small samples, missing frame data and unavailable metrics do not generate conclusions',()=>{
 assert.equal(comparePerformance([]).enoughGames,false);assert.equal(comparePerformance([session('2026-10-01',200)]).trends.length,0);
 const data=['01','02','03','04'].map(day=>session(`2026-10-${day}`,180,{singleAttempts:2,single:1}));let result=comparePerformance(data);assert.equal(result.metrics.find(m=>m.id==='single').recent,null);assert.ok(!result.trends.some(m=>m.id==='single'));
 data[3].stats.incompleteFrameData=true;result=comparePerformance(data);assert.equal(result.metrics.find(m=>m.id==='strikes').recent,null);assert.ok(result.trends.some(m=>m.id==='average'));
 data.push(session('bad-date',300));assert.equal(comparePerformance(data).history.length,4);
});

test('Insights controls update periods and league scope without external prompts',async t=>{
 const React=require('react');const {act}=React;const {createRoot}=require('react-dom/client');const {JSDOM}=require('jsdom');const {InsightsPanel}=load('src/pages/components/player/player-insights.tsx');
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test'});const prev={window:global.window,document:global.document,act:global.IS_REACT_ACT_ENVIRONMENT};global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true;
 const root=createRoot(dom.window.document.getElementById('root'));const doc=dom.window.document;
 const data=Array.from({length:12},(_,i)=>session(`2026-10-${String(i+1).padStart(2,'0')}`,170+i,{leagueId:i%2?'a':'b'}));
 const select=async(el,value)=>act(async()=>{el.value=value;el.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});
 try{
  await act(async()=>root.render(React.createElement(InsightsPanel,{name:'Nick',sessions:data})));
  assert.match(doc.body.textContent,/Recent: 6 sessions · 18 games/);assert.doesNotMatch(doc.body.textContent,/Grok|career|Expected strike/i);assert.equal(doc.querySelectorAll('a[href]').length,0);
  await select(doc.querySelector('[aria-label="Comparison window"]'),'3');assert.match(doc.body.textContent,/Recent: 3 sessions · 9 games/);
  await select(doc.querySelector('[aria-label="Insights league"]'),'a');assert.match(doc.body.textContent,/Oct 8, 2026/);assert.equal(doc.querySelectorAll('table:last-child tbody tr').length>0,true);
 }finally{await act(async()=>root.unmount());dom.window.close();global.window=prev.window;global.document=prev.document;global.IS_REACT_ACT_ENVIRONMENT=prev.act;}
});
