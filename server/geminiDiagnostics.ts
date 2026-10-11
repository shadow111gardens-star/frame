import {createHash} from 'node:crypto';
/** Only bounded, redacted Google error metadata may leave the transport layer. */
export interface GoogleErrorDetails {googleCode?:number;googleStatus?:string;googleMessage?:string}
export function sanitizeGoogleError(input:unknown,redactions:string[]=[]):GoogleErrorDetails {
  if(!input||typeof input!=='object')return {};
  const e=(input as {error?:unknown}).error;if(!e||typeof e!=='object')return {};
  const value=e as {code?:unknown;status?:unknown;message?:unknown};
  const details:GoogleErrorDetails={};
  if(typeof value.code==='number'&&Number.isInteger(value.code))details.googleCode=value.code;
  if(typeof value.status==='string'&&/^[A-Z_]{1,50}$/.test(value.status))details.googleStatus=value.status;
  if(typeof value.message==='string'){
    let message=value.message;
    for(const secret of redactions.flatMap(s=>[s,JSON.stringify(s).slice(1,-1)]).filter(Boolean).sort((a,b)=>b.length-a.length))message=message.split(secret).join('[redacted]');
    message=message.replace(/AIza[\w-]+/g,'[redacted]').replace(/Bearer\s+[^\s,;]+/gi,'Bearer [redacted]').replace(/((?:api[_ -]?key|authorization|x-goog-api-key)\s*[=:]\s*)[^\s,;]+/gi,'$1[redacted]').replace(/https?:\/\/[^\s]+/gi,'[url]').replace(/[\r\n\t\x00-\x1f]/g,' ');
    details.googleMessage=message.slice(0,300);
  }
  return details;
}
export function requestRedactions(body:unknown,key:string):string[]{
  const redactions=[key];
  if(body&&typeof body==='object'){
    const request=body as {contents?:{parts?:{text?:unknown}[]}[];systemInstruction?:{parts?:{text?:unknown}[]}};
    for(const part of [...(request.contents??[]).flatMap(c=>c.parts??[]),...(request.systemInstruction?.parts??[])]){
      if(typeof part.text!=='string')continue;redactions.push(part.text);
      try{const data=JSON.parse(part.text);if(typeof data.prompt==='string')redactions.push(data.prompt);}catch{/* Plain text is already redacted. */}
    }
  }
  return redactions;
}
/** Summarize known request properties; never log schema content or instructions. */
export function googleRequestSummary(body:unknown){
 const request=body as {generationConfig?:{responseMimeType?:unknown;responseJsonSchema?:unknown;maxOutputTokens?:unknown};contents?:unknown[];systemInstruction?:unknown};
 const config=request?.generationConfig;
 const schema=config?.responseJsonSchema===undefined?undefined:JSON.stringify(config.responseJsonSchema);
 return {responseMimeType:config?.responseMimeType==='application/json'?'application/json':'other',structuredOutput:!!schema,
  schemaBytes:schema===undefined?undefined:Buffer.byteLength(schema,'utf8'),schemaSha256:schema===undefined?undefined:createHash('sha256').update(schema).digest('hex'),
  maxOutputTokens:typeof config?.maxOutputTokens==='number'&&Number.isSafeInteger(config.maxOutputTokens)&&config.maxOutputTokens>0?config.maxOutputTokens:undefined,
  contentsCount:Array.isArray(request?.contents)?request.contents.length:0,systemInstructionPresent:!!request?.systemInstruction};
}
export async function readGoogleError(response:Response,redactions:string[]):Promise<GoogleErrorDetails>{
  const reader=response.body?.getReader?.();if(!reader){try{await response.body?.cancel();}catch{/* Disposal cannot replace HTTP status. */}return {};}
  const chunks:Uint8Array[]=[];let size=0;
  try{
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536)return {};chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    return sanitizeGoogleError(JSON.parse(new TextDecoder().decode(bytes)),redactions);
  }catch{return {};}finally{try{await reader.cancel();}catch{/* Keep the original HTTP failure. */}reader.releaseLock();}
}
