const test=require('node:test');const assert=require('node:assert/strict');const React=require('react');const {act}=React;const {createRoot}=require('react-dom/client');const {JSDOM}=require('jsdom');const load=require('./load-source.cjs');
const chart=load('src/pages/components/charts/safe-chart.tsx');const tables=load('src/pages/components/player/player-detail-tables.tsx');const {PlayerStats}=load('src/data/player/player-stats.ts');const {AllStatsPanel}=load('src/pages/components/player/player-all-stats.tsx');const {ThemeProvider}=load('src/pages/components/theme.tsx');
test('profile calendar choices use the current and prior year data, including league filters',async t=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test',pretendToBeVisual:true});const prev={window:global.window,document:global.document,act:global.IS_REACT_ACT_ENVIRONMENT};global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true;dom.window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 t.mock.method(chart,'default',()=>null);t.mock.method(tables,'FullStatsGrid',({stats})=>React.createElement('output',null,stats.pinfall));
 const stats=pins=>{const s=new PlayerStats();s.pinfall=pins;s.gameStats.count=3;return s;};const year=String(new Date().getFullYear()),last=String(Number(year)-1);
 const slices=[{season:`${last}-${year}`,leagueId:'a',calendarStats:{[year]:stats(600),[last]:stats(500)},stats:stats(1100)},{season:`${last}-${year}`,leagueId:'b',calendarStats:{[year]:stats(700)},stats:stats(700)}];
 const root=createRoot(dom.window.document.getElementById('root'));const doc=dom.window.document;const select=async(el,value)=>act(async()=>{el.value=value;el.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});
 try{
  await act(async()=>root.render(React.createElement(ThemeProvider,null,React.createElement(AllStatsPanel,{careerStats:stats(1800),seasonSlicesFull:[],appearanceSlicesFull:slices,appearances:[{leagueId:'a',leagueName:'Alpha',season:`${last}-${year}`},{leagueId:'b',leagueName:'Beta',season:`${last}-${year}`}]}))));
  const [timeframe,league]=doc.querySelectorAll('select');assert.match(timeframe.textContent,new RegExp(`This calendar year \\(${year}\\)`));
  await select(timeframe,'current-year');assert.equal(doc.querySelector('output').textContent,'1300');assert.match(doc.body.textContent,new RegExp(`${year} · All leagues`));assert.equal(league.options.length,3);
  await select(league,'b');assert.equal(doc.querySelector('output').textContent,'700');
  await select(timeframe,'last-year');assert.equal(league.value,'all');assert.equal(league.options.length,2);assert.equal(doc.querySelector('output').textContent,'500');assert.match(doc.body.textContent,new RegExp(`${last} · All leagues`));
 }finally{await act(async()=>root.unmount());dom.window.close();global.window=prev.window;global.document=prev.document;global.IS_REACT_ACT_ENVIRONMENT=prev.act;}
});
