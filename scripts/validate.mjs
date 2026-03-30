import { runXTweaksTests } from "../test/x-tweaks.test.mjs";
import { runGitLabTweaksTests } from "../test/gitlab-tweaks.test.mjs";

await runXTweaksTests();
await runGitLabTweaksTests();

console.log("Validation completed.");
