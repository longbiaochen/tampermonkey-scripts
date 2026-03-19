# X Tweaks

Tampermonkey userscript for X/Twitter.

Current tweaks:

- Hide the right column by default and provide a toggle button to show or hide it.
- Hide the "Live on X" chip on post detail pages.

## Install

Import [`x-tweaks.user.js`](./x-tweaks.user.js) into Tampermonkey.

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
