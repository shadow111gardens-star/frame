import {test} from 'node:test';
import assert from 'node:assert/strict';
import {detectProductType} from '../server/productDetection';
import {DEFAULT_PRODUCT_TYPE,previewConfig} from '../shared/product';
import {fixture} from './fixture';
import {validateApp} from '../shared/design';

test('semantic classification sends full intent and uses the default only for ambiguity',async()=>{
  const cases=[
    ['Create a modern SaaS landing page for an AI product.','website'],
    ['Create a modern fitness tracking mobile app.','mobile_app'],
    ['Build an iOS food delivery app with Home, Search, Orders and Profile.','mobile_app'],
    ['Create an ecommerce website with Home, Products, Cart and Checkout.','website'],
    ['Advertise my phone app with a public page visitors can open in their browser.','website'],
    ['An application commuters install on their phones to find nearby stops.','mobile_app'],
  ] as const;
  for(const [prompt,expected] of cases) {
    const actual=await detectProductType(prompt,async body=>{const request=body as any;assert.equal(JSON.parse(request.contents[0].parts[0].text).prompt,prompt);assert.ok(request.systemInstruction.parts[0].text.includes('negations'));return JSON.stringify({productType:expected});});
    assert.equal(actual,expected);
    assert.equal(previewConfig(actual).frame,expected==='website'?'browser':'phone');
  }
  assert.equal(await detectProductType('Create something',async()=>'{"productType":"ambiguous"}'),DEFAULT_PRODUCT_TYPE);
  await assert.rejects(detectProductType('Design an app',async()=>'{"productType":"other"}'));
});
test('shared schema enforces product types and viewport compatibility',()=>{
  const app=fixture();assert.equal(validateApp(app).productType,'mobile_app');
  app.productType='website';assert.throws(()=>validateApp(app));
  app.screens.forEach(s=>{s.width=previewConfig('website').viewportWidth;s.height=previewConfig('website').viewportHeight;});
  assert.equal(validateApp(app).productType,'website');
  assert.throws(()=>validateApp({...app,productType:undefined}));
});
