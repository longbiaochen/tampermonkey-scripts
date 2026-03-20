function createXTweaks(win, options = {}) {
  const doc = win.document;
  const STATUS_PATH_RE = /^\/[^/]+\/status\/\d+/;
  const TARGET_TEXT = "live on x";
  const PROCESSED_ATTR = "data-x-tweaks-live-on-x-processed";
  const HIDDEN_ATTR = "data-x-tweaks-live-on-x-hidden";
  const RIGHT_COLUMN_SELECTOR = "[data-testid='sidebarColumn']";
  const PRIMARY_COLUMN_SELECTOR = "[data-testid='primaryColumn']";
  const RIGHT_COLUMN_HIDDEN_ATTR = "data-x-tweaks-right-column-hidden";
  const LAYOUT_ROOT_ATTR = "data-x-tweaks-layout-root";
  const TOGGLE_BUTTON_ID = "x-tweaks-right-column-toggle";
  const STYLE_ID = "x-tweaks-styles";
  const STORAGE_KEY = "x-tweaks:right-column-visible";

  let hiddenCount = 0;
  let observer = null;

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isStatusPage() {
    const pathname =
      typeof options.pathname === "string" && options.pathname.length > 0
        ? options.pathname
        : win.location.pathname;
    return STATUS_PATH_RE.test(pathname);
  }

  function readStoredVisibility() {
    return win.localStorage.getItem(STORAGE_KEY) === "true";
  }

  function updateState() {
    win.__xTweaksState = {
      active: true,
      hiddenCount,
      rightColumnVisible: readStoredVisibility(),
      rightColumnCount: doc.querySelectorAll(RIGHT_COLUMN_SELECTOR).length
    };
  }

  function ensureStyles() {
    if (doc.getElementById(STYLE_ID)) {
      return;
    }

    const style = doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] ${RIGHT_COLUMN_SELECTOR} {
        display: none !important;
      }

      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] {
        justify-content: center !important;
        grid-template-columns: minmax(0, 1fr) !important;
      }

      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] > ${PRIMARY_COLUMN_SELECTOR} {
        width: min(100%, clamp(720px, 88vw, 980px));
        max-width: min(100%, 980px);
        min-width: 0;
      }

      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] > ${PRIMARY_COLUMN_SELECTOR} > * {
        width: 100%;
        max-width: 100%;
      }

      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] > ${PRIMARY_COLUMN_SELECTOR} section,
      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] > ${PRIMARY_COLUMN_SELECTOR} article,
      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] > ${PRIMARY_COLUMN_SELECTOR} [data-testid="cellInnerDiv"],
      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] > ${PRIMARY_COLUMN_SELECTOR} [data-testid="tweet"],
      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] > ${PRIMARY_COLUMN_SELECTOR} [data-testid="primaryColumn"] > * {
        max-width: 100% !important;
      }

      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] > ${PRIMARY_COLUMN_SELECTOR} [style*="max-width"] {
        max-width: 100% !important;
      }

      @media (max-width: 1280px) {
        html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] > ${PRIMARY_COLUMN_SELECTOR} {
          width: min(100%, 92vw);
          max-width: 92vw;
        }
      }

      #${TOGGLE_BUTTON_ID} {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 2147483647;
        border: 1px solid rgba(83, 100, 113, 0.45);
        border-radius: 9999px;
        background: rgba(15, 20, 25, 0.92);
        color: #f7f9f9;
        font: 500 13px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        padding: 10px 14px;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      }

      #${TOGGLE_BUTTON_ID}:hover {
        background: rgba(29, 39, 49, 0.96);
      }

      #${TOGGLE_BUTTON_ID}:focus-visible {
        outline: 2px solid #1d9bf0;
        outline-offset: 2px;
      }
    `;

    doc.head.appendChild(style);
  }

  function findLayoutRoot(sidebar) {
    let current = sidebar;
    while (current && current instanceof win.HTMLElement && current !== doc.body) {
      if (current.querySelector(PRIMARY_COLUMN_SELECTOR)) {
        return current;
      }
      current = current.parentElement;
    }
    return sidebar.parentElement;
  }

  function markLayoutRoots(root) {
    if (!(root instanceof win.HTMLElement)) {
      return;
    }

    const sidebars = root.matches(RIGHT_COLUMN_SELECTOR)
      ? [root]
      : Array.from(root.querySelectorAll(RIGHT_COLUMN_SELECTOR));

    for (const sidebar of sidebars) {
      const layoutRoot = findLayoutRoot(sidebar);
      if (layoutRoot instanceof win.HTMLElement) {
        layoutRoot.setAttribute(LAYOUT_ROOT_ATTR, "true");
      }
    }
  }

  function updateToggleButton() {
    const button = doc.getElementById(TOGGLE_BUTTON_ID);
    if (!(button instanceof win.HTMLButtonElement)) {
      return;
    }

    const visible = readStoredVisibility();
    const nextText = visible ? "Hide right column" : "Show right column";
    const nextPressed = visible ? "true" : "false";
    const nextTitle = visible ? "Hide the right column" : "Show the right column";

    if (button.textContent !== nextText) {
      button.textContent = nextText;
    }

    if (button.getAttribute("aria-pressed") !== nextPressed) {
      button.setAttribute("aria-pressed", nextPressed);
    }

    if (button.title !== nextTitle) {
      button.title = nextTitle;
    }
  }

  function setRightColumnVisible(visible) {
    win.localStorage.setItem(STORAGE_KEY, visible ? "true" : "false");
    doc.documentElement.setAttribute(RIGHT_COLUMN_HIDDEN_ATTR, visible ? "false" : "true");
    updateToggleButton();
    updateState();
  }

  function ensureToggleButton() {
    let button = doc.getElementById(TOGGLE_BUTTON_ID);
    if (!(button instanceof win.HTMLButtonElement)) {
      button = doc.createElement("button");
      button.id = TOGGLE_BUTTON_ID;
      button.type = "button";
      button.addEventListener("click", () => {
        setRightColumnVisible(!readStoredVisibility());
      });
      doc.body.appendChild(button);
    }

    updateToggleButton();
  }

  function shouldHideLiveChip(node) {
    const hasNestedExactMatch = Array.from(node.children).some(
      (child) => child instanceof win.HTMLElement && normalizeText(child.textContent) === TARGET_TEXT
    );

    return (
      node instanceof win.HTMLElement &&
      node.getAttribute(PROCESSED_ATTR) !== "true" &&
      normalizeText(node.textContent) === TARGET_TEXT &&
      !hasNestedExactMatch
    );
  }

  function findHideTarget(node) {
    let current = node;
    let lastMatch = node;

    while (current && current instanceof win.HTMLElement) {
      if (normalizeText(current.textContent) === TARGET_TEXT) {
        lastMatch = current;
      }

      if (
        current.matches("a, button, [role='button'], [data-testid]") ||
        current.getAttribute("role") === "link"
      ) {
        return current;
      }

      current = current.parentElement;
    }

    return lastMatch;
  }

  function hideElement(node) {
    if (!(node instanceof win.HTMLElement) || node.getAttribute(HIDDEN_ATTR) === "true") {
      return false;
    }

    node.style.setProperty("display", "none", "important");
    node.setAttribute(HIDDEN_ATTR, "true");
    return true;
  }

  function processLiveChip(root) {
    if (!isStatusPage() || !(root instanceof win.HTMLElement)) {
      return 0;
    }

    let nextHidden = 0;
    const candidates = root.matches("*") ? [root, ...root.querySelectorAll("*")] : [];

    for (const candidate of candidates) {
      if (!shouldHideLiveChip(candidate)) {
        continue;
      }

      candidate.setAttribute(PROCESSED_ATTR, "true");
      if (hideElement(findHideTarget(candidate))) {
        nextHidden += 1;
      }
    }

    return nextHidden;
  }

  function handleNode(node) {
    if (!(node instanceof win.HTMLElement)) {
      return;
    }

    markLayoutRoots(node);
    hiddenCount += processLiveChip(node);
  }

  function start() {
    ensureStyles();
    markLayoutRoots(doc.body);
    ensureToggleButton();
    setRightColumnVisible(readStoredVisibility());
    hiddenCount += processLiveChip(doc.body);
    updateState();

    observer = new win.MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          handleNode(node);
        }
      }

      ensureToggleButton();
      updateState();
    });

    observer.observe(doc.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function stop() {
    observer?.disconnect();
  }

  return {
    start,
    stop,
    setRightColumnVisible,
    isRightColumnVisible: readStoredVisibility,
    selectors: {
      RIGHT_COLUMN_SELECTOR,
      PRIMARY_COLUMN_SELECTOR,
      TOGGLE_BUTTON_ID
    },
    storageKey: STORAGE_KEY
  };
}

function runXTweaks(win) {
  const app = createXTweaks(win);

  if (win.document.readyState === "loading") {
    win.document.addEventListener("DOMContentLoaded", () => app.start(), { once: true });
  } else {
    app.start();
  }

  return app;
}

export { createXTweaks, runXTweaks };
