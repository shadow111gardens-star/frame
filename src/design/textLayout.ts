import type {DesignComponent,ComponentPosition} from '../workspace/types';

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
