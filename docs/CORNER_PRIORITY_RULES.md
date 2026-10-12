# Owner-confirmed corner priority — correction

The new owner instruction supersedes the old `cornerPriority: per-unit` interpretation and the old voluntary-capture clause. Default new games use the recorded absolute policy; archived per-unit journals remain readable but cannot be used to continue gameplay under the authoritative current engine.

1. Reaching a corner with one die is an ordinary move and consumes that die. A separate unused die with value 1 is required to jump. The jump itself consumes that 1 exactly once. From 40 with dice 3–1: 40 → 41 → 42 → 43 (spend 3), then 43 → 44 → 45 → 46 → 47 → 48 → 1 → 2 → 3 → 4 → 5 → 6 → 7 (spend 1). No die is duplicated and no free movement is added.
2. The ordinary approach and the separate 12-cell jump each obey the established own-piece obstruction rule. Opponents may be passed. A jump captures only an opponent on its destination; opponents on its intermediate path remain. Blocked jumps do not create legal mandatory opportunities.
3. Complete otherwise-legal dice sequences are filtered for the earliest mandatory legal corner jump. A sequence that spends the 1 elsewhere and thereby makes the jump unavailable is rejected when another complete sequence can perform it. Captures/ordinary alternatives cannot avoid it. Multiple equally eligible corner alternatives are retained. After priority filtering the existing maximum usable dice-sum constraint applies. If no unused 1 exists, merely reaching a corner creates no jump priority.
4. After a jump, the roll records its piece identity. A legal continuation by that piece is mandatory. If it has no legal continuation, the owner permits remaining dice to transfer to another piece. That constraint is validated against the active event journal and cannot be bypassed by deleting the roll's pointer.
5. When no mandatory corner sequence exists, an immediately available capture has priority; ordinary movement remains when neither applies. A capture that could become available after later actions does not force its ordinary approach now. Selection/scoring occurs only after authoritative filtering.
6. Doubles, 6–5 extra rolls, deployment, home paths and atomic victory remain subject to existing rules; geometry and weights are unchanged.

The owner explicitly confirmed that reaching a corner and jumping are separate actions, and the jump consumes the 1. The same-piece continuation rule applies when legal; the owner has approved transfer to another piece only when the jumper has no legal continuation. If no piece can move, existing no-legal-move completion applies.

Historical `jumpEntry: skip` and `homeFreeze: contiguous-tail` working policies are retained; this task does not silently settle the older questions in OPEN_RULE_QUESTIONS.md.

The 2026-10-12 Disputed Move Report (`tests/fixtures/corner-priority-disputed-move.json`) records four unused fives, P1-3 on М07, P1-5 on М32 and P2-3 on М27. Both P1 pieces must be selectable initially. The old filter looked ahead to P1-3 capturing on its fourth five and forced its first ordinary move, creating an apparent corner lock even without a one. Capture remains mandatory once М22 → М27 is available. Corner priority explicitly checks unused actions for a one, including after partial consumption and on doubles.

## Shared implementation

- `packages/engine/src/index.ts`: raw actions and legal sequences, full-route own blocking, destination captures, priority filtering, continuation, replay/undo.
- `packages/engine/src/rule-policy.ts`: current/archived policies and explicit blocking errors.
- `packages/agents/src/index.ts`: existing choosers consume filtered sequences/masks; no strategic override is added.
- `packages/neural/src/index.ts`: unchanged weights remain identified as trained under the legacy hash, accepted as a known prior; engine masks enforce current legality. Unknown model policy hashes remain rejected. No retraining or model metadata mutation.
- UI/observer and simulations obtain authoritative legal actions. Archived games are available for history rather than silently relabeled current.

Critical assertions A–K are in `tests/corner-priority.test.ts`; screenshot/movement verification is kept in `tests/browser/ai-animation.spec.ts`. Earlier zero-error simulation results are historical evidence, not certification of this correction.
