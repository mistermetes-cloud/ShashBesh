# Corner jump priority bugfix — 2026-10-12

## ROOT CAUSE

The supplied Disputed Move Report was located in Downloads and preserved unchanged in `tests/fixtures/corner-priority-disputed-move.json` (report ID `966b97b5-60f1-474a-8f29-989d8990a6e1`). Its journal replays to the reported state: P1 has four unused fives, P1-3 stands on М07, P1-5 on М32, and P2-3 on М27.

`prioritySequences` ranked complete branches by the earliest future capture even when no capture was currently available. P1-3 could capture P2-3 on its fourth five, so every alternative first move was discarded. The report therefore exposed an anticipatory capture lock that appeared to be corner priority. There is no unused one and no legal corner jump in this position.

The regression failed before the correction: only P1-3 was legal. Afterward both P1-3 and P1-5 are legal. The original report's stored legal-action list remains unchanged as evidence.

## CHANGES

- Corner priority explicitly requires `remainingActions.includes(1)` at each search state, rather than depending on the original dice or a corner position.
- Capture priority filters immediately available captures; a possible future capture no longer forces ordinary approach moves. Captures are still mandatory when available, including М22 → М27 in the reported position.
- Preserved the mandatory legal approach-plus-one sequence, legal jump continuation, obstruction, destination capture, maximum usable points, doubles, extra rolls, journal validation and replay. UI and AI continue to consume engine legality without separate rule overrides.

## REGRESSION TESTS

- All 36 ordered dice pairs for a piece already on a corner.
- All 36 ordered dice pairs for an approach to a corner, including 1–1.
- Doubles 2–2 through 6–6 after arriving at a corner, including 5–5.
- A spent one cannot impose priority on the remaining action.
- Exact report replay, both first choices, preserved immediate capture, and all four AI strategies; the random AI can choose P1-5.
- Public-preview baseline agents consume the same filtered sequences.
- Browser checks: exact report selection М32 → М37; standing-corner 5–5, 3–4, 6–2, 1–5, 1–1; highlights, destination selection and AI actions. Existing approach/jump animation coverage also passes.

## TEST RESULTS

- `npm test`: **87 passed, 0 failed**.
- `npm run test:neural-python`: **3 passed**.
- `npm run test:android-transport`: **1 passed**.
- `npm run build:public-preview`: **PASS**, including TypeScript and preview-content verification.
- Final `SHASHBESH_TEST_BROWSER=firefox npm run test:browser`: **19 passed, 0 failed** (7.4 minutes). The full manual/import/export/AI completion test passed in 4.1 minutes; its exported final state matched the engine simulation.
- The initial 17/19 browser run exposed two pre-existing test failures, also reproduced on unchanged commit `857a904`. Their investigation and corrections are documented below; no tests were skipped and victory/replay assertions were strengthened.
- Local LAN and browser tests required execution outside the filesystem/network sandbox to open localhost ports.

## COMMIT HASH

The dedicated commit containing this report is on `fix/corner-jump-unused-one`; its hash is provided with the delivery and Pull Request. The PR targets `feature/cloudflare-pages-deployment`, the starting branch, so it contains only this correction.

## READY FOR DEPLOYMENT

The reported engine defect and both stale browser-test failures are resolved. All 19 browser tests, all 87 primary tests, and the public-preview build pass. No deployment or automatic merge was requested or performed. This verification uses Firefox and a fixed seed for the full browser AI game; it does not certify every browser or every possible AI game. The complete animation scenario requires a longer timeout on slower machines.

## Final PR #4 verification

The two browser failures were investigated without changing engine rules or database implementation:

- The AI seed `browser-v1` completes in the engine: P2 wins after 138 rolls and 277 actions. The browser scheduler intentionally executes one animated command at a time, then queues the next command in a React effect. Twenty advances of the virtual clock did not allow a whole game to finish. Large 20-second clock advances also spent time advancing timers before React could queue the next command. The test now resumes after installing the clock, advances by 2 seconds (the longest FAST jump with capture takes 1.2 seconds), yields between advances, and bounds the number of advances using the simulated game's journal length. Its overall timeout is 600 seconds to cover rendering the full game on slower machines. Victory remains mandatory; the exported browser journal is replayed and its final state hash is compared with the full simulation, normalizing only the independently generated game ID.
- IndexedDB is already version 3, containing `saves`, `games`, and `disputedReports`. The outdated test's version-2 expectation was corrected. The test also verifies store names, replays the migrated journal to the original state hash, reloads the application and checks the saved dice and piece position again. The working schema was not modified.
- Existing journal-v1/v2 replay, completed-game replay, undo/reused-dice, saved AI plan restoration, and the preserved pre-fix Disputed Move Report remain in the verification suite. No historical journal was rewritten.
- Only browser tests and this report changed in the final-verification commit. The engine, corner/capture rules, runtime database schema, and generated public-preview bundle remain unchanged.
