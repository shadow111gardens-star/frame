import {designMdSections} from '../shared/generationArtifact';
import type {DesignPlan} from '../server/designPlanning';
export function designMdFixture(plan:DesignPlan,prompt='Test product'){
  return {designMd:'# DESIGN.md\n'+designMdSections.map(section=>'## '+section+'\n'+prompt+' — Apply deliberate readable hierarchy, coherent semantic roles and editable components to '+plan.screens.map(s=>s.name+' ('+s.id+')').join(', ')+'.\n'+(section==='Color Palette and Semantic Roles'?'<!-- FRAME_TOKENS -->\n```json\n'+JSON.stringify(plan.designSystem)+'\n```\n':'')).join('\n')};
}

export function specificationFixture(plan:DesignPlan,prompt='Test product',analysis:unknown={productType:plan.productType,screens:[]}){return {analysis,plan,...designMdFixture(plan,prompt)};}
