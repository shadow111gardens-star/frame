import {MobilePreview} from "./MobilePreview";

/** Preview the actual design without synthesizing demo screens or navigation. */
export function PrototypeView({zoom="fit"}:{zoom?:"fit"|number}) {
  return <MobilePreview zoom={zoom}/>;
}
