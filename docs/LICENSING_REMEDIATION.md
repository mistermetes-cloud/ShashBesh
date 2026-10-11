# ShashBesh: final licensing remediation preparation

Baseline `b3d2c2c`, branch `feature/gplv3-license`. GPL adoption remains unauthorized. The prepared companion applies to published APK SHA-256 `f24848f0c8572f3392f6be7be13228ae047a9810cb71a1b4f89ae6c45139b8a2` and the matching embedded web files.

## Prepared deliverable

[Third-party notice ZIP, revision 1](licensing/bundles/ShashBesh-v0.3.1-alpha-third-party-notices-r1.zip), [checksum](licensing/bundles/ShashBesh-v0.3.1-alpha-third-party-notices-r1.zip.sha256), [manifest](licensing/bundles/ShashBesh-v0.3.1-alpha-third-party-notices-r1/MANIFEST.json). It contains **217 component/source notice records, 80 unique exact texts and 59 scope contexts**. These are notice contexts, not 59 newly discovered dependencies. The original general registry is unchanged.

The ZIP is self-contained: combined plain-text notices, original license/header/NOTICE texts, component/source mappings, artwork attribution/conditions, APK/web hashes and internal file checksums. It is **prepared, not published with the old Release**. Delivery and historical compliance are not inferred from the existence of this branch artifact.

## Closed technical preparation issues

| Issue | Verified resolution / evidence |
|---|---|
| FlatBuffers runtime version/content | All **45 runtime classes** match Maven `flatbuffers-java:1.12.0` in normalized disassembled signatures/constants/instructions/branch/exception targets. Namespace relocation, constant-pool indices and `ldc` encoding width are normalized; strings and symbolic references are preserved. The upstream JAR SHA-256 matches AndroidX's verification metadata. Raw relocated class bytes differ; exact original build commit is not certified |
| FlatBuffers attribution scope | Apache-2.0 project default and original Google 2014/2017/2019 headers are retained. **Utf8Safe is a BSD-3-Clause protobuf derivative, Copyright 2008 Google Inc.** Its entire leading copyright/conditions/disclaimer is included; this corrects the prior root-license-only assessment. Headerless source files inherit the project license; no per-file author is invented |
| Generated emoji metadata | The remaining **four classes** are MetadataItem/MetadataList and their vectors. Their fields/builders match AOSP's schema; the pinned generation recipe uses flatc and inserts the AOSP 2017 Apache header. Both original namespaces are relocated in AndroidX's bundle recipe. Schema/header texts are preserved separately. Exact historical generator invocation remains a forensic limitation, not a discovered contradictory permission |
| Upstream NOTICE omissions | Exact Apache Cordova 10.1.1 NOTICE, coroutines 1.6.4 `license/NOTICE.txt`, relevant Kotlin copyright/license and existing runtime source notices are included. Kotlin compiler-specific NOTICE and website-only extras are not misrepresented as APK components |
| Artwork source/credits | Local robot XML byte-matches Capacitor 7.6.9 and is semantically identical to an official AOSP sample (only attribute ordering differs). Google robot attribution, full CC BY 3.0 text, identification of the supplied white/shadow derivative, Drifty template MIT and supplemental Ionic logo MIT are included. All 192 raster-resource containers were already mapped and that evidence is reused |
| Text availability | Every identified shipped context has local notice files in the ZIP; shared Apache text is explicitly mapped where needed. Full MIT/BSD terms, upstream NOTICE, Google/AOSP copyrights and robot CC attribution/text are checked. Reading the license texts requires no external repository link |

Full findings and source hashes: [REMEDIATION_EVIDENCE.json](licensing/REMEDIATION_EVIDENCE.json). Validation: [NOTICE_BUNDLE_VALIDATION.json](licensing/NOTICE_BUNDLE_VALIDATION.json).

## Third-party conditions and genuine remaining questions

- MIT/BSD copyright, permission/conditions, disclaimers and non-endorsement terms remain applicable. Apache-2.0 license/pertinent copyright/NOTICE and modification information remain applicable; relocated namespaces are identified. No upstream component is relabeled GPL.
- Android robot copyright permission is conditional on CC BY 3.0 and the official attribution guidance. Prepared credits do not prove delivery to old recipients or inclusion in every relevant creative. The owner must ensure the credit accompanies actual use. Source/credit preparation is resolved; delivery is not.
- Verified template distribution is covered by the tag's MIT text, with the separate Google robot conditions preserved. Supplemental Ionic logo MIT is supplied conservatively; the exact original rasterization workflow is not certified. No additional contradictory artwork copyright terms were found in inspected sources. These sources do not grant trademark rights or authorize presenting Google/Ionic/Capacitor marks as ShashBesh's own brand/claiming endorsement. Owner must decide whether to retain upstream launcher branding under applicable usage terms or authorize replacement in a future task. No blanket requirement for written permission for every template image is invented.
- No fonts, native SO or WASM are packaged in this APK; optional build-tool native notices and platform font licensing are not shipment blockers for this artifact.

## Owner decisions and next actions

1. Complete and explicitly accept or revise the [model declaration template](licensing/MODEL_OWNER_DECLARATION_TEMPLATE.md): weight-specific authority, copying/redistribution/modification permission, any other contributors/conditions, and preferred editable/source form. The training-workflow candidate is only a **proposal**, not an approved declaration. Identify and verify necessary data/recipe permissions and delivery.
2. Decide the actual use of upstream logo/robot artwork as launcher branding; ensure applicable credits appear with relevant uses/creatives. Authorize any replacement separately; this task changes no asset or APK.
3. Authorize delivery of this exact r1 companion with the matching APK/web artifact through an appropriate future distribution channel. Existing Releases are unchanged. Verify both hash pairing and recipient access; make no retroactive-compliance claim. Identify any independently deployed web URL for the same check.
4. Reassess B-03/B-04 only after those decisions/delivery checks. Root GPL LICENSE, GPL adoption and PR merge require a separate authorized task.

| Blocker | Current result |
|---|---|
| B-03 | **OPEN:** no unconditional weight-specific authority/grant or approved preferred-source decision. Template is ready, unapproved |
| B-04 | **OPEN for actual delivery/attribution use:** technical source and notice preparation completed for identified payloads; companion still must be delivered and artwork-use conditions met. Trademark branding remains an owner/use assessment, not an invented copyright grant |

No game/engine/AI/weight/APK/Release changes, root LICENSE, force push or merge are performed. Network fetch errors and exact historical build limitations are recorded; they are not substituted for evidence of a legal violation.
