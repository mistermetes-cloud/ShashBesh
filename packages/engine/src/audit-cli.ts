import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Engine, parseGeometry, importLog, checkpoint, verifyCheckpoint } from './index';
const args = process.argv.slice(2);
const arg = (key: string, fallback: string) => {
    const i = args.indexOf(key);
    if (i < 0)
        return fallback;
    if (!args[i + 1] || args[i + 1].startsWith('--'))
        throw Error(`Missing ${key}`);
    return args[i + 1];
};
const input = arg('--input', '');
if (!input)
    throw Error('Usage: npm run audit -- --input game.jsonl [--checkpoint checkpoint.json] [--output checkpoint.json]');
const events = importLog(readFileSync(input, 'utf8'));
const engine = new Engine(parseGeometry(readFileSync(new URL('../../../data/igra_64_koordinaty.csv', import.meta.url), 'utf8')));
const state = engine.replay(events), anchor = arg('--checkpoint', '');
if (anchor)
    verifyCheckpoint(events, JSON.parse(readFileSync(anchor, 'utf8')));
const result = checkpoint(events), output = arg('--output', '');
if (output) {
    mkdirSync(resolve(output, '..'), { recursive: true });
    writeFileSync(output, JSON.stringify(result, null, 2));
}
console.log(JSON.stringify({ ...result, winner: state.winner, verified: true }, null, 2));
