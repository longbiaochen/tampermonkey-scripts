# GitLab Tweaks

`GitLab Tweaks` is a small Tampermonkey userscript for GitLab issue boards and project pages.

It is a cleaned-up rewrite of an older personal userscript recovered from Tampermonkey storage and rebuilt as a maintainable source project.

## Features

- Redirect the projects dropdown to `/dashboard/projects?sort=name_asc`.
- Rewrite board and issue header links to stable `/-/issues?key=1` URLs.
- Collapse contextual right sidebars that waste horizontal space.

## Install

Install the latest build directly from GitHub raw:

[gitlab-tweaks.user.js](https://raw.githubusercontent.com/longbiaochen/gitlab-tweaks/main/dist/gitlab-tweaks.user.js)

Or build it locally:

```bash
npm install
npm run build
```

Then import `dist/gitlab-tweaks.user.js` into Tampermonkey.

## Development

Source: `src/gitlab-tweaks.js`

Build:

```bash
npm run build
```

The metadata intentionally uses broad URL matching and then runtime-detects GitLab, so the script works on self-hosted instances without per-domain edits.

## Notes

The original script had deployment-specific DOM hacks and a jQuery dependency. This repo keeps only the recoverable behavior that still makes sense and implements it in plain DOM code with batched mutation handling.
