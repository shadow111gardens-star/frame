import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from 'vite';
import {unzipSync} from 'fflate';

// Uses installed Chrome and native CDP/WebSocket; adds no automation dependency.
const server=await createServer({server:{host:'127.0.0.1',port:0},plugins:[{name:'export-acceptance',configureServer(vite){
  vite.middlewares.use('/__export-font',async(_req,res)=>{res.setHeader('Content-Type','font/ttf');res.end(await readFile('C:/Windows/Fonts/arialbd.ttf'));});
  vite.middlewares.use('/__export-test',async(_req,res)=>{
    res.setHeader('Content-Type','text/html');
    res.end(await vite.transformIndexHtml('/__export-test','<!doctype html><html><head><style>@font-face{font-family:ExportFixtureFont;font-weight:700;src:url(/__export-font) format("truetype")}</style></head><body><div id="root"></div><script type="module" src="/tests/exportHarness.tsx"></script></body></html>'));
  });
}}]});
await server.listen();
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
  await mkdir('artifacts/image-export',{recursive:true});
  const output=await mkdtemp(path.resolve('artifacts/image-export/run-'));
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:output,eventsEnabled:true});
  await send('Page.navigate',{url:`${server.resolvedUrls!.local[0]}__export-test`});
  for(let i=0;i<100;i++){if(await evaluate('!!document.querySelector("[data-generated-screen]")'))break;await pause(100);}
  await pause(500);const report:any[]=[];
  const click=async(text:string)=>{await evaluate(`Array.from(document.querySelectorAll('[data-modal] button')).find(b=>b.textContent.trim().startsWith(${JSON.stringify(text)})).click()`);await pause(150);};
  const select=async(label:string,value:string)=>{await evaluate(`(()=>{const e=document.querySelector('[aria-label="'+${JSON.stringify(label)}+'"]');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await pause(100);};
  const waitDownload=async(name:string)=>{for(let i=0;i<300;i++){try{return await readFile(path.join(output,name));}catch{const error=await evaluate(`document.querySelector('[data-modal] [role="alert"]')?.textContent`);if(error)throw new Error(error);await pause(100);}}throw new Error('Download timed out: '+name);};
  const decode=async(bytes:Uint8Array,mime:string)=>evaluate(`(async()=>{const image=new Image();image.src='data:${mime};base64,${Buffer.from(bytes).toString('base64')}';await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d');x.drawImage(image,0,0);return {width:image.width,height:image.height,footer:Array.from(x.getImageData(10,image.height-10,1,1).data),empty:Array.from(x.getImageData(image.width-10,10,1,1).data),gradient:Array.from(x.getImageData(260,255,1,1).data)};})()`);
  await evaluate(`window.exportTest.dispatch({type:'SELECT_COMPONENT',id:'headline'});window.exportTest.dispatch({type:'OPEN_MODAL',modal:{type:'export'}})`);await pause(300);await click('Screenshots');
  assert.deepEqual(await evaluate(`Array.from(document.querySelector('[aria-label="Image format"]').options).map(o=>o.value)`),['png','jpeg'],'SVG is not an export option');
  const snapshot=await evaluate('JSON.stringify({screens:window.exportTest.state.screens,components:window.exportTest.state.components,selection:window.exportTest.state.selectedComponentId,history:window.exportTest.state.past,future:window.exportTest.state.future,tokens:window.exportTest.state.tokens,designSystem:window.exportTest.state.designSystem,device:window.exportTest.state.device,currentScreen:window.exportTest.state.currentScreen})');
  for(const format of ['png','jpeg']){
    await select('Image format',format);await select('Export scope','current');
    if(format==='jpeg')await evaluate(`(()=>{const e=document.querySelector('[aria-label="JPEG background"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'#ffeedd');e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await click('Export');
    const ext=format==='jpeg'?'jpg':format,mime=format==='jpeg'?'image/jpeg':'image/png';
    const bytes=await waitDownload(`portfolio-home.${ext}`);
    if(format==='png')assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
    if(format==='jpeg')assert.deepEqual([...bytes.subarray(0,3)],[255,216,255]);
    const image=await decode(bytes,mime);assert.equal(image.width,1440);assert.equal(image.height,3800);assert.ok(Math.abs(image.footer[0]-18)<4&&Math.abs(image.footer[1]-52)<4&&Math.abs(image.footer[2]-86)<4,'Full footer pixels retained');
    report.push({scope:'current',format,file:`portfolio-home.${ext}`,bytes:bytes.length,...image});
    await select('Export scope','all');await click('Export');const archive=await waitDownload(`Export-verification-screens-${format}.zip`),files=unzipSync(archive);
    assert.deepEqual(Object.keys(files),[`portfolio-home.${ext}`,`portfolio-home-2.${ext}`,`about-team.${ext}`]);
    const transparent=await decode(files[`portfolio-home-2.${ext}`],mime);assert.equal(transparent.width,768);assert.equal(transparent.height,600);assert.equal(transparent.empty[3],format==='jpeg'?255:0);if(format==='jpeg')assert.ok(Math.abs(transparent.empty[1]-238)<3&&Math.abs(transparent.empty[2]-221)<3,'Custom JPEG background preserved');
    report.push({scope:'all',format,files:Object.keys(files),bytes:archive.length,transparent});
  }
  assert.equal(await evaluate('JSON.stringify({screens:window.exportTest.state.screens,components:window.exportTest.state.components,selection:window.exportTest.state.selectedComponentId,history:window.exportTest.state.past,future:window.exportTest.state.future,tokens:window.exportTest.state.tokens,designSystem:window.exportTest.state.designSystem,device:window.exportTest.state.device,currentScreen:window.exportTest.state.currentScreen})'),snapshot);
  assert.equal(await evaluate('!!document.querySelector("[data-export-host]")'),false);
  // Existing non-image behaviors are preserved and actual files are checked.
  await click('JSON');await click('Export');const backup=JSON.parse((await waitDownload('Export-verification.json')).toString());assert.equal(backup.screens.length,3);assert.equal(backup.components.headline.text,'Full screen text');
  await click('Website project');await click('Export');assert.ok((await waitDownload('Export-verification.zip-placeholder.txt')).toString().includes('Code generation is not available yet.'));
  // Failed assets leave the source intact, remove the temporary renderer, and expose a useful error.
  await send('Network.setBlockedURLs',{urls:['*missing-export-image.png*']});
  await evaluate(`window.exportTest.dispatch({type:'UPDATE_COMPONENT_DATA',id:'asset',data:{source:'https://assets.example.test/missing-export-image.png'}})`);await click('Screenshots');await select('Export scope','current');await select('Image format','png');await click('Export');
  let error='';for(let i=0;i<100;i++){error=await evaluate(`document.querySelector('[data-modal] [role="alert"]')?.textContent`);if(error)break;await pause(100);}assert.ok(error?.includes('Could not export image'));assert.equal(await evaluate('!!document.querySelector("[data-export-host]")'),false);report.push({missingAssetError:error});
  await evaluate(`window.exportTest.website();window.exportTest.dispatch({type:'SELECT_SCREEN',id:'long'});window.exportTest.dispatch({type:'UPDATE_SCREEN_DATA',id:'long',data:{width:-1}})`);await select('Image format','png');await click('Export');
  assert.ok(await evaluate(`document.querySelector('[data-modal] [role="alert"]').textContent.includes('invalid screen dimensions')`));assert.equal(await evaluate('!!document.querySelector("[data-export-host]")'),false);
  await evaluate(`window.exportTest.website();window.exportTest.dispatch({type:'UPDATE_COMPONENT_STYLES',id:'gradient',styles:{background:'conic-gradient(#ff0000, #0000ff)'}})`);await evaluate(`window.exportTest.dispatch({type:'UPDATE_SCREEN_DATA',id:'long',data:{label:'Conic test'}})`);await select('Image format','png');await click('Export');
  const complex=await decode(await waitDownload('conic-test.png'),'image/png');assert.equal(complex.height,3800);assert.ok(complex.gradient[0]>150&&complex.gradient[2]>30&&complex.gradient[1]<5);report.push({complexCssRaster:complex});
  await select('Image format','jpeg');await click('Export');const complexJpeg=await decode(await waitDownload('conic-test.jpg'),'image/jpeg');assert.equal(complexJpeg.height,3800);assert.ok(complexJpeg.gradient[0]>150&&complexJpeg.gradient[2]>30&&complexJpeg.gradient[1]<5);report.push({complexCssJpeg:complexJpeg});
  // Mobile uses its actual logical screen dimensions, not the phone/editor frame.
  await evaluate(`window.exportTest.mobile();window.exportTest.dispatch({type:'SELECT_SCREEN',id:'profile'})`);assert.equal(await evaluate(`document.querySelector('[data-modal]').textContent.includes('React Native / Expo project')`),false);await select('Image format','png');await click('Export');const mobile=await decode(await waitDownload('profile.png'),'image/png');assert.equal(mobile.width,390);assert.equal(mobile.height,844);report.push({mobile});
  await evaluate(`window.exportTest.dispatch({type:'RESET_PROJECT'});window.exportTest.dispatch({type:'OPEN_MODAL',modal:{type:'export'}})`);await pause(300);await click('Screenshots');assert.equal(await evaluate(`document.querySelector('[data-modal] button.btn-primary').disabled`),true);assert.equal(await evaluate('!!document.querySelector("[data-export-host]")'),false);
  await writeFile(path.join(output,'results.json'),JSON.stringify(report,null,2));await writeFile('artifacts/image-export/latest-run.json',JSON.stringify({output,report},null,2));
  console.log('PASS: actual direct PNG/JPEG downloads, both ZIP formats, full 3800px footer, duplicates, transparency/JPEG background, mobile, missing assets, unchanged design, JSON and existing project export.');console.log(JSON.stringify({output,report},null,2));
} finally {socket?.close();chrome.kill();await server.close();}
