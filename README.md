# GitLab Tweaks

`GitLab Tweaks` is a Tampermonkey userscript that adds a few focused quality-of-life improvements to GitLab pages, especially issue-board workflows.

This repo is a cleaned-up, modernized version of an older personal userscript. The original Tampermonkey copy was partially recovered from local storage and refactored into a small source-based project so it is easier to maintain and share.

## Current tweaks

- Project dashboard shortcut:
  Clicking the groups/projects dropdown redirects to `/dashboard/projects?sort=name_asc` so project lists open in a predictable order.
- Board header link normalization:
  Board and issue-list title links are rewritten to a consistent issues URL so the header behaves like a useful navigation shortcut.
- Contextual sidebar auto-collapse:
  Right sidebars that consume horizontal space are collapsed automatically on matching GitLab pages.

## Install

1. Build the userscript:

```bash
npm run build
```

2. Import `dist/gitlab-tweaks.user.js` into Tampermonkey.

If you publish this repo on GitHub, users can also install directly from the raw `.user.js` URL.

## Development

Source lives in `src/gitlab-tweaks.js`.

Build output:

- `dist/gitlab-tweaks.user.js`

Build command:

```bash
npm run build
```

## Compatibility

The installable userscript uses broad URL matching and then runtime-detects whether the current page is GitLab. This keeps it usable on self-hosted GitLab instances without requiring users to edit metadata for every domain.

## Legacy note

The original script contained more ad hoc DOM logic tied to a specific GitLab deployment. Only the clearly recoverable and still-useful behaviors were preserved here. Additional tweaks can be reintroduced cleanly as small feature modules.
