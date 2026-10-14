import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GeminiError,extractGeminiText,generateGeminiText,parseGeminiJson} from '../server/geminiResponse';
import {analyzeDesignPrompt,promptAnalysisJsonSchema} from '../server/designKnowledge/analysis';

const valid={productType:'website',audience:'Visitors',theme:'unspecified',preferences:{style:[],colors:[],typography:[],branding:[]},goals:[],screens:[],sections:[]};
const envelope=(text:string)=>({candidates:[{finishReason:'STOP',content:{parts:[{text}]}}]});
const config=()=>({key:'secret-not-for-logs',model:'configured-model',deadline:Date.now()+10000});

test('regression: request schema enforces the validator bounds that caused live analysis rejection',async()=>{
  const schema=promptAnalysisJsonSchema as any;
  assert.equal(schema.properties.styleHints,undefined);
  assert.equal(schema.properties.uxNeeds,undefined);assert.equal(schema.properties.category,undefined);
  for(const field of ['goals','screens','sections'])assert.equal(schema.properties[field].maxItems,20);
  for(const field of ['style','colors','typography','branding'])assert.equal(schema.properties.preferences.properties[field].maxItems,20);
  assert.equal(schema.properties.audience.description,'At most 500 characters.');
  assert.ok(!JSON.stringify(schema).includes('"default"'));
  let calls=0;
  await assert.rejects(analyzeDesignPrompt('Create portfolio',async()=>{calls++;return JSON.stringify({...valid,goals:Array(21).fill('Goal')});}),(error:unknown)=>error instanceof GeminiError && error.code==='ANALYSIS_SCHEMA' && !error.retryable && /goals \(too_big\)/.test(error.message));
  assert.equal(calls,1); // Permanent schema errors never trigger another model request.
  assert.equal((await analyzeDesignPrompt('Create portfolio',async()=>JSON.stringify(valid))).productType,'website');
});

test('JSON parsing accepts only complete JSON or whole fences and keeps schema validation strict',async()=>{
  for(const text of [JSON.stringify(valid),`\uFEFF  ${JSON.stringify(valid)}  `,`\n\`\`\`json\n${JSON.stringify(valid)}\n\`\`\`\n`])assert.equal((await analyzeDesignPrompt('Portfolio',async()=>text)).productType,'website');
  for(const text of ['', '   ', '{bad json}', 'Here is the result: '+JSON.stringify(valid), '```json\n{"productType":"website"}', JSON.stringify(valid)+JSON.stringify(valid)])await assert.rejects(analyzeDesignPrompt('Portfolio',async()=>text),GeminiError);
  for(const data of [{...valid,productType:'desktop'},{...valid,theme:'unknown'},{...valid,preferences:{style:[]}},{...valid,goals:Array(21).fill('Goal')},{analysis:valid},null,[]])await assert.rejects(analyzeDesignPrompt('Portfolio',async()=>JSON.stringify(data)),(e:unknown)=>e instanceof GeminiError && e.code==='ANALYSIS_SCHEMA');
  assert.throws(()=>parseGeminiJson('{"a":1,}','analysis'),/malformed JSON/);
});

test('API envelope handling separates final JSON from thought parts and rejects incomplete responses',()=>{
  const data=envelope('{"ok":true}');data.candidates[0].content.parts=[{text:'private thought',thought:true} as any,{text:'{"ok":'},{text:'true}'}];
  assert.equal(extractGeminiText(data),'{"ok":true}');
  for(const bad of [null,{}, {candidates:[]},{candidates:[null]}, {candidates:[{finishReason:'STOP'}]},envelope(''),{candidates:[{finishReason:'STOP',content:{parts:[{text:10}]}}]},{candidates:[{finishReason:'STOP',content:{parts:[{text:'thought',thought:true}]}}]}])assert.throws(()=>extractGeminiText(bad),GeminiError);
  assert.throws(()=>extractGeminiText({promptFeedback:{blockReason:'SAFETY'},candidates:[]}),/blocked/);
  assert.throws(()=>extractGeminiText({candidates:[{finishReason:'MAX_TOKENS'}]}),/truncated/);
  assert.throws(()=>extractGeminiText({candidates:[{finishReason:'SAFETY'}]}),/did not complete/);
});

test('transient transport/status failures retry at most twice; permanent or malformed responses never retry',async()=>{
  for(const status of [408,429,500,502,503,504]) {
    let calls=0;const waits:number[]=[];
    const fetcher=(async()=>++calls===1?new Response('upstream',{status}):new Response(JSON.stringify(envelope('valid text')))) as typeof fetch;
    assert.equal(await generateGeminiText({},config(),{fetch:fetcher,random:()=>0,sleep:async ms=>{waits.push(ms);}}),'valid text');
    assert.equal(calls,2);assert.deepEqual(waits,[500]);
  }
  for(const status of [400,401,403,404,422,501,505]) {
    let calls=0;
    await assert.rejects(generateGeminiText({},config(),{fetch:(async()=>{calls++;return new Response('secret-not-for-logs',{status});}) as typeof fetch,sleep:async()=>{throw new Error('Should not retry');}}),(e:unknown)=>e instanceof GeminiError && !e.retryable && e.code==='CONFIGURATION' && !e.message.includes('secret-not-for-logs'));
    assert.equal(calls,1);
  }
  let calls=0;
  await assert.rejects(generateGeminiText({},config(),{fetch:(async()=>{calls++;throw new TypeError('network contains secret-not-for-logs');}) as typeof fetch,sleep:async()=>{}}),(e:unknown)=>e instanceof GeminiError && e.code==='NETWORK' && !e.message.includes('secret-not-for-logs'));assert.equal(calls,3);
  calls=0;await assert.rejects(generateGeminiText({},config(),{fetch:(async()=>{calls++;return new Response('invalid API JSON');}) as typeof fetch}),(e:unknown)=>e instanceof GeminiError&&e.code==='INVALID_ENVELOPE');assert.equal(calls,1);
  calls=0;await assert.rejects(generateGeminiText({},config(),{fetch:(async()=>{calls++;return new Response('{}',{status:429,headers:{'Retry-After':'60'}});}) as typeof fetch}),(e:unknown)=>e instanceof GeminiError&&e.status===429);assert.equal(calls,1);
});

test('debug diagnostics report schema paths without generated content, prompts or secrets',async()=>{
  const previous=process.env.GEMINI_DEBUG,log=console.warn;process.env.GEMINI_DEBUG='1';const logs:unknown[][]=[];console.warn=(...args)=>{logs.push(args);};
  try {
    await assert.rejects(analyzeDesignPrompt('secret-user-prompt',async()=>JSON.stringify({...valid,audience:'secret-generated-text',goals:Array(21).fill('Goal')})));
    const text=JSON.stringify(logs);assert.ok(text.includes('goals'));assert.ok(text.includes('too_big'));assert.ok(!text.includes('secret-user-prompt'));assert.ok(!text.includes('secret-generated-text'));
  } finally {console.warn=log;if(previous===undefined)delete process.env.GEMINI_DEBUG;else process.env.GEMINI_DEBUG=previous;}
});


test('503 uses two bounded exponential retries, fresh signals and sanitized diagnostics',async()=>{
 const logs:unknown[]=[],waits:number[]=[],signals:AbortSignal[]=[];let calls=0;
 const text=await generateGeminiText({},config(),{random:()=>0.5,log:d=>logs.push(d),sleep:async ms=>{waits.push(ms);},fetch:(async(_url,init)=>{
  signals.push(init!.signal as AbortSignal);assert.equal(init!.signal!.aborted,false);
  return ++calls<3?new Response('secret-not-for-logs',{status:503}):new Response(JSON.stringify(envelope('success')));
 }) as typeof fetch});
 assert.equal(text,'success');assert.equal(calls,3);assert.deepEqual(waits,[625,1250]);assert.equal(new Set(signals).size,3);assert.ok(signals.every(s=>!s.aborted));
 const data=JSON.stringify(logs);assert.ok(data.includes('503'));assert.ok(data.includes('UNAVAILABLE'));assert.ok(!data.includes('secret-not-for-logs'));assert.ok(data.includes('configured-model'),'Nonsecret model routing is part of the requested diagnostics');
 calls=0;await assert.rejects(generateGeminiText({},config(),{log:()=>{},sleep:async()=>{},fetch:(async()=>{calls++;return new Response('key and private prompt',{status:503});}) as typeof fetch}),(e:unknown)=>e instanceof GeminiError&&e.code==='UPSTREAM'&&e.upstreamStatus===503&&e.message.includes('3 attempts'));assert.equal(calls,3);
});

test('intentional cancellation stops fetch/backoff; timeouts are distinct and retries get fresh attempt clocks',async()=>{
 const blocked=(async(_url,init)=>new Promise<Response>((_resolve,reject)=>{const s=init!.signal!;if(s.aborted)reject(s.reason);else s.addEventListener('abort',()=>reject(s.reason),{once:true});})) as typeof fetch;
 const preCancelled=new AbortController();preCancelled.abort();let preCalls=0;await assert.rejects(generateGeminiText({}, {...config(),signal:preCancelled.signal},{log:()=>{},fetch:(async()=>{preCalls++;return new Response();}) as typeof fetch}),(e:unknown)=>e instanceof GeminiError&&e.code==='CANCELLED');assert.equal(preCalls,0);
 const caller=new AbortController();let calls=0;
 const task=generateGeminiText({}, {...config(),signal:caller.signal},{log:()=>{},fetch:(async(...args)=>{calls++;return blocked(...args);}) as typeof fetch});caller.abort(new DOMException('User cancelled.','AbortError'));
 await assert.rejects(task,(e:unknown)=>e instanceof GeminiError&&e.code==='CANCELLED'&&!e.retryable);assert.equal(calls,1);
 const backoff=new AbortController();calls=0;
 await assert.rejects(generateGeminiText({}, {...config(),signal:backoff.signal},{log:()=>{},fetch:(async()=>{calls++;backoff.abort();return new Response('',{status:503});}) as typeof fetch}),(e:unknown)=>e instanceof GeminiError&&e.code==='CANCELLED');assert.equal(calls,1);
 // Cancellation during the actual delay, after a 503, never starts another attempt.
 const sleeping=new AbortController();calls=0;
 const duringWait=generateGeminiText({}, {...config(),signal:sleeping.signal},{log:d=>{if(d.event==='retry')setTimeout(()=>sleeping.abort(),5);},fetch:(async()=>{calls++;return new Response('',{status:503});}) as typeof fetch});
 await assert.rejects(duringWait,(e:unknown)=>e instanceof GeminiError&&e.code==='CANCELLED');assert.equal(calls,1);
 calls=0;await assert.rejects(generateGeminiText({}, {...config(),deadline:Date.now()+15},{log:()=>{},fetch:(async(...args)=>{calls++;return blocked(...args);}) as typeof fetch}),(e:unknown)=>e instanceof GeminiError&&e.code==='TIMEOUT'&&e.status===504);assert.equal(calls,1);
 calls=0;const signals:AbortSignal[]=[];
 const success=await generateGeminiText({}, {...config(),attemptTimeoutMs:5},{log:()=>{},sleep:async()=>{},fetch:(async(_url,init)=>{calls++;signals.push(init!.signal as AbortSignal);if(calls<3)return blocked(_url,init);assert.equal(init!.signal!.aborted,false);return new Response(JSON.stringify(envelope('fresh attempt')));}) as typeof fetch});assert.equal(success,'fresh attempt');assert.equal(calls,3);assert.equal(signals[0].aborted,true);assert.equal(signals[2].aborted,false);
});

test('response disposal AbortError does not mask the original 503',async()=>{
 let calls=0;
 await assert.rejects(generateGeminiText({},config(),{log:()=>{},sleep:async()=>{},fetch:(async()=>{calls++;return {ok:false,status:503,headers:new Headers(),body:{cancel:async()=>{throw new DOMException('signal is aborted without reason','AbortError');}}} as unknown as Response;}) as typeof fetch}),(e:unknown)=>e instanceof GeminiError&&e.code==='UPSTREAM'&&e.upstreamStatus===503&&!e.message.includes('aborted'));assert.equal(calls,3);
});


test('response-body timeout has the same bounded retry policy as header timeout',async()=>{
 let calls=0;
 await assert.rejects(generateGeminiText({}, {...config(),attemptTimeoutMs:5},{log:()=>{},sleep:async()=>{},fetch:(async(_url,init)=>{calls++;return {ok:true,status:200,headers:new Headers(),json:()=>new Promise((_resolve,reject)=>init!.signal!.addEventListener('abort',()=>reject(init!.signal!.reason),{once:true}))} as Response;}) as typeof fetch}),(e:unknown)=>e instanceof GeminiError&&e.code==='TIMEOUT'&&e.status===504);assert.equal(calls,3);
});
