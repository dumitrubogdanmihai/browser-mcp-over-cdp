# Browser MCP over CDP

MCP Server that manages a Chrome browser using the Chrome DevTools Protocol (CDP)

This project exposes tools to navigate, interact and access a browser tab. The browser is controller using CDP and because of this:
1. the page is exported as full height screenshoot, accessibility tree and enriched deep DOM
    1. the screenshoot captures whole page, not just the visible scrolled are
    2. the accessibility tree contains most relevand parts
    3. the enriched deep DOM contains
        1. nested iframes, shadow DOM, pseudo-elements, etc.
        3. per element attached listeners (for e.g. onClick, onKeyDown, etc), including the callback function code (for better or for worse)
        4. per element relevant resolved styles
2. the page is interactable via click, keys and input value update functions 
3. the page is navigable with basic open URL, back, forward and reload functions

The browser is running remotely on Docker using Selenoid with VNC enabled, available at http://localhost:8080/.

# Prereq
1. Docker and Docker Compose
2. Python

# Use
1. run Selenoid Selenium Hub by running the below command inside "selenoid" dir:
    ```
    docker pull selenoid/vnc_chrome:128.0
    docker pull selenoid/hub
    docker pull aerokube/selenoid-ui
    docker-compose up
    ```
2. change absolute paths inside config-example.json and put it inside your Cloude, VS Code, Cursor, wherever you want.
    1. for Cloude see https://modelcontextprotocol.io/quickstart/user
    2. for Cursor see https://docs.cursor.com/context/model-context-protocol#configuring-mcp-servers
3. to see the browser live open http://localhost:8080/ in your browser
4. see also playground.ipynb

# Warnings
The Selenoid Selenium Hub configuration uses docker.sock from the host, so it has full control over Docker.

# Troubleshoot
Use https://modelcontextprotocol.io/docs/tools/inspector#python:
    ```
    npx @modelcontextprotocol/inspector uv --directory /Users/bogdan/devel/browser-mcp-over-cdp/ run src/mcp-server.py
    ```