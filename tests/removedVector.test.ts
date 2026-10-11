import {test} from 'node:test';
import assert from 'node:assert/strict';
import {responseJsonSchema,responseSchema,validateApp,componentSchema} from '../shared/design';
import {designPolicy,policyInstructions} from '../shared/designPolicy';
import {fixture} from './fixture';

test('generation schema and policy contain no editable SVG capabilities or geometry fields',()=>{
 const schema=responseJsonSchema as any;
 const component=schema.properties.app.properties.screens.items.properties.components.items;
 assert.deepEqual(component.properties.type.enum,designPolicy.capabilities.components);
 assert.equal(component.properties.type.enum.includes('Vector'),false);
 for(const field of ['vector','nodes','d','points','stroke','strokeWidth'])assert.equal(Object.hasOwn(component.properties,field),false);
 assert.equal(/vectorPrimitives|vectorNodeLimit|Vector/.test(policyInstructions()),false);
 const walk=(value:any)=>{if(!value||typeof value!=='object')return;for(const field of ['vector','nodes','d','points'])assert.equal(Object.hasOwn(value.properties??{},field),false);Object.values(value).forEach(walk);};
 walk(schema);
});

test('removed components and geometry are rejected at runtime, not silently rendered',()=>{
 const app=fixture();const base=app.screens[0].components[0];
 for(const legacy of [{...base,type:'Vector',vector:{width:100,height:100,nodes:[{id:'path',type:'path',d:'M0 0 L1 1'}]}},{...base,vector:{nodes:[]}},{...base,d:'M0 0'},{...base,points:'0,0 1,1'}]){
  assert.equal(componentSchema.safeParse(legacy).success,false);
  const bad=structuredClone(app);bad.screens[0].components[0]=legacy as any;
  assert.throws(()=>validateApp(bad));assert.equal(responseSchema.safeParse({message:'ok',app:bad}).success,false);
 }
});

test('normal components, styling and safety constraints remain supported',()=>{
 const app=fixture();validateApp(app);responseSchema.parse({message:'ok',app});
 for(const styles of [{color:'url(unsafe)'},{fontSize:0},{opacity:2},{responsive:{maxWidth:390,blur:1}}]){
  assert.equal(componentSchema.safeParse({...app.screens[0].components[0],styles}).success,false);
 }
 assert.equal(componentSchema.safeParse({...app.screens[0].components[0],type:'Image',source:'data:image/svg+xml;base64,PHN2Zz4='}).success,false);
 assert.equal(componentSchema.safeParse({...app.screens[0].components[0],type:'Image',source:'data:image/png;base64,AA=='}).success,true);
});
