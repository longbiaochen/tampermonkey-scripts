import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(projectRoot, "src", "x-tweaks.js");
const outputPath = path.join(projectRoot, "x-tweaks.user.js");
const packageJsonPath = path.join(projectRoot, "package.json");

const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const version = packageJson.version;

const metadata = `// ==UserScript==
// @name         X Tweaks
// @namespace    http://tampermonkey.net/
// @version      ${version}
// @description  Hide the right column by default and remove the "Live on X" chip on post detail pages.
// @author       Longbiao CHEN
// @homepageURL  https://github.com/longbiaochen/x-tweaks
// @supportURL   https://github.com/longbiaochen/x-tweaks/issues
// @updateURL    https://raw.githubusercontent.com/longbiaochen/x-tweaks/main/x-tweaks.user.js
// @downloadURL  https://raw.githubusercontent.com/longbiaochen/x-tweaks/main/x-tweaks.user.js
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
`;

const source = await readFile(sourcePath, "utf8");
const sanitized = source
  .replace(/^export\s+\{[^}]+\};?\n?/gm, "")
  .replace(/^export\s+function\s+/gm, "function ")
  .replace(/^export\s+const\s+/gm, "const ");

const output = `${metadata}
${sanitized}

runXTweaks(window);
`;

await mkdir(projectRoot, { recursive: true });
await writeFile(outputPath, output, "utf8");
console.log(`Built ${path.relative(projectRoot, outputPath)}`);
