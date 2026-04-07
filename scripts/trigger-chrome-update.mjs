import { execFileSync, spawn } from "node:child_process";
import path from "node:path";

import {
  getChromeProfileDir,
  getPackageVersion,
  getRawUrl,
  getTargetScript,
  parseArgs,
  projectRoot
} from "./tampermonkey-utils.mjs";

const chromeBinary =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getInstalledVersion(profile, scriptId) {
  try {
    return execFileSync(
      "node",
      [
        path.join(projectRoot, "scripts/check-installed-version.mjs"),
        "--profile",
        profile,
        "--script",
        scriptId
      ],
      {
        encoding: "utf8"
      }
    ).trim();
  } catch {
    return null;
  }
}

async function waitForRemoteVersion(rawUrl, expectedVersion, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const versionLine = `// @version      ${expectedVersion}`;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(rawUrl, {
        headers: {
          "cache-control": "no-cache"
        }
      });
      if (response.ok) {
        const body = await response.text();
        if (body.includes(versionLine)) {
          return true;
        }
      }
    } catch {}

    await sleep(2000);
  }

  return false;
}

function openRawUrlInChromeProfile(rawUrl, profile) {
  const chromeRoot = path.dirname(getChromeProfileDir(profile));
  const child = spawn(
    chromeBinary,
    [
      `--user-data-dir=${chromeRoot}`,
      `--profile-directory=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      rawUrl
    ],
    {
      detached: true,
      stdio: "ignore"
    }
  );
  child.unref();
}

const args = parseArgs(process.argv.slice(2));
const profile = String(args.profile || "Default");
const scriptId = String(args.script || "x-tweaks");
const targetScript = getTargetScript(scriptId);
const rawUrl = getRawUrl(targetScript);
const expectedVersion = String(args["wait-version"] || (await getPackageVersion()));
const remoteTimeoutMs = Number(args["remote-timeout-ms"] || 120000);
const installTimeoutMs = Number(args["install-timeout-ms"] || 30000);

const beforeVersion = getInstalledVersion(profile, scriptId);
console.log(`Installed before trigger (${profile}): ${beforeVersion || "not found"}`);
console.log(`Expected target version: ${expectedVersion}`);
console.log(`Raw URL: ${rawUrl}`);

const remoteReady = await waitForRemoteVersion(rawUrl, expectedVersion, remoteTimeoutMs);
if (!remoteReady) {
  console.error(
    `Timed out waiting for remote userscript to expose version ${expectedVersion} at ${rawUrl}.`
  );
  process.exit(1);
}

openRawUrlInChromeProfile(rawUrl, profile);

const deadline = Date.now() + installTimeoutMs;
let installedVersion = beforeVersion;

while (Date.now() < deadline) {
  await sleep(1000);
  installedVersion = getInstalledVersion(profile, scriptId);
  if (installedVersion === expectedVersion) {
    console.log(`Installed after trigger (${profile}): ${installedVersion}`);
    process.exit(0);
  }
}

openRawUrlInChromeProfile(rawUrl, profile);
console.error(
  `Timed out waiting for Tampermonkey to install ${expectedVersion} in profile "${profile}". Current installed version: ${
    installedVersion || "not found"
  }. Complete the install manually in the opened Chrome tab.`
);
process.exit(1);
