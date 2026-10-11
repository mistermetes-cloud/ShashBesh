# Gameplay validation — mandatory corner jump

Date: 2026-10-11  
Branch: `feature/gameplay-ai-animation`  
Baseline: `af46155`

## Rule correction

The old transition attached a corner jump to ordinary movement and counted its twelve outer-track cells as part of that action. That could award a jump without spending a separate 1. The current engine makes reaching a corner an ordinary move, then exposes a distinct `corner_jump` action only when an unused 1 exists and the complete jump ray is unblocked by an allied piece. The jump consumes exactly that 1. The complete legal-sequence filter enforces corner priority before controllers score actions. A legal continuation by the jumper remains mandatory; after the owner confirmed transfer, another piece may use the remainder only if the jumper has no legal continuation.

Passing an opponent does not capture it. Captures are still checked only at the final destination, including the jump landing. Dice display order does not determine priority. A blocked approach or jump does not create a mandatory opportunity.

## Verification results

| Check | Result | Evidence |
|---|---|---|
| TypeScript | PASS | `npx tsc --noEmit`, exit 0 |
| Full automated suite | PASS, 82/82 | `artifacts/gameplay-token-priority-v4/full-test.log`; includes the 100-game rotating-seat tournament, neural subprocess tests and report unit test |
| Focused corner tests | PASS, 11/11 | `artifacts/gameplay-token-priority-v2/corner-test.log` (rerun after final rule changes also passed in terminal) |
| Focused engine, route, and report tests | PASS | Included in full suite; rule coverage checks all 48 track cells for each owner and die, 36 ordered dice pairs, captures, home routes, doubles, deployment and replay |
| Corner-targeted scenarios | PASS, 10,000/10,000 | `artifacts/gameplay-token-priority-v4/targeted-summary.json`; 22,582 independently checked action transitions, 0 failures, 0 blocked; 2,500 scenarios each for random, greedy, tactical and neural agents |
| Neural action filtering | PASS | 2,522/10,000 scenarios had the neural scorer's best raw action excluded by the authoritative legal set; agents chose only legal complete sequences |
| Browser tests | PASS, 6/6 | Firefox: `tests/browser/ai-animation.spec.ts` and `tests/browser/disputed-move.spec.ts`; covers selectable priority actions, pass-through, visible jump cells, capture, pause/resume, speed, extra roll, mobile observer mode, report save/export |
| Disputed move report | PASS | Snapshot retains the actual `GameState`, legal and proposed actions, dice, remaining dice, recent event history, free-text explanation and expected action; IndexedDB save and JSON export were exercised in browser |

The generated 10,000-situation check used an independently written transition oracle for movement, capture, dice consumption, transfer eligibility and state invariants; it did not accept the engine's own move generator as its correctness oracle. The deterministic scenarios cover corner approach, already-on-corner jumps, absent 1, captures, multiple corners, blocked approaches/rays, transfer when the jumper is blocked, all dice display orders, and AI selection.

## Preserved interrupted-session evidence

All pre-existing files under `artifacts/gameplay-full/` were preserved and their original SHA-256 values recorded in `docs/GAMEPLAY_RECOVERY.json`. Their results are explicitly tagged `OLD_POLICY`: 2,941 completed AI games / 911,292 moves and 3,631 random games / 1,192,053 moves; the generated and reference datasets each contain 10,000 situations / 22,818 moves. These results do not validate the corrected corner rule. The corrected rule has 10,000 new targeted situations and the full suite's 100 complete games; the earlier 10,000 full-game targets were not rerun.

Intermediate targeted runs with stale expectations are retained under `artifacts/gameplay-token-priority-v2/` and `...-v3/`; do not read their failures as failures of the final implementation. The clean final run is v4.

## AI and compatibility

Random, greedy, tactical and neural decisions all receive the same engine-filtered legal sequences. Directly applying a raw neural action that violates mandatory priority is rejected by the engine. The trained model weights and metadata were not changed or retrained. Its legacy policy hash remains recognized; legal masks now exclude actions prohibited by the current rule, so observed choices can differ without changing weights.

Existing saves or replay journals recorded with the archived per-unit policy remain viewable as history and cannot continue as current-policy games. No board geometry, APK, release or licensing file was changed. Older home-freeze interpretation questions remain as documented in `docs/OPEN_RULE_QUESTIONS.md`; they were outside this correction.

## Reproduction

```sh
npx tsc --noEmit
npm test
PLAYWRIGHT_BROWSERS_PATH=/tmp/shashbesh-browsers SHASHBESH_TEST_BROWSER=firefox \
  node_modules/.bin/playwright test tests/browser/ai-animation.spec.ts tests/browser/disputed-move.spec.ts
node --import tsx tests/corner-priority.test.ts
```

The one-shot targeted simulation is `node --import tsx scripts/corner-validation.ts`; it refuses to overwrite an existing `targeted.jsonl`. Update its output directory and seed prefix before creating a fresh validation run.
