import process from 'process';

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { Builder } from 'selenium-webdriver';
import ChromeDriver from './ChromeDriver.ts';
import CDP from "./CDP.ts";

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

const server = new McpServer({
  name: "Browser CDP",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.tool(
  "navigate-to",
  "Navigate to a page",
  {
    url: z.string().url().describe("The URL to navaigate to."),
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
  "go_back",
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
  "go_forward",
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
  "reload",
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
    let toReturn : string = await cdp.getAxTree();
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
  "get_page_snapshot_as_html_dom",
  "Get a snapshot of the page as HTML DOM tree",
  {},
  async () => {
    return {
      content: [
        {
          type: "text",
          text: cdp.stringifyDomNode(await cdp.dom.getDocument(-1, true)),
        },
      ],
    };
  },
);

server.tool(
  "get_page_snapshot_as_jpeg_screenshoot",
  "Get a snapshot of the page as a JPEG screenshot.",
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
  "do_click_node_by_id",
  "Click a node by backendNodeId",
  {
    backendNodeId: z.number().describe("The node id."),
  },
  async ( {backendNodeId} ) => {
    await cdp.interactor.doClick(backendNodeId);
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
    backendNodeId: z.number().describe("The node id."),
  },
  async ({ backendNodeId }: { backendNodeId: number }) => {
    await cdp.interactor.doFocus(backendNodeId);
    return {
      content: [{ type: "text", text: "ok" }],
    };
  }
);

server.tool(
  "do_send_keys_to_node_by_id",
  "Send keys/text to a node by backendNodeId",
  {
    backendNodeId: z.number().describe("The node id."),
    keysToSend: z.string().describe("The keys to send."),
  },
  async ( { backendNodeId, keysToSend } ) => {
    await cdp.interactor.doSendKey(backendNodeId, keysToSend);
    return {
      content: [{ type: "text", text: "ok" }],
    };
  }
);

server.tool(
  "do_set_value_to_node_by_id",
  "Set value to a node (input/select/textarea) by backendNodeId",
  {
    backendNodeId: z.number().describe("The node id."),
    value: z.string().describe("The value to set."),
  },
  async ( { backendNodeId, value  } ) => {
    await cdp.interactor.doSetValue(backendNodeId, value);
    return {
      content: [{ type: "text", text: "ok" }],
    };
  }
);

server.tool(
  "do_submit_node_by_id",
  "Submit a form/search node by backendNodeId",
  {
    backendNodeId: z.number().describe("The node id."),
  },
  async ( { backendNodeId } ) => {
    cdp.interactor.doSubmit(backendNodeId);
    return {
      content: [{ type: "text", text: "ok" }],
    };
  }
);

server.tool(
  "do_select_index_on_node_by_id",
  "Select option on select node by backendNodeId",
  {
    backendNodeId: "number",
    value: "string",
  },
  async ( { backendNodeId, value } ) => {
    cdp.interactor.doSelectOptionValue(backendNodeId, value);
    return {
      content: [{ type: "text", text: "ok" }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Browser MCP Server running on stdio using " + seleniumHubUrl);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});