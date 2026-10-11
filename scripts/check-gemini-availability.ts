import {loadEnv} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {geminiConfig} from '../server/gemini';
import {generateGeminiText,GeminiError} from '../server/geminiResponse';
import {analyzeDesignPrompt} from '../server/designKnowledge/analysis';
import {readGoogleError} from '../server/geminiDiagnostics';
const mode=process.env.FRAME_DIAGNOSTIC_MODE??'development';
const env={...loadEnv(mode,process.cwd(),''),...process.env};
const {key,model,timeoutMs,attemptTimeoutMs}=geminiConfig(env);
const report:any={checkedAt:new Date().toISOString(),runtime:{mode,model,keyPresent:!!key,timeoutMs,attemptTimeoutMs,processModelOverride:!!process.env.GEMINI_MODEL},diagnostics:[]};
if(!key||!model)throw new Error('Configure GEMINI_API_KEY and GEMINI_MODEL before running this diagnostic.');
try{
 const started=Date.now();const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`,{headers:{'x-goog-api-key':key},signal:AbortSignal.timeout(20000)});
 report.modelCheck={httpStatus:response.status,elapsedMs:Date.now()-started};
 if(response.ok){const data=await response.json();report.modelCheck.name=data.name;report.modelCheck.supportedGenerationMethods=data.supportedGenerationMethods;}
 else Object.assign(report.modelCheck,await readGoogleError(response,[key]));
 if(response.ok){
  const result=await analyzeDesignPrompt('Create a simple mobile task manager with a Home screen.',body=>generateGeminiText(body,{key,model,deadline:Date.now()+60000,attemptTimeoutMs:20000,stage:'analysis'},{log:details=>{report.diagnostics.push(details);console.info('[FRAME live probe]',JSON.stringify(details));}}),'mobile_app');
  report.generationCheck={stage:'analysis',success:true,productType:result.productType};
 }
}catch(e){report.generationCheck=e instanceof GeminiError?{success:false,stage:e.stage??'analysis',code:e.code,upstreamStatus:e.upstreamStatus,message:e.message}:{success:false,code:'PROBE_TRANSPORT',message:'The live diagnostic could not complete its network request.'};}
await mkdir('artifacts/gemini-availability',{recursive:true});await writeFile('artifacts/gemini-availability/latest.json',JSON.stringify(report,null,2));console.info(JSON.stringify(report,null,2));
