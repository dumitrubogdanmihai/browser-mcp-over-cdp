
import ChromeDriver from '../ChromeDriver.ts';

export default class Target {
  private driver: ChromeDriver;

  cdpSession : any;
  messages : any;

  constructor(driver: ChromeDriver) {
    this.driver = driver;
    this.messages = [];
  }

  async init(cdpSession : any) {
    await cdpSession.send("Target.setDiscoverTargets", {discover: true});

    cdpSession._wsConnection.on("message", (buffer:any) => {
      let messageObj = JSON.parse(new TextDecoder().decode(buffer));
      if (messageObj.method === "Target.targetInfoChanged") {
        /*
          {
            method: 'Target.targetInfoChanged',
            params: {
              targetInfo: {
                targetId: '5C1EA5940A0FE83B0911E8E23C3B7902',
                type: 'page',
                title: 'news.ycombinator.com',
                url: 'https://news.ycombinator.com/',
                attached: false,
                openerId: '50967E65E84B1C4A373B2E30E4E8D748',
                canAccessOpener: false,
                openerFrameId: '50967E65E84B1C4A373B2E30E4E8D748',
                browserContextId: '56D2B65815F1C27DCE52EF5F75EE0EB1'
              }
            },
            sessionId: '6F18A49BF1D7521FF0EAD3364B95094E'
          }
        */
        this.messages.push("Target URL changed to " + messageObj.params.targetInfo.url);
      }
    });
  }

  async clearMessages() {
    await this.driver.sendAndGetDevToolsCommand("Console.clearMessages", {});
  }

  getMessages() {
    let toReturn = JSON.stringify(this.messages);
    this.messages = [];
    return toReturn;
  }
}