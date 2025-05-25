import { chromium } from 'selenium-webdriver';

// Fix @types/selenium-webdriver that do not reflect implementation: https://github.dev//selenium/javascript/selenium-webdriver/chromium.js
export default interface ChromeDriver extends chromium.ChromiumWebDriver {
    sendAndGetDevToolsCommand(method: string, obj: any): Promise<any>;
    sendDevToolsCommand(method: string, obj: any): any;
    setNetworkConditions(): any;
    setDownloadPath():any;
}