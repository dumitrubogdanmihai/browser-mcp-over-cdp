
import ChromeDriver from '../ChromeDriver.ts';

// read https://chromedevtools.github.io/devtools-protocol/tot/Input/ and extract TypeScript interfaces for the Input domain objects

// MouseButton enum
type MouseButton = 'none' | 'left' | 'middle' | 'right' | 'back' | 'forward';

// GestureSourceType enum
type GestureSourceType = 'default' | 'touch' | 'mouse';

// TimeSinceEpoch alias
type TimeSinceEpoch = number;

export default class Input {
  private driver: ChromeDriver;

  constructor(driver: ChromeDriver) {
    this.driver = driver;
  }

  async dispatchKeyEvent(type: string, modifiers?: Number, text?: string, key?: Number)  {
    await this.driver.sendAndGetDevToolsCommand("Input.dispatchKeyEvent", {
        type,
        modifiers,
        text,
        key
    });
  }
}