import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { createXReader } from "../src/scripts/x-reader/index.js";

function createDom({ pathname = "/home", body = "" } = {}) {
  return new JSDOM(`<!doctype html><html><head></head><body>${body}</body></html>`, {
    url: `https://x.com${pathname}`,
    pretendToBeVisual: true
  });
}

const LAYOUT = `
  <div id="layout">
    <main>
      <div data-testid="primaryColumn">Primary</div>
      <aside data-testid="sidebarColumn">Sidebar</aside>
    </main>
  </div>
`;

async function runCase(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

export async function runXReaderTests() {
  await runCase("collapse the right column by default and inject the toggle", async () => {
    const dom = createDom({ body: LAYOUT });
    const app = createXReader(dom.window);
    app.start();

    const html = dom.window.document.documentElement;
    const btn = dom.window.document.getElementById("x-reader-toggle");
    const style = dom.window.document.getElementById("x-reader-style");
    const css = style?.textContent || "";

    assert.equal(html.getAttribute("data-xr"), "wide");
    assert.equal(app.isCollapsed(), true);
    assert.notEqual(btn, null);
    assert.equal(btn?.getAttribute("aria-pressed"), "false");
    assert.equal(btn?.dataset.collapsed, "true");
    assert.notEqual(style, null);
    assert.match(css, /\[data-testid="sidebarColumn"\] \{ display: none !important; \}/);
    assert.match(css, /width: min\(92vw, 1100px\) !important;/);
    assert.match(css, /max-height: min\(88vh, 1100px\) !important;/);

    app.stop();
    dom.window.close();
  });

  await runCase("toggle hides and shows the right column and persists state", async () => {
    const dom = createDom({ body: LAYOUT });
    const app = createXReader(dom.window);
    app.start();

    const html = dom.window.document.documentElement;
    const btn = dom.window.document.getElementById("x-reader-toggle");

    btn?.click();
    assert.equal(html.getAttribute("data-xr"), "normal");
    assert.equal(dom.window.localStorage.getItem("x-reader:right-collapsed"), "false");
    assert.equal(btn?.getAttribute("aria-pressed"), "true");
    assert.equal(btn?.dataset.collapsed, "false");

    btn?.click();
    assert.equal(html.getAttribute("data-xr"), "wide");
    assert.equal(dom.window.localStorage.getItem("x-reader:right-collapsed"), "true");
    assert.equal(btn?.getAttribute("aria-pressed"), "false");

    app.stop();
    dom.window.close();
  });

  await runCase("respect a stored expanded state on startup", async () => {
    const dom = createDom({ body: LAYOUT });
    dom.window.localStorage.setItem("x-reader:right-collapsed", "false");

    const app = createXReader(dom.window);
    app.start();

    assert.equal(dom.window.document.documentElement.getAttribute("data-xr"), "normal");
    assert.equal(app.isCollapsed(), false);
    assert.equal(
      dom.window.document.getElementById("x-reader-toggle")?.getAttribute("aria-pressed"),
      "true"
    );

    app.stop();
    dom.window.close();
  });

  await runCase("do not inject duplicate buttons or styles when started twice", async () => {
    const dom = createDom({ body: LAYOUT });
    const app = createXReader(dom.window);
    app.start();
    app.start();

    assert.equal(dom.window.document.querySelectorAll("#x-reader-toggle").length, 1);
    assert.equal(dom.window.document.querySelectorAll("#x-reader-style").length, 1);

    app.stop();
    dom.window.close();
  });

  await runCase("stop cleans up the button, style, and attribute", async () => {
    const dom = createDom({ body: LAYOUT });
    const app = createXReader(dom.window);
    app.start();
    app.stop();

    assert.equal(dom.window.document.getElementById("x-reader-toggle"), null);
    assert.equal(dom.window.document.getElementById("x-reader-style"), null);
    assert.equal(dom.window.document.documentElement.hasAttribute("data-xr"), false);

    dom.window.close();
  });

  await runCase("honor custom width and media height options in the CSS", async () => {
    const dom = createDom({ body: LAYOUT });
    const app = createXReader(dom.window, { maxWidth: 1300, maxMediaVh: 80 });
    app.start();

    const css = dom.window.document.getElementById("x-reader-style")?.textContent || "";
    assert.match(css, /width: min\(92vw, 1300px\) !important;/);
    assert.match(css, /max-height: min\(80vh, 1300px\) !important;/);

    app.stop();
    dom.window.close();
  });
}
