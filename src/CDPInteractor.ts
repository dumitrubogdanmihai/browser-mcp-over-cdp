import ChromeDriver from './ChromeDriver.ts';
import { BackendNodeId } from "./cdp/DOM.ts";
import DOM, {Node} from "./cdp/DOM.js";
import Runtime, {CallFunctionReturnObject}  from "./cdp/Runtime.ts";
import Input from "./cdp/Input.ts"

export default class CDPInteractor {
  driver: ChromeDriver;
  dom: DOM;
  runtime: Runtime;
  input: Input;

  // Constants
  inputTypeWithValue: string[] = [
    "COLOR", "DATE", "DATETIME-LOCAL", "EMAIL", "MONTH", "NUMBER", "PASSWORD", "RANGE", "SEARCH", "TEL", "TEXT", "TIME", "URL", "WEEK"
  ];
  inputTypeWithCheckedValue: string[] = ["RADIO", "CHECKBOX"];
  inputTypeClickable: string[] = ["BUTTON", "SUBMIT", "IMAGE", "RESET", "RADIO", "CHECKBOX"];
  inputTypeUploadable: string[] = ["FILE"];
  inputTypeIgnored: string[] = ["HIDDEN"];

  constructor(driver: ChromeDriver, dom: DOM, runtime: Runtime, input: Input) {
    this.driver = driver;
    this.dom = dom;
    this.runtime = runtime;
    this.input = input;
  }

  async findDocumentNode(node: Node, predicate: (node: any) => boolean): Promise<Node | null> {
    if (predicate(node)) {
      return node;
    }
    if (node.children) {
      for (let child of node.children) {
        const result = this.findDocumentNode(child, predicate);
        if (result) {
          return result;
        }
      }
    }
    return null;
  }

  async getNativeInteractions(node: Node): Promise<string[] | undefined> {
    const nodeName = node.name || node.localName;
    switch (nodeName) {
      case "A":
        return ["doClick"];
      case "INPUT":
        let type = "TEXT";
        if (node.attributes) {
          for (let [name, value] of this.batched(node.attributes, 2)) {
            if (name === 'type') {
              type = value.toUpperCase();
              break;
            }
          }
        }
        if (this.inputTypeWithCheckedValue.includes(type)) {
          return ["doFocus", "doClick"];
        }
        if (this.inputTypeClickable.includes(type)) {
          return ["doFocus", "doClick"];
        }
        if (type === "search") {
          return ["doFocus", "doSetValue", "doSubmit"];
        }
        if (this.inputTypeWithValue.includes(type)) {
          return ["doFocus", "doSetValue"];
        }
        break;
      case "TEXTAREA":
        return ["doFocus", "doSetValue"];
      case "SELECT":
        return ["doFocus", "doSelectIndex"];
      case "FORM":
        return ["doFocus", "doSubmit"];
      default:
        return undefined;
    }
  }

  async doClick(backendNodeId: BackendNodeId) {
    const resolvedNode = await this.dom.resolveNode(undefined, backendNodeId);
    let result : CallFunctionReturnObject = await this.runtime.callFunctionOn("function() { if (this.nodeType === Node.TEXT_NODE) { this.parentElement.click() } else { this.click() } }",
      resolvedNode.objectId);
    if (result.exceptionDetails) {
      throw new Error(JSON.stringify(result, null, 2));
    }
  }

  async doFocus(backendNodeId: any) {
    await this.dom.focus(undefined, backendNodeId);
  }

  async doSendKey(backendNodeId: any, keys: string) {
    await this.doFocus(backendNodeId);
    for (let i = 0; i < keys.length; i++) {
      let key = keys.charAt(i);
      await this.input.dispatchKeyEvent("keyDown", undefined, key);
      await this.input.dispatchKeyEvent("keyUp", undefined, key);
    }
  }

  async doSetValue(backendNodeId: any, value: any): Promise<string> {
    let node = await this.dom.describeNode(undefined, backendNodeId);
    return this.doSetValueOnNode(node, value);
  }

  async doSetValueOnNode(node: Node, value: any): Promise<string> {
    const backendNodeId = node.backendNodeId;
    const isElement = node.nodeType === 1;
    if (!isElement) return "not an element";
    const nodeName = node.name || node.localName;

    if (nodeName === 'select' || nodeName === 'textarea') {
      const resolvedNode = await this.dom.resolveNode(undefined, backendNodeId);
      const nodeObjectId = resolvedNode.objectId;
      const result = await this.runtime.callFunctionOn("function(value) { this.value = value }", nodeObjectId, [{value}]);
      if (result.exceptionDetails) {
        throw new Error(JSON.stringify(result, null, 2));
      }
      return "ok";
    }

    if (nodeName === 'input') {
      const resolvedNode = await this.dom.resolveNode(undefined, backendNodeId);
      const nodeObjectId = resolvedNode.objectId;
      let type = 'TEXT';
      if (node.attributes) {
        for (let [name, attValue] of this.batched(node.attributes, 2)) {
          if (name === 'type') {
            type = attValue.toUpperCase();
            break;
          }
        }
      }

      if (this.inputTypeWithValue.includes(type)) {
        const result = await this.runtime.callFunctionOn("function(value) { this.value = value }", nodeObjectId, [{value}]);
        if (result.exceptionDetails) {
          throw new Error(JSON.stringify(result, null, 2));
        }
        return "ok";
      }

      if (this.inputTypeWithCheckedValue.includes(type)) {
        let checked = false;
        if (value === "checked" || value === "unchecked") {
          checked = value === "checked";
        } else if (value === true || value === false) {
          checked = value === true;
        } else {
          return "value should be either 'checked' or 'unchecked'";
        }

        const result = await this.runtime.callFunctionOn("function(checked) { this.checked = checked }", nodeObjectId, [{value: checked}]);
        if (result.exceptionDetails) {
          throw new Error(JSON.stringify(result, null, 2));
        }
        return "ok";
      }
    }

    throw new Error(`cannot set value on element '${nodeName}'. Can set value just on input, select, and textarea elements`);
  }

  async getValue(backendNodeId: any): Promise<any> {
    let node = await this.dom.describeNode(undefined, backendNodeId);
    return this.getValueForNode(node);
  }

  async getValueForNode(node: any, safe: boolean = false): Promise<any> {
    const backendNodeId = node.backendNodeId;
    const isElement = node.nodeType === 1;
    if (!isElement) {
      if (safe) return null;
      else throw new Error("Cannot get value because it is not an element.");
    }
    const nodeName = node.name?.value || node.localName;
    if (nodeName === 'select' || nodeName === 'textarea') {
      const resolvedNode = await this.dom.resolveNode(undefined, backendNodeId);
      const nodeObjectId = resolvedNode.objectId;
      const result = await this.runtime.callFunctionOn("function(checked) { return this.value }", nodeObjectId);
      if (result.exceptionDetails) {
        throw new Error(JSON.stringify(result, null, 2));
      }
      return result.result.value;
    }

    if (nodeName === 'input') {
      const resolvedNode = await this.dom.resolveNode(undefined, backendNodeId);
      const nodeObjectId = resolvedNode.objectId;
      let type = 'TEXT';
      if (node.attributes) {
        if (Array.isArray(node.attributes)) {
          for (let [name, value] of this.batched(node.attributes, 2)) {
            if (name === 'type') {
              type = value.toUpperCase();
              break;
            }
          }
        }
      }
      if (this.inputTypeWithValue.includes(type)) {
        const result = await this.runtime.callFunctionOn("function(checked) { return this.value }", nodeObjectId);
        if (result.exceptionDetails) {
          throw new Error(JSON.stringify(result, null, 2));
        }
        return result.result.value;
      }

      if (this.inputTypeWithCheckedValue.includes(type)) {
        const result = await this.runtime.callFunctionOn("function(checked) { return this.checked }", nodeObjectId);
        if (result.exceptionDetails) {
          throw new Error(JSON.stringify(result, null, 2));
        }
        return result.result.value ? "checked" : "unchecked";
      }
    }

    if (safe) return null;
    else throw new Error(`cannot get value on element '${nodeName}'. Can get value just on input, select, and textarea elements`);
  }

  async doSubmit(backendNodeId: any): Promise<string> {
    let node = await this.dom.describeNode(undefined, backendNodeId);
    return this.doSubmitNode(node);
  }

  async doSubmitNode(node: any): Promise<string> {
    const backendNodeId = node.backendNodeId;
    const isElement = node.nodeType === 1;
    if (!isElement) return "not an element";
    const nodeName = node.name?.value || node.localName;

    if (nodeName === 'form' || nodeName === 'input') {  // with search type
      const resolvedNode = await this.dom.resolveNode(undefined, backendNodeId);
      const nodeObjectId = resolvedNode.objectId;
      const result = await this.runtime.callFunctionOn("function(checked) { return this.submit() }", nodeObjectId);
      if (result.exceptionDetails) {
        throw new Error(JSON.stringify(result, null, 2));
      }
      return "ok";
    } else {
      throw new Error("not a 'form' element");
    }
  }

  async doSelectIndex(backendNodeId: any, index: number): Promise<string> {
    const node = await this.dom.describeNode(undefined, backendNodeId);
    return this.doSelectIndexNode(node, index);
  }

  async doSelectIndexNode(node: any, index: number): Promise<string> {
    const backendNodeId = node.backendNodeId;
    const isElement = node.nodeType === 1;
    if (!isElement) return "not an element";
    const nodeName = node.name?.value || node.localName;

    if (nodeName === 'SELECT') {
      const resolvedNode = await this.dom.resolveNode(undefined, backendNodeId);
      const nodeObjectId = resolvedNode.objectId;
      const result = await this.runtime.callFunctionOn("function(index) { this.selectedIndex = index }", nodeObjectId, [{ value: index }]);
      if (result.exceptionDetails) {
        throw new Error(JSON.stringify(result, null, 2));
      }
      return "ok";
    } else {
      throw new Error("element not a 'select'");
    }
  }

  batched(array: any[], n: number): any[] {
    let result = [];
    for (let i = 0; i < array.length; i += n) {
      result.push(array.slice(i, i + n));
    }
    return result;
  }
}