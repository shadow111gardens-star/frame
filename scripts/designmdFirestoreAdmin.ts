import {initializeApp,applicationDefault,deleteApp} from 'firebase-admin/app';
import {getFirestore,type Firestore} from 'firebase-admin/firestore';
import {randomUUID} from 'node:crypto';
import {CATALOG_PROJECT,IMPORTER,canonical,estimatedDocumentBytes,retry,type CatalogStore,type WritePlan} from './designmdFirestoreCatalog';

export async function adminCatalogStore(emulator=false,collection='designReferenceCatalog'):Promise<CatalogStore&{dispose:()=>Promise<void>}>{
  if(!['designReferenceCatalog','designReferenceCatalogIndex'].includes(collection))throw new Error('Refusing unexpected catalog collection.');
  const host=process.env.FIRESTORE_EMULATOR_HOST;
  if(emulator&&!/^(localhost|127\.0\.0\.1):\d+$/.test(host??''))throw new Error('Emulator mode requires an explicit local FIRESTORE_EMULATOR_HOST.');
  if(!emulator&&host)throw new Error('Refusing live mode with FIRESTORE_EMULATOR_HOST set.');
  const projectId=emulator?'demo-frame':CATALOG_PROJECT;
  const credential=emulator?undefined:applicationDefault();
  if(credential)try{await credential.getAccessToken();}catch{throw new Error('Trusted Application Default Credentials unavailable. Configure ADC outside the repository; never paste a key into chat or source.');}
  const app=initializeApp({projectId,...(credential?{credential}:{})},'designmd-import-'+randomUUID());
  const db=getFirestore(app);if(app.options.projectId!==projectId){await deleteApp(app);throw new Error('Admin SDK resolved an unexpected project.');}
  const store=new FirestoreCatalogStore(db,projectId,collection);
  return {projectId,read:paths=>store.read(paths),apply:(plan,id,time)=>store.apply(plan,id,time),dispose:async()=>{await db.terminate();await deleteApp(app);}};
}
function permitted(path:string,collection:string){if(!/^designReferenceCatalog(?:Index)?\/[A-Za-z0-9][A-Za-z0-9._-]{0,199}(?:\/markdownChunks\/v-[a-f0-9]{64}-\d{6})?$/.test(path)||path.split('/')[0]!==collection||(collection.endsWith('Index')&&path.split('/').length!==2))throw new Error('Refusing path outside the dedicated catalog.');}
export class FirestoreCatalogStore implements CatalogStore {
  constructor(private db:Firestore,public projectId:string,private collection='designReferenceCatalog'){}
  async read(paths:string[]){paths.forEach(p=>permitted(p,this.collection));const docs=[];
    for(let i=0;i<paths.length;i+=20){const found=await this.db.getAll(...paths.slice(i,i+20).map(p=>this.db.doc(p)));docs.push(...found.map(s=>s.exists?s.data()!:null));}
    return docs;
  }
  async apply(plan:WritePlan,runId:string,importedAt:string):Promise<'created'|'updated'|'skipped'>{
    permitted(plan.path,this.collection);
    // Stage immutable versioned chunks before publishing a parent pointer.
    // Batches stay below 20 writes / 4 MiB; old versions are never deleted.
    const groups:WritePlan['chunks'][]=[];let group:WritePlan['chunks']=[],bytes=0;
    for(const chunk of plan.chunks){permitted(chunk.path,this.collection);const size=estimatedDocumentBytes(chunk.data);
      if(group.length&&(group.length>=20||bytes+size>4*1024*1024)){groups.push(group);group=[];bytes=0;}group.push(chunk);bytes+=size;
    }if(group.length)groups.push(group);
    for(const chunks of groups)await retry(async()=>{
      const refs=chunks.map(c=>this.db.doc(c.path)),existing=await this.db.getAll(...refs);const batch=this.db.batch();let changed=0;
      for(const [i,c] of chunks.entries()){
        if(!existing[i].exists){batch.create(refs[i],c.data);changed++;}
        else{const data=existing[i].data()!;if(data.catalogImporter!==IMPORTER)throw Object.assign(new Error('Foreign chunk'),{code:'foreign-document'});
          if(Object.keys(c.data).some(k=>canonical(data[k])!==canonical(c.data[k]))){batch.update(refs[i],c.data,{lastUpdateTime:existing[i].updateTime!});changed++;}}
      }
      if(changed)try{await batch.commit();}catch(error){if((error as {code?:number}).code===6)throw Object.assign(new Error('Concurrent chunk creation; recheck immutable content'),{code:10});throw error;}
    });
    return this.db.runTransaction(async tx=>{
      const ref=this.db.doc(plan.path),snapshot=await tx.get(ref),old=snapshot.exists?snapshot.data()!:null;
      if(old&&old.catalogImporter!==IMPORTER)throw Object.assign(new Error('Foreign catalog record'),{code:'foreign-document'});
      // All immutable chunks have been staged and checked; the parent transaction
      // compares managed fields exactly, not a possibly stale claimed hash alone.
      if(old&&Object.keys(plan.record).every(k=>canonical(old[k])===canonical(plan.record[k]))){
        if(old.importRunId===runId&&['created','updated'].includes(old.importAction))return old.importAction as 'created'|'updated';return 'skipped';
      }
      const action=old?'updated':'created';const data={...plan.record,importedAt,importRunId:runId,importAction:action};
      if(old)tx.update(ref,data);else tx.create(ref,data);
      return action;
    },{maxAttempts:1});
  }
}
