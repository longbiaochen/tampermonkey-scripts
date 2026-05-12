# Tampermonkey-Scripts Runbook

## Repo Scope

- Owner/escalation: Longbiao for managed userscript behavior and release/version proof.
- This repo owns source userscripts under `src/scripts/`, generated `dist/*.user.js` artifacts, metadata in `tampermonkey.config.mjs`, and release/update helpers.
- Built `dist/*.user.js` files are committed release artifacts and must stay in sync with source and metadata.

## Canonical Commands

- Install deps: `npm install`
- Build userscripts: `npm run build`
- Validate build/tests: `npm run validate`
- Patch release prep: `npm run release:patch`
- Publish/update `x-tweaks`: `npm run release:x-tweaks`
- Check installed version: `npm run chrome:check-installed`
- Trigger installed update: `npm run chrome:trigger-update`

## Routine Operations

| Trigger | Command | Expected Result | Failure Recovery |
| --- | --- | --- | --- |
| Change a userscript | `npm run validate` | Source tests pass and `dist/*.user.js` regenerates | Fix source/metadata/test together; do not edit `dist` alone |
| Add a script | Add source, metadata, tests, then `npm run validate` | New `dist/<script-id>.user.js` is generated with correct update URLs | Keep script id, test file, and metadata in sync before retrying |
| Publish `x-tweaks` update | `npm run release:x-tweaks` | Version bumps, validates, pushes, raw URL exposes new version, installed script proof succeeds | If browser/profile proof fails, use explicit `--profile` and `--chrome-root` flags; do not change source to fix profile state |

## Troubleshooting

| Trigger | Command | Expected Result | Failure Recovery |
| --- | --- | --- | --- |
| Tampermonkey does not update | `node scripts/check-installed-version.mjs --profile Default` | Installed version is visible in extension storage | Ensure `@version` increased and Chrome MV3 `Allow User Scripts` is enabled |
| Verify installed userscript state | `node scripts/check-installed-version.mjs --profile Default` | Helper checks installed script metadata in the target browser profile | Use the official `Chrome` plugin workflow to open the target profile when user-logged state is required |

## Verification

- `npm run validate` is the minimum source/build gate.
- For release/update tasks, prove both the raw GitHub userscript version and installed Tampermonkey version.
- Browser verification should use official in-app browser for unauthenticated debug harness pages; use the official `Chrome` plugin only when verifying real installed userscript state.

## Release/Deploy

- Install URLs point at raw GitHub files in `dist/`.
- Tampermonkey updates only when `@version` increases.
- `npm run release:x-tweaks` is the full publish/update/proof path for `x-tweaks`.

## Guardrails

- Do not use the user's real browser profile unless the task explicitly targets the installed userscript state.
- Keep generated metadata URLs, package version, and committed `dist` artifacts aligned.

## Known State

- Managed scripts include `x-tweaks` and `gitlab-tweaks`.
- The shared version source is `package.json`.

## Browser Automation Constraint
- 交互类浏览器操作默认仅允许官方 `Chrome` 插件和 In-app Browser（`browser-use` / IAB）作为主通道。
  - 涉及签名登录态、Cookies、扩展、既有 Chrome 标签页、鉴权流程、可复用会话：使用官方 `Chrome` 插件。
  - 视觉验证、内部调试、未登录本地/公开页面、仅做渲染检查：使用 In-app Browser。
- 禁止将 `Playwright`、`Chromium`、`Chrome for Testing`、`chrome-use`（含 `chrome-auth`、`chrome-inspect`）作为 Codex 的浏览器交互/验收路径。
- 若官方入口不可用或不可达，必须先报告阻塞并等待，不得改用旧工具兜底。

