import { ThenableWebDriver } from 'selenium-webdriver';

//https://github.dev//selenium/javascript/selenium-webdriver/chromium.js
export default interface ChromeDriver extends ThenableWebDriver {
    sendAndGetDevToolsCommand(method: string, obj: any): Promise<any>;
    sendDevToolsCommand(method: string, obj: any): any;
    setNetworkConditions(): any;
    setDownloadPath():any;
}