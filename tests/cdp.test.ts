import {describe, expect, test} from '@jest/globals';

import { Builder } from 'selenium-webdriver';
import ChromeDriver from '../src/ChromeDriver.ts';
import CDP from "../src/CDP.ts";

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
  
  let driver : ChromeDriver;
  let cdp : CDP;

  beforeAll(async () => {
    driver = await new Builder()
      .usingServer('http://localhost:4444/wd/hub')
      .withCapabilities(capabilities)
      .forBrowser('chrome')
      .build() as ChromeDriver;
    cdp = new CDP(driver);
    await cdp.init();
  }, 15000);

  afterAll(async () => {
    if (driver) {
      driver.close();
      driver.quit();
    }
  }, 15000);

  test('get accesibility snapshot', async () => {
    await driver.executeScript(`
        document.body.innerHTML=\`
          <p aria-label="test">test</p>
        \`;
      `);
    expect(cdp.getAxTree()).toBe(`{}`);
  });

  test('get html snapshot', async () => {
    await driver.executeScript(`
        document.body.innerHTML=\`
          <p>test</p>
        \`;
      `);
    let document = await cdp.dom.getDocument(-1, true);
    let documentSerialization = cdp.stringifyDomNode(document, 0);
    expect(documentSerialization).toBe(`<#document backendNodeId="1">
 <HTML backendNodeId="2">
  <HEAD backendNodeId="3">
  </HEAD>
  <BODY backendNodeId="4">
   <P backendNodeId="5">
    test
   </P>
  </BODY>
 </HTML>
</#document>`);
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
    await cdp.interactor.doClick(buttonElement.backendNodeId);

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
    await cdp.interactor.doFocus(inputElement.backendNodeId);

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
    await cdp.interactor.doSendKey(inputElement.backendNodeId, "TEST");
    expect(await cdp.interactor.getValue(inputElement.backendNodeId)).toBe("TEST");
  });

  test('set input node value', async () => {
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
    await cdp.interactor.doSetValue(inputElement.backendNodeId, "TEST");
    expect(await cdp.interactor.getValue(inputElement.backendNodeId)).toBe("TEST");
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
    await cdp.interactor.doSelectIndex(selectElement.backendNodeId, 1);
    expect(await cdp.interactor.getValue(selectElement.backendNodeId)).toBe(1);
  });

  test('submit form node', async () => {
    await driver.executeScript(`
      document.body.innerHTML=\`
        <form onsubmit="arguments[0].target.setAttribute('data-submitted', true); return false;">
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
    await cdp.interactor.doSubmit(formElement.backendNodeId);

    formElement = await getFormElement();
    expect(formElement.attributes?.indexOf("data-submitted")).not.toBe(-1);
  });
});