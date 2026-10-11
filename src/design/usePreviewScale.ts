import {useEffect,useRef,useState} from 'react';
import {previewConfig,type ProductType} from '../../shared/product';
export function usePreviewScale(width:number,height:number,productType:ProductType|null,zoom:'fit'|number,fitWidthOnly=false) {
  const ref=useRef<HTMLDivElement>(null),config=previewConfig(productType);
  const [available,setAvailable]=useState({width:config.fitWidth as number,height:config.fitHeight as number});
  useEffect(()=>{const el=ref.current;if(!el)return;const update=()=>{const rect=el.getBoundingClientRect();if(rect.width>0&&rect.height>0)setAvailable({width:Math.max(1,rect.width-32),height:Math.max(1,rect.height-32)});};update();const observer=new ResizeObserver(update);observer.observe(el);return()=>observer.disconnect();},[productType]);
  return {ref,available,scale:zoom==='fit'?Math.min(available.width/width,config.fitWidth/width,...(fitWidthOnly?[]:[available.height/height,config.fitHeight/height])):zoom/100};
}
