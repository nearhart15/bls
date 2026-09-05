const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');

test('hostile player names and categories remain inert through actual ApexCharts rendering', async()=>{
 const dom=new JSDOM('<div id="chart"></div><div id="legend"></div>',{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/'});
 const w=dom.window;global.window=w;global.document=w.document;global.navigator=w.navigator;
 w.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
 w.SVGElement.prototype.getBBox=function(){return{x:0,y:0,width:100,height:20}};
 w.SVGElement.prototype.getScreenCTM=function(){return{inverse(){return this},a:1,b:0,c:0,d:1,e:0,f:0}};
 w.SVGElement.prototype.getComputedTextLength=()=>100;
 w.SVGElement.prototype.createSVGMatrix=function(){return{a:1,b:0,c:0,d:1,e:0,f:0,inverse(){return this},multiply(){return this}}};
 try {
  const load=require('./load-source.cjs');const SafeChart=load('src/pages/components/charts/safe-chart.tsx').default;
  const payload='<img id="injected" src="invalid" onerror="window.executed=true">';
  const props={type:'radar',height:340,width:500,options:{chart:{animations:{enabled:false}},xaxis:{categories:[payload,'Spare','Single','First']}},series:[{name:payload,data:[10,20,30,40]},{name:'Control',data:[20,30,40,50]}]};
  const tree=SafeChart(props);const safe=tree.props.children[0].props;
  const {renderToStaticMarkup}=require('react-dom/server');w.document.querySelector('#legend').innerHTML=renderToStaticMarkup(tree.props.children[1]);
  w.eval(fs.readFileSync(require.resolve('apexcharts/dist/apexcharts.js'),'utf8'));
  const chart=new w.ApexCharts(w.document.querySelector('#chart'),{...safe.options,series:safe.series,chart:{type:'radar',height:340,width:500,animations:{enabled:false}}});
  await chart.render();
  const tooltip=safe.options.tooltip.custom({series:[[10]],seriesIndex:0,dataPointIndex:0});w.document.body.append(tooltip);
  assert.equal(w.document.querySelector('#injected'),null);
  assert.equal(w.executed,undefined);
  assert.ok(w.document.querySelector('#legend').textContent.includes(payload));
  assert.ok(tooltip.textContent.includes(payload));
  chart.destroy();
 }finally{dom.window.close();delete global.window;delete global.document;}
});
