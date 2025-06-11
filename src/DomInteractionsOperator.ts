import ChromeDriver from './ChromeDriver.ts';
import { BackendNodeId } from "./cdp/DOM.ts";
import DOM, {Node} from "./cdp/DOM.ts";
import Runtime, {CallFunctionReturnObject}  from "./cdp/Runtime.ts";
import Input from "./cdp/Input.ts"
import { NameValue } from "./cdp/DOMSnapshot.ts";

export default class DomInteractionsOperator {
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

  getNativeInteractions(node: Node): string[] | undefined {
    const nodeName = node.name || node.localName;
    return this.getNativeInteractionsFor(nodeName, node.attributes);
  }

  getNativeInteractionsFor(nodeName: string, attributes: string[]|undefined): string[] | undefined {
    switch (nodeName) {
      case "A":
        return ["doClick"];
      case "INPUT":
        let type = "TEXT";
        if (attributes) {
          for (let [name, value] of this.batched(attributes, 2)) {
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

  getNativeInteractionsForNode(nodeName: string, attributes: NameValue[]|undefined): string[] | undefined {
    switch (nodeName) {
      case "A":
        return ["doClick"];
      case "INPUT":
        let type = "TEXT";
        if (attributes) {
          for (let {name, value} of attributes) {
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
      const result = await this.runtime.callFunctionOn("function(value) { this.value = value }", nodeObjectId, [{value: value}]);
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
        const result = await this.runtime.callFunctionOn("function(valueToSet) { this.value = valueToSet }", nodeObjectId, [{value: value}]);
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

        const result = await this.runtime.callFunctionOn("function() { this.checked = checked }", nodeObjectId, [{value: checked}]);
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
      const result = await this.runtime.callFunctionOn("function() { return this.value }", nodeObjectId);
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
        const result = await this.runtime.callFunctionOn("function() { return this.value }", nodeObjectId);
        if (result.exceptionDetails) {
          throw new Error(JSON.stringify(result, null, 2));
        }
        return result.result.value;
      }

      if (this.inputTypeWithCheckedValue.includes(type)) {
        const result = await this.runtime.callFunctionOn("function() { return this.checked }", nodeObjectId);
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
      const result = await this.runtime.callFunctionOn("function() { return this.submit() }", nodeObjectId);
      if (result.exceptionDetails) {
        throw new Error(JSON.stringify(result, null, 2));
      }
      return "ok";
    } else {
      throw new Error("not a 'form' element");
    }
  }

  async doSelectOptionValue(backendNodeId: any, value: string): Promise<string> {
    const node = await this.dom.describeNode(undefined, backendNodeId);
    return this.doSelectOptionValueNode(node, value);
  }

  async doSelectOptionValueNode(node: any, theValue: string): Promise<string> {
    const backendNodeId = node.backendNodeId;
    const isElement = node.nodeType === 1;
    if (!isElement) return "not an element";
    const nodeName = node.name?.value || node.localName;

    if (nodeName === 'select') {
      const resolvedNode = await this.dom.resolveNode(undefined, backendNodeId);
      const nodeObjectId = resolvedNode.objectId;
      const result = await this.runtime.callFunctionOn(`function(stringValue) {
          let index = Array.from(this.querySelectorAll("option")).findIndex(option => option.getAttribute("value") === stringValue);
          if (index !== -1) {
            this.selectedIndex = index;
          } else {
            throw new Error("the option doesn't exit");
          }
      }`, nodeObjectId, [{ value: theValue }]);
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