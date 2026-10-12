import {generationArtifactSchema,type GenerationArtifact} from '../../shared/generationArtifact';
import {getAuth} from 'firebase/auth';
import {initializeFrameFirebase} from '../auth/firebase';
import {DEFAULT_CLIENT_TIMEOUT_MS,timeoutSetting} from '../../shared/generationTiming';
import { responseSchema, validateApp, type DesignApp } from '../../shared/design';
import type {ProductType} from '../../shared/product';
export let pendingPrompt: string | null = null;
let pendingProductType: ProductType | undefined;
export function beginGeneration(prompt:string,productType?:ProductType) {pendingPrompt=prompt;pendingProductType=productType;}
export function takePrompt() {const request=pendingPrompt?{prompt:pendingPrompt,productType:pendingProductType}:null;pendingPrompt=null;pendingProductType=undefined;return request;}
export class DesignRequestError extends Error {
  constructor(message:string,public retryable:boolean,public code?:string){super(message);this.name='DesignRequestError';}
}
export async function requestDesign(prompt:string,app?:DesignApp,activeScreen?:string,productType?:ProductType,qualityReview?:import('../workspace/components/RenderedDesignReview').RenderReview,signal?:AbortSignal,options:{timeoutMs?:number;fetch?:typeof fetch;editScope?:import('../../shared/editScope').EditScope;projectId?:string;generationRunId?:string;idempotencyKey?:string;generationArtifact?:GenerationArtifact;idToken?:string;onStage?:(stage:import('../../shared/generationProgress').GenerationStage)=>void|Promise<void>}={}) {
  const timeoutMs=options.timeoutMs??timeoutSetting(import.meta.env?.VITE_UI_GENERATION_TIMEOUT_MS,DEFAULT_CLIENT_TIMEOUT_MS);
  const timerController=new AbortController();
  const timer=setTimeout(()=>timerController.abort(new DOMException('UI generation timed out.','TimeoutError')),timeoutMs);
  const requestSignal=signal?AbortSignal.any([signal,timerController.signal]):timerController.signal;
  let response:Response|undefined;
  try {
    const idToken=options.idToken??await getAuth(initializeFrameFirebase()).currentUser?.getIdToken();
    response=await (options.fetch??fetch)('/api/design',{method:'POST',headers:{'Content-Type':'application/json',...(options.onStage?{Accept:'application/x-ndjson'}:{}),...(idToken?{Authorization:'Bearer '+idToken}:{})},body:JSON.stringify({mode:app?'modify':'generate',prompt,app,activeScreen,productType,qualityReview,timeoutMs,editScope:options.editScope,projectId:options.projectId,generationRunId:options.generationRunId,idempotencyKey:options.idempotencyKey,generationArtifact:options.generationArtifact}),signal:requestSignal});
    let data:any;
    let effectiveStatus=response.status;
    try{
      if(response.headers?.get('content-type')?.includes('application/x-ndjson')){
        const reader=response.body!.getReader(),decoder=new TextDecoder();let buffer='',bytes=0,finished=false;
        while(true){const part=await reader.read();buffer+=decoder.decode(part.value,{stream:!part.done});bytes+=part.value?.byteLength??0;if(bytes>10000000)throw new Error('Oversized generation response');
          let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!line.trim())continue;const event=JSON.parse(line);if(event.event==='stage')await options.onStage?.(event.stage);if(event.event==='result'){data=event.data;effectiveStatus=event.httpStatus;finished=true;}}
          if(part.done)break;
        }
        if(!finished)throw new Error('Incomplete generation response');
      }else data=await response.json();
    }catch(e){
      // Preserve a real HTTP failure if its body fails or is aborted during consumption.
      if(!response.ok)throw new DesignRequestError(`Design service request failed (${response.status}). Your prompt and existing design are preserved.`,response.status>=500||response.status===429,'SERVICE_HTTP');
      if(requestSignal.aborted||e instanceof DOMException&&['AbortError','TimeoutError'].includes(e.name))throw e;
      throw new DesignRequestError('Design service returned an unexpected response. Your prompt and existing design are preserved.',false,'INVALID_RESPONSE');
    }
    if(effectiveStatus>=400)throw new DesignRequestError(typeof data.error==='string'?data.error:'Design generation failed. Your prompt and existing design are preserved.',typeof data.retryable==='boolean'?data.retryable:response.status>=500||response.status===429,typeof data.code==='string'?data.code:undefined);
    const result=responseSchema.parse(data);result.app=validateApp(result.app);
    if(app && result.app.productType!==app.productType) throw new Error('The design provider changed the product type. Your design is unchanged. Retry.');
    if(!app && productType && result.app.productType!==productType) throw new DesignRequestError('The design provider did not follow your selected product type. Your prompt is preserved.',false,'DESIGN_PRODUCT_TYPE');
    return {...result,generationArtifact:data.generationArtifact?generationArtifactSchema.parse(data.generationArtifact):undefined};
  }catch(e){
    let error:DesignRequestError;
    if(e instanceof DesignRequestError)error=e;
    else if(signal?.aborted&&signal.reason?.name!=='TimeoutError')error=new DesignRequestError('Design generation was cancelled. Your prompt and existing design are preserved.',false,'CANCELLED');
    else if(timerController.signal.aborted||signal?.reason?.name==='TimeoutError'||e instanceof DOMException&&e.name==='TimeoutError')error=new DesignRequestError('Design generation timed out. Your prompt and existing design are preserved. Retry when the service is available.',true,'TIMEOUT');
    else if(e instanceof DOMException&&e.name==='AbortError')error=new DesignRequestError('The design service connection was interrupted. Your prompt and existing design are preserved. Retry when the service is available.',true,'NETWORK');
    else if(e instanceof TypeError)error=new DesignRequestError('Could not connect to the design service. Your prompt and existing design are preserved.',true,'NETWORK');
    else error=new DesignRequestError('Design service returned invalid design data. Your prompt and existing design are preserved.',false,'INVALID_RESPONSE');
    console.warn('[FRAME design request]',JSON.stringify({code:error.code,httpStatus:response?.status,abortSource:signal?.aborted?'caller':timerController.signal.aborted?'timeout':e instanceof DOMException&&e.name==='AbortError'?'unattributed':undefined}));
    throw error;
  }finally{clearTimeout(timer);}
}
