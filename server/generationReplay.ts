import {createHash} from 'node:crypto';
type Result={status:number;data:unknown};
/** Small replay cache supplements durable client Firestore reservation. It is
 * neither a generation queue nor a cross-instance provider deduplication claim. */
export class GenerationReplay {
  private entries=new Map<string,{fingerprint:string;expires:number;promise:Promise<Result>}>();
  reserve(owner:string,input:any){
    if(!input.generationRunId||!input.idempotencyKey)return undefined;
    const phase=input.mode==='generate'?'generate':input.qualityReview?'render-repair':'edit';
    const key=createHash('sha256').update(JSON.stringify([owner,input.projectId,input.idempotencyKey,phase])).digest('hex');
    const fingerprint=createHash('sha256').update(JSON.stringify([input.prompt,input.app,input.activeScreen,input.productType,input.editScope,input.qualityReview,input.generationArtifact?.designMdHash])).digest('hex');
    for(const [id,entry] of this.entries)if(entry.expires<Date.now())this.entries.delete(id);
    const prior=this.entries.get(key);if(prior)return prior.fingerprint===fingerprint?{replay:prior.promise}:{conflict:true};
    if(this.entries.size>=100)return undefined; // Bounded cache, never reject or schedule users by capacity.
    let resolve!:(value:Result)=>void;const promise=new Promise<Result>(done=>resolve=done);
    this.entries.set(key,{fingerprint,expires:Date.now()+960000,promise});
    return {complete:(status:number,data:unknown)=>{this.entries.set(key,{fingerprint,expires:Date.now()+120000,promise});resolve({status,data});}};
  }
}
