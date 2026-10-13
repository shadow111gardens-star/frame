import {reflowText,flowOuterHeight} from '../src/design/textLayout';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {flowSizing} from '../src/design/layoutStyle';
import {inspectStructure,qualityReviewSchema} from '../shared/designQuality';
import {contrastRatio,representativeScreenIds,paintedTextBounds} from '../src/design/renderQuality';
import {fixture} from './fixture';
import {validatePlannedDesign,designPlanSchema} from '../server/designPlanning';
import {planFixture} from './planFixture';
test('fill distributes remaining row space; grid shrinks tracks; hug wraps instead of overflowing',()=>{
  assert.equal(flowSizing({width:'fill'},{layout:'flex',direction:'row'}).flex,'1 1 0');
  assert.equal(flowSizing({width:'fill'},{layout:'flex',direction:'row'}).width,'auto');
  assert.equal(flowSizing({width:'fill'},{layout:'grid'}).minWidth,0);
  assert.equal(flowSizing({width:'hug'},{layout:'flex'}).maxWidth,'100%');
  assert.equal(flowSizing({height:'fill'},{layout:'flex',direction:'column'}).flex,'1 1 0');
  assert.equal(flowSizing({width:'fixed'}).width,undefined);
});
test('flow validation ignores dormant coordinates but absolute bounds remain strict',()=>{
  const app=fixture(),plan=planFixture(app);app.screens[0].components[0].styles.layout='grid';app.screens[0].components[1].position.x=1000;
  validatePlannedDesign(app,plan);assert.equal(inspectStructure(app).filter(i=>i.code==='bounds').length,0);
  app.screens[0].components[0].styles.layout='absolute';assert.throws(()=>validatePlannedDesign(app,plan),/bounds/);
  assert.ok(inspectStructure(app).some(i=>i.code==='bounds'));
});
test('quality checks flag actual control/font/asset issues, not aesthetics or missing user data',()=>{
  const app=fixture();app.screens[0].components[2].position.height=20;app.screens[0].components[1].styles.font='Instrument Serif';app.screens[0].components[1].styles.fontWeight=700;
  const issues=inspectStructure(app);assert.ok(issues.some(i=>i.code==='touch-target'));assert.ok(issues.some(i=>i.code==='font'));assert.ok(!issues.some(i=>i.code==='empty-area'));
  assert.ok(Math.abs(contrastRatio('#ffffff','#000000')!-21)<.01);assert.equal(contrastRatio('#ffffff80','#000000'),undefined);
  assert.equal(qualityReviewSchema.safeParse({issues,screenshots:[{screenId:'home',data:'secret://invalid'}]}).success,false);
});
test('planning accepts numeric region budgets and preserves editorial/empty intentions',()=>{
  const plan=planFixture(fixture());plan.screens[0].layoutBlueprint={intent:'empty',inset:24,sectionGap:24,navigationHeight:80,regions:[{role:'Actionable empty state',top:100,height:500,emphasis:'primary'}]};
  assert.equal(designPlanSchema.parse(plan).screens[0].layoutBlueprint?.intent,'empty');
});

test('an empty measured flow group is not text and must not push an overlaid heading',()=>{
  const result=reflowText([{id:'empty-flow',type:'Stack',name:'Empty stack',position:{x:16,y:16,width:358,height:48},styles:{layout:'flex'}},{id:'heading',type:'Text',name:'Heading',text:'Destination',position:{x:16,y:16,width:200,height:44},styles:{fontSize:36}}],{'empty-flow':48,heading:42},844);
  assert.equal(result.positions.heading,undefined);assert.equal(result.height,844);
});
test('representative capture selection prioritizes errors beyond the first two screens and varied component types',()=>{
  const app=fixture();app.screens.push({...structuredClone(app.screens[1]),id:'third',components:[{id:'photo',name:'Hero',type:'Image',position:{x:0,y:0,width:390,height:200},styles:{}}]});
  assert.deepEqual(representativeScreenIds(app,[],2),['home','third']);
  assert.deepEqual(representativeScreenIds(app,[{screenId:'third',componentIds:['photo'],code:'bounds',severity:'error',detail:'Actual clipping'}],2),['third','home']);
  assert.deepEqual(representativeScreenIds(app,[],0),[]);
});
test('painted glyph bounds exclude unused font metric space without accepting actual clipping',()=>{
 const range={left:40,right:159,top:62,bottom:104};
 const ink=paintedTextBounds(range,{fontBoundingBoxAscent:32,actualBoundingBoxAscent:24,actualBoundingBoxDescent:2,actualBoundingBoxLeft:0,actualBoundingBoxRight:119});
 assert.deepEqual(ink,{left:40,right:159,top:70,bottom:96});
 const clipped=paintedTextBounds(range,{fontBoundingBoxAscent:32,actualBoundingBoxAscent:34,actualBoundingBoxDescent:15,actualBoundingBoxLeft:2,actualBoundingBoxRight:119});
 assert.equal(clipped.top,60);assert.equal(clipped.bottom,109);assert.equal(clipped.left,38);
 assert.deepEqual(paintedTextBounds(range,{fontBoundingBoxAscent:NaN,actualBoundingBoxAscent:24,actualBoundingBoxDescent:2,actualBoundingBoxLeft:0,actualBoundingBoxRight:119}),range);
});
test('bordered flow measurement is stable across re-renders and still expands actual overflow',()=>{
 let height=900;for(let render=0;render<100;render++)height=flowOuterHeight(height-2,height,2,0);
 assert.equal(height,900);assert.equal(flowOuterHeight(950,900,2,0),952);assert.equal(flowOuterHeight(890,892,2,4),900);
});
