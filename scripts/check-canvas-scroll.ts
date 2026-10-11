import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from 'vite';

// Uses installed Chrome and native CDP/WebSocket; adds no automation dependency.
const server=await createServer({server:{host:'127.0.0.1',port:0},plugins:[{name:'scroll-acceptance',configureServer(vite){
  vite.middlewares.use('/__scroll-test',async(_req,res)=>{
    res.setHeader('Content-Type','text/html');
    res.end(await vite.transformIndexHtml('/__scroll-test','<!doctype html><html><head></head><body><div id="root"></div><script type="module" src="/tests/scrollHarness.tsx"></script></body></html>'));
  });
}}]});
await server.listen();
const profile=await mkdtemp(path.join(tmpdir(),'frame-scroll-'));
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
  await send('Page.navigate',{url:`${server.resolvedUrls!.local[0]}__scroll-test`});
  for(let i=0;i<100;i++){if(await evaluate('!!document.querySelector("[data-generated-screen]")'))break;await pause(100);}
  await pause(600);
  const layout=()=>evaluate(`(()=>{const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};return {header:rect(document.querySelector('header')),toolbar:rect(document.querySelector('[data-canvas-shell]').previousElementSibling),left:rect(document.querySelector('header').parentElement.children[2].children[0]),right:rect(document.querySelector('header').parentElement.children[2].children[3]),body:document.scrollingElement.scrollTop}})()`);
  const metrics=(selector:string)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect(),f=document.querySelector('[data-component-id="footer-text"]').getBoundingClientRect();return {top:e.scrollTop,height:e.clientHeight,scrollHeight:e.scrollHeight,x:r.x+Math.min(r.width/2,200),y:r.y+r.height/2,footerVisible:f.top<r.bottom&&f.bottom>r.top,fullHeight:document.querySelector('[data-generated-screen]').style.height,shellTop:document.querySelector('[data-canvas-shell]').scrollTop}})()`);
  const wheel=async(selector:string,deltaY:number)=>{const m=await metrics(selector);await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:m.x,y:m.y,deltaX:0,deltaY});await pause(200);};
  const report:any[]=[];
  await mkdir('artifacts/canvas-scroll',{recursive:true});
  for(const zoom of ['fit',100,200]) {
    await evaluate(`window.scrollTest.dispatch(${JSON.stringify(zoom==='fit'?{type:'TOGGLE_FIT'}:{type:'SET_ZOOM',zoom})})`);
    // Initial Fit is already enabled; explicitly restore it if toggled off.
    if(zoom==='fit')await evaluate(`if(!window.scrollTest.state.fit)window.scrollTest.dispatch({type:'TOGGLE_FIT'})`);
    await pause(450);const fixed=await layout();const selector='[data-canvas-scroll="design"]';
    await evaluate(`document.querySelector('${selector}').scrollTop=0`);
    const start=await metrics(selector);assert.equal(start.fullHeight,'3800px');assert.ok(start.scrollHeight>start.height);
    for(let i=0;i<10;i++)await wheel(selector,1000);
    const end=await metrics(selector);assert.ok(end.top>0&&end.footerVisible,`Design ${zoom}: wheel reaches footer`);assert.deepEqual(await layout(),fixed);assert.equal(end.shellTop,0);
    // Move horizontally to the footer text if a high zoom puts it outside the viewport.
    await evaluate(`document.querySelector('${selector}').scrollLeft=0`);
    await evaluate(`document.querySelector('[data-component-id="footer-text"]').click()`);
    assert.equal(await evaluate('window.scrollTest.state.selectedComponentId'),'footer-text');
    await evaluate(`window.scrollTest.dispatch({type:'UPDATE_COMPONENT_DATA',id:'footer-text',data:{text:'Edited footer'}})`);
    await evaluate(`window.scrollTest.dispatch({type:'UNDO'})`);assert.equal(await evaluate('window.scrollTest.state.components["footer-text"].text'),'Portfolio footer');
    await evaluate(`window.scrollTest.dispatch({type:'REDO'})`);assert.equal(await evaluate('window.scrollTest.state.components["footer-text"].text'),'Edited footer');
    await evaluate(`window.scrollTest.dispatch({type:'UNDO'})`);
    report.push({mode:'Design',zoom,...end});
    if(zoom===100)await writeFile('artifacts/canvas-scroll/design-footer.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
  await evaluate(`window.scrollTest.dispatch({type:'SET_CENTER_TAB',tab:'prototype'});window.scrollTest.dispatch({type:'SET_ZOOM',zoom:100})`);await pause(700);
  const selector='[data-prototype-viewport="website"]';const fixed=await layout();
  for(let i=0;i<6;i++)await wheel(selector,1000);
  let end=await metrics(selector);assert.ok(end.footerVisible&&end.top>0,'Prototype wheel reaches footer');assert.deepEqual(await layout(),fixed);assert.equal(end.fullHeight,'3800px');
  await evaluate(`document.querySelector('${selector}').scrollTop=0;document.querySelector('[data-component-id="nav-footer"] a').click()`);await pause(1100);
  end=await metrics(selector);assert.ok(end.footerVisible&&end.top>0,'Prototype anchor reaches nested footer');assert.deepEqual(await layout(),fixed);assert.equal(await evaluate('location.hash'),'');
  report.push({mode:'Prototype',zoom:100,...end});
  await writeFile('artifacts/canvas-scroll/prototype-footer.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  // Fit after a resize must still expose long content; mobile keeps its phone frame.
  await send('Emulation.setDeviceMetricsOverride',{width:1100,height:700,deviceScaleFactor:1,mobile:false});
  await evaluate(`window.scrollTest.dispatch({type:'TOGGLE_FIT'})`);await pause(500);
  await evaluate(`document.querySelector('${selector}').scrollTop=0`);for(let i=0;i<6;i++)await wheel(selector,1000);
  assert.ok((await metrics(selector)).footerVisible,'Resized prototype scrolls to footer');
  // Exercise real device dropdown handlers, not just the reducer.
  const originalComponents=await evaluate('JSON.stringify(window.scrollTest.state.components)');
  for(const [label,id,width] of [['MacBook Pro 16','macbook-pro-16',1728],['MacBook Air 13','macbook-air-13',1470],['MacBook Air 15','macbook-air-15',1710]] as const) {
    await evaluate(`document.querySelector('[data-device-dropdown]>button').click()`);await pause(200);
    await evaluate(`Array.from(document.querySelectorAll('[data-device-dropdown] button')).find(b=>b!==document.querySelector('[data-device-dropdown]>button')&&b.textContent.includes(${JSON.stringify(label)})).click()`);await pause(400);
    const device=await evaluate(`(()=>{const e=document.querySelector('${selector}');return {id:e.dataset.deviceId,width:e.offsetWidth}})()`);
    assert.deepEqual(device,{id,width});assert.equal(await evaluate('JSON.stringify(window.scrollTest.state.components)'),originalComponents);
    report.push({device:label,viewportWidth:width});
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1600,height:900,deviceScaleFactor:1,mobile:false});
  await evaluate(`window.scrollTest.dispatch({type:'SET_ZOOM',zoom:100});document.querySelector('${selector}').scrollTop=0;
    window.scrollTest.dispatch({type:'UPDATE_COMPONENT_DATA',id:'hero',data:{text:'I turn ideas into products people can use.'}});
    window.scrollTest.dispatch({type:'UPDATE_COMPONENT_POSITION',id:'hero',position:{x:60,y:100,width:400,height:45}});
    window.scrollTest.dispatch({type:'ADD_COMPONENT',insertIntoScreenId:'portfolio',component:{id:'supporting-copy',type:'Text',name:'Supporting copy',text:'I build useful software, AI-powered workflows and creative tools from idea to launch. This paragraph needs enough space to wrap naturally.',position:{x:60,y:155,width:400,height:30},styles:{fontSize:16,color:'#111111'}}});`);
  await pause(600);
  const textLayout=await evaluate(`(()=>{const a=document.querySelector('[data-text-content="hero"]').getBoundingClientRect(),b=document.querySelector('[data-text-content="supporting-copy"]').getBoundingClientRect();const s=window.scrollTest.state;return {noOverlap:a.bottom<=b.top,headlineHeight:s.components.hero.position.height,paragraphY:s.components['supporting-copy'].position.y,pageHeight:s.screens[0].height}})()`);
  assert.equal(textLayout.noOverlap,true);assert.ok(textLayout.headlineHeight>45);assert.ok(textLayout.pageHeight>3800);
  report.push({textLayout});
  await writeFile('artifacts/canvas-scroll/text-spacing.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  // Drive actual inspector DOM controls and verify browser-computed CSS.
  await evaluate(`window.scrollTest.dispatch({type:'SET_CENTER_TAB',tab:'home'});window.scrollTest.dispatch({type:'SELECT_COMPONENT',id:'hero'})`);await pause(300);
  const dropdownPalette=await evaluate(`(()=>{const e=document.querySelector('select[aria-label="Font family"]'),option=e.options[0],s=getComputedStyle(option);return {scheme:getComputedStyle(e).colorScheme,background:s.backgroundColor,color:s.color,text:option.textContent}})()`);
  assert.equal(dropdownPalette.scheme,'dark');assert.equal(dropdownPalette.background,'rgb(20, 20, 24)');assert.equal(dropdownPalette.color,'rgb(255, 255, 255)');assert.ok(dropdownPalette.text);
  report.push({dropdownPalette});
  const editProperty=async(label:string,value:string)=>{await evaluate(`(()=>{const e=document.querySelector('[aria-label="'+${JSON.stringify(label)}+'"]');const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);await pause(150);};
  await editProperty('Font weight','800');await editProperty('Font variant','italic');await editProperty('Line height','1.7');await editProperty('Letter spacing','1.5');await editProperty('Shadow','medium');await editProperty('color link','accent');await editProperty('Token accent','#ff000080');
  let properties=await evaluate(`(()=>{const s=getComputedStyle(document.querySelector('[data-component-id="hero"]'));return {family:s.fontFamily,weight:s.fontWeight,variant:s.fontStyle,lineHeight:s.lineHeight,tracking:s.letterSpacing,color:s.color,shadow:s.boxShadow}})()`);
  assert.ok(properties.family.includes('Inter'));assert.equal(properties.weight,'800');assert.equal(properties.variant,'italic');assert.equal(properties.tracking,'1.5px');assert.ok(properties.shadow.includes('24px'));assert.ok(properties.color.startsWith('rgba(255, 0, 0,'));assert.ok(Math.abs(parseFloat(properties.lineHeight)-48*1.7)<0.1);
  await editProperty('Text / fill color','#00ff00');await editProperty('Token accent','#0000ff');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-component-id="hero"]')).color`),'rgb(0, 255, 0)');
  await evaluate(`window.scrollTest.dispatch({type:'UNDO'})`);assert.equal(await evaluate('window.scrollTest.state.tokens.accent'),'#ff000080');await evaluate(`window.scrollTest.dispatch({type:'REDO'})`);
  await editProperty('paddingX token','2');assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-component-id="hero"]')).paddingLeft`),'16px');
  await evaluate(`window.scrollTest.dispatch({type:'SELECT_COMPONENT',id:'footer'})`);await pause(150);await editProperty('Child layout','grid');await editProperty('Columns','2');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-component-id="footer"]')).display`),'grid');assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-component-id="footer-text"]')).position`),'relative');
  // A device-width breakpoint changes real grid layout without changing source geometry.
  await evaluate(`document.querySelector('[aria-label="Enable breakpoint"]').click()`);await pause(150);await editProperty('Max viewport width','1600');await editProperty('Responsive columns','1');
  await evaluate(`window.scrollTest.dispatch({type:'SET_CENTER_TAB',tab:'prototype'});window.scrollTest.dispatch({type:'SET_DEVICE',device:'macbook-air-13'})`);await pause(400);
  assert.equal(await evaluate(`document.querySelector('[data-generated-screen]').offsetWidth`),await evaluate(`document.querySelector('[data-prototype-viewport]').clientWidth`));
  const compactColumns=await evaluate(`getComputedStyle(document.querySelector('[data-component-id="footer"]')).gridTemplateColumns`);assert.equal(compactColumns.split(' ').length,1);
  assert.equal(await evaluate(`document.querySelector('[aria-label="Columns"]').value`),'1');
  await evaluate(`window.scrollTest.dispatch({type:'SET_DEVICE',device:'macbook-pro-16'})`);await pause(400);
  assert.equal(await evaluate(`document.querySelector('[data-generated-screen]').offsetWidth`),await evaluate(`document.querySelector('[data-prototype-viewport]').clientWidth`));
  const wideColumns=await evaluate(`getComputedStyle(document.querySelector('[data-component-id="footer"]')).gridTemplateColumns`);assert.equal(wideColumns.split(' ').length,2);
  report.push({propertyEditor:properties,responsiveGrid:{compactColumns,wideColumns}});
  await writeFile('artifacts/canvas-scroll/property-editor.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await evaluate(`window.scrollTest.dispatch({type:'DELETE_COMPONENT',componentId:'footer',screenId:'portfolio'})`);
  assert.equal(await evaluate('window.scrollTest.state.components["nav-footer"].targetComponentId'),undefined);
  await evaluate(`window.scrollTest.dispatch({type:'UNDO'})`);
  assert.equal(await evaluate('window.scrollTest.state.components["nav-footer"].targetComponentId'),'footer');
  await evaluate('window.scrollTest.mobile()');await pause(500);assert.ok(await evaluate('!!document.querySelector("[data-preview-frame=phone]")'));
  assert.equal(await evaluate('!!document.querySelector("[data-preview-frame=browser]")'),false);
  await mkdir('artifacts/canvas-scroll',{recursive:true});await writeFile('artifacts/canvas-scroll/results.json',JSON.stringify(report,null,2));
  console.log('PASS: scrolling, anchors, fixed panels, editing/undo/redo, device dropdown viewport changes, real wrapped text spacing, resize, mobile frame, inspector typography/color/token/layout edits and responsive grid verified.');
  console.log(JSON.stringify(report,null,2));
} finally {socket?.close();chrome.kill();await server.close();}
