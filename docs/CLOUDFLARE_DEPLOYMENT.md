# Cloudflare Pages deployment preparation

This repository is a React 19 + TypeScript application built with Vite 6 from a pnpm/npm-style npm-workspaces monorepo. The web game uses the shared TypeScript game engine and runs local games, AI decisions, animation, replay, saves, and disputed-move export in the browser. Local saves use browser storage; these features do not require a persistent backend.

The Wi-Fi/LAN mode is separate. It connects to a user-provided LAN host and is not an internet multiplayer service. Online multiplayer is not included.

## Licensing-limited public preview

The full production build currently embeds `packages/agents/models/active-model.json` into the JavaScript bundle. The model rights and redistribution/modification grant remain unconfirmed (B-03 in the licensing audit on `feature/gplv3-license`). The APK and Android artwork notice/delivery review also remains open (B-04/R-01). Do not publish the ordinary `npm run build` output.

The reviewable preview uses `npm run build:public-preview`. In `cloudflare-preview` mode, Vite aliases out the model-bearing agent module and neural selector. Its output excludes neural weights, disables that controller in the interface, and shows a visible notice explaining the limitation. Human, random, greedy, tactical, game rules, corner priority, and move animation remain available. The browser build does not include the Android robot artwork, splash images, or launcher icon. The web runtime notice file is copied to the output root and linked from the preview notice.

The configured Vite build target is modern Chrome 87+, Edge 88+, Firefox 78+, and Safari 14+. Before a public launch, repeat desktop and mobile viewport checks on current browser versions.

This is a constrained review build, not clearance for the full project or an announcement that the project has adopted GPL. It does not change model weights or their source files. Full public release remains blocked until the owner resolves B-03 and the applicable B-04 delivery/attribution questions.

## Cloudflare Pages settings

| Setting | Value |
|---|---|
| Framework preset | None / Vite |
| Repository root | `/` (repository root) |
| Build command | `npm run build:public-preview` |
| Build output directory | `apps/web/dist` |
| Node.js | `22.16.0`, pinned by root `.node-version` |
| Environment variables | None required |
| Production branch | `main` after the deployment PR is reviewed and merged; until then use the PR branch's preview deployment |

Cloudflare's current Pages build image accepts `.node-version` and `NODE_VERSION` for selecting Node. Its Vite guidance uses the npm build command and the generated `dist` directory; this repository's configured Vite root places that directory under `apps/web`. See [Cloudflare Pages build image](https://developers.cloudflare.com/pages/configuration/build-image/) and [build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/).

## Build locally

```sh
npm ci
npm run build:public-preview
```

The build runs TypeScript checking before Vite. Inspect `apps/web/dist` before deployment. It should contain the app entry, hashed JS/CSS assets, and `THIRD_PARTY_NOTICES.txt`. It should not contain model files, APKs, training data, simulation artifacts, credentials, or Android artwork.

## Cloudflare setup and verification

1. In Cloudflare Dashboard, create a Pages project by importing `mistermetes-cloud/ShashBesh`.
2. Set the repository root to `/`, set the build command and output path shown above, and set the production branch to `main`.
3. Save the project without starting a production deployment until the licensing blockers are resolved. PR branches may be used for review preview deployments if the Pages project is configured to build them.
4. For an authorized preview deployment, verify the root page loads over HTTPS, start a local game, play human versus tactical AI, observe AI vs AI, confirm corner-jump priority and animation, and download a disputed-move report. Open `/THIRD_PARTY_NOTICES.txt` directly.
5. In browser developer tools, confirm no failed module/network requests. Confirm the preview banner is visible and the neural strategy is absent. Search downloaded assets for the active model hash and check that no model JSON or Android artwork is present.
6. Test from a private/incognito browser with no local Vite server or LAN host running. Normal gameplay must continue to work; Wi-Fi/LAN mode is expected to require a separately running LAN host.

Cloudflare Pages serves the build directory at the site root. No base path is configured, so the production entry is `/` and the notice route is `/THIRD_PARTY_NOTICES.txt`.

## Local verification completed

- `npm run build:public-preview` passed TypeScript checking and the Vite production build.
- Its post-build verifier (`scripts/verify-public-preview.mjs`) passed: required root/notices and exact runtime license texts are present; the active-model fingerprint and private artifact file types are absent.
- The generated bundle was searched for a 12-weight fingerprint from the active model file; it was absent. The disabled-agent message and preview banner were present. The output contains only `index.html`, hashed JS/CSS, and `THIRD_PARTY_NOTICES.txt`.
- The production preview server returned HTTP 200 for `/` and `/THIRD_PARTY_NOTICES.txt`.
- Firefox opened the static build, confirmed the preview notice, launched a local game and found the board visible. The neural strategy was absent. Only the page, JS, and CSS were requested; no `/api/*` or `/ws` request occurred.
- `npm test` passed all 84 tests after the preview alias was added. The six animation/Disputed Move Firefox smoke tests passed on the same gameplay commit; the separate static-preview Firefox smoke test also passed after the alias change.

## Rollback

Disable or roll back the Pages deployment from the Cloudflare Pages deployment history to the last reviewed deployment. If a later approved source change caused the regression, revert its Git commit and let the reviewed branch build it again. Do not overwrite or delete published Android releases as part of a web rollback.

## Known limits

- This preparation does not create or publish a Cloudflare Pages project and does not make the game publicly available.
- No online multiplayer backend exists. LAN play requires a separate host and may be blocked by browser mixed-content or local-network policies when used from an HTTPS website.
- The neural agent is intentionally unavailable in the license-cleared preview because B-03 remains open.
- Full public release remains blocked by unresolved model rights and remaining notice/artwork delivery conditions. Do not deploy the ordinary build or claim the whole project is GPL-licensed.
- The actual Cloudflare account settings, production branch configuration, DNS, and deployment URL must be verified by the project owner after blockers are resolved.
