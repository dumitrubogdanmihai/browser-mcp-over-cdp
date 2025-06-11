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

  test('get screenshot snapshot', async () => {
    await driver.executeScript(`
        document.body.innerHTML=\`
          <p>test</p>
        \`;
      `);
    let screenshoot = await cdp.page.captureScreenshot();
    expect(screenshoot).toBeTruthy();
  });

  test('click node', async () => {
    await driver.executeScript(`
        document.body.innerHTML=\`
          <button onclick="arguments[0].target.textContent='clicked'">click me</button>
        \`;
      `);
    let getButtonElement = async () => {
      let documentNode = await cdp.dom.getDocument(-1, false);
      let htmlElement = documentNode.children && documentNode.children[0];
      let bodyElement = htmlElement?.children && htmlElement.children[1];
      let buttonElement = bodyElement?.children && bodyElement.children[0];
      if (!buttonElement) {
        throw new Error("element not found");
      }
      return buttonElement;
    }
    
    let buttonElement = await getButtonElement();
    await domInteractionsOperator.doClick(buttonElement.backendNodeId);

    buttonElement = await getButtonElement();
    expect(buttonElement.children && buttonElement.children[0].nodeValue).toBe("clicked");
  });

  test('focus node', async () => {
    await driver.executeScript(`
      document.body.innerHTML=\`
        <input type="text" onfocus="arguments[0].target.setAttribute('data-focused', true)">
      \`;
    `);
    let getInputElement = async () => {
      let documentNode = await cdp.dom.getDocument(-1, false);
      let htmlElement = documentNode.children && documentNode.children[0];
      let bodyElement = htmlElement?.children && htmlElement.children[1];
      let inputElement = bodyElement?.children && bodyElement.children[0];
      if (!inputElement) {
        throw new Error("element not found");
      }
      return inputElement;
    }
    
    let inputElement = await getInputElement();
    await domInteractionsOperator.doFocus(inputElement.backendNodeId);

    inputElement = await getInputElement();
    expect(inputElement.attributes).toContain("data-focused");
  });

  test('send keys to node', async () => {
    await driver.executeScript(`
      document.body.innerHTML=\`
        <input type="text">
      \`;
    `);
    let getInputElement = async () => {
      let documentNode = await cdp.dom.getDocument(-1, false);
      let htmlElement = documentNode.children && documentNode.children[0];
      let bodyElement = htmlElement?.children && htmlElement.children[1];
      let inputElement = bodyElement?.children && bodyElement.children[0];
      if (!inputElement) {
        throw new Error("element not found");
      }
      return inputElement;
    }
    
    let inputElement = await getInputElement();
    await domInteractionsOperator.doSendKey(inputElement.backendNodeId, "TEST");
    expect(await domInteractionsOperator.getValue(inputElement.backendNodeId)).toBe("TEST");
  });

  test('set input node value', async () => {
    await driver.executeScript(`
      document.body.innerHTML=\`
        <input type="text" value="initvalue">
      \`;
    `);
    let getInputElement = async () => {
      let documentNode = await cdp.dom.getDocument(-1, false);
      let htmlElement = documentNode.children && documentNode.children[0];
      let bodyElement = htmlElement?.children && htmlElement.children[1];
      let inputElement = bodyElement?.children && bodyElement.children[0];
      if (!inputElement) {
        throw new Error("element not found");
      }
      return inputElement;
    }
    
    let inputElement = await getInputElement();
    expect(await domInteractionsOperator.getValue(inputElement.backendNodeId)).toBe("initvalue");
    await domInteractionsOperator.doSetValue(inputElement.backendNodeId, "TEST");
    expect(await domInteractionsOperator.getValue(inputElement.backendNodeId)).toBe("TEST");
  });

  test('set select option node value', async () => {
    await driver.executeScript(`
      document.body.innerHTML=\`
        <select name="cars" id="cars">
          <option value="volvo">Volvo</option>
          <option value="saab">Saab</option>
        </select>
      \`;
    `);
    let getSelectElement = async () => {
      let documentNode = await cdp.dom.getDocument(-1, false);
      let htmlElement = documentNode.children && documentNode.children[0];
      let bodyElement = htmlElement?.children && htmlElement.children[1];
      let selectElement = bodyElement?.children && bodyElement.children[0];
      if (!selectElement) {
        throw new Error("element not found");
      }
      return selectElement;
    }
    
    let selectElement = await getSelectElement();
    await domInteractionsOperator.doSelectOptionValue(selectElement.backendNodeId, "saab");
    expect(await domInteractionsOperator.getValue(selectElement.backendNodeId)).toBe("saab");
  });

  test('submit form node', async () => {
    await driver.executeScript(`
      document.body.innerHTML=\`
        <form action="about://version" method="get" target="_blank">
          <input type="submit" value="Submit">
        </form>
      \`;
    `);
    let getFormElement = async () => {
      let documentNode = await cdp.dom.getDocument(-1, false);
      let htmlElement = documentNode.children && documentNode.children[0];
      let bodyElement = htmlElement?.children && htmlElement.children[1];
      let formElement = bodyElement?.children && bodyElement.children[0];
      if (!formElement) {
        throw new Error("element not found");
      }
      return formElement;
    }
    
    let formElement = await getFormElement();
    await domInteractionsOperator.doSubmit(formElement.backendNodeId);
    expect(await (await driver.getAllWindowHandles()).length).toBe(2);
  });

  test('get console logs', async () => {
    await driver.executeScript(`console.warn("testmsg")`);
    await driver.executeScript(`console.warn("testmsg")`);
    await driver.executeScript(`console.warn("testmsg")`);
    let logs = cdp.console.getMessages();
    expect(logs.length).not.toBe(0);
  });
});