import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  getPackageVersion,
  parseArgs,
  projectRoot
} from "./tampermonkey-utils.mjs";

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options
  }).trim();
}

function runStreaming(command, args) {
  execFileSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit"
  });
}

function getChangedFiles() {
  const output = run("git", ["status", "--short"]);
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3));
}

function assertRepoCleanEnough(initialFiles, currentFiles) {
  const allowedReleaseFiles = new Set(["package.json", "package-lock.json", "dist/x-tweaks.user.js"]);
  const initialSet = new Set(initialFiles);
  const unexpected = currentFiles.filter(
    (file) => !initialSet.has(file) && !allowedReleaseFiles.has(file)
  );

  if (unexpected.length > 0) {
    throw new Error(
      `Release introduced unexpected modified files: ${unexpected.join(", ")}`
    );
  }
}

const args = parseArgs(process.argv.slice(2));
const profile = String(args.profile || "Default");
const skipPush = Boolean(args["skip-push"]);

const initialFiles = getChangedFiles();
const previousVersion = await getPackageVersion();

runStreaming("npm", ["version", "patch", "--no-git-tag-version"]);
const nextVersion = await getPackageVersion();
console.log(`Version bumped: ${previousVersion} -> ${nextVersion}`);

runStreaming("npm", ["run", "validate"]);

const changedFiles = getChangedFiles();
assertRepoCleanEnough(initialFiles, changedFiles);

runStreaming("git", ["add", "-A"]);
runStreaming("git", ["commit", "-m", `Release x-tweaks ${nextVersion}`]);

if (!skipPush) {
  runStreaming("git", ["push", "origin", "main"]);
}

runStreaming("node", [
  path.join(projectRoot, "scripts/trigger-chrome-update.mjs"),
  "--profile",
  profile,
  "--wait-version",
  nextVersion
]);
