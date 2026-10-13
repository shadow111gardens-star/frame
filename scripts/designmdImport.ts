import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,unlink,readdir} from 'node:fs/promises';
import path from 'node:path';

export const SOURCE='https://designmd.app';
const hash=(text:string)=>createHash('sha256').update(text,'utf8').digest('hex');
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min;
export function styleFilename(slug:string){return 'style-'+slug.replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,70)+'-'+hash(slug).slice(0,12);}
function summary(value:unknown):Record<string,unknown>&{slug:string;title:string}{
  if(!object(value)||!integer(value.id)||typeof value.slug!=='string'||!value.slug.trim()||value.slug.length>500||typeof value.title!=='string'||!value.title.trim()||typeof value.description!=='string'||typeof value.type!=='string')throw new Error('Malformed style metadata: expected id, slug, title, description and type.');
  return value as Record<string,unknown>&{slug:string;title:string};
}
export function listing(value:unknown,page:number){
  if(!object(value)||!Array.isArray(value.data)||!object(value.pagination))throw new Error('Malformed listing envelope.');
  const p=value.pagination;
  if(p.page!==page||!integer(p.limit,1)||p.limit>50||!integer(p.total)||!integer(p.totalPages)||p.totalPages===0&&p.total!==0||p.totalPages>10000||value.data.length>p.limit)throw new Error('Malformed pagination metadata.');
  return {data:value.data.map(summary),pagination:{page,limit:p.limit,total:p.total,totalPages:p.totalPages}};
}
export function detail(value:unknown,slug:string){const data=summary(value);if(data.slug!==slug)throw new Error('Detail slug differs from the requested canonical slug.');return data;}
export function sourceMarkdown(data:Record<string,unknown>){
  if(typeof data.designmd!=='string'||!data.designmd.trim())throw new Error('Detail lacks non-empty documented designmd (complete source Markdown).');
  return data.designmd;
}

export interface Clock {now:()=>number;sleep:(ms:number)=>Promise<void>}
const realClock:Clock={now:Date.now,sleep:ms=>new Promise(r=>setTimeout(r,ms))};
/** Sequential dispatch, at least 2.1s apart: at most 29 starts in a rolling minute.
 * Retries use the same gate. Other clients on this IP can still cause a 429. */
export class Requester {
  private next=0;
  constructor(private fetcher:typeof fetch=fetch,private clock:Clock=realClock,private random= Math.random){}
  async json(url:string){
    for(let attempt=0;attempt<3;attempt++){
      await this.clock.sleep(Math.max(0,this.next-this.clock.now()));this.next=this.clock.now()+2100;
      let response:Response;
      try{response=await this.fetcher(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000),redirect:'error'});}
      catch(error){if(attempt===2)throw new Error('Network failure or 20-second request timeout.',{cause:error});await this.clock.sleep(this.backoff(attempt));continue;}
      if(response.status===429||response.status===408||response.status>=500){
        const retry=response.headers.get('retry-after');let delay=this.backoff(attempt);
        if(retry){const seconds=Number(retry),date=Date.parse(retry);const indicated=Number.isFinite(seconds)&&seconds>=0?seconds*1000:Number.isFinite(date)?Math.max(0,date-this.clock.now()):0;delay=Math.max(delay,indicated);}
        await response.body?.cancel();
        if(attempt===2||delay>60000){
          const reason=`HTTP ${response.status}; bounded retry limit reached${delay>60000?' (Retry-After exceeds 60s; retry a later run)':''}.`;
          if(response.status===429)throw new RateLimitPause(reason,this.clock.now()+delay);
          throw new Error(reason);
        }
        await this.clock.sleep(delay);continue;
      }
      if(!response.ok){await response.body?.cancel();throw new HttpError(response.status);}
      // Reject oversized bodies rather than saving silently truncated content.
      const reader=response.body?.getReader();if(!reader)throw new Error('Empty API response.');
      const chunks:Uint8Array[]=[];let size=0;
      try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>20*1024*1024)throw new Error('API response exceeds 20 MiB safety bound.');chunks.push(value);}}
      catch(error){
        await reader.cancel().catch(()=>{});
        if(error instanceof Error&&error.message==='API response exceeds 20 MiB safety bound.')throw error;
        if(attempt===2)throw new Error('Network failure or timeout while reading API response.',{cause:error});
        await this.clock.sleep(this.backoff(attempt));continue;
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    }
    throw new Error('Request failed.');
  }
  private backoff(attempt:number){return 1000*2**attempt+Math.floor(this.random()*500);}
}
export class HttpError extends Error {constructor(public status:number){super(`HTTP ${status}`);}}
export class RateLimitPause extends Error {constructor(reason:string,public retryAt:number){super(reason);}}
async function atomic(file:string,text:string){
  await mkdir(path.dirname(file),{recursive:true});const temporary=file+'.'+randomUUID()+'.tmp';
  try{await writeFile(temporary,text,{encoding:'utf8',flag:'wx'});await rename(temporary,file);}finally{await unlink(temporary).catch(()=>{});}
}
type Success={fetchedAt:string;contentHash:string;jsonFile:string;markdownFile:string;bytes:number};
export type Entry={sourceUrl:string;slug:string;title:string;listedMetadata:Record<string,unknown>;status:'pending'|'succeeded'|'failed'|'not_attempted';fetchedAt:string|null;contentHash:string|null;jsonFile?:string;markdownFile?:string;metadataFile?:string;error?:string;lastSuccessful?:Success};
export interface Manifest {version:1;sourceUrl:string;catalogSource:'live'|'previous_manifest';startedAt:string;finishedAt?:string;paginationComplete:boolean;complete:boolean;pages:{page:number;status:'succeeded'|'failed';pagination?:unknown;error?:string}[];errors:string[];styles:Entry[];summary?:ImportSummary}
export interface ImportSummary {totalStylesDiscovered:number;uniqueStylesProcessed:number;successfulDownloads:number;retainedDownloads:number;failedDownloads:number;notAttempted:number;markdownFilesSaved:number;totalDataBytes:number;outputDirectory:string}

export async function importDesignMd(options:{outputDirectory:string;resume?:boolean;requester?:Pick<Requester,'json'>;progress?:(message:string)=>void}){
  const out=path.resolve(options.outputDirectory),client=options.requester??new Requester();
  await mkdir(out,{recursive:true});
  // A second process must not interleave file pairs/manifests or multiply dispatch.
  const lock=path.join(out,'.import.lock');await writeFile(lock,JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}),{flag:'wx'});
  try{
    const manifest:Manifest={version:1,sourceUrl:SOURCE+'/api/styles?page=1&limit=50',catalogSource:'live',startedAt:new Date().toISOString(),paginationComplete:false,complete:false,pages:[],errors:[],styles:[]};
    let previousStyles:unknown[]=[];
    // Retain the previous report even if a later listing request fails.
    try{const previous=await readFile(path.join(out,'manifest.json'),'utf8');await atomic(path.join(out,'runs',randomUUID()+'.json'),previous);try{const parsed=JSON.parse(previous);if(Array.isArray(parsed.styles)){previousStyles=parsed.styles;}}catch{/* Preserve corrupt reports, but never trust their contents. */}}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
    const prior=new Map<string,Success>();
    for(const candidate of previousStyles){if(!object(candidate))continue;const e=candidate as unknown as Entry;
      if(typeof e.slug!=='string'||!e.lastSuccessful)continue;
      try{
      // Never trust manifest paths: derive local names from the canonical slug.
      const stem=styleFilename(e.slug),jsonFile=`styles/${stem}.json`,markdownFile=`styles/${stem}.md`;
      const raw=JSON.parse(await readFile(path.join(out,jsonFile),'utf8')),md=await readFile(path.join(out,markdownFile),'utf8');
      if(sourceMarkdown(detail(raw,e.slug))===md&&hash(md)===e.lastSuccessful.contentHash)prior.set(e.slug,{...e.lastSuccessful,jsonFile,markdownFile});
      }catch{/* A damaged style must not invalidate other verified cached styles. */}
    }
    const save=()=>atomic(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    const slugs=new Set<string>();let discovered=0,total:number|undefined,totalPages=1,paginationValid=true,ratePause:string|undefined;
    const pause=async(error:RateLimitPause)=>{ratePause=error.message;await atomic(path.join(out,'rate-limit.json'),JSON.stringify({sourceUrl:SOURCE,retryAt:new Date(error.retryAt).toISOString(),reason:error.message},null,2)+'\n');};
    try{const cooldown=JSON.parse(await readFile(path.join(out,'rate-limit.json'),'utf8'));if(cooldown.sourceUrl===SOURCE&&Date.parse(cooldown.retryAt)>Date.now())ratePause=`Recorded API cooldown until ${cooldown.retryAt}; no requests made.`;}catch{/* No recorded cooldown. */}
    for(let page=1;page<=totalPages;page++){
      if(ratePause){paginationValid=false;manifest.errors.push(ratePause);break;}
      try{
        const current=listing(await client.json(`${SOURCE}/api/styles?page=${page}&limit=50`),page);
        if(total!==undefined&&(total!==current.pagination.total||totalPages!==Math.max(1,current.pagination.totalPages)))throw new Error('Catalog pagination changed during import; rerun for a consistent snapshot.');
        total=current.pagination.total;totalPages=Math.max(1,current.pagination.totalPages);discovered+=current.data.length;
        for(const item of current.data)if(!slugs.has(item.slug)){slugs.add(item.slug);manifest.styles.push({sourceUrl:`${SOURCE}/api/styles/${encodeURIComponent(item.slug)}`,slug:item.slug,title:item.title,listedMetadata:item,status:'pending',fetchedAt:null,contentHash:null,lastSuccessful:prior.get(item.slug)});}
        manifest.pages.push({page,status:'succeeded',pagination:current.pagination});
        options.progress?.(`Listing page ${page}/${totalPages}: ${manifest.styles.length} unique styles.`);
      }catch(error){paginationValid=false;const reason=message(error);manifest.pages.push({page,status:'failed',error:reason});manifest.errors.push(`Page ${page}: ${reason}`);if(error instanceof RateLimitPause)await pause(error);}
      await save();
    }
    manifest.paginationComplete=paginationValid&&total!==undefined&&discovered===total&&manifest.styles.length===total;
    if(!manifest.paginationComplete)manifest.errors.push('Pagination did not produce the complete declared catalog.');
    if(!manifest.styles.length&&previousStyles.length){
      for(const previous of previousStyles){try{
        if(!object(previous))continue;const item=summary(previous.listedMetadata);if(item.slug!==previous.slug||slugs.has(item.slug))continue;
        slugs.add(item.slug);manifest.styles.push({sourceUrl:`${SOURCE}/api/styles/${encodeURIComponent(item.slug)}`,slug:item.slug,title:item.title,listedMetadata:item,status:'pending',fetchedAt:null,contentHash:null,lastSuccessful:prior.get(item.slug)});
      }catch{/* Invalid old records cannot become current source data. */}}
      discovered=manifest.styles.length;manifest.catalogSource='previous_manifest';manifest.errors.push('Known catalog retained from the previous report; current pagination is unverified.');
    }
    let markdownFilesSaved=0,retainedDownloads=0,processed=0,bytes=0,authorizationBlock:string|undefined;
    for(const entry of manifest.styles){
      if(options.resume&&entry.lastSuccessful){const saved=entry.lastSuccessful;Object.assign(entry,{status:'succeeded',fetchedAt:saved.fetchedAt,contentHash:saved.contentHash,jsonFile:saved.jsonFile,markdownFile:saved.markdownFile});retainedDownloads++;continue;}
      if(ratePause){entry.status='not_attempted';entry.error='Import halted by API cooldown: '+ratePause;continue;}
      if(authorizationBlock){entry.status='not_attempted';entry.error=authorizationBlock;continue;}
      processed++;const stem=styleFilename(entry.slug);
      try{
        const data=detail(await client.json(entry.sourceUrl),entry.slug);
        if(typeof data.designmd!=='string'||!data.designmd.trim()){
          // Preserve the actual metadata separately, never replace valid style files.
          entry.metadataFile=`errors/${stem}.json`;
          // Keep earlier error evidence if a later fetch returns changed metadata.
          try{const previous=await readFile(path.join(out,entry.metadataFile),'utf8');await atomic(path.join(out,'error-history',stem,hash(previous)+'.json'),previous);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
          await atomic(path.join(out,entry.metadataFile),JSON.stringify(data,null,2)+'\n');
          // Probe documented content access, not a token endpoint. Its prose-only
          // content is NOT a substitute for exact complete source DESIGN.md.
          try{await client.json(entry.sourceUrl+'/content');}
          catch(error){if(error instanceof HttpError&&[401,403].includes(error.status)){authorizationBlock=`Documented public content endpoint returned HTTP ${error.status}; source contract unavailable. Import halted pending provider correction; no credentials or reconstructed Markdown.`;manifest.errors.push(authorizationBlock);throw new Error(authorizationBlock);}throw error;}
        }
        const md=sourceMarkdown(data),serialized=JSON.stringify(data,null,2)+'\n';
        const jsonFile=`styles/${stem}.json`,markdownFile=`styles/${stem}.md`;
        // Versioned immutable backup makes an interrupted two-file replacement
        // recoverable. Fetch/validation failures never reach replacement.
        const digest=hash(md),version=`snapshots/${stem}/${hash(serialized)}`;
        await atomic(path.join(out,version,'detail.json'),serialized);await atomic(path.join(out,version,'DESIGN.md'),md);
        await atomic(path.join(out,jsonFile),serialized);await atomic(path.join(out,markdownFile),md);
        const saved=JSON.parse(await readFile(path.join(out,jsonFile),'utf8')),savedMd=await readFile(path.join(out,markdownFile),'utf8');
        if(sourceMarkdown(detail(saved,entry.slug))!==savedMd||hash(savedMd)!==digest)throw new Error('Saved JSON/Markdown integrity verification failed.');
        const fetchedAt=new Date().toISOString(),size=Buffer.byteLength(serialized)+Buffer.byteLength(md);
        Object.assign(entry,{status:'succeeded',fetchedAt,contentHash:digest,jsonFile,markdownFile,lastSuccessful:{fetchedAt,contentHash:digest,jsonFile,markdownFile,bytes:size}});
        markdownFilesSaved++;bytes+=size;
      }catch(error){entry.status='failed';entry.fetchedAt=new Date().toISOString();entry.error=message(error);if(error instanceof RateLimitPause){await pause(error);manifest.errors.push('Detail import paused: '+ratePause);}}
      await save();if(processed===1||processed%20===0||processed===manifest.styles.length)options.progress?.(`Details ${processed}/${manifest.styles.length}: ${entry.slug} ${entry.status}${entry.error?': '+entry.error:''}`);
    }
    manifest.finishedAt=new Date().toISOString();
    manifest.summary={totalStylesDiscovered:discovered,uniqueStylesProcessed:processed,successfulDownloads:manifest.styles.filter(e=>e.status==='succeeded').length-retainedDownloads,retainedDownloads,failedDownloads:manifest.styles.filter(e=>e.status==='failed').length,notAttempted:manifest.styles.filter(e=>e.status==='not_attempted').length,markdownFilesSaved,totalDataBytes:bytes,outputDirectory:out};
    manifest.complete=manifest.paginationComplete&&manifest.styles.every(e=>e.status==='succeeded');await save();
    // Count all inspection files, including failed metadata, manifest, and backups.
    // Exclude this process's temporary lock. Recompute until manifest-size digits settle.
    for(let i=0;i<4;i++){const size=await directoryBytes(out);if(size===manifest.summary.totalDataBytes)break;manifest.summary.totalDataBytes=size;await save();}
    return manifest;
  }finally{await unlink(lock).catch(()=>{});}
}
const message=(e:unknown)=>e instanceof Error?e.message:String(e);
async function directoryBytes(directory:string):Promise<number>{
  let bytes=0;
  for(const entry of await readdir(directory,{withFileTypes:true})){if(entry.name==='.import.lock'||entry.name.endsWith('.tmp'))continue;
    const file=path.join(directory,entry.name);if(entry.isDirectory())bytes+=await directoryBytes(file);else if(entry.isFile())bytes+=(await readFile(file)).byteLength;
  }return bytes;
}
