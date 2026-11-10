const {createTestDom} = require('./dom-fixture.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const {act} = React;
const {createRoot} = require('react-dom/client');
const {MemoryRouter} = require('react-router');

const load = require('./load-source.cjs');
const dataLoader = load('src/pages/components/cache/data-loader.tsx');
const BeerLeague = load('src/pages/beer-league.tsx').default;

test('league Players headers sort every column in both directions and retain sorting across tabs', async t => {
 const {dom, restoreDom} = createTestDom({url:'https://example.test',pretendToBeVisual:true});
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
  await act(async()=>root.unmount());restoreDom();
 }
});


test('overview keeps published tie order and updates the selected team, roster and sheet comparison', async t => {
 const {dom, restoreDom} = createTestDom({url: 'https://example.test', pretendToBeVisual: true});
 const sheetDate = '11/05/2026';
 const standing = (division, place, number, name, won, lost, average) => ({
  division, place, number, name, won, lost, average, handicap: 20, scratchPins: 23400,
  highScratchGame: 880, highScratchSeries: 2590
 });
 // The tied runner-up arrives first and has a higher average.
 const standings = [
  standing('North', 2, 7, 'Pins Go Boom!', 30.5, 9.5, 812),
  standing('North', 1, 4, 'Rival Four', 30.5, 9.5, 799),
  standing(null, 1, 31, 'Independents', 24, 16, 700)
 ];
 const bowlers = ['Home Bowler', 'Rival Bowler', 'Float Bowler'];
 const teams = standings.map((team, index) => ({...team, players: [{
  name: bowlers[index], average: 190, handicap: 18, pins: 5700, games: 30,
  highGame: 256, highSeries: 639, weekScoresRaw: [], weekScores: [], weekTotal: null
 }]}));
 const data = {status: 'ready', generatedAt: null, standings, teams, league: {
  name: 'Beer League', date: sheetDate, week: 10, totalWeeks: 30, day: 'Thursday', time: null, season: 'Fall 2026'
 }};
 t.mock.method(dataLoader, 'useCachedFetcher', (_fetch, category) => ({
  data: category === 'beer-league-import-v1' ? data : [], isLoading: false, error: null
 }));
 const container = dom.window.document.getElementById('root');
 const root = createRoot(container);
 const select = label => container.querySelector('select[aria-label="' + label + '"]');
 const panel = () => container.querySelector('.bls-standing-team');
 const rows = () => [...container.querySelectorAll('button.bls-standing-row')];
 const click = async element => act(async () => element.click());
 const change = async (element, value) => act(async () => {
  element.value = value;
  element.dispatchEvent(new dom.window.Event('change', {bubbles: true}));
 });
 const comparison = () => new URL(panel().querySelector('a[href^="/team/compare?"]').getAttribute('href'), 'https://example.test');
 try {
  await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(BeerLeague))));
  assert.equal(select('Team').value, '7');
  assert.match(panel().textContent, /Level on points with Rival Four/);
  assert.match(panel().textContent, /Points won\s*30\.5/);
  assert.match(panel().textContent, /Team average\s*812/);
  assert.equal(panel().querySelector('details a').getAttribute('href'), '/player/api-7-home-bowler-0');
  assert.match(rows()[0].textContent, /#1Rival Four/);
  assert.match(rows()[1].textContent, /#2Pins Go Boom!/);
  assert.equal(rows()[1].getAttribute('aria-pressed'), 'true');
  assert.deepEqual(Object.fromEntries(comparison().searchParams), {source: 'api', a: '7', b: '4', sheet: sheetDate});

  await click(rows()[0]);
  assert.equal(select('Team').value, '4');
  assert.match(panel().textContent, /Team average\s*799/);
  assert.equal(panel().querySelector('details a').textContent, 'Rival Bowler');
  assert.equal(comparison().searchParams.get('b'), '7');

  const tab = name => [...container.querySelectorAll('[role="tab"]')].find(node => node.textContent === name);
  await click(tab('Teams'));
  await click(tab('Overview'));
  assert.equal(select('Team').value, '4');
  await change(select('Team'), '7');
  assert.equal(rows()[1].getAttribute('aria-pressed'), 'true');

  const ungrouped = [...select('Division').options].find(option => option.textContent === 'No division listed');
  assert.ok(ungrouped);
  await change(select('Division'), ungrouped.value);
  assert.equal(select('Team').value, '31');
  assert.equal(rows().length, 1);
  assert.match(panel().textContent, /Independents/);
  assert.equal(panel().querySelector('details a').textContent, 'Float Bowler');
  assert.equal(panel().querySelector('a[href^="/team/compare?"]'), null);
  assert.equal(container.querySelector('.bls-standing-full tbody').rows.length, 2);
  assert.equal(container.querySelectorAll('.bls-standing-full tbody tr').length, 3);
 } finally {
  await act(async () => root.unmount());
  restoreDom();
 }
});
