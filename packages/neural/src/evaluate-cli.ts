import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Engine, parseGeometry, exportLog, stateHash, hash } from '../../engine/src/index';
import { seeded } from '../../engine/src/rng';
import { resolveAgentRoll, agentIdentity, neuralScorer, type Strategy } from '../../agents/src/index';
import artifact from '../../agents/models/active-model.json' with { type: 'json' };
const args = process.argv.slice(2), arg = (name: string, fallback: string) => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; };
const pairs = Number(arg('--pairs', '24')), dir = arg('--output', 'artifacts/ai-v01/tournaments'), seedPrefix = arg('--seed-prefix', 'control-v01');
if (!Number.isInteger(pairs) || pairs < 1 || pairs > 100)
    throw Error('Control budget: 1..100 pairs per opponent');
mkdirSync(`${dir}/journals`, { recursive: true });
const engine = new Engine(parseGeometry(readFileSync('data/igra_64_koordinaty.csv', 'utf8')));
const corpus = JSON.parse(readFileSync(`${arg('--data', 'artifacts/ai-v01/data')}/manifest.json`, 'utf8'));
if (artifact.training.datasetHash !== corpus.datasetHash)
    throw Error('Model/corpus checksum mismatch');
if (corpus.episodes.some((e: {
    seed: string | null;
}) => e.seed?.startsWith(seedPrefix)))
    throw Error('Control seed leaked into corpus');
const checkpointHash = hash(artifact), outcomes: any[] = [];
for (const opponent of ['random', 'greedy', 'tactical'] as Strategy[])
    for (let i = 0; i < pairs; i++)
        for (const leg of [0, 1]) {
            const seed = `${seedPrefix}-${opponent}-${i}`, bots: Strategy[] = leg === 0 ? ['ai-v0.1', opponent] : [opponent, 'ai-v0.1'];
            const neuralSeat = leg === 0 ? 1 : 2, dice = seeded(seed + ':dice'), agentRng = seeded(seed + ':baseline');
            let s = engine.create([1, 2], `${seed}-leg${leg}`, seed, undefined, { 1: agentIdentity(bots[0]), 2: agentIdentity(bots[1]) });
            while (s.phase === 'initial_roll')
                s = engine.initialRoll(s, Object.fromEntries(s.initialContenders.map(p => [p, dice.die()])));
            const first = s.activePlayer;
            let error: string | null = null;
            const start = performance.now();
            try {
                while (!s.winner && s.rollCount < 3000) {
                    s = engine.roll(s, [dice.die(), dice.die()]);
                    s = resolveAgentRoll(engine, s, bots[s.activePlayer - 1], agentRng);
                    engine.assertInvariants(s);
                    if (!s.winner)
                        s = engine.finishRoll(s, agentIdentity(bots[s.activePlayer - 1]));
                }
            }
            catch (e) {
                error = (e as Error).message;
            }
            const result = { seed, gameId: s.gameId, opponent, leg, neuralSeat, firstPlayer: first, neuralStarted: first === neuralSeat, winner: s.winner, neuralWin: s.winner === neuralSeat, rolls: s.rollCount, error, outcome: s.winner && !error ? 'win' : 'unfinished', stateHash: stateHash(s), seconds: (performance.now() - start) / 1000, modelHash: checkpointHash };
            // Retain every control party, not just the winner, for audit and later evaluation.
            writeFileSync(`${dir}/journals/${opponent}-${i}-${leg}.jsonl`, exportLog(s));
            if (i === 0) {
                const replay = engine.replay(s.eventLog);
                if (stateHash(replay) !== result.stateHash)
                    throw Error('Neural control replay mismatch');
            }
            outcomes.push(result);
            writeFileSync(`${dir}/results.json`, JSON.stringify(outcomes, null, 2));
            if (leg === 1 && (i + 1) % 4 === 0)
                console.log(`${opponent}: ${i + 1}/${pairs} paired seeds`);
        }
const summary = Object.fromEntries(['random', 'greedy', 'tactical'].map(opponent => {
    const rows = outcomes.filter(r => r.opponent === opponent), wins = rows.filter(r => r.neuralWin).length;
    const pairRates = Array.from({ length: pairs }, (_, i) => rows.filter(r => r.seed === `${seedPrefix}-${opponent}-${i}`).filter(r => r.neuralWin).length / 2);
    const rng = seeded(`bootstrap-v01-${opponent}`), bootstrap = Array.from({ length: 2000 }, () => Array.from({ length: pairs }, () => pairRates[Math.floor(rng.next() * pairs)]).reduce((a, b) => a + b, 0) / pairs).sort((a, b) => a - b);
    return [opponent, { games: rows.length, neuralWins: wins, opponentWins: rows.filter(r => r.winner !== null && !r.neuralWin).length, unfinished: rows.filter(r => r.outcome === 'unfinished').length, neuralWinPercent: wins / rows.length * 100, pairedBootstrap95: [bootstrap[50] * 100, bootstrap[1949] * 100], neuralAtP1: rows.filter(r => r.neuralSeat === 1).length, neuralAtP2: rows.filter(r => r.neuralSeat === 2).length, neuralFirst: rows.filter(r => r.neuralStarted).length, neuralSecond: rows.filter(r => !r.neuralStarted).length, averageRolls: rows.reduce((n, r) => n + r.rolls, 0) / rows.length }];
}));
const report = { schemaVersion: 'neural-controls-v1', modelVersion: neuralScorer.version, modelHash: checkpointHash, datasetHash: corpus.datasetHash, rulesVersion: 'v1', geometryHash: hash(engine.geometry), pairsPerOpponent: pairs, seedPrefix, conditions: 'same paired dice seed, swapped physical seats, unchanged initial lottery, deterministic neural inference; baselines share the same per-pair choice stream', summary };
writeFileSync(`${dir}/summary.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (outcomes.some(r => r.outcome !== 'win'))
    process.exitCode = 2;
