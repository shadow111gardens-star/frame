import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {fixture} from './fixture';
import {previewConfig} from '../shared/product';

test('generation, independent screens, nested selection, property edits, AI modifications and retry',async()=>{
  const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/#home',pretendToBeVisual:true});
  for(const key of ['window','document','HTMLElement','Element','HTMLInputElement','HTMLTextAreaElement','SVGElement','localStorage','sessionStorage','getComputedStyle']) Object.defineProperty(globalThis,key,{value:(dom.window as any)[key],configurable:true});
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:dom.window.requestAnimationFrame.bind(dom.window),cancelAnimationFrame:dom.window.cancelAnimationFrame.bind(dom.window),ResizeObserver:class{observe(){}disconnect(){}}});
  dom.window.HTMLElement.prototype.scrollTo=()=>{};
  dom.window.scrollTo=()=>{};
  const React=await import('react');const {act}=React;
  const {createRoot}=await import('react-dom/client');
  const {MotionGlobalConfig}=await import('framer-motion');MotionGlobalConfig.skipAnimations=true;
  const {WorkspaceProvider,useWorkspace}=await import('../src/workspace/store');
  const {PromptBox}=await import('../src/home/components/PromptBox');
  const {HomeProvider,useHome}=await import('../src/home/store');
  const {HomeLayout}=await import('../src/home/HomeLayout');
  const {getCurrentProject}=await import('../src/workspace/store');
  let homeState:ReturnType<typeof useHome>['state'];
  function ObserveHome(){homeState=useHome().state;return null;}
  const {WorkspaceLayout}=await import('../src/workspace/WorkspaceLayout');
  let state:ReturnType<typeof useWorkspace>['state'];
  let dispatch:ReturnType<typeof useWorkspace>['dispatch'];
  let generate:ReturnType<typeof useWorkspace>['generateDesign'];
  function Observe(){const ws=useWorkspace();state=ws.state;dispatch=ws.dispatch;generate=ws.generateDesign;return null;}
  const requests:any[]=[];let fail=false;let failSchema=false;let release:(()=>void)|undefined;let holdNext=false;
  const oldFetch=globalThis.fetch;
  globalThis.fetch=(async(_url,init)=>{
    const input=JSON.parse(String(init?.body));requests.push(input);
    if(release===undefined || holdNext) {holdNext=false;await new Promise<void>(resolve=>{release=resolve;});}
    if(fail)return new Response(JSON.stringify({error:failSchema?'Gemini returned invalid prompt analysis: goals (too_big). Your original prompt is preserved.':'Invalid design response',...(failSchema?{code:'ANALYSIS_SCHEMA',retryable:false}:{})}),{status:502});
    const app=input.app??fixture();if(input.mode==='modify')app.screens[0].components.find((c:any)=>c.id==='button').styles.background='#8000ff';
    return new Response(JSON.stringify({message:input.mode==='modify'?'Updated primary button':'Created Home and Profile',app}));
  }) as typeof fetch;
  const root=createRoot(document.getElementById('root')!);
  const prompt='  Create a mobile fitness app with Home and Profile.\n  ';
  try {
    localStorage.setItem('frame.home.v1',JSON.stringify({projects:[{id:'p-fitness',name:'Fitness App'}],chats:[{id:'demo',messages:[]}],settings:{displayName:'Alex Carter',email:'alex@frame.studio'},credits:{remaining:820,total:1000,resetAt:Date.now(),history:[{id:'demo'}]}}));
    await act(async()=>root.render(<HomeLayout/>));
    assert.ok(document.body.textContent?.includes('No projects yet.'));
    assert.ok(!document.body.textContent?.includes('Fitness App'));
    assert.ok(!document.body.textContent?.includes('820'));
    await act(async()=>root.render(<HomeProvider><ObserveHome/><PromptBox value={prompt} onChange={()=>{}}/></HomeProvider>));
    assert.deepEqual(homeState!.projects,[]);assert.deepEqual(homeState!.chats,[]);
    assert.equal(homeState!.settings.email,'');assert.equal(homeState!.settings.displayName,'');assert.equal(homeState!.credits.total,0);
    await act(async()=>root.render(<WorkspaceProvider><Observe/><WorkspaceLayout/></WorkspaceProvider>));
    assert.deepEqual(state!.screens,[]);assert.deepEqual(state!.components,{});assert.deepEqual(state!.files,[]);assert.deepEqual(state!.messages,[]);
    assert.equal(document.querySelector('[data-component-id]'),null);
    assert.equal(document.querySelector('input[aria-label="Screen width"]'),null);
    assert.equal(getCurrentProject(),null);
    await act(async()=>dispatch!({type:'SET_DEVICE',device:'macbook-pro-14'}));
    await act(async()=>dispatch!({type:'SET_CENTER_TAB',tab:'prototype'}));
    assert.deepEqual(state!.screens,[]);assert.deepEqual(state!.components,{});
    await act(async()=>root.render(<HomeProvider><PromptBox value={prompt} onChange={()=>{}}/></HomeProvider>));
    const modeButton=(label:string)=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent===label)!;
    assert.equal(modeButton('App').getAttribute('aria-pressed'),'true');
    assert.ok(!document.body.textContent?.includes('Reference'));
    assert.ok(!document.body.textContent?.includes('Options'));
    await act(async()=>modeButton('Web').click());
    assert.equal(modeButton('Web').getAttribute('aria-pressed'),'true');
    assert.equal(modeButton('App').getAttribute('aria-pressed'),'false');
    await act(async()=>modeButton('App').click());
    const button=Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.includes('Generate'))!;
    await act(async()=>button.click());assert.equal(dom.window.location.hash,'#workspace');
    await act(async()=>root.render(<React.StrictMode><WorkspaceProvider><Observe/><WorkspaceLayout/></WorkspaceProvider></React.StrictMode>));
    await act(async()=>{for(let i=0;i<20&&requests.length===0;i++)await new Promise(r=>setTimeout(r,5));});
    assert.equal(requests.length,1);assert.equal(requests[0].prompt,prompt);assert.equal(requests[0].productType,'mobile_app');assert.equal(state!.generating,true);assert.ok(document.body.textContent?.includes(prompt));
    assert.ok(document.querySelector('[data-generation-indicator][role="status"]'));
    assert.deepEqual(state!.screens,[]);assert.equal(document.querySelector('[data-component-id]'),null);
    await act(async()=>{release!();await new Promise(r=>setTimeout(r,30));});
    assert.equal(state!.screens.length,2);assert.equal(state!.generating,false);
    assert.equal(document.querySelector('[data-generation-indicator]'),null);
    assert.equal(state!.productType,'mobile_app');
    await act(async()=>dispatch!({type:'UPDATE_COMPONENT_DATA',id:'button',data:{targetScreenId:'profile'}}));
    await act(async()=>dispatch!({type:'SET_CENTER_TAB',tab:'prototype'}));
    const phone=document.querySelector('[data-preview-frame="phone"]');assert.ok(phone);
    assert.equal(document.querySelector('[data-preview-frame="browser"]'),null);
    assert.ok(phone!.contains(document.querySelector('[data-component-id="title"]')));
    await act(async()=>(document.querySelector('[data-component-id="button"]') as HTMLElement).click());
    assert.equal(state!.currentScreen,'profile');assert.equal(document.querySelector('[data-preview-frame="phone"]'),phone);
    await act(async()=>{dispatch!({type:'SELECT_SCREEN',id:'home'});dispatch!({type:'SET_CENTER_TAB',tab:'home'});});
    assert.equal(getCurrentProject()?.name,'Fitness');
    assert.ok(document.querySelector('[data-component-id="title"]'));
    await act(async()=>(document.querySelector('[data-component-id="title"]') as HTMLElement).click());assert.equal(state!.selectedComponentId,'title');
    // Exercise the actual controlled inspector input.
    const text=document.querySelector('input[aria-label="text"]') as HTMLInputElement;
    await act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')!.set!.call(text,'Edited activity');text.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
    assert.equal(state!.components.title.text,'Edited activity');assert.ok(document.querySelector('[data-component-id="title"]')?.textContent?.includes('Edited activity'));
    await act(async()=>dispatch!({type:'SELECT_SCREEN',id:'profile'}));assert.ok(document.querySelector('[data-component-id="profile-title"]'));assert.equal(document.querySelector('[data-component-id="title"]'),null);
    await act(async()=>dispatch!({type:'SELECT_SCREEN',id:'home'}));assert.equal(state!.components.title.text,'Edited activity');
    await act(async()=>generate!('Make the primary button purple.',true));assert.equal(requests[1].app.screens[0].components.find((c:any)=>c.id==='title').text,'Edited activity');assert.equal(state!.components.button.styles.background,'#8000ff');
    assert.equal(state!.components['profile-title'].text,'Alex');
    assert.equal(state!.productType,'mobile_app');assert.equal(requests[1].app.productType,'mobile_app');
    await act(async()=>dispatch!({type:'UNDO'}));assert.equal(state!.components.button.styles.background,'#ffffff');
    await act(async()=>dispatch!({type:'REDO'}));assert.equal(state!.components.button.styles.background,'#8000ff');
    fail=true;const before=JSON.stringify(state!.components);await act(async()=>generate!('Add search.',true));assert.equal(JSON.stringify(state!.components),before);assert.equal(state!.generating,false);assert.ok(Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Retry'));
    const retryCount=Array.from(document.querySelectorAll('button')).filter(b=>b.textContent==='Retry').length;
    failSchema=true;const originalPrompt='  Build my portfolio with multiple styles.\n  ';
    await act(async()=>generate!(originalPrompt));assert.equal(JSON.stringify(state!.components),before);
    assert.equal(state!.messages.at(-1)?.retryPrompt,originalPrompt);assert.equal(state!.messages.at(-1)?.retryable,false);
    assert.ok(!state!.messages.at(-1)?.content.includes('Resend your instruction to retry'));
    assert.equal(Array.from(document.querySelectorAll('button')).filter(b=>b.textContent==='Retry').length,retryCount);failSchema=false;
    fail=false;holdNext=true;let pending:Promise<void>;
    const count=requests.length;
    await act(async()=>{pending=generate!('Make button purple again.',true);});
    assert.ok(document.querySelector('[data-generation-indicator]'));assert.ok(document.querySelector('[data-component-id]'));
    await act(async()=>{await generate!('Duplicate request',true);dispatch!({type:'UPDATE_COMPONENT_DATA',id:'title',data:{text:'Manual change during request'}});});
    assert.equal(requests.length,count+1);
    await act(async()=>{release!();await pending!;});
    assert.equal(state!.components.title.text,'Manual change during request');
    assert.ok(document.body.textContent?.includes('The design changed while generation was running'));
    await act(async()=>dispatch!({type:'DELETE_COMPONENT',componentId:'title',screenId:'home'}));assert.equal(document.querySelector('[data-component-id="title"]'),null);assert.deepEqual(state!.components.card.children,[]);
    await act(async()=>dispatch!({type:'RESET_PROJECT'}));
    assert.deepEqual(state!.screens,[]);assert.deepEqual(state!.components,{});assert.deepEqual(state!.messages,[]);assert.equal(getCurrentProject(),null);
    assert.equal(document.querySelector('[data-component-id]'),null);
    const cases=[
      ['Create a modern SaaS landing page for an AI product.','website'],
      ['Create a modern fitness tracking mobile app.','mobile_app'],
      ['Build an iOS food delivery app with Home, Search, Orders and Profile.','mobile_app'],
      ['Create an ecommerce website with Home, Products, Cart and Checkout.','website'],
    ] as const;
    for(const [prompt,productType] of cases) {
      // Validated generation output fixture, never runtime demo content.
      const app=fixture();app.productType=productType;
      app.screens.forEach(s=>{s.width=previewConfig(productType).viewportWidth;s.height=previewConfig(productType).viewportHeight;});
      await act(async()=>{dispatch!({type:'APPLY_DESIGN',app});dispatch!({type:'SET_CENTER_TAB',tab:'home'});});
      assert.ok(document.querySelector(`[data-product-type="${productType}"]`),prompt);
      await act(async()=>dispatch!({type:'SET_CENTER_TAB',tab:'prototype'}));
      const {DEVICES}=await import('../src/workspace/store');
      for(const device of DEVICES.filter(d=>(d.platform==='laptop')===(productType==='website'))){
        await act(async()=>dispatch!({type:'SET_DEVICE',device:device.id}));
        assert.ok(document.querySelector(`[data-preview-frame="${previewConfig(productType).frame}"]`));
        assert.equal(state!.device,device.id);
      }
      const frame=previewConfig(productType).frame;
      assert.ok(document.querySelector(`[data-preview-frame="${frame}"]`),prompt);
      assert.equal(document.querySelector(`[data-preview-frame="${frame==='phone'?'browser':'phone'}"]`),null);
      assert.ok(!Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Code'));
      if(productType==='website') {
        await act(async()=>generate!('Add a restaurant details page.',true));
        assert.equal(state!.productType,'website');assert.equal(requests.at(-1).app.productType,'website');
        await act(async()=>dispatch!({type:'UNDO'}));assert.equal(state!.productType,'website');
      }
      // The same property editor must edit every product/frame and survive serialization.
      await act(async()=>{dispatch!({type:'SET_CENTER_TAB',tab:'home'});dispatch!({type:'SELECT_SCREEN',id:'home'});dispatch!({type:'SELECT_COMPONENT',id:'title'});});
      const edit=async(label:string,value:string)=>{const el=document.querySelector(`[aria-label="${label}"]`) as HTMLInputElement|HTMLSelectElement;assert.ok(el,label);await act(async()=>{const prototype=el.tagName==='SELECT'?dom.window.HTMLSelectElement.prototype:dom.window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value')!.set!.call(el,value);el.dispatchEvent(new dom.window.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));});};
      await edit('Font family','Instrument Serif');await edit('Font variant','italic');await edit('Font size','30');await edit('Line height','1.8');await edit('Letter spacing','2');await edit('Alignment','right');await edit('Shadow','medium');
      const rendered=document.querySelector('[data-component-id="title"]') as HTMLElement;
      assert.equal(rendered.style.fontStyle,'italic');assert.equal(rendered.style.lineHeight,'1.8');assert.equal(rendered.style.letterSpacing,'2px');assert.equal(rendered.style.textAlign,'right');assert.ok(rendered.style.boxShadow.includes('24px'));
      const weightOptions=[...document.querySelectorAll('select[aria-label="Font weight"] option')].map(o=>(o as HTMLOptionElement).value);assert.deepEqual(weightOptions,['400']);
      await edit('color link','accent');await act(async()=>dispatch!({type:'LINK_COLOR_TOKEN',key:'accent'}));
      await edit('Token accent','#ff000080');assert.equal(rendered.style.color,'rgba(255, 0, 0, 0.5)');
      assert.equal(state!.components['profile-title'].styles.colorToken,'accent');
      await edit('Text / fill color','#00ff00');assert.equal(state!.components.title.styles.colorToken,undefined);
      await edit('Token accent','#0000ff');assert.equal(rendered.style.color,'rgb(0, 255, 0)');
      await act(async()=>dispatch!({type:'UNDO'}));assert.equal(state!.tokens.accent,'#ff000080');
      await act(async()=>dispatch!({type:'REDO'}));assert.equal(state!.tokens.accent,'#0000ff');
      await edit('paddingX token','2');assert.equal(rendered.style.padding,'0px 16px');
      await act(async()=>dispatch!({type:'UPDATE_DESIGN_SYSTEM',designSystem:{...state!.designSystem!,spacing:[4,8,21,24]}}));assert.equal(rendered.style.padding,'0px 21px');
      await edit('Width mode','fill');assert.equal(rendered.style.width,'calc(100% - 16px)');
      const {workspaceToApp}=await import('../src/workspace/store');const {validateApp}=await import('../shared/design');
      const roundTrip=validateApp(workspaceToApp(state!));assert.equal(roundTrip.screens[0].components.find(c=>c.id==='title')?.styles.letterSpacing,2);
      await act(async()=>dispatch!({type:'SELECT_COMPONENT',id:'card'}));await edit('Child layout','grid');await edit('Columns','2');
      assert.equal((document.querySelector('[data-component-id="card"]') as HTMLElement).style.display,'grid');assert.equal(rendered.style.position,'relative');
      await act(async()=>dispatch!({type:'RESET_PROJECT'}));
    }
  } finally {await act(async()=>root.unmount());globalThis.fetch=oldFetch;dom.window.close();}
});
