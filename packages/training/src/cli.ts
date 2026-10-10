import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Engine, parseGeometry, importLog, canonical, hash } from '../../engine/src/index';
import { decisions, encode, split, type DatasetOptions } from './index';
const args = process.argv.slice(2);
const arg = (name: string, fallback: string) => {
    const i = args.indexOf(name);
    if (i < 0)
        return fallback;
    if (!args[i + 1] || args[i + 1].startsWith('--'))
        throw Error(`Missing ${name}`);
    return args[i + 1];
};
const input = arg('--input', '');
if (!input)
    throw Error('Usage: npm run dataset -- --input game.jsonl --output dataset.jsonl [--metadata metadata.json]');
const output = arg('--output', 'artifacts/dataset.jsonl'), metadata = arg('--metadata', '');
const options: DatasetOptions = metadata ? JSON.parse(readFileSync(metadata, 'utf8')) : {};
const engine = new Engine(parseGeometry(readFileSync(new URL('../../../data/igra_64_koordinaty.csv', import.meta.url), 'utf8')));
const events = importLog(readFileSync(input, 'utf8')), records = Array.from(decisions(engine, events, options));
mkdirSync(resolve(output, '..'), { recursive: true });
writeFileSync(output, records.map(canonical).join('\n'));
writeFileSync(`${output}.features.jsonl`, records.map(r => canonical({ ...encode(r, engine.geometry), split: split(r.gameId) })).join('\n'));
writeFileSync(`${output}.manifest.json`, JSON.stringify({ schemaVersion: 'shashbesh-dataset-manifest-v1', rulesVersion: 'v1', geometry: engine.geometry, geometryHash: hash(engine.geometry), records: records.length, sourceLogHead: events.at(-1)!.hash, gameId: events[0].gameId, split: split(events[0].gameId), featureVersion: 'shashbesh-features-v1', result: records[0]?.result ?? null }, null, 2));
console.log(JSON.stringify({ output, records: records.length, features: `${output}.features.jsonl` }));
