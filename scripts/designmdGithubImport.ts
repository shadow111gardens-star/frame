import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,unlink,readdir} from 'node:fs/promises';
import path from 'node:path';

export const GITHUB_SOURCE='https://github.com/VoltAgent/awesome-design-md';
const exec=promisify(execFile);
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
export interface GitNode {mode:string;type:string;oid:string;path:string}
export interface GitSource {commit:string;tree:()=>Promise<GitNode[]>;blob:(oid:string)=>Promise<Buffer>}
export function parseTree(bytes:Buffer):GitNode[]{
  return bytes.toString('utf8').split('\0').filter(Boolean).map(line=>{
    const match=/^(\d{6}) (blob|tree|commit) ([a-f0-9]{40,64})\t([\s\S]+)$/.exec(line);if(!match)throw new Error('Malformed Git tree entry.');
    return {mode:match[1],type:match[2],oid:match[3],path:match[4]};
  });
}
export function githubFilename(repoPath:string){return 'style-'+repoPath.replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,70)+'-'+sha(Buffer.from(repoPath)).slice(0,12);}
const url=(commit:string,repoPath:string)=>`${GITHUB_SOURCE}/blob/${commit}/${repoPath.split('/').map(encodeURIComponent).join('/')}`;
function regular(node:GitNode){if(node.type!=='blob'||!['100644','100755'].includes(node.mode))throw new Error('Not a regular tracked file; symlinks/submodules are not followed.');}
function verifyBlob(node:GitNode,bytes:Buffer){
  regular(node);const actual=createHash(node.oid.length===40?'sha1':'sha256').update(`blob ${bytes.byteLength}\0`).update(bytes).digest('hex');
  if(actual!==node.oid)throw new Error('Git blob hash differs from the discovered tree object.');
}
const licenseName=(name:string)=>/^(?:licen[cs]e|copying)(?:[.-].*)?$/i.test(path.posix.basename(name));
export function licenseFor(repoPath:string,tree:GitNode[]){
  const folders=['',...path.posix.dirname(repoPath).split('/').map((_,i,a)=>a.slice(0,i+1).join('/'))];
  for(const folder of folders.reverse()){const found=tree.filter(n=>licenseName(n.path)&&path.posix.dirname(n.path)===(folder||'.'));if(found.length)return found;}
  return [];
}
async function atomic(file:string,bytes:Buffer){
  await mkdir(path.dirname(file),{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';
  try{await writeFile(temp,bytes,{flag:'wx'});await rename(temp,file);}finally{await unlink(temp).catch(()=>{});}
}
const json=(value:unknown)=>Buffer.from(JSON.stringify(value,null,2)+'\n','utf8');

/** Cached public shallow clone: no working tree, hooks, dependency installs or
 * source-repository instructions executed. Read blobs at one pinned commit. */
export async function githubSource(cacheDirectory:string,refresh=false):Promise<GitSource>{
  const cache=path.resolve(cacheDirectory);
  const git=async(args:string[])=>{const r=await exec('git',['-C',cache,...args],{encoding:'buffer',maxBuffer:32*1024*1024,timeout:120000,windowsHide:true});return r.stdout;};
  try{await readFile(path.join(cache,'.git','config'));}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;
    await mkdir(path.dirname(cache),{recursive:true});
    await exec('git',['-c','core.autocrlf=false','clone','--depth','1','--no-checkout',GITHUB_SOURCE+'.git',cache],{timeout:120000,windowsHide:true});
  }
  if((await git(['remote','get-url','origin'])).toString().trim()!==GITHUB_SOURCE+'.git')throw new Error('Cache belongs to a different source repository.');
  let commit:string;
  if(refresh){await git(['fetch','--depth','1','origin','HEAD']);commit=(await git(['rev-parse','FETCH_HEAD'])).toString().trim();}
  else{try{commit=(await git(['rev-parse','--verify','refs/designmd-import/snapshot'])).toString().trim();}catch{commit=(await git(['rev-parse','HEAD'])).toString().trim();}}
  if(!/^[a-f0-9]{40,64}$/.test(commit))throw new Error('Invalid pinned commit ID.');
  await git(['update-ref','refs/designmd-import/snapshot',commit]);
  return {commit,tree:async()=>parseTree(await git(['ls-tree','-r','-z',commit])),blob:oid=>git(['cat-file','blob',oid])};
}

export interface GithubEntry {repositoryPath:string;slug:string;title:string;titleSource:string;sourceUrl:string;gitBlob:string;contentHash?:string;bytes?:number;fetchedAt?:string;markdownFile?:string;metadataFile?:string;license?:{status:string;identifier:string|null;sourcePaths:string[];localFiles:string[];sourceUrls:string[];attribution:string[]};status:'succeeded'|'failed';error?:string}
export async function importGithubDesignMd(options:{outputDirectory:string;source:GitSource}){
  const out=path.resolve(options.outputDirectory),source=options.source;
  if(!/^[a-f0-9]{40,64}$/.test(source.commit))throw new Error('Invalid pinned commit ID.');
  await mkdir(out,{recursive:true});
  // Never write into the API output or an unrelated directory by accident.
  const existing=await readdir(out);
  if(existing.length){const old=JSON.parse(await readFile(path.join(out,'manifest.json'),'utf8'));if(old.repository!==GITHUB_SOURCE)throw new Error('Output directory belongs to another source.');}
  const lock=path.join(out,'.github-import.lock');await writeFile(lock,String(process.pid),{flag:'wx'});
  try{
    const tree=await source.tree(),designs=tree.filter(n=>n.path.startsWith('design-md/')&&path.posix.basename(n.path).toLowerCase()==='design.md').sort((a,b)=>a.path.localeCompare(b.path));
    const startedAt=new Date().toISOString(),snapshot='snapshots/'+source.commit,entries:GithubEntry[]=[],errors:string[]=[];
    if(!designs.length)errors.push('No DESIGN.md files found under design-md.');
    if(tree.some(n=>n.path.startsWith('design-md/')&&n.mode==='160000'))errors.push('Submodule under design-md was not inspected; completeness cannot be claimed.');
    const licenses=new Map<string,{localFile:string;identifier:string|null;text:string;attribution:string[]}>(),attributionFiles=new Map<string,string>();
    // Preserve every tracked license and notice, plus README attribution. No
    // redistribution notice is inserted into or removed from source Markdown.
    for(const node of tree.filter(n=>licenseName(n.path)||/^notice(?:\..*)?$/i.test(path.posix.basename(n.path))||n.path==='README.md'||n.path.startsWith('design-md/')&&path.posix.basename(n.path)==='README.md')){
      try{const bytes=await source.blob(node.oid);verifyBlob(node,bytes);const localFile=snapshot+'/attribution/'+githubFilename(node.path)+'.txt';await atomic(path.join(out,localFile),bytes);attributionFiles.set(node.path,localFile);
        if(licenseName(node.path)){const text=bytes.toString('utf8');licenses.set(node.path,{localFile,text,identifier:/MIT License/.test(text)&&/Permission is hereby granted/.test(text)?'MIT':null,attribution:text.split(/\r?\n/).filter(line=>/copyright/i.test(line)).map(line=>line.trim())});}
      }catch(error){errors.push('Attribution '+node.path+': '+message(error));}
    }
    for(const node of designs){
      const stem=githubFilename(node.path),slug=path.posix.dirname(node.path).replace(/^design-md\/?/,'')||'design-md';
      const entry:GithubEntry={repositoryPath:node.path,slug,title:slug,titleSource:'repository-path',sourceUrl:url(source.commit,node.path),gitBlob:node.oid,status:'failed'};
      try{
        const bytes=await source.blob(node.oid);verifyBlob(node,bytes);const text=bytes.toString('utf8');
        if(!bytes.length||!text.trim())throw new Error('Source Markdown is empty.');
        if(!Buffer.from(text,'utf8').equals(bytes))throw new Error('Source Markdown is not valid UTF-8; original bytes were not rewritten.');
        const heading=/^#\s+(.+?)\s*#*\s*$/m.exec(text)?.[1];if(heading){entry.title=heading;entry.titleSource='markdown-heading';}
        const applicable=licenseFor(node.path,tree),local=applicable.map(n=>licenses.get(n.path));
        const explicit=[...text.matchAll(/SPDX-License-Identifier:\s*([A-Za-z0-9.+-]+)/g)].map(m=>m[1]);
        const identified=local.length===1&&local[0]?.identifier;
        const missing=!applicable.length,ambiguous=applicable.length>1||local.some(l=>!l?.text.trim())||!identified||explicit.some(id=>id!==identified);
        entry.license={status:missing?'missing':ambiguous?'ambiguous':'repository-license',identifier:identified||null,sourcePaths:applicable.map(n=>n.path),localFiles:local.flatMap(l=>l?[l.localFile]:[]),sourceUrls:applicable.map(n=>url(source.commit,n.path)),attribution:local.flatMap(l=>l?.attribution??[])};
        entry.contentHash=sha(bytes);entry.bytes=bytes.length;entry.fetchedAt=startedAt;
        entry.markdownFile=snapshot+'/styles/'+stem+'.md';entry.metadataFile=snapshot+'/styles/'+stem+'.json';
        await atomic(path.join(out,entry.markdownFile),bytes);entry.status='succeeded';
        const siblingReadme=path.posix.join(path.posix.dirname(node.path),'README.md');
        await atomic(path.join(out,entry.metadataFile),json({...entry,repository:GITHUB_SOURCE,commit:source.commit,attributionReadme:attributionFiles.get('README.md')??null,styleReadme:attributionFiles.get(siblingReadme)??null,styleReadmeSourceUrl:attributionFiles.has(siblingReadme)?url(source.commit,siblingReadme):null}));
        const saved=await readFile(path.join(out,entry.markdownFile));const metadata=JSON.parse(await readFile(path.join(out,entry.metadataFile),'utf8'));
        if(!saved.equals(bytes)||sha(saved)!==metadata.contentHash||metadata.repositoryPath!==node.path)throw new Error('Saved Markdown/metadata failed source integrity validation.');
      }catch(error){entry.status='failed';entry.error=message(error);}
      entries.push(entry);
    }
    const successful=entries.filter(e=>e.status==='succeeded'),licenseIssues=entries.filter(e=>e.license&&['missing','ambiguous'].includes(e.license.status));
    const manifest={version:1,repository:GITHUB_SOURCE,commit:source.commit,startedAt,finishedAt:new Date().toISOString(),discoveryComplete:!errors.length,complete:!errors.length&&entries.length>0&&successful.length===designs.length,counts:{discovered:designs.length,downloaded:successful.length,failed:entries.length-successful.length,missingOrAmbiguousLicense:licenseIssues.length,markdownBytes:successful.reduce((n,e)=>n+(e.bytes??0),0)},errors,licensingIssues:licenseIssues.map(e=>({repositoryPath:e.repositoryPath,license:e.license})),styles:entries};
    // Previous snapshot and manifests remain available after a refresh/rerun.
    await atomic(path.join(out,snapshot,'manifest.json'),json(manifest));
    try{const old=await readFile(path.join(out,'manifest.json'));await atomic(path.join(out,'runs',sha(old)+'.json'),old);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
    await atomic(path.join(out,'manifest.json'),json(manifest));return manifest;
  }finally{await unlink(lock).catch(()=>{});}
}
const message=(error:unknown)=>error instanceof Error?error.message:String(error);
