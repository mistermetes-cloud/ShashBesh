import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { Engine, parseGeometry, exportLog } from '../../engine/src/index';
import { simulate } from './index';
import { strategies, type Strategy } from '../../agents/src/index';
const args = process.argv.slice(2);
const arg = (name: string, fallback: string) => {
    const i = args.indexOf(name);
    if (i < 0)
        return fallback;
    if (!args[i + 1] || args[i + 1].startsWith('--'))
        throw Error(`Missing ${name}`);
    return args[i + 1];
};
const metadataPath = arg('--metadata', '');
const metadata = metadataPath ? JSON.parse(readFileSync(metadataPath, 'utf8')) : {};
const batchPath = metadataPath ? resolve(dirname(metadataPath), '../summary.json') : '';
const batch = batchPath && existsSync(batchPath) ? JSON.parse(readFileSync(batchPath, 'utf8')) : {};
const seed = arg('--seed', metadata.seed ?? '');
if (!seed)
    throw Error('Provide --seed (exact game seed) or --metadata suspicious/game-N.json');
const bots = arg('--agents', metadata.strategies?.join(',') ?? 'random,greedy,tactical').split(',') as Strategy[];
const maxRolls = Number(arg('--max-rolls', String(metadata.maxRolls ?? batch.maxRolls ?? 5000)));
if (!Number.isInteger(maxRolls) || maxRolls < 1 || bots.length < 2 || bots.length > 4 || bots.some(b => !strategies.includes(b)))
    throw Error('Invalid reproduction parameters');
const engine = new Engine(parseGeometry(readFileSync(new URL('../../../data/igra_64_koordinaty.csv', import.meta.url), 'utf8')), { clock: () => new Date().toISOString(), timeSource: 'wall' });
const { state, ...result } = simulate(engine, seed, bots, maxRolls);
const output = arg('--output', 'artifacts/reproduced.jsonl');
mkdirSync(resolve(output, '..'), { recursive: true });
writeFileSync(output, exportLog(state));
const matchesExpectedState = metadata.stateHash ? metadata.stateHash === result.stateHash : null;
writeFileSync(`${output}.summary.json`, JSON.stringify({ ...result, rulesVersion: 'v1', rulePolicy: state.rulePolicy, maxRolls, matchesExpectedState }, null, 2));
console.log(JSON.stringify({ ...result, output, matchesExpectedState }, null, 2));
if (matchesExpectedState === false)
    process.exitCode = 1;
else if (result.outcome !== 'win')
    process.exitCode = 2;
