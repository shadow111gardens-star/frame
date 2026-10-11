import {useWorkspace,getDevice} from "../store";
import {DeviceFrame,DeviceScreen} from "./PhoneDevice";
import {GeneratedSurface} from "./GeneratedSurface";
import {previewConfig,screenDimensions} from '../../../shared/product';
import {usePreviewScale} from '../../design/usePreviewScale';

export function MobilePreview({zoom="fit"}:{zoom?:"fit"|number}) {
  const {state}=useWorkspace();
  const screen=state.screens.find(s=>s.id===state.currentScreen);
  const config=previewConfig(state.productType),dimensions=screenDimensions(screen??{},state.productType);
  const requested=getDevice(state.device);
  const browser=state.productType==='website';
  const device=browser?(requested.platform==='laptop'?requested:getDevice(config.defaultDevice)):(requested.platform==='laptop'?getDevice(previewConfig('mobile_app').defaultDevice):requested);
  const responsive=!!screen?.components.some(id=>state.components[id]?.styles.responsive);
  const renderWidth=responsive?device.width:dimensions.width;
  const contentScale=device.previewWidth/renderWidth;
  const width=browser?device.width:device.previewWidth+16;
  const height=browser?device.height+36:device.previewHeight+16;
  const {ref,scale,available}=usePreviewScale(width,height,state.productType,zoom);
  const viewportHeight=browser?Math.min(device.height,Math.max(1,available.height/scale-36)):device.previewHeight;
  const frameHeight=browser?viewportHeight+36:height;
  if(!state.designSystem || !screen) return <div className="text-[12px] text-white/35">Generate a design to preview your screens.</div>;
  const content=<GeneratedSurface screen={screen} interactive/>;
  return <div ref={ref} className={`w-full h-full ws-scrollbar ${browser?'overflow-x-auto overflow-y-hidden':'overflow-auto'}`} data-product-type={state.productType}><div style={{width:width*scale,height:frameHeight*scale,position:"relative",margin:'0 auto',minHeight:'100%'}}><div style={{position:"absolute",top:Math.max(0,(available.height+32-frameHeight*scale)/2),width,height:frameHeight,transform:`scale(${scale})`,transformOrigin:'top left'}}>
    {browser?<div data-preview-frame="browser" className="rounded-xl border border-white/15 bg-[#141418] overflow-hidden shadow-2xl">
      <div className="h-9 flex items-center gap-2 px-3 border-b border-white/10"><div className="h-2 w-2 rounded-full bg-white/30"/><div className="h-2 w-2 rounded-full bg-white/20"/><div className="h-2 w-2 rounded-full bg-white/15"/><span className="text-[11px] text-white/45 ml-3">{state.projectName}</span></div>
      <div data-prototype-viewport="website" data-device-id={device.id} className="ws-scrollbar" style={{width:device.width,height:viewportHeight,overflow:'auto',overscrollBehavior:'contain'}}><div style={{width:Math.max(device.width,renderWidth),minHeight:dimensions.height,background:screen.backgroundToken?state.tokens[screen.backgroundToken]:screen.background??state.tokens.background}}><div style={{width:renderWidth,margin:'0 auto'}}>{content}</div></div></div>
    </div>:<div data-preview-frame="phone"><DeviceFrame device={device}><DeviceScreen device={device}><div data-prototype-viewport="mobile_app" style={{width:device.previewWidth,height:device.previewHeight,overflow:'auto'}}><div style={{width:renderWidth*contentScale,height:dimensions.height*contentScale}}><div style={{transform:`scale(${contentScale})`,transformOrigin:'top left'}}>{content}</div></div></div></DeviceScreen></DeviceFrame></div>}
  </div></div></div>;
}
