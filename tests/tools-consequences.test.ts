import {describe, expect, test} from '@jest/globals';

import { Builder, By } from 'selenium-webdriver';
import CDP from "../src/CDP.ts";
import ChromeDriver from '../src/ChromeDriver.ts';

const capabilities = {
  browserName: 'chrome',
  "screen-resolution": "10x10",
  'selenoid:options': {
    enableVNC: true,
    enableVideo: false,
    sessionTimeout: '30m',
    env: ['LANG=en_US.UTF-8', 'LANGUAGE=us:en', 'LC_ALL=en_US.UTF-8']
  }
};

describe('Tests for tools consequences detection', () => {
  
  let driver : ChromeDriver;
  let cdp : CDP;

  beforeAll(async () => {
    driver = await new Builder()
      //.usingServer('http://localhost:4444/wd/hub')
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

  test('get unhandled errors with stacktrace', async () => {
    await driver.executeScript(`
      function generateUnhandledError() {
        generateUnhandledErrorInternal();
      }
      window.generateUnhandledError = generateUnhandledError;
      function generateUnhandledErrorInternal() {
        throw new Error("unhandled err msg");
      }
    `);
    await driver.executeScript(`
      document.body.innerHTML=\`
        <button onClick="window.generateUnhandledError()">generateUnhandledError</button>
      \`;
    `);
    driver.findElement(By.css("button")).click();
    await new Promise((resolve => setTimeout(resolve, 100)));

    expect(cdp.runtime.getExceptionThrownMessages()).toBe("[\"Error: unhandled err msg\\n    at generateUnhandledErrorInternal (eval at executeScript (:416:16), <anonymous>:9:15)\\n    at generateUnhandledError (eval at executeScript (:416:16), <anonymous>:5:9)\\n    at HTMLButtonElement.onclick (data:,:1:8)\"]");
  });

  test('get console logs', async () => {
    await driver.executeScript(`
      console.warn("tst msg");
    `);
    await new Promise((resolve => setTimeout(resolve, 100)));
    expect(cdp.console.getMessages()).toBe("[\"warning (console-api#4:15): tst msg\"]");
  });

  test('get network requests', async () => {
    await driver.executeScript(`
      fetch("https://news.ycombinator.com")
    `);
    await new Promise((resolve => setTimeout(resolve, 1000)));
    expect(cdp.network.getMessages()).toContain("https://news.ycombinator.com");
  });

  test('get navigate event', async () => {
    await driver.get("https://news.ycombinator.com");
    await new Promise((resolve => setTimeout(resolve, 100)));
    expect(cdp.page.getMessages()).toBe("[]");
    expect(cdp.target.getMessages()).toBe("[\"Target URL changed to https://news.ycombinator.com/\"]");
  });

  test('get execution stack events', async () => {
    await driver.executeScript(`
      function firstFunction() {
        secondFunction();
      }
      window.firstFunction = firstFunction;

      function secondFunction() {
        for(let i = 0; i < 500000000; i++) {
        }
        console.log(1)
      }
    `);
    await driver.executeScript(`
      document.body.innerHTML=\`
        <button onClick="window.firstFunction()">firstFunction</button>
      \`;
    `);

    await cdp.profiler.start();
    await driver.findElement(By.css("button")).click();
    
    await new Promise((resolve => setTimeout(resolve, 1000)));
    let calledFunctions = await cdp.profiler.stopAndGetCalledFunctions();
    expect(JSON.stringify(calledFunctions, null, 2)).toContain("secondFunction");
  });
});