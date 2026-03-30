const repository = {
  owner: "longbiaochen",
  name: "tampermonkey"
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
      "Fold the left column to icons, toggle the right column from X's floating dock, and remove the \"Live on X\" chip on post detail pages.",
    namespace: "http://tampermonkey.net/",
    author: "Longbiao CHEN",
    match: ["https://x.com/*", "https://twitter.com/*"],
    runAt: "document-idle",
    grant: ["none"]
  }
];

export { repository, scripts };
