import {z} from 'zod';
import type {DesignApp} from './design';
export const qualityIssueSchema=z.object({screenId:z.string().max(100),componentIds:z.array(z.string().max(100)).max(8),code:z.enum(['bounds','text-clipping','overlap','contrast','touch-target','spacing','empty-area','image','font','navigation','hierarchy']),severity:z.enum(['error','warning']),detail:z.string().max(600)});
export type QualityIssue=z.infer<typeof qualityIssueSchema>;
export const qualityReviewSchema=z.object({issues:z.array(qualityIssueSchema).max(60),screenshots:z.array(z.object({screenId:z.string().max(100),data:z.string().max(700000).regex(/^[A-Za-z0-9+/=]+$/)})).max(2),visualReview:z.boolean().optional(),screenIds:z.array(z.string().max(100)).min(1).max(20).optional()});
/** Structural checks are evidence for review, not a subjective aesthetic rejection. */
export function inspectStructure(app:DesignApp):QualityIssue[] {
  const issues:QualityIssue[]=[];
  for(const screen of app.screens){
    const parents=new Map(screen.components.flatMap(c=>(c.children??[]).map(id=>[id,c] as const)));
    const hidden=(c:DesignApp['screens'][number]['components'][number]):boolean=>!!(c.styles.responsive?.hidden&&screen.width<=c.styles.responsive.maxWidth)||!!parents.get(c.id)&&hidden(parents.get(c.id)!);
    for(const c of screen.components){const p=c.position,parent=parents.get(c.id),flow=parent?.styles.layout==='flex'||parent?.styles.layout==='grid';
      if(hidden(c))continue; // A breakpoint-hidden subtree cannot clip the visible interface.
      if(c.type==='Navigation'&&c.styles.opacity!==0&&!(c.styles.responsive?.hidden&&screen.width<=c.styles.responsive.maxWidth)&&app.productType==='mobile_app'&&app.screens.length>1){
        const descendant=(id:string):boolean=>id===c.id||!!parents.get(id)&&descendant(parents.get(id)!.id);
        const bounds=c.styles.dock?{...p,y:screen.height-p.height}:p;
        const targets=screen.components.filter(n=>n.targetScreenId&&(descendant(n.id)||n.position.x>=bounds.x&&n.position.y>=bounds.y&&n.position.x+n.position.width<=bounds.x+bounds.width&&n.position.y+n.position.height<=bounds.y+bounds.height));
        if(!targets.length)issues.push({screenId:screen.id,componentIds:[c.id],code:'navigation',severity:'warning',detail:'Navigation has no linked screen controls. Add editable peer links or an appropriate return action, rather than a blank navigation surface.'});
      }
      if(!flow&&(p.x<0||p.y<0||p.x+p.width>(parent?.position.width??screen.width)+1||p.y+p.height>(parent?.position.height??screen.height)+1))issues.push({screenId:screen.id,componentIds:[c.id],code:'bounds',severity:'error',detail:'Absolute component exceeds its parent or screen bounds.'});
      if(app.productType==='mobile_app'&&['Button','Input','Search'].includes(c.type)&&(p.width<44||p.height<44))issues.push({screenId:screen.id,componentIds:[c.id],code:'touch-target',severity:'warning',detail:'Control has a logical touch target below 44px. Enlarge its hit area without enlarging the label.'});
      if(c.type==='Image'&&!c.source)issues.push({screenId:screen.id,componentIds:[c.id],code:'image',severity:'warning',detail:'Image has no source. Choose an appropriate asset or intentional editable visual.'});
      const family=c.styles.font??app.designSystem.typography[c.styles.fontToken??'font'];
      if(family==='Instrument Serif'&&c.styles.fontWeight&&c.styles.fontWeight!==400)issues.push({screenId:screen.id,componentIds:[c.id],code:'font',severity:'warning',detail:'Instrument Serif only loads weight 400; choose a supported weight or family.'});
    }
  }return issues.slice(0,60);
}
