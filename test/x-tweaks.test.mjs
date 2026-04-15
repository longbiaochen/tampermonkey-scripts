import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { createXTweaks } from "../src/scripts/x-tweaks/index.js";

function createDom({ pathname = "/", body = "" } = {}) {
  return new JSDOM(`<!doctype html><html><head></head><body>${body}</body></html>`, {
    url: `https://x.com${pathname}`,
    pretendToBeVisual: true
  });
}

function mockDockButtonRect(node, rect) {
  node.getBoundingClientRect = () => ({
    ...rect,
    top: rect.y,
    left: rect.x,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height
  });
}

function mockDockChromeRects(button, { x, y, width, height }) {
  mockDockButtonRect(button, { x, y, width, height });

  const inner = button.parentElement;
  if (inner) {
    inner.getBoundingClientRect = () => ({
      x,
      y,
      width,
      height,
      top: y,
      left: x,
      right: x + width,
      bottom: y + height
    });
  }

  const outer = inner?.parentElement;
  if (outer) {
    outer.getBoundingClientRect = () => ({
      x: x - 1,
      y: y - 1,
      width: width + 2,
      height: height + 2,
      top: y - 1,
      left: x - 1,
      right: x + width + 1,
      bottom: y + height + 1
    });
  }
}

async function nextTick() {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function runCase(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

export async function runXTweaksTests() {
  await runCase("fold both side columns by default and inject only the right toggle", async () => {
    const dom = createDom({
      body: `
        <div id="app-shell">
          <div id="layout">
            <header id="left-column">
              <div>
                <div>
                  <div>
                    <nav>
                      <a href="/home"><span>Home</span></a>
                    </nav>
                  </div>
                </div>
              </div>
            </header>
            <main>
              <div data-testid="primaryColumn">Primary</div>
              <aside data-testid="sidebarColumn">Sidebar</aside>
            </main>
          </div>
          <div id="dock" data-x-tweaks-floating-dock="true">
            <div class="dock-item"><button id="grok" class="native-button" type="button">G</button></div>
            <div class="dock-item"><button id="chat" class="native-button" type="button">C</button></div>
          </div>
        </div>
      `
    });

    const app = createXTweaks(dom.window);
    app.start();

    const html = dom.window.document.documentElement;
    const rightToggle = dom.window.document.getElementById("x-tweaks-right-column-toggle");
    const layout = dom.window.document.getElementById("layout");
    const leftColumn = dom.window.document.getElementById("left-column");

    assert.equal(html.getAttribute("data-x-tweaks-left-column-folded"), "true");
    assert.equal(html.getAttribute("data-x-tweaks-right-column-hidden"), "true");
    assert.equal(layout?.getAttribute("data-x-tweaks-layout-root"), "true");
    assert.equal(leftColumn?.getAttribute("data-x-tweaks-left-column"), "true");
    assert.equal(dom.window.document.getElementById("x-tweaks-left-column-toggle"), null);
    assert.equal(rightToggle?.getAttribute("aria-label"), "Show right column");

    assert.equal(dom.window.localStorage.getItem("x-tweaks:left-column-folded"), null);
    assert.equal(dom.window.localStorage.getItem("x-tweaks:right-column-visible"), null);

    app.stop();
    dom.window.close();
  });

  await runCase("inject right-column toggle above native dock buttons as a separate item", async () => {
    const dom = createDom({
      body: `
        <div id="layout">
          <aside id="left-column">
            <nav>
              <a href="/home"><span>Home</span></a>
            </nav>
          </aside>
          <main data-testid="primaryColumn">Primary</main>
          <aside data-testid="sidebarColumn">Sidebar</aside>
        </div>
        <div id="dock" data-x-tweaks-floating-dock="true">
          <div class="dock-item"><button id="grok" class="native-button" type="button">G</button></div>
          <div class="dock-item"><button id="chat" class="native-button" type="button">C</button></div>
        </div>
      `
    });

    Object.defineProperty(dom.window, "innerWidth", { value: 1512, configurable: true });
    Object.defineProperty(dom.window, "innerHeight", { value: 982, configurable: true });
    mockDockChromeRects(dom.window.document.getElementById("grok"), {
      x: 1423,
      y: 653,
      width: 53,
      height: 55
    });
    mockDockChromeRects(dom.window.document.getElementById("chat"), {
      x: 1423,
      y: 720,
      width: 53,
      height: 55
    });

    const app = createXTweaks(dom.window);
    app.start();

    const host = dom.window.document.getElementById("dock");
    const mount = dom.window.document.querySelector(
      '[data-x-tweaks-right-column-toggle-host="true"]'
    );
    const rightToggle = dom.window.document.getElementById("x-tweaks-right-column-toggle");

    assert.equal(Array.from(host?.children || []).length, 2);
    assert.equal(mount?.getAttribute("data-x-tweaks-right-column-toggle-mode"), "floating");
    assert.equal(mount?.parentElement, dom.window.document.body);
    assert.equal(mount?.style.width, "55px");
    assert.equal(mount?.style.height, "57px");
    assert.ok(Number.parseInt(mount?.style.top || "0", 10) < 653);
    assert.equal(mount?.style.left, "1422px");
    assert.equal(rightToggle?.getAttribute("aria-label"), "Show right column");

    assert.equal(
      dom.window.document.documentElement.getAttribute("data-x-tweaks-right-column-hidden"),
      "true"
    );
    assert.equal(dom.window.localStorage.getItem("x-tweaks:right-column-visible"), null);

    rightToggle?.click();

    assert.equal(
      dom.window.document.documentElement.getAttribute("data-x-tweaks-right-column-hidden"),
      "false"
    );
    assert.equal(dom.window.localStorage.getItem("x-tweaks:right-column-visible"), "true");

    app.stop();
    dom.window.close();
  });

  await runCase("persist left column state without rendering a toggle button", async () => {
    const dom = createDom({
      body: `
        <div id="layout">
          <aside id="left-column">
            <nav>
              <a href="/home"><span>Home</span></a>
            </nav>
          </aside>
          <main data-testid="primaryColumn">Primary</main>
          <aside data-testid="sidebarColumn">Sidebar</aside>
        </div>
      `
    });

    const app = createXTweaks(dom.window);
    app.start();
    app.setLeftColumnFolded(false);

    assert.equal(
      dom.window.document.documentElement.getAttribute("data-x-tweaks-left-column-folded"),
      "false"
    );
    assert.equal(dom.window.localStorage.getItem("x-tweaks:left-column-folded"), "false");
    assert.equal(dom.window.document.getElementById("x-tweaks-left-column-toggle"), null);
    assert.equal(app.isLeftColumnFolded(), false);

    app.stop();
    dom.window.close();
  });

  await runCase("inject folded left-column styles for centering and icon-only compose button", async () => {
    const dom = createDom({
      body: `
        <div id="layout">
          <header id="left-column">
            <a href="/home">Logo</a>
            <nav>
              <a href="/home"><span>Home</span></a>
            </nav>
            <a href="/compose/post" data-testid="SideNav_NewTweet_Button"><div>Post</div></a>
          </header>
          <main data-testid="primaryColumn">Primary</main>
          <aside data-testid="sidebarColumn">Sidebar</aside>
        </div>
      `
    });

    const app = createXTweaks(dom.window);
    app.start();

    const style = dom.window.document.getElementById("x-tweaks-styles");
    const css = style?.textContent || "";

    assert.match(
      css,
      /\[data-testid="SideNav_NewTweet_Button"\] > \* \{\s*display: none !important;/m
    );
    assert.match(
      css,
      /\[data-testid="SideNav_NewTweet_Button"\]::before \{\s*content: "" !important;/m
    );
    assert.match(
      css,
      /> \[data-testid="SideNav_NewTweet_Button"\] \{\s*margin-inline: auto !important;/m
    );
    assert.match(css, /width: 88px !important;/);
    assert.match(css, /width: 56px !important;/);

    app.stop();
    dom.window.close();
  });

  await runCase("keep the right column collapsed by default across route changes", async () => {
    const dom = createDom({
      pathname: "/home",
      body: `
        <div id="layout">
          <aside id="left-column">
            <nav>
              <a href="/home"><span>Home</span></a>
            </nav>
          </aside>
          <main data-testid="primaryColumn">Primary</main>
          <aside data-testid="sidebarColumn">Sidebar</aside>
        </div>
      `
    });

    const app = createXTweaks(dom.window);
    app.start();

    assert.equal(
      dom.window.document.documentElement.getAttribute("data-x-tweaks-right-column-hidden"),
      "true"
    );

    dom.window.history.pushState({}, "", "/someone/status/123");
    await nextTick();

    assert.equal(
      dom.window.document.documentElement.getAttribute("data-x-tweaks-right-column-hidden"),
      "true"
    );
    assert.equal(app.isRightColumnVisible(), false);

    dom.window.history.pushState({}, "", "/home");
    await nextTick();

    assert.equal(
      dom.window.document.documentElement.getAttribute("data-x-tweaks-right-column-hidden"),
      "true"
    );
    assert.equal(app.isRightColumnVisible(), false);

    app.stop();
    dom.window.close();
  });

  await runCase("persist a manual right-column toggle across route changes", async () => {
    const dom = createDom({
      pathname: "/home",
      body: `
        <div id="layout">
          <aside id="left-column">
            <nav>
              <a href="/home"><span>Home</span></a>
            </nav>
          </aside>
          <main data-testid="primaryColumn">Primary</main>
          <aside data-testid="sidebarColumn">Sidebar</aside>
        </div>
      `
    });

    const app = createXTweaks(dom.window);
    app.start();
    app.setRightColumnVisible(true);

    assert.equal(
      dom.window.document.documentElement.getAttribute("data-x-tweaks-right-column-hidden"),
      "false"
    );
    assert.equal(dom.window.localStorage.getItem("x-tweaks:right-column-visible"), "true");

    dom.window.history.pushState({}, "", "/home");
    await nextTick();

    assert.equal(
      dom.window.document.documentElement.getAttribute("data-x-tweaks-right-column-hidden"),
      "false"
    );

    dom.window.history.pushState({}, "", "/someone/status/456");
    await nextTick();

    assert.equal(
      dom.window.document.documentElement.getAttribute("data-x-tweaks-right-column-hidden"),
      "false"
    );

    dom.window.history.pushState({}, "", "/home");
    await nextTick();

    assert.equal(
      dom.window.document.documentElement.getAttribute("data-x-tweaks-right-column-hidden"),
      "false"
    );

    app.stop();
    dom.window.close();
  });

  await runCase("inject fallback right-column toggle when floating dock is absent", async () => {
    const dom = createDom({
      body: `
        <div id="layout">
          <header id="left-column">
            <nav>
              <a href="/home"><span>Home</span></a>
            </nav>
          </header>
          <main>
            <div data-testid="primaryColumn">Primary</div>
            <aside data-testid="sidebarColumn">Sidebar</aside>
          </main>
        </div>
      `
    });

    const app = createXTweaks(dom.window);
    app.start();

    const mount = dom.window.document.querySelector(
      '[data-x-tweaks-right-column-toggle-host="true"]'
    );
    const rightToggle = dom.window.document.getElementById("x-tweaks-right-column-toggle");

    assert.equal(mount?.getAttribute("data-x-tweaks-right-column-toggle-mode"), "fallback");
    assert.equal(rightToggle?.getAttribute("aria-label"), "Show right column");

    assert.equal(
      dom.window.document.documentElement.getAttribute("data-x-tweaks-right-column-hidden"),
      "true"
    );
    assert.equal(dom.window.localStorage.getItem("x-tweaks:right-column-visible"), null);

    rightToggle?.click();

    assert.equal(
      dom.window.document.documentElement.getAttribute("data-x-tweaks-right-column-hidden"),
      "false"
    );
    assert.equal(dom.window.localStorage.getItem("x-tweaks:right-column-visible"), "true");

    app.stop();
    dom.window.close();
  });

  await runCase("float right-column toggle above a single native dock item", async () => {
    const dom = createDom({
      body: `
        <div id="layout">
          <header id="left-column">
            <nav>
              <a href="/home"><span>Home</span></a>
            </nav>
          </header>
          <main>
            <div data-testid="primaryColumn">Primary</div>
            <aside data-testid="sidebarColumn">Sidebar</aside>
          </main>
        </div>
        <div id="dock-host">
          <div class="dock-wrapper">
            <div class="dock-item"><button id="chart" class="native-button" type="button">C</button></div>
          </div>
        </div>
      `
    });

    const nativeButton = dom.window.document.getElementById("chart");
    mockDockChromeRects(nativeButton, {
      x: 1423,
      y: 653,
      width: 53,
      height: 55
    });

    Object.defineProperty(dom.window, "innerWidth", { value: 1512, configurable: true });
    Object.defineProperty(dom.window, "innerHeight", { value: 982, configurable: true });

    const app = createXTweaks(dom.window);
    app.start();

    const rightToggle = dom.window.document.getElementById("x-tweaks-right-column-toggle");
    const mount = rightToggle?.closest('[data-x-tweaks-right-column-toggle-host="true"]');

    assert.equal(mount?.getAttribute("data-x-tweaks-right-column-toggle-mode"), "floating");
    assert.equal(mount?.parentElement, dom.window.document.body);
    assert.equal(mount?.style.width, "55px");
    assert.equal(mount?.style.height, "57px");
    assert.ok(Number.parseInt(mount?.style.top || "0", 10) < 653);
    assert.equal(mount?.style.left, "1422px");

    app.stop();
    dom.window.close();
  });

  await runCase("hide live on x chip on status pages", async () => {
    const dom = createDom({
      pathname: "/someone/status/123",
      body: `
        <div>
          <button id="chip-button">
            <span>Live on X</span>
          </button>
        </div>
      `
    });

    const app = createXTweaks(dom.window);
    app.start();

    const chip = dom.window.document.getElementById("chip-button");
    assert.equal(chip?.style.display, "none");
    assert.equal(dom.window.__xTweaksState.hiddenCount, 1);

    app.stop();
    dom.window.close();
  });

  await runCase("leave matching text alone off status pages", async () => {
    const dom = createDom({
      pathname: "/home",
      body: `
        <button id="chip-button">
          <span>Live on X</span>
        </button>
      `
    });

    const app = createXTweaks(dom.window);
    app.start();

    const chip = dom.window.document.getElementById("chip-button");
    assert.notEqual(chip?.style.display, "none");
    assert.equal(dom.window.__xTweaksState.hiddenCount, 0);

    app.stop();
    dom.window.close();
  });

  await runCase("hide bookmarks empty state on bookmarks page", async () => {
    const dom = createDom({
      pathname: "/i/bookmarks",
      body: `
        <div id="empty" data-testid="emptyState">
          <div>Bookmark posts to save them for later</div>
        </div>
      `
    });

    const app = createXTweaks(dom.window);
    app.start();

    const emptyState = dom.window.document.getElementById("empty");
    assert.equal(emptyState?.style.display, "none");
    assert.equal(dom.window.__xTweaksState.hiddenCount, 1);

    app.stop();
    dom.window.close();
  });

  await runCase("leave bookmarks empty state alone off bookmarks page", async () => {
    const dom = createDom({
      pathname: "/home",
      body: `
        <div id="empty" data-testid="emptyState">
          <div>Bookmark posts to save them for later</div>
        </div>
      `
    });

    const app = createXTweaks(dom.window);
    app.start();

    const emptyState = dom.window.document.getElementById("empty");
    assert.notEqual(emptyState?.style.display, "none");
    assert.equal(dom.window.__xTweaksState.hiddenCount, 0);

    app.stop();
    dom.window.close();
  });

  await runCase("handle dynamic sidebar and live-chip mutations", async () => {
    const dom = createDom({
      pathname: "/person/status/456",
      body: `<div id="app-shell"></div>`
    });

    const app = createXTweaks(dom.window);
    app.start();

    const shell = dom.window.document.getElementById("app-shell");
    shell?.insertAdjacentHTML(
      "beforeend",
      `
        <div id="dock" data-x-tweaks-floating-dock="true">
          <div class="dock-item"><button id="grok" class="native-button" type="button">G</button></div>
          <div class="dock-item"><button id="chat" class="native-button" type="button">C</button></div>
        </div>
        <div id="layout">
          <aside id="left-column">
            <nav>
              <a href="/home"><span>Home</span></a>
            </nav>
          </aside>
          <main data-testid="primaryColumn">Primary</main>
          <aside data-testid="sidebarColumn">Sidebar</aside>
          <button id="dynamic-chip"><span>Live on X</span></button>
        </div>
      `
    );

    Object.defineProperty(dom.window, "innerWidth", { value: 1512, configurable: true });
    Object.defineProperty(dom.window, "innerHeight", { value: 982, configurable: true });
    mockDockChromeRects(dom.window.document.getElementById("grok"), {
      x: 1423,
      y: 653,
      width: 53,
      height: 55
    });
    mockDockChromeRects(dom.window.document.getElementById("chat"), {
      x: 1423,
      y: 720,
      width: 53,
      height: 55
    });

    await nextTick();

    assert.equal(
      dom.window.document.documentElement.getAttribute("data-x-tweaks-right-column-hidden"),
      "true"
    );
    assert.equal(dom.window.document.getElementById("layout")?.getAttribute("data-x-tweaks-layout-root"), "true");
    assert.equal(
      dom.window.document.documentElement.getAttribute("data-x-tweaks-left-column-folded"),
      "true"
    );
    assert.equal(
      dom.window.document.getElementById("left-column")?.getAttribute("data-x-tweaks-left-column"),
      "true"
    );
    assert.equal(dom.window.document.querySelectorAll("#x-tweaks-right-column-toggle").length, 1);
    assert.equal(dom.window.document.getElementById("dock")?.children.length, 2);
    assert.equal(dom.window.document.getElementById("x-tweaks-left-column-toggle"), null);
    assert.equal(dom.window.document.getElementById("dynamic-chip")?.style.display, "none");

    app.stop();
    dom.window.close();
  });

  await runCase("reapply stored sidebar state after layout remount", async () => {
    const dom = createDom({
      body: `
        <div id="shell">
          <div id="layout-a">
            <aside id="left-column-a">
              <nav>
                <a href="/home"><span>Home</span></a>
              </nav>
            </aside>
            <main data-testid="primaryColumn">Primary</main>
            <aside data-testid="sidebarColumn">Sidebar</aside>
          </div>
          <div id="dock" data-x-tweaks-floating-dock="true">
            <div class="dock-item"><button id="grok" class="native-button" type="button">G</button></div>
            <div class="dock-item"><button id="chat" class="native-button" type="button">C</button></div>
          </div>
        </div>
      `
    });

    const app = createXTweaks(dom.window);
    app.start();
    app.setLeftColumnFolded(false);
    app.setRightColumnVisible(false);

    dom.window.document.getElementById("layout-a")?.remove();
    dom.window.document.getElementById("shell")?.insertAdjacentHTML(
      "afterbegin",
      `
        <div id="layout-b">
          <aside id="left-column-b">
            <nav>
              <a href="/home"><span>Home</span></a>
            </nav>
          </aside>
          <main data-testid="primaryColumn">Primary next</main>
          <aside data-testid="sidebarColumn">Sidebar next</aside>
        </div>
      `
    );

    await nextTick();

    assert.equal(
      dom.window.document.documentElement.getAttribute("data-x-tweaks-left-column-folded"),
      "false"
    );
    assert.equal(
      dom.window.document.documentElement.getAttribute("data-x-tweaks-right-column-hidden"),
      "true"
    );
    assert.equal(dom.window.document.getElementById("left-column-b")?.getAttribute("data-x-tweaks-left-column"), "true");
    assert.equal(dom.window.document.getElementById("x-tweaks-left-column-toggle"), null);
    assert.equal(dom.window.document.getElementById("x-tweaks-right-column-toggle")?.getAttribute("aria-label"), "Show right column");

    app.stop();
    dom.window.close();
  });
}
