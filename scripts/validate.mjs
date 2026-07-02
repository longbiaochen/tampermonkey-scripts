import { runXTweaksTests } from "../test/x-tweaks.test.mjs";
import { runXReaderTests } from "../test/x-reader.test.mjs";
import { runGitLabTweaksTests } from "../test/gitlab-tweaks.test.mjs";

await runXTweaksTests();
await runXReaderTests();
await runGitLabTweaksTests();

console.log("Validation completed.");
