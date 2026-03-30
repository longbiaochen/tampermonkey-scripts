import { existsSync } from "node:fs";
import { readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

import { scripts } from "../tampermonkey.config.mjs";

const targetScript = scripts.find((script) => script.id === "x-tweaks");
if (!targetScript) {
  console.error('Script "x-tweaks" is not configured.');
  process.exit(1);
}

const storageDir = path.join(
  os.homedir(),
  "Library/Application Support/Google/Chrome/Default/Local Extension Settings/dhdgffkkebhmkfjojejmpbldmpobfkfo"
);

if (!existsSync(storageDir)) {
  console.error("Tampermonkey Chrome profile storage not found.");
  process.exit(1);
}

const files = readdirSync(storageDir)
  .filter((name) => /\.(log|ldb)$/.test(name))
  .map((name) => path.join(storageDir, name));

if (files.length === 0) {
  console.error("No Tampermonkey storage files found.");
  process.exit(1);
}

const stringsOutput = execFileSync("strings", files, {
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024
});

const versions = [];
const pattern = new RegExp(`"name":"${targetScript.name}".*?"version":"([^"]+)"`, "g");
let match = pattern.exec(stringsOutput);
while (match) {
  versions.push(match[1]);
  match = pattern.exec(stringsOutput);
}

if (versions.length === 0) {
  console.error(`${targetScript.name} is not currently installed in this Chrome profile.`);
  process.exit(2);
}

const latest = versions.at(-1);
console.log(latest);
