const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const {act} = React;
const {createRoot} = require('react-dom/client');
const {MemoryRouter} = require('react-router');
const {JSDOM} = require('jsdom');
const load = require('./load-source.cjs');
const dataLoader = load('src/pages/components/cache/data-loader.tsx');
const BeerLeague = load('src/pages/beer-league.tsx').default;

test('league Players headers sort every column in both directions and retain sorting across tabs', async t => {
 const dom = new JSDOM('<div id="root"></div>', {url:'https://example.test',pretendToBeVisual:true});
 const previous={window:global.window,document:global.document,act:global.IS_REACT_ACT_ENVIRONMENT};
 global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true;
 const player=(name,average,handicap,games,pins,highGame,highSeries)=>({name,average,handicap,games,pins,highGame,highSeries,weekScoresRaw:[],weekScores:[],weekTotal:null});
 const data={status:'ready',generatedAt:null,standings:[],teams:[
  {number:1,name:'Team 10',players:[player('Zoe',200,5,30,6000,280,700)]},
  {number:2,name:'Team 2',players:[player('Aaron',180,20,9,1620,240,600)]},
  {number:3,name:'Alpha',players:[player('Mary',190,10,20,3800,260,650)]}
 ]};
 t.mock.method(dataLoader,'useCachedFetcher',(_fetch,category)=>({data:category==='beer-league-import-v1'?data:[],isLoading:false,error:null}));
 const container=dom.window.document.getElementById('root');const root=createRoot(container);
 const click=async el=>act(async()=>el.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));
 const tab=name=>[...container.querySelectorAll('[role="tab"]')].find(el=>el.textContent===name);
 const rows=()=>[...container.querySelectorAll('.tab-pane.active tbody tr')].map(el=>el.cells[0].textContent);
 const header=label=>[...container.querySelectorAll('.tab-pane.active thead button')].find(el=>el.textContent.startsWith(label));
 try {
  await act(async()=>root.render(React.createElement(MemoryRouter,null,React.createElement(BeerLeague))));
  await click(tab('Players'));
  assert.deepEqual(rows(),['Zoe','Mary','Aaron']);
  assert.equal(header('Games').parentElement.getAttribute('aria-sort'),'descending');
  for(const [label,expected] of [
   ['Bowler',['Aaron','Mary','Zoe']],['Team',['Mary','Aaron','Zoe']],
   ['Avg',['Zoe','Mary','Aaron']],['HDCP',['Aaron','Mary','Zoe']],
   ['Games',['Zoe','Mary','Aaron']],['Pins',['Zoe','Mary','Aaron']],
   ['High',['Zoe','Mary','Aaron']],['Series',['Zoe','Mary','Aaron']]
  ]) {
   await click(header(label));assert.deepEqual(rows(),expected,label);
   assert.equal(container.querySelectorAll('th[aria-sort]:not([aria-sort="none"])').length,1);
   await click(header(label));assert.deepEqual(rows(),[...expected].reverse(),`${label} reversed`);
  }
  await click(tab('Leaders'));await click(tab('Players'));
  assert.deepEqual(rows(),['Aaron','Mary','Zoe']);
  assert.equal(header('Series').parentElement.getAttribute('aria-sort'),'ascending');
 } finally {
  await act(async()=>root.unmount());dom.window.close();
  global.window=previous.window;global.document=previous.document;global.IS_REACT_ACT_ENVIRONMENT=previous.act;
 }
});

