import { Engine, stateHash } from '../../engine/src/index';
import { seeded } from '../../engine/src/rng';
import { resolveAgentRoll, agentIdentity } from '../../agents/src/index';
import type { ActionScorer } from './index';
import type { GameState } from '../../shared/src/index';
import type { PromotionEvidence } from './lifecycle';
/** Head-to-head evaluation adapter for candidate/champion versions. It never trains or promotes either model. */
export function compareModels(engine: Engine, candidate: ActionScorer, champion: ActionScorer, seeds: string[], accuracy: {
    candidate: number;
    champion: number;
}, onGame?: (s: GameState) => void): PromotionEvidence {
    if (seeds.length > 100 || new Set(seeds).size !== seeds.length)
        throw Error('Control resource budget or duplicate seeds');
    if (candidate.version === champion.version)
        throw Error('Distinct model versions required');
    let wins = 0, losses = 0, timeouts = 0, illegalActions = 0;
    for (const seed of seeds)
        for (const leg of [0, 1]) {
            const models = leg === 0 ? [candidate, champion] : [champion, candidate], seat = leg === 0 ? 1 : 2;
            const dice = seeded(seed + ':dice'), rng = seeded(seed + ':agent');
            let state = engine.create([1, 2], `compare-${seed}-${leg}`, seed, undefined, { 1: agentIdentity('ai-v0.1', models[0]), 2: agentIdentity('ai-v0.1', models[1]) });
            while (state.phase === 'initial_roll')
                state = engine.initialRoll(state, Object.fromEntries(state.initialContenders.map(p => [p, dice.die()])));
            try {
                while (!state.winner && state.rollCount < 3000) {
                    state = engine.roll(state, [dice.die(), dice.die()]);
                    const model = models[state.activePlayer - 1];
                    state = resolveAgentRoll(engine, state, 'ai-v0.1', rng, model);
                    engine.assertInvariants(state);
                    if (!state.winner)
                        state = engine.finishRoll(state, agentIdentity('ai-v0.1', model));
                }
            }
            catch {
                illegalActions++;
            }
            if (!state.winner)
                timeouts++;
            else if (state.winner === seat)
                wins++;
            else
                losses++;
            onGame?.(state);
        }
    return { candidateVersion: candidate.version, championVersion: champion.version, pairedSeeds: seeds, wins, losses, timeouts, illegalActions, heldoutNonforcedAccuracy: accuracy.candidate, championHeldoutNonforcedAccuracy: accuracy.champion };
}
