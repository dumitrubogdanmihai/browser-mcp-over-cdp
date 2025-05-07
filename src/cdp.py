import base64
import json
from itertools import batched
import sys

class Ax:
    def __init__(self, driver):
        self.driver = driver
        driver.execute_cdp_cmd("DOM.enable", {})
        driver.execute_cdp_cmd("Accessibility.enable", {})

    def getAxTree(self):
        cdpRootAxTree = self.driver.execute_cdp_cmd("Accessibility.getRootAXNode", {})
        cdpFullAXTree = self.driver.execute_cdp_cmd("Accessibility.getFullAXTree", {})
        mapBackendNodeIds = {}
        mapNodeIds = {}
        
        for node in cdpFullAXTree['nodes']:
            if 'backendDOMNodeId' in node:
                mapBackendNodeIds[node['backendDOMNodeId']] = node
            if 'nodeId' in node:
                mapNodeIds[node['nodeId']] = node
        readAbleAxTree = self.convert_(cdpRootAxTree['node'], mapBackendNodeIds, mapNodeIds)
        return readAbleAxTree
    
    def convert_(self, node, mapBackendNodeIds, mapNodeIds):
        children = []
        if 'childIds' in node:
            for childNodeId in node['childIds']:
                childNodeIdInt = childNodeId
                if childNodeIdInt in mapBackendNodeIds:
                    child = mapBackendNodeIds[childNodeIdInt]
                else:
                    child = mapNodeIds[childNodeIdInt]
                children = children + self.convert_(child, mapBackendNodeIds, mapNodeIds)
        if node['ignored']:
            return children
        
        if "childNodeCount" in node: del node["childNodeCount"]
        if "nodeType" in node: del node["nodeType"]
        if "parentId" in node: del node["parentId"]
        if "childIds" in node: del node["childIds"]
        if "localName" in node: del node["localName"]
        if "attributes" in node:
            if not node["attributes"]:
                del node["attributes"]
            else:
                attrDict = {}
                for name, value in batched(node['attributes'], n=2):
                    attrDict[name] = value
                if len(attrDict) != 0:
                    node["attributes"] = attrDict
        if 'backendDOMNodeId' in node:
            dict = {
                'backendDOMNodeId': node['backendDOMNodeId']
            }
        else:
            dict = {
                'nodeId': node['nodeId']
            }
        
        if 'role' in node:
            dict['role'] = node['role']['value']
        if 'name' in node and node['name']['value']:
            dict['name'] = node['name']['value']
        if 'description' in node:
            dict['description'] = node['description']['value']
        if 'value' in node:
            dict['value'] = node['value']['value']

        if 'properties' in node:
            arr = []
            for property in node['properties']:
                if 'value' in property['value']:
                    arr.append({property['name']: property['value']['value']})
                else:
                    #property {'name': 'labelledby', 'value': {'relatedNodes': [{'backendDOMNodeId': 2959, 'text': 'HTML'}], 'type': 'nodeList'}}
                    arr.append({property['name']: property['value']})
            if len(arr) != 0:
                dict['properties'] = arr

        if children:
            dict['children'] = children
        return [dict]

class CSS:
    def __init__(self, driver):
        self.driver = driver
        self.driver.execute_cdp_cmd('CSS.enable', {})

    def isStyleItemRelevant(self, item):
        if item['name'] in ['display', 'visibility', 'opacity', 'position', 'font-size', 'cursor', 'background', 'background-color', 'color']:
            return True
        else:
            return False
    def getRelevantStyles(self, backendNodeId):
        node = self.driver.execute_cdp_cmd('DOM.describeNode', {'backendNodeId': backendNodeId})
        nodeId = node['node']['nodeId']
        computedStyles = self.driver.execute_cdp_cmd('CSS.getComputedStyleForNode', {'nodeId': nodeId})['computedStyle']
        relevantStyles = [item for item in computedStyles if self.isStyleItemRelevant(item)]
        toReturn = {}
        for item in relevantStyles:
            name = item["name"]
            value = item["value"]
            if "position" == name and "static" == value:
                continue
            if "color" == name and "rgb(0, 0, 0)" == value:
                continue
            if "font-size" == name and "13.3333px" == value:
                continue
            if "background-color" == name and "rgba(0, 0, 0, 0)" == value:
                continue
            if "cursor" == name and ("default" == value or "auto" == value):
                continue
            if "opacity" == name and "1" == value:
                continue
            if "visibility" == name and "visible" == value:
                continue
            toReturn[name] = value
        return toReturn
        
class Runtime:
    def __init__(self, driver):
        self.driver = driver
        self.driver.execute_cdp_cmd('DOM.enable', {})
        self.driver.execute_cdp_cmd('Debugger.enable', {})
        
    def getListeners(self, backendNodeId):
        resolved = self.driver.execute_cdp_cmd('DOM.resolveNode', {'backendNodeId': backendNodeId})
        object_id = resolved['object']['objectId']
        listeners = self.driver.execute_cdp_cmd('DOMDebugger.getEventListeners', {
            'objectId': object_id
        })
        if not listeners['listeners']:
            return []
        else:
            toReturn = []
            for listener in listeners['listeners']:
                type = listener['type']
                script_id = listener['scriptId']
                line_number = listener['lineNumber']
                column_number = listener['columnNumber']
                script_source = self.driver.execute_cdp_cmd('Debugger.getScriptSource', {
                    'scriptId': script_id
                })

                #url = listener['url']
                #print(f"Listener from script: {url}")
                #print(f"Defined at line: {line_number + 1}, column: {column_number + 1}")
                source_lines = script_source['scriptSource'].split('\n')
                
                callbackFunction = ""
                for i in range(line_number, len(source_lines)):
                    if (i == 0):
                        callbackFunction += source_lines[i][column_number:]
                    else :
                        callbackFunction += source_lines[i]
                toReturn.append({
                    'listenerType': type,
                    'listenerFunctionCode': callbackFunction
                })
            return toReturn

class Console:
    def __init__(self, driver):
        self.driver = driver
        self.driver.execute_cdp_cmd('Console.enable', {})
    def clear(self):
        self.driver.execute_cdp_cmd('Console.clearMessages', {})
    def getLogs(self):
        return self.driver.get_log('browser')

class Interactor:
    def __init__(self, driver):
        self.driver = driver

    # form
    # submit
    # contenteditable
    # textarea .value
    # select  .value  .selectedIndex = 0 adica option
    inputTypeWithValue = ["COLOR", "DATE", "DATETIME-LOCAL", "EMAIL", "MONTH", "NUMBER", "PASSWORD", "RANGE", "SEARCH", "TEL", "TEXT", "TIME", "URL", "WEEK"]
    inputTypeWithCheckedValue = ["RADIO", "CHECKBOX"]
    inputTypeClickable = ["BUTTON", "SUBMIT", "IMAEG", "RESET", "RADIO", "CHECKBOX"]
    inputTypeUploadable = ["FILE"]
    inputTypeIgnored = ["HIDDEN"]

    def findDocumentNode(self, node, predicate):
        if predicate(node):
            return node
        if 'children' in node:
            for child in node['children']:
                result = self.findDocumentNode(child, predicate)
                if result is not None:
                    return result
        return None

    def getNativeInteractions(self, node):
        nodeName = node['name']['value'] if 'name' in node else node['localName']
        if nodeName == "A":
            return ["doClick"]
        elif nodeName == "INPUT":
            type = 'TEXT'
            if 'attributes' in node:
                for name, value in batched(node['attributes'], n=2):
                    if name == 'type':
                        type = value.upper()
                        break
            if type in self.inputTypeWithCheckedValue:
                return ["doFocus", "doClick"]
            if type in self.inputTypeClickable:
                return ["doFocus", "doClick"]
            if type == "search":
                return ["doFocus", "doSetValue", "doSubmit"]
            if type in self.inputTypeWithValue:
                return ["doFocus", "doSetValue"]
        elif nodeName == "TEXTAREA":
            return ["doFocus", "doSetValue"]
        elif nodeName == "SELECT":
            return ["doFocus", "doSelectIndex"]
        elif nodeName == "FORM":
            return ["doFocus", "doSubmit"]

    def doClick(self, backendNodeId):
        resolvedNode = self.driver.execute_cdp_cmd('DOM.resolveNode', {"backendNodeId": backendNodeId})
        nodeObjectId = resolvedNode['object']['objectId']
        result = self.driver.execute_cdp_cmd('Runtime.callFunctionOn', {
                "objectId": nodeObjectId,
                "functionDeclaration": "function() { if (this.nodeType & Node.TEXT_NODE) { this.parentElement.click() } else { this.click() } }",
            })
        if "exceptionDetails" in result:
            raise Exception(result.dumps(result, indent=2))
    def doFocus(self, backendNodeId):
        self.driver.execute_cdp_cmd('DOM.focus', { "backendNodeId" : backendNodeId })
    def doSendKey(self, backendNodeId, key):
        self.doFocus(backendNodeId)
        self.driver.execute_cdp_cmd('Input.dispatchKeyEvent', {
            "type": "keyDown",
            "key": key,
            "unmodifiedText":key,
            "text": key
        })
        self.driver.execute_cdp_cmd('Input.dispatchKeyEvent', {
            "type": "keyUp",
            "key": key,
            "unmodifiedText": key,
            "text": key
        })
    def doSetValue(self, backendNodeId, value):
        node = self.driver.execute_cdp_cmd('DOM.describeNode', {"backendNodeId": backendNodeId})['node']
        return self.doSetValueOnNode(node, value)
    def doSetValueOnNode(self, node, value):
        backendNodeId = node['backendNodeId']
        isElement = node["nodeType"] == 1
        if not isElement:
            return "not an element"
        nodeName = node['name']['value'] if 'name' in node else node['localName']

        if nodeName == 'select' or nodeName == 'textarea':
            resolvedNode = self.driver.execute_cdp_cmd('DOM.resolveNode', {"backendNodeId": backendNodeId})
            nodeObjectId = resolvedNode['object']['objectId']
            result = self.driver.execute_cdp_cmd('Runtime.callFunctionOn', {
                "objectId": nodeObjectId,
                "functionDeclaration": "function(value) { this.value = value }",
                "arguments": [{'value': value}]
            })
            if "exceptionDetails" in result:
                raise Exception(result.dumps(result, indent=2))
            return "ok"
        if nodeName == 'input':
            resolvedNode = self.driver.execute_cdp_cmd('DOM.resolveNode', {"backendNodeId": backendNodeId})
            nodeObjectId = resolvedNode['object']['objectId']

            type = 'TEXT'
            if 'attributes' in node:
                for name, attValue in batched(node['attributes'], n=2):
                    if name == 'type':
                        type = attValue.upper()
                        break
            if type in self.inputTypeWithValue:
                result = self.driver.execute_cdp_cmd('Runtime.callFunctionOn', {
                    "objectId": nodeObjectId,
                    "functionDeclaration": "function(value) { this.value = value }",
                    "arguments": [{'value': value}]
                })
                if "exceptionDetails" in result:
                    raise Exception(result.dumps(result, indent=2))
                return "ok"
            if type in self.inputTypeWithCheckedValue:
                if value == "checked" or value == "unchecked":
                    checked = value == "checked"
                elif value == True or value == False:
                    checked = value == True
                else:
                    return "value should be either 'checked' or 'unchecked'"
                result = self.driver.execute_cdp_cmd('Runtime.callFunctionOn', {
                    "objectId": nodeObjectId,
                    "functionDeclaration": "function(checked) { this.checked = checked }",
                    "arguments": [{'value': checked}]
                })
                if "exceptionDetails" in result:
                    raise Exception(result.dumps(result, indent=2))
                return "ok"
            else:
                raise Exception(result.dumps(result, indent=2))
        
        raise Exception("cannot set value on element '" + nodeName + "'. Can set value just on input, select and textarea elements")
    def getValue(self, backendNodeId):
        node = self.driver.execute_cdp_cmd('DOM.describeNode', {"backendNodeId": backendNodeId})['node']
        return self.getValueForNode(node)
    def getValueForNode(self, node, safe=False):
        backendNodeId = node['backendNodeId']
        isElement = node["nodeType"] == 1
        if not isElement:
            if safe:
                return None
            else:
                raise Exception("Cannot get value because is not an element.")
        nodeName = node['name']['value'] if 'name' in node else node['localName']
        if nodeName == 'select' or nodeName == 'textarea':
            resolvedNode = self.driver.execute_cdp_cmd('DOM.resolveNode', {"backendNodeId": backendNodeId})
            nodeObjectId = resolvedNode['object']['objectId']
            result = self.driver.execute_cdp_cmd('Runtime.callFunctionOn', {
                "objectId": nodeObjectId,
                "functionDeclaration": "function() { return this.value }",
            })
            if "exceptionDetails" in result:
                raise Exception(result.dumps(result, indent=2))
            return result['result']['value']
        if nodeName == 'input':
            resolvedNode = self.driver.execute_cdp_cmd('DOM.resolveNode', {"backendNodeId": backendNodeId})
            nodeObjectId = resolvedNode['object']['objectId']

            type = 'TEXT'
            if 'attributes' in node:
                for name, value in batched(node['attributes'], n=2):
                    if name == 'type':
                        type = value.upper()
                        break
            if type in self.inputTypeWithValue:
                result = self.driver.execute_cdp_cmd('Runtime.callFunctionOn', {
                    "objectId": nodeObjectId,
                    "functionDeclaration": "function() { return this.value }",
                })
                if "exceptionDetails" in result:
                    raise Exception(result.dumps(result, indent=2))
                return result['result']['value']
            if type in self.inputTypeWithCheckedValue:
                result = self.driver.execute_cdp_cmd('Runtime.callFunctionOn', {
                    "objectId": nodeObjectId,
                    "functionDeclaration": "function() { return this.checked }",
                })
                if "exceptionDetails" in result:
                    raise Exception(result.dumps(result, indent=2))
                return "checked" if result['result']['value'] else "unchecked"
        if safe:
            return None
        else:
            raise Exception("cannot get value on element '" + nodeName + "'. Can get value just on input, select and textarea elements")
    def doSubmit(self, backendNodeId):
        node = self.driver.execute_cdp_cmd('DOM.describeNode', {"backendNodeId": backendNodeId})['node']
        return self.doSubmitNode(node)
    def doSubmitNode(self, node):
        backendNodeId = node['backendNodeId']
        isElement = node["nodeType"] == 1
        if not isElement:
            return "not an element"
        nodeName = node['name']['value'] if 'name' in node else node['localName']
        if nodeName == 'form' or nodeName == 'input': # with search type
            resolvedNode = self.driver.execute_cdp_cmd('DOM.resolveNode', {"backendNodeId": backendNodeId})
            nodeObjectId = resolvedNode['object']['objectId']
            result = self.driver.execute_cdp_cmd('Runtime.callFunctionOn', {
                "objectId": nodeObjectId,
                "functionDeclaration": "function() { return this.submit() }",
            })
            if "exceptionDetails" in result:
                raise Exception(result.dumps(result, indent=2))
            return "ok"
        else:
            raise Exception("not an 'form' element")
    def doSelectIndex(self, backendNodeId, index):
        node = self.driver.execute_cdp_cmd('DOM.describeNode', {"backendNodeId": backendNodeId})['node']
        return self.doSelectIndexNode(node, index)
    def doSelectIndexNode(self, node, index):
        backendNodeId = node['backendNodeId']
        isElement = node["nodeType"] == 1
        if not isElement:
            return "not an element"
        nodeName = node['name']['value'] if 'name' in node else node['localName']
        if nodeName == 'SELECT':
            resolvedNode = self.driver.execute_cdp_cmd('DOM.resolveNode', {"backendNodeId": backendNodeId})
            nodeObjectId = resolvedNode['object']['objectId']
            result = self.driver.execute_cdp_cmd('Runtime.callFunctionOn', {
                "objectId": nodeObjectId,
                "functionDeclaration": "function(index) { this.selectedIndex = index }",
                "arguments": [{'value': index}]
            })
            if "exceptionDetails" in result:
                raise Exception(result.dumps(result, indent=2))
            return "ok"
        else:
            raise Exception("element not an 'select'")

class Visualizer:
    def __init__(self, driver):
        self.driver = driver

    def getImage(self):
        screenshoot = self.driver.execute_cdp_cmd("Page.captureScreenshot", {"format": "jpeg", "captureBeyondViewport": True})
        return base64.b64decode(screenshoot['data'])
    
    def getNodeImage(self, backendNodeId):
        nodeQuads = self.driver.execute_cdp_cmd("DOM.getContentQuads", {'backendNodeId': backendNodeId})
        boxModel = self.driver.execute_cdp_cmd("DOM.getBoxModel", {'backendNodeId': backendNodeId})

        topLeftX = nodeQuads['quads'][0][0]
        topLeftY = nodeQuads['quads'][0][1]

        screenshoot = self.driver.execute_cdp_cmd("Page.captureScreenshot", {"format": "jpeg", "captureBeyondViewport": True, "clip": {"x": topLeftX, "y": topLeftY, "width": boxModel['model']['width'], "height": boxModel['model']['height'], "scale": 1}})
        return base64.b64decode(screenshoot['data'])

class Dom:
    def __init__(self, driver, interactor, runtime, css):
        self.driver = driver
        self.interactor = interactor
        self.runtime = runtime
        self.css = css
        driver.execute_cdp_cmd("DOM.enable", {})
    def getHtml(self):
        outerHtml = self.driver.execute_cdp_cmd("DOM.getOuterHTML")
        return outerHtml
    def getNodeHtml(self, backendNodeId):
        #cdpNode = self.driver.execute_cdp_cmd("DOM.resolveNode", {'backendNodeId': backendNodeId})
        outerHtml = self.driver.execute_cdp_cmd("DOM.getOuterHTML", {'backendNodeId': backendNodeId})
        return outerHtml
    
    def getDocument(self):
        return self.driver.execute_cdp_cmd('DOM.getDocument', {'pierce': True, 'depth': -1});
    def getRichDocument(self):
        document = self.getDocument()
        root = document['root']
        self.enrich(root)
        return root
    
    def enrich(self, node):
        if "attributes" in node:
            if not node["attributes"]:
                del node["attributes"]
            else:
                attrDict = {}
                for name, value in batched(node['attributes'], n=2):
                    attrDict[name] = value
                if len(attrDict) != 0:
                    node["attributes"] = attrDict
        value = self.interactor.getValueForNode(node, True)
        if value is not None:
            node['value'] = value

        if 'backendNodeId' in node:
            backendNodeId = node['backendNodeId']
            if node["nodeType"] == 1:
                listeners = self.runtime.getListeners(backendNodeId)
                if listeners:
                    node['listeners'] = listeners
                nativeInteractions = self.interactor.getNativeInteractions(node)
                if nativeInteractions:
                    node['nativeInteractions'] = nativeInteractions
                styles = self.css.getRelevantStyles(backendNodeId)
                if styles:
                    node['styles'] = styles
                if styles['display'] == 'none' or ('visibility' in node['styles'] and node['styles']['visibility'] == 'hidden'):
                    return False
        else:
            print("no bnid")
        if 'children' in node:
            childrenFiltered = []
            for child in node['children']:
                if self.enrich(child):
                    childrenFiltered.append(child)
            if childrenFiltered:
                node['children'] = childrenFiltered
            else:
                del node['children']

        if "childNodeCount" in node: del node["childNodeCount"]
        if "nodeType" in node: del node["nodeType"]
        if "parentId" in node: del node["parentId"]
        if "childIds" in node: del node["childIds"]
        if "localName" in node: del node["localName"]
        if "nodeValue" in node and node["nodeValue"] == "": del node["nodeValue"]

        return True

class CDP:
    def __init__(self, driver):
        self.driver = driver
        self.ax = Ax(driver)
        self.css = CSS(driver)
        self.runtime = Runtime(driver)
        self.console = Console(driver)
        self.interactor = Interactor(driver)
        self.visualizer = Visualizer(driver)
        self.dom = Dom(driver, self.interactor, self.runtime, self.css)
