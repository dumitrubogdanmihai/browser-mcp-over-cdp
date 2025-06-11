import {describe, expect, test} from '@jest/globals';

import { Builder } from 'selenium-webdriver';
import ChromeDriver from '../src/ChromeDriver.ts';
import CDP from "../src/CDP.ts";
import DomInteractionsOperator from '../src/DomInteractionsOperator.ts';

const capabilities = {
  browserName: 'chrome',
  'selenoid:options': {
    enableVNC: true,
    enableVideo: false,
    sessionTimeout: '30m',
    env: ['LANG=en_US.UTF-8', 'LANGUAGE=us:en', 'LC_ALL=en_US.UTF-8']
  }
};

describe('cdp', () => {
  
  let driver: ChromeDriver;
  let cdp: CDP;
  let domInteractionsOperator: DomInteractionsOperator;

  beforeAll(async () => {
    driver = await new Builder()
      //.usingServer('http://localhost:4444/wd/hub')
      .withCapabilities(capabilities)
      .forBrowser('chrome')
      .build() as ChromeDriver;
    cdp = new CDP(driver);
    await cdp.init();
    domInteractionsOperator = new DomInteractionsOperator(driver, cdp.dom, cdp.runtime, cdp.input);
  }, 15000);

  afterAll(async () => {
    if (driver) {
      driver.close();
      driver.quit();
    }
  }, 15000);

  test('get html snapshot', async () => {
    await driver.executeScript(`
        document.body.innerHTML=\`
          <p>test</p>
        \`;
      `);
    let document = await cdp.dom.getDocument(-1, true);
    let documentSerialization = cdp.stringifyDomNode(document, 0);
    expect(documentSerialization.replaceAll(/backendNodeId="[^"]+"/gi, "backendNodeId=\"\""))
    .toBe(`
 <HTML backendNodeId=\"\">
  <HEAD backendNodeId=\"\">
  </HEAD>
  <BODY backendNodeId=\"\">
   <P backendNodeId=\"\">
    test
   </P>
  </BODY>
 </HTML>`);
  });

  test('get screenshot snapshot', async () => {
    await driver.executeScript(`
        document.body.innerHTML=\`
          <p>test</p>
        \`;
      `);
    let screenshoot = await cdp.page.captureScreenshot();
    expect(screenshoot).toBeTruthy();
  });

  test('get console logs', async () => {
    await driver.executeScript(`console.warn("testmsg")`);
    await driver.executeScript(`console.warn("testmsg")`);
    await driver.executeScript(`console.warn("testmsg")`);
    let logs = cdp.console.getMessages();
    expect(logs.length).not.toBe(0);
  });
});