import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateApp,responseJsonSchema} from '../shared/design';
import {fixture} from './fixture';
test('validates structured designs and rejects unsafe or broken component trees',()=>{
  assert.equal(validateApp(fixture()).screens.length,2);
  const duplicate=fixture();duplicate.screens[1].components[0].id='title';assert.throws(()=>validateApp(duplicate));
  const missing=fixture();missing.screens[0].components[0].children=['absent'];assert.throws(()=>validateApp(missing));
  const cycle=fixture();cycle.screens[0].components[1].children=['card'];assert.throws(()=>validateApp(cycle));
  const image=fixture();image.screens[0].components[0].source='javascript:alert(1)';assert.throws(()=>validateApp(image));
  const invalid=fixture();invalid.screens[0].components[0].position.width=-5;assert.throws(()=>validateApp(invalid));
  const color=fixture();color.screens[0].background='url(https://example.com)';assert.throws(()=>validateApp(color));
});

test('editable generation schema retains numeric bounds and supported font weights',()=>{
  const screen=(responseJsonSchema as any).properties.app.properties.screens.items;
  assert.equal(screen.properties.height.maximum,20000);
  const component=screen.properties.components.items;
  assert.equal(component.properties.styles.properties.radius.maximum,1000);
  assert.equal(component.properties.styles.properties.fontSize.maximum,300);
  assert.deepEqual(component.properties.styles.properties.fontWeight.enum,[300,400,500,600,700,800]);
});

test('website section anchors must reference a component on the same page',()=>{
  const app=fixture();app.productType='website';app.screens.forEach(s=>s.width=1440);
  app.screens[0].height=3800;
  app.screens[0].components[2].targetComponentId='card';
  assert.equal(validateApp(app).screens[0].height,3800);
  app.screens[0].components[2].targetComponentId='profile-title';assert.throws(()=>validateApp(app),/anchor/);
  app.screens[0].components[2].targetComponentId='card';app.screens[0].components[2].targetScreenId='profile';assert.throws(()=>validateApp(app),/anchor/);
  app.screens[0].components[2].targetScreenId=undefined;app.productType='mobile_app';app.screens.forEach(s=>s.width=390);assert.throws(()=>validateApp(app),/anchor/);
});
