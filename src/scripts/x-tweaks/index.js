function createXTweaks(win, options = {}) {
  const doc = win.document;
  const STATUS_PATH_RE = /^\/[^/]+\/status\/\d+/;
  const BOOKMARKS_PATH_RE = /^\/i\/bookmarks\/?$/;
  const CHAT_PATH_RE = /^\/i\/chat\/?$/;
  const TARGET_TEXT = "live on x";
  const PROCESSED_ATTR = "data-x-tweaks-live-on-x-processed";
  const HIDDEN_ATTR = "data-x-tweaks-live-on-x-hidden";
  const BOOKMARKS_EMPTY_STATE_PROCESSED_ATTR = "data-x-tweaks-bookmarks-empty-state-processed";
  const LEFT_COLUMN_SELECTOR = "[data-x-tweaks-left-column='true']";
  const RIGHT_COLUMN_SELECTOR = "[data-testid='sidebarColumn']";
  const PRIMARY_COLUMN_SELECTOR = "[data-testid='primaryColumn']";
  const LEFT_COLUMN_ATTR = "data-x-tweaks-left-column";
  const LEFT_COLUMN_FOLDED_ATTR = "data-x-tweaks-left-column-folded";
  const LEFT_COLUMN_BRAND_SLOT_ATTR = "data-x-tweaks-left-column-brand-slot";
  const RIGHT_COLUMN_HIDDEN_ATTR = "data-x-tweaks-right-column-hidden";
  const LAYOUT_ROOT_ATTR = "data-x-tweaks-layout-root";
  const LEFT_TOGGLE_BUTTON_ID = "x-tweaks-left-column-toggle";
  const LEFT_TOGGLE_HOST_ATTR = "data-x-tweaks-left-column-toggle-host";
  const RIGHT_TOGGLE_BUTTON_ID = "x-tweaks-right-column-toggle";
  const RIGHT_TOGGLE_HOST_ATTR = "data-x-tweaks-right-column-toggle-host";
  const RIGHT_TOGGLE_MODE_ATTR = "data-x-tweaks-right-column-toggle-mode";
  const COMPOSE_HOST_ATTR = "data-x-tweaks-compose-host";
  const FLOATING_DOCK_TEST_ATTR = "data-x-tweaks-floating-dock";
  const LEFT_NAV_ITEM_SELECTOR = [
    "a[href='/home']",
    "a[href='/messages']",
    "a[href='/i/chat']",
    "[data-testid='AppTabBar_Home_Link']",
    "[data-testid='AppTabBar_Messages_Link']",
    "a[href='/compose/post']"
  ].join(", ");
  const STYLE_ID = "x-tweaks-styles";
  const LEFT_COLUMN_STORAGE_KEY = "x-tweaks:left-column-folded";
  const RIGHT_COLUMN_STORAGE_KEY = "x-tweaks:right-column-visible";
  const RIGHT_COLUMN_DEFAULT_OPEN_MIGRATION_KEY =
    "x-tweaks:right-column-default-open-migrated-v1";
  const DEFAULT_DOCK_GAP = 12;
  const DOCK_MARGIN = 24;
  const FEATURE_DEFAULTS = {
    foldLeftColumn: true,
    rightColumnToggle: true,
    hideBookmarksEmptyState: true,
    hideLiveChip: true
  };
  const features = {
    ...FEATURE_DEFAULTS,
    ...(options.features || {})
  };

  let hiddenCount = 0;
  let observer = null;
  let resizeHandler = null;
  let popstateHandler = null;
  let originalPushState = null;
  let originalReplaceState = null;
  let lastRoutePathname = null;

  function isFeatureEnabled(name) {
    return features[name] === true;
  }

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isStatusPage() {
    return STATUS_PATH_RE.test(getPathname());
  }

  function isBookmarksPage() {
    return BOOKMARKS_PATH_RE.test(getPathname());
  }

  function isChatPage() {
    return CHAT_PATH_RE.test(getPathname());
  }

  function shouldApplyLayoutTweaks() {
    return !isChatPage() && (isFeatureEnabled("foldLeftColumn") || isFeatureEnabled("rightColumnToggle"));
  }

  function getPathname() {
    return typeof options.pathname === "string" && options.pathname.length > 0
      ? options.pathname
      : win.location.pathname;
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

  function migrateRightColumnDefaultOpen() {
    if (win.localStorage.getItem(RIGHT_COLUMN_DEFAULT_OPEN_MIGRATION_KEY) === "true") {
      return;
    }

    win.localStorage.setItem(RIGHT_COLUMN_STORAGE_KEY, "true");
    win.localStorage.setItem(RIGHT_COLUMN_DEFAULT_OPEN_MIGRATION_KEY, "true");
  }

  function readCurrentRightColumnVisibility() {
    return doc.documentElement.getAttribute(RIGHT_COLUMN_HIDDEN_ATTR) !== "true";
  }

  function updateState() {
    win.__xTweaksState = {
      active: true,
      hiddenCount,
      features,
      leftColumnFolded: readStoredLeftColumnFolded(),
      rightColumnVisible: readCurrentRightColumnVisibility(),
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
        width: 72px !important;
        min-width: 72px !important;
        max-width: 72px !important;
        align-items: center !important;
        overflow: visible !important;
        scrollbar-width: none !important;
        flex: 0 0 72px !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR}::-webkit-scrollbar,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} *::-webkit-scrollbar {
        width: 0 !important;
        height: 0 !important;
        display: none !important;
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
        width: 72px !important;
        min-width: 72px !important;
        max-width: 72px !important;
        scrollbar-width: none !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} a,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} button {
        justify-content: center !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} > a,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} > button,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} > [data-testid="SideNav_AccountSwitcher_Button"],
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} > [data-testid="SideNav_NewTweet_Button"] {
        margin-inline: auto !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [${COMPOSE_HOST_ATTR}="true"] {
        width: 56px !important;
        min-width: 56px !important;
        max-width: 56px !important;
        align-items: center !important;
        margin-inline: auto !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} nav a,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} nav button,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="SideNav_AccountSwitcher_Button"],
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="SideNav_NewTweet_Button"] {
        width: 56px !important;
        min-width: 56px !important;
        max-width: 56px !important;
        min-height: 56px !important;
        margin-inline: auto !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Home_Link"],
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Explore_Link"],
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Notifications_Link"],
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Messages_Link"],
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Profile_Link"] {
        position: relative !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 56px !important;
        min-width: 56px !important;
        max-width: 56px !important;
        height: 56px !important;
        min-height: 56px !important;
        max-height: 56px !important;
        flex: 0 0 56px !important;
        margin-inline: auto !important;
        overflow: visible !important;
        border-radius: 9999px !important;
        background: transparent !important;
        isolation: isolate !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Home_Link"] *,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Explore_Link"] *,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Notifications_Link"] *,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Messages_Link"] *,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Profile_Link"] * {
        background-color: transparent !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Home_Link"]::before,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Explore_Link"]::before,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Notifications_Link"]::before,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Messages_Link"]::before,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Profile_Link"]::before {
        content: "" !important;
        position: absolute !important;
        left: 50% !important;
        top: 50% !important;
        width: 56px !important;
        height: 56px !important;
        border-radius: 9999px !important;
        background: rgba(15, 20, 25, 0.1) !important;
        opacity: 0 !important;
        transform: translate(calc(-50% - 16px), -50%) !important;
        pointer-events: none !important;
        z-index: 0 !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Home_Link"]:hover::before,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Explore_Link"]:hover::before,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Notifications_Link"]:hover::before,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Messages_Link"]:hover::before,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Profile_Link"]:hover::before,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Home_Link"]:focus-visible::before,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Explore_Link"]:focus-visible::before,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Notifications_Link"]:focus-visible::before,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Messages_Link"]:focus-visible::before,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Profile_Link"]:focus-visible::before {
        opacity: 1 !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Home_Link"] > div,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Explore_Link"] > div,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Notifications_Link"] > div,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Messages_Link"] > div,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Profile_Link"] > div {
        width: 56px !important;
        min-width: 56px !important;
        max-width: 56px !important;
        height: 56px !important;
        min-height: 56px !important;
        max-height: 56px !important;
        padding: 0 !important;
        margin: 0 !important;
        border-radius: 9999px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex: 0 0 56px !important;
        box-sizing: border-box !important;
        background-color: transparent !important;
        position: relative !important;
        z-index: 1 !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Home_Link"] > div > div,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Explore_Link"] > div > div,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Notifications_Link"] > div > div,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Messages_Link"] > div > div,
      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="AppTabBar_Profile_Link"] > div > div {
        margin: 0 !important;
        padding: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
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
        width: 56px !important;
        min-width: 56px !important;
        max-width: 56px !important;
        height: 56px !important;
        padding-inline: 0 !important;
        justify-content: center !important;
        align-items: center !important;
        position: relative !important;
        background-color: #1d9bf0 !important;
        color: #ffffff !important;
        border-radius: 9999px !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="SideNav_AccountSwitcher_Button"] {
        height: 56px !important;
        padding-inline: 0 !important;
        overflow: hidden !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="SideNav_NewTweet_Button"] > * {
        display: none !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] ${LEFT_COLUMN_SELECTOR} [data-testid="SideNav_NewTweet_Button"]::before {
        content: "" !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 24px !important;
        height: 24px !important;
        background-color: currentColor !important;
        -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M17.53 2.47a.75.75 0 0 1 1.06 0l2.88 2.88a.75.75 0 0 1 0 1.06l-1.94 1.94-3.94-3.94 1.94-1.94ZM14.53 5.47 4.25 15.75V19.5H8l10.28-10.28-3.75-3.75Zm-2.03 13.28a.75.75 0 0 1 0 1.5h-8a.75.75 0 0 1 0-1.5h8Zm5.25-6.25a.75.75 0 0 1 .75.75v2h2a.75.75 0 0 1 0 1.5h-2v2a.75.75 0 0 1-1.5 0v-2h-2a.75.75 0 0 1 0-1.5h2v-2a.75.75 0 0 1 .75-.75Z'/%3E%3C/svg%3E") !important;
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M17.53 2.47a.75.75 0 0 1 1.06 0l2.88 2.88a.75.75 0 0 1 0 1.06l-1.94 1.94-3.94-3.94 1.94-1.94ZM14.53 5.47 4.25 15.75V19.5H8l10.28-10.28-3.75-3.75Zm-2.03 13.28a.75.75 0 0 1 0 1.5h-8a.75.75 0 0 1 0-1.5h8Zm5.25-6.25a.75.75 0 0 1 .75.75v2h2a.75.75 0 0 1 0 1.5h-2v2a.75.75 0 0 1-1.5 0v-2h-2a.75.75 0 0 1 0-1.5h2v-2a.75.75 0 0 1 .75-.75Z'/%3E%3C/svg%3E") !important;
        -webkit-mask-repeat: no-repeat !important;
        mask-repeat: no-repeat !important;
        -webkit-mask-position: center !important;
        mask-position: center !important;
        -webkit-mask-size: contain !important;
        mask-size: contain !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] {
        display: flex !important;
      }

      html[${LEFT_COLUMN_FOLDED_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] > main {
        max-width: none !important;
        min-width: 0 !important;
        flex: 1 1 auto !important;
      }

      [${LEFT_TOGGLE_HOST_ATTR}="true"] {
        position: fixed;
        z-index: 40;
        display: inline-flex;
        align-items: center !important;
        justify-content: center !important;
        width: 56px;
        height: 56px;
        min-width: 56px;
        max-width: 56px;
        min-height: 56px;
        max-height: 56px;
        border: 1px solid rgba(207, 217, 222, 1);
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 8px 24px rgba(15, 20, 25, 0.18), 0 1px 2px rgba(15, 20, 25, 0.08);
        color: rgb(15, 20, 25);
        overflow: hidden;
        pointer-events: auto !important;
      }

      [${LEFT_COLUMN_BRAND_SLOT_ATTR}="true"] {
        display: inherit !important;
      }

      #${LEFT_TOGGLE_BUTTON_ID} {
        appearance: none;
        position: relative;
        z-index: 1;
        border: 0;
        background: transparent;
        color: inherit;
        width: 100%;
        height: 100%;
        border-radius: 9999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        margin: 0;
        cursor: pointer;
      }

      #${LEFT_TOGGLE_BUTTON_ID}:hover {
        background: rgba(15, 20, 25, 0.1);
      }

      #${LEFT_TOGGLE_BUTTON_ID}:focus-visible {
        outline: none;
      }

      #${LEFT_TOGGLE_BUTTON_ID} svg {
        width: 24px;
        height: 24px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2.05;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] ${PRIMARY_COLUMN_SELECTOR} {
        width: min(100%, clamp(720px, 84vw, 980px)) !important;
        max-width: min(100%, 980px) !important;
        min-width: 0 !important;
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
        width: 24px;
        height: 24px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2.15;
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
        width: 56px;
        height: 56px;
        min-width: 56px;
        max-width: 56px;
        min-height: 56px;
        max-height: 56px;
        border: 1px solid rgba(207, 217, 222, 1);
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 8px 24px rgba(15, 20, 25, 0.18), 0 1px 2px rgba(15, 20, 25, 0.08);
        color: rgb(15, 20, 25);
        overflow: hidden;
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

  function getDirectChild(root, node) {
    let current = node;
    while (current?.parentElement && current.parentElement !== root) {
      current = current.parentElement;
    }
    return current?.parentElement === root ? current : null;
  }

  function isLeftColumnCandidate(node) {
    if (!(node instanceof win.HTMLElement)) {
      return false;
    }

    if (
      node.matches(
        [
          "nav",
          "a",
          "button",
          "main",
          PRIMARY_COLUMN_SELECTOR,
          RIGHT_COLUMN_SELECTOR,
          `[${RIGHT_TOGGLE_HOST_ATTR}="true"]`,
          `[${LEFT_TOGGLE_HOST_ATTR}="true"]`
        ].join(", ")
      )
    ) {
      return false;
    }

    const hasLeftNavItem = Boolean(node.querySelector(LEFT_NAV_ITEM_SELECTOR));
    if (!hasLeftNavItem) {
      return false;
    }

    return node.matches("header, aside") || node.getAttribute("role") === "complementary";
  }

  function findStandaloneLeftColumn(root) {
    if (!(root instanceof win.HTMLElement)) {
      return null;
    }

    const navItem = root.matches(LEFT_NAV_ITEM_SELECTOR)
      ? root
      : root.querySelector(LEFT_NAV_ITEM_SELECTOR);
    if (!(navItem instanceof win.HTMLElement)) {
      return null;
    }

    const header = navItem.closest("header");
    if (header instanceof win.HTMLElement && isLeftColumnCandidate(header)) {
      return header;
    }

    let current = navItem.parentElement;
    while (current && current !== doc.body) {
      if (isLeftColumnCandidate(current)) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
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
    while (current && current !== doc.body) {
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

  function findLayoutRootFromSidebar(sidebar) {
    let current = sidebar instanceof win.HTMLElement ? sidebar : null;
    while (current && current !== doc.body) {
      if (current.querySelector(PRIMARY_COLUMN_SELECTOR)) {
        return current;
      }
      current = current.parentElement;
    }
    return sidebar?.parentElement || null;
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
        markLeftColumn(findLeftColumn(layoutRoot));
      }
    }

    const sidebars = root.matches(RIGHT_COLUMN_SELECTOR)
      ? [root]
      : Array.from(root.querySelectorAll(RIGHT_COLUMN_SELECTOR));

    for (const sidebar of sidebars) {
      const layoutRoot = findLayoutRootFromSidebar(sidebar);
      if (!(layoutRoot instanceof win.HTMLElement)) {
        continue;
      }

      layoutRoot.setAttribute(LAYOUT_ROOT_ATTR, "true");
      markLeftColumn(findLeftColumn(layoutRoot));
    }

    markLeftColumn(findStandaloneLeftColumn(root));
  }

  function markLeftColumn(leftColumn) {
    if (!(leftColumn instanceof win.HTMLElement)) {
      return;
    }

    leftColumn.setAttribute(LEFT_COLUMN_ATTR, "true");
    if (isFeatureEnabled("foldLeftColumn")) {
      ensureLeftColumnToggleButton(leftColumn);
    }

    const composeButton = leftColumn.querySelector('[data-testid="SideNav_NewTweet_Button"]');
    const composeHost = composeButton?.parentElement;
    if (
      composeHost instanceof win.HTMLElement &&
      composeHost !== leftColumn &&
      !composeHost.hasAttribute(COMPOSE_HOST_ATTR)
    ) {
      composeHost.setAttribute(COMPOSE_HOST_ATTR, "true");
    }
  }

  function compareDocumentPosition(left, right) {
    return left.compareDocumentPosition(right) & win.Node.DOCUMENT_POSITION_FOLLOWING;
  }

  function findLeftColumnBrandSlot(leftColumn) {
    if (!(leftColumn instanceof win.HTMLElement)) {
      return null;
    }

    const nav = leftColumn.querySelector("nav, [role='navigation']");
    const candidates = Array.from(
      leftColumn.querySelectorAll(
        [
          "a[aria-label='X']",
          "a[aria-label='Twitter']"
        ].join(", ")
      )
    ).filter((node) => node instanceof win.HTMLElement && !node.closest("nav, [role='navigation']"));

    const beforeNav = nav instanceof win.HTMLElement
      ? candidates.filter((node) => compareDocumentPosition(node, nav))
      : candidates;

    return beforeNav[0] || null;
  }

  function leftButtonSvg(expanded) {
    const arrowPath = expanded ? "m15 9-3 3 3 3" : "m12 9 3 3-3 3";
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.75 5.25h14.5a2.5 2.5 0 0 1 2.5 2.5v8.5a2.5 2.5 0 0 1-2.5 2.5H4.75a2.5 2.5 0 0 1-2.5-2.5v-8.5a2.5 2.5 0 0 1 2.5-2.5Z"></path>
        <path d="M8.75 5.25v13.5"></path>
        <path d="${arrowPath}"></path>
      </svg>
    `;
  }

  function rightButtonSvg() {
    return `
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M7.5 8.5h17a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-17a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3Z"></path>
        <path d="M19.5 8.5v15"></path>
        <path d="m12 12 3 4-3 4"></path>
      </svg>
    `;
  }

  function readCurrentLeftColumnFolded() {
    return doc.documentElement.getAttribute(LEFT_COLUMN_FOLDED_ATTR) !== "false";
  }

  function updateLeftColumnButton() {
    const button = doc.getElementById(LEFT_TOGGLE_BUTTON_ID);
    if (!(button instanceof win.HTMLButtonElement)) {
      return;
    }

    const folded = readCurrentLeftColumnFolded();
    const nextPressed = folded ? "true" : "false";
    const nextTitle = folded ? "Expand the left column" : "Collapse the left column";
    const nextLabel = folded ? "Expand left column" : "Collapse left column";
    const nextSvg = leftButtonSvg(!folded);

    if (button.innerHTML !== nextSvg) {
      button.innerHTML = nextSvg;
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

  function createLeftToggleButton() {
    const host = doc.createElement("div");
    host.setAttribute(LEFT_TOGGLE_HOST_ATTR, "true");

    const button = doc.createElement("button");
    button.id = LEFT_TOGGLE_BUTTON_ID;
    button.type = "button";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setLeftColumnFolded(!readCurrentLeftColumnFolded());
      button.blur();
    });

    host.appendChild(button);
    updateLeftColumnButton();
    return host;
  }

  function ensureLeftColumnToggleButton(leftColumn) {
    if (!(leftColumn instanceof win.HTMLElement)) {
      return;
    }

    for (const existingButton of Array.from(doc.querySelectorAll(`#${LEFT_TOGGLE_BUTTON_ID}`))) {
      const existingHost = existingButton.closest(`[${LEFT_TOGGLE_HOST_ATTR}="true"]`);
      if (existingHost instanceof win.HTMLElement) {
        if (existingHost.parentElement !== doc.body || leftColumn.contains(existingHost)) {
          existingHost.remove();
        }
      } else {
        existingButton.remove();
      }
    }

    let host = doc.querySelector(`[${LEFT_TOGGLE_HOST_ATTR}="true"]`);
    if (!(host instanceof win.HTMLElement)) {
      host = createLeftToggleButton();
      doc.body.appendChild(host);
    } else if (host.parentElement !== doc.body) {
      doc.body.appendChild(host);
    }

    positionLeftColumnToggleButton();
    updateLeftColumnButton();
  }

  function updateRightColumnButton() {
    const button = doc.getElementById(RIGHT_TOGGLE_BUTTON_ID);
    if (!(button instanceof win.HTMLButtonElement)) {
      return;
    }

    const visible = readCurrentRightColumnVisibility();
    const nextPressed = visible ? "true" : "false";
    const nextTitle = visible ? "Hide the right column" : "Show the right column";
    const nextLabel = visible ? "Hide right column" : "Show right column";

    if (button.innerHTML !== rightButtonSvg()) {
      button.innerHTML = rightButtonSvg();
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
    updateLeftColumnButton();
    updateState();
  }

  function setLeftColumnFolded(folded) {
    applyLeftColumnFolded(folded, { persist: true });
  }

  function clearLayoutTweaks() {
    for (const selector of [
      `[${LEFT_TOGGLE_HOST_ATTR}="true"]`,
      `[${RIGHT_TOGGLE_HOST_ATTR}="true"]`
    ]) {
      for (const node of Array.from(doc.querySelectorAll(selector))) {
        node.remove();
      }
    }

    for (const node of Array.from(doc.querySelectorAll(`[${LEFT_COLUMN_ATTR}="true"]`))) {
      node.removeAttribute(LEFT_COLUMN_ATTR);
    }
    for (const node of Array.from(doc.querySelectorAll(`[${LAYOUT_ROOT_ATTR}="true"]`))) {
      node.removeAttribute(LAYOUT_ROOT_ATTR);
    }
    for (const node of Array.from(doc.querySelectorAll(`[${COMPOSE_HOST_ATTR}="true"]`))) {
      node.removeAttribute(COMPOSE_HOST_ATTR);
    }

    doc.documentElement.removeAttribute(LEFT_COLUMN_FOLDED_ATTR);
    doc.documentElement.removeAttribute(RIGHT_COLUMN_HIDDEN_ATTR);
    updateState();
  }

  function handleRouteChange() {
    const pathname = getPathname();
    if (pathname === lastRoutePathname) {
      return;
    }

    lastRoutePathname = pathname;
    if (isChatPage()) {
      clearLayoutTweaks();
      return;
    }

    if (shouldApplyLayoutTweaks()) {
      ensureStyles();
      markLayoutRoots(doc.body);
    }
    if (isFeatureEnabled("foldLeftColumn")) {
      applyLeftColumnFolded(readStoredLeftColumnFolded(), { persist: false });
    }
    if (isFeatureEnabled("rightColumnToggle")) {
      applyRightColumnVisible(readStoredRightColumnVisibility(), { persist: false });
    }
    if (isFeatureEnabled("hideLiveChip")) {
      hiddenCount += processLiveChip(doc.body);
    }
    if (isFeatureEnabled("hideBookmarksEmptyState")) {
      hiddenCount += processBookmarksEmptyState(doc.body);
    }
    updateState();
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

  function isCompactChromeRect(buttonRect, candidateRect) {
    return (
      candidateRect &&
      candidateRect.width >= buttonRect.width &&
      candidateRect.height >= buttonRect.height &&
      candidateRect.width - buttonRect.width <= 16 &&
      candidateRect.height - buttonRect.height <= 16
    );
  }

  function getDockButtonChrome(referenceButton) {
    const ancestors = [];
    let current = referenceButton.parentElement;
    while (current instanceof win.HTMLElement && current !== doc.body) {
      ancestors.push(current);
      current = current.parentElement;
    }

    const buttonRect = referenceButton.getBoundingClientRect();
    const compactAncestors = ancestors.filter((node) =>
      isCompactChromeRect(buttonRect, node.getBoundingClientRect())
    );

    return {
      outer: compactAncestors[compactAncestors.length - 1] || referenceButton,
      inner: compactAncestors[0] || null
    };
  }

  function extractBoxStyles(element) {
    if (!(element instanceof win.HTMLElement)) {
      return null;
    }

    const cs = win.getComputedStyle(element);
    return {
      borderRadius: cs.borderRadius,
      boxShadow: cs.boxShadow,
      backgroundColor: cs.backgroundColor,
      border: cs.border,
      backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter || "",
      color: cs.color
    };
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
        const chrome = getDockButtonChrome(referenceButton);
        return {
          referenceButton,
          referenceOuter: chrome.outer,
          referenceInner: chrome.inner,
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
        const chrome = getDockButtonChrome(referenceButton);
        return {
          referenceButton,
          referenceOuter: chrome.outer,
          referenceInner: chrome.inner,
          dockButtons: candidates
        };
      }
    }

    if (referenceButton instanceof win.HTMLElement) {
      const chrome = getDockButtonChrome(referenceButton);
      return {
        referenceButton,
        referenceOuter: chrome.outer,
        referenceInner: chrome.inner,
        dockButtons: [referenceButton]
      };
    }

    return null;
  }

  function createRightToggleMount(referenceButton) {
    const mount = doc.createElement("div");
    mount.setAttribute(RIGHT_TOGGLE_HOST_ATTR, "true");
    mount.setAttribute(RIGHT_TOGGLE_MODE_ATTR, "floating");

    const { outer: referenceOuter, inner: referenceInner } = getDockButtonChrome(referenceButton);
    const outerBox = extractBoxStyles(referenceOuter);
    const innerBox = extractBoxStyles(referenceInner);

    if (outerBox?.color) {
      mount.style.color = outerBox.color;
    }

    const inner = doc.createElement("div");
    inner.style.width = "100%";
    inner.style.height = "100%";
    inner.style.display = "flex";
    inner.style.alignItems = "stretch";
    inner.style.justifyContent = "stretch";
    if (innerBox?.borderRadius) {
      inner.style.borderRadius = innerBox.borderRadius;
    }

    const button = doc.createElement("button");
    button.id = RIGHT_TOGGLE_BUTTON_ID;
    button.type = "button";

    button.addEventListener("click", () => {
      setRightColumnVisible(!readCurrentRightColumnVisibility());
    });

    inner.appendChild(button);
    mount.appendChild(inner);
    return mount;
  }

  function createFallbackRightToggleMount() {
    const mount = doc.createElement("div");
    mount.setAttribute(RIGHT_TOGGLE_HOST_ATTR, "true");
    mount.setAttribute(RIGHT_TOGGLE_MODE_ATTR, "fallback");
    mount.style.right = `${DOCK_MARGIN}px`;
    mount.style.bottom = `${DOCK_MARGIN}px`;

    const button = doc.createElement("button");
    button.id = RIGHT_TOGGLE_BUTTON_ID;
    button.type = "button";
    button.addEventListener("click", () => {
      setRightColumnVisible(!readCurrentRightColumnVisibility());
    });

    mount.appendChild(button);
    return mount;
  }

  function positionFloatingToggle(mount, anchor, stackIndex = 0) {
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

    const toggleWidth = Math.max(48, Math.min(64, referenceRect.width || 56));
    const toggleHeight = Math.max(48, Math.min(64, referenceRect.height || 56));
    const step = toggleHeight + gap;
    const nextTop = Math.max(DOCK_MARGIN, referenceRect.top - step * (stackIndex + 1));
    const referenceCenterX = referenceRect.left + referenceRect.width / 2;
    const nextLeft = Math.max(
      DOCK_MARGIN,
      Math.min(win.innerWidth - DOCK_MARGIN - toggleWidth, referenceCenterX - toggleWidth / 2)
    );

    mount.style.top = `${Math.round(nextTop)}px`;
    mount.style.left = `${Math.round(nextLeft)}px`;
    mount.style.right = "auto";
    mount.style.width = `${Math.round(toggleWidth)}px`;
    mount.style.height = `${Math.round(toggleHeight)}px`;
  }

  function positionLeftColumnToggleButton() {
    const mount = doc
      .getElementById(LEFT_TOGGLE_BUTTON_ID)
      ?.closest(`[${LEFT_TOGGLE_HOST_ATTR}="true"]`);
    if (!(mount instanceof win.HTMLElement)) {
      return;
    }

    const anchor = findFloatingDockAnchor();
    if (anchor?.referenceButton instanceof win.HTMLElement) {
      positionFloatingToggle(mount, anchor, isFeatureEnabled("rightColumnToggle") ? 1 : 0);
      return;
    }

    mount.style.right = `${DOCK_MARGIN}px`;
    mount.style.bottom = `${DOCK_MARGIN + (isFeatureEnabled("rightColumnToggle") ? 68 : 0)}px`;
    mount.style.left = "auto";
    mount.style.top = "auto";
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
      positionLeftColumnToggleButton();
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

    positionLeftColumnToggleButton();
    updateRightColumnButton();
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
    if (!isFeatureEnabled("hideLiveChip") || !isStatusPage() || !(root instanceof win.HTMLElement)) {
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

  function processBookmarksEmptyState(root) {
    if (
      !isFeatureEnabled("hideBookmarksEmptyState") ||
      !isBookmarksPage() ||
      !(root instanceof win.HTMLElement)
    ) {
      return 0;
    }

    const candidates = root.matches('[data-testid="emptyState"]')
      ? [root]
      : Array.from(root.querySelectorAll('[data-testid="emptyState"]'));

    let nextHidden = 0;
    for (const candidate of candidates) {
      if (
        !(candidate instanceof win.HTMLElement) ||
        candidate.getAttribute(BOOKMARKS_EMPTY_STATE_PROCESSED_ATTR) === "true"
      ) {
        continue;
      }

      candidate.setAttribute(BOOKMARKS_EMPTY_STATE_PROCESSED_ATTR, "true");
      if (hideElement(candidate)) {
        nextHidden += 1;
      }
    }

    return nextHidden;
  }

  function handleNode(node) {
    if (!(node instanceof win.HTMLElement)) {
      return;
    }

    if (shouldApplyLayoutTweaks()) {
      markLayoutRoots(node);
    }
    if (isFeatureEnabled("hideLiveChip")) {
      hiddenCount += processLiveChip(node);
    }
    if (isFeatureEnabled("hideBookmarksEmptyState")) {
      hiddenCount += processBookmarksEmptyState(node);
    }
    if (!isChatPage() && isFeatureEnabled("rightColumnToggle")) {
      ensureRightColumnToggleButton();
      applyRightColumnVisible(readStoredRightColumnVisibility(), { persist: false });
    }
    if (!isChatPage() && isFeatureEnabled("foldLeftColumn")) {
      applyLeftColumnFolded(readStoredLeftColumnFolded(), { persist: false });
    }
  }

  function start() {
    if (isFeatureEnabled("rightColumnToggle")) {
      migrateRightColumnDefaultOpen();
    }
    if (shouldApplyLayoutTweaks()) {
      ensureStyles();
      markLayoutRoots(doc.body);
    }
    if (!isChatPage() && isFeatureEnabled("rightColumnToggle")) {
      ensureRightColumnToggleButton();
    }
    if (!isChatPage() && isFeatureEnabled("foldLeftColumn")) {
      applyLeftColumnFolded(readStoredLeftColumnFolded(), { persist: false });
    }
    lastRoutePathname = getPathname();
    if (!isChatPage() && isFeatureEnabled("rightColumnToggle")) {
      applyRightColumnVisible(readStoredRightColumnVisibility(), { persist: false });
    }
    if (isFeatureEnabled("hideLiveChip")) {
      hiddenCount += processLiveChip(doc.body);
    }
    if (isFeatureEnabled("hideBookmarksEmptyState")) {
      hiddenCount += processBookmarksEmptyState(doc.body);
    }
    updateState();

    observer = new win.MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          handleNode(node);
        }
      }

      if (!isChatPage() && isFeatureEnabled("rightColumnToggle")) {
        ensureRightColumnToggleButton();
        applyRightColumnVisible(readStoredRightColumnVisibility(), { persist: false });
      }
      if (!isChatPage() && isFeatureEnabled("foldLeftColumn")) {
        applyLeftColumnFolded(readStoredLeftColumnFolded(), { persist: false });
      }
      handleRouteChange();
      updateState();
    });

    observer.observe(doc.documentElement, {
      childList: true,
      subtree: true
    });

    if (isFeatureEnabled("foldLeftColumn") || isFeatureEnabled("rightColumnToggle")) {
      resizeHandler = () => {
        if (isFeatureEnabled("rightColumnToggle")) {
          ensureRightColumnToggleButton();
        }
        if (isFeatureEnabled("foldLeftColumn")) {
          positionLeftColumnToggleButton();
        }
      };
      win.addEventListener("resize", resizeHandler);
    }

    popstateHandler = () => {
      handleRouteChange();
    };
    win.addEventListener("popstate", popstateHandler);

    originalPushState = win.history.pushState.bind(win.history);
    originalReplaceState = win.history.replaceState.bind(win.history);
    win.history.pushState = (...args) => {
      const result = originalPushState(...args);
      handleRouteChange();
      return result;
    };
    win.history.replaceState = (...args) => {
      const result = originalReplaceState(...args);
      handleRouteChange();
      return result;
    };
  }

  function stop() {
    observer?.disconnect();
    if (resizeHandler) {
      win.removeEventListener("resize", resizeHandler);
      resizeHandler = null;
    }
    if (popstateHandler) {
      win.removeEventListener("popstate", popstateHandler);
      popstateHandler = null;
    }
    if (originalPushState) {
      win.history.pushState = originalPushState;
      originalPushState = null;
    }
    if (originalReplaceState) {
      win.history.replaceState = originalReplaceState;
      originalReplaceState = null;
    }
  }

  return {
    start,
    stop,
    setLeftColumnFolded,
    setRightColumnVisible,
    isLeftColumnFolded: readStoredLeftColumnFolded,
    isRightColumnVisible: readCurrentRightColumnVisibility,
    selectors: {
      LEFT_COLUMN_SELECTOR,
      RIGHT_COLUMN_SELECTOR,
      PRIMARY_COLUMN_SELECTOR,
      LEFT_TOGGLE_BUTTON_ID,
      RIGHT_TOGGLE_BUTTON_ID
    },
    storageKeys: {
      leftColumnFolded: LEFT_COLUMN_STORAGE_KEY,
      rightColumnVisible: RIGHT_COLUMN_STORAGE_KEY,
      rightColumnDefaultOpenMigration: RIGHT_COLUMN_DEFAULT_OPEN_MIGRATION_KEY
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
