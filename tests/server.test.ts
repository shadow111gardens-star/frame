import {designMdFixture,specificationFixture} from './designMdFixture';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {designRoute} from '../server/gemini';
import {fixture} from './fixture';
import {previewConfig,type ProductType} from '../shared/product';
import {planFixture} from './planFixture';
test('server forwards exact prompts, uses the server key and validates generation and modifications',async()=>{
  const originalFetch=globalThis.fetch;
  const forwarded:Record<string,unknown>[]=[];
  let analysisType:ProductType|undefined;
  let qualityChanged=false;let bad=false;let mismatch=false;let badPlan=false;let badAnalysis=false;let upstreamFail=false;let productType:ProductType='mobile_app';
  globalThis.fetch=(async(input,init)=>{
    if(String(input).startsWith('https://generativelanguage.googleapis.com')) {
      assert.equal((init?.headers as Record<string,string>)['x-goog-api-key'],'server-only-key');
      const request=JSON.parse(String(init?.body));
      forwarded.push(request);
      if(upstreamFail)return new Response('{}',{status:503});
      const properties=request.generationConfig.responseJsonSchema.properties;
      if(properties.plan){const a=fixture();a.productType=productType;a.screens.forEach(screen=>{screen.width=previewConfig(productType).viewportWidth;screen.height=previewConfig(productType).viewportHeight;});const spec=specificationFixture(planFixture(a),JSON.parse(request.contents[0].parts[0].text).originalPrompt,badAnalysis?{}:{productType:analysisType??productType,screens:[]});if(badPlan)spec.plan={} as any;return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(spec)}]}}]});}
      if(properties.designMd){const payload=JSON.parse(request.contents[0].parts[0].text);return Response.json({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify(designMdFixture(payload.designPlan,payload.originalPrompt))}]}}]});}
      if(!properties.app && !properties.visualTokens) return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:badAnalysis?'{}':JSON.stringify({productType:analysisType??productType,category:'fitness',audience:'Adults',styleHints:[],theme:'unspecified',preferences:{style:[],colors:[],typography:[],branding:[]},goals:[],screens:[],sections:[],uxNeeds:['data']})}]}}]}));
      const app=fixture();app.productType=productType;
      app.screens.forEach(s=>{s.width=previewConfig(productType).viewportWidth;s.height=previewConfig(productType).viewportHeight;});
      if(properties.visualTokens)return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:badPlan?'{}':JSON.stringify(planFixture(app))}]}}]}));
      if(qualityChanged)app.screens[1].components[0].text='Unrelated edit';
      if(mismatch){app.productType='website';app.screens.forEach(s=>s.width=1440);}
      return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:bad?'{}':JSON.stringify({message:'Created screens',app})}]}}]}));
    }
    return originalFetch(input,init);
  }) as typeof fetch;
  const route=designRoute({GEMINI_API_KEY:'server-only-key',GEMINI_MODEL:'configured-model'},async()=> 'test-uid');
  const server=createServer((req,res)=>void route(req,res,()=>{res.writeHead(404);res.end();}));
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/design`;
  const post=(body:unknown)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  try {
    const prompt='  Create a Fitness app.\nHome and Profile.  ';
    const result=await post({mode:'generate',prompt});assert.equal(result.status,200);
    assert.equal(JSON.parse((forwarded[0] as any).contents[0].parts[0].text).originalPrompt,prompt);
    assert.ok((forwarded[0] as any).systemInstruction.parts[0].text.includes('COMBINED SPECIFICATION'));
    const generated=JSON.parse((forwarded[1] as any).contents[0].parts[0].text);
    assert.equal(generated.prompt,prompt);assert.ok(generated.designMd);assert.equal(generated.designPlan.screens.length,2);
    const mobileInstruction=(forwarded[1] as any).systemInstruction.parts[0].text;
    assert.ok(mobileInstruction.includes('MOBILE DESIGN QUALITY'));assert.ok(mobileInstruction.includes('STRUCTURED EDITABLE OUTPUT'));
    assert.equal(forwarded.length,2);
    const update=await post({mode:'modify',prompt:'Make the button purple',app:fixture(),activeScreen:'home'});assert.equal(update.status,200);
    assert.equal(JSON.parse((forwarded[2] as any).contents[0].parts[0].text).currentDesign.screens[0].components[1].text,'Daily activity');
    assert.equal(forwarded.length,3);
    assert.equal(JSON.parse((forwarded[2] as any).contents[0].parts[0].text).designPlan,undefined);
    const editInput=JSON.parse((forwarded[2] as any).contents[0].parts[0].text);
    assert.equal(editInput.activeScreen,'home');assert.equal(editInput.designMd,undefined);

    const modification=(forwarded[2] as any).systemInstruction.parts[0].text;
    assert.ok(modification.includes('MODIFY THE EXISTING DESIGN'));
    assert.ok(modification.includes('Treat currentDesign as the source of truth'));
    assert.ok(modification.includes('do not recolor unrelated screens or rewrite content'));
    assert.ok(modification.includes('keep every existing ID stable'));
    const evidence={issues:[{screenId:'home',componentIds:['button'],code:'contrast',severity:'warning',detail:'Measured contrast 1.2:1'}],screenshots:[{screenId:'home',data:'/9j/2Q=='}]};
    const quality=await post({mode:'modify',prompt,app:fixture(),qualityReview:evidence});assert.equal(quality.status,200);
    const qualityRequest=forwarded[forwarded.length-1] as any;
    assert.equal(qualityRequest.contents[0].parts[2].inlineData.mimeType,'image/jpeg');assert.equal(qualityRequest.contents[0].parts[2].inlineData.data,evidence.screenshots[0].data);
    assert.equal(JSON.parse(qualityRequest.contents[0].parts[0].text).qualityReview.issues[0].code,'contrast');
    qualityChanged=true;const protectedScreen=await post({mode:'modify',prompt,app:fixture(),qualityReview:evidence});assert.equal(protectedScreen.status,200);assert.deepEqual((await protectedScreen.json()).app.screens[1],fixture().screens[1]);qualityChanged=false;
    assert.equal((await post({mode:'modify',prompt,app:fixture(),qualityReview:{issues:[{...evidence.issues[0],screenId:'unknown'}],screenshots:[]}})).status,400);
    assert.equal((await post({mode:'modify',prompt,app:fixture(),qualityReview:{issues:[],screenshots:[{screenId:'home',data:'invalid-url'}]}})).status,400);
    mismatch=true;assert.equal((await post({mode:'modify',prompt:'Convert to a website',app:fixture()})).status,502);mismatch=false;
    assert.equal((await post({mode:'modify',prompt:'Change',app:{}})).status,400);
    assert.equal((await post({mode:'generate',prompt:''})).status,400);
    productType='website';
    const website=await post({mode:'generate',prompt:'Create a premium SaaS landing website.'});
    assert.equal(website.status,200);
    const websiteApp=(await website.json()).app;
    const webInstruction=(forwarded[forwarded.length-1] as any).systemInstruction.parts[0].text;
    assert.ok(webInstruction.includes('WEBSITE DESIGN QUALITY'));
    assert.ok(!webInstruction.includes('MOBILE DESIGN QUALITY'));
    assert.ok(!webInstruction.includes('44 logical pixels'));
    assert.ok(webInstruction.includes('1440 by 900'));
    assert.ok(webInstruction.includes('PROJECT DESIGN SYSTEM'));
    const calls=forwarded.length;
    assert.equal((await post({mode:'modify',prompt:'Add a settings page.',app:websiteApp,editScope:'project'})).status,200);
    assert.equal(forwarded.length,calls+1); // Existing product type skips classification.
    const webUpdate=(forwarded[forwarded.length-1] as any).systemInstruction.parts[0].text;
    assert.ok(webUpdate.includes('WEBSITE DESIGN QUALITY'));
    assert.ok(webUpdate.includes('MODIFY THE EXISTING DESIGN'));
    assert.ok(!webUpdate.includes('MOBILE DESIGN QUALITY'));
    assert.ok(!/mcp\.appllama|appllama-usage|Appllama API/.test(webUpdate));
    for(const selected of ['website','mobile_app'] as const) {
      productType=selected;analysisType=selected==='website'?'mobile_app':'website';
      const start=forwarded.length;
      const explicit=await post({mode:'generate',prompt:'Create the other product type',productType:selected});
      assert.equal(explicit.status,200);assert.equal((await explicit.json()).app.productType,selected);
      assert.equal(JSON.parse((forwarded[start] as any).contents[0].parts[0].text).selectedProductType,selected);
      for(const request of forwarded.slice(start+1)) assert.equal(JSON.parse((request as any).contents[0].parts[0].text).productType,selected);
    }
    analysisType=undefined;productType='website';
    const count=forwarded.length;
    assert.equal((await post({mode:'generate',prompt:'Create design',productType:'tablet'})).status,400);
    assert.equal((await post({mode:'modify',prompt:'Change design',app:fixture(),productType:'website'})).status,400);
    assert.equal(forwarded.length,count);
    badPlan=true;const before=forwarded.length;
    const invalidPlan=await post({mode:'generate',prompt:'Create app'});assert.equal(invalidPlan.status,502);
    const planError=await invalidPlan.json();assert.equal(planError.code,'PLAN_SCHEMA');assert.equal(planError.retryable,false);assert.equal(planError.app,undefined);
    assert.equal(forwarded.length,before+2); // Invalid plan never enters visual generation.
    badPlan=false;
    badAnalysis=true;const beforeAnalysis=forwarded.length;
    const invalidAnalysis=await post({mode:'generate',prompt:'Create app'});assert.equal(invalidAnalysis.status,502);
    const analysisError=await invalidAnalysis.json();assert.equal(analysisError.code,'ANALYSIS_SCHEMA');assert.equal(analysisError.retryable,false);assert.match(analysisError.error,/productType/);assert.equal(analysisError.app,undefined);
    assert.equal(forwarded.length,beforeAnalysis+2);badAnalysis=false;
    upstreamFail=true;const beforeRetries=forwarded.length;const failure=await post({mode:'modify',prompt:'Change button',app:fixture()});
    assert.equal(failure.status,502);const upstreamError=await failure.json();assert.equal(upstreamError.app,undefined);assert.equal(upstreamError.upstreamStatus,503);assert.equal(upstreamError.code,'UPSTREAM');assert.equal(forwarded.length-beforeRetries,3);upstreamFail=false;
    bad=true;assert.equal((await post({mode:'generate',prompt:'Create app'})).status,502);
    assert.equal((await fetch(url)).status,405);
    assert.equal((await fetch(url,{method:'POST',headers:{Origin:'https://unrelated.example'}})).status,403);
  } finally {globalThis.fetch=originalFetch;await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
});
