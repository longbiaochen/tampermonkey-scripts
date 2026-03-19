// ==UserScript==
// @name         X Tweaks
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Hide the right column by default and remove the "Live on X" chip on post detail pages.
// @author       Longbiao CHEN
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const STATUS_PATH_RE = /^\/[^/]+\/status\/\d+/;
  const TARGET_TEXT = "live on x";
  const PROCESSED_ATTR = "data-x-tweaks-live-on-x-processed";
  const HIDDEN_ATTR = "data-x-tweaks-live-on-x-hidden";
  const CANDIDATE_SELECTOR = "span, div, a, button, [role='button'], [data-testid]";
  const RIGHT_COLUMN_SELECTOR = "[data-testid='sidebarColumn']";
  const RIGHT_COLUMN_HIDDEN_ATTR = "data-x-tweaks-right-column-hidden";
  const LAYOUT_ROOT_ATTR = "data-x-tweaks-layout-root";
  const TOGGLE_BUTTON_ID = "x-tweaks-right-column-toggle";
  const STORAGE_KEY = "x-tweaks:right-column-visible";

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isStatusPage() {
    return STATUS_PATH_RE.test(window.location.pathname);
  }

  function isTargetNode(node) {
    return (
      node instanceof HTMLElement &&
      node.getAttribute(PROCESSED_ATTR) !== "true" &&
      normalizeText(node.textContent) === TARGET_TEXT
    );
  }

  function isInteractiveContainer(node) {
    return (
      node instanceof HTMLElement &&
      node !== document.body &&
      node !== document.documentElement &&
      (node.matches("a, button") ||
        node.getAttribute("role") === "button" ||
        (typeof node.dataset?.testid === "string" && node.dataset.testid.length > 0))
    );
  }

  function hideElement(node) {
    if (!(node instanceof HTMLElement) || node.getAttribute(HIDDEN_ATTR) === "true") {
      return false;
    }

    node.style.setProperty("display", "none", "important");
    node.setAttribute(HIDDEN_ATTR, "true");
    return true;
  }

  function hideTarget(target) {
    let current = target;
    let fallback = null;

    while (current && current instanceof HTMLElement) {
      if (isInteractiveContainer(current)) {
        return hideElement(current);
      }

      if (normalizeText(current.textContent) === TARGET_TEXT) {
        fallback = current;
      }

      current = current.parentElement;
    }

    return hideElement(fallback || target);
  }

  function processNode(root) {
    if (!isStatusPage() || !(root instanceof HTMLElement)) {
      return 0;
    }

    let hidden = 0;

    if (isTargetNode(root)) {
      root.setAttribute(PROCESSED_ATTR, "true");
      if (hideTarget(root)) {
        hidden += 1;
      }
    }

    for (const candidate of root.querySelectorAll(CANDIDATE_SELECTOR)) {
      if (!isTargetNode(candidate)) {
        continue;
      }

      candidate.setAttribute(PROCESSED_ATTR, "true");
      if (hideTarget(candidate)) {
        hidden += 1;
      }
    }

    return hidden;
  }

  function isRightColumnVisible() {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  }

  function setRightColumnVisible(visible) {
    window.localStorage.setItem(STORAGE_KEY, visible ? "true" : "false");
    document.documentElement.setAttribute(RIGHT_COLUMN_HIDDEN_ATTR, visible ? "false" : "true");
    updateToggleButton();
  }

  function updateToggleButton() {
    const button = document.getElementById(TOGGLE_BUTTON_ID);
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const visible = isRightColumnVisible();
    button.textContent = visible ? "Hide right column" : "Show right column";
    button.setAttribute("aria-pressed", visible ? "true" : "false");
    button.title = visible ? "Hide the right column" : "Show the right column";
  }

  function ensureStyles() {
    if (document.getElementById("x-tweaks-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "x-tweaks-styles";
    style.textContent = `
      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] ${RIGHT_COLUMN_SELECTOR} {
        display: none !important;
      }

      html[${RIGHT_COLUMN_HIDDEN_ATTR}="true"] [${LAYOUT_ROOT_ATTR}="true"] {
        justify-content: center !important;
      }

      #${TOGGLE_BUTTON_ID} {
        position: fixed;
        top: 88px;
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

      @media (max-width: 1279px) {
        #${TOGGLE_BUTTON_ID} {
          top: auto;
          bottom: 16px;
          right: 16px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureLayoutRoot(sidebar) {
    if (!(sidebar instanceof HTMLElement)) {
      return;
    }

    const parent = sidebar.parentElement;
    if (!(parent instanceof HTMLElement)) {
      return;
    }

    const hasPrimaryColumn = Array.from(parent.children).some(
      (child) => child instanceof HTMLElement && child.getAttribute("data-testid") === "primaryColumn"
    );

    if (hasPrimaryColumn) {
      parent.setAttribute(LAYOUT_ROOT_ATTR, "true");
    }
  }

  function markLayoutRoots(root) {
    if (!(root instanceof HTMLElement)) {
      return;
    }

    if (root.matches(RIGHT_COLUMN_SELECTOR)) {
      ensureLayoutRoot(root);
    }

    for (const sidebar of root.querySelectorAll(RIGHT_COLUMN_SELECTOR)) {
      ensureLayoutRoot(sidebar);
    }
  }

  function ensureToggleButton() {
    let button = document.getElementById(TOGGLE_BUTTON_ID);
    if (button instanceof HTMLButtonElement) {
      updateToggleButton();
      return;
    }

    button = document.createElement("button");
    button.id = TOGGLE_BUTTON_ID;
    button.type = "button";
    button.addEventListener("click", () => {
      setRightColumnVisible(!isRightColumnVisible());
    });
    document.body.appendChild(button);
    updateToggleButton();
  }

  let hiddenCount = 0;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) {
          continue;
        }

        hiddenCount += processNode(node);
        markLayoutRoots(node);
      }
    }

    ensureToggleButton();
    window.__xTweaksState = {
      active: true,
      hiddenCount,
      rightColumnVisible: isRightColumnVisible()
    };
  });

  function start() {
    ensureStyles();
    setRightColumnVisible(isRightColumnVisible());
    ensureToggleButton();
    markLayoutRoots(document.body);
    hiddenCount += processNode(document.body);
    window.__xTweaksState = {
      active: true,
      hiddenCount,
      rightColumnVisible: isRightColumnVisible()
    };
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
