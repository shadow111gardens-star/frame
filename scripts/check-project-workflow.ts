import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from 'vite';

// Uses installed Chrome and native CDP/WebSocket; adds no automation dependency.
const server=await createServer({server:{host:'127.0.0.1',port:0},plugins:[{name:'project-acceptance',configureServer(vite){
  vite.middlewares.use('/__project-test',async(_req,res)=>{
    res.setHeader('Content-Type','text/html');
    res.end(await vite.transformIndexHtml('/__project-test','<!doctype html><html><head></head><body><div id="root"></div><script type="module" src="/tests/projectHarness.tsx"></script></body></html>'));
  });
}}]});
await server.listen();
const profile=await mkdtemp(path.join(tmpdir(),'frame-project-'));
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
  await send('Page.navigate',{url:`${server.resolvedUrls!.local[0]}__project-test`});
  for(let i=0;i<100;i++){if(await evaluate('!!window.projectTest'))break;await pause(100);}
  await pause(600);

  await mkdir('artifacts/projects',{recursive:true});
  const click=async(text:string)=>{await evaluate(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim().startsWith(${JSON.stringify(text)})||b.getAttribute("aria-label")===${JSON.stringify(text)});if(!b)throw new Error('Missing button '+${JSON.stringify(text)});b.click();})()`);await pause(180);};
  const action=async(a:any)=>{await evaluate(`window.projectTest.dispatch(${JSON.stringify(a)})`);await pause(180);};
  // Click the actual project menu and creation UI, rather than seeding the reducer.
  await evaluate(`document.querySelector('header button').click()`);await pause(200);await click('New Project');await click('Website');await click('Create project');
  const original=await evaluate('window.projectTest.state.projectId');assert.equal(await evaluate('window.projectTest.state.screens[0].width'),1440);assert.equal(await evaluate('Object.keys(window.projectTest.state.components).length'),0);
  await action({type:'UPDATE_SCREEN_DATA',id:await evaluate('window.projectTest.state.currentScreen'),data:{height:3800,background:'#abcdef'}});
  const oldApp=await evaluate('JSON.stringify(window.projectTest.app())');
  await evaluate(`document.querySelector('header button').click()`);await pause(180);await click('New Project');await click('Mobile App');await click('Create project');
  const mobile=await evaluate('window.projectTest.state.projectId');assert.notEqual(mobile,original);assert.equal(await evaluate('window.projectTest.state.screens[0].width'),390);assert.equal(await evaluate('window.projectTest.state.past.length'),0);
  await action({type:'OPEN_PROJECT',id:original});assert.equal(await evaluate('JSON.stringify(window.projectTest.app())'),oldApp);
  await action({type:'OPEN_PROJECT',id:mobile});
  await evaluate(`window.projectRequests=[];window.fetch=async(url,init)=>{if(url==='/api/design'){window.projectRequests.push(JSON.parse(init.body));const app=window.projectTest.fixture();app.screens[0].components.find(c=>c.id==='button').targetScreenId='profile';return new Response(JSON.stringify({message:'Acceptance generated',app}));}throw new Error('Unexpected test request '+url);};`);
  await evaluate(`window.projectTest.generateDesign('Build a mobile app',true)`);await pause(250);
  assert.equal(await evaluate('window.projectRequests[0].mode'),'generate');assert.equal(await evaluate('window.projectRequests[0].productType'),'mobile_app');assert.equal(await evaluate('!!window.projectTest.state.components.button'),true);
  await action({type:'SELECT_COMPONENT',id:'button'});await action({type:'UPDATE_COMPONENT_STYLES',id:'button',styles:{fontSize:22}});assert.equal(await evaluate('window.projectTest.state.components.button.styles.fontSize'),22);
  await click('Undo').catch(async()=>{await action({type:'UNDO'});});assert.notEqual(await evaluate('window.projectTest.state.components.button.styles.fontSize'),22);await action({type:'REDO'});assert.equal(await evaluate('window.projectTest.state.components.button.styles.fontSize'),22);
  await action({type:'SET_CENTER_TAB',tab:'prototype'});await pause(750);await evaluate(`document.querySelector('[data-component-id=button]').click()`);await pause(150);assert.equal(await evaluate('window.projectTest.state.currentScreen'),'profile');await action({type:'SELECT_SCREEN',id:'home'});assert.ok(await evaluate('!!document.querySelector("[data-generated-screen]")'));await action({type:'SET_CENTER_TAB',tab:'home'});
  const report:any[]=[];
  for(const [width,height] of [[1920,911],[1280,720],[800,600],[390,640],[320,320],[640,240]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await action({type:'OPEN_MODAL',modal:{type:'export'}});await click('Screenshots');
    const m=await evaluate(`(()=>{const box=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right}};const d=document.querySelector('[role="dialog"]'),f=document.querySelector('[data-dialog-footer]'),b=f.querySelector('.btn-primary');return {dialog:box(d),footer:box(f),button:box(b),bodyOverflow:document.body.style.overflow,scrollable:document.querySelector('[data-dialog-content]').scrollHeight>document.querySelector('[data-dialog-content]').clientHeight,clickable:document.elementFromPoint(b.getBoundingClientRect().x+b.clientWidth/2,b.getBoundingClientRect().y+b.clientHeight/2)===b,portal:d.parentElement.parentElement===document.body};})()`);
    assert.ok(m.dialog.top>=0&&m.dialog.bottom<=height&&m.dialog.left>=0&&m.dialog.right<=width,JSON.stringify({width,height,m}));assert.ok(m.clickable);assert.ok(m.portal);assert.equal(m.bodyOverflow,'hidden');report.push({width,height,...m});
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await pause(180);assert.equal(await evaluate('!!document.querySelector("[role=dialog]")'),false);assert.notEqual(await evaluate('document.body.style.overflow'),'hidden');
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await action({type:'OPEN_MODAL',modal:{type:'export'}});await click('Screenshots');
  // Browser keyboard events test actual focus wrap and restoration.
  await evaluate(`document.querySelector('[data-dialog-footer] .btn-primary').focus()`);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await pause(100);assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'),'Close');
  // A real mouse click on the visible footer triggers the actual JSON download in the new project.
  const downloadPath=await mkdtemp(path.resolve('artifacts/projects/download-'));await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath});await click('JSON');
  const point=await evaluate(`(()=>{const r=document.querySelector('[data-dialog-footer] .btn-primary').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
  let backup:any;for(let i=0;i<100;i++){try{backup=JSON.parse(await readFile(path.join(downloadPath,'Fitness.json'),'utf8'));break;}catch{await pause(100);}}assert.equal(backup.projectId,mobile);assert.equal(backup.components.button.styles.fontSize,22);
  await click('Screenshots');
  const image=await send('Page.captureScreenshot' ,{format:'png',captureBeyondViewport:false});await writeFile('artifacts/projects/export-modal.png',Buffer.from(image.data,'base64'));
  await writeFile('artifacts/projects/results.json',JSON.stringify(report,null,2));console.log('PASS: independent website/mobile projects, prior document preserved, editing/undo/redo/prototype, portal modal at six viewport sizes including 320x320 and 640x240, fixed footer hit testing, scrolling content, Escape, background lock and keyboard focus wrap.');
}finally{socket?.close();chrome.kill();await server.close();}
