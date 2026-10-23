# ShashBesh preview corresponding source

Owner-controlled code: GPL-3.0-only. Owner-controlled original graphics, texts and translations: CC BY 4.0. See LICENSE_SCOPE.md, ATTRIBUTION.md and retained third-party notices. No warranty under the applicable licenses.

Download the complete editable model-free source shipped with this preview at [/shashbesh-source.tar.gz](/shashbesh-source.tar.gz). Verify its SHA-256 with [/shashbesh-source.tar.gz.sha256](/shashbesh-source.tar.gz.sha256). This archive is bundled with the build, so it remains associated with that deployment even if a branch later moves. SOURCE_FILES.json lists every editable payload file and SHA-256, excluding itself; SOURCE_FILES.sha256 verifies the manifest. The archive excludes its own generated download files.

The publication branch is release/shashbesh-offline-preview-2026-10-23 in https://github.com/mistermetes-cloud/ShashBesh . For GitHub source, use the exact preview commit recorded in the RELEASE-02 publication report or Cloudflare deployment details; download that commit's source, never the development tree. No production tag is created.

## Build

Use exactly Node 22.16.0 (pinned in .node-version), npm 10.9.2 and the included lockfile:

```sh
npm ci
./node_modules/.bin/tsc --noEmit
npm test
python3 scripts/package-source.py
npm run build:public-preview
```

Output: apps/web/dist. The source download itself is packaging metadata: to reproduce those download files, use the copies in the exact GitHub preview commit. The archive contains all editable application/build/test/license inputs; node_modules, weights, datasets, private databases, research, credentials and development Git history are excluded. Locked upstream dependencies retain their own terms.

Human versus Tactical and local 2–4 players are available, with nine languages. Online controls, automatic WebSocket and LAN session restore are disabled at build time. Arena is not required. Core rules and geometry are unchanged from the verified candidate. Offline means local gameplay after static assets load; cold offline first load and service-worker caching are not claimed.

RELEASE-03.1 adds localized source download links beside the existing license notices. Runtime changes are limited to these links and nine translated labels. Rebuild source packaging with `python3 scripts/package-source.py` before the web build. The source manifest excludes itself and generated download files to avoid recursive hashes.
