// X Reader Layout
//
// Collapse X's right column by default, widen the timeline, and enlarge media.
// The whole layout hangs off a single html[data-xr="wide"] switch, so it survives
// SPA navigation for free — no MutationObserver, no per-tweet fixups. JS only owns
// the floating toggle button and one persisted boolean.
function createXReader(win, options = {}) {
  const doc = win.document;

  const MAX_WIDTH = options.maxWidth || 1100; // px, widest the timeline may grow when collapsed
  const MAX_MEDIA_VH = options.maxMediaVh || 88; // %, tallest a single photo/video may get

  const STORAGE_KEY = "x-reader:right-collapsed";
  const ATTR = "data-xr"; // <html data-xr="wide"> => right column collapsed, timeline widened
  const BTN_ID = "x-reader-toggle";
  const STYLE_ID = "x-reader-style";

  let repositionTimers = [];
  let resizeHandler = null;

  // Default = collapsed (wide). Only an explicit "false" reopens the right column.
  function isCollapsed() {
    return win.localStorage.getItem(STORAGE_KEY) !== "false";
  }

  function setCollapsed(value) {
    win.localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
  }

  function apply(collapsed) {
    doc.documentElement.setAttribute(ATTR, collapsed ? "wide" : "normal");
    const btn = doc.getElementById(BTN_ID);
    if (btn) {
      btn.setAttribute("aria-pressed", collapsed ? "false" : "true");
      btn.title = collapsed ? "显示右栏" : "折叠右栏";
      btn.dataset.collapsed = String(collapsed);
    }
  }

  function toggle() {
    const next = !isCollapsed();
    setCollapsed(next);
    apply(next);
  }

  function injectStyle() {
    if (doc.getElementById(STYLE_ID)) {
      return;
    }

    const style = doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* 1. Hide the right column (search / trends / who-to-follow). */
      html[${ATTR}="wide"] [data-testid="sidebarColumn"] { display: none !important; }

      /* 2. Let the flex wrapper reclaim the space the right column left behind. */
      html[${ATTR}="wide"] main div:has(> [data-testid="primaryColumn"]) {
        max-width: none !important;
        width: 100% !important;
      }

      /* 3. Widen the middle column, kept centered. */
      html[${ATTR}="wide"] [data-testid="primaryColumn"] {
        width: min(92vw, ${MAX_WIDTH}px) !important;
        max-width: min(92vw, ${MAX_WIDTH}px) !important;
        margin-inline: auto !important;
      }

      /* 4. Release X's inline media width caps so images/videos grow with the column. */
      html[${ATTR}="wide"] [data-testid="primaryColumn"] [style*="max-width"] {
        max-width: 100% !important;
      }

      /* 5. Give tall photos/videos more vertical room (bounded so portraits stay sane). */
      html[${ATTR}="wide"] [data-testid="primaryColumn"] [data-testid="tweetPhoto"],
      html[${ATTR}="wide"] [data-testid="primaryColumn"] [data-testid="tweetPhoto"] img,
      html[${ATTR}="wide"] [data-testid="primaryColumn"] [data-testid="videoComponent"],
      html[${ATTR}="wide"] [data-testid="primaryColumn"] [data-testid="videoPlayer"] {
        max-height: min(${MAX_MEDIA_VH}vh, ${MAX_WIDTH}px) !important;
      }

      /* ── Floating toggle button, sits in the bottom-right FAB stack. ── */
      #${BTN_ID} {
        position: fixed;
        right: 20px;
        bottom: 150px; /* JS re-stacks this just above the Grok/Chat buttons when found */
        z-index: 2147483000;
        width: 50px;
        height: 50px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 9999px;
        cursor: pointer;
        padding: 0;
        transition: transform .12s ease, background-color .12s ease, box-shadow .12s ease;
      }
      #${BTN_ID}:hover { transform: translateY(-1px); }
      #${BTN_ID}:active { transform: translateY(0); }
      #${BTN_ID} svg { width: 24px; height: 24px; display: block; }
      #${BTN_ID}[data-collapsed="true"] .xr-pane { fill: currentColor; opacity: .9; }
    `;

    (doc.head || doc.documentElement).appendChild(style);
  }

  // "panel-right" glyph: a rounded frame whose right pane fills in while collapsed.
  function buttonIcon() {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="4.5" width="18" height="15" rx="2.2"></rect>
        <rect class="xr-pane" x="14.5" y="4.5" width="6.5" height="15" stroke="none"></rect>
        <line x1="14.5" y1="4.5" x2="14.5" y2="19.5"></line>
      </svg>`;
  }

  function themeIsDark() {
    if (!doc.body) {
      return false;
    }
    const match = win.getComputedStyle(doc.body).backgroundColor.match(/\d+/g);
    if (!match) {
      return false;
    }
    const [r, g, b] = match.map(Number);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
  }

  function paint(btn) {
    const dark = themeIsDark();
    btn.style.backgroundColor = dark ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)";
    btn.style.color = dark ? "#e7e9ea" : "#0f1419";
    btn.style.border = dark
      ? "1px solid rgba(255,255,255,0.22)"
      : "1px solid rgba(15,20,25,0.12)";
    btn.style.boxShadow = dark
      ? "0 4px 16px rgba(0,0,0,0.6)"
      : "0 4px 16px rgba(15,20,25,0.18)";
    btn.style.backdropFilter = "blur(6px)";
  }

  // Stack the button just above X's native bottom-right FABs (Grok / Chat).
  // Leaves the CSS fallback offset in place when the dock hasn't mounted yet.
  function position(btn) {
    if (!btn || !btn.isConnected) {
      return;
    }
    try {
      const fabs = Array.from(
        doc.querySelectorAll('button, a[role="button"], [role="button"]')
      )
        .filter((el) => el !== btn && !btn.contains(el))
        .map((el) => el.getBoundingClientRect())
        .filter(
          (r) =>
            r.width > 0 &&
            r.width <= 72 &&
            r.right > win.innerWidth - 100 &&
            r.bottom > win.innerHeight - 220
        );
      if (fabs.length) {
        const topMost = Math.min(...fabs.map((r) => r.top));
        btn.style.bottom = Math.round(win.innerHeight - topMost + 14) + "px";
      }
    } catch (_error) {
      // getBoundingClientRect can throw in exotic states; the CSS fallback still holds.
    }
  }

  function buildButton() {
    if (doc.getElementById(BTN_ID) || !doc.body) {
      return;
    }

    const btn = doc.createElement("button");
    btn.id = BTN_ID;
    btn.type = "button";
    btn.setAttribute("aria-label", "切换右栏显示");
    btn.innerHTML = buttonIcon();
    btn.addEventListener("click", toggle);

    doc.body.appendChild(btn);
    paint(btn);
    position(btn);
    apply(isCollapsed());

    // FABs mount late; nudge the position a few times, then on every resize.
    repositionTimers = [400, 1200, 2500].map((delay) =>
      win.setTimeout(() => position(btn), delay)
    );
    resizeHandler = () => position(btn);
    win.addEventListener("resize", resizeHandler);
  }

  function start() {
    // Apply the switch + CSS as early as possible to avoid a flash of the old layout.
    apply(isCollapsed());
    injectStyle();

    if (doc.body) {
      buildButton();
    } else {
      doc.addEventListener("DOMContentLoaded", buildButton, { once: true });
    }
  }

  function stop() {
    for (const timer of repositionTimers) {
      win.clearTimeout(timer);
    }
    repositionTimers = [];
    if (resizeHandler) {
      win.removeEventListener("resize", resizeHandler);
      resizeHandler = null;
    }
    doc.getElementById(BTN_ID)?.remove();
    doc.getElementById(STYLE_ID)?.remove();
    doc.documentElement.removeAttribute(ATTR);
  }

  return {
    start,
    stop,
    toggle,
    apply,
    isCollapsed,
    setCollapsed,
    selectors: { ATTR, BTN_ID, STYLE_ID, STORAGE_KEY }
  };
}

function runXReader(win) {
  const app = createXReader(win);
  app.start();
  return app;
}

export { createXReader, runXReader };
