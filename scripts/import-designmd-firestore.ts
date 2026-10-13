import {mkdir,writeFile} from 'node:fs/promises';
import {loadCatalog,planRecord,importCatalog,estimatedDocumentBytes,CATALOG_PROJECT,CATALOG_COLLECTION} from './designmdFirestoreCatalog';
import {adminCatalogStore} from './designmdFirestoreAdmin';
const emulator=process.argv.includes('--emulator'),dryRun=process.argv.includes('--dry-run'),validateOnly=process.argv.includes('--validate-only');
const reportFile=emulator?'artifacts/designmd-firestore-emulator-report.json':'artifacts/designmd-firestore-live-report.json';
let dispose:(()=>Promise<void>)|undefined;
let phase:'source-validation'|'credentials'|'import'|'report'='source-validation';
try{
  const allowed=new Set(['--emulator','--dry-run','--validate-only']);if(process.argv.slice(2).some(arg=>!allowed.has(arg)))throw new Error('Unknown option; refusing import.');
  const source=await loadCatalog('data/designmd-github'),plans=source.map(s=>planRecord(s));
  if(validateOnly){console.info(JSON.stringify({mode:'local-validation-only',expectedCount:84,verifiedLocalStyles:source.length,targetProject:CATALOG_PROJECT,collection:CATALOG_COLLECTION,chunkedStyles:plans.filter(p=>p.chunks.length).map(p=>p.slug),maxEstimatedDocumentBytes:Math.max(...plans.map(p=>estimatedDocumentBytes(p.record))),firestoreVerified:false},null,2));}
  else{phase='credentials';const store=await adminCatalogStore(emulator);dispose=store.dispose;phase='import';
    const report=await importCatalog(plans,store,{dryRun,emulator});phase='report';await mkdir('artifacts',{recursive:true});await writeFile(reportFile,JSON.stringify(report,null,2)+'\n');console.info(JSON.stringify(report,null,2));
    if(report.failedRecords.length||!dryRun&&!report.complete)process.exitCode=1;
  }
}catch(error){
  // Never log provider response bodies or credential-provider exception details.
  const errorMessage=phase==='source-validation'?'Local catalog validation failed; no connection or writes attempted.':phase==='credentials'?'Trusted ADC or a local emulator connection is unavailable. See docs/designmd-firestore-import.md.':'Import/report failed; verify persisted records before resuming.';
  const report={complete:false,expectedCount:84,projectId:emulator?'demo-frame':CATALOG_PROJECT,collection:CATALOG_COLLECTION,mode:emulator?'emulator':'live',dryRun,phase,writesAttempted:!dryRun&&(phase==='import'||phase==='report'),firestoreVerified:false,error:errorMessage};
  await mkdir('artifacts',{recursive:true});await writeFile(reportFile,JSON.stringify(report,null,2)+'\n');console.error(JSON.stringify(report,null,2));process.exitCode=1;
}finally{await dispose?.();}
