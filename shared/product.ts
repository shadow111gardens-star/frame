export type ProductType = 'website' | 'mobile_app';
export const DEFAULT_PRODUCT_TYPE: ProductType = 'mobile_app';
export const PREVIEW_CONFIG = {
  mobile_app: { label:'Mobile App', viewportWidth:390, viewportHeight:844, frame:'phone', fitWidth:320, fitHeight:660, defaultDevice:'iphone-17', minWidth:100, maxWidth:600 },
  website: { label:'Website', viewportWidth:1440, viewportHeight:900, frame:'browser', fitWidth:960, fitHeight:660, defaultDevice:'macbook-pro-14', minWidth:768, maxWidth:4000 },
} as const;
export function previewConfig(productType:ProductType|null|undefined) {
  return PREVIEW_CONFIG[productType??DEFAULT_PRODUCT_TYPE];
}
export function screenDimensions(screen:{width?:number;height?:number},productType:ProductType|null|undefined) {
  const config=previewConfig(productType);
  return {width:screen.width??config.viewportWidth,height:screen.height??config.viewportHeight};
}
