// ==UserScript==
// @name         GitLab Tweaks
// @namespace    http://tampermonkey.net/
// @version      1.8.1
// @description  Quality-of-life tweaks for GitLab issue boards and project pages.
// @author       Longbiao CHEN
// @license      GPL-3.0-only
// @match        *://*/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const PROJECT_DASHBOARD_PATH = "/dashboard/projects?sort=name_asc";
  const pendingRoots = new Set();
  let flushScheduled = false;

  function isElement(value) {
    return value instanceof HTMLElement;
  }

  function isGitLabPage() {
    const appName = document.querySelector('meta[name="application-name"]');
    if (appName?.getAttribute("content") === "GitLab") {
      return true;
    }

    return Boolean(
      document.querySelector('meta[content*="GitLab"]') ||
        document.querySelector(".nav-sidebar, .boards-app, .issue-boards-content, .gl-layout")
    );
  }

  function once(element, key) {
    if (!isElement(element)) {
      return false;
    }

    const attr = `data-gitlab-tweaks-${key}`;
    if (element.getAttribute(attr) === "true") {
      return false;
    }

    element.setAttribute(attr, "true");
    return true;
  }

  function absolutize(pathname) {
    return new URL(pathname, window.location.origin).toString();
  }

  function bindProjectsShortcut() {
    const dropdown = document.querySelector("#nav-groups-dropdown");
    if (!isElement(dropdown) || !once(dropdown, "projects-shortcut")) {
      return;
    }

    dropdown.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.assign(absolutize(PROJECT_DASHBOARD_PATH));
    });
  }

  function normalizeIssuesLink(anchor) {
    if (!isElement(anchor) || !once(anchor, "issues-link")) {
      return;
    }

    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#")) {
      return;
    }

    const url = new URL(href, window.location.origin);
    if (!url.pathname.includes("/-/issues")) {
      const basePath = url.pathname.replace(/\/+$/, "");
      url.pathname = `${basePath}/-/issues`;
    }

    if (!url.searchParams.has("key")) {
      url.searchParams.set("key", "1");
    }

    anchor.setAttribute("href", `${url.pathname}${url.search}${url.hash}`);
  }

  function rewriteHeaderLinks(root = document) {
    const selectors = [
      "div.gl-display-flex.align-items-center.flex-wrap > h2 > a",
      ".boards-list-header a",
      ".issue-boards-content h2 a"
    ];

    for (const selector of selectors) {
      for (const anchor of root.querySelectorAll(selector)) {
        normalizeIssuesLink(anchor);
      }
    }
  }

  function collapseSidebar() {
    const candidates = [
      ".layout-page.with-contextual-sidebar.right-sidebar-expanded",
      ".js-page-content.has-right-sidebar",
      ".page-with-right-sidebar"
    ];

    for (const selector of candidates) {
      const element = document.querySelector(selector);
      if (!isElement(element)) {
        continue;
      }

      if (element.classList.contains("right-sidebar-expanded")) {
        element.classList.remove("right-sidebar-expanded");
        element.classList.add("right-sidebar-collapsed");
      }

      const toggle = document.querySelector(
        '[aria-label*="Collapse sidebar"], [data-testid="collapse-sidebar"], .right-sidebar-toggle'
      );
      if (isElement(toggle) && once(toggle, "sidebar-toggle-clicked")) {
        toggle.click();
      }
      return;
    }
  }

  function applyTweaks(root = document) {
    bindProjectsShortcut();
    rewriteHeaderLinks(root);
    collapseSidebar();
  }

  function flushTweaks() {
    flushScheduled = false;

    if (pendingRoots.size === 0) {
      applyTweaks(document);
      return;
    }

    for (const root of pendingRoots) {
      applyTweaks(root);
    }
    pendingRoots.clear();
  }

  function scheduleTweaks(root = document) {
    pendingRoots.add(root);
    if (flushScheduled) {
      return;
    }

    flushScheduled = true;
    window.requestAnimationFrame(flushTweaks);
  }

  function start() {
    if (!isGitLabPage()) {
      return;
    }

    scheduleTweaks(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            scheduleTweaks(node);
          }
        }
      }
    });

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
