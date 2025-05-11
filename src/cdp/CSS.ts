
import ChromeDriver from '../ChromeDriver.ts';

import * as DOM from './DOM.ts';
import * as Page from './Page.ts';

// Unique identifier for a stylesheet
export type StyleSheetId = string;

// Enum for stylesheet origin types
export enum StyleSheetOrigin {
  Injected = 'injected',
  UserAgent = 'user-agent',
  Inspector = 'inspector',
  Regular = 'regular',
}

// Text range within a resource
export interface SourceRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

// Specificity of a CSS selector
export interface Specificity {
  a: number;
  b: number;
  c: number;
}

// Data for a simple selector
export interface Value {
  text: string;
  range?: SourceRange;
  specificity?: Specificity;
}

// Selector list data
export interface SelectorList {
  selectors: Value[];
  text: string;
}

// CSS property declaration data
export interface CSSProperty {
  name: string;
  value: string;
  important?: boolean;
  implicit?: boolean;
  text?: string;
  parsedOk?: boolean;
  disabled?: boolean;
  range?: SourceRange;
  longhandProperties?: CSSProperty[];
}

// Computed style property
export interface CSSComputedStyleProperty {
  name: string;
  value: string;
}

// Shorthand property entry
export interface ShorthandEntry {
  name: string;
  value: string;
  important?: boolean;
}

// CSS style representation
export interface CSSStyle {
  styleSheetId?: StyleSheetId;
  cssProperties: CSSProperty[];
  shorthandEntries: ShorthandEntry[];
  cssText?: string;
  range?: SourceRange;
}

// CSS rule representation
export interface CSSRule {
  styleSheetId?: StyleSheetId;
  selectorList: SelectorList;
  origin: StyleSheetOrigin;
  style: CSSStyle;
  media?: CSSMedia[];
  containerQueries?: CSSContainerQuery[];
  supports?: CSSSupports[];
  layers?: CSSLayer[];
  scopes?: CSSScope[];
  ruleTypes?: CSSRuleType[];
  startingStyles?: CSSStartingStyle[];
}

// Match data for a CSS rule
export interface RuleMatch {
  rule: CSSRule;
  matchingSelectors: number[];
}

// CSS rule collection for a single pseudo style
export interface PseudoElementMatches {
  pseudoType: DOM.PseudoType;
  pseudoIdentifier?: string;
  matches: RuleMatch[];
}

// Inherited CSS rule collection from ancestor node
export interface InheritedStyleEntry {
  inlineStyle?: CSSStyle;
  matchedCSSRules: RuleMatch[];
}

// CSS media rule descriptor
export interface CSSMedia {
  text: string;
  source: 'mediaRule' | 'importRule' | 'linkedSheet' | 'inlineSheet';
  sourceURL?: string;
  range?: SourceRange;
  styleSheetId?: StyleSheetId;
  mediaList?: MediaQuery[];
}

// Media query descriptor
export interface MediaQuery {
  expressions: MediaQueryExpression[];
  active: boolean;
}

// Media query expression descriptor
export interface MediaQueryExpression {
  value: number;
  unit: string;
  feature: string;
  valueRange?: SourceRange;
  computedLength?: number;
}

// CSS container query rule descriptor
export interface CSSContainerQuery {
  text: string;
  range?: SourceRange;
  styleSheetId?: StyleSheetId;
  name?: string;
  physicalAxes?: DOM.PhysicalAxes;
  logicalAxes?: DOM.LogicalAxes;
  queriesScrollState?: boolean;
}

// CSS supports at-rule descriptor
export interface CSSSupports {
  text: string;
  range?: SourceRange;
  styleSheetId?: StyleSheetId;
}

// CSS layer at-rule descriptor
export interface CSSLayer {
  text: string;
  range?: SourceRange;
  styleSheetId?: StyleSheetId;
}

// CSS scope at-rule descriptor
export interface CSSScope {
  text: string;
  range?: SourceRange;
  styleSheetId?: StyleSheetId;
}

// Enum indicating the type of a CSS rule
export enum CSSRuleType {
  MediaRule = 'MediaRule',
  SupportsRule = 'SupportsRule',
  ContainerRule = 'ContainerRule',
  LayerRule = 'LayerRule',
  ScopeRule = 'ScopeRule',
  StyleRule = 'StyleRule',
  StartingStyleRule = 'StartingStyleRule',
}

// CSS starting-style at-rule descriptor
export interface CSSStartingStyle {
  text: string;
  range?: SourceRange;
  styleSheetId?: StyleSheetId;
}

// CSS coverage information
export interface RuleUsage {
  styleSheetId: StyleSheetId;
  startOffset: number;
  endOffset: number;
  used: boolean;
}

// CSS stylesheet metainformation
export interface CSSStyleSheetHeader {
  styleSheetId: StyleSheetId;
  frameId: Page.FrameId;
  sourceURL: string;
  sourceMapURL?: string;
  origin: StyleSheetOrigin;
  title: string;
  ownerNode?: DOM.BackendNodeId;
  disabled: boolean;
  hasSourceURL?: boolean;
  isInline: boolean;
}

// Information about amount of glyphs that were rendered with given font
export interface PlatformFontUsage {
  familyName: string;
  postScriptName?: string;
  isCustomFont: boolean;
  glyphCount: number;
}

export default class CSS {
  private driver: ChromeDriver;

  constructor(driver: ChromeDriver) {
    this.driver = driver;
  }

  async getComputedStyleForNode(nodeId: DOM.NodeId) : Promise<[CSSComputedStyleProperty]> {
    let result = await this.driver.sendAndGetDevToolsCommand("CSS.getComputedStyleForNode", {
      nodeId});
    return result.computedStyle;
  }
}