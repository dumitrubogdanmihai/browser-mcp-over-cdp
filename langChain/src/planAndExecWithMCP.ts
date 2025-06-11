import dotenv from "dotenv";
dotenv.config();

import { Annotation } from "@langchain/langgraph";
const GraphState = Annotation.Root({
  goal: Annotation<string>,
  plan: Annotation<string>,
  pastPlansResults: Annotation<string[]>,
  conclusion: Annotation<string>,
})

import { ChatOpenAI } from "@langchain/openai";
const model = new ChatOpenAI({model: "gpt-4.1" });

import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";

import { JsonOutputToolsParser } from "@langchain/core/output_parsers/openai_tools";
const planNode = async (state: typeof GraphState.State) => {
  const planPrompt = ChatPromptTemplate.fromTemplate(
    `
    For the given goal, come up with a very short (20 words max) plan to achieve it.
    The plan SHOULD be designed for actions that rely on using a web browser. For searching use duckduckgo.com.
    
    Your goal is:
    {goal}
    `
  )
  const aiResponseMessage : AIMessage = await planPrompt
    .pipe(
      model,
    )
    .invoke({
      goal: state.goal
    });
  return {
    ...state,
    plan: aiResponseMessage.content,
  };
};


import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const initStdioClient = async () => {
  const config = {
    name: 'Browser CDP',
    version: '1.0.0'
  };
  const stdioClient = new Client(config);
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', '../src/MCP.ts']
  });
  await stdioClient.connect(transport);
  return stdioClient;
};
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import {loadMcpTools} from '@langchain/mcp-adapters';
import { createReactAgent } from "@langchain/langgraph/prebuilt";
const stdioClient = await initStdioClient();
const tools = await loadMcpTools('Browser CDP', stdioClient);
//const tools = [new TavilySearchResults({ maxResults: 3 })];
const agentExecutor = createReactAgent({
  llm: new ChatOpenAI({model: "gpt-4.1" }),
  tools: tools,
});
const executeNode = async (state: typeof GraphState.State) => {
  const input = {
    messages: [new HumanMessage(state.plan)],
  };
  const stream = await agentExecutor.stream(input, { streamMode: "values" });
  let lastMessage = {content: ""};
  //for await (const { messages } of stream) {
  //  console.log(messages);
  //}

  let result = lastMessage.content.toString();
  if (state.pastPlansResults) {
    return {
      ...state,
      pastPlansResults: [...state.pastPlansResults, "Plan: " + state.plan + "\n" + "Result: " + result]
    };
  } else {
    return {
      ...state,
      pastPlansResults: ["action: " + state.plan + "; " + "result:" + result]
    };
  }
};



import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
const replanNode = async (state: typeof GraphState.State) => {
  const responseJsonSchema = zodToJsonSchema(
    z.object({
      response: z.string().describe("Response to user."),
    }),
  );
  const responseTool = {
    type: "function",
    function: {
      name: "response",
      description: "Response to user.",
      parameters: responseJsonSchema,
    },
  };

  const planJsonSchema = zodToJsonSchema(
    z.object({
      steps: z
        .string()
        .describe("different plan to follow"),
    }),
  );
  const planFunction = {
    name: "plan",
    description: "This tool is used to plan the steps to follow",
    parameters: planJsonSchema,
  };
  const planTool = {
    type: "function",
    function: planFunction,
  };

  const replanPrompt = ChatPromptTemplate.fromTemplate(
    `For the given objective, come up with a simple plan. 
  This plan should involve individual tasks, that if executed correctly will yield the correct answer. Do not add any superfluous steps.
  The result of the final step should be the final answer. Make sure that each step has all the information needed - do not skip steps.
  
  Your objective was this:
  {goal}
  
  Your original plan was this:
  {plan}
  
  You have currently done the follow steps:
  {pastSteps}
  
  Update your plan accordingly. If no more steps are needed and you can return to the user, then respond with that and use the 'response' function.
  Otherwise, fill out the plan.
  Only add steps to the plan that still NEED to be done. Do not return previously done steps as part of the plan.`,
  );
  const parser = new JsonOutputToolsParser();
  const replanner = replanPrompt
  .pipe(
    new ChatOpenAI({model: "gpt-4.1" }).bindTools([
      planTool,
      responseTool,
    ]),
  )
  .pipe(parser);

  const output : any = await replanner.invoke({
    goal: state.goal,
    plan: state.plan,
    pastSteps: state.pastPlansResults
        .join("\n"),
  });

  if (output[0].type == "response") {
    return { conclusion: output[0].args?.response };
  }

  return { ...state, plan: output[0].args?.steps };
};





function isConclusionReached(state: typeof GraphState.State) {
  return state.conclusion ? "true" : "false";
}

import { END, START, StateGraph } from "@langchain/langgraph";
const workflow = new StateGraph(GraphState)
  .addNode("planner", planNode)
  .addNode("agent", executeNode)
  .addNode("replan", replanNode)
  .addEdge(START, "planner")
  .addEdge("planner", "agent")
  .addEdge("agent", "replan")
  .addConditionalEdges(
    "replan",
    isConclusionReached,
    {
      true: END,
      false: "agent"
    });
const app = workflow.compile();
const config = { recursionLimit: 50 };

import readline from "readline";
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const uesrInput = await new Promise<string>(resolve => {
  rl.question("What can I do for you?\n", resolve)
});
const input = {
  goal: uesrInput
};
for await (const event of await app.stream(input, config)) {
  console.log(event);
}