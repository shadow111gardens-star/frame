import type {CSSProperties} from 'react';
import type {DesignApp} from '../../shared/design';
type Styles=DesignApp['screens'][number]['components'][number]['styles'];
/** CSS flow owns child coordinates. Fill means remaining space, not one whole row per child. */
export function flowSizing(s:Styles,parent?:Styles):CSSProperties {
  const flow=parent?.layout==='flex'||parent?.layout==='grid';
  const row=parent?.layout==='flex'&&(parent.direction??'row')==='row';
  return {
    minWidth:flow?0:undefined,minHeight:flow?0:undefined,
    width:s.width==='fill'?(row?'auto':'100%'):s.width==='hug'?'fit-content':undefined,
    maxWidth:s.width==='hug'?'100%':undefined,
    height:s.height==='hug'?'auto':s.height==='fill'?(parent?.layout==='flex'&&!row?'auto':'100%'):undefined,
    flex:row&&s.width==='fill'||parent?.layout==='flex'&&!row&&s.height==='fill'?'1 1 0':undefined,
    flexShrink:row&&s.width==='hug'?1:0,
    overflow:s.overflow,
  };
}
