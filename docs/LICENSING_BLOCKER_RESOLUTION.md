# ShashBesh: B-03 / B-04 resolution report

Baseline: `af59666`, branch `feature/gplv3-license`, draft [PR #2](https://github.com/mistermetes-cloud/ShashBesh/pull/2). GPL adoption is **not authorized**. This report examines actual payloads; it does not repeat or enlarge the general dependency audit. Machine-readable findings: [BLOCKER_EVIDENCE.json](licensing/BLOCKER_EVIDENCE.json). Previous training verification: [TRAINING_PROVENANCE.json](licensing/TRAINING_PROVENANCE.json).

| Blocker | Can close? | Exact missing evidence/action |
|---|---|---|
| B-03 | **No** | Explicit satisfaction of OWN-06's condition for the identified weights: authority and permission to redistribute and modify; owner selection of the preferred modification representation/source package |
| B-04 | **No** | Actual delivery of full notices; exact FlatBuffers vendored source/notice scope; artwork scope/attribution; deployed web location if a separate public web deployment exists |

## B-03: verified model facts

The workspace scan found **two standalone weight files**, both tracked:

- `packages/agents/models/shashbesh-v0.1.json`
- `packages/agents/models/active-model.json`

Both have SHA-256 `0cdca20fa7485e79c81996b9ac8cc53543065396007a090f739eb6a6cec75cfc`. `registry.json` is metadata, not a third weight file. No ONNX/PT/PTH/NPY/NPZ/Safetensors/H5/PB/BIN checkpoints were found in the examined project/data/artifact directories. Dependencies, tools and private agent state were outside model scope.

Architecture is `mlp-tanh-v1`: **269 inputs → 24 tanh hidden units → one scalar action score**, 6,505 parameters (`w1`: 6,456; `b1`: 24; `w2`: 24; `b2`: scalar). `packages/neural/src/index.ts` validates and evaluates this layout. The minified web bundle contains the same JSON weight arrays; its three web files are byte-identical to corresponding APK entries. Thus the model is shipped inside JavaScript, not as a separate APK model file.

Model metadata, `train.py:91–118`, saved manifest and previous verification support local NumPy supervised behavior cloning from random initialization, seed 20261009, Adam, Tactical labels. Corpus hash is `186b004c25b083abd31a848ac0a40d41292355031b6fbe41c93ca2ea7e1152f6`. The saved corpus has 64 generated episodes and three historical sources; the Greedy export contributes no Tactical training rows, acceptance/smoke contribute 99/84. No pretrained-weight import appears in the inspected training path. These are technical consistency findings, **not independent proof of historical execution, authorship or rights**.

Neither JSON contains copyright/licensing/grant metadata. OWN-05 asserts project data origin; OWN-06 selects GPL-3.0-only but includes weights **only if rights/legal scope are confirmed**. An unconditional weight redistribution/modification grant is not established. NumPy/build-tool licensing is not a license grant for output weights. No general conclusion is made about whether numerical weights necessarily attract copyright.

**Editable/source candidate, not an owner-approved legal determination:** for direct parameter editing, the existing JSON with architecture and `w1,b1,w2,b2` is the native representation. For training-based modification, preserve `train.py`, `prepare-cli.ts`, feature/integrity/training code, geometry/policy definitions, requirements, model config and the required corpus/recipe. Export rounds numbers to nine decimals; unrounded optimizer/checkpoint state is not established as available. The compact corpus, manifest, training config and metrics are local, excluded from Git. JSON availability does not automatically settle which training materials are necessary for the owner's preferred modification workflow. GPL's source definition concerns the preferred modification form; see the already saved official text, `artifacts/license-audit/gpl-3.0-official.txt`, section 1.

**Owner decision required:** explicitly confirm authority and permission to copy, distribute and modify these identified weight arrays under the proposed scope, disclose any other contributor/contract/data restrictions, and choose direct JSON editing or the training workflow as the preferred form. If training-based, identify necessary data/recipe, permissions and delivery mechanism. This does not require inventing rights or assuming every private dataset must be public. Adoption remains a separate decision.

## B-04: verified shipped payloads and notice gaps

The [published APK](https://github.com/mistermetes-cloud/ShashBesh/releases/tag/v0.3.1-alpha) asset digest equals local SHA-256 `f24848f0c8572f3392f6be7be13228ae047a9810cb71a1b4f89ae6c45139b8a2` (4,262,726 bytes). It contains 446 entries and four DEX files. The local web build contains HTML, CSS and one JS file; all three match APK `assets/public/` bytes. No independently hosted web URL was identified; this report does not claim inspection of an unknown live deployment.

Retained JS banners identify React/react-dom, scheduler, noble-hashes and Capacitor, all already in the registry; versions come from the existing build/lock evidence, not banners alone. APK `assets/native-bridge.js` is also Capacitor. Both Cordova stubs are empty. Comments referring to a root `LICENSE` do not provide that file in the delivered web/APK. Full MIT permission text and a complete accompanying legal package were not found. Read-only release enumeration found one published release; it has only the APK asset and a short body without notices; no documented companion package was found. The 336-record source notice collection is available in this draft, but that does not establish accompaniment of the published binary.

There are **no packaged font files, `.so` libraries or WebAssembly** in these payloads. CSS uses system font families and has no `@font-face`/URL references. Android framework/WebView/system or later downloadable fonts are not claimed to be redistributed here. Optional native build-tool packages therefore do **not** block this specific web/APK on grounds of native shipment; separate tool distribution remains R-03.

DEX analysis finds 5,158 defined classes: 4,648 match archives in the existing runtime graph (including nested JARs), 152 use project/Capacitor project namespaces, and 358 follow resource/synthetic/desugaring naming patterns. No other unexplained class descriptors remain. Matches corroborate membership, not exact-version or code-equivalence proof. Forty-six registered coordinates have class matches; BOM/variant/stub/cache presence alone is not shipment evidence.

**Concrete missing nested component:** Emoji2 1.3.0 AAR contains `libs/repackaged.jar`; all **49 classes** occur in DEX. It combines relocated FlatBuffers runtime and generated emoji metadata. Previous scans omitted this nested JAR. It has no legal entries; `Constants.class` has `FLATBUFFERS_1_12_0`, an API compatibility marker, not an exact source-revision certificate. Official [FlatBuffers 1.12 licensing](https://github.com/google/flatbuffers/blob/v1.12.0/LICENSE.txt) is Apache-2.0, but the precise vendored source/modifications and applicable Google/AndroidX attribution must be mapped. This is the only newly recorded component: [SHIPPED_COMPONENT_GAPS.json](licensing/SHIPPED_COMPONENT_GAPS.json); the 54-coordinate inventory is unchanged.

All **192 APK raster assets** match project/registered AAR resources by byte identity or decoded RGBA pixels (ignoring invisible RGB at alpha zero; stripping the nine-patch source border where compilation does so). The per-entry mappings are in the evidence file. This identifies containers and does not independently establish copyright permission. The compiled robot drawable is present; `aapt` confirms its vector path. Capacitor template byte matches remain evidence of template origin, not blanket independent symbol/trademark permission. Prepared [artwork notices](licensing/ARTWORK_NOTICES.md) do not establish delivery. The [official Android robot attribution conditions](https://developer.android.com/distribute/marketing-tools/brand-guidelines#android-robot) apply to the appropriate Google-derived artwork scope; exact genealogy and accompaniment remain unresolved.

## Exact remediation sequence

1. Record the weight authority/grant and preferred source decision above; define how recipients receive necessary editable/training materials. Do not relabel weights now.
2. Trace Emoji2's repackaged FlatBuffers to its vendored source/build revision; preserve pertinent Google copyright, Apache license, modifications and any applicable NOTICE, with separate AndroidX-generated metadata attribution. Reconcile against the actual 49 shipped classes.
3. Resolve robot/Capacitor artwork scope; use the completed raster/template mappings and resolve symbol provenance/permission. Retain applicable MIT/CC attribution and separate trademark scope. Do not assume own-artwork declarations cover template assets.
4. Assemble a versioned, self-contained notice companion from the existing texts plus the verified nested-component additions. Include full MIT notices for shipped JS/bridge/template portions, Android/FlatBuffers Apache texts and applicable attribution/NOTICE, and NanoHTTPD BSD terms. Make it available with the exact artifact/hash, and verify recipient access. An in-app screen is one option; a properly delivered companion can also be evaluated against each license's terms.
5. In a separately authorized future packaging/remediation task, deliver and test the companion. Current prohibitions leave the existing APK/releases untouched; this report cannot claim remediation of that delivery. Supply the public web location, if any, for equivalent read-only checking.

**Conclusion:** B-03 and B-04 remain open for the specific missing grant/source decision and actual notice/artwork/nested-component remediation above. The absence of proof is not asserted to be an established legal violation. No LICENSE, adoption declaration, game/AI/model/APK/release changes or merge are performed.

Validation: [BLOCKER_VALIDATION.json](licensing/BLOCKER_VALIDATION.json). All 336 existing notice hashes pass; npm/Android/notice general registers are unchanged. Only four baseline audit documents plus the new focused report/evidence/gap/validation files change. All other 350 baseline tracked files, including engine, rules, AI, weights and README, are unchanged; APK hash matches the published asset. Existing APK entry listings, vector dumps and retrieved primary sources remain local evidence.

## Prepared final remediation at baseline b3d2c2c

Current preparation: [LICENSING_REMEDIATION.md](LICENSING_REMEDIATION.md). The r1 self-contained companion targets the exact published APK hash and matching web files. FlatBuffers runtime content resolves to Maven 1.12.0 via normalized semantic comparison of all 45 classes; Utf8Safe is specifically BSD-3-Clause (Google 2008), not blanket Apache. Four generated metadata classes are mapped to AOSP 2017 Apache schema/header. Full robot CC attribution/text, template Drifty MIT and original/supplementary runtime NOTICE texts are included. Source/notice technical preparation is resolved for identified payloads; exact original build/rasterization history remains an evidence limitation.

B-03 remains open: [model declaration template](licensing/MODEL_OWNER_DECLARATION_TEMPLATE.md) is unapproved, and its editable/source workflow is a proposed owner decision. B-04 remains open for actual recipient/creative delivery and applicable branding conditions; preparation does not modify the existing APK/Release. Root LICENSE/adoption/merge remain unauthorized. Original general npm/Maven/336-notice registries remain unchanged.
