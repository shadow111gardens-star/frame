// Manual, single-request diagnostic. Never imported by the app or test runner.
import {loadEnv} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {responseJsonSchema} from '../shared/design';
import {buildDesignInstructions} from '../server/designInstructions';
import {readGoogleError,requestRedactions} from '../server/geminiDiagnostics';

if(!process.argv.includes('--live-once'))throw new Error('Explicit --live-once is required. Sends exactly one request, without retries.');
const env={...loadEnv('development',process.cwd(),''),...process.env};
const key=env.GEMINI_API_KEY,model=env.GEMINI_MODEL;
if(!key||model!=='gemini-3.8-flash')throw new Error('Expected the configured Gemini credential and gemini-3.8-flash. No request sent.');
const body={systemInstruction:{parts:[{text:buildDesignInstructions('mobile_app','generate')}]},contents:[{role:'user',parts:[{text:'Return one small editable mobile app screen using the supplied schema.'}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema,maxOutputTokens:256}};
const started=Date.now();
const result:Record<string,unknown>={model,stage:'draft-schema-diagnostic',originalRecordedFailureStage:'draft',attempt:1,requestConfiguration:{responseMimeType:'application/json',schemaBytes:Buffer.byteLength(JSON.stringify(responseJsonSchema)),maxOutputTokens:256,contentsCount:1,systemInstructionPresent:true},live:true};
try{
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
 result.httpStatus=response.status;
 if(!response.ok)Object.assign(result,await readGoogleError(response,requestRedactions(body,key)));
 else{const data=await response.json() as any;result.finishReason=['STOP','MAX_TOKENS','SAFETY'].includes(data.candidates?.[0]?.finishReason)?data.candidates[0].finishReason:'other';result.outputTokens=typeof data.usageMetadata?.candidatesTokenCount==='number'?data.usageMetadata.candidatesTokenCount:undefined;}
}catch{result.transportFailure=true;}
result.elapsedMs=Date.now()-started;
await mkdir('artifacts/gemini-400',{recursive:true});
await writeFile('artifacts/gemini-400/diagnostic.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
