import DOMSnapshot, { DOMNode, DOMSnapshotResultGetSnapshot } from "./cdp/DOMSnapshot.ts";
import DomInteractionsOperator from "./DomInteractionsOperator.ts";

export default class DomSnapshotTaker {
  
  domInteractionsOperator: DomInteractionsOperator;
  domSnapshot: DOMSnapshot;
  
  constructor(domInteractionsOperator: DomInteractionsOperator, domSnapshot: DOMSnapshot) {
    this.domInteractionsOperator = domInteractionsOperator;
    this.domSnapshot = domSnapshot;
  }

  async takeSnapshot() {
    let snapshot = await this.domSnapshot.getSnapshot(["display", "position", "opacity"], true, false, true);
    return await this.printText(snapshot.domNodes[0], 0, snapshot) + "\n\n"
      + this.printLinks(snapshot.domNodes[0], snapshot)
  }

  printLinks(node: DOMNode, snapshot: DOMSnapshotResultGetSnapshot) {
    let toReturn = "";
    if (node.nodeName === "A") {
      let attrObj = node.attributes?.find(attrObj => attrObj.name === "href");
      if (attrObj?.value) {
        toReturn = " [id=" + node.backendNodeId + "]" + toReturn;
        toReturn += "[href=" + attrObj.value + "]\n";
      }
    }
    if (node.childNodeIndexes) {
      for (let [index, childNodeIndex] of node.childNodeIndexes.entries()) {
        let child = snapshot.domNodes[childNodeIndex];
        toReturn += this.printLinks(child, snapshot);
      }
    }
    return toReturn
  }

  async printText(node: DOMNode, depth = 0, snapshot: DOMSnapshotResultGetSnapshot, isFirstChild = true) {
    let toReturn = "";
    if (node.nodeName === "SCRIPT" || node.nodeName === "STYLE") {
      return "";
    }
    if (node.nodeName === "#text") {
      return node.nodeValue;
    }


    let isBlock = false;
    if (node.layoutNodeIndex) {
      let layout = snapshot.layoutTreeNodes[node.layoutNodeIndex];
      let style = snapshot.computedStyles[layout.styleIndex];
      for (let { name, value } of style.properties) {
        if (name === "display" && value !== "inline") {
          isBlock = true;
        }
      }
    }
    if (isBlock && !isFirstChild) {
      toReturn += "\n";
    }


    let value = await this.domInteractionsOperator.getValueForNode(node, true);
    if (value) {
      toReturn += "[value='" + value + "']";
    }
    let nativeInteractions = this.domInteractionsOperator.getNativeInteractionsForNode(node.nodeName, node.attributes);
    if (nativeInteractions && nativeInteractions.length) {
      toReturn += "[supports=" + nativeInteractions.join(" ") + "]";
    }

    if (node.nodeName === "A") {
      let attrObj = node.attributes?.find(attrObj => attrObj.name === "href");
      if (attrObj?.value) {
        toReturn += "[id=" + node.backendNodeId + "][isLink]";
      }
    }

    if (node.eventListeners && node.eventListeners.length !== 0) {
      for (let eventListener of node.eventListeners) {
        toReturn += "[on" + eventListener.type + "]";
      }
    }
    if (toReturn) {
      toReturn = " [id=" + node.backendNodeId + "]" + toReturn;
    }

    if (node.childNodeIndexes) {
      for (let [index, childNodeIndex] of node.childNodeIndexes.entries()) {
        let child = snapshot.domNodes[childNodeIndex];
        toReturn += await this.printText(child, depth + 1, snapshot, index === 0);
      }
    }

    return toReturn;
  }
}