import {describe, expect, test} from '@jest/globals';

import { Builder } from 'selenium-webdriver';
import ChromeDriver from '../src/ChromeDriver.ts';
import CDP from "../src/CDP.ts";
import DomInteractionsOperator from '../src/DomInteractionsOperator.ts';
import A11yTreeSnapshotTaker from '../src/A11yTreeSnapshotTaker.ts';

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

  test('get accesibility snapshot', async () => {
    await driver.executeScript(`
        document.body.innerHTML=\`
  <h2>FAQ</h2>
  <div class="accordion">
    <h3>
      <button 
        aria-expanded="false" 
        aria-controls="panel1" 
        id="accordion1"
      >
        What is ARIA?
      </button>
    </h3>
    <div 
      id="panel1" 
      role="region" 
      aria-labelledby="accordion1" 
      class="accordion-content" 
      aria-hidden="true"
    >
      ARIA stands for Accessible Rich Internet Applications. It helps make dynamic content more accessible.
    </div>
  </div>
        \`;
      `);
    let ax = await new A11yTreeSnapshotTaker(cdp.accessibility, cdp.dom, cdp.css).takeNapshot();
    expect(ax.replaceAll(/backendDOMNodeId="[^"]+"/gi, "backendDOMNodeId=\"\""))
      .toBe(`<RootWebArea "" backendDOMNodeId="" focusable="true" focused="true" url="data:,">
 <heading "FAQ" backendDOMNodeId="" level="2">
  <StaticText "FAQ" backendDOMNodeId="">
   <InlineTextBox "">
   </InlineTextBox>
  </StaticText>
 </heading>
 <heading "What is ARIA?" backendDOMNodeId="" level="3">
  <button "What is ARIA?" backendDOMNodeId="" invalid="false" focusable="true" expanded="false">
   <StaticText "What is ARIA?" backendDOMNodeId="">
    <InlineTextBox "">
    </InlineTextBox>
   </StaticText>
  </button>
 </heading>
</RootWebArea>`);
  });
});