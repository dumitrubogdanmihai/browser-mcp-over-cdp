
import ChromeDriver from '../ChromeDriver.ts';

// Unique identifiers
export type RemoteObjectId = string;
export type ScriptId = string;
export type ExecutionContextId = number;
export type UnserializableValue = string;
export type Timestamp = number; // milliseconds since epoch
export type TimeDelta = number; // milliseconds
export type UniqueDebuggerId = string;

// Represents a function call argument
export interface CallArgument {
  value?: any;
  unserializableValue?: UnserializableValue;
  objectId?: RemoteObjectId;
}

// Stack frame information
export interface CallFrame {
  functionName: string;
  scriptId: ScriptId;
  url: string;
  lineNumber: number;
  columnNumber: number;
}

// Deep serialized value
export interface DeepSerializedValue {
  type: string;
  value?: any;
  objectId?: string;
  weakLocalObjectReference?: number;
}

// Exception details
export interface ExceptionDetails {
  exceptionId: number;
  text: string;
  lineNumber: number;
  columnNumber: number;
  scriptId?: ScriptId;
  url?: string;
  stackTrace?: StackTrace;
  exception?: RemoteObject;
  executionContextId?: ExecutionContextId;
  exceptionMetaData?: Record<string, any>;
}

// Execution context description
export interface ExecutionContextDescription {
  id: ExecutionContextId;
  origin: string;
  name: string;
  uniqueId?: string;
  auxData?: Record<string, any>;
}

// Internal property descriptor
export interface InternalPropertyDescriptor {
  name: string;
  value?: RemoteObject;
}

// Property descriptor
export interface PropertyDescriptor {
  name: string;
  value?: RemoteObject;
  writable?: boolean;
  get?: RemoteObject;
  set?: RemoteObject;
  configurable: boolean;
  enumerable: boolean;
  wasThrown?: boolean;
  isOwn?: boolean;
  symbol?: RemoteObject;
}

// Remote object representation
export interface RemoteObject {
  type: 'object' | 'function' | 'undefined' | 'string' | 'number' | 'boolean' | 'symbol' | 'bigint';
  subtype?: string;
  className?: string;
  value?: any;
  unserializableValue?: UnserializableValue;
  description?: string;
  deepSerializedValue?: DeepSerializedValue;
  objectId?: RemoteObjectId;
  preview?: ObjectPreview;
  customPreview?: CustomPreview;
}

// Serialization options
export interface SerializationOptions {
  serialization: 'deep' | 'json' | 'idOnly';
  maxDepth?: number;
  additionalParameters?: Record<string, string | number>;
}

// Stack trace information
export interface StackTrace {
  description?: string;
  callFrames: CallFrame[];
  parent?: StackTrace;
  parentId?: StackTraceId;
}

// Stack trace identifier
export interface StackTraceId {
  id: string;
  debuggerId?: UniqueDebuggerId;
}

// Custom preview for objects
export interface CustomPreview {
  header: string;
  bodyGetterId?: RemoteObjectId;
}

// Entry preview for map/set entries
export interface EntryPreview {
  key?: ObjectPreview;
  value: ObjectPreview;
}

// Object preview representation
export interface ObjectPreview {
  type: 'object' | 'function' | 'undefined' | 'string' | 'number' | 'boolean' | 'symbol' | 'bigint';
  subtype?: string;
  description?: string;
  overflow: boolean;
  properties: PropertyPreview[];
  entries?: EntryPreview[];
}

// Private property descriptor
export interface PrivatePropertyDescriptor {
  name: string;
  value?: RemoteObject;
  get?: RemoteObject;
  set?: RemoteObject;
}

// Property preview
export interface PropertyPreview {
  name: string;
  type: 'object' | 'function' | 'undefined' | 'string' | 'number' | 'boolean' | 'symbol' | 'accessor' | 'bigint';
  value?: string;
  valuePreview?: ObjectPreview;
  subtype?: string;
}

export interface CallFunctionReturnObject {
  result: RemoteObject,
  exceptionDetails: ExceptionDetails
} 

export default class Runtime {
  private driver: ChromeDriver;
  private cdpSession : any;
  private messages : any;

  constructor(driver: ChromeDriver) {
    this.driver = driver;
    this.messages = [];
  }

  async init(cdpSession : any) {
    await cdpSession.send("Runtime.enable", {});

    cdpSession._wsConnection.on("message", (buffer:any) => {
      let messageObj = JSON.parse(new TextDecoder().decode(buffer));
      if (messageObj.method === "Runtime.exceptionThrown") {
        // [{"method":"Runtime.exceptionThrown","params":{"timestamp":1748172962768.486,"exceptionDetails":{"exceptionId":1,"text":"Uncaught","lineNumber":0,"columnNumber":0,"scriptId":"17","stackTrace":{"callFrames":[{"functionName":"onclick","scriptId":"17","url":"","lineNumber":0,"columnNumber":0}]},"exception":{"type":"object","subtype":"error","className":"ReferenceError","description":"ReferenceError: log is not defined\n    at HTMLButtonElement.onclick (data:,:1:1)","objectId":"2321626513033391675.1.1","preview":{"type":"object","subtype":"error","description":"ReferenceError: log is not defined\n    at HTMLButtonElement.onclick (data:,:1:1)","overflow":false,"properties":[{"name":"stack","type":"string","value":"ReferenceError: log is not defined\n    at HTMLButtonElement.onclick (data:,:1:1)"},{"name":"message","type":"string","value":"log is not defined"}]}},"executionContextId":1}},"sessionId":"8D330913791392529CA5F9221F282C04"}]
        this.messages.push(messageObj);
      }
    });
  }

  getExceptionThrownMessages() {
    let toReturn = "";
    if (this.messages.length !== 0) {
      toReturn = "Unhandeled exception in browser console: " + JSON.stringify(this.messages.map((msg:any) => {
        return msg.params.exceptionDetails.exception.description.replaceAll("\\n", "\n");
      }));
    }
    this.messages = [];
    return toReturn;
  }

  async callFunctionOn(functionDeclaration: String,
    objectId?: RemoteObjectId,
    theArguments?: [CallArgument],
    silent?: Boolean,
    returnByValue?: Boolean,
    generatePreview?: Boolean,
    userGesture?: Boolean,
    awaitPromise?: Boolean,
    executionContextId?: ExecutionContextId,
    objectGroup?: String,
    throwOnSide?: Boolean,
    uniqueContextId?: String,
    serializationOptions?: SerializationOptions
  ) : Promise<CallFunctionReturnObject> {
    let result = await this.driver.sendAndGetDevToolsCommand("Runtime.callFunctionOn", {
      functionDeclaration,
      objectId,
      "arguments": theArguments
    }) as CallFunctionReturnObject;
    return result;
  }
/*
  ,
      objectId,
      theArguments,
      silent,
      returnByValue,
      generatePreview,
      userGesture,
      awaitPromise,
      executionContextId,
      objectGroup,
      throwOnSide,
      uniqueContextId,
      serializationOptions*/
}