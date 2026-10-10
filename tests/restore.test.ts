import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engine } from './helpers';
import { seeded } from '../packages/engine/src/rng';
import { restoreRng } from '../apps/web/src/random';
test('Restored seeded generators continue after actual dice; stored/reused rolls do not advance random stream', () => {
    const seed = 'restore-v03', dice = seeded(seed + ':dice'), agents = seeded(seed + ':agents');
    let s = engine.create([1, 2], 'restore', seed);
    while (s.phase === 'initial_roll')
        s = engine.initialRoll(s, Object.fromEntries(s.initialContenders.map(p => [p, dice.die()])));
    for (let i = 0; i < 8; i++) {
        s = engine.roll(s, [dice.die(), dice.die()]);
        s = engine.applySequence(s, engine.legalSequencesForRoll(s)[0], { kind: 'human', id: `h${s.activePlayer}`, version: null });
        s = engine.finishRoll(s);
    }
    const restored = restoreRng(seed, s.eventLog);
    assert.deepEqual(Array.from({ length: 12 }, () => restored.dice.die()), Array.from({ length: 12 }, () => dice.die()));
    assert.equal(restored.agents.next(), agents.next());
});
