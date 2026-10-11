import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reflowText} from '../src/design/textLayout';
import type {DesignComponent} from '../src/workspace/types';
const node=(id:string,x:number,y:number,width:number,height:number,children?:string[]):DesignComponent=>({id,type:children?'Container':'Text',name:id,styles:{},position:{x,y,width,height},children});
test('wrapped text grows and moves following content while preserving other columns and original data',()=>{
  const nodes=[node('headline',0,0,400,60),node('body',0,70,400,40),node('button',0,120,100,40),node('art',500,70,400,200)];
  const before=JSON.stringify(nodes);const layout=reflowText(nodes,{headline:150,body:70},300);
  assert.equal(layout.positions.headline.height,150);assert.equal(layout.positions.body.y,160);assert.equal(layout.positions.body.height,70);
  assert.equal(layout.positions.button.y,240);assert.equal(layout.positions.art,undefined);assert.equal(JSON.stringify(nodes),before);
});

test('parallel columns contribute their maximum growth and existing text collisions get a readable gap',()=>{
  const nodes=[node('left',0,0,200,20),node('right',300,0,200,20),node('footer',0,30,500,40)];
  assert.equal(reflowText(nodes,{left:100,right:100},70).positions.footer.y,110);
  const colliding=[node('headline',0,0,400,100),node('body',0,80,400,40)];
  assert.equal(reflowText(colliding,{headline:100,body:40},120).positions.body.y,108);
});

test('a parent text label does not collide with its child paragraph',()=>{
  const card=node('card',0,0,400,100,['body']);card.text='Title';card.styles.paddingY=16;
  const body=node('body',20,40,360,50);
  const layout=reflowText([card,body],{card:68,body:50},100);
  assert.equal(layout.positions.body.y,60);assert.equal(layout.positions.card.height,126);
});
test('nested groups grow with their text and move the next section; reflow is idempotent',()=>{
  const nodes=[node('section',0,0,900,100,['headline','body']),node('headline',20,0,400,50),node('body',20,55,400,30),node('footer',0,110,900,100)];
  const result=reflowText(nodes,{headline:140,body:60},210);
  assert.ok(result.positions.section.height!>=140+8+60);assert.ok(result.positions.footer.y>=result.positions.section.height!+10);
  const updated=nodes.map(c=>({...c,position:result.positions[c.id]??c.position}));
  assert.deepEqual(reflowText(updated,{headline:140,body:60},result.height),{positions:{},height:result.height});
});
