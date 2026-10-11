import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { engine, geometry, ready, track, home } from './helpers';
import { canonical, stateHash, exportLog, importLog, trackId } from '../packages/engine/src/index';
import { seeded, secure } from '../packages/engine/src/rng';
import type { GameState, Action } from '../packages/shared/src/index';
const sum = (seq: Action[]) => seq.reduce((n, a) => n + a.value, 0);
const roll = (s: GameState, dice: [
    number,
    number
]) => engine.roll(s, dice);
test('T04: initial tie leaders only, clockwise order', () => {
    let s = engine.create([1, 2, 3, 4]);
    s = engine.initialRoll(s, { 1: 5, 2: 3, 3: 5, 4: 1 });
    assert.deepEqual(s.initialContenders, [1, 3]);
    assert.throws(() => engine.initialRoll(s, { 1: 2, 2: 6, 3: 3 }));
    s = engine.initialRoll(s, { 1: 2, 3: 4 });
    assert.deepEqual(s.turnOrder, [3, 4, 1, 2]);
    assert.equal(s.activePlayer, 3);
});
test('T05/T06: ordinary free ordering and four double actions', () => {
    const s = track(ready(), 'P1-1', 2);
    const sequences = engine.legalSequencesForRoll(roll(s, [3, 2]));
    assert.ok(sequences.some(seq => seq[0].value === 3));
    assert.ok(sequences.some(seq => seq[0].value === 2));
    assert.ok(sequences.every(seq => sum(seq) === 5));
    const double = roll(s, [2, 2]);
    assert.deepEqual(double.currentRoll?.remainingActions, [2, 2, 2, 2]);
    assert.ok(engine.legalSequencesForRoll(double).every(seq => seq.length === 4));
});
test('T07: 6-6 deploy plus three moves; no next roll before finish', () => {
    let s = roll(ready(), [6, 6]);
    assert.throws(() => engine.roll(s, [1, 2]));
    const seq = engine.legalSequencesForRoll(s).find(seq => seq.every(a => a.pieceId === 'P1-1'))!;
    assert.equal(seq.length, 4);
    assert.equal(seq[0].kind, 'deploy');
    s = engine.applySequence(s, seq);
    assert.equal(s.pieces[0].outerSteps, 18);
    assert.equal(s.pieces[0].position, trackId(19));
    s = engine.finishRoll(s);
    assert.equal(s.activePlayer, 1);
});
test('T08/T09: 5-6 extra, multiple doubles independently committed, clockwise change', () => {
    let s = ready();
    for (const dice of [[2, 2], [3, 3], [5, 6]] as [
        number,
        number
    ][]) {
        s = roll(s, dice);
        s = engine.applySequence(s, engine.legalSequencesForRoll(s)[0]);
        s = engine.finishRoll(s);
        assert.equal(s.activePlayer, 1);
    }
    s = roll(s, [5, 4]);
    s = engine.applySequence(s, engine.legalSequencesForRoll(s)[0]);
    s = engine.finishRoll(s);
    assert.equal(s.activePlayer, 2);
    assert.equal(s.eventLog.filter(e => e.type === 'roll_finished').length, 4);
});
test('T10: maximum sum and rejection of non-maximal prefix', () => {
    let s = roll(ready(), [6, 3]);
    assert.ok(engine.legalSequencesForRoll(s).every(seq => sum(seq) === 9));
    assert.throws(() => engine.finishRoll(s));
    let q = ready();
    home(q, 'P1-1', 1);
    home(q, 'P1-2', 3);
    home(q, 'P1-3', 4, true);
    home(q, 'P1-4', 0);
    home(q, 'P1-5', 2);
    q = roll(q, [6, 3]);
    assert.ok(engine.legalSequencesForRoll(q).every(seq => sum(seq) === 0));
    // Own obstacle after 6 forces choosing the other order: 3 moves blocking piece first.
    let b = track(track(ready(), 'P1-1', 1), 'P1-2', 7);
    b = roll(b, [6, 3]);
    assert.ok(engine.legalSequencesForRoll(b).every(seq => sum(seq) === 9));
    const forged = { ...engine.legalActions(s)[0], value: 3 };
    assert.throws(() => engine.applyAction(s, forged));
    // A shorter move would prevent the exact winning entry with 6.
    let c = track(ready(), 'P1-1', 43, 42);
    home(c, 'P1-2', 4, true);
    home(c, 'P1-3', 3, true);
    home(c, 'P1-4', 2, true);
    home(c, 'P1-5', 1, true);
    c = roll(c, [6, 3]);
    assert.ok(engine.legalSequencesForRoll(c).every(seq => sum(seq) === 6));
    const short = engine.candidates(c, 3)[0];
    assert.throws(() => engine.applyAction(c, short));
});
test('T11/T12: own path blocks, enemy intermediate passes, exact capture', () => {
    let s = track(track(ready(), 'P1-1', 2), 'P1-2', 4);
    assert.ok(!engine.candidates(s, 3).some(a => a.pieceId === 'P1-1'));
    s = track(track(ready(), 'P1-1', 2), 'P2-1', 4, 20);
    assert.ok(engine.candidates(s, 3).some(a => a.pieceId === 'P1-1'));
    s = roll(s, [2, 1]);
    const a = engine.legalActions(s).find(a => a.pieceId === 'P1-1' && a.value === 2)!;
    s = engine.applyAction(s, a);
    const captured = s.pieces.find(p => p.id === 'P2-1')!;
    assert.equal(captured.status, 'reserve');
    assert.equal(captured.outerSteps, 0);
    assert.equal(captured.position, null);
});
test('T13/T14: occupied deployment own vs enemy, reset capture', () => {
    const own = track(ready(), 'P1-1', 1);
    assert.ok(!engine.candidates(own, 6).some(a => a.kind === 'deploy'));
    let enemy = track(ready(), 'P2-1', 1, 36);
    enemy = roll(enemy, [6, 3]);
    const a = engine.legalActions(enemy).find(a => a.kind === 'deploy')!;
    enemy = engine.applyAction(enemy, a);
    assert.equal(enemy.pieces.find(p => p.id === 'P2-1')!.outerSteps, 0);
});
test('T15: 3 reaches 31, then the separate 1 jumps 31→43', () => {
    let s = roll(track(ready(), 'P1-1', 28), [3, 1]);
    s = engine.applyAction(s, engine.legalActions(s).find(a => a.value === 3)!);
    assert.equal(s.pieces[0].position, trackId(31));
    assert.ok(engine.legalActions(s).every(a => a.kind === 'corner_jump'));
    s = engine.applyAction(s, engine.legalActions(s)[0]);
    assert.equal(s.pieces[0].position, trackId(43));
});
test('T16/T19/Q1: corner cycle +48, priority after lap, skipped entry', () => {
    let s = roll(track(ready(), 'P1-1', 31, 30), [1, 1]);
    const seq = engine.legalSequencesForRoll(s)[0];
    assert.deepEqual(seq.map(a => a.to), [43, 7, 19, 31].map(trackId));
    s = engine.applySequence(s, seq);
    assert.equal(s.pieces[0].outerSteps, 78);
    assert.equal(s.pieces[0].status, 'track');
    let q = roll(track(ready(), 'P1-1', 43, 90), [1, 2]);
    const a = engine.legalActions(q).find(a => a.value === 1)!;
    assert.equal(a.kind, 'corner_jump');
    q = engine.applyAction(q, a);
    assert.equal(q.pieces[0].position, trackId(7));
    assert.equal(q.pieces[0].homeIndex, null);
});
test('T17/T18/T20: blocked jump, other jump mandatory over home, corner capture', () => {
    let s = track(track(track(ready(), 'P1-1', 31), 'P1-2', 43), 'P1-3', 7);
    home(s, 'P1-4', 1);
    track(s, 'P2-1', 19);
    const actions = engine.legalActions(roll(s, [1, 2]));
    assert.ok(actions.every(a => a.kind === 'corner_jump'));
    assert.ok(actions.some(a => a.to === trackId(19) && a.captureIds[0] === 'P2-1'));
    assert.ok(!actions.some(a => a.pieceId === 'P1-1'));
    // Block both available jump destinations: ordinary unit moves now permitted.
    Object.assign(s.pieces.find(p => p.id === 'P2-1')!, { status: 'reserve', position: null, outerSteps: 0, homeIndex: null, finishedSlot: null });
    track(s, 'P1-5', 19);
    assert.ok(engine.candidates(s, 1).some(a => a.kind === 'move' && a.pieceId === 'P1-4'));
});
test('T21/T22/Q3: entry after lap, internal path, occupied own entry blocks', () => {
    let s = roll(track(ready(), 'P1-1', 46, 45), [3, 2]);
    s = engine.applyAction(s, engine.legalActions(s).find(a => a.value === 3)!);
    assert.equal(s.pieces[0].homeIndex, 0);
    s = engine.applyAction(s, engine.legalActions(s)[0]);
    assert.equal(s.pieces[0].position, geometry.homes[1][2]);
    const q = track(track(ready(), 'P1-1', 46, 45), 'P1-2', 1);
    assert.ok(!engine.candidates(q, 3).some(a => a.pieceId === 'P1-1'));
    home(q, 'P1-2', 2);
    assert.ok(engine.candidates(q, 4).some(a => a.pieceId === 'P1-1'));
    assert.ok(!engine.candidates(q, 5).some(a => a.pieceId === 'P1-1'));
});
test('T23/T24/T25/Q7: movable home pieces, exact actions, contiguous freeze', () => {
    let s = ready();
    home(s, 'P1-1', 2);
    home(s, 'P1-2', 1);
    s = roll(s, [1, 1]);
    const seq = engine.legalSequencesForRoll(s).find(seq => seq.map(a => a.pieceId).join(',') === 'P1-1,P1-2,P1-1,P1-2')!;
    assert.ok(seq);
    s = engine.applySequence(s, seq);
    assert.equal(s.pieces[0].status, 'finished');
    assert.equal(s.pieces[1].status, 'finished');
    assert.equal(s.pieces[1].homeIndex, 3);
    assert.ok(!engine.candidates(s, 1).some(a => a.pieceId === 'P1-1'));
    const q = home(ready(), 'P1-1', 2);
    assert.ok(!engine.candidates(q, 5).length);
    assert.ok(engine.candidates(q, 2).some(a => a.pieceId === 'P1-1'));
    const t = home(home(ready(), 'P1-1', 3), 'P1-2', 2);
    assert.equal(t.pieces[0].status, 'home');
});
test('T26: fifth piece finishes on common start atomically', () => {
    let s = ready();
    for (let i = 1; i <= 4; i++)
        home(s, `P1-${i}`, 5 - i, true);
    track(s, 'P1-5', 48, 47);
    s = roll(s, [1, 2]);
    s = engine.applyAction(s, engine.legalActions(s).find(a => a.value === 1)!);
    assert.equal(s.winner, 1);
    assert.equal(s.phase, 'game_over');
    assert.equal(s.eventLog.at(-2)?.type, 'roll_finished');
    assert.equal(s.pieces[4].position, trackId(1));
    assert.throws(() => engine.roll(s, [6, 6]));
    assert.throws(() => engine.finishRoll(s));
    engine.assertInvariants(s);
});
test('T27: opponent internal home protected', () => {
    const s = track(home(ready(), 'P2-1', 1), 'P1-1', 13, 12);
    assert.ok(engine.candidates(s, 1).every(a => a.to !== geometry.homes[2][1]));
});
test('T28/T29: replay exact state, tampering fails even if chain recomputed', () => {
    let s = ready();
    s = roll(s, [6, 6]);
    s = engine.applySequence(s, engine.legalSequencesForRoll(s)[0]);
    s = engine.finishRoll(s);
    const replay = engine.replay(importLog(exportLog(s)));
    assert.equal(stateHash(replay), stateHash(s));
    assert.equal(canonical(replay), canonical(s));
    const tampered = JSON.parse(JSON.stringify(s.eventLog));
    tampered[2].payload.dice = [1, 1];
    assert.throws(() => engine.replay(tampered));
    const truncated = s.eventLog.slice(0, s.eventLog.findIndex(e => e.type === 'extra_roll'));
    assert.throws(() => engine.replay(truncated));
});
test('T30: invalid sequence rejected without state mutation', () => {
    const s = roll(ready(), [6, 3]);
    const before = canonical(s);
    assert.throws(() => engine.applySequence(s, []));
    assert.equal(canonical(s), before);
});
test('Property: generated play preserves invariants, deterministic seed and priority-tier maximum', () => {
    fc.assert(fc.property(fc.string({ maxLength: 15 }), seed => {
        const rng = seeded(seed);
        let s = ready();
        for (let i = 0; i < 12 && !s.winner; i++) {
            s = roll(s, [rng.die(), rng.die()]);
            const seqs = engine.legalSequencesForRoll(s);
            const points = sum(seqs[0]);
            assert.ok(seqs.every(seq => sum(seq) === points));
            s = engine.applySequence(s, seqs[Math.floor(rng.next() * seqs.length)]);
            engine.assertInvariants(s);
            if (!s.winner)
                s = engine.finishRoll(s);
        }
    }), { numRuns: 25, seed: 20261011 });
    assert.deepEqual(Array.from({ length: 20 }, () => secure.die()).filter(d => d < 1 || d > 6), []);
    const a = seeded('repeat'), b = seeded('repeat');
    assert.deepEqual(Array.from({ length: 20 }, () => a.die()), Array.from({ length: 20 }, () => b.die()));
});
test('Cache detects mutable input changes and generated candidates are immutable', () => {
    const s = roll(ready(), [6, 3]);
    const legal = engine.legalSequencesForRoll(s);
    assert.throws(() => { legal[0][0].to = 'М48'; });
    track(s, 'P1-1', 1);
    const newLegal = engine.legalSequencesForRoll(s);
    assert.notEqual(newLegal, legal);
    assert.ok(!newLegal.some(seq => seq[0].kind === 'deploy'));
});
test('Series numbering advances without any game-rule limit', () => {
    let s = ready();
    for (let i = 1; i <= 20; i++) {
        s = roll(s, [2, 2]);
        assert.equal(s.currentRoll!.rollSequenceNumber, i);
        s = engine.applySequence(s, engine.legalSequencesForRoll(s)[0]);
        if (s.winner)
            break;
        s = engine.finishRoll(s);
        assert.equal(s.activePlayer, 1);
    }
});
