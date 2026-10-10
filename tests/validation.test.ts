import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engine, geometry } from './helpers';
import { Engine } from '../packages/engine/src/index';
import { combinations, metrics, summarize, validateGame } from '../packages/tournament/src/validation';
import { simulate } from '../packages/tournament/src/index';
test('Validation enumerates all 117 ordered agent lineups', () => {
    const pool = combinations();
    assert.equal(pool.length, 117);
    assert.equal(new Set(pool.map(p => p.join(','))).size, 117);
    for (const n of [2, 3, 4])
        assert.equal(pool.filter(p => p.length === n).length, 3 ** n);
    assert.ok(pool.some(p => p.every(s => s === 'random')));
});
test('Validation counts dice, series, captures and honest timeout reasons', () => {
    const game = simulate(engine, 'metrics-test', ['random', 'greedy'], 5), m = metrics(game);
    const rolls = game.state.eventLog.filter(e => e.type === 'dice_roll');
    assert.equal(rolls.length, game.rolls);
    assert.equal(m.doubles, rolls.filter(e => {
        const d = (e.payload as {
            dice: number[];
        }).dice;
        return d[0] === d[1];
    }).length);
    assert.equal(m.shashbesh, rolls.filter(e => {
        const d = (e.payload as {
            dice: number[];
        }).dice;
        return d[0] + d[1] === 11;
    }).length);
    assert.ok(m.turns <= game.rolls);
    assert.equal(game.outcome, 'timeout');
    assert.deepEqual(m.suspiciousReasons, ['roll_limit']);
    const { result } = validateGame(engine, 'timeout-save', ['random', 'random'], 1, true);
    const summary = summarize([result]);
    assert.equal(summary.completedPercent, 0);
    assert.equal(summary.unfinishedReasons.roll_limit, 1);
    assert.equal(summary.suspiciousGames, 1);
    assert.equal(summary.replayVerifiedGames, 1);
});
test('Agent rates use occupied seats and seat effects are stratified by count', () => {
    const { result } = validateGame(engine, 'rate-test', ['greedy', 'greedy'], 2000, true);
    assert.equal(result.outcome, 'win');
    const stats = summarize([result]);
    assert.equal(stats.completedPercent, 100);
    assert.equal(stats.agents.greedy.entries, 2);
    assert.equal(stats.agents.greedy.wins, 1);
    assert.equal(stats.agents.greedy.winPercentPerEntry, 50);
    assert.equal(stats.agents.greedy.winSharePercent, 100);
    assert.equal(Object.values(stats.seats).reduce((n, s) => n + s.wins, 0), 1);
    assert.equal(Object.values(stats.turnRanks).reduce((n, s) => n + s.wins, 0), 1);
    assert.ok(stats.turns.min > 0);
});
test('Engine or agent failure is diagnosed without inventing a winner', () => {
    class FailingEngine extends Engine {
        override applySequence(...args: Parameters<Engine['applySequence']>): ReturnType<Engine['applySequence']> { throw Error('injected agent failure'); }
    }
    const { result } = validateGame(new FailingEngine(geometry), 'error-path', ['random', 'greedy'], 5, true);
    assert.equal(result.outcome, 'error');
    assert.equal(result.winner, null);
    assert.equal(result.diagnostic, 'injected agent failure');
    assert.ok(result.suspiciousReasons.includes('engine_or_agent_error'));
    assert.equal(result.replayVerified, true);
});
