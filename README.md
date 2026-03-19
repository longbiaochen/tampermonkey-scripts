# X Tweaks

Tampermonkey userscript for X/Twitter.

Current tweaks:

- Hide the right column by default and provide a toggle button to show or hide it.
- Hide the "Live on X" chip on post detail pages.

## Install

Import [`x-tweaks.user.js`](./x-tweaks.user.js) into Tampermonkey.

Recommended install URL:

```text
https://raw.githubusercontent.com/longbiaochen/x-tweaks/main/x-tweaks.user.js
```

## Automatic Updates

Closed-loop update path:

1. Install the script from the raw GitHub URL above, not from a local file.
2. Tampermonkey reads the embedded `@updateURL` and `@downloadURL` metadata.
3. When `main` changes and `x-tweaks.user.js` is rebuilt and pushed, Tampermonkey checks that URL for a newer `@version`.
4. If Tampermonkey's automatic update check and automatic installation settings are enabled, Chrome will pick up the new version without manual re-import.

This repo is already set up to use the raw GitHub URL as the canonical install and update source.

## Development

Install dependencies:

```bash
npm install
```

Build the userscript:

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

Source lives in `src/x-tweaks.js`. The generated Tampermonkey file is `x-tweaks.user.js`.
