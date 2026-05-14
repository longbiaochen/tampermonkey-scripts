const repository = {
  owner: "longbiaochen",
  name: "tampermonkey-scripts"
};

const scripts = [
  {
    id: "x-tweaks",
    name: "X Tweaks",
    versionSource: "package.json",
    entry: "src/scripts/x-tweaks/index.js",
    output: "dist/x-tweaks.user.js",
    homepagePath: "#x-tweaks",
    description:
      "Fold X's left column to a Chat-style icon rail with an expand button, keep the right column toggle, and remove the \"Live on X\" chip.",
    namespace: "http://tampermonkey.net/",
    author: "Longbiao CHEN",
    match: ["https://x.com/*", "https://twitter.com/*"],
    runAt: "document-idle",
    grant: ["none"]
  },
  {
    id: "gitlab-tweaks",
    name: "GitLab Tweaks",
    version: "1.8.1",
    entry: "src/scripts/gitlab-tweaks/index.js",
    output: "dist/gitlab-tweaks.user.js",
    homepagePath: "#gitlab-tweaks",
    description: "Quality-of-life tweaks for GitLab issue boards and project pages.",
    namespace: "http://tampermonkey.net/",
    author: "Longbiao CHEN",
    license: "GPL-3.0-only",
    match: ["*://*/*"],
    runAt: "document-idle",
    grant: ["none"],
    run: "createGitLabTweaks(window).start();"
  }
];

export { repository, scripts };
