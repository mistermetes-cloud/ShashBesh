# ShashBesh — rules v1

DRAFT_REVIEW_REQUIRED. Translation for review; not independently checked by native speakers. Source: docs/RULES_V1.md, updated by owner approval GAME UPDATE 06. Other open interpretations remain open.

## Game and board

2–4 players, five pieces each. The first to fill all five home positions in a contiguous chain wins. The closed outer route has 48 cells, numbered 1→2→…→48→1; pieces move in increasing order. Starts are P1=1, P2=13, P3=25, P4=37. Each home comprises its shared outer start plus four inner cells: for P1, 1, Д1.2, Д1.3, Д1.4, Д1.5; likewise for the other players. There are 48 outer + 16 inner = 64 unique physical cells. Corners are 7, 19, 31, 43. The CSV defines the exact geometry.

## Start and turn order

Each player rolls one d6. Highest starts; tied leaders alone reroll until one remains. Play then proceeds clockwise. Other players wait until the active player finishes the entire series of extra rolls.

## Rolls and actions

Roll two independent six-sided dice. A normal a–b roll gives separate actions of a and b. Order and allocation among pieces must satisfy mandatory corner-jump filtering; capture is optional and remaining values may use any legal piece. Any double n–n gives four separate n actions and another roll: 6–6 gives four sixes, not two or three. 6–5 or 5–6 (“shashbesh”) gives actions six and five, then another roll. Extra rolls are unlimited. Fully resolve and record each roll before the next; actions cannot be mixed or carried between rolls.

Use the maximum possible sum of action values among complete sequences permitted by corner priorities. If 6+3=9 can be used, a move of six that prevents using three is forbidden. If only one of five and three can be used, use five. Equal maximum sums leave a free strategic choice.

## Entry, movement and capture

A reserve piece enters its own start for one action of six; it does not advance six cells. Entry is forbidden if an own piece occupies the start; an opponent there is captured. One piece maximum per physical cell. You cannot pass, jump over or land on your own pieces; you may pass opponents. Exact landing on an opponent mandates capture: it returns to reserve with route progress reset. Choosing a capture is optional; another legal action may be chosen instead. Do not introduce pairs, blocks, stacks or unspecified safe outer cells.

## Corner jumps — owner-confirmed priority

Corner cycle: 31→43→7→19→31. A legal jump has absolute priority over capture, another piece and dice order; check full legal sequences before choosing strategy. Reaching a corner uses an ordinary action. The jump needs an unused one and consumes it as a separate action. Example: from 40 with 3–1, move 40→41→42→43 using three, then 43→44→45→46→47→48→1→2→3→4→5→6→7 using one. That one cannot be used elsewhere; jumping is not free.

A piece already at a corner must jump if an unused one permits a legal jump. Without a one, reaching a corner alone gives no jump priority. Outer progress increases by approach steps and by twelve for the separate jump, while dice consumption uses action face values. Own pieces block both the approach and the twelve-cell jump route. Intermediate opponents remain; only an opponent at the jump destination is captured. A jump blocked by your pieces creates no mandatory opportunity; ordinary actions are then checked under the established rules.

Keep all legal corner alternatives satisfying mandatory requirements and the maximum sum. Capture does not eliminate another corner alternative. After jumping, choose any legal action with the remaining values, including another piece. With 1–2, first jump using 1, then choose the action using 2; it is never consumed automatically. If no piece has a legal action, use the existing completion of an unplayable roll. Working policy `jumpEntry: skip` for jumping across the home entrance remains; older questions about it are not automatically resolved.

## Home and victory

After a complete outer circuit, reaching your entrance turns the piece into home; voluntarily starting another circuit is forbidden (forced corner jumps may cause another circuit). The four inner home cells are protected: opponents cannot enter or capture there. Several still-mobile own pieces may be in home, but cannot pass or occupy one another’s cells. With A on Д1.3, B may enter Д1.2 but cannot jump A.

Movement requires the exact value: no overshooting the last cell or the finish. An excessive value is illegal for that piece but may suit another. Pieces stay home and become permanently fixed in a contiguous chain from the far end: first Д1.5, then Д1.4, Д1.3, Д1.2, and fifth at the shared outer start (1, 13, 25 or 37) after a full circuit. Mobile pieces may enter before previous ones become fixed. Filling all five home positions wins. Example with 1–1, A on Д1.3 and B on Д1.2, absent a mandatory jump: A→Д1.4; B→Д1.3; A→Д1.5; B→Д1.4 is legal.

## Deferred / excluded

Dice falling off a physical table are not modelled. Captures are optional choices; landing on an opponent still captures automatically. Do not infer financial stakes or blockchain: the log hash chain is a local technical feature.
