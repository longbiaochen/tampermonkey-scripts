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

execFileSync("open", ["-a", "/Applications/Google Chrome.app", rawUrl], {
  stdio: ["ignore", "ignore", "ignore"]
});

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
