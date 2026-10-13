import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {SOURCE} from './designmdImport';
import {contentFieldPaths,safeBodySample} from './designmdEvidence';

// A small, read-only probe. No full import, auth headers, cookies or env loading.
const output=path.join('artifacts','designmd-diagnostics',new Date().toISOString().replace(/[:.]/g,'-'));
await mkdir(output,{recursive:true});
const manifest=JSON.parse(await readFile('data/designmd/manifest.json','utf8'));
try{const cooldown=JSON.parse(await readFile('data/designmd/rate-limit.json','utf8'));if(cooldown.sourceUrl===SOURCE&&Date.parse(cooldown.retryAt)>Date.now())throw new Error('Known cooldown active until '+cooldown.retryAt);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
const slugs=['minimalism-swiss-style','glassmorphism','brutalism-4'];
for(const slug of slugs)if(!manifest.styles.some((e:any)=>e.slug===slug&&e.metadataFile))throw new Error('Probe slug must be one of the already saved metadata records.');
const evidence:unknown[]=[];let stop=false;
for(const slug of slugs){
  for(const suffix of ['','/content']){
    if(evidence.length)await new Promise(r=>setTimeout(r,10000));
    const url=`${SOURCE}/api/styles/${encodeURIComponent(slug)}${suffix}`;
    const response=await fetch(url,{method:'GET',headers:{Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(20000)});
    const headers=Object.fromEntries([...response.headers].filter(([key])=>/^(content-type|date|server|retry-after|ratelimit[\w-]*|x-ratelimit[\w-]*)$/i.test(key)));
    const reader=response.body?.getReader(),chunks:Uint8Array[]=[];let bytes=0,truncated=false;
    if(reader)for(;;){const item=await reader.read();if(item.done)break;bytes+=item.value.byteLength;if(bytes>1024*1024){truncated=true;await reader.cancel();break;}chunks.push(item.value);}
    const body=Buffer.concat(chunks).toString('utf8');let parsed:any;try{parsed=JSON.parse(body);}catch{/* Raw non-JSON sample is still evidence. */}
    const contentPaths=contentFieldPaths(parsed),sample=safeBodySample(body);
    const record={fetchedAt:new Date().toISOString(),slug,url,method:'GET',status:response.status,headers,bytesRead:bytes,truncated,topLevelKeys:parsed&&typeof parsed==='object'?Object.keys(parsed):[],contentPaths,bodySample:sample};
    evidence.push(record);await writeFile(path.join(output,'responses.json'),JSON.stringify(evidence,null,2)+'\n');
    // Only save complete parsed public response objects, not HTML/session headers.
    if(parsed&&!truncated)await writeFile(path.join(output,slug+(suffix?'-content':'-detail')+'.json'),JSON.stringify(parsed,null,2)+'\n');
    console.info(JSON.stringify(record));
    if(response.status===429){stop=true;console.info('Stopped on first 429; no retries or further slug probes.');break;}
  }
  if(stop)break;
}
console.info('Evidence directory: '+path.resolve(output));
