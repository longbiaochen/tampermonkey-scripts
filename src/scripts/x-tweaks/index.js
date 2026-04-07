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
  const RIGHT_TOGGLE_MODE_ATTR = "data-x-tweaks-right-column-toggle-mode";
  const RIGHT_TOGGLE_FALLBACK_BUTTON_CLASS =
    "css-175oi2r r-6koalj r-eqz5dr r-16y2uox r-1pi2tsx r-1loqt21 r-o7ynqc r-6416eg r-1ny4l3l";
  const FLOATING_DOCK_TEST_ATTR = "data-x-tweaks-floating-dock";
  const STYLE_ID = "x-tweaks-styles";
  const LEFT_COLUMN_STORAGE_KEY = "x-tweaks:left-column-folded";
  const RIGHT_COLUMN_STORAGE_KEY = "x-tweaks:right-column-visible";
  const WEIBO_ICON_URL = "https://weibo.com/favicon.ico";
  const ICON_LINK_SELECTOR = "link[rel~='icon'], link[rel='apple-touch-icon']";
  const DEFAULT_DOCK_GAP = 12;
  const DOCK_MARGIN = 24;

  let hiddenCount = 0;
  let observer = null;
  let resizeHandler = null;

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

  function readStoredLeftColumnFolded() {
    return readStoredBool(LEFT_COLUMN_STORAGE_KEY, true);
  }

  function updateState() {
    win.__xTweaksState = {
      active: true,
      hiddenCount,
      leftColumnFolded: readStoredLeftColumnFolded(),
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
        position: relative !important;
        width: 76px !important;
        min-width: 76px !important;
        max-width: 76px !important;
        align-items: center !important;
        overflow: visible !important;
        flex: 0 0 76px !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="false"] ${LEFT_COLUMN_SELECTOR} {
        position: relative !important;
        overflow: visible !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} nav,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [role="navigation"],
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} > div,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} > header,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} > div > div,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} > div > div > div {
        align-items: center !important;
        width: 76px !important;
        min-width: 76px !important;
        max-width: 76px !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} a,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} button {
        justify-content: center !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} nav a,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} nav button,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="SideNav_AccountSwitcher_Button"],
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="SideNav_NewTweet_Button"] {
        width: 52px !important;
        min-width: 52px !important;
        max-width: 52px !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} nav a span:not([aria-hidden="true"]),
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} nav button span:not([aria-hidden="true"]),
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} header a span:not([aria-hidden="true"]),
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} header button span:not([aria-hidden="true"]),
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="SideNav_AccountSwitcher_Button"] span:not([aria-hidden="true"]),
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [dir="auto"],
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Home_Link"] span:last-child,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Explore_Link"] span:last-child,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Notifications_Link"] span:last-child,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Messages_Link"] span:last-child,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Profile_Link"] span:last-child,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="SideNav_NewTweet_Button"] span:not([aria-hidden="true"]) {
        max-width: 0 !important;
        opacity: 0 !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 0 !important;
        min-width: 0 !important;
        pointer-events: none !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="SideNav_NewTweet_Button"] {
        width: 52px !important;
        min-width: 52px !important;
        max-width: 52px !important;
        padding-inline: 0 !important;
        justify-content: center !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] {
        display: flex !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] > main {
        width: calc(100% - 76px) !important;
        max-width: none !important;
        min-width: 0 !important;
        flex: 1 1 auto !important;
      }

      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] {
        justify-content: flex-start !important;
      }

      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] > main {
        width: calc(100% - 76px) !important;
        max-width: none !important;
        min-width: 0 !important;
        flex: 1 1 auto !important;
      }

      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] ${PRIMARY_COLUMN_SELECTOR} {
        width: min(100%, clamp(720px, 84vw, 980px)) !important;
        max-width: min(100%, 980px) !important;
        min-width: 0;
        margin-inline: auto !important;
      }

      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] ${PRIMARY_COLUMN_SELECTOR} > * {
        width: 100%;
        max-width: 100%;
      }

      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] ${PRIMARY_COLUMN_SELECTOR} section,
      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] ${PRIMARY_COLUMN_SELECTOR} article,
      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] ${PRIMARY_COLUMN_SELECTOR} [data-testid="cellInnerDiv"],
      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] ${PRIMARY_COLUMN_SELECTOR} [data-testid="tweet"],
      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] ${PRIMARY_COLUMN_SELECTOR} [data-testid="primaryColumn"] > * {
        max-width: 100% !important;
      }

      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] ${PRIMARY_COLUMN_SELECTOR} [style*="max-width"] {
        max-width: 100% !important;
      }

      @media (max-width: 1280px) {
        html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] ${PRIMARY_COLUMN_SELECTOR} {
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
        width: 1.5rem;
        height: 1.5rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 2.1;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      [${RIGHT_TOGGLE_HOST_ATTR}="true"][${RIGHT_TOGGLE_MODE_ATTR}="floating"],
      [${RIGHT_TOGGLE_HOST_ATTR}="true"][${RIGHT_TOGGLE_MODE_ATTR}="fallback"] {
        position: fixed;
        z-index: 40;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
      }

      [${RIGHT_TOGGLE_HOST_ATTR}="true"] #${RIGHT_TOGGLE_BUTTON_ID} {
        width: 100%;
        height: 100%;
        color: inherit;
        align-items: center;
        justify-content: center;
      }

    `;

    doc.head.appendChild(style);
  }

  function ensureWeiboIconLink(rel) {
    let link = doc.head.querySelector(`link[rel='${rel}']`);
    if (!(link instanceof win.HTMLLinkElement)) {
      link = doc.createElement("link");
      link.rel = rel;
      doc.head.appendChild(link);
    }

    if (link.href !== WEIBO_ICON_URL) {
      link.href = WEIBO_ICON_URL;
    }
  }

  function ensureWeiboIcons() {
    if (!(doc.head instanceof win.HTMLHeadElement)) {
      return;
    }

    const existingLinks = Array.from(doc.head.querySelectorAll(ICON_LINK_SELECTOR));
    for (const link of existingLinks) {
      if (link instanceof win.HTMLLinkElement && link.href !== WEIBO_ICON_URL) {
        link.href = WEIBO_ICON_URL;
      }
    }

    ensureWeiboIconLink("icon");
    ensureWeiboIconLink("apple-touch-icon");
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

  function isLeftColumnCandidate(node) {
    return (
      node instanceof win.HTMLElement &&
      (node.matches("header") ||
        Boolean(
          node.querySelector(
            "a[href='/home'], [data-testid='AppTabBar_Home_Link'], a[href='/compose/post']"
          )
        ))
    );
  }

  function findLeftColumn(layoutRoot) {
    if (!(layoutRoot instanceof win.HTMLElement)) {
      return null;
    }

    const primary = layoutRoot.querySelector(PRIMARY_COLUMN_SELECTOR);
    if (!(primary instanceof win.HTMLElement)) {
      return null;
    }

    const primaryChild = getDirectChild(layoutRoot, primary);
    if (!(primaryChild instanceof win.HTMLElement)) {
      return null;
    }

    const children = Array.from(layoutRoot.children);
    const directLeftChild = children.find(
      (candidate) => candidate !== primaryChild && isLeftColumnCandidate(candidate)
    );
    if (directLeftChild instanceof win.HTMLElement) {
      return directLeftChild;
    }

    let current = primaryChild.previousElementSibling;
    while (current) {
      if (isLeftColumnCandidate(current)) {
        return current;
      }
      current = current.previousElementSibling;
    }

    return children.find(isLeftColumnCandidate) || null;
  }

  function findLayoutRootFromPrimary(primary) {
    let current = primary?.parentElement;
    while (current && current instanceof win.HTMLElement && current !== doc.body) {
      const primaryChild = getDirectChild(current, primary);
      if (
        primaryChild instanceof win.HTMLElement &&
        Array.from(current.children).some(
          (candidate) => candidate !== primaryChild && isLeftColumnCandidate(candidate)
        )
      ) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  }

  function markLayoutRoots(root) {
    if (!(root instanceof win.HTMLElement)) {
      return;
    }

    const primaries = root.matches(PRIMARY_COLUMN_SELECTOR)
      ? [root]
      : Array.from(root.querySelectorAll(PRIMARY_COLUMN_SELECTOR));

    for (const primary of primaries) {
      const layoutRoot = findLayoutRootFromPrimary(primary);
      if (layoutRoot instanceof win.HTMLElement) {
        layoutRoot.setAttribute(LAYOUT_ROOT_ATTR, "true");
        const leftColumn = findLeftColumn(layoutRoot);
        leftColumn?.setAttribute(LEFT_COLUMN_ATTR, "true");
      }
    }

    const sidebars = root.matches(RIGHT_COLUMN_SELECTOR)
      ? [root]
      : Array.from(root.querySelectorAll(RIGHT_COLUMN_SELECTOR));

    for (const sidebar of sidebars) {
      const layoutRoot = findLayoutRoot(sidebar);
      if (!(layoutRoot instanceof win.HTMLElement)) {
        continue;
      }

      const leftColumn = findLeftColumn(layoutRoot);
      if (leftColumn instanceof win.HTMLElement) {
        layoutRoot.setAttribute(LAYOUT_ROOT_ATTR, "true");
        leftColumn.setAttribute(LEFT_COLUMN_ATTR, "true");
      }
    }
  }

  function buttonSvg() {
    return `
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M6.5 8.5h19a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-19a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z"></path>
        <path d="M12 8.5v15"></path>
        <path d="M8.75 13h1.5"></path>
        <path d="M8.75 17h1.5"></path>
        <path d="M8.75 21h1.5"></path>
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

    if (button.innerHTML !== buttonSvg()) {
      button.innerHTML = buttonSvg();
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

  function applyRightColumnVisible(visible, { persist } = { persist: true }) {
    if (persist) {
      win.localStorage.setItem(RIGHT_COLUMN_STORAGE_KEY, visible ? "true" : "false");
    }
    doc.documentElement.setAttribute(RIGHT_COLUMN_HIDDEN_ATTR, visible ? "false" : "true");
    updateRightColumnButton();
    updateState();
  }

  function setRightColumnVisible(visible) {
    applyRightColumnVisible(visible, { persist: true });
  }

  function applyLeftColumnFolded(folded, { persist } = { persist: true }) {
    if (persist) {
      win.localStorage.setItem(LEFT_COLUMN_STORAGE_KEY, folded ? "true" : "false");
    }
    doc.documentElement.setAttribute(LEFT_COLUMN_FOLDED_ATTR, folded ? "true" : "false");
    updateState();
  }

  function setLeftColumnFolded(folded) {
    applyLeftColumnFolded(folded, { persist: true });
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

  function findCommonAncestor(left, right) {
    const seen = new Set();
    let current = left;

    while (current && current instanceof win.HTMLElement) {
      seen.add(current);
      current = current.parentElement;
    }

    current = right;
    while (current && current instanceof win.HTMLElement) {
      if (seen.has(current)) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  }

  function sortDockButtonsByVisualOrder(left, right) {
    const leftRect = left.getBoundingClientRect();
    const rightRect = right.getBoundingClientRect();
    return leftRect.top - rightRect.top || leftRect.left - rightRect.left;
  }

  function findFloatingDockAnchor() {
    const explicitHost = doc.querySelector(`[${FLOATING_DOCK_TEST_ATTR}="true"]`);
    if (explicitHost instanceof win.HTMLElement) {
      const explicitButtons = Array.from(
        explicitHost.querySelectorAll("button, a[href], [role='button']")
      ).filter((node) => node instanceof win.HTMLElement && node.id !== RIGHT_TOGGLE_BUTTON_ID);
      const visibleExplicitButtons = explicitButtons.filter(isVisibleDockButton).sort(sortDockButtonsByVisualOrder);
      const referenceButton = visibleExplicitButtons[0] || explicitButtons[0] || null;
      if (referenceButton instanceof win.HTMLElement) {
        return {
          referenceButton,
          dockButtons: visibleExplicitButtons.length ? visibleExplicitButtons : explicitButtons
        };
      }
      return null;
    }

    const candidates = Array.from(doc.querySelectorAll("button, a[href], [role='button']"))
      .filter(isVisibleDockButton)
      .sort(sortDockButtonsByVisualOrder);

    if (!candidates.length) {
      return null;
    }

    const referenceButton = candidates[0];
    if (candidates.length >= 2) {
      const host = findCommonAncestor(candidates[0], candidates[1]);
      if (host instanceof win.HTMLElement) {
        return { referenceButton, dockButtons: candidates };
      }
    }

    if (referenceButton instanceof win.HTMLElement) {
      return { referenceButton, dockButtons: [referenceButton] };
    }

    return null;
  }

  function createRightToggleMount(referenceButton) {
    const mount = doc.createElement("div");
    mount.setAttribute(RIGHT_TOGGLE_HOST_ATTR, "true");
    mount.setAttribute(RIGHT_TOGGLE_MODE_ATTR, "floating");
    mount.style.position = "fixed";
    mount.style.display = "inline-flex";
    mount.style.alignItems = "center";
    mount.style.justifyContent = "center";

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

    mount.appendChild(button);
    return mount;
  }

  function createFallbackRightToggleMount() {
    const mount = doc.createElement("div");
    mount.setAttribute(RIGHT_TOGGLE_HOST_ATTR, "true");
    mount.setAttribute(RIGHT_TOGGLE_MODE_ATTR, "fallback");
    mount.style.position = "fixed";
    mount.style.right = `${DOCK_MARGIN}px`;
    mount.style.bottom = `${DOCK_MARGIN}px`;
    mount.style.width = "53px";
    mount.style.height = "55px";

    const button = doc.createElement("button");
    button.id = RIGHT_TOGGLE_BUTTON_ID;
    button.type = "button";
    button.className = RIGHT_TOGGLE_FALLBACK_BUTTON_CLASS;
    button.setAttribute("style", "align-items: center; justify-content: center;");
    button.addEventListener("click", () => {
      setRightColumnVisible(!readStoredRightColumnVisibility());
    });

    mount.appendChild(button);
    return mount;
  }

  function positionFloatingToggle(mount, anchor) {
    if (!(mount instanceof win.HTMLElement) || !(anchor?.referenceButton instanceof win.HTMLElement)) {
      return;
    }

    const referenceRect = anchor.referenceButton.getBoundingClientRect();
    if (!referenceRect.width || !referenceRect.height) {
      return;
    }

    const dockButtons = Array.isArray(anchor.dockButtons)
      ? anchor.dockButtons.filter((node) => node instanceof win.HTMLElement)
      : [];

    let gap = DEFAULT_DOCK_GAP;
    if (dockButtons.length >= 2) {
      const firstRect = dockButtons[0].getBoundingClientRect();
      const secondRect = dockButtons[1].getBoundingClientRect();
      const measuredGap = secondRect.top - firstRect.bottom;
      if (Number.isFinite(measuredGap) && measuredGap >= 0 && measuredGap <= 32) {
        gap = measuredGap;
      }
    }

    const nextTop = Math.max(DOCK_MARGIN, referenceRect.top - referenceRect.height - gap);
    const nextRight = Math.max(DOCK_MARGIN, win.innerWidth - referenceRect.right);

    mount.style.top = `${Math.round(nextTop)}px`;
    mount.style.right = `${Math.round(nextRight)}px`;
    mount.style.width = `${Math.round(referenceRect.width)}px`;
    mount.style.height = `${Math.round(referenceRect.height)}px`;
  }

  function ensureRightColumnToggleButton() {
    const anchor = findFloatingDockAnchor();
    const existingButton = doc.getElementById(RIGHT_TOGGLE_BUTTON_ID);
    let mount = existingButton?.closest(`[${RIGHT_TOGGLE_HOST_ATTR}="true"]`);

    if (anchor?.referenceButton instanceof win.HTMLElement) {
      if (!(mount instanceof win.HTMLElement) || mount.getAttribute(RIGHT_TOGGLE_MODE_ATTR) !== "floating") {
        mount?.remove();
        mount = createRightToggleMount(anchor.referenceButton);
      }

      if (mount.parentElement !== doc.body) {
        doc.body.appendChild(mount);
      }

      positionFloatingToggle(mount, anchor);
      updateRightColumnButton();
      return;
    }

    if (!(mount instanceof win.HTMLElement) || mount.getAttribute(RIGHT_TOGGLE_MODE_ATTR) !== "fallback") {
      mount?.remove();
      mount = createFallbackRightToggleMount();
    }

    if (mount.parentElement !== doc.body) {
      doc.body.appendChild(mount);
    }

    updateRightColumnButton();
  }

  function applyStoredLayoutState({ persist = false } = {}) {
    applyLeftColumnFolded(readStoredLeftColumnFolded(), { persist });
    applyRightColumnVisible(readStoredRightColumnVisibility(), { persist });
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

    ensureWeiboIcons();
    markLayoutRoots(node);
    hiddenCount += processLiveChip(node);
    ensureRightColumnToggleButton();
    applyStoredLayoutState({ persist: false });
  }

  function start() {
    ensureStyles();
    ensureWeiboIcons();
    markLayoutRoots(doc.body);
    ensureRightColumnToggleButton();
    applyStoredLayoutState({ persist: false });
    hiddenCount += processLiveChip(doc.body);
    updateState();

    observer = new win.MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          handleNode(node);
        }
      }

      ensureRightColumnToggleButton();
      applyStoredLayoutState({ persist: false });
      updateState();
    });

    observer.observe(doc.documentElement, {
      childList: true,
      subtree: true
    });

    resizeHandler = () => {
      ensureRightColumnToggleButton();
    };
    win.addEventListener("resize", resizeHandler);
  }

  function stop() {
    observer?.disconnect();
    if (resizeHandler) {
      win.removeEventListener("resize", resizeHandler);
      resizeHandler = null;
    }
  }

  return {
    start,
    stop,
    setLeftColumnFolded,
    setRightColumnVisible,
    isLeftColumnFolded: readStoredLeftColumnFolded,
    isRightColumnVisible: readStoredRightColumnVisibility,
    selectors: {
      LEFT_COLUMN_SELECTOR,
      RIGHT_COLUMN_SELECTOR,
      PRIMARY_COLUMN_SELECTOR,
      RIGHT_TOGGLE_BUTTON_ID
    },
    storageKeys: {
      leftColumnFolded: LEFT_COLUMN_STORAGE_KEY,
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
