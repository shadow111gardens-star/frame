import {requestCost} from './generationCost';
import type {GenerationCost,RequestCost} from '../shared/generationCost';
import {readGoogleError,requestRedactions,googleRequestSummary,type GoogleErrorDetails} from './geminiDiagnostics';
/** Errors expose only controlled messages/metadata, never upstream text or keys. */
export class GeminiError extends Error {
  retryAfterMs?:number;
  constructor(message:string,public code:string,public retryable=false,public status=502,public upstreamStatus?:number,public stage?:string) {super(message);this.name='GeminiError';}
}

export function parseGeminiJson(text:string,stage:string):unknown {
  let json=text.replace(/^\uFEFF/,'').trim();
  if(!json)throw new GeminiError(`Gemini returned an empty ${stage} response. Your prompt and existing design are preserved.`, 'EMPTY_RESPONSE');
  // Accept a complete JSON Markdown wrapper, never extract fragments or repair JSON.
  const fenced=json.match(/^```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```$/i);
  if(fenced)json=fenced[1].trim();
  try {return JSON.parse(json);} catch {throw new GeminiError(`Gemini returned malformed JSON for ${stage}. Your prompt and existing design are preserved.`, 'MALFORMED_JSON');}
}

export function extractGeminiText(data:unknown):string {
  if(!data || typeof data!=='object')throw new GeminiError('Gemini returned an unexpected API response structure. Your prompt is preserved.','INVALID_ENVELOPE');
  const envelope=data as {candidates?:unknown;promptFeedback?:{blockReason?:unknown}};
  if(envelope.promptFeedback?.blockReason)throw new GeminiError('Gemini blocked this request. Review the prompt before submitting it again. Your existing design is unchanged.','BLOCKED');
  if(!Array.isArray(envelope.candidates) || !envelope.candidates.length)throw new GeminiError('Gemini returned no response candidates. Your prompt is preserved.','EMPTY_CANDIDATES');
  const candidate=envelope.candidates[0];
  if(!candidate || typeof candidate!=='object')throw new GeminiError('Gemini returned an unexpected candidate structure.','INVALID_ENVELOPE');
  if(candidate.finishReason==='MAX_TOKENS')throw new GeminiError('Gemini truncated its response at the output limit. Try reducing the requested scope. Your prompt and design are preserved.','TRUNCATED');
  if(candidate.finishReason!=='STOP')throw new GeminiError('Gemini did not complete the response. Review the prompt before submitting it again. Your existing design is unchanged.','INCOMPLETE');
  if(!Array.isArray(candidate.content?.parts))throw new GeminiError('Gemini returned no text parts in its response. Your prompt is preserved.','INVALID_ENVELOPE');
  const parts=candidate.content.parts.filter((p:unknown)=>p&&typeof p==='object' && !(p as {thought?:boolean}).thought);
  if(parts.some((p:{text?:unknown})=>p.text!==undefined && typeof p.text!=='string'))throw new GeminiError('Gemini returned a non-text response where JSON text was expected.','INVALID_ENVELOPE');
  const text=parts.map((p:{text?:string})=>p.text??'').join('');
  if(!text.trim())throw new GeminiError('Gemini returned an empty text response. Your prompt and existing design are preserved.','EMPTY_RESPONSE');
  return text;
}

/** Opt-in development diagnostics. Callers supply only counts and schema issue codes. */
export function analysisDiagnostic(details:{code:string;characters:number;issues?:{path:string;code:string}[]}) {
  if(process.env.NODE_ENV!=='production' && process.env.GEMINI_DEBUG==='1')console.warn('[FRAME Gemini analysis]',JSON.stringify(details));
}

export interface RequestDiagnostic {
  event:'http_success'|'http_failure'|'transport_failure'|'timeout'|'cancelled'|'retry'|'retry_skipped';
  stage:string;attempt:number;elapsedMs?:number;googleCode?:number;googleStatus?:string;googleMessage?:string;httpStatus?:number;upstreamStatus?:string;errorType?:string;retryable?:boolean;delayMs?:number;
  model?:string;requestConfiguration?:ReturnType<typeof googleRequestSummary>;
}
// Deliberately never accept raw exception messages, URLs, bodies, prompts or configuration.
function diagnostic(details:RequestDiagnostic){console.warn('[FRAME Gemini request]',JSON.stringify(details));}
function stopped(signal:AbortSignal|undefined,deadline:number):GeminiError|undefined {
  if(signal?.aborted&&signal.reason?.name==='TimeoutError')return new GeminiError('Gemini design generation timed out. Your prompt and existing design are preserved.','TIMEOUT',true,504);
  if(signal?.aborted)return new GeminiError('Design generation was cancelled. Your prompt and existing design are preserved.','CANCELLED',false,499);
  if(Date.now()>=deadline)return new GeminiError('Gemini design generation timed out. Your prompt and existing design are preserved.','TIMEOUT',true,504);
}
export function cancellationAwareDelay(ms:number,signal:AbortSignal):Promise<void>{
  return new Promise((resolve,reject)=>{
    if(signal.aborted){reject(signal.reason);return;}
    const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);};
    const abort=()=>{done();reject(signal.reason);};
    const timer=setTimeout(()=>{done();resolve();},ms);signal.addEventListener('abort',abort,{once:true});
  });
}

export async function generateGeminiText(body:unknown,config:{key:string;model:string;deadline:number;signal?:AbortSignal;attemptTimeoutMs?:number;stage?:string;maxAttempts?:number;pricing?:GenerationCost['pricing'];onUsage?:(usage:RequestCost)=>void},options:{fetch?:typeof fetch;sleep?:(ms:number)=>Promise<void>;random?:()=>number;log?:(details:RequestDiagnostic)=>void}={}):Promise<string> {
  const fetcher=options.fetch??fetch,random=options.random??Math.random;
  const stage=config.stage??'generation';let lastStatus:number|undefined;const startedAt=Date.now();
  const record=options.log??diagnostic;
  const model=/^[a-zA-Z0-9._-]{1,100}$/.test(config.model)&&config.model!==config.key?config.model:'[redacted]';
  const requestConfiguration=googleRequestSummary(body);
  const log=(details:RequestDiagnostic)=>record({...details,model,requestConfiguration,elapsedMs:Date.now()-startedAt});
  const redactions=requestRedactions(body,config.key);
  const maxAttempts=Math.max(1,Math.min(3,config.maxAttempts??3));
  for(let attempt=0;attempt<maxAttempts;attempt++) {
    const preflight=stopped(config.signal,config.deadline);if(preflight)throw preflight;
    const attemptController=new AbortController();
    const timeout=setTimeout(()=>attemptController.abort(new DOMException('Gemini attempt timed out.','TimeoutError')),Math.min(config.attemptTimeoutMs??180000,config.deadline-Date.now()));
    const signal=config.signal?AbortSignal.any([config.signal,attemptController.signal]):attemptController.signal;
    let failure:GeminiError|undefined,response:Response|undefined;const attemptStarted=Date.now();let usageRecorded=false;
    const recordUsage=(data?:unknown)=>{if(usageRecorded)return;usageRecorded=true;try{const usage=requestCost(body,data,stage,model,response?.status??null,Date.now()-attemptStarted,config.pricing);config.onUsage?.(usage);console.info('[FRAME Gemini usage]',JSON.stringify(usage));}catch{console.warn('[FRAME Gemini usage]',JSON.stringify({event:'telemetry_failure',stage,model}));}};
    try {
      response=await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':config.key},signal,body:JSON.stringify(body)});
      lastStatus=response.status;
      if(!response.ok){
        const transient=[408,429,500,502,503,504].includes(response.status);
        const upstreamStatus=({503:'UNAVAILABLE',429:'RESOURCE_EXHAUSTED',500:'INTERNAL',504:'DEADLINE_EXCEEDED',401:'UNAUTHENTICATED',403:'PERMISSION_DENIED',404:'NOT_FOUND',400:'INVALID_ARGUMENT'} as Record<number,string>)[response.status]??'HTTP_ERROR';
        const google:GoogleErrorDetails=await readGoogleError(response,redactions);
        log({event:'http_failure',stage,attempt:attempt+1,httpStatus:response.status,upstreamStatus,retryable:transient,...google});
        failure=response.status===429?new GeminiError('Gemini rate limit reached. Wait before retrying. Your prompt and existing design are preserved.','RATE_LIMIT',true,429,response.status)
          :!transient?new GeminiError(`Gemini rejected the server request (${response.status}). Check the configured model, API permissions and response schema before trying again. Your prompt and existing design are preserved.`,'CONFIGURATION',false,502,response.status)
          :new GeminiError(response.status===503?`Gemini is temporarily unavailable during ${stage} (503) after ${attempt+1} attempts. Retry later or check Google AI Studio service status. Your prompt and existing design are preserved.`:`Gemini service request failed (${response.status}) during ${stage} after ${attempt+1} attempts. Your prompt and existing design are preserved.`,'UPSTREAM',true,502,response.status,stage);
      }else{
        let data:unknown;
        try{data=await response.json();}catch(e){if(signal.aborted)throw e;throw new GeminiError('Gemini returned malformed API response JSON. Your prompt is preserved.','INVALID_ENVELOPE');}
        recordUsage(data);
        const stop=stopped(config.signal,config.deadline);if(stop)throw stop;
        if(signal.aborted)throw new DOMException('Gemini attempt timed out.','TimeoutError');
        const text=extractGeminiText(data);log({event:'http_success',stage,attempt:attempt+1,httpStatus:response.status});return text;
      }
    }catch(e){
      const stop=stopped(config.signal,config.deadline);
      if(stop){log({event:stop.code==='CANCELLED'?'cancelled':'timeout',stage,attempt:attempt+1,httpStatus:lastStatus,errorType:stop.code});throw stop;}
      if(e instanceof GeminiError)throw e; // Invalid JSON/schema/envelope is permanent.
      const timedOut=attemptController.signal.aborted;
      failure=new GeminiError(timedOut?'Gemini request timed out. Your prompt and existing design are preserved.':'Gemini connection failed. Your prompt and existing design are preserved.',timedOut?'TIMEOUT':'NETWORK',true,timedOut?504:502,lastStatus);
      log({event:timedOut?'timeout':'transport_failure',stage,attempt:attempt+1,httpStatus:lastStatus,errorType:timedOut?'TimeoutError':e instanceof TypeError?'TypeError':'TransportError',retryable:true});
    }finally{recordUsage();clearTimeout(timeout);}
    const stop=stopped(config.signal,config.deadline);if(stop)throw stop;
    failure!.stage=stage;
    if(!failure!.retryable)throw failure;
    const base=500*2**attempt;
    let delayMs=Math.round(base*(1+Math.max(0,Math.min(1,random()))*0.5));
    const raw=response?.headers.get('Retry-After');
    if(raw){const retryMs=/^\d+(?:\.\d+)?$/.test(raw)?Number(raw)*1000:Date.parse(raw)-Date.now();if(Number.isFinite(retryMs)&&retryMs>0){failure!.retryAfterMs=retryMs;delayMs=Math.max(delayMs,retryMs);if(failure!.code==='RATE_LIMIT')failure!.message=`Gemini rate limit reached. Wait at least ${Math.ceil(retryMs/1000)} seconds before retrying. Your prompt and existing design are preserved.`;}}
    if(attempt===maxAttempts-1)throw failure;
    if(config.deadline-Date.now()<=delayMs){log({event:'retry_skipped',stage,attempt:attempt+1,httpStatus:lastStatus,errorType:'INSUFFICIENT_DEADLINE',delayMs});throw failure;}
    log({event:'retry',stage,attempt:attempt+1,httpStatus:lastStatus,delayMs,retryable:true});
    const waitController=new AbortController();
    const waitTimeout=setTimeout(()=>waitController.abort(new DOMException('Generation deadline reached.','TimeoutError')),config.deadline-Date.now());
    const waitSignal=config.signal?AbortSignal.any([config.signal,waitController.signal]):waitController.signal;
    try{
      if(options.sleep){await options.sleep(delayMs);}else await cancellationAwareDelay(delayMs,waitSignal);
    }catch{throw stopped(config.signal,config.deadline)??new GeminiError('Gemini design generation timed out. Your prompt and existing design are preserved.','TIMEOUT',true,504,lastStatus);}
    finally{clearTimeout(waitTimeout);}
    const afterWait=stopped(config.signal,config.deadline);if(afterWait)throw afterWait;
  }
  throw new GeminiError('Gemini service is unavailable.','UPSTREAM',true);
}
