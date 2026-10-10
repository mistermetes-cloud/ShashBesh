import type { Action, GameState, Player, Geometry, ControllerIdentity } from '../../shared/src/index';
import type { Engine } from '../../engine/src/index';
import { canonical } from '../../engine/src/index';
import { createScorer, selectAction, type ActionScorer, type ModelArtifact } from '../../neural/src/index';
import checkpoint from '../models/active-model.json' with { type: 'json' };
import type { Rng } from '../../engine/src/rng';
export type Strategy = 'random' | 'greedy' | 'tactical' | 'ai-v0.1';
export const baselineStrategies: Strategy[] = ['random', 'greedy', 'tactical'];
export const strategies: Strategy[] = [...baselineStrategies, 'ai-v0.1'];
export const neuralScorer = createScorer(checkpoint as ModelArtifact);
/** Public board only: no log, seed, or random generator state is exposed to an agent. */
export type Observation = Pick<GameState, 'pieces' | 'activePlayer' | 'players' | 'currentRoll' | 'rulePolicy' | 'rulesVersion'>;
export const observe = (s: GameState): Observation => structuredClone({ pieces: s.pieces, activePlayer: s.activePlayer, players: s.players, currentRoll: s.currentRoll, rulePolicy: s.rulePolicy, rulesVersion: s.rulesVersion });
export function choose(strategy: Strategy, state: Observation, legal: Action[][], rng: Rng, geometry?: Geometry): Action[] {
    if (!legal.length)
        throw Error('Нет списка допустимых последовательностей');
    if (!strategies.includes(strategy))
        throw Error('Неизвестная стратегия');
    if (strategy === 'ai-v0.1') {
        if (!geometry)
            throw Error('Neural agent requires CSV geometry');
        const first = [...new Map(legal.filter(s => s.length).map(s => [canonical(s[0]), s[0]])).values()];
        const selected = selectAction(neuralScorer, state, first, geometry);
        return selected ? legal.find(s => canonical(s[0]) === canonical(selected))! : legal[0];
    }
    if (strategy === 'random')
        return legal[Math.floor(rng.next() * legal.length)];
    const score = (seq: Action[]) => {
        let n = 0;
        const own = new Map(state.pieces.filter(p => p.owner === state.activePlayer).map(p => [p.id, p]));
        for (const a of seq) {
            const piece = own.get(a.pieceId)!;
            n += a.kind === 'deploy' ? 8 : a.kind === 'corner_jump' ? 12 : a.value;
            if (a.to.startsWith('Д'))
                n += 24 + Number(a.to.split('-')[1]) * 4;
            if (strategy === 'tactical')
                n += a.captureIds.reduce((acc, id) => acc + 16 + (state.pieces.find(p => p.id === id)?.outerSteps ?? 0) * 0.35, 0);
            if (piece.outerSteps >= 40)
                n += a.value * 0.5;
        }
        if (strategy === 'tactical') {
            const ends = new Map(state.pieces.filter(p => p.owner === state.activePlayer && p.position).map(p => [p.id, p.position!]));
            for (const a of seq)
                ends.set(a.pieceId, a.to);
            for (const pos of ends.values())
                if (pos.startsWith('М')) {
                    const target = Number(pos.slice(1));
                    for (const enemy of state.pieces.filter(p => p.owner !== state.activePlayer && p.status === 'track')) {
                        const distance = (target - Number(enemy.position!.slice(1)) + 48) % 48;
                        if (distance > 0 && distance <= 6)
                            n -= 3;
                    }
                }
        }
        return n;
    };
    let best = -Infinity, choices: Action[][] = [];
    for (const seq of legal) {
        const n = score(seq);
        if (n > best) {
            best = n;
            choices = [];
        }
        if (n === best)
            choices.push(seq);
    }
    return choices[Math.floor(rng.next() * choices.length)];
}
export type Controllers = Partial<Record<Player, Strategy | 'human'>>;
export function agentIdentity(strategy: Strategy, scorer: ActionScorer = neuralScorer): ControllerIdentity {
    return strategy === 'ai-v0.1' ? { kind: 'agent', id: scorer.id, version: scorer.version } : { kind: 'agent', id: strategy, version: 'baseline-v1' };
}
/** Neural decisions are made one action at a time, with a fresh public state and maximal legal mask after every action. */
export function resolveAgentRoll(engine: Engine, state: GameState, strategy: Strategy, rng: Rng, scorer: ActionScorer = neuralScorer): GameState {
    const identity = agentIdentity(strategy, scorer);
    if (strategy !== 'ai-v0.1')
        return engine.applySequence(state, choose(strategy, observe(state), engine.legalSequencesForRoll(state), rng), identity);
    while (state.phase === 'resolving_roll') {
        const legal = engine.legalActions(state), action = selectAction(scorer, observe(state), legal, engine.geometry);
        if (!action)
            break;
        state = engine.applyAction(state, action, identity);
    }
    return state;
}
