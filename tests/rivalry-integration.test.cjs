const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const {act} = React;
const {createTestDom} = require('./dom-fixture.cjs');
const load = require('./load-source.cjs');
const cacheHook = load('src/pages/components/cache/data-loader.tsx');
const apiHook = load('src/pages/components/player/use-player-index-data.ts');
const chart = load('src/pages/components/charts/safe-chart.tsx');
const theme = load('src/pages/components/theme.tsx');
const old = '2025 - 26', current = '2026 - 27';
function slice(season, average, games) {return {season,average,games,pinfall:average*games,highGame:average+10,highSeries:average*3,games200:0};}
function entry(id,name,slices) {return {id,name,average:100,games:100,pinfall:10000,highGame:250,highSeries:650,games200:0,seasonSlices:slices,calendarSlices:[],appearanceSlices:slices.map(s=>({...s,leagueId:'league',leagueName:'Test League',teamName:'Test Team'}))};}
const entries=[entry('nick','Nick',[slice(current,200,6),slice(old,100,100)]),entry('amy','Amy',[slice(current,196,9),slice(old,220,15)]),entry('lee','Lee',[slice(old,201,9)]),entry('zara','Zara',[slice(current,180,3)])];
const apiEntries=[entry('api-jo','Jo',[slice(current,160,12)]),entry('api-kim','Kim',[slice(current,165,6)])].map((p,i)=>({...p,average:160+i*5,games:i?6:12}));
async function fixture(t, path, renderPlayerRoute=false) {
 const {dom,restoreDom}=createTestDom({url:'https://example.test/bls/',pretendToBeVisual:true});
 const storage=Object.getOwnPropertyDescriptor(global,'localStorage');
 Object.defineProperty(global,'localStorage',{configurable:true,value:dom.window.localStorage});
 t.mock.method(cacheHook,'useCachedFetcher',()=>({data:entries,isLoading:false,error:null}));
 t.mock.method(apiHook,'usePlayerIndexData',()=>({data:apiEntries,isLoading:false,error:null}));
 t.mock.method(chart,'default',()=>null);
 t.mock.method(theme,'useTheme',()=>({theme:'dark'}));
 const {MemoryRouter,Routes,Route,useLocation}=require('react-router');
 const {createRoot}=require('react-dom/client');
 const {DataSourceProvider}=load('src/pages/components/data-source.tsx');
 const FrameCompare=load('src/pages/components/player/player-compare.tsx').default;
 const Player=load('src/pages/player.tsx').default;
 const container=dom.window.document.getElementById('root'),root=createRoot(container);
 function Screen() {
  const location=useLocation();
  return React.createElement(React.Fragment,null,renderPlayerRoute
   ?React.createElement(React.Suspense,{fallback:null},React.createElement(Routes,null,React.createElement(Route,{path:'/player/:playerId',element:React.createElement(Player)})))
   :React.createElement(FrameCompare),React.createElement('output',{id:'location'},location.search));
 }
 await act(async()=>root.render(React.createElement(MemoryRouter,{initialEntries:[path]},React.createElement(DataSourceProvider,null,React.createElement(Screen)))));
 t.after(async()=>{await act(async()=>root.unmount());if(storage)Object.defineProperty(global,'localStorage',storage);else delete global.localStorage;restoreDom();});
 return {container,dom,change:async(id,value)=>act(async()=>{const select=container.querySelector('#'+id);select.value=value;select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));})};
}
test('frame comparison immediately uses latest season and excludes prior-season-only rivals',async t=>{
 const view=await fixture(t,'/player/compare');
 assert.equal(view.container.querySelector('#rivalry-season').value,current);
 assert.deepEqual([...view.container.querySelectorAll('.bls-fifa-pcard-name')].map(el=>el.textContent),['Nick','Amy']);
 assert.equal(view.container.querySelector('.bls-fifa-pcard-a .bls-fifa-pcard-badge').textContent,'200');
 assert.equal(view.container.querySelector('[aria-label="Compare Nick with Lee"]'),null);
 await view.change('rivalry-season',old);
 assert.equal(view.container.querySelector('.bls-fifa-pcard-a .bls-fifa-pcard-badge').textContent,'100');
 assert.ok(view.container.querySelector('[aria-label="Compare Nick with Lee"]'));
 assert.equal(new URLSearchParams(view.container.querySelector('#location').textContent).get('season'),old);
});
test('frame shared links restore player order and exact historical season',async t=>{
 const view=await fixture(t,'/player/compare?source=frame&a=amy&b=nick&mode=season&season=2025+-+26');
 assert.equal(view.container.querySelector('#rivalry-season').value,old);
 assert.deepEqual([...view.container.querySelectorAll('.bls-fifa-pcard-name')].map(el=>el.textContent),['Amy','Nick']);
 assert.equal(view.container.querySelector('.bls-fifa-pcard-a .bls-fifa-pcard-badge').textContent,'220');
});
test('shared API matchup chooses API view even when saved global source is frame',async t=>{
 const view=await fixture(t,'/player/compare?source=api&a=api-kim&b=api-jo',true);
 assert.equal(view.dom.window.localStorage.getItem('bls-data-source'),null);
 assert.match(view.container.querySelector('.bls-rivalry-source').textContent,/A.B.C. Data/);
 assert.deepEqual([...view.container.querySelectorAll('.bls-fifa-pcard-name')].map(el=>el.textContent),['Kim','Jo']);
 assert.equal(view.container.querySelector('#rivalry-season'),null);
});
