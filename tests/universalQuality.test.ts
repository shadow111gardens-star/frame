import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compositionEvidence,plannedRegionEvidence} from '../src/design/compositionQuality';
import {buildDesignInstructions} from '../server/designInstructions';
import {UI_QUALITY_CONTRACT,explicitHierarchySchema} from '../server/uiQualityInstructions';
import {responseJsonSchema,responseSchema} from '../shared/design';
import {fixture} from './fixture';
import {flowTextGrowth} from '../src/design/textLayout';

test('deterministic flow text repair grows only fixed leaf height and preserves placement and native sizing',()=>{
 const app=fixture(),nodes=app.screens[0].components;nodes[0].styles.layout='flex';
 const child=nodes.find(c=>nodes[0].children?.includes(c.id))!;child.text='Wrapped label';
 const original=structuredClone(child.position),height=original.height+20;
 assert.deepEqual(flowTextGrowth(nodes,{[child.id]:height})[child.id],{...original,height});
 assert.deepEqual(child.position,original);
 for(const sizing of ['hug','fill'] as const){child.styles.height=sizing;assert.deepEqual(flowTextGrowth(nodes,{[child.id]:height}),{});}
 child.styles.height='fixed';assert.deepEqual(flowTextGrowth(nodes,{[child.id]:original.height}),{});
 const legacy=nodes.map(c=>c.id===child.id?{...c,position:undefined}:c);
 assert.deepEqual(flowTextGrowth(legacy,{[child.id]:80})[child.id],{x:0,y:0,width:100,height:80});
});

test('provider hierarchy projection requires children without changing saved project compatibility',()=>{
 const original=JSON.stringify(responseJsonSchema),projected=explicitHierarchySchema(responseJsonSchema) as any;
 assert.ok(projected.properties.app.properties.screens.items.properties.components.items.required.includes('children'));
 assert.equal(JSON.stringify(responseJsonSchema),original);
 assert.ok(responseSchema.safeParse({message:'Legacy',app:fixture()}).success);
});
import {materialRenderedDefects} from '../shared/materialDefects';
import {requestedScreenDetails} from '../server/screenRequirements';

test('named screen is not extended by the following product-purpose clause',()=>{
 assert.deepEqual(requestedScreenDetails('Create exactly one screen named Shop for a refined outdoor equipment e-commerce website named Ridgeline.',[]).map(s=>s.expectedName),['Shop']);
 assert.deepEqual(requestedScreenDetails('Create a screen named Planning for Tomorrow.',[]).map(s=>s.expectedName),['Planning for Tomorrow']);
 assert.deepEqual(requestedScreenDetails('Create a screen named "Looking for a Job" for a careers website.',[]).map(s=>s.expectedName),['Looking for a Job']);
});

test('first viewport gaps include sparse tails without a minimum component-fill quota',()=>{
 const boxes=[0,1,2].map(i=>({id:String(i),x:20,y:20+i*40,width:240,height:30}));
 const issues=compositionEvidence('screen',boxes,900);
 assert.equal(issues.length,1);assert.equal(issues[0].severity,'warning');
 assert.match(issues[0].detail,/first viewport/);assert.equal(materialRenderedDefects(issues).length,0);
 assert.equal(compositionEvidence('screen',boxes.slice(0,2),900).length,0);
});
test('full-length websites use first viewport, image anchors count and overlapping bands merge',()=>{
 const boxes=[{id:'hero',x:0,y:0,width:1400,height:700},{id:'title',x:40,y:80,width:700,height:100},{id:'next',x:40,y:700,width:1000,height:200},{id:'footer',x:40,y:3000,width:1000,height:100}];
 assert.deepEqual(compositionEvidence('page',boxes,900),[]);
 assert.deepEqual(compositionEvidence('page',boxes,0),[]);
});
test('approved composition regions provide context without enforcing empty-state density or trusting legacy plans',()=>{
 const plan={screens:[{id:'s',layoutBlueprint:{intent:'content',regions:[{role:'Requested activity',top:300,height:200}]}}]};
 assert.equal(plannedRegionEvidence('s',[],plan).length,1);
 assert.match(plannedRegionEvidence('s',[],plan)[0].detail,/Requested activity/);
 assert.equal(plannedRegionEvidence('other',[],plan).length,0);
 assert.deepEqual(plannedRegionEvidence('s',[{id:'image',x:0,y:320,width:300,height:100}],plan),[]);
 plan.screens[0].layoutBlueprint.intent='empty';assert.deepEqual(plannedRegionEvidence('s',[],plan),[]);
 assert.deepEqual(plannedRegionEvidence('s',[],undefined),[]);
});
test('universal guidance preserves requested sample data and editable renderer contract across platforms',()=>{
 for(const platform of ['website','mobile_app'] as const){
  const instructions=buildDesignInstructions(platform,'generate');
  assert.ok(instructions.includes(UI_QUALITY_CONTRACT));
  assert.match(instructions,/Preserve explicitly requested labeled sample data/);
  assert.match(instructions,/no universal component count/);
  assert.match(instructions,/absolute children|Absolute children/);
  assert.equal(instructions.split('When designMd is supplied, it is the approved project-specific DESIGN.md.').length,2);
 }
});
