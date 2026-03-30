# Tampermonkey Scripts

Maintain multiple Tampermonkey userscripts in one repository.

## Included Scripts

### `x-tweaks`

Tweaks for X/Twitter:

- Fold the left column to icons by default without hiding it.
- Keep the right column visible by default and provide a sidebar toggle button in X's floating dock.
- Hide the "Live on X" chip on post detail pages.

Install URL:

```text
https://raw.githubusercontent.com/longbiaochen/tampermonkey/main/dist/x-tweaks.user.js
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

To publish a Tampermonkey-visible update:

```bash
npm run release:patch
git add package.json package-lock.json tampermonkey.config.mjs src test scripts dist
git commit -m "Release Tampermonkey scripts"
git push origin main
```

To trigger the current `x-tweaks` update in your Chrome profile and verify that Tampermonkey picked it up:

```bash
npm run chrome:trigger-update
```

To inspect the currently installed `X Tweaks` version in your Chrome profile:

```bash
npm run chrome:check-installed
```

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
open /Users/longbiao/Projects/tampermonkey/debug/index.html
```
