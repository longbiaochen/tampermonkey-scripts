import { execFileSync } from "node:child_process";

import {
  getTargetScript,
  getTampermonkeyStorageDir,
  listTampermonkeyStorageFiles,
  parseArgs
} from "./tampermonkey-utils.mjs";

const args = parseArgs(process.argv.slice(2));
const profile = String(args.profile || "Default");
const scriptId = String(args.script || "x-tweaks");

let targetScript;
try {
  targetScript = getTargetScript(scriptId);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const storageFiles = listTampermonkeyStorageFiles(profile);
if (storageFiles.length === 0) {
  console.error(
    `Tampermonkey storage not found for Chrome profile "${profile}" at ${getTampermonkeyStorageDir(
      profile
    )}.`
  );
  process.exit(1);
}

const stringsOutput = execFileSync("strings", storageFiles, {
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
  console.error(`${targetScript.name} is not currently installed in Chrome profile "${profile}".`);
  process.exit(2);
}

console.log(versions.at(-1));
