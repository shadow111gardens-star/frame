import {test} from 'node:test';
import assert from 'node:assert/strict';
import {unzipSync} from 'fflate';
import {safeFilename,screenFilenames,checkDimensions,zipImages,ExportAssets} from '../src/design/imageExport';
test('image names are safe, Unicode-aware, unique and use the correct extensions',()=>{
  assert.deepEqual(screenFilenames(['Portfolio Home','Portfolio Home','portfolio-home-2','../Portfolio:Home?','CON','ગુજરાતી'],'jpeg'),['portfolio-home.jpg','portfolio-home-2.jpg','portfolio-home-2-2.jpg','portfolio-home-3.jpg','screen-con.jpg','ગુજરાતી.jpg']);
  assert.equal(safeFilename(''), 'screen');assert.ok(!safeFilename('../../A<B> | X').includes('/'));
});
test('complete long-page dimensions are accepted; unsafe and invalid images are rejected',()=>{
  assert.doesNotThrow(()=>checkDimensions(1440,3800));assert.doesNotThrow(()=>checkDimensions(390,844));
  for(const [w,h] of [[0,10],[100,NaN],[100.5,20],[4000,20000],[10,20001]])assert.throws(()=>checkDimensions(w,h));
});
test('ZIP contains separately named image bytes and rejects empty archives',async()=>{
  const data={'home.png':new Uint8Array([137,80,78,71]),'about.png':new Uint8Array([1,2,3])};
  const blob=await zipImages(data);assert.equal(blob.type,'application/zip');assert.deepEqual(unzipSync(new Uint8Array(await blob.arrayBuffer())),data);
  await assert.rejects(()=>zipImages({}),/no screen images/);
});
test('missing and inaccessible assets fail rather than silently removing images',async()=>{
  const original=globalThis.fetch;globalThis.fetch=(async()=>new Response('missing',{status:404})) as typeof fetch;
  try{const assets=new ExportAssets();await assert.rejects(()=>assets.get('https://example.test/missing.png'),/Asset request failed/);assets.clear();}finally{globalThis.fetch=original;}
});

test('cancelled ZIP jobs stop without returning a downloadable archive',async()=>{
  const controller=new AbortController();controller.abort();await assert.rejects(()=>zipImages({'a.png':new Uint8Array([1])},controller.signal),/cancelled/);
});
