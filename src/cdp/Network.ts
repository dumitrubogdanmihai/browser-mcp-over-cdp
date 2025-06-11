
import ChromeDriver from '../ChromeDriver.ts';
import WebSocket from 'ws';

export default class Target {
  private driver: ChromeDriver;

  cdpSession : any;
  messages : any;

  constructor(driver: ChromeDriver) {
    this.driver = driver;
    this.messages = [];
  }

  async init(cdpSession : any) {
    await cdpSession.send("Network.enable", {});

    cdpSession._wsConnection.on("message", (buffer:any) => {
      let messageObj = JSON.parse(new TextDecoder().decode(buffer));
      if (messageObj.method === "Network.requestWillBeSent"
        || messageObj.method === "Network.loadingFailed"
        || messageObj.method === "Fetch.requestPaused"
        || messageObj.method === "Network.loadingFinished"
        ||  messageObj.method === "Network.responseReceived") {
        this.messages.push(messageObj.params);
      }
    });
  }

  getMessages() {
    let toReturn = "";
    if (this.messages.length !== 0) {
      toReturn = "The following requests ended " + JSON.stringify(this.messages.map((entry : any) => {
        return {
          url: entry.response?.url,
          status: entry.response?.status
        };
      }), null, 2);
    }
    
    this.messages = [];
    return toReturn;
  }
}