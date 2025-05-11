
import ChromeDriver from '../ChromeDriver.ts';

// Represents an error encountered while parsing the app manifest.
export interface AppManifestError {
    message: string;
    critical: number;
    line: number;
    column: number;
  }
  
// Types of JavaScript dialogs.
export type DialogType = 'alert' | 'confirm' | 'prompt' | 'beforeunload';

// Unique identifier for a frame.
export type FrameId = string;

// Unique identifier for a script.
export type ScriptIdentifier = string;

// Represents a frame on the page.
export interface Frame {
  id: FrameId;
  parentId?: FrameId;
  loaderId: string; // Network.LoaderId
  name?: string;
  url: string;
  urlFragment?: string;
  domainAndRegistry?: string;
  securityOrigin: string;
  securityOriginDetails?: SecurityOriginDetails;
  mimeType: string;
  unreachableUrl?: string;
  adFrameStatus?: AdFrameStatus;
  secureContextType?: SecureContextType;
  crossOriginIsolatedContextType?: CrossOriginIsolatedContextType;
  gatedAPIFeatures?: GatedAPIFeature[];
}

// Represents a tree of frames.
export interface FrameTree {
  frame: Frame;
  childFrames?: FrameTree[];
}

// Represents the layout viewport.
export interface LayoutViewport {
  pageX: number;
  pageY: number;
  clientWidth: number;
  clientHeight: number;
}

// Represents an entry in the navigation history.
export interface NavigationEntry {
  id: number;
  url: string;
  userTypedURL: string;
  title: string;
  transitionType: TransitionType;
}

// Types of navigation transitions.
export type TransitionType =
  | 'link'
  | 'typed'
  | 'address_bar'
  | 'auto_bookmark'
  | 'auto_subframe'
  | 'manual_subframe'
  | 'generated'
  | 'auto_toplevel'
  | 'form_submit'
  | 'reload'
  | 'keyword'
  | 'keyword_generated'
  | 'other';

// Represents the visual viewport.
export interface VisualViewport {
  offsetX: number;
  offsetY: number;
  pageX: number;
  pageY: number;
  clientWidth: number;
  clientHeight: number;
  scale: number;
  zoom: number;
}

// Represents the viewport for capturing screenshots.
export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

// Represents the status of an ad frame.
export interface AdFrameStatus {
  adFrameType: AdFrameType;
  explanations: AdFrameExplanation[];
  explanationIds: string[];
}

// Types of ad frames.
export type AdFrameType = 'none' | 'child' | 'root';

// Explanations for why a frame is considered an ad.
export type AdFrameExplanation =
  | 'ParentIsAd'
  | 'CreatedByAdScript'
  | 'MatchedBlockingRule'
  | 'CreatedByAdScriptFromAdFrame';

// Represents the security origin details.
export interface SecurityOriginDetails {
  isSecure: boolean;
  secureContextType: SecureContextType;
}

// Types of secure contexts.
export type SecureContextType =
  | 'Secure'
  | 'SecureLocalhost'
  | 'InsecureScheme'
  | 'InsecureAncestor';

// Types of cross-origin isolated contexts.
export type CrossOriginIsolatedContextType =
  | 'Isolated'
  | 'NotIsolated'
  | 'NotIsolatedFeatureDisabled';

// Features gated behind certain APIs.
export type GatedAPIFeature =
  | 'SharedArrayBuffers'
  | 'SharedArrayBuffersTransferAllowed'
  | 'PerformanceMeasureMemory'
  | 'PerformanceProfile';

export default  class Page {
  private driver: ChromeDriver;

  constructor(driver: ChromeDriver) {
    this.driver = driver;
  }

  async captureScreenshot() {
    let result = await this.driver.sendAndGetDevToolsCommand("Page.captureScreenshot", {"format": "jpeg", "captureBeyondViewport": true});
    return result.data;
  }
  
/*  getNodeImage() {
    nodeQuads = self.driver.execute_cdp_cmd("DOM.getContentQuads", {'backendNodeId': backendNodeId})
    boxModel = self.driver.execute_cdp_cmd("DOM.getBoxModel", {'backendNodeId': backendNodeId})

    topLeftX = nodeQuads['quads'][0][0]
    topLeftY = nodeQuads['quads'][0][1]

    screenshoot = self.driver.execute_cdp_cmd("Page.captureScreenshot", {"format": "jpeg", "captureBeyondViewport": True, "clip": {"x": topLeftX, "y": topLeftY, "width": boxModel['model']['width'], "height": boxModel['model']['height'], "scale": 1}})
    return base64.b64decode(screenshoot['data'])
  }*/
}