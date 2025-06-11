
import ChromeDriver from '../ChromeDriver.ts';

export default class Profiler {
  private driver: ChromeDriver;

  cdpSession : any;
  messages : any;

  constructor(driver: ChromeDriver) {
    this.driver = driver;
    this.messages = [];
  }

  async init(cdpSession : any) {
    this.cdpSession = cdpSession;
    await cdpSession.send("Profiler.enable", {});
    
    cdpSession._wsConnection.on("message", (buffer:any) => {
      let messageObj = JSON.parse(new TextDecoder().decode(buffer));
      if (messageObj.method === "Profiler.consoleProfileStarted") {
        console.log(messageObj);
      } else if (messageObj.method === "Profiler.consoleProfileFinished") {
        console.log(messageObj);
      }
    });
  }

  getMessages() {
    let toReturn = JSON.stringify(this.messages);
    this.messages = [];
    return toReturn;
  }

  async start() {
    await this.cdpSession.send("Profiler.start", {});
  }

  async stop() {

    /*
    {
  "id": 9,
  "result": {
    "profile": {
      "nodes": [
        {
          "id": 1,
          "callFrame": {
            "functionName": "(root)",
            "scriptId": "0",
            "url": "",
            "lineNumber": -1,
            "columnNumber": -1
          },
          "hitCount": 0,
          "children": [
            2,
            3,
            4,
            7
          ]
        },
        {
          "id": 2,
          "callFrame": {
            "functionName": "(program)",
            "scriptId": "0",
            "url": "",
            "lineNumber": -1,
            "columnNumber": -1
          },
          "hitCount": 10
        },
        {
          "id": 3,
          "callFrame": {
            "functionName": "(idle)",
            "scriptId": "0",
            "url": "",
            "lineNumber": -1,
            "columnNumber": -1
          },
          "hitCount": 96
        },
        {
          "id": 4,
          "callFrame": {
            "functionName": "",
            "scriptId": "13",
            "url": "",
            "lineNumber": 0,
            "columnNumber": 9
          },
          "hitCount": 0,
          "children": [
            5
          ]
        },
        {
          "id": 5,
          "callFrame": {
            "functionName": "",
            "scriptId": "13",
            "url": "",
            "lineNumber": 0,
            "columnNumber": 29
          },
          "hitCount": 0,
          "children": [
            6
          ]
        },
        {
          "id": 6,
          "callFrame": {
            "functionName": "callFunction",
            "scriptId": "13",
            "url": "",
            "lineNumber": 361,
            "columnNumber": 21
          },
          "hitCount": 1,
          "positionTicks": [
            {
              "line": 380,
              "ticks": 1
            }
          ]
        },
        {
          "id": 7,
          "callFrame": {
            "functionName": "",
            "scriptId": "15",
            "url": "",
            "lineNumber": 0,
            "columnNumber": 9
          },
          "hitCount": 0,
          "children": [
            8
          ]
        },
        {
          "id": 8,
          "callFrame": {
            "functionName": "",
            "scriptId": "15",
            "url": "",
            "lineNumber": 0,
            "columnNumber": 29
          },
          "hitCount": 0,
          "children": [
            9
          ]
        },
        {
          "id": 9,
          "callFrame": {
            "functionName": "callFunction",
            "scriptId": "15",
            "url": "",
            "lineNumber": 361,
            "columnNumber": 21
          },
          "hitCount": 0,
          "children": [
            10
          ]
        },
        {
          "id": 10,
          "callFrame": {
            "functionName": "apply.element-6066-11e4-a52e-4f735466cecf",
            "scriptId": "15",
            "url": "",
            "lineNumber": 400,
            "columnNumber": 23
          },
          "hitCount": 0,
          "children": [
            11
          ]
        },
        {
          "id": 11,
          "callFrame": {
            "functionName": "",
            "scriptId": "15",
            "url": "",
            "lineNumber": 400,
            "columnNumber": 42
          },
          "hitCount": 0,
          "children": [
            12
          ]
        },
        {
          "id": 12,
          "callFrame": {
            "functionName": "P",
            "scriptId": "15",
            "url": "",
            "lineNumber": 447,
            "columnNumber": 10
          },
          "hitCount": 1,
          "positionTicks": [
            {
              "line": 448,
              "ticks": 1
            }
          ]
        }
      ],
      "startTime": 55023924001,
      "endTime": 55024062042,
      "samples": [
        2,
      .......
      ],
      "timeDeltas": [
      .......
        1250
      ]
    }
  },
  "sessionId": "C3406D4FC4EDBD3316DB3F60326F508D"
}'
*/
    return await this.cdpSession.send("Profiler.stop", {});
  }

  async stopAndGetCalledFunctions() {
    let toReturn = [];
    let profilerProfie = await this.stop() as any;
    for (let profileNode of profilerProfie.result.profile.nodes) {
      if (profileNode.callFrame.functionName) {
        toReturn.push(profileNode.callFrame.functionName + " " + profileNode.callFrame.lineNumber + ":" + profileNode.callFrame.columnNumber);
      }
    }
    if (toReturn.length) {
      return "The following function were called client-side, seen from Profiler/Performance view: " + JSON.stringify(toReturn);
    } else {
      return "";
    }
  }
}