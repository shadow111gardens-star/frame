import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixture';
import {validateApp} from '../shared/design';
import {inspectDesign,resolveStyles,fontMetadata,colorHex} from '../src/design/designProperties';

test('design inventory extracts actual styles from all screens and distinguishes unused declared tokens',()=>{
  const app=fixture();app.screens[1].components[0].styles={font:'Instrument Serif',fontWeight:400,fontStyle:'italic',fontSize:46,lineHeight:1.2,letterSpacing:-1,color:'rgba(10,20,30,0.5)',background:'linear-gradient(90deg, #000, #fff)',paddingX:33,gap:11,radius:27,shadow:'medium'};
  const found=inspectDesign(app);
  assert.ok(found.colors.some(c=>c.value==='rgba(10,20,30,0.5)'&&c.uses===1));
  assert.ok(found.colors.some(c=>c.value.startsWith('linear-gradient')));
  assert.equal(found.colors.find(c=>c.value===app.designSystem.colors.textMuted)?.uses,0);
  assert.ok(found.spacing.includes(33));assert.ok(found.radii.includes(27));assert.ok(found.shadows.includes('medium'));
  const serif=found.fonts.find(f=>f.family==='Instrument Serif')!;
  assert.deepEqual([...serif.weights],[400]);assert.deepEqual([...serif.variants],['italic']);assert.ok(serif.lineHeights.has(1.2));
  assert.deepEqual(fontMetadata('Instrument Serif')?.weights,[400]);assert.ok(fontMetadata('Inter')?.weights.includes(800));assert.equal(fontMetadata('Imaginary Font'),undefined);
});
test('linked properties resolve live tokens; local overrides and responsive values remain distinct',()=>{
  const app=fixture();const styles={color:'#123456',colorToken:'accent' as const,fontToken:'display' as const,paddingXToken:2,radiusToken:1,fontSize:40,responsive:{maxWidth:768,fontSize:20,paddingX:9,columns:1}};
  const desktop=resolveStyles(styles,app.designSystem,1440);
  assert.equal(desktop.color,'#ffffff');assert.equal(desktop.font,'Instrument Serif');assert.equal(desktop.paddingX,16);assert.equal(desktop.radius,16);assert.equal(desktop.lineHeight,1.15);
  const mobile=resolveStyles(styles,app.designSystem,390);assert.equal(mobile.fontSize,20);assert.equal(mobile.lineHeight,1.5);assert.equal(mobile.paddingX,9);
  assert.equal(resolveStyles({...styles,colorToken:undefined},app.designSystem).color,'#123456');assert.equal(styles.fontSize,40);
  app.screens[0].components[0].styles.gapToken=19;assert.throws(()=>validateApp(app),/Missing spacing/);
});
test('alpha color values are displayed without losing transparency',()=>{
  assert.equal(colorHex('#abcd'),'#AABBCCDD');assert.equal(colorHex('rgba(10,20,30,0.5)'),'#0A141E80');assert.equal(colorHex('linear-gradient(90deg, #000, #fff)'),undefined);
});
