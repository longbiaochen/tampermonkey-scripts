import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const srcPath = resolve(root, "src/gitlab-tweaks.js");
const outPath = resolve(root, "dist/gitlab-tweaks.user.js");

const banner = `// ==UserScript==
// @name         GitLab Tweaks
// @namespace    http://tampermonkey.net/
// @version      1.8.0
// @description  Quality-of-life tweaks for GitLab issue boards and project pages.
// @author       Longbiao CHEN
// @license      GPL-3.0-only
// @match        *://*/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

`;

const source = await readFile(srcPath, "utf8");
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${banner}${source}`, "utf8");
console.log(`Built ${outPath}`);
