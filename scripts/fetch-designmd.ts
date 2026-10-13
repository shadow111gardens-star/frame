import {importDesignMd} from './designmdImport';
const arg=process.argv.find(v=>v.startsWith('--output='));
try{
  const result=await importDesignMd({outputDirectory:arg?.slice(9)??'data/designmd',resume:process.argv.includes('--resume'),progress:console.info});
  console.info(JSON.stringify({complete:result.complete,paginationComplete:result.paginationComplete,...result.summary,errors:result.errors,failedStyles:result.styles.filter(e=>e.status==='failed').map(e=>({slug:e.slug,reason:e.error})),notAttemptedReason:result.styles.find(e=>e.status==='not_attempted')?.error},null,2));
  if(!result.complete)process.exitCode=1;
}catch(error){console.error('DesignMD import failed:',error instanceof Error?error.message:String(error));process.exitCode=1;}
