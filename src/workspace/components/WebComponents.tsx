import type {DesignComponent} from "../types";

/** Legacy adapter: content comes from component data, never a preset website. */
export function renderWebComponent(component:DesignComponent,onSelect:()=>void,selected:boolean) {
  return <div data-component-id={component.id} onClick={onSelect} className={`ws-selectable ${selected?"is-selected":""}`} style={{background:component.styles.background,color:component.styles.color,fontSize:component.styles.fontSize,fontWeight:component.styles.fontWeight,borderRadius:component.styles.radius}}>{component.text}</div>;
}
