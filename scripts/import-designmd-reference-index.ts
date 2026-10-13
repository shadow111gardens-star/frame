import {mkdir,writeFile} from 'node:fs/promises';
import {loadCatalog,importCatalog} from './designmdFirestoreCatalog';
import {adminCatalogStore} from './designmdFirestoreAdmin';
import {INDEX_COLLECTION,indexPlan} from './designmdReferenceIndex';
const args=process.argv.slice(2),dryRun=args.includes('--dry-run'),emulator=args.includes('--emulator');
let dispose:(()=>Promise<void>)|undefined;
try{
  if(args.some(arg=>!['--dry-run','--emulator'].includes(arg)))throw new Error('Unknown option');
  const plans=(await loadCatalog('data/designmd-github')).map(indexPlan);
  const store=await adminCatalogStore(emulator,INDEX_COLLECTION);dispose=store.dispose;
  const report=await importCatalog(plans,store,{dryRun,emulator,collection:INDEX_COLLECTION});
  await mkdir('artifacts',{recursive:true});await writeFile(`artifacts/designmd-reference-index-${emulator?'emulator':'live'}-${dryRun?'dry-run':'import'}-report.json`,JSON.stringify(report,null,2)+'\n');
  console.info(JSON.stringify(report,null,2));if(report.failedRecords.length||!dryRun&&!report.complete)process.exitCode=1;
}catch{console.error('Reference index import failed; credential details and provider bodies are not logged. No success claimed.');process.exitCode=1;}finally{await dispose?.();}
