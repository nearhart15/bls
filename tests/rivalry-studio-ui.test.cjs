const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const {act} = React;
const {createTestDom} = require('./dom-fixture.cjs');
const load = require('./load-source.cjs');
const frame = [
 {id:'nick',name:'Nick',teamName:'Pins Go Boom!',average:200,games:18},
 {id:'amy',name:'Amy',teamName:'Other Team',average:195,games:12},
 {id:'lee',name:'Lee',teamName:'Other Team',average:185,games:9},
 {id:'zara',name:'Zara',teamName:'Away Team',average:210,games:15},
];
const api = [{id:'api-jo',name:'Jo',teamName:'ABC Team',average:160,games:12},{id:'api-kim',name:'Kim',teamName:'ABC Team',average:165,games:6}];
async function fixture(t, {initialPath='/player/compare',saved={},clipboard}={}) {
 const {dom,restoreDom}=createTestDom({url:'https://example.test/bls/',pretendToBeVisual:true});
 const originals=new Map(['localStorage','navigator'].map(key=>[key,Object.getOwnPropertyDescriptor(global,key)]));
 for(const [key,value] of Object.entries({localStorage:dom.window.localStorage,navigator:dom.window.navigator})) Object.defineProperty(global,key,{configurable:true,value});
 Object.defineProperty(dom.window.navigator,'clipboard',{configurable:true,value:clipboard});
 for(const [key,value] of Object.entries(saved)) dom.window.localStorage.setItem(key,value);
 const {createRoot}=require('react-dom/client');
 const {MemoryRouter,useLocation}=require('react-router');
 const {default:RivalryStudio,useRivalryMatchup}=load('src/pages/components/comparison/rivalry-studio.tsx');
 const container=dom.window.document.getElementById('root'), root=createRoot(container);
 function Studio({source}) {
  const rows=source==='api'?api:frame;
  const matchup=useRivalryMatchup(rows,source,{mode:'season',season:'2026 - 27'});
  const location=useLocation();
  return React.createElement(React.Fragment,null,React.createElement(RivalryStudio,{source,rows,matchup,scopeLabel:'2026 - 27'}),
   React.createElement('output',{id:'board'},matchup.a?.name+' vs '+matchup.b?.name),
   React.createElement('output',{id:'location'},location.pathname+location.search));
 }
 function Harness() {
  const [source,setSource]=React.useState('frame');
  return React.createElement(React.Fragment,null,React.createElement('button',{id:'api-source',onClick:()=>setSource('api')},'Use API'),React.createElement(Studio,{key:source,source}));
 }
 await act(async()=>root.render(React.createElement(MemoryRouter,{initialEntries:[initialPath]},React.createElement(Harness))));
 t.after(async()=>{await act(async()=>root.unmount());for(const [key,descriptor] of originals) {if(descriptor)Object.defineProperty(global,key,descriptor);else delete global[key];}restoreDom();});
 return {dom,container,board:()=>container.querySelector('#board').textContent,click:async element=>act(async()=>element.click()),
  change:async(labelText,value)=>act(async()=>{
   const label=[...container.querySelectorAll('label')].find(label=>label.textContent===labelText);
   const select=dom.window.document.getElementById(label.htmlFor);
   select.value=value;select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  })};
}
test('studio starts with saved bowler and nearest rival; suggestions, pickers and swap update matchup and URL',async t=>{
 const view=await fixture(t,{saved:{'bls-home-bowler-frame':'nick'}});
 assert.equal(view.board(),'Nick vs Amy');
 const suggestion=view.container.querySelector('[aria-label="Compare Nick with Zara"]');
 await view.click(suggestion);
 assert.equal(view.board(),'Nick vs Zara');
 assert.equal(suggestion.getAttribute('aria-pressed'),'true');
 await view.change('Your bowler','lee');
 assert.equal(view.board(),'Lee vs Amy');
 await view.change('The challenger','zara');
 assert.equal(view.board(),'Lee vs Zara');
 await view.click(view.container.querySelector('[aria-label="Swap bowlers"]'));
 assert.equal(view.board(),'Zara vs Lee');
 const params=new URLSearchParams(view.container.querySelector('#location').textContent.split('?')[1]);
 for (const [key,value] of Object.entries({source:'frame',a:'zara',b:'lee',season:'2026 - 27'})) assert.equal(params.get(key),value);
});
test('studio restores URL matchup and keeps keyed source changes separate from old player IDs',async t=>{
 const view=await fixture(t,{initialPath:'/player/compare?source=frame&a=amy&b=zara',saved:{'bls-home-bowler-frame':'nick','bls-home-bowler-api':'api-kim'}});
 assert.equal(view.board(),'Amy vs Zara');
 await view.click(view.container.querySelector('#api-source'));
 assert.equal(view.board(),'Kim vs Jo');
 assert.equal(view.container.querySelector('.bls-rivalry-pickers').textContent.includes('Zara'),false);
 await view.click(view.container.querySelector('[aria-label="Swap bowlers"]'));
 assert.equal(view.board(),'Jo vs Kim');
 const params=new URLSearchParams(view.container.querySelector('#location').textContent.split('?')[1]);
 for (const [key,value] of Object.entries({source:'api',a:'api-jo',b:'api-kim'})) assert.equal(params.get(key),value);
});
test('copy exports a source-and-scope matchup URL and clears copied state after a change',async t=>{
 const copied=[];
 const view=await fixture(t,{initialPath:'/player/compare?a=nick&b=amy',clipboard:{writeText:async text=>copied.push(text)}});
 const copy=()=>[...view.container.querySelectorAll('button')].find(button=>/Copy matchup link|Link copied/.test(button.textContent));
 await view.click(copy());
 assert.equal(copied.length,1);
 const url=new URL(copied[0]);
 assert.equal(url.origin,'https://example.test');assert.equal(url.pathname,'/bls/');
 const params=new URLSearchParams(url.hash.split('?')[1]);
 for (const [key,value] of Object.entries({source:'frame',a:'nick',b:'amy',season:'2026 - 27'})) assert.equal(params.get(key),value);
 assert.equal(copy().textContent,'Link copied');
 await view.click(view.container.querySelector('[aria-label="Swap bowlers"]'));
 assert.equal(copy().textContent,'Copy matchup link');
});
test('failed clipboard exposes a selectable readonly matchup URL',async t=>{
 const view=await fixture(t,{initialPath:'/player/compare?a=nick&b=amy',clipboard:{writeText:async()=>{throw new Error('denied');}}});
 await view.click([...view.container.querySelectorAll('button')].find(button=>button.textContent==='Copy matchup link'));
 const input=view.container.querySelector('[aria-label="Matchup link"]');
 assert.ok(input);assert.equal(input.readOnly,true);assert.match(input.value,/https:\/\/example\.test\/bls\/#\/player\/compare\?/);
 assert.match(view.container.textContent,/Select and copy the matchup link below/);
});
