import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {extractGeminiText,parseGeminiJson} from '../server/geminiResponse';
import {designRoute,geminiConfig} from '../server/gemini';
if(!process.argv.includes('--live'))throw new Error('Pass --live to exercise the existing configured Gemini project.');
try{process.loadEnvFile('.env');}catch{}
const kind=process.argv.find(v=>v.startsWith('--kind='))?.split('=')[1]??'fitness';
const prompts:Record<string,{prompt:string;productType:'website'|'mobile_app'}>={
  saas:{productType:'website',prompt:'Build a premium SaaS project management dashboard named Flowspace. Create exactly one screen named Dashboard, with project overview, recent activity, useful sample projects clearly labeled as sample data, and a polished sidebar. Use restrained neutral colors, a violet accent and editable meaningful components.'},
  landing:{productType:'website',prompt:'Create an editorial landing page for a sustainable architecture studio named Fieldwork. Create exactly one page named Studio. Include a striking typographic hero, projects section, approach, and contact call to action with working same-page anchors. Use warm off-white, dark ink, and purposeful spacious composition; keep all text editable.'},
  fitness:{productType:'mobile_app',prompt:'Create a polished fitness app named Form. Create exactly two screens: Dashboard and Workout Details, with calories on the Dashboard and a Start Workout button on Workout Details. Include working navigation from Dashboard to Workout Details. No personal exercise records are supplied: use useful empty states, editable workout templates and an unrecorded calorie summary. Use restrained sage colors, strong typography and clear safe spacing.'},
};
if(!prompts[kind])throw new Error('Unknown fixture');
// Local CLI harness only: Firebase authentication is separately tested with signed tokens.
// This bypass is never enabled by environment variables or production route configuration.
const nativeFetch=globalThis.fetch,mdResponses:unknown[]=[];
globalThis.fetch=(async(url,init)=>{const response=await nativeFetch(url,init);if(String(url).startsWith('https://generativelanguage.googleapis.com')&&JSON.parse(String(init?.body)).generationConfig?.responseJsonSchema?.properties?.designMd&&response.ok){mdResponses.push(parseGeminiJson(extractGeminiText(await response.clone().json()),'design-md'));}return response;}) as typeof fetch;
const route=designRoute(process.env,async()=> 'local-verification-owner');
const server=createServer((req,res)=>void route(req,res,()=>res.end()));
try{
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const response=await fetch(`http://127.0.0.1:${(server.address() as any).port}/api/design`,{method:'POST',body:JSON.stringify({mode:'generate',...prompts[kind]}),signal:AbortSignal.timeout(geminiConfig(process.env).timeoutMs+30000)});
  const result=await response.json();await mkdir('artifacts/fixed-flow',{recursive:true});await writeFile(`artifacts/fixed-flow/${kind}.json`,JSON.stringify(result,null,2));
  await writeFile(`artifacts/fixed-flow/${kind}-md-responses.json`,JSON.stringify(mdResponses,null,2));
  if(result.designMd)await writeFile(`artifacts/fixed-flow/${kind}-DESIGN.md`,result.designMd);
  console.info(JSON.stringify({fixture:kind,status:response.status,resultStatus:result.status,code:result.code,stage:result.stage,screens:result.app?.screens?.map((s:any)=>({id:s.id,name:s.name})),warnings:result.warnings,mdHash:result.generationArtifact?.designMdHash,authentication:'Local harness injected identity; live Firebase sign-in not tested'}));
  if(!response.ok)process.exitCode=1;
}finally{globalThis.fetch=nativeFetch;server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
