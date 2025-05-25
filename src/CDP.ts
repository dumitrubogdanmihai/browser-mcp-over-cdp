import ChromeDriver from './ChromeDriver.ts';

import DOM, { BackendNodeId, CSSComputedStyleProperty, Node } from './cdp/DOM.ts';
import Accessibility, { AXNode, AXNodeId } from "./cdp/Accessibility.ts";
import Console from "./cdp/Console.ts";
import CSS from "./cdp/CSS.ts";
import DOMDebugger from "./cdp/DOMDebugger.ts";
import Runtime from "./cdp/Runtime.ts";
import Page from "./cdp/Page.ts";
import Input from "./cdp/Input.ts";
import Target from "./cdp/Target.ts";
import Network from "./cdp/Network.ts";

import CDPInteractor from "./CDPInteractor.ts";
import Profiler from './cdp/Profiler.ts';

export default class CDP {
    driver: ChromeDriver;
    cdpSession: any;

    accessibility: Accessibility;
    console: Console;
    css: CSS;
    dom: DOM;
    domDebugger: DOMDebugger;
    page: Page;
    runtime: Runtime;
    interactor: CDPInteractor;
    input: Input;
    target: Target;
    network: Network;
    profiler: Profiler;

    constructor(driver: ChromeDriver) {
      this.driver = driver;
      this.accessibility = new Accessibility(driver);
      this.console = new Console(driver);
      this.css = new CSS(driver);
      this.dom = new DOM(driver);
      this.runtime = new Runtime(driver);
      this.domDebugger = new DOMDebugger(driver);
      this.page = new Page(driver);
      this.input = new Input(driver);
      this.target = new Target(driver);
      this.network = new Network(driver);
      this.profiler = new Profiler(driver);

      this.interactor = new CDPInteractor(driver, this.dom, this.runtime, this.input);
    }
  
    async init() {
      await this.driver.sendAndGetDevToolsCommand("DOM.enable", {});
      await this.driver.sendAndGetDevToolsCommand("Accessibility.enable", {});
      await this.driver.sendAndGetDevToolsCommand("CSS.enable", {});
      await this.driver.sendAndGetDevToolsCommand("Console.enable", {});
      await this.driver.sendAndGetDevToolsCommand("Network.enable", {});

      this.cdpSession = await this.driver.createCDPConnection('page');
      this.console.init(this.cdpSession);
      this.target.init(this.cdpSession);
      this.network.init(this.cdpSession);
      this.page.init(this.cdpSession);
      this.profiler.init(this.cdpSession);
      this.runtime.init(this.cdpSession);
    }

    async getAxTree(): Promise<string> {
      const cdpRootAxTree = await this.accessibility.getRootAXNode();
      const cdpFullAXTree = await this.accessibility.getFullAXTree();
      const mapBackendNodeIds: { [key: BackendNodeId]: AXNode } = {};
      const mapNodeIds: { [key: AXNodeId]: AXNode } = {};
  
      for (const node of cdpFullAXTree) {
        if (node.backendDOMNodeId) {
          mapBackendNodeIds[node.backendDOMNodeId] = node;
        }
        if (node.nodeId) {
          mapNodeIds[node.nodeId] = node;
        }
      }
      return this.stringifyAxNode(cdpRootAxTree, 0, mapBackendNodeIds, mapNodeIds);
    }
    stringifyAxNode(axNode: AXNode, depth: number, mapBackendNodeIds: { [key: string]: any }, mapNodeIds: { [key: string]: any }): string {
      let skipNode = "none" === axNode.role?.value;
      if (skipNode) {
        let acc = '';
        if (axNode.childIds) {
          for (let i = 0; i < axNode.childIds.length; i++) {
            let childId = axNode.childIds[i];
            let child : AXNode;
            if (mapBackendNodeIds[childId]) {
              child = mapBackendNodeIds[childId];
            } else if (mapNodeIds[childId]) {
              child = mapNodeIds[childId];
            } else {
              console.warn("miss");
              continue;
            }
            if (i !== 0) {
              acc += '\n';
            }
            acc += this.stringifyAxNode(child, depth, mapBackendNodeIds, mapNodeIds);
          }
        }
        return acc;
      }
      let acc = ' '.repeat(depth);
      acc += `<${axNode.role?.value ?? 'generic'}`;
      acc += ` "${axNode.name?.value.replace(/\"/g, "'") ?? ""}"`;
    
      if (axNode.backendDOMNodeId) {
        acc += ` backendDOMNodeId="${axNode.backendDOMNodeId}"`;
      }
      if (axNode.properties) {
        for (const property of axNode.properties) {
          acc += ` ${String(property['name']).replace(/\"/g, "'")}="${String(property['value']['value']).replace(/\"/g, "'")}"`;
        }
      }
      acc += '>';
    
      if (axNode.childIds) {
        for (const childId of axNode.childIds) {
          let child : AXNode;
          if (mapBackendNodeIds[childId]) {
            child = mapBackendNodeIds[childId];
          } else if (mapNodeIds[childId]) {
            child = mapNodeIds[childId];
          } else {
            console.warn("miss");
            continue;
          }
          acc += '\n' + this.stringifyAxNode(child, depth + 1, mapBackendNodeIds, mapNodeIds);
        }
      }
    
      acc += '\n' + ' '.repeat(depth) + `</${axNode.role?.value ?? 'generic'}>`;
      return acc;
    }
  
    batched(arr: any[], n: number): any[] {
      const result: any[] = [];
      for (let i = 0; i < arr.length; i += n) {
        result.push(arr.slice(i, i + n));
      }
      return result;
    }
  
    isStyleItemRelevant(item: CSSComputedStyleProperty) {
      const relevantStyles = [
        'display', 'visibility', 'opacity', 'position', 'font-size',
        'cursor', 'background', 'background-color', 'color'
      ];
      return relevantStyles.includes(item['name']);
    }
  
    async getRelevantStyles(backendNodeId: BackendNodeId) {
  
      const node = await this.dom.describeNode(backendNodeId);
      const nodeId = node.nodeId;
      const computedStyles = await this.css.getComputedStyleForNode(nodeId);
  
      const relevantStyles = computedStyles.filter(item => this.isStyleItemRelevant(item));
  
      const toReturn: { [key: string]: string } = {};
  
      for (const item of relevantStyles) {
        const { name, value } = item;
  
        // Exclude specific styles
        if ((name === "position" && value === "static") ||
          (name === "color" && value === "rgb(0, 0, 0)") ||
          (name === "font-size" && value === "13.3333px") ||
          (name === "background-color" && value === "rgba(0, 0, 0, 0)") ||
          (name === "cursor" && (value === "default" || value === "auto")) ||
          (name === "opacity" && value === "1") ||
          (name === "visibility" && value === "visible")) {
          continue;
        }
        toReturn[name] = value;
      }
    }
  
    stringifyDomNode(node: Node, depth: number = 0): string {
      //const value = this.interactor.getValueForNode(node, true);
      // Uncomment if necessary
      // const listeners = this.runtime.getListeners(backendNodeId);
      // if (listeners) node['listeners'] = listeners;
      // const nativeInteractions = this.interactor.getNativeInteractions(node);
      // if (nativeInteractions) node['nativeInteractions'] = nativeInteractions;
      // const styles = this.css.getRelevantStyles(backendNodeId);
      // if (styles) node['styles'] = styles;
      // if (styles['display'] === 'none' || ('visibility' in node['styles'] && node['styles']['visibility'] === 'hidden')) {
      //   return false;
      // }

      let acc = ' '.repeat(depth);
      if (node['nodeName'] === "#text") {
        acc += node['nodeValue'].replace(/"/g, "'");
      } else {
        if (node['nodeName'] === "STYLE" || node['nodeName'] === "SCRIPT") {
          return "";
        }
        let skipElement = node['nodeName'] !== "#document";
        if (skipElement) {
          acc += `<${node['nodeName']} backendNodeId="${node['backendNodeId']}"`;
        }
        if (node.attributes) {
          for (let [key, value] of this.batched(node.attributes, 2)) {
            if (key !== "style") {
              acc += ` ${key}="${value.replace(/"/g, "'")}"`;
            }
          }
        }
        if (skipElement) {
          acc += '>';
        }
        if (node.children) {
          for (let child of node.children) {
            acc += '\n' + this.stringifyDomNode(child, depth + 1);
          }
        }
        if (skipElement) {
          acc += '\n' + ' '.repeat(depth) + `</${node.nodeName}>`;
        }
      }
      return acc;
    }
  }
  