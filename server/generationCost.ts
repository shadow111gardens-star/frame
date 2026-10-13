import type {GenerationCost,RequestCost} from '../shared/generationCost';
export function pricingConfig(env:Record<string,string|undefined>,model:string):GenerationCost['pricing']{
  const read=(name:string)=>{const value=env[name];return value!==undefined&&value.trim()!==''&&Number.isFinite(Number(value))&&Number(value)>=0?Number(value):null;};
  const explicit=env.GEMINI_PRICING_MODEL===model;
  return {model:/^[a-zA-Z0-9._-]{1,100}$/.test(model)&&model!==env.GEMINI_API_KEY?model:'[redacted]',currency:'USD',inputPerMillion:explicit?read('GEMINI_INPUT_USD_PER_MILLION'):model==='gemini-3.1-flash-lite'?.25:null,outputPerMillion:explicit?read('GEMINI_OUTPUT_USD_PER_MILLION'):model==='gemini-3.1-flash-lite'?1.5:null,source:explicit?'environment-configured list-price estimate':model==='gemini-3.1-flash-lite'?'Google standard list price 2026-10-12':'unconfigured'};
}
export function requestCost(body:unknown,data:unknown,stage:string,model:string,httpStatus:number|null,latencyMs:number,pricing?:GenerationCost['pricing']):RequestCost {
  const envelope=data as any,usage=envelope?.usageMetadata;
  const count=(key:string)=>Number.isSafeInteger(usage?.[key])&&usage[key]>=0?usage[key]:null;
  const inputTokens=count('promptTokenCount'),outputTokens=count('candidatesTokenCount'),reportedThinking=count('thoughtsTokenCount'),cachedTokens=count('cachedContentTokenCount'),totalTokens=count('totalTokenCount');
  const inferredZero=reportedThinking===null&&inputTokens!==null&&outputTokens!==null&&totalTokens===inputTokens+outputTokens;
  const thinkingTokens=reportedThinking??(inferredZero?0:null);
  const reported=inputTokens!==null&&outputTokens!==null;
  const estimatedUsd=reported&&thinkingTokens!==null&&pricing&&pricing.source!=='unconfigured'&&pricing.inputPerMillion!==null&&pricing.outputPerMillion!==null&&!(cachedTokens??0)?(inputTokens*pricing.inputPerMillion+(outputTokens+thinkingTokens)*pricing.outputPerMillion)/1e6:null;
  const json=JSON.stringify(body);
  return {stage,model,repair:stage.includes('repair')||stage==='rendered-review',httpStatus,latencyMs,inputTokens,outputTokens,thinkingTokens,thinkingSource:reportedThinking!==null?'provider':inferredZero?'inferred-zero':'unavailable',cachedTokens,totalTokens,usageSource:reported?'provider':'unavailable',estimatedInputTokens:reported||json.includes('inlineData')?null:Math.ceil(json.length/4),estimatedUsd:Number.isFinite(estimatedUsd)?estimatedUsd:null,outcome:httpStatus===null?'unknown':httpStatus>=400||envelope?.candidates?.[0]?.finishReason&&envelope.candidates[0].finishReason!=='STOP'?'failed':'succeeded'};
}
