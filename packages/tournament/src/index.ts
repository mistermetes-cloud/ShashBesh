import { Engine, stateHash, POLICY } from '../../engine/src/index';
import { seeded } from '../../engine/src/rng';
import { resolveAgentRoll, agentIdentity, baselineStrategies, type Strategy } from '../../agents/src/index';
import type { GameState, Player } from '../../shared/src/index';
export interface Simulation {
    seed: string;
    strategies: Strategy[];
    rolls: number;
    winner: Player | null;
    outcome: 'win' | 'timeout' | 'error';
    diagnostic: string | null;
    captures: number;
    jumps: number;
    usedPoints: number;
    stateHash: string;
    state: GameState;
}
export function simulate(engine: Engine, seed: string, bots: Strategy[] = baselineStrategies, maxRolls = 5000): Simulation {
    if (bots.length < 2 || bots.length > 4)
        throw Error('Нужно 2–4 агента');
    const players = bots.map((_, i) => (i + 1) as Player);
    const diceRng = seeded(seed + ':dice'), agentRng = seeded(seed + ':agents');
    let s = engine.create(players, `sim-${seed}`, seed, POLICY, Object.fromEntries(players.map(p => [p, agentIdentity(bots[p - 1])])));
    while (s.phase === 'initial_roll')
        s = engine.initialRoll(s, Object.fromEntries(s.initialContenders.map(p => [p, diceRng.die()])));
    let diagnostic: string | null = null;
    try {
        while (!s.winner && s.rollCount < maxRolls) {
            s = engine.roll(s, [diceRng.die(), diceRng.die()]);
            s = resolveAgentRoll(engine, s, bots[s.activePlayer - 1], agentRng);
            engine.assertInvariants(s);
            if (!s.winner)
                s = engine.finishRoll(s, agentIdentity(bots[s.activePlayer - 1]));
        }
    }
    catch (error) {
        diagnostic = (error as Error).message;
    }
    return { diagnostic: diagnostic ?? (s.winner ? null : 'roll_limit'), seed, strategies: bots, rolls: s.rollCount, winner: s.winner, outcome: diagnostic ? 'error' : s.winner ? 'win' : 'timeout', captures: s.eventLog.filter(e => e.type === 'capture').length, jumps: s.eventLog.filter(e => e.type === 'action' && (e.payload as {
            kind: string;
        }).kind === 'corner_jump').length, usedPoints: s.eventLog.filter(e => e.type === 'action').reduce((sum, e) => sum + (e.payload as {
            value: number;
        }).value, 0), stateHash: stateHash(s), state: s };
}
export function tournament(engine: Engine, count: number, seed: string, bots: Strategy[] = baselineStrategies, maxRolls = 5000) {
    const results: Omit<Simulation, 'state'>[] = [];
    const wins: Record<string, number> = {};
    for (let i = 0; i < count; i++) {
        // Rotate strategies across physical seats to reduce positional bias.
        const rotation = i % bots.length;
        const seats = [...bots.slice(rotation), ...bots.slice(0, rotation)];
        const { state, ...result } = simulate(engine, `${seed}-${i}`, seats, maxRolls);
        results.push(result);
        if (result.winner) {
            const name = seats[result.winner - 1];
            wins[name] = (wins[name] ?? 0) + 1;
        }
    }
    return { rulesVersion: 'v1', rulePolicy: engine.create().rulePolicy, seed, games: count, wins, timeouts: results.filter(r => r.outcome === 'timeout').length, errors: results.filter(r => r.outcome === 'error').length, averageRolls: results.reduce((n, r) => n + r.rolls, 0) / count, captures: results.reduce((n, r) => n + r.captures, 0), jumps: results.reduce((n, r) => n + r.jumps, 0), usedPoints: results.reduce((n, r) => n + r.usedPoints, 0), results };
}
