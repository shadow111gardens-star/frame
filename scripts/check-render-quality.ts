import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from 'vite';
let candidate:any;const requests:any[]=[];const savedMode=process.argv.includes('--live-saved');if(savedMode){const saved=JSON.parse(await readFile('artifacts/render-quality/live-gemini.json','utf8'));candidate={productType:'mobile_app',name:'Saved live Gemini generation',designSystem:saved.designSystem,screens:saved.screens.map((s:any)=>({...s,components:s.components.map((id:string)=>saved.components[id])}))};}
const server=await createServer({server:{host:'127.0.0.1',port:0},plugins:[{name:'quality-acceptance',enforce:'pre',configureServer(vite){
  vite.middlewares.use('/__quality-test',async(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(await vite.transformIndexHtml('/__quality-test','<!doctype html><html><head>'+((await readFile('index.html','utf8')).match(/<link[^>]*fonts.googleapis.com\/css[^>]*>/)?.[0]??'')+'</head><body><div id="root"></div><script type="module" src="/tests/qualityHarness.tsx"></script></body></html>'));});
  if(!process.argv.includes('--live'))vite.middlewares.use('/api/design',async(req,res,next)=>{let body='';for await(const chunk of req)body+=chunk;const input=JSON.parse(body);if(savedMode&&input.mode!=='generate'){req.url='/api/design';const result=await import('../server/gemini');const {loadEnv}=await import('vite');await result.designRoute({...loadEnv(vite.config.mode,process.cwd(),''),...process.env})(Object.assign(req,{[Symbol.asyncIterator]:async function*(){yield body;}}),res,next);return;}requests.push(input);res.setHeader('Content-Type','application/json');if(input.mode==='generate'){res.end(JSON.stringify({message:'Generated candidate',app:candidate}));return;}
    const corrected=structuredClone(input.app);const c=corrected.screens[0].components.find((n:any)=>n.id==='copy');c.position.height=80;c.styles.color='#27352f';res.end(JSON.stringify({message:'Corrected measured copy',app:corrected}));
  });
}}]});await server.listen();
if((process.argv.includes('--live')||savedMode)){try{await mkdir('artifacts/render-quality/history',{recursive:true});await writeFile('artifacts/render-quality/history/responses-'+Date.now()+'.json',await readFile('artifacts/render-quality/live-responses.json'));}catch{}}
const profile=await mkdtemp(path.join(tmpdir(),'frame-export-'));
const chrome=spawn(process.env.CHROME_PATH??'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
let socket:WebSocket|undefined;
try {
  let port='';
  for(let i=0;i<100&&!port;i++){try{port=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];}catch{await pause(100);}}
  assert.ok(port,'Chrome debugging endpoint started');
  const targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket=new WebSocket(targets.find((t:any)=>t.type==='page').webSocketDebuggerUrl);
  await new Promise<void>((resolve,reject)=>{socket!.onopen=()=>resolve();socket!.onerror=reject;});
  let next=0;const pending=new Map<number,{resolve:(x:any)=>void,reject:(e:any)=>void}>();
  socket.onmessage=e=>{const msg=JSON.parse(String(e.data));const p=pending.get(msg.id);if(p){pending.delete(msg.id);msg.error?p.reject(msg.error):p.resolve(msg.result);}};
  const send=(method:string,params:any={})=>new Promise<any>((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});socket!.send(JSON.stringify({id,method,params}));});
  const evaluate=async(expression:string)=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
  await send('Emulation.setDeviceMetricsOverride',{width:1600,height:900,deviceScaleFactor:1,mobile:false});
  await mkdir('artifacts/render-quality',{recursive:true});
  await send('Page.navigate',{url:`${server.resolvedUrls!.local[0]}__quality-test`});
  for(let i=0;i<100;i++){if(await evaluate('!!window.qualityTest?.state.screens.length'))break;await pause(100);}await pause(500);
  if((process.argv.includes('--live')||savedMode)){
    await send('Emulation.setDeviceMetricsOverride',{width:1800,height:1000,deviceScaleFactor:1,mobile:false});
    await evaluate(`window.qualityResponses=[];const nativeFetch=window.fetch;window.fetch=async(...args)=>{const response=await nativeFetch(...args);if(args[0]==='/api/design')window.qualityResponses.push(await response.clone().json());return response;}`);
    await evaluate(`window.qualityTest.generateDesign('Create a premium travel planning mobile app with Explore, Trip Detail, Saved and Profile screens. Make Explore useful for destination discovery with search, a clear featured destination and browsable seasonal recommendations. Use a coherent restrained warm palette, readable typography and a polished linked bottom navigation. Unknown personal data must use actionable empty states.',false,'mobile_app')`);
    await evaluate(`Promise.race([Promise.all([...document.querySelectorAll('img')].map(img=>img.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,15000))])`);
    const live=await evaluate(`({screens:window.qualityTest.state.screens,components:window.qualityTest.state.components,designSystem:window.qualityTest.state.designSystem,messages:window.qualityTest.state.messages})`);
    const last=live.messages[live.messages.length-1];
    await writeFile('artifacts/render-quality/live-gemini.json',JSON.stringify(live,null,2));
    await writeFile('artifacts/render-quality/live-gemini.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
    await writeFile('artifacts/render-quality/live-responses.json',JSON.stringify(await evaluate('window.qualityResponses'),null,2));
    if(last.retryPrompt){await evaluate(`(()=>{const app=window.qualityResponses.filter(r=>r.app).at(-1)?.app;if(app)window.qualityTest.dispatch({type:'APPLY_DESIGN',app})})()`);await pause(500);await writeFile('artifacts/render-quality/live-rejected-measurements.json',JSON.stringify(await evaluate('window.qualityTest.inspect()'),null,2));await writeFile('artifacts/render-quality/live-rejected.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));throw new Error(last.content);}
    assert.equal(live.screens.length,4);const issues=await evaluate('window.qualityTest.inspect()');
    await writeFile('artifacts/render-quality/live-measurements.json',JSON.stringify(issues,null,2));
    console.log(JSON.stringify({screens:live.screens.map((s:any)=>s.name),message:last.content,issues},null,2));
  }else{
  const report:any[]=[];
  const geometry=await evaluate(`(()=>{const box=id=>{const e=document.querySelector('[data-component-id="'+id+'"]'),r=e.getBoundingClientRect(),s=getComputedStyle(e);return {x:r.x,y:r.y,width:r.width,height:r.height,overflow:e.scrollWidth-e.clientWidth,color:s.color}};return {row:box('row'),left:box('left'),right:box('right'),grid:box('grid'),long:box('long'),nav:box('nav'),searchColor:getComputedStyle(document.querySelector('.generated-input'),'::placeholder').color,imageFit:getComputedStyle(document.querySelector('[data-component-id="image"] img')).objectFit}})()`);
  assert.equal(geometry.left.width,165);assert.equal(geometry.right.width,165);assert.equal(geometry.right.x-geometry.left.x-165,12);assert.equal(geometry.long.width,165);assert.equal(geometry.long.overflow,0);assert.equal(geometry.nav.y,792);assert.equal(geometry.nav.width,382);assert.equal(geometry.nav.height,72);assert.equal(geometry.searchColor,'rgb(39, 53, 47)');assert.equal(geometry.imageFit,'contain');
  report.push({layout:geometry,issues:await evaluate('window.qualityTest.inspect()')});
  await writeFile('artifacts/render-quality/mobile-flow.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await evaluate(`window.qualityTest.dispatch({type:'SET_CENTER_TAB',tab:'prototype'})`);await pause(200);await evaluate(`document.querySelector('[data-component-id="tab2"] button').click()`);await pause(200);assert.equal(await evaluate('window.qualityTest.state.currentScreen'),'other');
  await evaluate(`(()=>{const app=window.qualityTest.fixture();app.productType='website';app.screens.forEach(s=>{s.width=1200;s.height=1200});window.qualityTest.dispatch({type:'APPLY_DESIGN',app})})()`);await pause(300);
  assert.equal(await evaluate(`document.querySelector('[data-generated-screen]').offsetWidth`),1200);assert.equal(await evaluate(`document.querySelector('[data-component-id="right"]').offsetWidth`),165);
  report.push({websiteFlow:true,navigation:true});
  candidate=await evaluate('window.qualityTest.fixture()');candidate.screens[0].components.find((c:any)=>c.id==='copy').position.height=10;candidate.screens[0].components.find((c:any)=>c.id==='copy').styles.color='#eeeeee';
  await evaluate(`window.qualityTest.dispatch({type:'APPLY_DESIGN',app:window.qualityTest.fixture()});window.qualityTest.dispatch({type:'SET_CENTER_TAB',tab:'home'})`);await pause(300);
  const other=JSON.stringify(candidate.screens[1]);
  await evaluate(`window.qualityTest.generateDesign('Create a destination discovery app',false,'mobile_app')`);
  assert.equal(requests.length,2,'One initial generation and one measured correction, no retry loop');
  const review=requests[1].qualityReview;assert.ok(requests[1].app.screens[0].components.find((c:any)=>c.id==='copy').position.height>=54,'Measured text reflow is applied before Gemini review');assert.ok(review.issues.some((i:any)=>i.code==='contrast'));assert.ok(review.screenshots.length>=1,'Actual rendered DOM capture accompanies targeted correction');
  assert.equal(await evaluate(`window.qualityTest.state.components.copy.styles.color`),'#27352f');assert.equal(await evaluate(`window.qualityTest.state.components.copy.position.height`),80);
  assert.equal(JSON.stringify(requests[1].app.screens[1]),other);assert.equal(await evaluate(`document.querySelectorAll('[aria-hidden="true"] [data-generated-screen]').length`),0);
  const errors=await evaluate(`window.qualityTest.inspect().filter(i=>i.severity==='error')`);assert.deepEqual(errors,[]);
  await writeFile('artifacts/render-quality/targeted-correction.jpg',Buffer.from(review.screenshots[0].data,'base64'));
  await writeFile('artifacts/render-quality/mobile-after-correction.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  report.push({correction:{requestCount:requests.length,issues:review.issues,screenshots:review.screenshots.map((s:any)=>({screenId:s.screenId,bytes:s.data.length})),remainingErrors:errors}});
  // Intentional empty state and parent/image layering are never overlap/whitespace failures.
  assert.ok(!review.issues.some((i:any)=>i.screenId==='other'&&i.code==='empty-area'));
  // Current renderer: named typography, responsive flow and scoped redesign.
  await evaluate(`(()=>{const app=window.qualityTest.fixture();app.designSystem.textStyles={heading:{font:"Arial",fontSize:28,fontWeight:600,lineHeight:1.2}};app.screens[0].components.find(c=>c.id==="copy").styles={textStyleToken:"heading"};window.qualityTest.dispatch({type:"APPLY_DESIGN",app});window.qualityTest.dispatch({type:"SELECT_SCREEN",id:"flow"});})()`);await pause(350);
  const previous=await evaluate(`JSON.stringify({screen:window.qualityTest.state.screens[1],component:window.qualityTest.state.components.empty,system:window.qualityTest.state.designSystem})`);
  const priorRequests=requests.length;
  await evaluate(`window.qualityTest.generateDesign('Improve the selected screen composition',true,'mobile_app','screen')`);
  assert.equal(requests.length-priorRequests,2,'Modification receives one bounded actual-render correction');
  assert.deepEqual(requests[priorRequests+1].qualityReview.screenIds,['flow']);
  assert.equal(requests[priorRequests+1].qualityReview.visualReview,true);assert.ok(requests[priorRequests+1].qualityReview.screenshots.length>0);
  assert.deepEqual(JSON.parse(await evaluate(`JSON.stringify({screen:window.qualityTest.state.screens[1],component:window.qualityTest.state.components.empty,system:window.qualityTest.state.designSystem})`)),JSON.parse(previous));
  await writeFile('artifacts/render-quality/render-review.jpg',Buffer.from(requests[priorRequests+1].qualityReview.screenshots[0].data,'base64'));
  await evaluate(`(()=>{const ws=window.qualityTest;ws.dispatch({type:'UPDATE_COMPONENT_STYLES',id:'row',styles:{responsive:{maxWidth:400,direction:'column',gap:8},height:'hug'}});})()`);await pause(150);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-component-id="row"]')).flexDirection`),'column');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-component-id="row"]')).gap`),'8px');
  assert.ok(await evaluate(`(()=>{const v=document.querySelector('[data-component-id="copy"]').getBoundingClientRect(),n=document.querySelector('[data-component-id="nav"]').getBoundingClientRect();return v.bottom<=n.top;})()`),'Docked navigation stays below reflowed content');
  const fullPage=await send('Page.getLayoutMetrics');
  await writeFile('artifacts/render-quality/responsive-layout.png',Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:fullPage.cssContentSize.width,height:fullPage.cssContentSize.height,scale:1}})).data,'base64'));
  report.push({redesign:{boundedRequests:2,scope:['flow'],unrelatedStatePreserved:true},responsive:{direction:'column',gap:8},verification:'Actual browser renders of controlled structured fixtures; Gemini inference mocked.'});
  await writeFile('artifacts/render-quality/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  }
} finally {socket?.close();chrome.kill();await server.close();}
