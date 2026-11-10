const test=require('node:test');
const assert=require('node:assert/strict');
const load=require('./load-source.cjs');
const {calculateSeriesChase}=load('src/pages/components/score/series-chase-math.ts');
function valid(target,games){const result=calculateSeriesChase(target,games);assert.notEqual(result.status,'invalid');assert.equal(result.errors.games.some(Boolean),false);return result;}
function balancedFinish(result){
 assert.equal(result.finish.length,result.remaining);
 assert.equal(result.finish.reduce((sum,score)=>sum+score,0),result.pinsNeeded);
 assert.ok(result.finish.every(score=>Number.isInteger(score)&&score>=0&&score<=300));
 if(result.finish.length)assert.ok(Math.max(...result.finish)-Math.min(...result.finish)<=1);
}
test('195 then205 leaves exactly200 to make a600 series',()=>{
 const r=valid('600',['195','205','']);
 assert.equal(r.status,'chasing');assert.equal(r.target,600);assert.equal(r.total,400);assert.equal(r.completed,2);assert.equal(r.remaining,1);assert.equal(r.pinsNeeded,200);assert.equal(r.pace,200);assert.equal(r.ceiling,700);assert.equal(r.minNext,200);assert.deepEqual(r.finish,[200]);assert.ok(Math.abs(r.progress-400/600*100)<1e-9);
});
test('next-game minimum permits a perfect last game rather than demanding average pace',()=>{
 const r=valid('600',['195','','']);
 assert.equal(r.pinsNeeded,405);assert.equal(r.pace,202.5);assert.equal(r.ceiling,795);assert.equal(r.minNext,105);balancedFinish(r);
 assert.equal(valid('600',['195','105','']).minNext,300);
 assert.equal(valid('600',['195','104','']).status,'out-of-reach');
});
test('900 is the exact three-game maximum and a lost pin makes it unreachable',()=>{
 const start=valid('900',['','','']);assert.equal(start.status,'ready');assert.equal(start.ceiling,900);assert.equal(start.pace,300);assert.equal(start.minNext,300);assert.deepEqual(start.finish,[300,300,300]);
 const lost=valid('900',['299','','']);assert.equal(lost.status,'out-of-reach');assert.equal(lost.ceiling,899);assert.equal(lost.pinsNeeded,601);assert.equal(lost.pace,300.5);assert.equal(lost.minNext,null);assert.deepEqual(lost.finish,[]);
 const perfect=valid('900',['300','300','300']);assert.equal(perfect.status,'secured');assert.equal(perfect.total,900);assert.equal(perfect.remaining,0);assert.equal(perfect.pace,null);assert.equal(perfect.minNext,null);assert.deepEqual(perfect.finish,[]);
});
test('recorded zero is a played game while blank is unplayed',()=>{
 const blank=valid('600',['','','']);assert.equal(blank.status,'ready');assert.equal(blank.completed,0);assert.equal(blank.remaining,3);assert.equal(blank.pace,200);
 const zero=valid('600',['0','','']);assert.equal(zero.status,'chasing');assert.equal(zero.completed,1);assert.equal(zero.remaining,2);assert.equal(zero.total,0);assert.equal(zero.pace,300);assert.equal(zero.minNext,300);assert.deepEqual(zero.finish,[300,300]);
});
test('secured targets stay secured before game three and finished misses are distinct',()=>{
 const early=valid('300',['300','','']);assert.equal(early.status,'secured');assert.equal(early.completed,1);assert.equal(early.remaining,2);assert.equal(early.pinsNeeded,0);assert.equal(early.pace,0);assert.equal(early.minNext,0);assert.equal(early.progress,100);balancedFinish(early);
 const miss=valid('600',['195','205','199']);assert.equal(miss.status,'missed');assert.equal(miss.total,599);assert.equal(miss.pinsNeeded,1);assert.equal(miss.remaining,0);assert.equal(miss.ceiling,599);assert.equal(miss.pace,null);assert.equal(miss.minNext,null);assert.deepEqual(miss.finish,[]);
 const exceeded=valid('600',['300','300','300']);assert.equal(exceeded.status,'secured');assert.equal(exceeded.progress,100);assert.equal(exceeded.pinsNeeded,0);
});
test('balanced finish examples preserve the exact integer target across reachable cases',()=>{
 for(const [target,games]of[['1',['','','']],['599',['','','']],['600',['195','','']],['601',['195','','']],['600',['0','','']],['500',['195','205','']]]){
  const r=valid(target,games);balancedFinish(r);assert.ok(r.ceiling>=r.target);assert.ok(r.minNext>=0&&r.minNext<=300);
 }
});
test('malformed, fractional, out-of-range, noncontiguous, and non-three-game inputs are rejected',()=>{
 for(const target of['','0','-1','901','600.5','NaN','Infinity','six hundred','1e2']){const r=calculateSeriesChase(target,['','','']);assert.equal(r.status,'invalid','target '+target);assert.ok(r.errors.target);}
 for(const score of['-1','301','200.5','NaN','Infinity','two hundred','1e2','0x80']){const r=calculateSeriesChase('600',[score,'','']);assert.equal(r.status,'invalid','score '+score);assert.ok(r.errors.games.some(Boolean));}
 for(const games of[['','205',''],['195','','200'],['0','','0'],[],['195','205'],['100','100','100','100']])assert.equal(calculateSeriesChase('600',games).status,'invalid',JSON.stringify(games));
});
