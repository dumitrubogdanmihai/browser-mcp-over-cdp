import dotenv, { config } from "dotenv";
dotenv.config();

import { Annotation } from "@langchain/langgraph";
import { AIMessage, AIMessageChunk, BaseMessage, ChatMessage, HumanMessage, ToolMessage, SystemMessage } from '@langchain/core/messages';

import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatPromptTemplate } from "@langchain/core/prompts";

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const AgentState = Annotation.Root({
  task: Annotation<string>,
  steps: Annotation<string[]>,
  pastStepsOutcomes: Annotation<{ step: string, outcome: string }[]>,
  step: Annotation<string>,
  stepAiMessages: Annotation<BaseMessage[]>,
  answer: Annotation<string>
});

import { loadMcpTools } from '@langchain/mcp-adapters';


let model : any = new ChatOpenAI({model: "gpt-4o-mini"});

const initBrowserMcpClient = async () => {
  const stdioClient = new Client({
    name: 'Webventurer',
    version: "1.0.0"
  });
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', '../src/MCP.ts'],
  });
  await stdioClient.connect(transport);
  return stdioClient;
};
const browserMcpClient = await initBrowserMcpClient();
const browserMcpTools = await loadMcpTools('Browser CDP', browserMcpClient);

const distructiveTools = browserMcpTools.filter(tool => tool.name.startsWith("do_"));
const readOnlyToolNames = [
  "get_current_page_url",
  "get_page_snapshot_as_text",
  //"get_page_snapshot_as_accessibility_tree",
  "get_page_snapshot_as_jpeg_screenshoot",
  "get_page_enhanced_snapshot_as_jpeg_screenshoot"
];

async function planSteps(state: typeof AgentState.State) {
  const ResponseFormatter = z.object({
    steps: z
      .string()
      .array()
      .describe("The steps"),
  });

  let modelWithStructuredOutput = model.withStructuredOutput(ResponseFormatter);

  let promptText = `Imagine you are a human browsing the web.
      
      Now you need to come up with the next step (or steps) to solve the below task, accordingly to the current browser state.
      The step(s) must be formulated in human terms, so that a human would be able from this description to perform the task in the page.
      The step(s) should be based on the current browser state, do not generate steps for future hyphotetical browser state, just for the next action.
      
      If you need to search on the web, use duckduckgo.com.
  
      Here is the task: {task}
      
      Here are the outcomes of the previous steps: {pastStepsOutcomes}
      
      Here is the interface that you can use to navigate the browser, just as a hint (DO NOT INCLUDE TOOL CALL NAMES IN THE STEP): {availableTools}`;

  let availableTools = browserMcpTools
    .filter(tool => readOnlyToolNames.indexOf(tool.name) === -1)
    .map(tool => `- tool ${tool.name} ${tool.description}\n`);
  

  let messages = await ChatPromptTemplate.fromTemplate(promptText)
  .formatMessages({
    ...state,
    availableTools
  });
  messages = messages.concat(await getBrowserStateMessages());
  
  let output : any = await modelWithStructuredOutput.invoke(messages);

  return {
    ...state,
    steps: output.steps
  }
}

async function getBrowserStateMessages() {
  let toReturn : any = [];

  toReturn.push(new HumanMessage({
    content: [
      {
        type: "text",
        text: "The browser state is:",
      }
    ]}));

  for (let toolToAutoInvoke of readOnlyToolNames) {
    let tool = browserMcpTools.find(mcpTool => mcpTool.name === toolToAutoInvoke);
    if (!tool) {
      continue;
    }

    let response;
    try {
      response = await tool.invoke({});
    } catch (e) {
      console.warn(e);
      throw e;
    }
    

    if (typeof response === "string") {
      toReturn.push(new HumanMessage({
        content: [
          {
            type: "text",
            text: tool.name + " " + tool.description + ": \n",
          },
          {
            type: "text",
            text: response,
          }
        ]
      }));
    } else if (Array.isArray(response)) {
      for (let responseItem of response) {
        if (responseItem.type === "image_url") {
          toReturn.push(new HumanMessage({
            content: [
              {
                type: "text",
                text: tool.name + " " + tool.description + ": \n",
              },
              {
                type: "image_url",
                image_url: {
                  url: responseItem.image_url.url,
                },
              },
            ],
          }));
        } else if (responseItem.type === "text") {
          toReturn.push(new HumanMessage({
            content: [
              {
                type: "text",
                text: tool.name + " " + tool.description + ": \n",
              },
              responseItem,
            ],
          }));
        }
      }
    } else {
      throw new Error("unsupported " + JSON.stringify(response));
    }
    //{ type: "image_url", image_url: "data:image/jpeg;base64,/9j/4AAQS"}
    console.log(toReturn);
  }

  return toReturn;
}

async function prepareExecution(state: typeof AgentState.State) {
  let currentStep = state.steps.shift();
  if (!currentStep) {
    return state;
  }

  let promptText = `Imagine you are a human browsing the web.
  
  Complete the below step in order to fulfill the task.
  At the end please respond with a very short outcome of the step execution.
  If you finished the task, please do not respond with the task result but instead call the "taskResponse" tool! Call the "taskResponse" tool ONLY if the task was answered.
  If you have any other things that you can do to achieve the task DO NOT call the "taskResponse" tool.

  Task: {task}

  CurrentStep: {currentStep}

  PastStepsOutcomes: {pastStepsOutcomes}`;

  const promptInput: any = {
    task: state.task,
    currentStep: currentStep,
    pastStepsOutcomes: state.pastStepsOutcomes
  }
  let prompt = ChatPromptTemplate.fromTemplate(promptText);

  let messages = await prompt.formatMessages(promptInput);
  messages = messages.concat(await getBrowserStateMessages());
  
  state.step = currentStep;
  state.stepAiMessages = messages;

  return state;
}

async function executeStep(state: typeof AgentState.State) {
  const responseTool = tool(
    ({ response }: { response: string }) => {
      console.log("respose: ", response);
    },
    {
      name: "taskResponse",
      description: "Final response to send to the user that answers the given task.",
      schema: z.object({
        response: z.string(),
      }),
    }
  );

  let tools = [responseTool, ...distructiveTools];

  let modelWithTools = model.bindTools(tools);
  let aiMessage = await modelWithTools.invoke(state.stepAiMessages);

  state.stepAiMessages.push(aiMessage);

  for (let tool of aiMessage.tool_calls) { 
    if (tool.name === responseTool.name) {
      state.answer = tool.args.response;
      return state;
    }
  }

  if (aiMessage.tool_calls.length !== 0) {
    const toolNode = new ToolNode(tools);
    let aiMessageWithToolCallResponse = (await toolNode.invoke({ messages: state.stepAiMessages }) as any).messages;

    state.stepAiMessages = state.stepAiMessages.concat(aiMessageWithToolCallResponse);
  }

  return state;
}

async function concludeStep(state: typeof AgentState.State) {

  if (state.answer) {
    return state;
  }

  state.stepAiMessages.push(new HumanMessage("And following is the browser state after performing the current step step:"));

  state.stepAiMessages = state.stepAiMessages.concat(await getBrowserStateMessages());

  state.stepAiMessages.push(new HumanMessage(`
    Now please make me a very short summary / description / conclusion about the outcome of the executed step.
    The conclusion should guide you next time to avoid making the same mistake.
    The conclusion must be formulated in human terms, so that a human would knnow what to do next or what not to do or what was the progress.

    The outcome should respond briefly to the following questions:
    a) where were you?
    b) what tool have you tried in order to interract with the page?
    c) what happened after executing the tool? Did it worked? If failed, why?
    `));

  let aiMessageWithConclusion = await model.invoke(state.stepAiMessages);

  state.stepAiMessages = [];
  state.pastStepsOutcomes.push({
    step: state.step,
    outcome: aiMessageWithConclusion
  })
  state.step = "";
  
  return state;
}

async function init(state: typeof AgentState.State) {
  return {
    ...state,
    steps: [],
    stepAiMessages: [],
    pastStepsOutcomes: [],
    answer: null
  }
}

function whatNext(state: typeof AgentState.State) {
  if (state.answer) {
    return "__end__";
  } else {
    return "replan";
  }
}

export const agent = new StateGraph(AgentState)
  .addNode("init", init)
  .addNode("plan", planSteps)
  .addNode("prepare", prepareExecution)
  .addNode("execute", executeStep)
  .addNode("conclude", concludeStep)
  .addEdge("__start__", "init")
  .addEdge("init", "plan")
  .addEdge("plan", "prepare")
  .addEdge("prepare", "execute")
  .addEdge("execute", "conclude")
  .addConditionalEdges(
    "conclude",
    whatNext,
    {
      "replan": "plan",
      "__end__": "__end__",
    }
  )
  .compile();

async function run(task: string) {
  let state = {
    task: task
  };
  for await (const event of await agent.stream(state)) {
    console.log(event);
  }
}

//await run("Is there any Kia Sportage on olx.ro on petrol, under 25.000k euros, in craiova?");
