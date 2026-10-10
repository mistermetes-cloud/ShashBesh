import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { Board } from '../apps/web/src/Board';
import { engine, geometry, ready } from './helpers';
import { simulate, tournament } from '../packages/tournament/src/index';
import { stateHash, hash, canonical } from '../packages/engine/src/index';
import { choose, observe } from '../packages/agents/src/index';
import { seeded } from '../packages/engine/src/rng';
import type { Strategy } from '../packages/agents/src/index';
test('T28: completed game replay restores winner and hash', () => {
    const game = simulate(engine, 'replay-complete', ['greedy', 'tactical']);
    assert.equal(game.outcome, 'win');
    const replay = engine.replay(game.state.eventLog);
    assert.equal(replay.winner, game.winner);
    assert.equal(stateHash(replay), game.stateHash);
});
test('T29: recomputed chain cannot legitimize forged action', () => {
    let s = engine.roll(ready(), [6, 3]);
    s = engine.applySequence(s, engine.legalSequencesForRoll(s)[0]);
    s = engine.finishRoll(s);
    const events = structuredClone(s.eventLog);
    const action = events.find(e => e.type === 'action')!;
    (action.payload as {
        to: string;
    }).to = 'М48';
    let previous = '0'.repeat(64);
    for (const e of events) {
        e.prevHash = previous;
        const { hash: _, ...body } = e;
        e.hash = hash(body);
        previous = e.hash;
    }
    assert.throws(() => engine.replay(events));
});
test('T30: agents see public state and return only maximal sequences', () => {
    const s = engine.roll(ready(), [6, 6]), legal = engine.legalSequencesForRoll(s), obs = observe(s);
    assert.equal('eventLog' in obs, false);
    assert.equal('seedMetadata' in obs, false);
    for (const strategy of ['random', 'greedy', 'tactical'] as Strategy[]) {
        const seq = choose(strategy, obs, structuredClone(legal), seeded('agent'));
        assert.ok(legal.some(a => canonical(a) === canonical(seq)));
        engine.applySequence(s, seq);
    }
    assert.throws(() => engine.applySequence(s, [{ ...legal[0][0], to: 'М48' }]));
});
test('T31: 100 rotating-seats seeded simulations, wins or explicit timeout only', { timeout: 120000 }, () => {
    const report = tournament(engine, 100, 'acceptance-v1', ['random', 'greedy', 'tactical'], 2000);
    assert.equal(report.games, 100);
    assert.equal(report.results.length, 100);
    assert.equal(report.timeouts, 0);
    assert.ok(report.results.every(r => r.winner !== null && r.outcome === 'win'));
    const repeat = simulate(engine, 'acceptance-v1-0', ['random', 'greedy', 'tactical'], 2000);
    assert.equal(repeat.stateHash, report.results[0].stateHash);
});
test('Timeout diagnostics never invent a winner', () => {
    const result = simulate(engine, 'tiny-budget', ['random', 'greedy'], 1);
    assert.equal(result.outcome, 'timeout');
    assert.equal(result.winner, null);
});
test('T32: board renders 64 CSV cells and actual engine pieces', () => {
    let s = engine.roll(ready(), [6, 3]);
    s = engine.applyAction(s, engine.legalActions(s)[0]);
    const html = renderToStaticMarkup(createElement(Board, { geometry, state: s, actions: engine.legalActions(s), selected: null, onAction: () => { } }));
    assert.equal((html.match(/data-cell=/g) ?? []).length, 64);
    for (const c of geometry.cells)
        assert.ok(html.includes(`data-cell="${c.id}"`));
    for (const p of s.pieces.filter(p => p.position))
        assert.ok(html.includes(`title="${p.id}"`));
});
