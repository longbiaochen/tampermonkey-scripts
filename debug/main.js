import { createXTweaks } from "../src/x-tweaks.js";

const fixture = document.getElementById("fixture");
const statePanel = document.getElementById("state");

let app = null;
let debugPathname = "/home";

function renderHomeFixture() {
  debugPathname = "/home";
  fixture.innerHTML = `
    <div class="x-shell" id="debug-layout">
      <main class="x-primary" data-testid="primaryColumn">
        <h2>Primary column</h2>
        <p>Expected: right column hidden by default, toggle button visible.</p>
      </main>
      <aside class="x-sidebar" data-testid="sidebarColumn">
        <h3>Right column</h3>
        <p>Trending, recommendations, and other sidebar content.</p>
      </aside>
    </div>
  `;
}

function renderStatusFixture() {
  debugPathname = "/debug/status/123";
  fixture.innerHTML = `
    <div class="x-shell" id="debug-layout">
      <main class="x-primary" data-testid="primaryColumn">
        <h2>Status page</h2>
        <button class="chip" id="fixture-chip"><span>Live on X</span></button>
      </main>
      <aside class="x-sidebar" data-testid="sidebarColumn">
        <h3>Right column</h3>
      </aside>
    </div>
  `;
}

function refreshState() {
  statePanel.textContent = JSON.stringify(window.__xTweaksState, null, 2);
}

function startApp() {
  app?.stop();
  document.getElementById("x-tweaks-right-column-toggle")?.remove();
  app = createXTweaks(window, { pathname: debugPathname });
  app.start();
  refreshState();
}

document.getElementById("render-home").addEventListener("click", () => {
  renderHomeFixture();
  startApp();
});

document.getElementById("render-status").addEventListener("click", () => {
  renderStatusFixture();
  startApp();
});

document.getElementById("add-live-chip").addEventListener("click", () => {
  const primary = fixture.querySelector("[data-testid='primaryColumn']");
  if (primary) {
    primary.insertAdjacentHTML(
      "beforeend",
      `<button class="chip"><span>Live on X</span></button>`
    );
  }

  refreshState();
});

document.getElementById("add-sidebar").addEventListener("click", () => {
  const layout = document.getElementById("debug-layout");
  if (layout && !layout.querySelector("[data-testid='sidebarColumn']")) {
    layout.insertAdjacentHTML(
      "beforeend",
      `<aside class="x-sidebar" data-testid="sidebarColumn"><h3>Right column</h3></aside>`
    );
  }

  refreshState();
});

renderHomeFixture();
startApp();
setInterval(refreshState, 250);
