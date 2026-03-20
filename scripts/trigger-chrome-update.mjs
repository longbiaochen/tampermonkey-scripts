import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
const expectedVersion = packageJson.version;
const rawUrl = "https://raw.githubusercontent.com/longbiaochen/x-tweaks/main/x-tweaks.user.js";

function getInstalledVersion() {
  try {
    return execFileSync("node", [path.join(projectRoot, "scripts/check-installed-version.mjs")], {
      encoding: "utf8"
    }).trim();
  } catch {
    return null;
  }
}

const beforeVersion = getInstalledVersion();
console.log(`Installed before trigger: ${beforeVersion || "not found"}`);
console.log(`Expected target version: ${expectedVersion}`);

const appleScript = `
tell application "Google Chrome"
  activate
  if (count of windows) = 0 then
    make new window
  end if
  tell front window
    make new tab with properties {URL:"${rawUrl}"}
    set active tab index to (count of tabs)
  end tell
end tell
`;

execFileSync("osascript", ["-e", appleScript], { stdio: "ignore" });

const deadline = Date.now() + 30000;
let installedVersion = beforeVersion;

while (Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  installedVersion = getInstalledVersion();
  if (installedVersion === expectedVersion) {
    console.log(`Installed after trigger: ${installedVersion}`);
    process.exit(0);
  }
}

console.error(
  `Timed out waiting for Tampermonkey to install ${expectedVersion}. Current installed version: ${
    installedVersion || "not found"
  }`
);
process.exit(1);
