import { readFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { repository, scripts } from "../tampermonkey.config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const defaultChromeRoot = path.join(os.homedir(), "Library/Application Support/Google/Chrome");
const defaultChromeBinary =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
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

function getChromeRoot(options = {}) {
  const candidate =
    options.chromeRoot ||
    process.env.TAMPERMONKEY_CHROME_ROOT ||
    defaultChromeRoot;
  return path.resolve(String(candidate));
}

function compareVersion(a, b) {
  const aParts = String(a).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const bParts = String(b).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(aParts.length, bParts.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (aParts[index] || 0) - (bParts[index] || 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

function findChromeUseManagedBinary() {
  const installRoot = path.join(os.homedir(), ".chrome-use", "browsers", "chrome-for-testing");
  if (!existsSync(installRoot)) {
    return null;
  }

  const versions = readdirSync(installRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(compareVersion)
    .reverse();

  for (const version of versions) {
    const versionRoot = path.join(installRoot, version);
    const platforms = readdirSync(versionRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    for (const platform of platforms) {
      const candidate = path.join(
        versionRoot,
        platform,
        "chrome-mac-arm64",
        "Google Chrome for Testing.app",
        "Contents",
        "MacOS",
        "Google Chrome for Testing"
      );
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

function getChromeBinary(options = {}) {
  if (options.chromeBinary || process.env.TAMPERMONKEY_CHROME_BINARY) {
    return String(options.chromeBinary || process.env.TAMPERMONKEY_CHROME_BINARY);
  }

  const chromeRoot = getChromeRoot(options);
  if (chromeRoot.includes(`${path.sep}.chrome-use${path.sep}browser-data${path.sep}`)) {
    const managedBinary = findChromeUseManagedBinary();
    if (managedBinary) {
      return managedBinary;
    }
  }

  return String(
    defaultChromeBinary
  );
}

function getChromeProfileDir(profile = "Default", options = {}) {
  return path.join(getChromeRoot(options), profile);
}

function getTampermonkeyStorageDir(profile = "Default", options = {}) {
  return path.join(
    getChromeProfileDir(profile, options),
    "Local Extension Settings",
    tampermonkeyExtensionId
  );
}

function listTampermonkeyStorageFiles(profile = "Default", options = {}) {
  const storageDir = getTampermonkeyStorageDir(profile, options);
  if (!existsSync(storageDir)) {
    return [];
  }

  return readdirSync(storageDir)
    .filter((name) => /\.(log|ldb)$/.test(name))
    .map((name) => path.join(storageDir, name));
}

export {
  defaultChromeBinary,
  defaultChromeRoot,
  getChromeBinary,
  getChromeRoot,
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
