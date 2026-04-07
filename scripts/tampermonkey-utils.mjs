import { readFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { repository, scripts } from "../tampermonkey.config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const chromeRoot = path.join(os.homedir(), "Library/Application Support/Google/Chrome");
const tampermonkeyExtensionId = "dhdgffkkebhmkfjojejmpbldmpobfkfo";

function parseArgs(argv) {
  const args = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }

    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const nextToken = argv[index + 1];
    if (inlineValue !== undefined) {
      args[rawKey] = inlineValue;
      continue;
    }

    if (nextToken && !nextToken.startsWith("--")) {
      args[rawKey] = nextToken;
      index += 1;
      continue;
    }

    args[rawKey] = true;
  }

  return args;
}

function getTargetScript(scriptId = "x-tweaks") {
  const targetScript = scripts.find((script) => script.id === scriptId);
  if (!targetScript) {
    throw new Error(`Script "${scriptId}" is not configured.`);
  }
  return targetScript;
}

async function getPackageVersion() {
  const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
  return packageJson.version;
}

function getRawUrl(script) {
  return `https://raw.githubusercontent.com/${repository.owner}/${repository.name}/main/${script.output}`;
}

function getChromeProfileDir(profile = "Default") {
  return path.join(chromeRoot, profile);
}

function getTampermonkeyStorageDir(profile = "Default") {
  return path.join(
    getChromeProfileDir(profile),
    "Local Extension Settings",
    tampermonkeyExtensionId
  );
}

function listTampermonkeyStorageFiles(profile = "Default") {
  const storageDir = getTampermonkeyStorageDir(profile);
  if (!existsSync(storageDir)) {
    return [];
  }

  return readdirSync(storageDir)
    .filter((name) => /\.(log|ldb)$/.test(name))
    .map((name) => path.join(storageDir, name));
}

export {
  chromeRoot,
  getChromeProfileDir,
  getPackageVersion,
  getRawUrl,
  getTampermonkeyStorageDir,
  getTargetScript,
  listTampermonkeyStorageFiles,
  parseArgs,
  projectRoot,
  tampermonkeyExtensionId
};
