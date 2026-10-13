import {collection,doc,getDocsFromServer,getDocFromServer,getFirestore} from 'firebase/firestore';
import {getAuth} from 'firebase/auth';
import {initializeFrameFirebase} from '../auth/firebase';
import {referenceIndexSchema,selectReference,buildReference,type StyleReference} from '../../shared/designReference';
export interface ReferenceReader {index:()=>Promise<unknown[]>;document:(slug:string)=>Promise<Record<string,any>|null>;chunk:(slug:string,id:string)=>Promise<Record<string,any>|null>}
export async function resolveReference(prompt:string,reader:ReferenceReader,signal?:AbortSignal):Promise<StyleReference|undefined>{
  try{
    if(signal?.aborted)return;
    const index=(await reader.index()).flatMap(raw=>{const parsed=referenceIndexSchema.safeParse(raw);return parsed.success?[parsed.data]:[];});
    if(signal?.aborted)return;
    const selected=selectReference(prompt,index);if(!selected)return;
    const full=await reader.document(selected.slug);
    if(signal?.aborted||!full||full.slug!==selected.slug||full.source?.sha256!==selected.contentHash||full.source?.sourceUrl!==selected.sourceUrl||full.content?.sha256!==selected.contentHash||!['inline','chunks'].includes(full.content.storage))return;
    let markdown=full.designMd;
    if(full.content.storage==='chunks'){
      const ids=full.content.chunkIds;if(!Array.isArray(ids)||!ids.length||ids.length>100||new Set(ids).size!==ids.length)return;
      const chunks:string[]=[];
      for(const [index,id] of ids.entries()){
        if(signal?.aborted)return;
        if(id!==`v-${selected.contentHash}-${String(index).padStart(6,'0')}`)return;
        const chunk=await reader.chunk(selected.slug,id);if(!chunk||chunk.index!==index||chunk.parentHash!==selected.contentHash||typeof chunk.text!=='string')return;
        chunks.push(chunk.text);
      }markdown=chunks.join('');
    }
    if(typeof markdown!=='string'||!markdown.trim()||new TextEncoder().encode(markdown).length!==full.content.bytes)return;
    const bytes=new TextEncoder().encode(markdown),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
    if(hash!==selected.contentHash)return;
    return signal?.aborted?undefined:buildReference(selected,markdown,full.designTokens);
  }catch{return undefined;} // Optional guidance must never prevent generation.
}
export class ReferenceIndexCache {
  private entry:{uid:string;expires:number;promise:Promise<unknown[]>}|undefined;
  clear(){this.entry=undefined;}
  read(uid:string,load:()=>Promise<unknown[]>,now=Date.now()):Promise<unknown[]>{
    if(!this.entry||this.entry.uid!==uid||this.entry.expires<now){
      const entry={uid,expires:now+15*60_000,promise:Promise.resolve([] as unknown[])};
      entry.promise=Promise.resolve().then(load).catch(()=>{entry.expires=Date.now()+30_000;return [];});this.entry=entry;
    }return this.entry.promise;
  }
}
const cache=new ReferenceIndexCache();
export function clearReferenceCache(){cache.clear();}
export async function generationReference(prompt:string,signal?:AbortSignal):Promise<StyleReference|undefined>{
  if(signal?.aborted)return;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const selection=new AbortController(),cancel=()=>selection.abort();signal?.addEventListener('abort',cancel,{once:true});
  try{
    const app=initializeFrameFirebase(),uid=getAuth(app).currentUser?.uid;if(!uid)return;
    const db=getFirestore(app);
    const reader:ReferenceReader={
      index:()=>cache.read(uid,()=>getDocsFromServer(collection(db,'designReferenceCatalogIndex')).then(result=>result.docs.filter(d=>d.id===d.data().slug).map(d=>d.data()))),
      document:async slug=>(await getDocFromServer(doc(db,'designReferenceCatalog',slug))).data()??null,
      chunk:async(slug,id)=>(await getDocFromServer(doc(db,'designReferenceCatalog',slug,'markdownChunks',id))).data()??null,
    };
    const fallback=new Promise<undefined>(resolve=>{selection.signal.addEventListener('abort',()=>resolve(undefined),{once:true});timer=setTimeout(cancel,3500);});
    const reference=await Promise.race([resolveReference(prompt,reader,selection.signal),fallback]);
    return signal?.aborted||getAuth(app).currentUser?.uid!==uid?undefined:reference;
  }catch{return undefined;}finally{if(timer)clearTimeout(timer);signal?.removeEventListener('abort',cancel);selection.abort();}
}
