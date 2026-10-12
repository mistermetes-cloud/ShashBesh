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
- `SHASHBESH_TEST_BROWSER=firefox npm run test:browser`: **17 passed, 2 failed**. All new corner/report regressions and existing corner animation tests passed.
- Remaining browser failures: `game.spec.ts` expects a complete AI game after only 20 virtual-clock advances; `mobile-restore.spec.ts` expects IndexedDB version 2 although the existing implementation opens version 3. Both were checked separately on unchanged commit `857a904` in a temporary copy. These unrelated checks were not weakened or skipped.
- Local LAN and browser tests required execution outside the filesystem/network sandbox to open localhost ports.

## COMMIT HASH

The dedicated commit containing this report is on `fix/corner-jump-unused-one`; its hash is provided with the delivery and Pull Request. The PR targets `feature/cloudflare-pages-deployment`, the starting branch, so it contains only this correction.

## READY FOR DEPLOYMENT

The reported engine defect is fixed and its regressions pass. Full browser-suite certification remains blocked by the two existing failures above. No deployment or automatic merge was requested or performed.
