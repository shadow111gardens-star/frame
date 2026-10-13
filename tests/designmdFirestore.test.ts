import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,unlink} from 'node:fs/promises';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {GITHUB_SOURCE,githubFilename} from '../scripts/designmdGithubImport';
import {CATALOG_PROJECT,IMPORTER,catalogPath,loadCatalog,planRecord,importCatalog,extractFrontMatter,estimatedDocumentBytes,type CatalogStore,type WritePlan} from '../scripts/designmdFirestoreCatalog';
import {adminCatalogStore} from '../scripts/designmdFirestoreAdmin';
const hash=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
const markdown='---\r\nname: Source name\r\ndescription: Real source description\r\ncolors:\r\n  primary: "#123456"\r\nkeywords: [source, example]\r\n---\r\n# Complete source\r\n\r\nCafé 日本語 unchanged  \r\n';
async function fixture(){
 const out=await mkdtemp(path.join(tmpdir(),'frame-firestore-catalog-')),commit='a'.repeat(40),styles:any[]=[];
 const licenseFile=`snapshots/${commit}/attribution/license.txt`,readme=`snapshots/${commit}/attribution/readme.txt`;
 await mkdir(path.join(out,`snapshots/${commit}/attribution`),{recursive:true});await writeFile(path.join(out,licenseFile),'MIT License\nCopyright (c) 2026 Source Author\nPermission is hereby granted');await writeFile(path.join(out,readme),'### Real category\n- [Style](https://getdesign.md/style-0/design-md)\n');
 for(let i=0;i<84;i++){
  const slug='style-'+i,repositoryPath=`design-md/${slug}/DESIGN.md`,base=`snapshots/${commit}/styles/${githubFilename(repositoryPath)}`,bytes=Buffer.from(markdown),gitBlob=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  const entry={slug,repositoryPath,title:'Actual title '+i,titleSource:'repository-path',sourceUrl:`${GITHUB_SOURCE}/blob/${commit}/${repositoryPath}`,gitBlob,contentHash:hash(bytes),bytes:bytes.length,status:'succeeded',license:{status:'repository-license',identifier:'MIT',localFiles:[licenseFile],sourcePaths:['LICENSE'],sourceUrls:[`${GITHUB_SOURCE}/blob/${commit}/LICENSE`],attribution:['Copyright (c) 2026 Source Author']},markdownFile:base+'.md',metadataFile:base+'.json'};
  await mkdir(path.dirname(path.join(out,entry.markdownFile)),{recursive:true});await writeFile(path.join(out,entry.markdownFile),bytes);await writeFile(path.join(out,entry.metadataFile),JSON.stringify({...entry,repository:GITHUB_SOURCE,commit,attributionReadme:readme,styleReadme:null,styleReadmeSourceUrl:null,fetchedAt:'2026-10-13T00:00:00Z'}));styles.push(entry);
 }
 await writeFile(path.join(out,'manifest.json'),JSON.stringify({complete:true,discoveryComplete:true,repository:GITHUB_SOURCE,commit,counts:{discovered:84,downloaded:84,failed:0},styles}));return out;
}
class MemoryStore implements CatalogStore {
 projectId=CATALOG_PROJECT;docs=new Map<string,Record<string,any>>();writes=0;failures=new Map<string,{remaining:number;code:number}>();
 async read(paths:string[]){return paths.map(p=>this.docs.has(p)?structuredClone(this.docs.get(p)!):null);}
 async apply(plan:WritePlan,runId:string,importedAt:string){const failure=this.failures.get(plan.slug);if(failure&&failure.remaining-->0)throw Object.assign(new Error('Controlled error'),{code:failure.code});
  const old=this.docs.get(plan.path);for(const c of plan.chunks)this.docs.set(c.path,structuredClone(c.data));const action=old?'updated':'created';this.docs.set(plan.path,{...old,...structuredClone(plan.record),importRunId:runId,importedAt,importAction:action});this.writes++;return action as 'created'|'updated';}
}
test('all 84 manifest entries, raw Markdown, source-derived tokens, attribution and document paths validate',async()=>{
 const local=await loadCatalog(await fixture());assert.equal(local.length,84);assert.equal(local[0].markdown,markdown);assert.equal(local[0].record.description,'Real source description');assert.equal(local[0].record.category,'Real category');assert.equal(local[1].record.category,null);assert.deepEqual(local[0].record.keywords,['source','example']);assert.equal(local[0].record.designTokens.colors.primary,'#123456');assert.equal(local[0].record.license.documents[0].text.includes('Copyright'),true);assert.equal(local[0].record.source.sha256,hash(markdown));assert.equal(catalogPath(local[0].slug),'designReferenceCatalog/style-0');assert.throws(()=>catalogPath('../users'),/Unsafe/);
});
test('bad count, duplicate metadata, missing or corrupt Markdown fail before writing',async()=>{
 const out=await fixture(),file=path.join(out,'manifest.json'),m=JSON.parse(await readFile(file,'utf8'));
 await writeFile(file,JSON.stringify({...m,counts:{...m.counts,downloaded:83}}));await assert.rejects(loadCatalog(out),/84-style/);
 await writeFile(file,JSON.stringify(m));const md=path.join(out,m.styles[0].markdownFile);await unlink(md);await assert.rejects(loadCatalog(out),/ENOENT/);
 await writeFile(md,markdown);const metadataFile=path.join(out,m.styles[0].metadataFile),metadata=JSON.parse(await readFile(metadataFile,'utf8'));await writeFile(metadataFile,JSON.stringify({...metadata,title:'Wrong title'}));await assert.rejects(loadCatalog(out),/metadata mismatch/);await writeFile(metadataFile,JSON.stringify(metadata));
 await writeFile(md,'corrupted');await assert.rejects(loadCatalog(out),/corrupted/);
 m.styles[0].markdownFile+='missing';await writeFile(file,JSON.stringify(m));await assert.rejects(loadCatalog(out),/paths/);
});
test('all 84 import, verified readback, dry-run, unchanged rerun and source update are idempotent',async()=>{
 const sources=await loadCatalog(await fixture()),plans=sources.map(s=>planRecord(s)),store=new MemoryStore();
 const dry=await importCatalog(plans,store,{dryRun:true});assert.equal(dry.plannedCreates,84);assert.equal(store.writes,0);assert.equal(dry.complete,false);
 const first=await importCatalog(plans,store);assert.equal(first.created,84);assert.equal(first.verifiedRecords,84);assert.equal(first.complete,true);
 const second=await importCatalog(plans,store);assert.equal(second.skipped,84);assert.equal(store.writes,84);assert.equal(second.updated,0);
 const changed=structuredClone(plans),updatedMarkdown=markdown+'\nNew source content\n',updatedBytes=Buffer.from(updatedMarkdown);
 changed[0]=planRecord({...sources[0],record:{...sources[0].record,title:'Changed source title',source:{...sources[0].record.source,sha256:hash(updatedMarkdown),markdownBytes:updatedBytes.length,gitBlobSha:createHash('sha1').update(`blob ${updatedBytes.length}\0`).update(updatedBytes).digest('hex')}},markdown:updatedMarkdown});
 const update=await importCatalog(changed,store);assert.equal(update.updated,1);assert.equal(update.skipped,83);assert.equal(update.complete,true);
 assert.equal(store.docs.get(plans[0].path)!.license.documents[0].text,plans[0].record.license.documents[0].text);
 assert.equal(store.docs.get(plans[0].path)!.designMd,updatedMarkdown);assert.equal(store.docs.get(plans[0].path)!.source.sha256,hash(updatedMarkdown));
});
test('large UTF-8 Markdown is deterministic bounded chunks, reassembled and verified without truncation',async()=>{
 const source=(await loadCatalog(await fixture()))[0];source.markdown='🧪 café 日本語\r\n'.repeat(150000);source.record.source.sha256=hash(source.markdown);const plan=planRecord(source);
 assert.ok(plan.chunks.length>1);assert.equal(plan.record.designMd,null);assert.ok(plan.chunks.every(c=>estimatedDocumentBytes(c.data)<850000));assert.equal(plan.chunks.map(c=>c.data.text).join(''),source.markdown);assert.deepEqual(plan.chunks,planRecord(source).chunks);
 const store=new MemoryStore(),report=await importCatalog([plan],store);assert.equal(report.complete,true);assert.deepEqual(report.chunkedStyles,[source.slug]);
 store.docs.get(plan.chunks[0].path)!.text='broken';const repaired=await importCatalog([plan],store);assert.equal(repaired.updated,1);assert.equal(repaired.complete,true);
});
test('bounded retries, partial failures, foreign record protection and wrong-project guard',async()=>{
 const plans=(await loadCatalog(await fixture())).map(s=>planRecord(s)),store=new MemoryStore();store.failures.set('style-0',{remaining:2,code:14});store.failures.set('style-1',{remaining:10,code:7});
 const report=await importCatalog(plans,store,{sleep:async()=>{}});assert.equal(report.complete,false);assert.equal(report.verifiedRecords,83);assert.equal(report.failedRecords.length,1);
 store.docs.set(plans[1].path,{catalogImporter:'another-owner',untouched:true});const foreign=await importCatalog([plans[1]],store);assert.equal(foreign.failedRecords[0].code,'foreign-document');assert.equal(store.docs.get(plans[1].path)!.untouched,true);
 store.projectId='wrong-project';await assert.rejects(importCatalog(plans,store),/unexpected/);
 const exhausted=new MemoryStore();exhausted.failures.set('style-0',{remaining:10,code:14});let waits=0;
 const failed=await importCatalog([plans[0]],exhausted,{sleep:async()=>{waits++;}});assert.equal(waits,2);assert.equal(exhausted.failures.get('style-0')!.remaining,7);assert.equal(failed.complete,false);assert.equal(exhausted.writes,0);
});
test('unsafe YAML and duplicate keys do not produce invented tokens or rewrite source Markdown',()=>{
 assert.equal(extractFrontMatter('---\ncolors: {a: 1, a: 2}\n---\nBody').status,'unparsed');assert.equal(extractFrontMatter('---\nx: &anchor 1\ny: *anchor\n---\nBody').tokens,null);assert.equal(extractFrontMatter('# No frontmatter').status,'absent');
});
test('actual Firestore emulator creates all 84, skips rerun, read-verifies chunks and preserves user projects',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
 const plans=(await loadCatalog(await fixture())).map(s=>planRecord(s)),store=await adminCatalogStore(true);
 const app=initializeApp({projectId:'demo-frame'},'catalog-isolation-test'),db=getFirestore(app),sentinel=db.doc('users/catalog-isolation-test/projects/untouched');
 try{
  const original={name:'User project preserved',design:{screens:[]},ownerId:'catalog-isolation-test'};await sentinel.set(original);
  const first=await importCatalog(plans,store,{emulator:true});assert.equal(first.complete,true);assert.equal(first.verifiedRecords,84);
  const second=await importCatalog(plans,store,{emulator:true});assert.equal(second.skipped,84);
  const source=(await loadCatalog(await fixture()))[0];source.markdown='🙂 source\r\n'.repeat(120000);source.record.source.sha256=hash(source.markdown);const chunk=planRecord(source);
  const update=await importCatalog([chunk],store,{emulator:true});assert.equal(update.complete,true);assert.equal(update.updated,1);
  const [actual]=await store.read([chunk.path]);assert.equal(actual!.source.sha256,hash(source.markdown));assert.equal(actual!.catalogImporter,IMPORTER);assert.equal(actual!.content.storage,'chunks');
  assert.deepEqual((await sentinel.get()).data(),original);
 }finally{await store.dispose();await db.terminate();await deleteApp(app);}
});
