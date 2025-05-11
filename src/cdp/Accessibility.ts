
import ChromeDriver from '../ChromeDriver.ts';

import * as DOM from './DOM.ts';
import * as Page from './Page.ts';

// Unique accessibility node identifier
export type AXNodeId = string;

// Enum of possible property names
export type AXPropertyName =
  | 'actions'
  | 'busy'
  | 'disabled'
  | 'editable'
  | 'focusable'
  | 'focused'
  | 'hidden'
  | 'hiddenRoot'
  | 'invalid'
  | 'keyshortcuts'
  | 'settable'
  | 'roledescription'
  | 'live'
  | 'atomic'
  | 'relevant'
  | 'root'
  | 'autocomplete'
  | 'hasPopup'
  | 'level'
  | 'multiselectable'
  | 'orientation'
  | 'multiline'
  | 'readonly'
  | 'required'
  | 'valuemin'
  | 'valuemax'
  | 'valuetext'
  | 'checked'
  | 'expanded'
  | 'modal'
  | 'pressed'
  | 'selected'
  | 'activedescendant'
  | 'controls'
  | 'describedby'
  | 'details'
  | 'errormessage'
  | 'flowto'
  | 'labelledby'
  | 'owns'
  | 'url';

// Enum of possible native property sources
export type AXValueNativeSourceType =
  | 'description'
  | 'figcaption'
  | 'label'
  | 'labelfor'
  | 'labelwrapped'
  | 'legend'
  | 'rubyannotation'
  | 'tablecaption'
  | 'title'
  | 'other';

// Enum of possible property sources
export type AXValueSourceType =
  | 'attribute'
  | 'implicit'
  | 'style'
  | 'contents'
  | 'placeholder'
  | 'relatedElement';

// Enum of possible property types
export type AXValueType =
  | 'boolean'
  | 'tristate'
  | 'booleanOrUndefined'
  | 'idref'
  | 'idrefList'
  | 'integer'
  | 'node'
  | 'nodeList'
  | 'number'
  | 'string'
  | 'computedString'
  | 'token'
  | 'tokenList'
  | 'domRelation'
  | 'role'
  | 'internalRole'
  | 'valueUndefined';

// A related node in the accessibility tree
export interface AXRelatedNode {
  backendDOMNodeId: number; // DOM.BackendNodeId
  idref?: string;
  text?: string;
}

// A single source for a computed AX property
export interface AXValueSource {
  type: AXValueSourceType;
  value?: AXValue;
  attribute?: string;
  attributeValue?: AXValue;
  superseded?: boolean;
  nativeSource?: AXValueNativeSourceType;
  nativeSourceValue?: AXValue;
  invalid?: boolean;
  invalidReason?: string;
}

// A single computed AX property
export interface AXValue {
  type: AXValueType;
  value?: any;
  relatedNodes?: AXRelatedNode[];
  sources?: AXValueSource[];
}

// A property of an accessibility node
export interface AXProperty {
  name: AXPropertyName;
  value: AXValue;
}

// A node in the accessibility tree
export interface AXNode {
  nodeId: AXNodeId;
  ignored: boolean;
  ignoredReasons?: AXProperty[];
  role?: AXValue;
  chromeRole?: AXValue;
  name?: AXValue;
  description?: AXValue;
  value?: AXValue;
  properties?: AXProperty[];
  parentId?: AXNodeId;
  childIds?: AXNodeId[];
  backendDOMNodeId?: DOM.BackendNodeId;
  frameId?: Page.FrameId;
}

export default class Accessibility {
  private driver: ChromeDriver;

  constructor(driver: ChromeDriver) {
    this.driver = driver;
  }

  async getRootAXNode() : Promise<AXNode> {
    let result = await this.driver.sendAndGetDevToolsCommand("Accessibility.getRootAXNode", {});
    return result.node;
  }

  async getFullAXTree() : Promise<[AXNode]> {
    let result = await this.driver.sendAndGetDevToolsCommand("Accessibility.getFullAXTree", {});
    return result.nodes;
  }
}