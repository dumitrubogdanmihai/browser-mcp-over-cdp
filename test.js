const {Builder} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const puppeteer = require('puppeteer-core');
const CDP = require('chrome-remote-interface');

(async function main() {
  // Start Chrome with remote debugging enabled
  const debuggingPort = 9222;
  const options = new chrome.Options();
  options.addArguments(`--remote-debugging-port=${debuggingPort}`);
  options.addArguments('--no-first-run', '--no-default-browser-check');

  // Start Selenium with Chrome
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    // Get Chrome DevTools Protocol WebSocket URL
    const version = await (await fetch(`http://localhost:${debuggingPort}/json/version`)).json();
    const wsEndpoint = version.webSocketDebuggerUrl;

    // Connect Puppeteer to the same Chrome session
    const browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint });
    const [page] = await browser.pages();

    // Setup CDP event listener via Puppeteer
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');
    client.on('Network.requestWillBeSent', (event) => {
      console.log('➡️  Request URL:', event.request.url);
    });

    // Navigate using Selenium
    await driver.get('https://example.com');

    // Give time for events to fire
    await new Promise(r => setTimeout(r, 5000));

    // Close Puppeteer connection
    await browser.disconnect();

  } finally {
    await driver.quit();
  }
})();