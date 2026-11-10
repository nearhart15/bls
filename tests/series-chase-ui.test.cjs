const test=require('node:test');
const assert=require('node:assert/strict');
const React=require('react');
const {act}=React;
const {createTestDom}=require('./dom-fixture.cjs');
const load=require('./load-source.cjs');
async function fixture(t){
 const {dom,restoreDom}=createTestDom({url:'https://example.test/bls/',pretendToBeVisual:true});
 const {createRoot}=require('react-dom/client');
 const SeriesChase=load('src/pages/components/score/series-chase.tsx').default;
 const container=dom.window.document.getElementById('root'),root=createRoot(container);
 await act(async()=>root.render(React.createElement(SeriesChase)));
 t.after(async()=>{await act(async()=>root.unmount());restoreDom();});
 const input=labelText=>{const label=[...container.querySelectorAll('label')].find(label=>label.textContent.trim().startsWith(labelText));assert.ok(label,'Missing label: '+labelText);return dom.window.document.getElementById(label.htmlFor);};
 return{container,input,result:()=>container.querySelector('.bls-chase-result'),number:()=>container.querySelector('.bls-chase-number').textContent,
 finish:()=>[...container.querySelectorAll('.bls-chase-finish li strong')].map(node=>Number(node.textContent)),
 set:async(labelText,value)=>act(async()=>{const field=input(labelText);Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(field,value);field.dispatchEvent(new dom.window.Event('input',{bubbles:true}));}),
 click:async text=>act(async()=>{const button=[...container.querySelectorAll('button')].find(button=>button.textContent.trim()===text);assert.ok(button,'Missing button: '+text);button.click();})};
}
test('series chase starts at600 and updates the final-game target from completed scores',async t=>{
 const v=await fixture(t);assert.equal(v.result().dataset.status,'ready');assert.equal(v.number(),'200');assert.deepEqual(v.finish(),[200,200,200]);
 await v.set('Game 1 score','195');assert.equal(v.number(),'202.5');
 await v.set('Game 2 score','205');assert.equal(v.result().dataset.status,'chasing');assert.equal(v.number(),'200');assert.deepEqual(v.finish(),[200]);assert.match(v.result().textContent,/pins in Game 3/);assert.equal(v.container.querySelector('progress').value,400);assert.match(v.container.querySelector('.bls-chase-result-top').textContent,/2 \/ 3 complete/);
});
test('a zero game is completed; an unreachable target offers a bounded replacement',async t=>{
 const v=await fixture(t);await v.set('Game 1 score','0');assert.equal(v.input('Game 1 score').getAttribute('aria-invalid'),'false');assert.equal(v.result().dataset.status,'chasing');assert.equal(v.number(),'300');assert.deepEqual(v.finish(),[300,300]);
 await v.click('700');assert.equal(v.result().dataset.status,'out-of-reach');assert.equal(v.number(),'600');assert.deepEqual(v.finish(),[]);
 await v.click('Chase 600 instead');assert.equal(v.input('Series target').value,'600');assert.equal(v.input('Game 1 score').value,'0');assert.equal(v.result().dataset.status,'chasing');assert.deepEqual(v.finish(),[300,300]);
});
test('missing earlier games and invalid numbers suppress the plan and identify the input error',async t=>{
 const v=await fixture(t);await v.set('Game 2 score','200');assert.equal(v.result().dataset.status,'invalid');assert.equal(v.number(),'—');assert.equal(v.container.querySelector('progress'),null);assert.deepEqual(v.finish(),[]);
 const first=v.input('Game 1 score');assert.equal(first.getAttribute('aria-invalid'),'true');const messages=first.getAttribute('aria-describedby').split(' ').map(id=>v.container.ownerDocument.getElementById(id).textContent).join(' ');assert.match(messages,/Enter Game 1 before adding later games/);
 await v.set('Game 1 score','301');assert.equal(v.result().dataset.status,'invalid');assert.equal(v.input('Game 1 score').getAttribute('aria-invalid'),'true');
 await v.set('Game 1 score','195');assert.equal(v.result().dataset.status,'chasing');
 await v.set('Series target','6e2');assert.equal(v.result().dataset.status,'invalid');const target=v.input('Series target');assert.equal(target.getAttribute('aria-invalid'),'true');assert.match(v.container.ownerDocument.getElementById(target.getAttribute('aria-describedby')).textContent,/whole series target/);
});
test('secured and completed-short series replace pace with recorded totals',async t=>{
 const v=await fixture(t);await v.click('500');await v.set('Game 1 score','300');await v.set('Game 2 score','200');assert.equal(v.result().dataset.status,'secured');assert.equal(v.number(),'500');assert.match(v.result().textContent,/Target reached/);assert.deepEqual(v.finish(),[]);
 await v.click('600');await v.set('Game 3 score','90');assert.equal(v.result().dataset.status,'missed');assert.equal(v.number(),'590');assert.match(v.result().textContent,/10 pins short/);assert.deepEqual(v.finish(),[]);
});
test('custom goals work and resetting scores preserves the goal while clearing errors',async t=>{
 const v=await fixture(t);await v.set('Series target','650');assert.equal(v.result().dataset.status,'ready');assert.equal(v.finish().reduce((a,b)=>a+b,0),650);assert.ok(v.finish().every(score=>score<=300));
 await v.set('Game 1 score','195');await v.set('Game 3 score','200');assert.equal(v.result().dataset.status,'invalid');await v.click('Reset scores');assert.equal(v.input('Series target').value,'650');
 for(const label of['Game 1 score','Game 2 score','Game 3 score']){assert.equal(v.input(label).value,'');assert.equal(v.input(label).getAttribute('aria-invalid'),'false');}
 assert.equal(v.result().dataset.status,'ready');assert.equal(v.finish().reduce((a,b)=>a+b,0),650);
});
test('advanced converter loads on demand and preserves entered values when closed and reopened',async t=>{
 const {dom,restoreDom}=createTestDom({url:'https://example.test/bls/',pretendToBeVisual:true});
 const {createRoot}=require('react-dom/client');const {MemoryRouter}=require('react-router');
 const ScoreUtils=load('src/pages/score-utils.tsx').default;
 const container=dom.window.document.getElementById('root'),root=createRoot(container);
 t.after(async()=>{await act(async()=>root.unmount());restoreDom();});
 await act(async()=>root.render(React.createElement(MemoryRouter,null,React.createElement(ScoreUtils))));
 const details=container.querySelector('details');assert.equal(details.open,false);assert.ok(container.querySelector('.bls-series-chase'));assert.equal(container.querySelector('#player-id'),null);
 await act(async()=>{details.open=true;details.dispatchEvent(new dom.window.Event('toggle'));});
 const player=container.querySelector('#player-id');assert.ok(player);
 await act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(player,'test-bowler');player.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
 await act(async()=>{details.open=false;details.dispatchEvent(new dom.window.Event('toggle'));});
 await act(async()=>{details.open=true;details.dispatchEvent(new dom.window.Event('toggle'));});
 assert.equal(container.querySelector('#player-id').value,'test-bowler');
});
