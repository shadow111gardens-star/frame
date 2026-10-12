import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {designRoute,geminiConfig} from '../server/gemini';
import {extractGeminiText,parseGeminiJson} from '../server/geminiResponse';

if(!process.argv.includes('--live'))throw new Error('Use --live explicitly. This exercises the existing configured Gemini API with the public Flowspace fixture.');
try{process.loadEnvFile('.env');}catch{/* Host can inject credentials. */}
if(!geminiConfig(process.env).key)throw new Error('Configure the server Gemini key.');
const prompt=(await readFile('tests/flowspacePrompt.txt','utf8')).trim(),nativeFetch=globalThis.fetch;
const stages:Record<string,unknown>[]=[];
globalThis.fetch=(async(url,init)=>{
  if(!String(url).startsWith('https://generativelanguage.googleapis.com/'))return nativeFetch(url,init);
  const body=JSON.parse(String(init?.body)),payload=JSON.parse(body.contents[0].parts[0].text),properties=body.generationConfig.responseJsonSchema.properties;
  const stage=properties.visualTokens?payload.mode==='planning-repair'?'planning-repair':'planning':!properties.app?'analysis':payload.mode==='review'?'review':payload.mode==='validation-repair'?'repair':'draft';
  console.info('[Flowspace public-fixture probe]',JSON.stringify({event:'stage_started',stage}));
  const response=await nativeFetch(url,init);
  const record:Record<string,unknown>={stage,status:response.status,requestedNames:payload.promptAnalysis?.screens,requiredScreens:payload.designPlan?.requiredScreens??payload.requiredScreens,approvedScreens:payload.designPlan?.screens?.map((s:any)=>({id:s.id,name:s.name})),repairScope:payload.repairScope,validation:payload.validation};
  if(response.ok)try{
    const parsed=parseGeminiJson(extractGeminiText(await response.clone().json()),stage) as any;
    record.outputScreens=(parsed.app?.screens??parsed.screens)?.map((s:any)=>typeof s==='string'?s:{id:s.id,name:s.name});
  }catch{/* The actual route retains parsing/validation authority. */}
  stages.push(record);return response;
}) as typeof fetch;
const route=designRoute(process.env),server=createServer((req,res)=>void route(req,res,()=>res.end()));
try{
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const response=await nativeFetch(`http://127.0.0.1:${(server.address() as any).port}/api/design`,{method:'POST',body:JSON.stringify({mode:'generate',productType:'website',prompt}),signal:AbortSignal.timeout(geminiConfig(process.env).timeoutMs+30000)});
  const data=await response.json();
  const report={fixture:'Flowspace public prompt supplied by the user',model:geminiConfig(process.env).model,status:response.status,code:data.code,stage:data.stage,error:data.error,missingScreens:data.missingScreens,resultScreens:data.app?.screens?.map((s:any)=>({id:s.id,name:s.name})),stages};
  await mkdir('artifacts/screen-requirements',{recursive:true});
  await writeFile(`artifacts/screen-requirements/flowspace-${Date.now()}.json`,JSON.stringify(report,null,2));
  console.info(JSON.stringify(report,null,2));if(!response.ok)process.exitCode=1;
}finally{globalThis.fetch=nativeFetch;await new Promise<void>(resolve=>server.close(()=>resolve()));}
