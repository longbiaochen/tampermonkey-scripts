import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { createGitLabTweaks } from "../src/scripts/gitlab-tweaks/index.js";

function createDom({ url = "https://gitlab.example.com/groups/test/-/boards", head = "", body = "" } = {}) {
  return new JSDOM(`<!doctype html><html><head>${head}</head><body>${body}</body></html>`, {
    url,
    pretendToBeVisual: true
  });
}

async function nextFrame(win) {
  await Promise.resolve();
  await new Promise((resolve) => win.requestAnimationFrame(() => resolve()));
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

export async function runGitLabTweaksTests() {
  await runCase("redirect projects dropdown to the sorted dashboard", async () => {
    const dom = createDom({
      head: '<meta name="application-name" content="GitLab">',
      body: '<button id="nav-groups-dropdown" type="button">Projects</button>'
    });

    let assignedUrl = null;
    const app = createGitLabTweaks(dom.window, {
      navigate: (url) => {
        assignedUrl = url;
      }
    });
    assert.equal(app.start(), true);
    await nextFrame(dom.window);

    dom.window.document.getElementById("nav-groups-dropdown")?.click();

    assert.equal(assignedUrl, "https://gitlab.example.com/dashboard/projects?sort=name_asc");

    app.stop();
    dom.window.close();
  });

  await runCase("rewrite board header links to stable issues URLs", async () => {
    const dom = createDom({
      head: '<meta name="application-name" content="GitLab">',
      body: `
        <div class="boards-list-header">
          <a id="board-link" href="/group/project">Board</a>
        </div>
        <div class="issue-boards-content">
          <h2><a id="issue-link" href="/group/project/-/issues">Issues</a></h2>
        </div>
      `
    });

    const app = createGitLabTweaks(dom.window);
    app.start();
    await nextFrame(dom.window);

    assert.equal(
      dom.window.document.getElementById("board-link")?.getAttribute("href"),
      "/group/project/-/issues?key=1"
    );
    assert.equal(
      dom.window.document.getElementById("issue-link")?.getAttribute("href"),
      "/group/project/-/issues?key=1"
    );

    app.stop();
    dom.window.close();
  });

  await runCase("collapse contextual sidebars and click the collapse toggle once", async () => {
    const dom = createDom({
      head: '<meta name="application-name" content="GitLab">',
      body: `
        <div class="layout-page with-contextual-sidebar right-sidebar-expanded"></div>
        <button id="collapse" class="right-sidebar-toggle" type="button">Collapse</button>
      `
    });

    let clicked = 0;
    dom.window.document.getElementById("collapse")?.addEventListener("click", () => {
      clicked += 1;
    });

    const app = createGitLabTweaks(dom.window);
    app.start();
    await nextFrame(dom.window);

    const page = dom.window.document.querySelector(".layout-page.with-contextual-sidebar");
    assert.equal(page?.classList.contains("right-sidebar-expanded"), false);
    assert.equal(page?.classList.contains("right-sidebar-collapsed"), true);
    assert.equal(clicked, 1);

    app.stop();
    dom.window.close();
  });

  await runCase("apply tweaks to dynamically inserted GitLab board content", async () => {
    const dom = createDom({
      head: '<meta name="application-name" content="GitLab">',
      body: '<main id="app"></main>'
    });

    const app = createGitLabTweaks(dom.window);
    app.start();

    dom.window.document.getElementById("app")?.insertAdjacentHTML(
      "beforeend",
      `
        <div class="issue-boards-content">
          <h2><a id="dynamic-link" href="/group/project">Issues</a></h2>
        </div>
      `
    );

    await nextFrame(dom.window);

    assert.equal(
      dom.window.document.getElementById("dynamic-link")?.getAttribute("href"),
      "/group/project/-/issues?key=1"
    );

    app.stop();
    dom.window.close();
  });
}
