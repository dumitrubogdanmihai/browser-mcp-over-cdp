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
import Overlay from "./cdp/Overlay.ts";
import DOMSnapshot from "./cdp/DOMSnapshot.ts";
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
    input: Input;
    target: Target;
    network: Network;
    profiler: Profiler;
    overlay: Overlay;
    domSnapshot: DOMSnapshot;

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
      this.overlay = new Overlay(driver);
      this.domSnapshot = new DOMSnapshot(driver);
    }
  
    async init() {
      await this.driver.sendAndGetDevToolsCommand("DOM.enable", {});
      await this.driver.sendAndGetDevToolsCommand("Accessibility.enable", {});
      await this.driver.sendAndGetDevToolsCommand("CSS.enable", {});
      await this.driver.sendAndGetDevToolsCommand("Console.enable", {});
      await this.driver.sendAndGetDevToolsCommand("Network.enable", {});
      await this.driver.sendAndGetDevToolsCommand("Overlay.enable", {});

      this.cdpSession = await this.driver.createCDPConnection('page');
      await this.console.init(this.cdpSession);
      await this.target.init(this.cdpSession);
      await this.network.init(this.cdpSession);
      await this.page.init(this.cdpSession);
      await this.profiler.init(this.cdpSession);
      await this.runtime.init(this.cdpSession);
      await this.domSnapshot.enable();
    }

  
    batched(arr: any[], n: number): any[] {
      const result: any[] = [];
      for (let i = 0; i < arr.length; i += n) {
        result.push(arr.slice(i, i + n));
      }
      return result;
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
  