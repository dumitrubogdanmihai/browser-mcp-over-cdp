
import ChromeDriver from '../ChromeDriver.ts';

import * as Runtime from './Runtime.ts';

// Unique DOM node identifier
export type NodeId = number;

// Unique DOM node identifier used to reference a node that may not have been pushed to the front-end
export type BackendNodeId = number;

// Backend node with a friendly name
export interface BackendNode {
  nodeType: number;
  nodeName: string;
  backendNodeId: BackendNodeId;
}

// Rectangle
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// RGBA color
export interface RGBA {
  r: number;
  g: number;
  b: number;
  a?: number; // optional, default is 1
}

// Quad: An array of quad vertices, x immediately followed by y for each point, points clock-wise
export type Quad = number[];

// Box model
export interface BoxModel {
  content: Quad;
  padding: Quad;
  border: Quad;
  margin: Quad;
  width: number;
  height: number;
  shapeOutside: ShapeOutsideInfo;
}

// CSS Shape Outside details
export interface ShapeOutsideInfo {
  bounds: Quad;
  shape: any[]; // The specific structure is not detailed
  marginShape: any[]; // The specific structure is not detailed
}

// CSS computed style property
export interface CSSComputedStyleProperty {
  name: string;
  value: string;
}

// Shadow root type
export type ShadowRootType = 'user-agent' | 'open' | 'closed';

// Pseudo element type
export type PseudoType =
  | 'first-line'
  | 'first-letter'
  | 'checkmark'
  | 'before'
  | 'after'
  | 'picker-icon'
  | 'marker'
  | 'backdrop'
  | 'column'
  | 'selection'
  | 'search-text'
  | 'target-text'
  | 'spelling-error'
  | 'grammar-error'
  | 'highlight'
  | 'first-line-inherited'
  | 'scroll-marker'
  | 'scroll-marker-group'
  | 'scroll-button'
  | 'scrollbar'
  | 'scrollbar-thumb'
  | 'scrollbar-button'
  | 'scrollbar-track'
  | 'scrollbar-track-piece'
  | 'scrollbar-corner'
  | 'resizer'
  | 'input-list-button'
  | 'view-transition'
  | 'view-transition-group'
  | 'view-transition-image-pair'
  | 'view-transition-old'
  | 'view-transition-new'
  | 'placeholder'
  | 'file-selector-button'
  | 'details-content'
  | 'picker';

// Node structure
export interface Node {
  nodeId: NodeId;
  backendNodeId: BackendNodeId;
  nodeType: number;
  nodeName: string;
  localName: string;
  nodeValue: string;
  parentId?: NodeId;
  childNodeCount?: number;
  children?: Node[];
  attributes?: string[];
  documentURL?: string;
  baseURL?: string;
  publicId?: string;
  systemId?: string;
  internalSubset?: string;
  xmlVersion?: string;
  name?: string;
  value?: string;
  pseudoType?: PseudoType;
  shadowRootType?: ShadowRootType;
  frameId?: string;
  contentDocument?: Node;
  shadowRoots?: Node[];
  templateContent?: Node;
  pseudoElements?: Node[];
  importedDocument?: Node;
  distributedNodes?: BackendNode[];
  isSVG?: boolean;
}

export default class DOMDebugger {
  private driver: ChromeDriver;

  constructor(driver: ChromeDriver) {
    this.driver = driver;
  }

  async getEventListeners(objectId: Runtime.RemoteObjectId, depth?: Number, piece?: Boolean) : Promise<[EventListener]> {
    let result = await this.driver.sendAndGetDevToolsCommand("DOMDebugger.getEventListeners", {
      objectId,
      depth,
      piece
    });
    return result.listeners;
  }
}