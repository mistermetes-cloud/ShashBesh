import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { freemem } from 'node:os';
import { Engine, parseGeometry, exportLog, canonical, hash } from '../../engine/src/index';
import { seeded } from '../../engine/src/rng';
import { neuralScorer, resolveAgentRoll, agentIdentity } from '../../agents/src/index';
import active from '../../agents/models/active-model.json' with { type: 'json' };
import { compact } from './features';
import { decisions, encode } from '../../training/src/index';
import type { ActionScorer } from './index';
import { validateSelfPlayBudget } from './lifecycle';
const args = process.argv.slice(2), arg = (name: string, fallback: string) => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; };
const config = { games: Number(arg('--games', '2')), maxRolls: 1500, temperature: 1, maxWallSeconds: 60, maxRamMiB: 384, seedPrefix: 'selfplay-v01-pilot', modelVersion: neuralScorer.version, parentVersion: neuralScorer.version, modelHash: hash(active) };
validateSelfPlayBudget(config, freemem() / 1024 / 1024);
const dir = arg('--output', 'artifacts/ai-v01/selfplay');
mkdirSync(dir, { recursive: true });
const engine = new Engine(parseGeometry(readFileSync('data/igra_64_koordinaty.csv', 'utf8'))), start = performance.now(), summaries: any[] = [];
function probabilities(scores: number[]) { const max = Math.max(...scores), weights = scores.map(s => Math.exp((s - max) / config.temperature)), sum = weights.reduce((a, b) => a + b, 0); return weights.map(w => w / sum); }
for (let i = 0; i < config.games; i++) {
    if ((performance.now() - start) / 1000 > config.maxWallSeconds || process.memoryUsage().rss / 1024 / 1024 > config.maxRamMiB)
        break;
    const seed = `${config.seedPrefix}-${i}`, dice = seeded(seed + ':dice'), policyRng = seeded(seed + ':policy');
    const sampling: ActionScorer = { ...neuralScorer, version: `${neuralScorer.version}/temperature=${config.temperature}`, score(state, legal, geometry) {
            const p = probabilities(neuralScorer.score(state, legal, geometry));
            let draw = policyRng.next(), chosen = p.length - 1;
            for (let j = 0; j < p.length; j++) {
                draw -= p[j];
                if (draw <= 0) {
                    chosen = j;
                    break;
                }
            }
            return p.map((_, j) => j === chosen ? 1 : 0);
        } };
    let state = engine.create([1, 2], seed, seed, undefined, { 1: agentIdentity('ai-v0.1', sampling), 2: agentIdentity('ai-v0.1', sampling) });
    while (state.phase === 'initial_roll')
        state = engine.initialRoll(state, Object.fromEntries(state.initialContenders.map(p => [p, dice.die()])));
    while (!state.winner && state.rollCount < config.maxRolls && (performance.now() - start) / 1000 < config.maxWallSeconds && process.memoryUsage().rss / 1024 / 1024 < config.maxRamMiB) {
        state = engine.roll(state, [dice.die(), dice.die()]);
        state = resolveAgentRoll(engine, state, 'ai-v0.1', policyRng, sampling);
        engine.assertInvariants(state);
        if (!state.winner)
            state = engine.finishRoll(state, agentIdentity('ai-v0.1', sampling));
    }
    writeFileSync(`${dir}/${i}.jsonl`, exportLog(state));
    const records = Array.from(decisions(engine, state.eventLog, { termination: 'timeout' }));
    const transitions = records.map(r => { const p = r.selectedAction ? probabilities(neuralScorer.score(r.before, r.legalActions, engine.geometry)) : [1]; const chosen = r.selectedAction ? r.legalActions.findIndex(a => canonical(a) === canonical(r.selectedAction)) : 0; return { schemaVersion: 'selfplay-transition-v1', decision: r, features: encode(r, engine.geometry), compactCandidates: compact(encode(r, engine.geometry), engine.geometry), behavior: { modelVersion: neuralScorer.version, modelHash: config.modelHash, temperature: config.temperature, probability: p[chosen], logProbability: Math.log(p[chosen]) }, terminalReward: r.result.reward }; });
    writeFileSync(`${dir}/${i}.transitions.jsonl`, transitions.map(canonical).join('\n'));
    summaries.push({ seed, winner: state.winner, outcome: state.winner ? 'completed' : 'budget_timeout', rolls: state.rollCount, transitions: transitions.length, wins: transitions.filter(t => t.terminalReward === 1).length, losses: transitions.filter(t => t.terminalReward === -1).length });
}
writeFileSync(`${dir}/manifest.json`, JSON.stringify({ schemaVersion: 'selfplay-pilot-v1', config, games: summaries, wallSeconds: (performance.now() - start) / 1000, peakObservedRssMiB: process.memoryUsage().rss / 1024 / 1024, trainingExecuted: false }, null, 2));
console.log(JSON.stringify(summaries, null, 2));
