import type {DesignComponent,ComponentPosition} from '../workspace/types';

/** scrollHeight excludes borders; DOM outer height already includes them. */
export function flowOuterHeight(scrollHeight:number,outerHeight:number,border:number,margin:number){
  return Math.ceil(Math.max(scrollHeight+border,outerHeight)+2*margin);
}

/** Native flow owns placement, but fixed-height text children still need enough
 * allocated height. Grow only leaf text, never shift CSS-flow coordinates. */
export function flowTextGrowth(nodes:DesignComponent[],measured:Record<string,number>){
  const parents=new Map(nodes.flatMap(c=>(c.children??[]).map(id=>[id,c] as const)));
  const positions:Record<string,ComponentPosition>={};
  for(const c of nodes){const parent=parents.get(c.id);
    if(!parent||!['flex','grid'].includes(parent.styles.layout??'')||!c.text?.trim()||c.children?.length||['hug','fill'].includes(c.styles.height??''))continue;
    const original={x:0,y:0,width:100,height:40,...c.position};
    const height=measured[c.id];if(Number.isFinite(height)&&height>original.height+.5)positions[c.id]={...original,height};
  }
  return positions;
}

/** Expand wrapped text and its containing groups; preserve columns and intentional layers. */
export function reflowText(nodes:DesignComponent[],measured:Record<string,number>,screenHeight:number,reservedBottom=0) {
  const byId=new Map(nodes.map(c=>[c.id,c])),children=new Set(nodes.flatMap(c=>c.children??[]));
  const positions:Record<string,ComponentPosition>={},visiting=new Set<string>();
  const box=(c:DesignComponent)=>({x:0,y:0,width:100,height:40,...c.position});
  function peers(ids:string[],prefix?:ReturnType<typeof box>):number {
    const grown:{original:ReturnType<typeof box>;bottom:number;text:boolean}[]=prefix?[{original:prefix,bottom:prefix.y+prefix.height,text:true}]:[];let bottom=0;
    for(const id of [...ids].sort((a,b)=>box(byId.get(a)!).y-box(byId.get(b)!).y)) {
      const c=byId.get(id);if(!c||visiting.has(id))continue;visiting.add(id);
      const original=box(c),p={...original};
      const ownText=measured[id];
      const prefix=ownText!==undefined&&c.children?.length?{x:c.styles.paddingX??0,y:c.styles.paddingY??0,width:Math.max(1,p.width-2*(c.styles.paddingX??0)),height:Math.max(0,ownText-2*(c.styles.paddingY??0)-(c.styles.border?2:0))}:undefined;
      const childBottom=peers((c.children??[]).filter(id=>byId.has(id)),prefix);
      p.height=Math.max(p.height,measured[id]??0,childBottom?childBottom+(c.styles.paddingY??0):0);
      const isText=(c.type==='Text'||!!c.text?.trim())&&measured[id]!==undefined;
      for(const g of grown)if((original.y>=g.original.y+g.original.height-.5||isText&&g.text&&original.y>=g.original.y)&&original.x<g.original.x+g.original.width&&original.x+original.width>g.original.x)p.y=Math.max(p.y,g.bottom+Math.max(8,original.y-g.original.y-g.original.height));
      const delta=p.height-original.height;if(delta>.5||isText)grown.push({original,bottom:p.y+p.height,text:isText});
      if(p.y!==original.y||p.height!==original.height)positions[id]=p;
      bottom=Math.max(bottom,p.y+p.height);visiting.delete(id);
    }
    return bottom;
  }
  const height=Math.max(screenHeight,peers(nodes.filter(c=>!children.has(c.id)).map(c=>c.id))+reservedBottom);
  return {positions,height:Math.ceil(height)};
}

/** Docked root surfaces occupy real space even when content grows after font/flow measurement. */
export function dockedSpace(nodes:DesignComponent[],measured:Record<string,number>={}){
  const children=new Set(nodes.flatMap(c=>c.children??[]));
  return Math.max(0,...nodes.filter(c=>c.styles.dock==='bottom'&&!children.has(c.id)).map(c=>Math.max(c.position?.height??0,measured[c.id]??0)));
}
