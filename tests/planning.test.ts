import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planDesign,validatePlannedDesign,applyPlannedInsets,planningJsonSchema} from '../server/designPlanning';
import {GeminiError} from '../server/geminiResponse';
import {fixture} from './fixture';
import {planFixture} from './planFixture';
test('planning rejects inconsistent roles and visual output must preserve planned screens and tokens',async()=>{
  const app=fixture(),plan=planFixture(app);
  assert.deepEqual(await planDesign('Prompt','mobile_app',async()=>JSON.stringify(plan)),plan);
  const pill=structuredClone(plan);pill.visualTokens.radii[3].value=999;pill.designSystem.radii.push(999);
  const canonical=await planDesign('Prompt','mobile_app',async()=>JSON.stringify(pill));
  assert.equal(canonical.visualTokens.radii[3].value,500);assert.equal(canonical.designSystem.radii[canonical.designSystem.radii.length-1],500);
  validatePlannedDesign(app,plan);
  const wrong=structuredClone(plan);wrong.visualTokens.colors.accent='#123456';
  await assert.rejects(planDesign('Prompt','mobile_app',async()=>JSON.stringify(wrong)),/invalid design plan/);
  const switched=structuredClone(plan);switched.productType='website';
  await assert.rejects(planDesign('Prompt','mobile_app',async()=>JSON.stringify(switched)),/invalid design plan/);
  const changed=fixture();changed.designSystem.colors.accent='#123456';
  assert.throws(()=>validatePlannedDesign(changed,plan),/Design system changed/);
  const missing=fixture();missing.screens.pop();
  assert.throws(()=>validatePlannedDesign(missing,plan),/Missing planned screens/);
  const overflow=fixture();overflow.screens[0].components[2].position.y=840;
  assert.throws(()=>validatePlannedDesign(overflow,plan),/visible bounds/);
  const unlabeled=fixture();unlabeled.screens[0].components[2].text='';
  assert.throws(()=>validatePlannedDesign(unlabeled,plan),/control label/);
});

test('planning sends numeric bounds and platform constraints without unsupported decoder upper bounds',()=>{
  const mobile=planningJsonSchema('mobile_app') as any,web=planningJsonSchema('website') as any;
  const tokens=web.properties.visualTokens.properties;
  assert.equal(tokens.typography.items.properties.size.maximum,100);
  assert.equal(tokens.typography.items.properties.lineHeight.minimum,1);
  assert.equal(tokens.radii.items.properties.value.maximum,500);
  assert.equal(web.properties.designSystem,undefined); // Decoder uses one canonical token system; runtime derives the editable schema.
  assert.equal(tokens.typography.minItems,7);assert.equal(tokens.typography.description,'Exactly 7 entries.');
  assert.equal(tokens.spacing.minItems,6);assert.equal(tokens.radii.minItems,4);
  assert.equal(tokens.radii.items.properties.role.enum.join(','),'small,medium,large,pill');
  assert.equal(mobile.properties.visualTokens.properties.touchTarget.minimum,44);
  assert.equal(tokens.touchTarget.minimum,24);
  assert.deepEqual(web.properties.productType.enum,['website']);
  assert.ok(!JSON.stringify(web).includes('"maxItems"'));
});

test('out-of-range planning responses retain strict validation and identify the failing fields',async()=>{
  const plan=planFixture(fixture());let calls=0;
  const broken=structuredClone(plan);broken.visualTokens.radii[3].value=9999;broken.designSystem.radii.push(9999);
  await assert.rejects(planDesign('Prompt','mobile_app',async()=>{calls++;return JSON.stringify(broken);}),(e:unknown)=>e instanceof GeminiError&&e.code==='PLAN_SCHEMA'&&!e.retryable&&/visualTokens.radii.3.value/.test(e.message)&&/designSystem.radii/.test(e.message));
  assert.equal(calls,1);
  const type=structuredClone(plan) as any;type.visualTokens.radii='not an array';
  await assert.rejects(planDesign('Prompt','mobile_app',async()=>JSON.stringify(type)),/visualTokens.radii \(invalid_type\)/);
  const sizes=structuredClone(plan);sizes.visualTokens.typography[0].size=144;sizes.visualTokens.typography[0].lineHeight=0.9;
  await assert.rejects(planDesign('Prompt','mobile_app',async()=>JSON.stringify(sizes)),/visualTokens.typography.0.size/);
  const count=structuredClone(plan);count.visualTokens.typography.push({...count.visualTokens.typography[0]});
  await assert.rejects(planDesign('Prompt','mobile_app',async()=>JSON.stringify(count)),/visualTokens.typography \(too_big\)/);
  assert.deepEqual(await planDesign('Prompt','mobile_app',async()=>`\`\`\`json\n${JSON.stringify(plan)}\n\`\`\``),plan);
  await assert.rejects(planDesign('Prompt','mobile_app',async()=>'{broken'),(e:unknown)=>e instanceof GeminiError&&e.code==='MALFORMED_JSON');
});
test('direct-text surfaces receive system insets without moving nested children or overriding explicit styles',()=>{
  const app=fixture(),plan=planFixture(app);
  const nested=structuredClone(app.screens[0].components[0]);
  app.screens[0].components.push({id:'search',type:'Search',name:'Search',text:'Search activities',position:{x:20,y:500,width:350,height:44},styles:{paddingX:20}});
  applyPlannedInsets(app,plan);
  assert.deepEqual(app.screens[0].components[0],nested);
  assert.equal(app.screens[0].components[3].styles.paddingX,20);
  assert.ok(app.screens[0].components[3].styles.paddingY!>0);
  assert.equal(app.screens[0].components[3].id,'search');
  validatePlannedDesign(app,plan);
});


test('canonical model planning tokens derive the editable system without duplicate palette disagreements',async()=>{
  const original=planFixture(fixture());const {designSystem:_,...raw}=original;
  const plan=await planDesign('Create a product','mobile_app',async()=>JSON.stringify(raw));
  assert.equal(plan.designSystem.colors.card,raw.visualTokens.colors.elevatedSurface);
  assert.equal(plan.designSystem.typography.font,raw.visualTokens.typography.find(t=>t.role==='body')!.font);
  assert.deepEqual(plan.designSystem.spacing,raw.visualTokens.spacing.map(t=>t.value));
});
