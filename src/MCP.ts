import process from 'process';

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { Builder } from 'selenium-webdriver';
import ChromeDriver from './ChromeDriver.ts';
import CDP from "./CDP.ts";

import DomSnapshotTaker from './DomSnapshotTaker.ts';
import DomInteractionsOperator from "./DomInteractionsOperator.ts";
import VisualSnapshotTaker from "./VisualSnapshotTaker.ts";
import A11yTreeSnapshotTaker from "./A11yTreeSnapshotTaker.ts";

const capabilities = {
  browserName: 'chrome',
  'selenoid:options': {
    enableVNC: true,
    enableVideo: false,
    sessionTimeout: '30m',
    env: ['LANG=en_US.UTF-8', 'LANGUAGE=us:en', 'LC_ALL=en_US.UTF-8']
  }
};
const builder = new Builder()
  .withCapabilities(capabilities)
  .forBrowser('chrome');
const seleniumHubUrl = process.env.SELENIUM_HUB_URL;
if (seleniumHubUrl) {
  builder.usingServer(seleniumHubUrl);
}
const driver = await builder.build() as ChromeDriver

let cdp = new CDP(driver);
await cdp.init();

let domInteractionsOperator = new DomInteractionsOperator(driver, cdp.dom, cdp.runtime, cdp.input);
let domSnapshotTaker = new DomSnapshotTaker(domInteractionsOperator, cdp.domSnapshot);
let visualSnapshotTaker = new VisualSnapshotTaker(cdp.page, cdp.dom, cdp.domDebugger, domInteractionsOperator);
let a11yTreeSnapshotTaker = new A11yTreeSnapshotTaker(cdp.accessibility, cdp.dom, cdp.css);

const server = new McpServer({
  name: "Browser CDP",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

let backedNodeIdType = z.number().describe("The node id.");
let nodeDescription = z.string().min(10).max(300).describe("Describe the element in human terms, so that a human would be able from this description to find the element in the page, without knowing the id.");

server.tool(
  "do_navigate-to",
  "Navigate to a page",
  {
    url: z.string().describe("The URL to navigate to."),
  },
  async ({ url }) => {
    await driver.get(url);
    return {
      content: [
        {
          type: "text",
          text: "ok",
        },
      ],
    };
  },
);

server.tool(
  "get_console_logs",
  "Get the console logs as JSON and clear console.",
  {},
  () => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(cdp.console.getMessages()),
        },
      ],
    };
  },
);

server.tool(
  "get_current_page_url",
  "Get the URL of the current page",
  {},
  async () => {
    return {
      content: [
        {
          type: "text",
          text: await driver.getCurrentUrl(),
        },
      ],
    };
  },
);

server.tool(
  "do_go_back",
  "Goes one step backward in the browser history",
  {},
  async () => {
    await driver.navigate().back();
    return {
      content: [
        {
          type: "text",
          text: "ok",
        },
      ],
    };
  },
);

server.tool(
  "do_go_forward",
  "Goes one step forward in the browser history",
  {},
  async () => {
    await driver.navigate().forward();
    return {
      content: [
        {
          type: "text",
          text: "ok",
        },
      ],
    };
  },
);

server.tool(
  "do_reload",
  "Refreshes the current page",
  {},
  async () => {
    await driver.navigate().refresh();
    return {
      content: [
        {
          type: "text",
          text: "ok",
        },
      ],
    };
  },
);


server.tool(
  "get_page_snapshot_as_accessibility_tree",
  "Get a snapshot of the page as an accessibility tree. This is a clear, compact and a higher level representation",
  {},
  async () => {
    let toReturn : string = await a11yTreeSnapshotTaker.takeNapshot();
    return {
      content: [
        {
          type: "text",
          text: toReturn,
        },
      ],
    };
  },
);

server.tool(
  "get_page_snapshot_as_text",
  "Get a snapshot of the page as text extracted from HTML DOM tree. The links and clickable elements are preceided by the ID (backedNodeId) around square brackets (for e.g. [2]link).",
  {},
  async () => {
    let toReturn = await domSnapshotTaker.takeSnapshot();
    return {
      content: [
        {
          type: "text",
          text: toReturn,
        },
      ],
    };
  },
);

server.tool(
  "get_page_snapshot_as_jpeg_screenshoot",
  "Get a JPEG screenshots of the page.",
  async () => {
    return {
      content: [
        {
          type: "image",
          mimeType: "image/jpeg",
          data: await cdp.page.captureScreenshot(),
        },
      ],
    };
  }
);

server.tool(
  "get_page_enhanced_snapshot_as_jpeg_screenshoot",
  "Get a JPEG screenshots of the page enriched with green boxes for interactible elements, each box in the top middle part has the backedNodeId.",
  async () => {
    let imageBase64 : string = await cdp.page.captureScreenshot();
    imageBase64 = await cdp.page.captureScreenshot();
    let domSnapshot = await cdp.domSnapshot.getSnapshot(["display", "position", "opacity"], true, false, true);
    return {
      content: [
        {
          type: "image",
          mimeType: "image/jpeg",
          data: await visualSnapshotTaker.drawRects(imageBase64, domSnapshot),
        }        
      ],
    };
  }
);

server.tool(
  "do_click_node_by_id",
  "Click a node by backendNodeId",
  {
    backendNodeId: backedNodeIdType,
    nodeDescription: nodeDescription
  },
  async ( {backendNodeId} ) => {

    let pNodeResolved = await cdp.dom.resolveNode(undefined, backendNodeId);
    if (pNodeResolved.objectId) {
      let listeners : any = await cdp.domDebugger.getEventListeners(pNodeResolved.objectId);
      let node = await cdp.dom.describeNode(undefined, backendNodeId);
      let nativeInteractions : any = domInteractionsOperator.getNativeInteractions(node);
      if (listeners.length === 0 && nativeInteractions) {
        return {
          content: [{ type: "text", text: "The element with backendNodeId " + backendNodeId + " is not clickable." }],
        };
      }
    }

    await domInteractionsOperator.doClick(backendNodeId);
    await driver.wait(async () => {
      const readyState = await driver.executeScript("return document.readyState");
      return readyState === "complete";
    }, 10000);

    return {
      content: [{ type: "text", text: "ok" }],
    };
  }
);

server.tool(
  "do_focus_node_by_id",
  "Focus a node by backendNodeId",
  {
    backendNodeId: backedNodeIdType,
    nodeDescription: nodeDescription
  },
  async ({ backendNodeId }: { backendNodeId: number }) => {
    await domInteractionsOperator.doFocus(backendNodeId);
    return {
      content: [{ type: "text", text: "ok" }],
    };
  }
);

server.tool(
  "do_send_keys_to_node_by_id",
  "Send keys/text to a node by backendNodeId",
  {
    keysToSend: z.string().describe("The keys to send."),
    backendNodeId: backedNodeIdType,
    nodeDescription: nodeDescription
  },
  async ( { backendNodeId, keysToSend } ) => {
    await domInteractionsOperator.doSendKey(backendNodeId, keysToSend);
    return {
      content: [{ type: "text", text: "ok" }],
    };
  }
);

server.tool(
  "do_set_value_to_node_by_id",
  "Set value to a node (input/select/textarea) by backendNodeId",
  {
    value: z.string().describe("The value to set."),
    backendNodeId: backedNodeIdType,
    nodeDescription: nodeDescription
  },
  async ( { backendNodeId, value  } ) => {
    await domInteractionsOperator.doSetValue(backendNodeId, value);
    return {
      content: [{ type: "text", text: "ok" }],
    };
  }
);

server.tool(
  "do_submit_node_by_id",
  "Submit a form/search node by backendNodeId",
  {
    backendNodeId: backedNodeIdType,
    nodeDescription: nodeDescription
  },
  async ( { backendNodeId } ) => {
    domInteractionsOperator.doSubmit(backendNodeId);
    return {
      content: [{ type: "text", text: "ok" }],
    };
  }
);

server.tool(
  "do_select_index_on_node_by_id",
  "Select option on select node by backendNodeId",
  {
    value: z.string().describe("The value to set."),
    backendNodeId: backedNodeIdType,
    nodeDescription: nodeDescription
  },
  async ( { backendNodeId, value } ) => {
    domInteractionsOperator.doSelectOptionValue(backendNodeId, value);
    return {
      content: [{ type: "text", text: "ok" }],
    };
  }
);

async function main() {
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});