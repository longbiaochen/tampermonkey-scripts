function createXTweaks(win, options = {}) {
  const doc = win.document;
  const STATUS_PATH_RE = /^\/[^/]+\/status\/\d+/;
  const TARGET_TEXT = "live on x";
  const PROCESSED_ATTR = "data-x-tweaks-live-on-x-processed";
  const HIDDEN_ATTR = "data-x-tweaks-live-on-x-hidden";
  const LEFT_COLUMN_SELECTOR = "[data-x-tweaks-left-column='true']";
  const RIGHT_COLUMN_SELECTOR = "[data-testid='sidebarColumn']";
  const PRIMARY_COLUMN_SELECTOR = "[data-testid='primaryColumn']";
  const LEFT_COLUMN_ATTR = "data-x-tweaks-left-column";
  const LEFT_COLUMN_FOLDED_ATTR = "data-x-tweaks-left-column-folded";
  const RIGHT_COLUMN_HIDDEN_ATTR = "data-x-tweaks-right-column-hidden";
  const LAYOUT_ROOT_ATTR = "data-x-tweaks-layout-root";
  const RIGHT_TOGGLE_BUTTON_ID = "x-tweaks-right-column-toggle";
  const RIGHT_TOGGLE_HOST_ATTR = "data-x-tweaks-right-column-toggle-host";
  const FLOATING_DOCK_TEST_ATTR = "data-x-tweaks-floating-dock";
  const STYLE_ID = "x-tweaks-styles";
  const RIGHT_COLUMN_STORAGE_KEY = "x-tweaks:right-column-visible";

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

  function readStoredBool(key, defaultValue) {
    const stored = win.localStorage.getItem(key);
    if (stored === null) {
      return defaultValue;
    }
    return stored === "true";
  }

  function readStoredRightColumnVisibility() {
    return readStoredBool(RIGHT_COLUMN_STORAGE_KEY, true);
  }

  function updateState() {
    win.__xTweaksState = {
      active: true,
      hiddenCount,
      leftColumnFolded: true,
      rightColumnVisible: readStoredRightColumnVisibility(),
      leftColumnCount: doc.querySelectorAll(LEFT_COLUMN_SELECTOR).length,
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

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} {
        width: 76px !important;
        min-width: 76px !important;
        max-width: 76px !important;
        align-items: center !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} nav,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [role="navigation"],
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} > div,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} > header {
        align-items: center !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} a,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} button {
        justify-content: center !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} nav a span:not([aria-hidden="true"]),
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} nav button span:not([aria-hidden="true"]),
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} header a span:not([aria-hidden="true"]),
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} header button span:not([aria-hidden="true"]),
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="SideNav_AccountSwitcher_Button"] span:not([aria-hidden="true"]) {
        max-width: 0 !important;
        opacity: 0 !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="SideNav_NewTweet_Button"] {
        width: 52px !important;
        min-width: 52px !important;
        max-width: 52px !important;
        padding-inline: 0 !important;
        justify-content: center !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] {
        grid-template-columns: minmax(76px, 76px) minmax(0, 1fr) minmax(320px, 350px) !important;
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

      #${RIGHT_TOGGLE_BUTTON_ID} {
        appearance: none;
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        padding: 0;
        margin: 0;
        width: 100%;
        height: 100%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      #${RIGHT_TOGGLE_BUTTON_ID}:focus-visible {
        outline: 2px solid #1d9bf0;
        outline-offset: 2px;
      }

      #${RIGHT_TOGGLE_BUTTON_ID} svg {
        width: 1.25rem;
        height: 1.25rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.75;
        stroke-linecap: round;
        stroke-linejoin: round;
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

  function getDirectChild(root, node) {
    let current = node;
    while (current?.parentElement && current.parentElement !== root) {
      current = current.parentElement;
    }
    return current?.parentElement === root ? current : null;
  }

  function findLeftColumn(layoutRoot) {
    if (!(layoutRoot instanceof win.HTMLElement)) {
      return null;
    }

    const primary = layoutRoot.querySelector(PRIMARY_COLUMN_SELECTOR);
    if (!(primary instanceof win.HTMLElement)) {
      return null;
    }

    let primaryChild = getDirectChild(layoutRoot, primary);
    while (primaryChild?.previousElementSibling) {
      const candidate = primaryChild.previousElementSibling;
      if (
        candidate.querySelector("nav, [role='navigation'], header") ||
        candidate.querySelector("a[href='/home'], a[href='/explore'], a[href='/notifications']")
      ) {
        return candidate;
      }
      primaryChild = candidate;
    }

    return null;
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
        const leftColumn = findLeftColumn(layoutRoot);
        leftColumn?.setAttribute(LEFT_COLUMN_ATTR, "true");
      }
    }

    const primaries = root.matches(PRIMARY_COLUMN_SELECTOR)
      ? [root]
      : Array.from(root.querySelectorAll(PRIMARY_COLUMN_SELECTOR));

    for (const primary of primaries) {
      let current = primary.parentElement;
      while (current && current instanceof win.HTMLElement && current !== doc.body) {
        const leftColumn = findLeftColumn(current);
        if (leftColumn instanceof win.HTMLElement) {
          current.setAttribute(LAYOUT_ROOT_ATTR, "true");
          leftColumn.setAttribute(LEFT_COLUMN_ATTR, "true");
          break;
        }
        current = current.parentElement;
      }
    }
  }

  function buttonSvg(name) {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2"></rect>
        <path d="M14 5v14"></path>
      </svg>
    `;
  }

  function updateRightColumnButton() {
    const button = doc.getElementById(RIGHT_TOGGLE_BUTTON_ID);
    if (!(button instanceof win.HTMLButtonElement)) {
      return;
    }

    const visible = readStoredRightColumnVisibility();
    const nextPressed = visible ? "true" : "false";
    const nextTitle = visible ? "Hide the right column" : "Show the right column";
    const nextLabel = visible ? "Hide right column" : "Show right column";

    if (button.innerHTML !== buttonSvg("right")) {
      button.innerHTML = buttonSvg("right");
    }

    if (button.getAttribute("aria-pressed") !== nextPressed) {
      button.setAttribute("aria-pressed", nextPressed);
    }

    if (button.getAttribute("aria-label") !== nextLabel) {
      button.setAttribute("aria-label", nextLabel);
    }

    if (button.title !== nextTitle) {
      button.title = nextTitle;
    }
  }

  function updateToggleButton() {
    updateRightColumnButton();
  }

  function applyRightColumnVisible(visible, { persist } = { persist: true }) {
    if (persist) {
      win.localStorage.setItem(RIGHT_COLUMN_STORAGE_KEY, visible ? "true" : "false");
    }
    doc.documentElement.setAttribute(RIGHT_COLUMN_HIDDEN_ATTR, visible ? "false" : "true");
    updateToggleButton();
    updateState();
  }

  function setRightColumnVisible(visible) {
    applyRightColumnVisible(visible, { persist: true });
  }

  function isVisibleDockButton(node) {
    if (!(node instanceof win.HTMLElement) || node.id === RIGHT_TOGGLE_BUTTON_ID) {
      return false;
    }

    if (!node.matches("button, a[href], [role='button']")) {
      return false;
    }

    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return false;
    }

    return (
      rect.width >= 32 &&
      rect.width <= 72 &&
      rect.height >= 32 &&
      rect.height <= 72 &&
      rect.right >= win.innerWidth - 180 &&
      rect.bottom >= win.innerHeight - 280
    );
  }

  function getDockItem(host, node) {
    let current = node;
    while (current?.parentElement && current.parentElement !== host) {
      current = current.parentElement;
    }
    return current?.parentElement === host ? current : null;
  }

  function findFloatingDockHost() {
    const explicitHost = doc.querySelector(`[${FLOATING_DOCK_TEST_ATTR}="true"]`);
    if (explicitHost instanceof win.HTMLElement) {
      return explicitHost;
    }

    const candidates = Array.from(doc.querySelectorAll("button, a[href], [role='button']")).filter(
      isVisibleDockButton
    );

    const groups = new Map();
    for (const candidate of candidates) {
      const key = candidate.parentElement;
      if (!(key instanceof win.HTMLElement)) {
        continue;
      }
      const group = groups.get(key) || [];
      group.push(candidate);
      groups.set(key, group);
    }

    const ranked = Array.from(groups.entries())
      .filter(([, buttons]) => buttons.length >= 2)
      .sort((left, right) => right[1].length - left[1].length);

    return ranked[0]?.[0] || null;
  }

  function createRightToggleMount(referenceButton) {
    const mount = doc.createElement("div");
    mount.setAttribute(RIGHT_TOGGLE_HOST_ATTR, "true");

    const button = doc.createElement("button");
    button.id = RIGHT_TOGGLE_BUTTON_ID;
    button.type = "button";
    button.className = referenceButton.className;
    if (referenceButton.getAttribute("style")) {
      button.setAttribute("style", referenceButton.getAttribute("style"));
    }

    button.addEventListener("click", () => {
      setRightColumnVisible(!readStoredRightColumnVisibility());
    });

    mount.className = referenceButton.parentElement?.className || "";
    if (referenceButton.parentElement?.getAttribute("style")) {
      mount.setAttribute("style", referenceButton.parentElement.getAttribute("style"));
    }

    mount.appendChild(button);
    return mount;
  }

  function ensureRightColumnToggleButton() {
    const host = findFloatingDockHost();
    if (!(host instanceof win.HTMLElement)) {
      return;
    }

    const nativeButtons = Array.from(host.querySelectorAll("button, a[href], [role='button']")).filter(
      (node) => node instanceof win.HTMLElement && node.id !== RIGHT_TOGGLE_BUTTON_ID
    );

    if (nativeButtons.length < 2) {
      return;
    }

    const secondNativeButton = nativeButtons[1];
    const anchorItem = getDockItem(host, secondNativeButton);
    if (!(anchorItem instanceof win.HTMLElement)) {
      return;
    }

    const existingButton = doc.getElementById(RIGHT_TOGGLE_BUTTON_ID);
    let mount = existingButton?.closest(`[${RIGHT_TOGGLE_HOST_ATTR}="true"]`);
    if (!(mount instanceof win.HTMLElement)) {
      mount = createRightToggleMount(secondNativeButton);
    }

    if (anchorItem.nextSibling !== mount) {
      host.insertBefore(mount, anchorItem.nextSibling);
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
    ensureRightColumnToggleButton();
  }

  function start() {
    ensureStyles();
    markLayoutRoots(doc.body);
    doc.documentElement.setAttribute(LEFT_COLUMN_FOLDED_ATTR, "true");
    ensureRightColumnToggleButton();
    applyRightColumnVisible(readStoredRightColumnVisibility(), { persist: false });
    hiddenCount += processLiveChip(doc.body);
    updateState();

    observer = new win.MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          handleNode(node);
        }
      }

      ensureRightColumnToggleButton();
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
    isLeftColumnFolded: () => true,
    isRightColumnVisible: readStoredRightColumnVisibility,
    selectors: {
      LEFT_COLUMN_SELECTOR,
      RIGHT_COLUMN_SELECTOR,
      PRIMARY_COLUMN_SELECTOR,
      RIGHT_TOGGLE_BUTTON_ID
    },
    storageKeys: {
      rightColumnVisible: RIGHT_COLUMN_STORAGE_KEY
    }
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
