import sys
import atexit

from mcp.server.fastmcp import FastMCP, Image, Context
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from dataclasses import dataclass

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions

from cdp import CDP

drivers = []

def exit_handler():
    for driver in drivers:
        driver.close()
        driver.quit()
atexit.register(exit_handler)

@dataclass
class AppContext:
    def __init__(self, driver):
        self.driver = driver
        self.cdp = CDP(driver)

@asynccontextmanager
async def app_lifespan(server: FastMCP) -> AsyncIterator[AppContext]:
    try:
        options = ChromeOptions()
        options.set_capability('browserName', 'chrome')
        options.set_capability("selenoid:options", 
            {
                "enableVNC": True,
                "enableVideo": False,
                "sessionTimeout": "30m",
                "env": ["LANG=en_US.UTF-8", "LANGUAGE=us:en", "LC_ALL=en_US.UTF-8"]
            })
        driver = webdriver.Remote("http://localhost:4444/wd/hub", options=options)
        drivers.append(driver)

        yield AppContext(driver=driver)
    finally:
        driver.close()
        driver.quit()

mcp = FastMCP("BrowserMCP", lifespan=app_lifespan)

@mcp.tool()
async def close_the_browser(ctx: Context) -> str:
    """Close the browser.
    """
    driver = ctx.request_context.lifespan_context.driver
    driver.close()
    driver.quit()
    return "ok"

@mcp.tool()
async def navigate_to(ctx: Context, url: str) -> str:
    """Navigate to a page.

    Args:
        url: URL to navigate to
    """
    await ctx.info(f"navigate_to {str} for client id {ctx.client_id} (req id {ctx.request_id})")
    driver = ctx.request_context.lifespan_context.driver

    driver.get(url)
    wait = WebDriverWait(driver, 10)
    wait.until(lambda driver: driver.execute_script("return document.readyState") == "complete")

    return "ok"

@mcp.tool()
async def get_current_page_url(ctx: Context) -> str:
    """Get the URL of the current page.
    """
    driver = ctx.request_context.lifespan_context.driver
    return driver.current_url

@mcp.tool()
def go_back(ctx: Context) -> str:
    """Goes one step backward in the browser history.
    """
    driver = ctx.request_context.lifespan_context.driver

    driver.back()
    wait = WebDriverWait(driver, 10)
    wait.until(lambda driver: driver.execute_script("return document.readyState") == "complete")


@mcp.tool()
def go_forward(ctx: Context) -> str:
    """Goes one step forward in the browser history.
    """
    driver = ctx.request_context.lifespan_context.driver

    driver.forward()
    wait = WebDriverWait(driver, 10)
    wait.until(lambda driver: driver.execute_script("return document.readyState") == "complete")

@mcp.tool()
def reload(ctx: Context):
    """Refreshes the current page.
    """
    driver = ctx.request_context.lifespan_context.driver

    driver.refresh()
    wait = WebDriverWait(driver, 10)
    wait.until(lambda driver: driver.execute_script("return document.readyState") == "complete")

@mcp.tool()
async def get_page_snapshot_as_accessibility_tree(ctx: Context) -> str:
    """Get a snapshot of the page as an accessibility tree. This is a clear, compact and a higher level representation.
    """
    cdp = ctx.request_context.lifespan_context.cdp
    return str(cdp.ax.stringify(cdp.ax.getAxTree()[0]))

@mcp.tool()
async def get_page_snapshot_as_html_dom(ctx: Context) -> str:
    """Get a snapshot of the page as HTML DOM tree.
    """
    cdp = ctx.request_context.lifespan_context.cdp
    return str(cdp.dom.stringify(cdp.dom.getRichDocument()))

@mcp.tool()
async def get_page_snapshot_as_jpeg_screenshoot(ctx: Context) -> str:
    """Get a snapshot of the page as an JPEG screenshoot.
    """
    cdp = ctx.request_context.lifespan_context.cdp
    return Image(data=cdp.visualizer.getImage(), format="png")

@mcp.tool()
async def do_click_node_by_id(ctx: Context, backendNodeId: int) -> str:
    """Do click on a node denoted by it's backendNodeId

    Args:
        backendNodeId: The id of the node
    """
    cdp = ctx.request_context.lifespan_context.cdp
    driver = ctx.request_context.lifespan_context.driver

    cdp.interactor.doClick(backendNodeId)
    wait = WebDriverWait(driver, 10)
    wait.until(lambda driver: driver.execute_script("return document.readyState") == "complete")
    return "ok"

@mcp.tool()
async def do_focus_node_by_id(ctx: Context, backendNodeId: int) -> str:
    """Do focus a node denoted by it's backendNodeId

    Args:
        backendNodeId: The id of the node
    """
    cdp = ctx.request_context.lifespan_context.cdp
    cdp.interactor.doFocus(backendNodeId)
    return "ok"

@mcp.tool()
async def do_send_keys_to_node_by_id(ctx: Context, backendNodeId: int, keysToSend: str) -> str:
    """Do send keys/text to a node denoted by it's backendNodeId

    Args:
        backendNodeId: The id of the node
        keysToSend: Text/keys to type.
    """
    cdp = ctx.request_context.lifespan_context.cdp
    cdp.interactor.doSendKey(backendNodeId, keysToSend)
    return "ok"

@mcp.tool()
async def do_set_value_to_node_by_id(ctx: Context, backendNodeId: int, value: str) -> str:
    """Do set a valut to a node denoted by it's backendNodeId, usually a input, select or textarea element.

    Args:
        backendNodeId: The id of the node
        value: The value to set to the element
    """
    cdp = ctx.request_context.lifespan_context.cdp
    cdp.interactor.doSetValue(backendNodeId, value)
    return "ok"

@mcp.tool()
async def do_submit_node_by_id(ctx: Context, backendNodeId: int) -> str:
    """Do submit an form or search input node denoted by it's backendNodeId.

    Args:
        backendNodeId: The id of the node
    """
    cdp = ctx.request_context.lifespan_context.cdp
    cdp.interactor.doSubmit(backendNodeId)
    return "ok"

@mcp.tool()
async def do_select_index_on_node_by_id(ctx: Context, backendNodeId: int, index: int) -> str:
    """Do set an option index (0-based) on select node denoted by it's backendNodeId.

    Args:
        backendNodeId: The id of the select node
        index: The option index to set.
    """
    cdp = ctx.request_context.lifespan_context.cdp
    cdp.interactor.doSelectIndex(backendNodeId, index)
    return "ok"


if __name__ == "__main__":
    try:
        print("Starting navigator...", file=sys.stderr)
        mcp.run(transport='stdio')
    except Exception as e:
        print(f"Error starting navigator: {str(e)}", file=sys.stderr)
        sys.exit(1)
