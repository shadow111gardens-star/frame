import {verify} from 'node:crypto';
import {GeminiError} from './geminiResponse';

const certificateUrl='https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let certificates:Record<string,string>={},expiresAt=0;
export async function verifyFirebaseIdentity(authorization:string|undefined,projectId='frame-44bbd',fetcher=fetch):Promise<string> {
  const token=authorization?.match(/^Bearer ([A-Za-z0-9_.-]+)$/)?.[1];
  const fail=()=>new GeminiError('Sign in again before generating a design. Your existing design is preserved.','AUTHENTICATION',false,401);
  if(!token||token.length>16000)throw fail();
  let header:any,claims:any,parts:string[];
  try{parts=token.split('.');if(parts.length!==3)throw fail();header=JSON.parse(Buffer.from(parts[0],'base64url').toString());claims=JSON.parse(Buffer.from(parts[1],'base64url').toString());}catch{throw fail();}
  const now=Math.floor(Date.now()/1000);
  if(header.alg!=='RS256'||typeof header.kid!=='string'||claims.aud!==projectId||claims.iss!==`https://securetoken.google.com/${projectId}`||typeof claims.sub!=='string'||!claims.sub||claims.sub.length>128||!Number.isInteger(claims.exp)||claims.exp<=now||!Number.isInteger(claims.iat)||claims.iat>now||!Number.isInteger(claims.auth_time)||claims.auth_time>now)throw fail();
  if(Date.now()>=expiresAt){
    const response=await fetcher(certificateUrl,{signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new GeminiError('Could not verify your session. Retry shortly.','AUTHENTICATION_UNAVAILABLE',true,503);
    certificates=await response.json();expiresAt=Date.now()+Math.min(86400,Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1]??0))*1000;
  }
  if(!Object.prototype.hasOwnProperty.call(certificates,header.kid)||!verify('RSA-SHA256',Buffer.from(parts![0]+'.'+parts![1]),certificates[header.kid],Buffer.from(parts![2],'base64url')))throw fail();
  return claims.sub;
}
