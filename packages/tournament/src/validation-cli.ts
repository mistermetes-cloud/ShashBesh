import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { Engine, parseGeometry, exportLog, canonical, hash } from '../../engine/src/index';
import { combinations, summarize, validateGame, type ValidationResult } from './validation';
const args = process.argv.slice(2);
const arg = (key: string, fallback: string) => {
    const i = args.indexOf(key);
    if (i < 0)
        return fallback;
    if (!args[i + 1] || args[i + 1].startsWith('--'))
        throw Error(`Missing ${key}`);
    return args[i + 1];
};
const count = Number(arg('--games', '1000')), maxRolls = Number(arg('--max-rolls', '5000')), seed = arg('--seed', 'validation-v2'), dir = arg('--output', 'artifacts/validation-1000');
if (!Number.isInteger(count) || count < 1 || !Number.isInteger(maxRolls) || maxRolls < 1)
    throw Error('Invalid limits');
mkdirSync(`${dir}/suspicious`, { recursive: true });
const engine = new Engine(parseGeometry(readFileSync(new URL('../../../data/igra_64_koordinaty.csv', import.meta.url), 'utf8')), { clock: () => new Date().toISOString(), timeSource: 'wall' });
const combos = combinations(), results: ValidationResult[] = args.includes('--resume') && existsSync(`${dir}/results.json`) ? JSON.parse(readFileSync(`${dir}/results.json`, 'utf8')) : [];
if (results.length > count || results.some((r, i) => r.seed !== `${seed}-${i}` || canonical(r.strategies) !== canonical(combos[i % combos.length])))
    throw Error('Checkpoint parameters mismatch');
if (args.includes('--resume') && existsSync(`${dir}/summary.json`)) {
    const previous = JSON.parse(readFileSync(`${dir}/summary.json`, 'utf8'));
    if (previous.seed !== seed || previous.maxRolls !== maxRolls || previous.rulesVersion !== 'v1')
        throw Error('Checkpoint run settings mismatch');
}
for (let i = results.length; i < count; i++) {
    const gameSeed = `${seed}-${i}`, bots = combos[i % combos.length];
    const { result, state } = validateGame(engine, gameSeed, bots, maxRolls, i < combos.length);
    results.push(result);
    if (result.suspiciousReasons.length) {
        writeFileSync(`${dir}/suspicious/game-${i}.jsonl`, exportLog(state));
        writeFileSync(`${dir}/suspicious/game-${i}.json`, JSON.stringify({ ...result, maxRolls, rulesVersion: 'v1', rulePolicy: state.rulePolicy, replayFile: `game-${i}.jsonl` }, null, 2));
    }
    // Checkpoint survives an interrupted batch and records every reproduction seed.
    if ((i + 1) % 25 === 0 || i + 1 === count) {
        writeFileSync(`${dir}/results.json`, JSON.stringify(results, null, 2));
        console.log(`${i + 1}/${count} games; ${results.filter(r => r.outcome === 'win').length} completed`);
    }
}
const report = { schemaVersion: 'simulation-report-v1', rulesVersion: 'v1', geometryHash: hash(engine.geometry), schedule: 'all-117-ordered-lineups-cycled', rulePolicy: engine.create().rulePolicy, seed, maxRolls, definitions: { turn: 'one player series including extra rolls', roll: 'one pair of dice', agentWinPercent: 'wins / occupied player seats', seatEffect: 'descriptive, stratified by player count; not causal' }, ...summarize(results) };
writeFileSync(`${dir}/summary.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, combinations: undefined }, null, 2));
if (report.completed < count)
    process.exitCode = 2;
