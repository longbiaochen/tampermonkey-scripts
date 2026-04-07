# Tampermonkey Scripts

Maintain multiple Tampermonkey userscripts in the `tampermonkey-scripts` repository.

## Included Scripts

### `x-tweaks`

Tweaks for X/Twitter:

- Fold the left column to icons by default, keep a left-edge toggle, and remember the user's choice.
- Hide the right column by default and provide a sidebar toggle button in X's floating dock.
- Hide the "Live on X" chip on post detail pages.

Install URL:

```text
https://raw.githubusercontent.com/longbiaochen/tampermonkey-scripts/main/dist/x-tweaks.user.js
```

### `gitlab-tweaks`

Tweaks for GitLab:

- Redirect the projects dropdown to `/dashboard/projects?sort=name_asc`.
- Rewrite board and issue header links to stable `/-/issues?key=1` URLs.
- Collapse contextual right sidebars that waste horizontal space.

Install URL:

```text
https://raw.githubusercontent.com/longbiaochen/tampermonkey-scripts/main/dist/gitlab-tweaks.user.js
```

## Repository Layout

```text
src/scripts/<script-id>/index.js   Source for each userscript
dist/<script-id>.user.js           Built Tampermonkey artifact committed to git
test/<script-id>.test.mjs          Script-specific validation
tampermonkey.config.mjs            Manifest for metadata, URLs, and build targets
```

## Add Another Script

1. Add a new source entry under `src/scripts/<script-id>/index.js`.
2. Add its metadata to `tampermonkey.config.mjs`.
3. Add validation in `test/<script-id>.test.mjs` and wire it into `scripts/validate.mjs`.
4. Run `npm run validate` so `dist/*.user.js` is regenerated before committing.

## Automatic Updates

Install scripts from the raw GitHub URLs in `dist/`, not from local files.

Tampermonkey uses the embedded `@updateURL`, `@downloadURL`, and `@version` metadata. When `main` changes and the matching `dist/*.user.js` file is rebuilt and pushed, Tampermonkey can pick up the new version automatically if update checks are enabled.

Important: Tampermonkey only updates when `@version` increases. This repo currently uses `package.json` as the shared version source for the managed scripts.

To publish `x-tweaks`, push to GitHub, and trigger a Tampermonkey update in the real Chrome `Default` profile:

```bash
npm run release:x-tweaks
```

This command will:

1. bump the patch version in `package.json`
2. run `npm run validate`
3. create a release commit
4. push `main`
5. wait for the GitHub raw userscript to expose the new `@version`
6. open the raw userscript in Chrome `Default` so Tampermonkey can install it
7. verify the installed version from Tampermonkey storage

If you only want to prepare a Tampermonkey-visible update without pushing:

```bash
npm run release:patch
```

To trigger the current `x-tweaks` update in a specific Chrome profile and verify that Tampermonkey picked it up:

```bash
node scripts/trigger-chrome-update.mjs --profile Default --wait-version 0.3.6
```

To inspect the currently installed `X Tweaks` version in a specific Chrome profile:

```bash
node scripts/check-installed-version.mjs --profile Default
```

The `npm run chrome:check-installed` shortcut still defaults to `Default`.

## Development

Install dependencies:

```bash
npm install
```

Build all userscripts:

```bash
npm run build
```

Run validation:

```bash
npm run validate
```

Open the local debug harness:

```bash
open /Users/longbiao/Projects/tampermonkey-scripts/debug/index.html
```
