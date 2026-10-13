import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {parseDocument} from 'yaml';
import {GITHUB_SOURCE,githubFilename} from './designmdGithubImport';

export const CATALOG_COLLECTION='designReferenceCatalog';
export const CATALOG_PROJECT='frame-44bbd';
export const IMPORTER='frame-designmd-github-v1';
export const EXPECTED_STYLES=84;
const digest=(text:string|Buffer)=>createHash('sha256').update(text).digest('hex');
export function canonical(value:unknown):string{
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
  return JSON.stringify(value);
}
export function catalogPath(slug:string){if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(slug)||/^__.*__$/.test(slug))throw new Error('Unsafe source slug/document ID.');return `${CATALOG_COLLECTION}/${slug}`;}
const same=(a:unknown,b:unknown)=>canonical(a)===canonical(b);
function safeValue(value:unknown,depth=0,inArray=false):boolean{
  if(depth>15)return false;
  if(value===null||typeof value==='string'||typeof value==='boolean')return true;
  if(typeof value==='number')return Number.isFinite(value);
  if(Array.isArray(value))return !inArray&&value.every(v=>safeValue(v,depth+1,true));
  return !!value&&typeof value==='object'&&Object.entries(value).every(([k,v])=>!/^__.*__$/.test(k)&&safeValue(v,depth+1));
}
export function extractFrontMatter(markdown:string){
  const raw=/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(markdown)?.[1];
  if(raw===undefined)return {raw:null,data:null,status:'absent',tokens:null};
  try{const doc=parseDocument(raw,{schema:'core',uniqueKeys:true});if(doc.errors.length||doc.warnings.length)throw new Error('Unsupported YAML');const data=doc.toJS({maxAliasCount:0});
    if(!data||typeof data!=='object'||Array.isArray(data)||!safeValue(data))throw new Error('Unsupported map');
    const tokens=Object.fromEntries(['colors','typography','spacing','rounded','components'].filter(k=>data[k]!==undefined).map(k=>[k,data[k]]));
    return {raw,data,status:'parsed',tokens:Object.keys(tokens).length?tokens:null};
  }catch{return {raw,data:null,status:'unparsed',tokens:null};}
}
function readmeCategory(readme:string,slug:string){
  let category:string|null=null;
  for(const line of readme.split(/\r?\n/)){if(line.startsWith('### '))category=line.slice(4).trim();
    for(const link of line.matchAll(/\]\((https:\/\/getdesign\.md\/[^)\s]+)\)/g)){try{if(new URL(link[1]).pathname===`/${slug}/design-md`)return category;}catch{}}
  }return null;
}
export interface CatalogSource {slug:string;record:Record<string,any>;markdown:string}
/** All files and attribution are validated before any connection or write. */
export async function loadCatalog(directory:string):Promise<CatalogSource[]>{
  const root=await realpath(directory);
  const read=async(relative:string)=>{
    if(typeof relative!=='string'||path.isAbsolute(relative))throw new Error('Unsafe catalog file path.');
    const resolved=await realpath(path.resolve(root,relative));if(!resolved.startsWith(root+path.sep))throw new Error('Catalog path escapes input directory.');
    return readFile(resolved);
  };
  const manifest=JSON.parse((await read('manifest.json')).toString('utf8'));
  if(manifest.repository!==GITHUB_SOURCE||!manifest.complete||!manifest.discoveryComplete||manifest.counts?.discovered!==EXPECTED_STYLES||manifest.counts?.downloaded!==EXPECTED_STYLES||manifest.counts?.failed!==0||manifest.styles?.length!==EXPECTED_STYLES||!(/^[a-f0-9]{40}$/.test(manifest.commit)))throw new Error('Expected a complete verified 84-style GitHub manifest.');
  const slugs=new Set<string>(),paths=new Set<string>(),result:CatalogSource[]=[];
  for(const entry of manifest.styles){
    catalogPath(entry.slug);if(slugs.has(entry.slug)||paths.has(entry.repositoryPath))throw new Error('Duplicate catalog slug or repository path.');slugs.add(entry.slug);paths.add(entry.repositoryPath);
    if(entry.status!=='succeeded'||!entry.repositoryPath?.startsWith('design-md/')||!entry.repositoryPath.endsWith('/DESIGN.md'))throw new Error('Invalid source style record.');
    const stem=githubFilename(entry.repositoryPath),base=`snapshots/${manifest.commit}/styles/${stem}`;
    if(entry.markdownFile!==base+'.md'||entry.metadataFile!==base+'.json')throw new Error('Style file paths differ from verified manifest layout.');
    const bytes=await read(entry.markdownFile),markdown=bytes.toString('utf8'),metadata=JSON.parse((await read(entry.metadataFile)).toString('utf8'));
    if(!markdown.trim()||!Buffer.from(markdown).equals(bytes)||digest(bytes)!==entry.contentHash||bytes.length!==entry.bytes)throw new Error('Missing, empty, corrupted or invalid UTF-8 Markdown: '+entry.slug);
    const blob=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');if(blob!==entry.gitBlob)throw new Error('Git blob mismatch: '+entry.slug);
    for(const key of ['slug','title','titleSource','repositoryPath','sourceUrl','gitBlob','contentHash','bytes','status','license'])if(!same(entry[key],metadata[key]))throw new Error('Manifest/metadata mismatch: '+entry.slug+'/'+key);
    const expectedUrl=`${GITHUB_SOURCE}/blob/${manifest.commit}/${entry.repositoryPath.split('/').map(encodeURIComponent).join('/')}`;
    if(metadata.repository!==GITHUB_SOURCE||metadata.commit!==manifest.commit||metadata.sourceUrl!==expectedUrl||metadata.license?.status!=='repository-license'||!metadata.license.localFiles?.length)throw new Error('Source provenance/license mismatch: '+entry.slug);
    const licenseDocuments=[];
    for(const [i,file] of metadata.license.localFiles.entries()){const license=await read(file);if(!license.toString('utf8').trim())throw new Error('Empty source license.');licenseDocuments.push({sourcePath:metadata.license.sourcePaths[i],sourceUrl:metadata.license.sourceUrls[i],text:license.toString('utf8'),contentHash:digest(license)});}
    const attributionReadme=(await read(metadata.attributionReadme)).toString('utf8');
    const styleReadme=metadata.styleReadme?(await read(metadata.styleReadme)).toString('utf8'):null;
    const front=extractFrontMatter(markdown),category=readmeCategory(attributionReadme,entry.slug);
    const stableMetadata={...metadata};delete stableMetadata.fetchedAt;
    const record={catalogImporter:IMPORTER,schemaVersion:1,slug:entry.slug,title:entry.title,titleSource:entry.titleSource,
      description:typeof front.data?.description==='string'?front.data.description:null,
      category,keywords:Array.isArray(front.data?.keywords)&&front.data.keywords.every((x:unknown)=>typeof x==='string')?front.data.keywords:null,
      designTokens:front.tokens,extraction:{parser:'yaml-core',status:front.status,frontMatterRaw:front.raw,frontMatterJson:front.data?JSON.stringify(front.data):null,tokensSource:'original-front-matter',categorySource:category?'repository-README-exact-style-link':null,keywordsSource:front.data?.keywords?'original-front-matter':null},
      source:{repository:GITHUB_SOURCE,commit:manifest.commit,repositoryPath:entry.repositoryPath,sourceUrl:entry.sourceUrl,gitBlobSha:entry.gitBlob,sha256:entry.contentHash,markdownBytes:bytes.length},
      sourceMetadata:stableMetadata,license:{...entry.license,documents:licenseDocuments},attribution:{repositoryReadmeSourceUrl:`${GITHUB_SOURCE}/blob/${manifest.commit}/README.md`,repositoryReadme:attributionReadme,styleReadmeSourceUrl:metadata.styleReadmeSourceUrl??null,styleReadme}};
    result.push({slug:entry.slug,record,markdown});
  }
  return result;
}
// Conservatively overestimate Firestore map/field overhead; stay below 1 MiB.
export function estimatedDocumentBytes(value:unknown):number{
  if(value===null||typeof value==='boolean'||typeof value==='number')return 16;
  if(typeof value==='string')return Buffer.byteLength(value)+32;
  if(Array.isArray(value))return 64+value.reduce((n,v)=>n+estimatedDocumentBytes(v)+16,0);
  if(value&&typeof value==='object')return 128+Object.entries(value).reduce((n,[k,v])=>n+Buffer.byteLength(k)+64+estimatedDocumentBytes(v),0);
  throw new Error('Unsupported Firestore value.');
}
export interface WritePlan {slug:string;path:string;record:Record<string,any>;chunks:{path:string;data:Record<string,any>}[]}
export function planRecord(source:CatalogSource,limit=850000):WritePlan{
  const base={...source.record,designMd:source.markdown,content:{storage:'inline',sha256:digest(source.markdown),bytes:Buffer.byteLength(source.markdown),chunkIds:[] as string[]}};
  const chunks:WritePlan['chunks']=[];
  if(estimatedDocumentBytes(base)>limit){
    base.designMd=null as any;base.content.storage='chunks';
    const parts:string[]=[];let text='',bytes=0;const budget=Math.min(350000,Math.floor(limit*.6));
    for(const char of source.markdown){const n=Buffer.byteLength(char);if(bytes+n>budget){parts.push(text);text='';bytes=0;}text+=char;bytes+=n;}if(text)parts.push(text);
    base.content.chunkIds=parts.map((text,index)=>{const id=`v-${base.content.sha256}-${String(index).padStart(6,'0')}`;const data={catalogImporter:IMPORTER,index,parentHash:base.content.sha256,text,sha256:digest(text)};chunks.push({path:catalogPath(source.slug)+'/markdownChunks/'+id,data});return id;});
  }
  const record={...base,sourceFingerprint:digest(canonical(base))};
  if(estimatedDocumentBytes(record)>limit||chunks.some(c=>estimatedDocumentBytes(c.data)>limit))throw new Error('Metadata or chunks exceed safe document-size budget: '+source.slug);
  return {slug:source.slug,path:catalogPath(source.slug),record,chunks};
}
export interface CatalogStore {projectId:string;read:(paths:string[])=>Promise<(Record<string,any>|null)[]>;apply:(plan:WritePlan,runId:string,importedAt:string)=>Promise<'created'|'updated'|'skipped'>}
export async function verified(store:CatalogStore,plan:WritePlan,record:Record<string,any>|null){
  if(!record||Object.keys(plan.record).some(k=>!same(record[k],plan.record[k])))return false;
  if(plan.chunks.length){const chunks=await store.read(plan.chunks.map(c=>c.path));if(chunks.some((c,i)=>!c||Object.keys(plan.chunks[i].data).some(k=>!same(c[k],plan.chunks[i].data[k]))))return false;
    if(digest(chunks.map(c=>c!.text).join(''))!==record.content.sha256)return false;}
  return true;
}
export async function retry<T>(operation:()=>Promise<T>,sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms)),random=Math.random):Promise<T>{
  for(let i=0;i<3;i++)try{return await operation();}catch(error){const code=(error as {code?:number|string}).code;if(i===2||![4,8,10,13,14,'deadline-exceeded','resource-exhausted','aborted','internal','unavailable'].includes(code!))throw error;await sleep(500*2**i+Math.floor(random()*250));}
  throw new Error('Retry exhausted.');
}
export async function importCatalog(plans:WritePlan[],store:CatalogStore,options:{dryRun?:boolean;emulator?:boolean;collection?:'designReferenceCatalog'|'designReferenceCatalogIndex';sleep?:(ms:number)=>Promise<void>}={}){
  if(store.projectId!==(options.emulator?'demo-frame':CATALOG_PROJECT))throw new Error('Refusing unexpected Firestore project.');
  const collection=options.collection??CATALOG_COLLECTION;
  if(plans.some(p=>p.path!==catalogPath(p.slug).replace(CATALOG_COLLECTION+'/',collection+'/')))throw new Error('Plan paths do not match the dedicated collection.');
  const result={expectedCount:plans.length,projectId:store.projectId,collection,mode:options.emulator?'emulator':'live',dryRun:!!options.dryRun,created:0,updated:0,skipped:0,verifiedRecords:0,failedRecords:[] as {slug:string;code:string}[],plannedCreates:0,plannedUpdates:0,plannedSkips:0,chunkedStyles:plans.filter(p=>p.chunks.length).map(p=>p.slug),complete:false};
  const runId=randomUUID(),importedAt=new Date().toISOString();
  for(const plan of plans){try{
    const [existing]=await retry(()=>store.read([plan.path]),options.sleep);
    if(existing&&existing.catalogImporter!==IMPORTER)throw Object.assign(new Error('Foreign catalog document.'),{code:'foreign-document'});
    const unchanged=await retry(()=>verified(store,plan,existing),options.sleep);
    if(unchanged)result.plannedSkips++;else if(existing)result.plannedUpdates++;else result.plannedCreates++;
    if(options.dryRun)continue;
    const action=unchanged?'skipped':await retry(()=>store.apply(plan,runId,importedAt),options.sleep);result[action]++;
  }catch(error){result.failedRecords.push({slug:plan.slug,code:String((error as {code?:unknown}).code??'operation-failed')});}}
  if(!options.dryRun)for(const plan of plans){try{
    if(await retry(async()=>verified(store,plan,(await store.read([plan.path]))[0]),options.sleep))result.verifiedRecords++;else if(!result.failedRecords.some(e=>e.slug===plan.slug))result.failedRecords.push({slug:plan.slug,code:'readback-mismatch'});
  }catch(error){if(!result.failedRecords.some(e=>e.slug===plan.slug))result.failedRecords.push({slug:plan.slug,code:String((error as {code?:unknown}).code??'readback-failed')});}}
  result.complete=!options.dryRun&&result.failedRecords.length===0&&result.verifiedRecords===plans.length;return result;
}
