import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {designRoute,geminiConfig} from '../server/gemini';
import {validateApp,type DesignApp} from '../shared/design';
import {planDesign,applyPlannedInsets,validatePlannedDesign} from '../server/designPlanning';
import {JSDOM} from 'jsdom';

// Optional real-model acceptance check. Artifacts never enter runtime project data.
try {process.loadEnvFile('.env');} catch { /* Host may inject configuration. */ }
if(!geminiConfig(process.env).key || !geminiConfig(process.env).model)throw new Error('Configure Gemini key and model.');
const route=designRoute(process.env);
const server=createServer((req,res)=>void route(req,res,()=>{res.writeHead(404);res.end();}));
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/design`;
const output=new URL('../artifacts/design-quality/',import.meta.url);
await mkdir(output,{recursive:true});
const nativeFetch=globalThis.fetch;
let caseName='';
globalThis.fetch=(async(input,init)=>{
  if(!String(input).startsWith('https://generativelanguage.googleapis.com'))return nativeFetch(input,init);
  const payload=JSON.parse(String(init?.body));
  const properties=payload.generationConfig.responseJsonSchema.properties;
  const stage=properties.visualTokens?'planning':properties.app?'visual generation':'intent detection';
  console.log(`  ${stage}…`);
  const response=await nativeFetch(input,init);
  if(!response.ok)console.log(`  ${stage} returned HTTP ${response.status}`);
  if((properties.visualTokens || properties.app) && response.ok) {
    const data=await response.clone().json();
    const text=data.candidates?.[0]?.content?.parts.map((p:{text?:string})=>p.text??'').join('');
    const mode=properties.app?JSON.parse(payload.contents[0].parts[0].text).mode:'plan';
    if(text)await writeFile(new URL(`${caseName}-${mode==='plan'?'plan':`${mode}-response`}.json`,output),text);
  }
  return response;
}) as typeof fetch;
async function request(body:unknown):Promise<DesignApp> {
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(370000)});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error);
  return validateApp(result.app);
}
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','Element','localStorage','sessionStorage'])Object.defineProperty(globalThis,key,{value:(dom.window as any)[key],configurable:true});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const React=await import('react');const {act}=React;
const {createRoot}=await import('react-dom/client');
const {WorkspaceProvider,useWorkspace}=await import('../src/workspace/store');
const {GeneratedSurface}=await import('../src/workspace/components/GeneratedSurface');
let generate:ReturnType<typeof useWorkspace>['generateDesign'];
function Preview(){const ws=useWorkspace();generate=ws.generateDesign;return <div style={{display:'flex',gap:24}}>{ws.state.screens.map(s=><section key={s.id}><h2>{s.name}</h2><GeneratedSurface screen={s}/></section>)}</div>;}
const root=createRoot(document.getElementById('root')!);
const bundled=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
const stylesheet=bundled.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1]??'';
const fonts=(await readFile(new URL('../index.html',import.meta.url),'utf8')).match(/<link[^>]*fonts.googleapis.com\/css[^>]*>/)?.[0]??'';
async function render(app:DesignApp,name:string) {
  const previous=globalThis.fetch;
  globalThis.fetch=(async()=>new Response(JSON.stringify({message:'Live acceptance result',app}))) as typeof fetch;
  try {
    await act(async()=>root.render(<WorkspaceProvider><Preview/></WorkspaceProvider>));
    await act(async()=>generate!('Render acceptance result'));
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,750));});
    assert.equal(document.querySelectorAll('[data-component-id]').length,app.screens.reduce((n,s)=>n+s.components.length,0));
    const html=`<!doctype html><meta charset="utf-8">${fonts}<style>${stylesheet}</style><style>body{margin:0;padding:24px;background:#ddd;color:#111;font-family:Inter,Arial,sans-serif}h2{font-size:16px;margin:0 0 12px}input:focus{outline:none}</style>${document.getElementById('root')!.innerHTML}`;
    await writeFile(new URL(`${name}.html`,output),html);
  } finally {globalThis.fetch=previous;}
}
try {
  for(const [name,prompt,screens] of [
    ['travel','Create a premium travel planning mobile app with Explore, Trip Detail, Saved and Profile screens.',['Explore','Trip Detail','Saved','Profile']],
    ['fitness','Create a premium fitness tracking mobile app with Home, Activity, Progress and Profile.',['Home','Activity','Progress','Profile']],
  ] as const) {
    if(process.argv[2] && process.argv[2]!==name)continue;
    caseName=name;
    console.log(process.argv.includes('--resume')?`Checking saved real ${name} result…`:`Generating ${name} with configured model…`);
    const app=process.argv.includes('--resume')?validateApp(JSON.parse(await readFile(new URL(`${name}.json`,output),'utf8'))):await request({mode:'generate',prompt});
    if(process.argv.includes('--resume')) {
      const plan=await planDesign(prompt,app.productType,async()=>readFile(new URL(`${name}-plan.json`,output),'utf8'));
      applyPlannedInsets(app,plan);validatePlannedDesign(app,plan);
    }
    assert.equal(app.productType,'mobile_app');
    for(const screen of screens)assert.ok(app.screens.some(s=>s.name===screen),`Missing ${screen}`);
    assert.equal(app.screens.length,4);
    assert.ok(app.screens.every(s=>s.components.length>0));
    for(const screen of app.screens) {
      const sizes=new Set(screen.components.filter(c=>c.type==='Text').map(c=>c.styles.fontSize??14));
      assert.ok(sizes.size>=2,`${screen.name} lacks a typography hierarchy`);
      assert.ok(screen.components.every(c=>!c.text || !/lorem ipsum|^card title$|^description here$|^item 1$/i.test(c.text)),`${screen.name} contains meaningless copy`);
    }
    await writeFile(new URL(`${name}.json`,output),JSON.stringify(app,null,2));
    await render(app,name);
    if(process.argv.includes('--render-only')) {console.log(`${name}: saved real result validated and rendered.`);continue;}
    const active=app.screens[0];
    const untouched=JSON.stringify(app.screens.slice(1));
    console.log(`Refining ${name} active screen…`);
    const edited=await request({mode:'modify',prompt:`Make only the ${active.name} screen cleaner and more premium. Preserve the existing design system, useful content, component IDs and all other screens.`,app,activeScreen:active.id});
    assert.deepEqual(edited.designSystem,app.designSystem);
    assert.equal(JSON.stringify(edited.screens.slice(1)),untouched);
    const updated=edited.screens.find(s=>s.id===active.id)!;
    for(const c of active.components)assert.ok(updated.components.some(n=>n.id===c.id),`Lost component ${c.id}`);
    await writeFile(new URL(`${name}-modified.json`,output),JSON.stringify(edited,null,2));
    await render(edited,`${name}-modified`);
    console.log(`${name}: 4 screens, ${app.screens.reduce((n,s)=>n+s.components.length,0)} editable components; scoped refinement preserved tokens, IDs and other screens.`);
  }
} finally {
  globalThis.fetch=nativeFetch;
  await act(async()=>root.unmount());dom.window.close();
  await new Promise<void>(resolve=>server.close(()=>resolve()));
}
