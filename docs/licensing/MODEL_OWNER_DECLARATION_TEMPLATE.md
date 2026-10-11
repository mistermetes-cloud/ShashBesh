# Model owner declaration — UNAPPROVED TEMPLATE

This is a proposed declaration for completion and explicit acceptance by the owner. It is **not** a signed statement, permission grant, approved source decision, or authorization to adopt GPL. Blank answers and unchecked choices have no effect. Existing OWN-05/OWN-06 remain assertions/conditional decisions as previously recorded.

## Identified weights — verified facts, not the declaration

| Field | Evidence-backed value |
|---|---|
| Model | ShashBesh AI v0.1, `mlp-tanh-v1`, 269 → 24 tanh → 1, 6,505 parameters |
| Files | `packages/agents/models/shashbesh-v0.1.json`; `packages/agents/models/active-model.json` |
| SHA-256 (both files) | `0cdca20fa7485e79c81996b9ac8cc53543065396007a090f739eb6a6cec75cfc` |
| Embedded copies | Same `w1,b1,w2,b2` arrays in the examined web/APK JS |
| Dataset SHA-256 | `186b004c25b083abd31a848ac0a40d41292355031b6fbe41c93ca2ea7e1152f6` |
| Recorded training | Local random initialization, seed 20261009, Tactical behavior cloning; previous technical consistency verification |
| Existing owner display choice | Mister Metes; 2026; proposed GPL-3.0-only for own rights-controlled materials; weights conditional |

Technical provenance does not independently prove ownership, authority, historical execution or copyrightability of every numerical value. Tool licenses are not model grants.

## Owner statements to complete and approve

1. **Authority:** I am the copyright/rightsholder or authorized licensor for the protected portions of the identified weights to the following extent: **[describe authority, authors/other holders, evidence/agreements or non-applicable rights]**.
2. **Origins and restrictions:** My prior project-data statement applies to these model inputs as follows: **[confirm scope]**. Other contributors, imported weights/code/data, employment/contract restrictions or third-party terms relevant to these weights: **[list, or explicitly state none known after review]**. Needed consents and their status: **[list/status]**. Do not assert restrictions absent merely because none were found in local files.
3. **Proposed model permission:** Subject to my actual authority and the listed exclusions, I authorize copying, redistribution and modification of these identified protected model portions under GNU GPL version 3 only (`GPL-3.0-only`): **[explicitly accept / reject / specify alternative scope]**. Rights I do not control are not granted. No assertion is made that every numerical weight necessarily attracts copyright. Acceptance of this model statement does not by itself authorize project-wide GPL adoption, root LICENSE addition, APK/Release changes or PR merge.
4. **Copyright display, if applicable and within my authority:** `Copyright (C) 2026 Mister Metes`: **[confirm for the declared model scope / specify correction]**.

## Preferred modification representation — proposed owner decision

**Proposal for review:** preserve the native JSON arrays/architecture and use the actual training workflow as the preferred form for training-based changes. This is a recommendation, **not** an approved declaration that the files below legally constitute sufficient source.

Owner selection (choose the actual preferred workflow; no option is pre-approved):

- [ ] **A — direct parameter editing:** native model JSON with architecture, `w1,b1,w2,b2`, schema/feature definitions and applicable loader documentation. Explain why this is the actual preferred form: **[answer]**.
- [ ] **B — training-based modification:** native JSON plus versioned training/preparation/feature code, configuration, dependencies, geometry/policy definitions and necessary corpus or an adequate generation recipe. Specify exactly what is necessary and delivered: **[answer]**.
- [ ] **C — other:** describe the actual editable form and source requirements: **[answer]**.

For proposal B, the candidate source set is:

- Tracked `packages/neural/python/train.py`, `requirements.txt`, `packages/neural/src/{prepare-cli,features,integrity,index}.ts`, required training/engine/shared code and relevant model/config/feature documentation.
- Referenced geometry CSV and policy definitions, included only within established permissions.
- Local `artifacts/ai-v01/{training-config.json,training-metrics.json,data/manifest.json,data/compact.jsonl}` or an adequate replacement/generation recipe for the required data. The original corpus has 64 generated episodes and two historical Tactical inputs contributing 99/84 rows; the Greedy input has zero training rows. A fresh generation recipe is not assumed to reproduce the exact recorded corpus bytes or original historical episodes.

Owner must identify necessary data rights, exclusions, whether a recipe is functionally sufficient, and how recipients obtain the required editable materials: **[answer with paths, versions/hashes, delivery location and permissions]**. Native exported values are rounded to nine decimals; an unrounded checkpoint/optimizer state has not been established as available. Identify whether any such additional form exists and is actually preferred: **[answer]**.

No private datasets/logs are published by this template. No blanket assumption is made that all local data must be public or that JSON alone suffices for a training workflow. After the owner's decision, technical verification must check the approved source set and delivery mechanism against that workflow.

## Acceptance — not completed

Owner/authorized signatory: **[name/authority]**

Date: **[date]**

Explicit acceptance of completed statements and selected workflow: **[owner acceptance required; currently NOT APPROVED]**

Unresolved exceptions or conditions: **[list]**

B-03 remains open until actual, sufficiently scoped answers/permission and the preferred-source decision are recorded. GPL adoption remains separately unauthorized.
