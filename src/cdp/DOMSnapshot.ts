
import ChromeDriver from '../ChromeDriver.ts';

export default class DOMSnapshot {
  private driver: ChromeDriver;

  constructor(driver: ChromeDriver) {
    this.driver = driver;
  }
  async enable() {
    await this.driver.sendAndGetDevToolsCommand("DOMSnapshot.enable", {});
  }
  async disable() {
    await this.driver.sendAndGetDevToolsCommand("DOMSnapshot.disable", {});
  }
  async captureSnapshot(computedStyles : string[], includeEventListeners?:boolean, includePaintOrder?:boolean, includeUserAgentShadowTree?:boolean) : Promise<DOMSnapshotResult> {
    return await this.driver.sendAndGetDevToolsCommand("DOMSnapshot.captureSnapshot", {
      computedStyles,
      includeEventListeners,
      includePaintOrder,
      includeUserAgentShadowTree
    });
  }
  async getSnapshot(computedStyleWhitelist : string[], includeEventListeners?:boolean, includePaintOrder?:boolean, includeUserAgentShadowTree?:boolean) : Promise<DOMSnapshotResultGetSnapshot> {
    return await this.driver.sendAndGetDevToolsCommand("DOMSnapshot.getSnapshot", {
      computedStyleWhitelist,
      includeEventListeners,
      includePaintOrder,
      includeUserAgentShadowTree
    });
  }
}
// A reference into the shared string table
type StringIndex = number;

// Simple name/value property entry
export interface NameValue {
  name: string;
  value: string;
}

// A rectangle, represented as [x, y, width, height]
type Rectangle = {//TODO was corrected manually...
  x: number,
  y: number,
  width: number,
  height: number
};

// Rare field containers
interface RareBooleanData {
  index: number[];
}

interface RareIntegerData {
  index: number[];
  value: number[];
}

interface RareStringData {
  index: number[];
  value: StringIndex[];
}

// CSS computed style snapshot subset
interface ComputedStyle {
  properties: NameValue[];
}

// Entry in DOM tree for styling/layout rendering
interface LayoutTreeNode {
  domNodeIndex: number;
  boundingBox: Rectangle;
  layoutText: string;
  inlineTextNodes: InlineTextBox[];
  styleIndex: number;
  paintOrder?: number;            // if includePaintOrder true
  isStackingContext: boolean;
}

// Inline rendered text box
interface InlineTextBox {
  boundingBox: Rectangle;
  startCharacterIndex: number;
  numCharacters: number;
}

// Snapshot of all layout nodes
interface LayoutTreeSnapshot {
  nodeIndex: number[];
  styles: Array<StringIndex[]>;
  bounds: Rectangle[];
  text: StringIndex[];
  stackingContexts: RareBooleanData;
  paintOrders?: number[];
  offsetRects?: Rectangle[];
  scrollRects?: Rectangle[];
  clientRects?: Rectangle[];
  blendedBackgroundColors?: StringIndex[];
  textColorOpacities?: number[];
}

// Table of nodes for DOM tree
interface NodeTreeSnapshot {
  parentIndex: number[];
  nodeType: number[];
  shadowRootType: RareStringData;
  nodeName: StringIndex[];
  nodeValue: StringIndex[];
  backendNodeId: number[]; // DOM.BackendNodeId ints
  attributes: Array<StringIndex[]>;
  textValue: RareStringData;
  inputValue: RareStringData;
  inputChecked: RareBooleanData;
  optionSelected: RareBooleanData;
  contentDocumentIndex: RareIntegerData;
  pseudoType: RareStringData;
  pseudoIdentifier: RareStringData;
  isClickable: RareBooleanData;
  currentSourceURL: RareStringData;
  originURL: RareStringData;
}

// Text-box snapshot grouping layoutIndex pointers
interface TextBoxSnapshot {
  layoutIndex: number[];
  bounds: Rectangle[];
  start: number[];
  length: number[];
}

// Individual DOM node description
export interface DOMNode {
  nodeType: number;
  nodeName: string;
  nodeValue: string;
  textValue?: string;
  inputValue?: string;
  inputChecked?: boolean;
  optionSelected?: boolean;
  backendNodeId: number;
  childNodeIndexes?: number[];
  attributes?: NameValue[];
  pseudoElementIndexes?: number[];
  layoutNodeIndex?: number;
  documentURL?: string;
  baseURL?: string;
  contentLanguage?: string;
  documentEncoding?: string;
  publicId?: string;
  systemId?: string;
  frameId?: string;
  contentDocumentIndex?: number;
  pseudoType?: string;
  shadowRootType?: string;
  isClickable?: boolean;
  eventListeners?: any[]; // DOMDebugger.EventListener
  currentSourceURL?: string;
  originURL?: string;
  scrollOffsetX?: number;
  scrollOffsetY?: number;
}

// Snapshot of a single document within page
interface DocumentSnapshot {
  documentURL: StringIndex;
  title: StringIndex;
  baseURL: StringIndex;
  contentLanguage: StringIndex;
  encodingName: StringIndex;
  publicId: StringIndex;
  systemId: StringIndex;
  frameId: StringIndex;
  nodes: NodeTreeSnapshot;
  layout: LayoutTreeSnapshot;
  textBoxes: TextBoxSnapshot;
  scrollOffsetX: number;
  scrollOffsetY: number;
  contentWidth: number;
  contentHeight: number;
}

// Alias for array of string indices
type ArrayOfStrings = StringIndex[];

// Full snapshot result for captureSnapshot
interface DOMSnapshotResult {
  documents: DocumentSnapshot[];
  strings: string[];
}

// Full snapshot result for captureSnapshot
export interface DOMSnapshotResultGetSnapshot {
  domNodes: DOMNode[];
  layoutTreeNodes: LayoutTreeNode[];
  computedStyles: ComputedStyle[];
}
