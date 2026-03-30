export function createGitLabTweaks(win, options = {}) {
  const doc = win.document;
  const PROJECT_DASHBOARD_PATH = "/dashboard/projects?sort=name_asc";
  const pendingRoots = new Set();
  let flushScheduled = false;
  let observer = null;
  const navigate =
    typeof options.navigate === "function" ? options.navigate : (url) => win.location.assign(url);

  function isElement(value) {
    return value instanceof win.HTMLElement;
  }

  function isGitLabPage() {
    const appName = doc.querySelector('meta[name="application-name"]');
    if (appName?.getAttribute("content") === "GitLab") {
      return true;
    }

    return Boolean(
      doc.querySelector('meta[content*="GitLab"]') ||
        doc.querySelector(".nav-sidebar, .boards-app, .issue-boards-content, .gl-layout")
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
    return new URL(pathname, win.location.origin).toString();
  }

  function bindProjectsShortcut() {
    const dropdown = doc.querySelector("#nav-groups-dropdown");
    if (!isElement(dropdown) || !once(dropdown, "projects-shortcut")) {
      return;
    }

    dropdown.addEventListener("click", (event) => {
      event.preventDefault();
      navigate(absolutize(PROJECT_DASHBOARD_PATH));
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

    const url = new URL(href, win.location.origin);
    if (!url.pathname.includes("/-/issues")) {
      const basePath = url.pathname.replace(/\/+$/, "");
      url.pathname = `${basePath}/-/issues`;
    }

    if (!url.searchParams.has("key")) {
      url.searchParams.set("key", "1");
    }

    anchor.setAttribute("href", `${url.pathname}${url.search}${url.hash}`);
  }

  function rewriteHeaderLinks(root = doc) {
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
      const element = doc.querySelector(selector);
      if (!isElement(element)) {
        continue;
      }

      if (element.classList.contains("right-sidebar-expanded")) {
        element.classList.remove("right-sidebar-expanded");
        element.classList.add("right-sidebar-collapsed");
      }

      const toggle = doc.querySelector(
        '[aria-label*="Collapse sidebar"], [data-testid="collapse-sidebar"], .right-sidebar-toggle'
      );
      if (isElement(toggle) && once(toggle, "sidebar-toggle-clicked")) {
        toggle.click();
      }
      return;
    }
  }

  function applyTweaks(root = doc) {
    bindProjectsShortcut();
    rewriteHeaderLinks(root);
    collapseSidebar();
  }

  function flushTweaks() {
    flushScheduled = false;

    if (pendingRoots.size === 0) {
      applyTweaks(doc);
      return;
    }

    for (const root of pendingRoots) {
      applyTweaks(root);
    }
    pendingRoots.clear();
  }

  function scheduleTweaks(root = doc) {
    pendingRoots.add(root);
    if (flushScheduled) {
      return;
    }

    flushScheduled = true;
    win.requestAnimationFrame(flushTweaks);
  }

  function start() {
    if (!isGitLabPage()) {
      return false;
    }

    scheduleTweaks(doc);

    observer = new win.MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof win.HTMLElement) {
            scheduleTweaks(node);
          }
        }
      }
    });

    observer.observe(doc.documentElement, {
      childList: true,
      subtree: true
    });

    return true;
  }

  function stop() {
    observer?.disconnect();
    observer = null;
    pendingRoots.clear();
    flushScheduled = false;
  }

  return {
    start,
    stop
  };
}
