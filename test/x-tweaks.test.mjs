import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { createXTweaks } from "../src/scripts/x-tweaks/index.js";

function createDom({ pathname = "/", body = "" } = {}) {
  return new JSDOM(`<!doctype html><html><head></head><body>${body}</body></html>`, {
    url: `https://x.com${pathname}`,
    pretendToBeVisual: true
  });
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
  await runCase("fold left column by default, inject toggles, and hide right column", async () => {
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
    const leftToggle = dom.window.document.getElementById("x-tweaks-left-column-toggle");
    const rightToggle = dom.window.document.getElementById("x-tweaks-right-column-toggle");
    const layout = dom.window.document.getElementById("layout");
    const leftColumn = dom.window.document.getElementById("left-column");

    assert.equal(html.getAttribute("data-x-tweaks-left-column-folded"), "true");
    assert.equal(html.getAttribute("data-x-tweaks-right-column-hidden"), "true");
    assert.equal(layout?.getAttribute("data-x-tweaks-layout-root"), "true");
    assert.equal(leftColumn?.getAttribute("data-x-tweaks-left-column"), "true");
    assert.equal(leftToggle?.getAttribute("aria-label"), "Expand left column");
    assert.equal(rightToggle?.getAttribute("aria-label"), "Show right column");

    assert.equal(dom.window.localStorage.getItem("x-tweaks:left-column-folded"), null);
    assert.equal(dom.window.localStorage.getItem("x-tweaks:right-column-visible"), null);

    app.stop();
    dom.window.close();
  });

  await runCase("replace X icon links with Weibo icons", async () => {
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

    dom.window.document.head.innerHTML = `
      <link rel="icon" href="https://x.com/favicon.ico">
      <link rel="apple-touch-icon" href="https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png">
    `;

    const app = createXTweaks(dom.window);
    app.start();

    const iconLinks = Array.from(dom.window.document.head.querySelectorAll("link[rel~='icon']"));
    const appleTouchIcon = dom.window.document.head.querySelector("link[rel='apple-touch-icon']");

    assert.ok(iconLinks.length >= 1);
    for (const link of iconLinks) {
      assert.equal(link.href, "https://weibo.com/favicon.ico");
    }
    assert.equal(appleTouchIcon?.href, "https://weibo.com/favicon.ico");

    app.stop();
    dom.window.close();
  });

  await runCase("inject right-column toggle into floating dock as third button", async () => {
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

    const app = createXTweaks(dom.window);
    app.start();

    const host = dom.window.document.getElementById("dock");
    const rightToggle = dom.window.document.getElementById("x-tweaks-right-column-toggle");
    const directChildren = Array.from(host?.children || []);

    assert.equal(directChildren.length, 3);
    assert.equal(directChildren[2]?.getAttribute("data-x-tweaks-right-column-toggle-host"), "true");
    assert.equal(rightToggle?.getAttribute("aria-label"), "Show right column");

    rightToggle?.click();

    assert.equal(
      dom.window.document.documentElement.getAttribute("data-x-tweaks-right-column-hidden"),
      "false"
    );
    assert.equal(dom.window.localStorage.getItem("x-tweaks:right-column-visible"), "true");

    app.stop();
    dom.window.close();
  });

  await runCase("toggle left column and persist folded state", async () => {
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

    const leftToggle = dom.window.document.getElementById("x-tweaks-left-column-toggle");
    leftToggle?.click();

    assert.equal(
      dom.window.document.documentElement.getAttribute("data-x-tweaks-left-column-folded"),
      "false"
    );
    assert.equal(dom.window.localStorage.getItem("x-tweaks:left-column-folded"), "false");
    assert.equal(leftToggle?.getAttribute("aria-label"), "Collapse left column");
    assert.equal(app.isLeftColumnFolded(), false);

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

    rightToggle?.click();

    assert.equal(
      dom.window.document.documentElement.getAttribute("data-x-tweaks-right-column-hidden"),
      "false"
    );
    assert.equal(dom.window.localStorage.getItem("x-tweaks:right-column-visible"), "true");

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
    assert.equal(dom.window.document.getElementById("dock")?.children.length, 3);
    assert.equal(dom.window.document.getElementById("x-tweaks-left-column-toggle")?.getAttribute("aria-label"), "Expand left column");
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
    app.setRightColumnVisible(true);

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
      "false"
    );
    assert.equal(dom.window.document.getElementById("left-column-b")?.getAttribute("data-x-tweaks-left-column"), "true");
    assert.equal(dom.window.document.getElementById("x-tweaks-left-column-toggle")?.getAttribute("aria-label"), "Collapse left column");
    assert.equal(dom.window.document.getElementById("x-tweaks-right-column-toggle")?.getAttribute("aria-label"), "Hide right column");

    app.stop();
    dom.window.close();
  });
}
