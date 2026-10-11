import {reflowText} from '../src/design/textLayout';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {flowSizing} from '../src/design/layoutStyle';
import {inspectStructure,qualityReviewSchema} from '../shared/designQuality';
import {contrastRatio} from '../src/design/renderQuality';
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
