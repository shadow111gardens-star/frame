import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {GITHUB_SOURCE,githubFilename,licenseFor,parseTree,importGithubDesignMd,type GitSource,type GitNode} from '../scripts/designmdGithubImport';
const mit='MIT License\n\nCopyright (c) 2026 Test Author\n\nPermission is hereby granted, free of charge.\n';
const markdown='---\r\nname: Original\r\n---\r\n# Café 日本語\r\n\r\nComplete document with trailing spaces  \r\n';
function source(files:Record<string,string|Buffer>,modes:Record<string,string>={}):GitSource {
 const blobs=new Map<string,Buffer>(),nodes:GitNode[]=[];
 for(const [file,value] of Object.entries(files)){const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8'),oid=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');blobs.set(oid,bytes);nodes.push({mode:modes[file]??'100644',type:'blob',oid,path:file});}
 return {commit:'1'.repeat(40),tree:async()=>nodes,blob:async oid=>{const bytes=blobs.get(oid);if(!bytes)throw new Error('Missing blob');return bytes;}};
}
const temp=()=>mkdtemp(path.join(tmpdir(),'frame-github-designmd-'));
test('recursive Git discovery preserves exact Markdown bytes and attributable license, without assuming layout',async()=>{
 const out=await temp(),s=source({'LICENSE':mit,'README.md':'# Source attribution\n','design-md/one/DESIGN.md':markdown,'design-md/deep/two/design.md':'# Second\n\nContent\n','design-md/DESIGN.md':'# Root document\n','other/DESIGN.md':'Excluded','design-md/one/README.md':'Site context'});
 const result=await importGithubDesignMd({source:s,outputDirectory:out});assert.equal(result.complete,true);assert.equal(result.counts.discovered,3);assert.equal(result.counts.downloaded,3);assert.equal(result.counts.failed,0);assert.equal(result.counts.missingOrAmbiguousLicense,0);
 const first=result.styles.find(e=>e.repositoryPath==='design-md/one/DESIGN.md')!;assert.equal(first.title,'Café 日本語');assert.equal(first.slug,'one');assert.equal(first.titleSource,'markdown-heading');
 assert.equal(first.sourceUrl,GITHUB_SOURCE+'/blob/'+s.commit+'/design-md/one/DESIGN.md');assert.equal(first.license?.identifier,'MIT');assert.deepEqual(first.license?.attribution,['Copyright (c) 2026 Test Author']);
 assert.ok((await readFile(path.join(out,first.markdownFile!))).equals(Buffer.from(markdown)));assert.equal(first.contentHash,createHash('sha256').update(markdown,'utf8').digest('hex'));
 assert.equal(await readFile(path.join(out,first.license!.localFiles[0]),'utf8'),mit);
 const metadata=JSON.parse(await readFile(path.join(out,first.metadataFile!),'utf8'));assert.equal(metadata.repositoryPath,first.repositoryPath);assert.equal(metadata.commit,s.commit);assert.equal(metadata.contentHash,first.contentHash);assert.equal(metadata.fetchedAt,result.startedAt);
 assert.deepEqual(JSON.parse(await readFile(path.join(out,'manifest.json'),'utf8')),result);
});
test('NUL Git tree parsing handles tabs/newlines in paths and safe path-derived filenames do not collide',()=>{
 const oid='a'.repeat(40),parsed=parseTree(Buffer.from(`100644 blob ${oid}\tdesign-md/deep/a\tb\nname/DESIGN.md\0`));assert.equal(parsed[0].path,'design-md/deep/a\tb\nname/DESIGN.md');
 assert.throws(()=>parseTree(Buffer.from('not a git tree\0')),/Malformed/);
 for(const name of ['design-md/CON/DESIGN.md','design-md/../odd/DESIGN.md','design-md/é/DESIGN.md'])assert.match(githubFilename(name),/^style-[A-Za-z0-9_-]+$/);
 assert.notEqual(githubFilename('design-md/A/DESIGN.md').toLowerCase(),githubFilename('design-md/a/DESIGN.md').toLowerCase());
});
test('empty files, symlinks and wrong Git blob data are failures, never fabricated source',async()=>{
 const s=source({'LICENSE':mit,'README.md':'Attribution','design-md/empty/DESIGN.md':'   \n','design-md/link/DESIGN.md':'../secret','design-md/good/DESIGN.md':markdown},{'design-md/link/DESIGN.md':'120000'});
 const result=await importGithubDesignMd({source:s,outputDirectory:await temp()});assert.equal(result.complete,false);assert.equal(result.counts.discovered,3);assert.equal(result.counts.downloaded,1);assert.equal(result.counts.failed,2);assert.match(result.styles.find(e=>e.slug==='link')!.error!,/symlinks/);
 const broken={...source({'LICENSE':mit,'design-md/a/DESIGN.md':markdown}),blob:async()=>Buffer.from('different object')};const bad=await importGithubDesignMd({source:broken,outputDirectory:await temp()});assert.equal(bad.complete,false);assert.equal(bad.counts.downloaded,0);assert.ok(bad.styles[0].error?.includes('hash'));
});
test('missing and ambiguous licenses are reported; closest nested license takes precedence',async()=>{
 const missing=await importGithubDesignMd({source:source({'README.md':'Attribution','design-md/a/DESIGN.md':markdown}),outputDirectory:await temp()});assert.equal(missing.counts.missingOrAmbiguousLicense,1);assert.equal(missing.styles[0].license?.status,'missing');assert.equal(missing.styles[0].license?.identifier,null);
 const nested=source({'LICENSE':mit,'README.md':'Attribution','design-md/a/LICENSE':'Different license text','design-md/a/DESIGN.md':markdown,'design-md/b/DESIGN.md':markdown});
 const nodes=await nested.tree();assert.deepEqual(licenseFor('design-md/a/DESIGN.md',nodes).map(n=>n.path),['design-md/a/LICENSE']);
 const result=await importGithubDesignMd({source:nested,outputDirectory:await temp()});assert.equal(result.counts.missingOrAmbiguousLicense,1);assert.equal(result.styles.find(e=>e.slug==='a')!.license?.status,'ambiguous');assert.equal(result.styles.find(e=>e.slug==='b')!.license?.identifier,'MIT');
 const conflict=await importGithubDesignMd({source:source({'LICENSE':mit,'README.md':'Attribution','design-md/a/DESIGN.md':markdown+'\nSPDX-License-Identifier: GPL-3.0\n'}),outputDirectory:await temp()});assert.equal(conflict.counts.missingOrAmbiguousLicense,1);
});
test('safe reruns preserve unrelated notes and prior successful source files when later blob reads fail',async()=>{
 const out=await temp(),s=source({'LICENSE':mit,'README.md':'Attribution','design-md/a/DESIGN.md':markdown});
 const first=await importGithubDesignMd({source:s,outputDirectory:out});await writeFile(path.join(out,'personal-note.txt'),'Keep me');
 const node=(await s.tree()).find(n=>n.path.endsWith('DESIGN.md'))!;
 const failing={...s,blob:async(oid:string)=>{if(oid===node.oid)throw new Error('Read interrupted');return s.blob(oid);}};
 const failed=await importGithubDesignMd({source:failing,outputDirectory:out});assert.equal(failed.complete,false);assert.equal(await readFile(path.join(out,first.styles[0].markdownFile!),'utf8'),markdown);assert.equal(await readFile(path.join(out,'personal-note.txt'),'utf8'),'Keep me');assert.ok((await readdir(path.join(out,'runs'))).length>=1);
 assert.equal((await importGithubDesignMd({source:s,outputDirectory:out})).complete,true);
});
test('refuses the API importer output and unrelated directories without changing their files',async()=>{
 const out=await temp();const original=JSON.stringify({sourceUrl:'https://designmd.app/api/styles',styles:[]});await writeFile(path.join(out,'manifest.json'),original);
 await assert.rejects(importGithubDesignMd({source:source({'LICENSE':mit,'design-md/a/DESIGN.md':markdown}),outputDirectory:out}),/another source/);assert.equal(await readFile(path.join(out,'manifest.json'),'utf8'),original);
});
