import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { repository, scripts } from "../tampermonkey.config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const packageJsonPath = path.join(projectRoot, "package.json");

const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

function getVersion(script) {
  if (script.versionSource === "package.json") {
    return packageJson.version;
  }

  if (typeof script.version === "string" && script.version.length > 0) {
    return script.version;
  }

  throw new Error(`Missing version for script "${script.id}"`);
}

function formatMetadataLines(script, version) {
  const homepageUrl = `https://github.com/${repository.owner}/${repository.name}${script.homepagePath || ""}`;
  const rawUrl = `https://raw.githubusercontent.com/${repository.owner}/${repository.name}/main/${script.output}`;
  const lines = [
    ["name", script.name],
    ["namespace", script.namespace || "http://tampermonkey.net/"],
    ["version", version],
    ["description", script.description],
    ["author", script.author],
    ["homepageURL", homepageUrl],
    ["supportURL", `https://github.com/${repository.owner}/${repository.name}/issues`],
    ["updateURL", rawUrl],
    ["downloadURL", rawUrl]
  ];

  if (script.license) {
    lines.push(["license", script.license]);
  }

  for (const match of script.match || []) {
    lines.push(["match", match]);
  }

  if (script.runAt) {
    lines.push(["run-at", script.runAt]);
  }

  for (const grant of script.grant || ["none"]) {
    lines.push(["grant", grant]);
  }

  return lines.map(([key, value]) => `// @${key.padEnd(12, " ")} ${value}`).join("\n");
}

function sanitizeSource(source) {
  return source
    .replace(/^export\s+\{[^}]+\};?\n?/gm, "")
    .replace(/^export\s+async\s+function\s+/gm, "async function ")
    .replace(/^export\s+function\s+/gm, "function ")
    .replace(/^export\s+const\s+/gm, "const ");
}

for (const script of scripts) {
  const sourcePath = path.join(projectRoot, script.entry);
  const outputPath = path.join(projectRoot, script.output);
  const version = getVersion(script);
  const metadata = `// ==UserScript==
${formatMetadataLines(script, version)}
// ==/UserScript==`;
  const source = await readFile(sourcePath, "utf8");
  const sanitized = sanitizeSource(source);
  const output = `${metadata}

${sanitized}

${script.run || "runXTweaks(window);"}
`;

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output, "utf8");
  console.log(`Built ${path.relative(projectRoot, outputPath)}`);
}
