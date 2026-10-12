import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeGoogleError,requestRedactions,readGoogleError,googleRequestSummary} from '../server/geminiDiagnostics';
import {generateGeminiText,GeminiError} from '../server/geminiResponse';
import {responseJsonSchema} from '../shared/design';

test('observed draft HTTP 400 preserves actual Google error and safe request evidence without retries',async()=>{
 const key='synthetic-credential',prompt='sensitive user instructions';
 const body={systemInstruction:{parts:[{text:'sensitive system instructions'}]},contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema}};
 const logs:any[]=[];let calls=0;
 await assert.rejects(generateGeminiText(body,{key,model:'gemini-3.1-flash-lite',stage:'draft',deadline:Date.now()+10000},{log:d=>logs.push(d),fetch:async(url,init)=>{
  calls++;assert.equal(String(url),'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent');
  assert.deepEqual(JSON.parse(String(init?.body)),body);
  return Response.json({error:{code:400,status:'INVALID_ARGUMENT',message:'Request contains an invalid argument.'}},{status:400});
 }}),(e:unknown)=>e instanceof GeminiError&&e.upstreamStatus===400&&e.stage==='draft'&&!e.retryable);
 assert.equal(calls,1);assert.equal(logs.length,1);const event=logs[0];
 assert.equal(event.googleCode,400);assert.equal(event.googleStatus,'INVALID_ARGUMENT');assert.equal(event.googleMessage,'Request contains an invalid argument.');assert.equal(event.model,'gemini-3.1-flash-lite');assert.equal(event.stage,'draft');assert.equal(event.attempt,1);
 assert.deepEqual(event.requestConfiguration,googleRequestSummary(body));assert.equal(event.requestConfiguration.structuredOutput,true);assert.equal(event.requestConfiguration.schemaBytes,Buffer.byteLength(JSON.stringify(responseJsonSchema)));
 assert.match(event.requestConfiguration.schemaSha256,/^[a-f0-9]{64}$/);assert.ok(event.elapsedMs>=0);
 for(const value of [key,prompt,'sensitive system instructions','x-goog-api-key'])assert.ok(!JSON.stringify(logs).includes(value));
});
test('Google diagnostics preserve actual error details while removing keys and prompts before truncation',async()=>{
 const key='AIza-private-key-123',prompt='Private portfolio\nwith personal data',body={contents:[{parts:[{text:JSON.stringify({prompt})}]}]};
 const redactions=requestRedactions(body,key);
 const data=sanitizeGoogleError({error:{code:503,status:'UNAVAILABLE',message:`High demand. Key ${key}. Prompt ${prompt}. Escaped ${JSON.stringify(prompt).slice(1,-1)}. authorization=secret Bearer token https://private.test?key=secret`}},redactions);
 const text=JSON.stringify(data);assert.equal(data.googleCode,503);assert.equal(data.googleStatus,'UNAVAILABLE');assert.ok(text.includes('High demand'));for(const secret of [key,'Private portfolio','personal data','Bearer token','https://private','authorization=secret'])assert.ok(!text.includes(secret),secret);
 assert.deepEqual(await readGoogleError(new Response('not JSON'),redactions),{});assert.deepEqual(await readGoogleError(new Response('x'.repeat(66000)),redactions),{});
});
test('503 error diagnostics capture stage, attempt, elapsed time and sanitized original Google error',async()=>{
 const logs:any[]=[];let calls=0;
 await assert.rejects(generateGeminiText({}, {key:'secret',model:'configured-model',stage:'planning',deadline:Date.now()+10000},{log:d=>logs.push(d),sleep:async()=>{},fetch:(async()=>{calls++;return new Response(JSON.stringify({error:{code:503,status:'UNAVAILABLE',message:'This model is currently experiencing high demand. secret'}}),{status:503});}) as typeof fetch}),(e:unknown)=>e instanceof GeminiError&&e.stage==='planning'&&e.upstreamStatus===503&&e.message.includes('temporarily unavailable'));
 assert.equal(calls,3);const failures=logs.filter(d=>d.event==='http_failure');assert.deepEqual(failures.map(d=>d.attempt),[1,2,3]);assert.ok(failures.every(d=>d.stage==='planning'&&d.googleStatus==='UNAVAILABLE'&&d.googleCode===503&&d.elapsedMs>=0));assert.ok(!JSON.stringify(logs).includes('secret'));
});
test('Retry-After is respected within the deadline; impossible waits retain the original failure',async()=>{
 const success=()=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:'success'}]}}]}));
 for(const header of ['60',new Date(Date.now()+60000).toUTCString()]){
  let calls=0;const waits:number[]=[];
  assert.equal(await generateGeminiText({}, {key:'secret',model:'configured-model',deadline:Date.now()+120000},{log:()=>{},random:()=>0,sleep:async ms=>{waits.push(ms);},fetch:(async()=>++calls===1?new Response(JSON.stringify({error:{code:429,status:'RESOURCE_EXHAUSTED',message:'Rate limit'}}),{status:429,headers:{'Retry-After':header}}):success()) as typeof fetch}),'success');assert.equal(calls,2);assert.ok(waits[0]>=58000&&waits[0]<=60000);
 }
 for(const status of [429,503]){
  let calls=0;await assert.rejects(generateGeminiText({}, {key:'secret',model:'configured-model',deadline:Date.now()+1000},{log:()=>{},sleep:async()=>{throw new Error('Cannot wait within budget.');},fetch:(async()=>{calls++;return new Response('{}',{status,headers:{'Retry-After':'60'}});}) as typeof fetch}),(e:unknown)=>e instanceof GeminiError&&e.code===(status===429?'RATE_LIMIT':'UPSTREAM')&&e.upstreamStatus===status&&e.retryAfterMs===60000);assert.equal(calls,1);
 }
});

test('exhausted rate limits still report the last Retry-After guidance',async()=>{
 let calls=0;const waits:number[]=[];
 await assert.rejects(generateGeminiText({}, {key:'secret',model:'configured-model',stage:'draft',deadline:Date.now()+10000},{log:()=>{},random:()=>0,sleep:async ms=>{waits.push(ms);},fetch:(async()=>{calls++;return new Response('{}',{status:429,headers:{'Retry-After':'2'}});}) as typeof fetch}),(e:unknown)=>e instanceof GeminiError&&e.code==='RATE_LIMIT'&&e.stage==='draft'&&e.retryAfterMs===2000&&e.message.includes('2 seconds'));assert.equal(calls,3);assert.deepEqual(waits,[2000,2000]);
});
