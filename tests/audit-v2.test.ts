import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engine, geometry } from './helpers';
import { Engine, verifyChain, hash, stateHash, checkpoint, verifyCheckpoint } from '../packages/engine/src/index';
import type { GameEvent } from '../packages/shared/src/index';
function rehash(events: GameEvent[]) {
    let previous = '0'.repeat(64);
    for (const e of events) {
        e.prevHash = previous;
        const { hash: _, ...body } = e;
        e.hash = hash(body);
        previous = e.hash;
    }
    return events;
}
test('Journal v2 event identity, game number, wall timestamp, decision controller and replay', () => {
    const clock = (_id: string, seq: number) => new Date(Date.UTC(2026, 9, 9) + seq * 1000).toISOString();
    const e = new Engine(geometry, { clock, timeSource: 'wall' });
    let s = e.initialRoll(e.create([1, 2], 'game-42'), { 1: 6, 2: 2 });
    s = e.roll(s, [6, 3]);
    s = e.applyAction(s, e.legalActions(s)[0], { kind: 'human', id: 'anonymous-1', version: null });
    assert.ok(s.eventLog.every(ev => ev.journalVersion === 2 && ev.gameNumber === 'game-42' && ev.timestamp === clock('game-42', ev.seq)));
    assert.equal(new Set(s.eventLog.map(ev => ev.eventId)).size, s.eventLog.length);
    assert.equal(s.eventLog.at(-1)!.decisionMaker?.id, 'anonymous-1');
    assert.deepEqual(engine.replay(s.eventLog), s);
    assert.equal(stateHash(engine.replay(s.eventLog)), stateHash(s));
});
test('Audit rejects altered identity and malformed time even after malicious rehash', () => {
    const s = engine.create([1, 2], 'audit-tamper');
    const invalid = structuredClone(s.eventLog);
    invalid[0].timestamp = 'not-a-time';
    assert.throws(() => verifyChain(rehash(invalid)));
    const identity = structuredClone(s.eventLog);
    identity[0].eventId = 'forged';
    assert.throws(() => verifyChain(rehash(identity)));
    const gameNumber = structuredClone(s.eventLog);
    gameNumber[0].gameNumber = 'other';
    assert.throws(() => verifyChain(rehash(gameNumber)));
    const altered = structuredClone(s.eventLog);
    altered[0].timestamp = '2026-10-09T00:00:00.000Z';
    assert.throws(() => verifyChain(altered));
});
test('External checkpoint detects otherwise valid tail truncation; v1 journals still replay', () => {
    const legacy = new Engine(geometry, { journalVersion: 1 });
    let s = legacy.initialRoll(legacy.create([1, 2], 'legacy'), { 1: 6, 2: 1 });
    s = legacy.roll(s, [6, 3]);
    s = legacy.applySequence(s, legacy.legalSequencesForRoll(s)[0]);
    s = legacy.finishRoll(s);
    assert.ok(s.eventLog.every(e => e.journalVersion === undefined));
    assert.deepEqual(engine.replay(s.eventLog), s);
    const anchor = checkpoint(s.eventLog);
    verifyCheckpoint(s.eventLog, anchor);
    const prefix = s.eventLog.slice(0, 2);
    verifyChain(prefix);
    assert.throws(() => verifyCheckpoint(prefix, anchor));
});
