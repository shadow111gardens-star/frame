import {useEffect,useRef} from 'react';
import {GeneratedSurface} from './GeneratedSurface';
import type {DesignApp} from '../../../shared/design';
import type {QualityIssue} from '../../../shared/designQuality';
import type {WorkspaceState} from '../store';
import {measureRenderedReflow,inspectRenderedScreen,representativeScreenIds} from '../../design/renderQuality';
import {ExportAssets,renderRasterSvg,svgToImage} from '../../design/imageExport';
import {designPolicy} from '../../../shared/designPolicy';
export type RenderReview={issues:QualityIssue[];screenshots:{screenId:string;data:string}[];visualReview?:boolean;screenIds?:string[];reflow?:{screenId:string;layout:ReturnType<typeof measureRenderedReflow>}[]};
export type ReviewJob={app:DesignApp;approvedPlan?:unknown;snapshot:WorkspaceState;resolve:(review:RenderReview)=>void;reject:(error:Error)=>void};
export function RenderedDesignReview({job}:{job:ReviewJob}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{let cancelled=false;const assets=new ExportAssets();
    const wait=(p:Promise<unknown>,ms:number)=>new Promise<void>(resolve=>{const timer=setTimeout(resolve,ms);void p.catch(()=>{}).finally(()=>{clearTimeout(timer);resolve();});});
    void(async()=>{
      try{
        await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
        await wait(document.fonts.ready,5000);
        await wait(Promise.all([...ref.current!.querySelectorAll('img')].map(img=>img.decode().catch(()=>{}))),3000);
        if(cancelled)return;
        const captureTimer=setTimeout(()=>assets.clear(),8000);
        const reflow:NonNullable<RenderReview['reflow']>=[];
        const issues:QualityIssue[]=[],screenshots:RenderReview['screenshots']=[];
        const roots=[...ref.current!.querySelectorAll<HTMLElement>('[data-generated-screen]')];
        for(const root of roots){const original=job.app.screens.find(s=>s.id===root.dataset.generatedScreen)!;const screen={...original,width:root.offsetWidth,height:root.offsetHeight};
          if(root.offsetWidth===original.width)reflow.push({screenId:screen.id,layout:measureRenderedReflow(root,screen,job.app)});
          const found=inspectRenderedScreen(root,screen,job.app,root.offsetWidth===original.width?job.approvedPlan:undefined).map(i=>({...i,detail:`At ${screen.width}px: ${i.detail}`}));issues.push(...found);
        }
        const selected=representativeScreenIds({...job.app,screens:job.app.screens.filter(s=>job.snapshot.screens.some(reviewed=>reviewed.id===s.id))},issues,designPolicy.quality.maxCaptures);
        for(const id of selected){
          const original=job.app.screens.find(s=>s.id===id)!;
          const root=roots.find(r=>r.dataset.generatedScreen===id&&r.offsetWidth===original.width)!;
          const screen={...original,width:root.offsetWidth,height:root.offsetHeight};
          if(!cancelled){
            try{const svg=await renderRasterSvg(root,assets);const factor=Math.min(1,1200/screen.width,2400/screen.height);const blob=await svgToImage(svg,'jpeg',Math.max(1,Math.round(screen.width*factor)),Math.max(1,Math.round(screen.height*factor)),'#ffffff');if(blob.size<500000){const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);screenshots.push({screenId:screen.id,data:btoa(binary)});}}catch{/* Metrics remain useful when assets cannot be captured safely. */}
          }
        }
        clearTimeout(captureTimer);
        if(!cancelled)job.resolve({issues:issues.sort((a,b)=>Number(b.severity==='error')-Number(a.severity==='error')).slice(0,60),screenshots,reflow,visualReview:screenshots.length>0,screenIds:job.snapshot.screens.map(s=>s.id)});
      }catch(e){if(!cancelled)job.reject(e instanceof Error?e:new Error('Rendered review failed.'));}finally{assets.clear();}
    })();return()=>{cancelled=true;assets.clear();};
  },[job]);
  const screens=job.snapshot.screens.flatMap(screen=>{const breakpoints=job.app.productType==='website'?[...new Set(job.app.screens.find(s=>s.id===screen.id)!.components.map(c=>c.styles.responsive?.maxWidth).filter((w):w is number=>w!==undefined&&w<screen.width!))].sort((a,b)=>a-b).slice(0,2):[];return [screen,...breakpoints.map(width=>({...screen,width}))];});
  return <div ref={ref} aria-hidden="true" style={{position:'fixed',left:-100000,top:0,pointerEvents:'none',zIndex:-1}}>{screens.map((screen,i)=><GeneratedSurface key={`${screen.id}-${i}`} screen={screen} snapshot={job.snapshot} exporting/>)}</div>;
}
