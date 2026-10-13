import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {pricingConfig,requestCost} from '../server/generationCost';
import {summarizeCost} from '../shared/generationCost';
import {localDesignRepair} from '../server/localDesignRepair';
import {materialRenderedDefects} from '../shared/materialDefects';
import {GenerationReplay} from '../server/generationReplay';
import {designRoute} from '../server/gemini';
import {fixture} from './fixture';
import {planFixture} from './planFixture';
import {specificationFixture} from './designMdFixture';
import {repairRequest} from '../server/repairRequest';
import {DesignValidationError} from '../server/designDiagnostics';
import {requestRedactions,sanitizeGoogleError} from '../server/geminiDiagnostics';
import {generateGeminiText} from '../server/geminiResponse';
import {requestDesign,DesignRequestError} from '../src/design/api';

test('measured usage includes thinking, repair cost, failure tokens and explicit model pricing',()=>{
 const pricing=pricingConfig({},'gemini-3.1-flash-lite');
 const response={usageMetadata:{promptTokenCount:1000,candidatesTokenCount:200,thoughtsTokenCount:50,totalTokenCount:1250},candidates:[{finishReason:'MAX_TOKENS'}]};
 const row=requestCost({},response,'draft','gemini-3.1-flash-lite',200,20,pricing);
 assert.equal(row.usageSource,'provider');assert.equal(row.estimatedInputTokens,null);assert.equal(row.outcome,'failed');assert.equal(row.estimatedUsd,.000625);
 const repair={...row,repair:true,stage:'draft-repair'};const total=summarizeCost([row,repair],pricing);assert.equal(total.requestCount,2);assert.equal(total.thinkingTokens,100);assert.equal(total.estimatedUsd,.00125);assert.equal(total.repairEstimatedUsd,.000625);
 const unknown=requestCost({contents:'private prompt'},null,'draft','model',null,3);assert.equal(unknown.inputTokens,null);assert.equal(unknown.usageSource,'unavailable');assert.equal(unknown.estimatedUsd,null);assert.ok(!JSON.stringify(unknown).includes('private prompt'));
 assert.equal(summarizeCost([row,unknown],pricing).estimatedUsd,null);
 assert.equal(pricingConfig({GEMINI_PRICING_MODEL:'wrong-model',GEMINI_INPUT_USD_PER_MILLION:'0'},'unknown-model').inputPerMillion,null);
 assert.equal(requestCost({}, {...response,usageMetadata:{...response.usageMetadata,cachedContentTokenCount:500}},'draft','model',200,3,pricing).estimatedUsd,null,'Do not silently price cached usage as ordinary input');
 assert.equal(requestCost({}, {usageMetadata:{promptTokenCount:10,candidatesTokenCount:5,totalTokenCount:15}},'draft','model',200,1,pricing).thinkingSource,'inferred-zero');
 assert.equal(requestCost({}, {usageMetadata:{promptTokenCount:10,candidatesTokenCount:5}},'draft','model',200,1,pricing).estimatedUsd,null,'Unknown thinking usage cannot be priced as zero');
 assert.equal(pricingConfig({GEMINI_API_KEY:'same-secret'},'same-secret').model,'[redacted]');
 const secrets={originalPrompt:'private exact prompt',designMd:'private specification'};
 const safe=sanitizeGoogleError({error:{message:'Rejected private exact prompt and private specification and secret-key'}},requestRedactions({contents:[{parts:[{text:JSON.stringify(secrets)}]}]},'secret-key'));
 for(const secret of [...Object.values(secrets),'secret-key'])assert.ok(!JSON.stringify(safe).includes(secret));
});
test('a telemetry callback failure cannot turn a successful provider response into a paid retry',async()=>{
 let calls=0;const warnings:unknown[][]=[],warn=console.warn;console.warn=(...args)=>warnings.push(args);
 try{
  const result=await generateGeminiText({}, {key:'synthetic-key',model:'gemini-3.1-flash-lite',deadline:Date.now()+10000,onUsage:()=>{throw new Error('private telemetry error');}},{log:()=>{},fetch:(async()=>{calls++;return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'successful result'}]}}]});}) as typeof fetch});
  assert.equal(result,'successful result');assert.equal(calls,1);assert.ok(JSON.stringify(warnings).includes('telemetry_failure'));assert.ok(!JSON.stringify(warnings).includes('private telemetry error'));
 }finally{console.warn=warn;}
});
test('client persistence failure cancels the stream while retaining measured cost for the failed run',async()=>{
 const pricing=pricingConfig({},'gemini-3.1-flash-lite'),cost=summarizeCost([requestCost({}, {usageMetadata:{promptTokenCount:10,candidatesTokenCount:5,totalTokenCount:15}},'specification','gemini-3.1-flash-lite',200,1,pricing)],pricing);
 let cancelled=false;
 const stream=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new TextEncoder().encode(JSON.stringify({event:'cost',cost})+'\n'));},cancel(){cancelled=true;}});
 await assert.rejects(requestDesign('original',undefined,undefined,undefined,undefined,undefined,{idToken:'synthetic-token',onStage:()=>{},onCost:()=>{throw new Error('Persistence failed');},fetch:(async()=>new Response(stream,{headers:{'content-type':'application/x-ndjson'}})) as typeof fetch}), (error:unknown)=>error instanceof DesignRequestError&&error.cost?.requestCount===1);
 assert.equal(cancelled,true);
});

test('deterministic token/identity/navigation repairs do not invent requirements or modify unrelated components',()=>{
 const app=fixture(),plan=planFixture(structuredClone(app));plan.journey={mode:'interactive',entryScreens:['Home'],edges:[{from:'Home',to:'Profile',action:'Open profile'}],rationale:'Required link'};
 app.designSystem.colors.accent='#123456';app.screens[0].components[2].targetScreenId='Profile';const originalText=app.screens[0].components[1].text;
 const fixed=localDesignRepair({message:'Candidate',app},plan) as any;
 assert.equal(fixed.app.designSystem.colors.accent,plan.designSystem.colors.accent);assert.equal(fixed.app.screens[0].components[2].targetScreenId,'profile');assert.equal(fixed.app.screens[0].components[1].text,originalText);
 assert.equal(app.designSystem.colors.accent,'#123456','Input remains unchanged');
 app.screens[0].components[2].type='Divider';assert.equal((localDesignRepair({message:'Candidate',app},plan) as any).app.screens[0].components[2].targetScreenId,'Profile');
 assert.deepEqual(materialRenderedDefects([{screenId:'home',componentIds:[],code:'empty-area',severity:'warning',detail:'Editorial whitespace'},{screenId:'home',componentIds:[],code:'font',severity:'warning',detail:'Font loading'}]),[]);
 assert.equal(materialRenderedDefects([{screenId:'home',componentIds:['title'],code:'text-clipping',severity:'error',detail:'Actual clipping'}]).length,1);
});

test('targeted repair request omits valid unrelated screens and merges only the authorized patch',()=>{
 const app=fixture(),plan=planFixture(app),scope={screenIds:['home'],componentIds:['button'],designSystem:false};
 const request=repairRequest({message:'Original',app},scope,new DesignValidationError('Bounds','DESIGN_CONSISTENCY',{reason:'BOUNDS'}),'Approved Markdown',plan,'private original prompt');
 const context=JSON.parse(request.body.contents[0].parts[0].text);
 assert.equal(context.candidate.length,1);assert.equal(context.candidate[0].id,'home');assert.ok(!JSON.stringify(context).includes('Alex'));assert.equal(context.originalPrompt,undefined);
 const restored=request.restore({message:'Fixed',screens:[app.screens[0]]}) as any;assert.deepEqual(restored.app.screens.find((s:any)=>s.id==='profile'),app.screens[1]);
});

test('replay ownership, in-flight deduplication and changed-prompt conflicts are separate from scheduling',async()=>{
 const cache=new GenerationReplay(),input={generationRunId:'run',idempotencyKey:'run',projectId:'project',mode:'generate',prompt:'A'};
 const first=cache.reserve('uid-a',input)!;assert.ok(first.complete);
 const duplicate=cache.reserve('uid-a',input)!;assert.ok(duplicate.replay);assert.ok(cache.reserve('uid-a',{...input,prompt:'B'})?.conflict);
 const other=cache.reserve('uid-b',input)!;assert.ok(other.complete);
 first.complete!(200,{app:'A'});assert.deepEqual(await duplicate.replay,{status:200,data:{app:'A'}});other.complete!(200,{app:'B'});
});

test('normal route makes exactly two requests; duplicate POST reuses them and truncated usage remains visible',async()=>{
 const native=fetch,app=fixture();let calls=0,truncated=false;const stages:string[]=[];
 globalThis.fetch=(async(url,init)=>{
  if(!String(url).startsWith('https://generativelanguage.googleapis.com'))return native(url,init);
  calls++;const body=JSON.parse(String(init?.body)),payload=JSON.parse(body.contents[0].parts[0].text),spec=Boolean(body.generationConfig.responseJsonSchema.properties.plan);stages.push(spec?'specification':'draft');
  assert.equal(body.generationConfig.maxOutputTokens,spec?10000:payload.qualityReview?20000:24000);
  if(payload.qualityReview){assert.deepEqual(payload.currentDesign.screens.map((screen:any)=>screen.id),['home']);assert.deepEqual(payload.knownScreens.map((screen:any)=>screen.id),['home','profile']);}
  const output=spec?specificationFixture(planFixture(app),payload.originalPrompt):{message:'Generated',app};
  return Response.json({usageMetadata:{promptTokenCount:1000,candidatesTokenCount:500,thoughtsTokenCount:10,totalTokenCount:1510},candidates:[{finishReason:truncated?'MAX_TOKENS':'STOP',content:{parts:[{text:JSON.stringify(output)}]}}]});
 }) as typeof fetch;
 const route=designRoute({GEMINI_API_KEY:'synthetic-private-key'},async()=> 'uid-a'),server=createServer((req,res)=>void route(req,res,()=>res.end()));
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${(server.address() as any).port}/api/design`;
 const post=(id:string,prompt='Create exactly two mobile screens.')=>native(url,{method:'POST',body:JSON.stringify({mode:'generate',prompt,generationRunId:id,idempotencyKey:id,projectId:'project'})});
 try{
  const responses=await Promise.all([post('run-1'),post('run-1')]);for(const response of responses)assert.equal(response.status,200);
  assert.equal(calls,2);assert.deepEqual(stages,['specification','draft']);const data=await responses[0].json();assert.equal(data.cost.requestCount,2);assert.equal(data.cost.repairRequestCount,0);assert.equal(data.cost.inputTokens,2000);assert.ok(data.designMd);
  assert.equal((await post('run-1','Different prompt')).status,409);assert.equal(calls,2);
  const edit=await native(url,{method:'POST',body:JSON.stringify({mode:'modify',prompt:'Refine this button',app,generationRunId:'edit-run',idempotencyKey:'edit-run',generationArtifact:data.generationArtifact})});
  const edited=await edit.json();assert.equal(edit.status,200);assert.equal(edited.cost.requestCount,1,'New edit does not charge the previous generation again');assert.equal(edited.designMd,data.designMd);
  assert.equal(calls,3);
  const rendered=await native(url,{method:'POST',body:JSON.stringify({mode:'modify',prompt:'Original intent',app,generationRunId:'run-1',idempotencyKey:'run-1',generationArtifact:data.generationArtifact,qualityReview:{issues:[{screenId:'home',componentIds:['button'],code:'contrast',severity:'warning',detail:'Measured 1.2:1 contrast'}],screenshots:[],screenIds:['home']}})});
  const corrected=await rendered.json();assert.equal(rendered.status,200);assert.equal(corrected.cost.requestCount,3);assert.equal(corrected.cost.repairRequestCount,1);assert.equal(corrected.cost.inputTokens,3000);assert.equal(calls,4);
  truncated=true;const failed=await post('run-2'),error=await failed.json();assert.equal(failed.status,502);assert.equal(error.code,'TRUNCATED');assert.equal(error.cost.requestCount,1);assert.equal(error.cost.outputTokens,500);assert.equal(error.app,undefined);assert.equal(calls,5);
  assert.ok(!JSON.stringify(error).includes('synthetic-private-key'));
 }finally{globalThis.fetch=native;server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
