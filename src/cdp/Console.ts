
import ChromeDriver from '../ChromeDriver.ts';

// Enum for console message sources
export enum ConsoleMessageSource {
    Xml = 'xml',
    Javascript = 'javascript',
    Network = 'network',
    ConsoleApi = 'console-api',
    Storage = 'storage',
    Appcache = 'appcache',
    Rendering = 'rendering',
    Security = 'security',
    Other = 'other',
    Deprecation = 'deprecation',
    Worker = 'worker',
  }
  
  // Enum for console message levels
  export enum ConsoleMessageLevel {
    Log = 'log',
    Warning = 'warning',
    Error = 'error',
    Debug = 'debug',
    Info = 'info',
  }
  
  // Interface for a console message
  export interface ConsoleMessage {
    source: ConsoleMessageSource;
    level: ConsoleMessageLevel;
    text: string;
    url?: string;
    line?: number;
    column?: number;
  }
  
export default class Console {
  private driver: ChromeDriver;
  private cdpSession : any;
  private messages : any;

  constructor(driver: ChromeDriver) {
    this.driver = driver;
    this.messages = [];
  }

  async init(cdpSession : any) {
    await cdpSession.send("Console.enable", {});
    
    cdpSession._wsConnection.on("message", (buffer:any) => {
      let messageObj = JSON.parse(new TextDecoder().decode(buffer));
      if (messageObj.method === "Console.messageAdded") {
        //{"method":"Console.messageAdded","params":{"message":{"source":"console-api","level":"log","text":"1","line":1,"column":9}},"sessionId":"48F3EC0D1BBD820773CB574D9F151E10"}
        this.messages.push(messageObj.params);
      }
    });
  }

  async clearMessages() {
    await this.driver.sendAndGetDevToolsCommand("Console.clearMessages", {});
  }

  getMessages() {
    let toReturn = "";
    if (this.messages.length !== 0) {
      toReturn = "The following logs appeared in console: " + JSON.stringify(this.messages
        .map((msg : any) => {
          return msg.message.level + " (" + msg.message.source + "#" + msg.message.line + ":" + msg.message.column + "): " + msg.message.text;
        })
      );
    }
    this.messages = [];
    return toReturn;
  }
}