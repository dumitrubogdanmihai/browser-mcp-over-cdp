
import ChromeDriver from '../ChromeDriver.ts';

// Enum for console message sources
export enum ConsoleMessageSource {
    Xml = 'xml',
    Javascript = 'javascript',
    Network = 'network',
    ConsoleApi = 'console-api',
    Storage = 'storage',
    Appcache = 'appcache',
    Rendering = 'rendering',
    Security = 'security',
    Other = 'other',
    Deprecation = 'deprecation',
    Worker = 'worker',
  }
  
  // Enum for console message levels
  export enum ConsoleMessageLevel {
    Log = 'log',
    Warning = 'warning',
    Error = 'error',
    Debug = 'debug',
    Info = 'info',
  }
  
  // Interface for a console message
  export interface ConsoleMessage {
    source: ConsoleMessageSource;
    level: ConsoleMessageLevel;
    text: string;
    url?: string;
    line?: number;
    column?: number;
  }
  
export default class Console {
  private driver: ChromeDriver;

  constructor(driver: ChromeDriver) {
    this.driver = driver;
  }

  async clearMessages() {
    await this.driver.sendAndGetDevToolsCommand("Console.clearMessages", {});
  }
}