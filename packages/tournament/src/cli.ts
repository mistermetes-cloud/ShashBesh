import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Engine, parseGeometry, exportLog } from '../../engine/src/index';
import { simulate, tournament } from './index';
import { strategies, type Strategy } from '../../agents/src/index';
const args = process.argv.slice(2);
const value = (name: string, fallback: string) => { const index = args.indexOf(name); return index < 0 ? fallback : args[index + 1]; };
const count = Number(value('--games', '10')), maxRolls = Number(value('--max-rolls', '5000')), seed = value('--seed', 'shashbesh-v1');
const bots = value('--agents', 'random,greedy,tactical').split(',') as Strategy[];
if (!Number.isInteger(count) || count < 1 || !Number.isInteger(maxRolls) || maxRolls < 1 || bots.length < 2 || bots.length > 4 || bots.some(b => !strategies.includes(b)))
    throw Error('Неверные параметры турнира');
const engine = new Engine(parseGeometry(readFileSync(new URL('../../../data/igra_64_koordinaty.csv', import.meta.url), 'utf8')), { clock: () => new Date().toISOString(), timeSource: 'wall' });
const report = tournament(engine, count, seed, bots, maxRolls);
const output = value('--output', 'artifacts/tournament.json');
mkdirSync(resolve(output, '..'), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2));
const replayPath = value('--replay', '');
if (replayPath) {
    mkdirSync(resolve(replayPath, '..'), { recursive: true });
    writeFileSync(replayPath, exportLog(simulate(engine, `${seed}-0`, bots, maxRolls).state));
}
const { results, ...summary } = report;
console.log(JSON.stringify({ ...summary, output }, null, 2));
if (report.timeouts || report.errors)
    process.exitCode = 2;
