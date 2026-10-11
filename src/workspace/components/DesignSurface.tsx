import { useWorkspace } from "../store";
import { GeneratedSurface } from "./GeneratedSurface";
import {screenDimensions} from '../../../shared/product';
import {usePreviewScale} from '../../design/usePreviewScale';

/** Renders only the current structured design; device changes never seed content. */
export function DesignSurface({zoom="fit"}:{zoom?:"fit"|number}) {
  const {state,dispatch}=useWorkspace();
  const screen=state.screens.find(s=>s.id===state.currentScreen);
  const {width,height}=screenDimensions(screen??{},state.productType);
  const {ref,scale,available}=usePreviewScale(width,height,state.productType,zoom,state.productType==='website');
  if(!state.designSystem || !screen) return <div className="text-[12px] text-white/35 text-center">{state.generating?"Generating your editable design...":"Generate an app to see your screens here."}</div>;
  return <div ref={ref} data-canvas-scroll="design" className="w-full h-full overflow-auto ws-scrollbar" style={{overscrollBehavior:'contain'}} data-product-type={state.productType}><div style={{width:width*scale,height:height*scale,position:"relative",margin:'0 auto',minHeight:'100%'}} onClick={()=>dispatch({type:"SELECT_COMPONENT",id:null})}><div style={{position:"absolute",top:state.productType==='website'?0:Math.max(0,(available.height+32-height*scale)/2),width,height,transform:`scale(${scale})`,transformOrigin:"top left"}}><GeneratedSurface screen={screen}/></div></div></div>;
}
