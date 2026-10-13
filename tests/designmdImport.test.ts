import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {importDesignMd,Requester,HttpError,RateLimitPause,styleFilename,listing,sourceMarkdown} from '../scripts/designmdImport';
import {contentFieldPaths,safeBodySample} from '../scripts/designmdEvidence';
const style=(slug:string)=>({id:1,slug,title:slug,description:'Source description',type:'Source category',keywords:'["serialized keyword"]',extra:{untouched:true}});
const page=(n:number,data:unknown[],total=3,totalPages=2)=>({data,pagination:{page:n,limit:50,total,totalPages}});
const temp=()=>mkdtemp(path.join(tmpdir(),'frame-designmd-test-'));
const md='---\r\ncolors: {primary: "#123456"}\r\n---\r\n\r\n# Original é 日本語\r\nTrailing spaces  \r\n';

test('all listing pages and full details, duplicate canonical slugs, exact source and manifest integrity',async()=>{
 const outputDirectory=await temp(),seen:string[]=[];
 const result=await importDesignMd({outputDirectory,requester:{async json(url){seen.push(url);if(url.includes('page=1'))return page(1,[style('one'),style('two')]);if(url.includes('page=2'))return page(2,[style('one')]);return {...style(url.endsWith('one')?'one':'two'),designmd:md};}}});
 // Duplicate rows must not hide a mismatch with the advertised unique catalog.
 assert.equal(result.complete,false);assert.equal(result.paginationComplete,false);
 assert.equal(result.summary?.totalStylesDiscovered,3);assert.equal(result.summary?.uniqueStylesProcessed,2);
 assert.equal(result.summary?.markdownFilesSaved,2);assert.equal(seen.filter(u=>!u.includes('?')).length,2);assert.ok(!seen.some(u=>u.endsWith('/token')));
 const entry=result.styles[0];assert.equal(entry.sourceUrl,'https://designmd.app/api/styles/one');assert.equal(entry.contentHash?.length,64);assert.ok(entry.fetchedAt);
 assert.equal(await readFile(path.join(outputDirectory,entry.markdownFile!),'utf8'),md);
 const saved=JSON.parse(await readFile(path.join(outputDirectory,entry.jsonFile!),'utf8'));assert.deepEqual(saved.extra,{untouched:true});assert.equal(saved.keywords,'["serialized keyword"]');assert.equal(saved.designmd,md);
 assert.deepEqual(JSON.parse(await readFile(path.join(outputDirectory,'manifest.json'),'utf8')),result);
});
test('empty final page follows metadata and an empty catalog completes without details',async()=>{
 const result=await importDesignMd({outputDirectory:await temp(),requester:{async json(url){if(url.includes('page=1'))return page(1,[style('one')],1,2);if(url.includes('page=2'))return page(2,[],1,2);return {...style('one'),designmd:md};}}});
 assert.equal(result.complete,true);assert.equal(result.pages.length,2);
 const empty=await importDesignMd({outputDirectory:await temp(),requester:{async json(){return page(1,[],0,0);}}});assert.equal(empty.complete,true);
});
test('malformed fields, detail identity mismatch, missing Markdown and failed page cannot report complete',async()=>{
 assert.throws(()=>listing({data:[],pagination:{page:2,limit:50,total:0,totalPages:0}},1),/pagination/);
 assert.throws(()=>listing(page(1,[{slug:'missing'}]),1),/metadata/);
 assert.throws(()=>sourceMarkdown({designmd:'   '}),/designmd/);
 const r=await importDesignMd({outputDirectory:await temp(),requester:{async json(url){if(url.includes('page=1'))return page(1,[style('one'),style('two')]);if(url.includes('page=2'))throw new Error('Page unavailable');return {...style('wrong'),designmd:md};}}});
 assert.equal(r.complete,false);assert.equal(r.paginationComplete,false);assert.equal(r.summary?.failedDownloads,2);assert.match(r.errors[0],/Page 2/);
});
test('partial detail failure preserves valid files on rerun and can subsequently retry successfully',async()=>{
 const outputDirectory=await temp();let fail=false;
 const requester={async json(url:string){if(url.includes('?'))return page(1,[style('one'),style('two')],2,1);if(fail&&url.endsWith('/two'))throw new HttpError(503);return {...style(url.endsWith('/one')?'one':'two'),designmd:md};}};
 const first=await importDesignMd({outputDirectory,requester});const e=first.styles[1],jsonBefore=await readFile(path.join(outputDirectory,e.jsonFile!),'utf8');
 fail=true;const second=await importDesignMd({outputDirectory,requester});assert.equal(second.complete,false);assert.equal(second.summary?.successfulDownloads,1);assert.equal(second.styles[1].status,'failed');assert.ok(second.styles[1].lastSuccessful);
 assert.equal(await readFile(path.join(outputDirectory,e.jsonFile!),'utf8'),jsonBefore);assert.equal(await readFile(path.join(outputDirectory,e.markdownFile!),'utf8'),md);
 fail=false;assert.equal((await importDesignMd({outputDirectory,requester})).complete,true);
});
test('public content authorization mismatch halts the import without repeated unauthorized probes',async()=>{
 const out=await temp(),seen:string[]=[];
 const r=await importDesignMd({outputDirectory:out,requester:{async json(url){seen.push(url);if(url.includes('?'))return page(1,[style('one'),style('two')],2,1);if(url.endsWith('/content'))throw new HttpError(401);return style(url.endsWith('one')?'one':'two');}}});
 assert.equal(r.complete,false);assert.equal(r.paginationComplete,true);assert.equal(r.styles[0].status,'failed');assert.equal(r.styles[1].status,'not_attempted');assert.equal(r.summary?.markdownFilesSaved,0);
 assert.equal(seen.length,3);assert.deepEqual(JSON.parse(await readFile(path.join(out,'errors',styleFilename('one')+'.json'),'utf8')),style('one'));
});
test('successful prose-only content is not reconstructed into complete source Markdown',async()=>{
 const r=await importDesignMd({outputDirectory:await temp(),requester:{async json(url){if(url.includes('?'))return page(1,[style('one')],1,1);if(url.endsWith('/content'))return {content:'# Only body'};return style('one');}}});
 assert.equal(r.complete,false);assert.equal(r.summary?.failedDownloads,1);assert.match(r.styles[0].error!,/designmd/);
});
test('safe filenames avoid traversal, Windows reserved names and case-insensitive collisions; exclusive lock prevents concurrent runs',async()=>{
 for(const slug of ['../../unsafe','CON','é','a/b'])assert.match(styleFilename(slug),/^style-[a-zA-Z0-9_-]+$/);
 assert.notEqual(styleFilename('A').toLowerCase(),styleFilename('a').toLowerCase());
 const out=await temp();await writeFile(path.join(out,'.import.lock'),'owned');
 await assert.rejects(importDesignMd({outputDirectory:out}),/EEXIST/);assert.equal(await readFile(path.join(out,'.import.lock'),'utf8'),'owned');
});
function clock(){let now=0;const waits:number[]=[];return {now:()=>now,sleep:async(ms:number)=>{waits.push(ms);now+=ms;},waits};}
test('429 Retry-After, network/5xx and bounded retries share throttled dispatch',async()=>{
 const c=clock(),times:number[]=[];let n=0;
 const fetcher=(async()=>{times.push(c.now());n++;if(n===1)return new Response('',{status:429,headers:{'retry-after':'5'}});if(n===2)return new Response('',{status:503});return Response.json({ok:true});}) as typeof fetch;
 const r=new Requester(fetcher,c,()=>0);assert.deepEqual(await r.json('https://designmd.app/api/styles'),{ok:true});assert.ok(times[1]-times[0]>=5000);assert.ok(times[2]-times[1]>=2100);
 const networkClock=clock();let attempts=0;await assert.rejects(new Requester((async()=>{attempts++;throw new Error('offline');}) as typeof fetch,networkClock).json('https://designmd.app/api/styles'),/Network failure/);assert.equal(attempts,3);
 let count=0;await assert.rejects(new Requester((async()=>{count++;return new Response('',{status:429,headers:{'retry-after':'120'}});}) as typeof fetch,clock()).json('https://designmd.app/api/styles'),/retry a later run/);assert.equal(count,1);
});
test('at most 29 request starts per rolling minute, permanent HTTP errors and malformed JSON are not retried',async()=>{
 const c=clock(),times:number[]=[];const client=new Requester((async()=>{times.push(c.now());return Response.json({});}) as typeof fetch,c);
 for(let i=0;i<60;i++)await client.json('https://designmd.app/api/styles');for(const t of times)assert.ok(times.filter(n=>n>=t&&n<t+60000).length<=29);
 for(const status of [400,401,403,404]){let n=0;await assert.rejects(new Requester((async()=>{n++;return new Response('',{status});}) as typeof fetch,clock()).json('https://designmd.app/api/styles'),new RegExp('HTTP '+status));assert.equal(n,1);}
 await assert.rejects(new Requester((async()=>new Response('broken')) as typeof fetch,clock()).json('https://designmd.app/api/styles'),/JSON/);
});
test('request has a timeout signal, response stream interruptions are retried and identity/content corruption preserves last valid files',async()=>{
 let requests=0;
 const fetcher=(async(_url,init)=>{assert.ok(init?.signal);requests++;if(requests===1)return new Response(new ReadableStream({start(controller){controller.error(new Error('connection reset'));}}));return Response.json({ok:true});}) as typeof fetch;
 assert.deepEqual(await new Requester(fetcher,clock(),()=>0).json('https://designmd.app/api/styles'),{ok:true});assert.equal(requests,2);
 const out=await temp();let missing=false;
 const requester={async json(url:string){if(url.includes('?'))return page(1,[style('one')],1,1);if(url.endsWith('/content'))return {content:'# Only prose'};return {...style('one'),...(missing?{}:{designmd:md})};}};
 const first=await importDesignMd({outputDirectory:out,requester});missing=true;const second=await importDesignMd({outputDirectory:out,requester});
 assert.equal(second.complete,false);assert.equal(second.styles[0].lastSuccessful?.contentHash,first.styles[0].contentHash);
 assert.equal(await readFile(path.join(out,first.styles[0].markdownFile!),'utf8'),md);assert.equal(JSON.parse(await readFile(path.join(out,first.styles[0].jsonFile!),'utf8')).designmd,md);
});
test('extended API cooldown halts remaining details, persists retry time, and prevents requests on an immediate rerun',async()=>{
 const out=await temp();let calls=0;
 const requester={async json(url:string){calls++;if(url.includes('?'))return page(1,[style('one'),style('two')],2,1);throw new RateLimitPause('HTTP 429; retry a later run',Date.now()+120000);}};
 const first=await importDesignMd({outputDirectory:out,requester});assert.equal(calls,2);assert.equal(first.complete,false);assert.equal(first.styles[0].status,'failed');assert.equal(first.styles[1].status,'not_attempted');assert.equal(first.summary?.uniqueStylesProcessed,1);
 const second=await importDesignMd({outputDirectory:out,requester});assert.equal(calls,2);assert.equal(second.complete,false);assert.match(second.errors[0],/cooldown/);assert.equal(second.catalogSource,'previous_manifest');assert.equal(second.styles.length,2);assert.ok(second.styles.every(s=>s.status==='not_attempted'));
});
test('actual public detail response is metadata only, not an overlooked nested Markdown field',async()=>{
 const raw=await readFile(new URL('./fixtures/designmd/metadata-only-detail.json',import.meta.url),'utf8');const data=JSON.parse(raw);
 assert.equal(data.slug,'minimalism-swiss-style');assert.ok(Array.isArray(JSON.parse(data.keywords)));
 assert.equal(typeof data.historical_context,'string');assert.deepEqual(contentFieldPaths(data),[]);
 assert.equal(/"designmd"\s*:/i.test(raw),false);assert.throws(()=>sourceMarkdown(data),/lacks non-empty documented designmd/);
 const complete={...data,designmd:md};assert.equal(sourceMarkdown(complete),md);
 // Diagnostics expose wrappers for inspection, never silently reinterpret them.
 assert.deepEqual(contentFieldPaths({data:complete}),['$.data.designmd:string']);
 assert.throws(()=>sourceMarkdown({data:complete}),/designmd/);
});
test('actual 401 response is permanent and never retried or parsed as Markdown',async()=>{
 const body=await readFile(new URL('./fixtures/designmd/unauthorized-content.json',import.meta.url),'utf8');assert.equal(JSON.parse(body).error,'Authorization token required');let calls=0;
 await assert.rejects(new Requester((async()=>{calls++;return new Response(body,{status:401,headers:{'content-type':'application/json','x-ratelimit-remaining':'28'}});}) as typeof fetch,clock()).json('https://designmd.app/api/styles/glassmorphism/content'),/HTTP 401/);
 assert.equal(calls,1);assert.throws(()=>sourceMarkdown(JSON.parse(body)),/designmd/);
});
test('diagnostic samples are bounded and redact credential values without exposing arbitrary headers',()=>{
 const sample=safeBodySample(JSON.stringify({access_token:'secretvalue',api_key:'hiddenvalue',error:'Authorization token required',text:'x'.repeat(1000)}));
 assert.ok(sample.length<=512);assert.ok(!sample.includes('secretvalue'));assert.ok(!sample.includes('hiddenvalue'));assert.match(sample,/Authorization token required/);
});
test('incremental resume refreshes listing and fetches only missing/failed styles, preserving valid downloaded source',async()=>{
 const out=await temp();
 const first=await importDesignMd({outputDirectory:out,requester:{async json(url){if(url.includes('?'))return page(1,[style('one'),style('two')],2,1);if(url.endsWith('/two'))throw new HttpError(503);return {...style('one'),designmd:md};}}});
 const preserved=await readFile(path.join(out,first.styles[0].jsonFile!),'utf8'),seen:string[]=[];
 const second=await importDesignMd({outputDirectory:out,resume:true,requester:{async json(url){seen.push(url);if(url.includes('?'))return page(1,[style('one'),style('two')],2,1);assert.ok(url.endsWith('/two'));return {...style('two'),designmd:md};}}});
 assert.equal(second.complete,true);assert.equal(second.summary?.retainedDownloads,1);assert.equal(second.summary?.successfulDownloads,1);assert.equal(second.summary?.markdownFilesSaved,1);assert.equal(second.summary?.uniqueStylesProcessed,1);assert.equal(seen.length,2);
 assert.equal(await readFile(path.join(out,first.styles[0].jsonFile!),'utf8'),preserved);
});
test('one corrupt cached pair is retried without discarding other verified cached styles',async()=>{
 const out=await temp();const valid={async json(url:string){if(url.includes('?'))return page(1,[style('one'),style('two')],2,1);return {...style(url.endsWith('/one')?'one':'two'),designmd:md};}};
 const first=await importDesignMd({outputDirectory:out,requester:valid});await writeFile(path.join(out,first.styles[0].jsonFile!),'invalid JSON');const seen:string[]=[];
 const result=await importDesignMd({outputDirectory:out,resume:true,requester:{async json(url){seen.push(url);return valid.json(url);}}});
 assert.equal(result.complete,true);assert.equal(result.summary?.retainedDownloads,1);assert.equal(result.summary?.successfulDownloads,1);assert.equal(seen.filter(u=>!u.includes('?')).length,1);assert.ok(seen.some(u=>u.endsWith('/one')));
});
test('HTTP-date Retry-After is respected and long cooldown halts without another request',async()=>{
 const c=clock();let calls=0;const fetcher=(async()=>{calls++;return new Response('',{status:429,headers:{'retry-after':new Date(c.now()+120000).toUTCString()}});}) as typeof fetch;
 await assert.rejects(new Requester(fetcher,c).json('https://designmd.app/api/styles'),RateLimitPause);assert.equal(calls,1);
});
test('refetching failed metadata preserves the original raw error evidence',async()=>{
 const out=await temp();let description='first response';const requester={async json(url:string){if(url.includes('?'))return page(1,[style('one')],1,1);if(url.endsWith('/content'))throw new HttpError(401);return {...style('one'),description};}};
 const first=await importDesignMd({outputDirectory:out,requester});const before=await readFile(path.join(out,first.styles[0].metadataFile!),'utf8');
 description='changed response';await importDesignMd({outputDirectory:out,resume:true,requester});
 const history=path.join(out,'error-history',styleFilename('one'));const files=await readdir(history);assert.equal(files.length,1);assert.equal(await readFile(path.join(history,files[0]),'utf8'),before);
 assert.equal(JSON.parse(await readFile(path.join(out,first.styles[0].metadataFile!),'utf8')).description,'changed response');
});
