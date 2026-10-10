import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Engine, parseGeometry, hash, canonical, exportLog, importLog } from '../../engine/src/index';
import { decisions, encode, split, type DecisionRecord } from '../../training/src/index';
import { simulate } from '../../tournament/src/index';
import type { Strategy } from '../../agents/src/index';
import { validateRecord, assertDisjoint } from './integrity';
import { compact, FEATURE_VERSION } from './features';
const args = process.argv.slice(2), arg = (key: string, fallback: string) => { const i = args.indexOf(key); return i < 0 ? fallback : args[i + 1]; };
const count = Number(arg('--games', '64')), dir = arg('--output', 'artifacts/ai-v01/data');
if (!Number.isInteger(count) || count < 1 || count > 200)
    throw Error('Preparation budget: 1..200 games per explicit run');
mkdirSync(`${dir}/journals`, { recursive: true });
const geometry = parseGeometry(readFileSync('data/igra_64_koordinaty.csv', 'utf8')), engine = new Engine(geometry);
const output = `${dir}/compact.jsonl`;
writeFileSync(output, '');
writeFileSync(`${dir}/decisions.jsonl`, '');
writeFileSync(`${dir}/features-v1.jsonl`, '');
const groups = { train: [] as string[], validation: [] as string[], test: [] as string[] }, seen = new Map<string, string>(), digest = createHash('sha256');
const summary = { verifiedRecords: 0, tacticalRecords: 0, passRecords: 0, excludedNonTactical: 0, existingRecords: 0, existingFeaturesMatched: 0 };
const episodes: {
    gameId: string;
    seed: string | null;
    logHead: string;
    split: string;
    decisions: number;
    tacticalDecisions: number;
    source: string;
}[] = [];
function add(records: DecisionRecord[], source: string, seed: string | null, logHead: string) {
    if (!records.length)
        return;
    const gameId = records[0].gameId;
    if (seen.has(gameId)) {
        if (seen.get(gameId) !== logHead)
            throw Error('Conflicting game histories');
        return;
    }
    seen.set(gameId, logHead);
    const partition = split(gameId);
    groups[partition].push(gameId);
    let n = 0;
    const rawLines: string[] = [], oldFeatureLines: string[] = [], compactLines: string[] = [];
    for (const r of records) {
        const x = validateRecord(engine, r);
        summary.verifiedRecords++;
        if (source.startsWith('existing'))
            summary.existingRecords++;
        if (r.decisionKind === 'pass')
            summary.passRecords++;
        if (r.controller.kind !== 'agent' || r.controller.id !== 'tactical') {
            summary.excludedNonTactical++;
            continue;
        }
        n++;
        summary.tacticalRecords++;
        rawLines.push(canonical(r));
        oldFeatureLines.push(canonical({ ...x, split: partition }));
        const indices = [x.chosenIndex];
        // Reserve IDs are interchangeable only for deployment: retain the exact label and add proven equivalent deployment labels.
        if (r.selectedAction?.kind === 'deploy')
            for (let i = 0; i < r.legalActions.length; i++) {
                const a = r.legalActions[i];
                const { pieceId: _, ...body } = a, { pieceId: __, ...chosen } = r.selectedAction;
                if (i !== x.chosenIndex && canonical(body) === canonical(chosen) && r.before.pieces.find(p => p.id === a.pieceId)?.status === 'reserve')
                    indices.push(i);
            }
        compactLines.push(canonical({ gameId, decisionId: r.decisionId, split: partition, featureVersion: FEATURE_VERSION, candidates: compact(x, geometry), chosenIndex: x.chosenIndex, targetIndices: indices, reward: r.result.reward }));
    }
    for (const [path, lines] of [[`${dir}/decisions.jsonl`, rawLines], [`${dir}/features-v1.jsonl`, oldFeatureLines], [output, compactLines]] as [
        string,
        string[]
    ][]) {
        if (lines.length)
            appendFileSync(path, lines.join('\n') + '\n');
    }
    compactLines.forEach(line => digest.update(line + '\n'));
    episodes.push({ gameId, seed, logHead, split: partition, decisions: records.length, tacticalDecisions: n, source });
}
// Existing exported JSONL plus its original numeric representation are verified before any new generation.
const existing = 'artifacts/training/self-play.jsonl';
if (existsSync(existing)) {
    const records = readFileSync(existing, 'utf8').trim().split('\n').map(s => JSON.parse(s) as DecisionRecord);
    const sourceEvents = importLog(readFileSync('artifacts/training-self-play.jsonl', 'utf8'));
    const rebuilt = Array.from(decisions(engine, sourceEvents));
    if (canonical(records) !== canonical(rebuilt))
        throw Error('Existing exported records differ from verified source journal');
    const oldFeatures = readFileSync(`${existing}.features.jsonl`, 'utf8').trim().split('\n').map(s => JSON.parse(s));
    if (records.length !== oldFeatures.length)
        throw Error('Existing feature length mismatch');
    records.forEach((r, i) => {
        const x = validateRecord(engine, r);
        const { split: _, ...old } = oldFeatures[i];
        if (canonical(x) !== canonical(old))
            throw Error('Existing numerical features differ');
        summary.existingFeaturesMatched++;
    });
    add(records, 'existing-exported-jsonl', null, records[0].provenance.logHead);
}
for (const [path, report] of [['artifacts/acceptance-first.jsonl', 'artifacts/acceptance-100.json'], ['artifacts/smoke.jsonl', 'artifacts/smoke.json']] as const) {
    if (!existsSync(path) || !existsSync(report))
        continue;
    const events = importLog(readFileSync(path, 'utf8')), info = JSON.parse(readFileSync(report, 'utf8')).results[0];
    const controllers = Object.fromEntries(info.strategies.map((id: string, i: number) => [i + 1, { kind: 'agent' as const, id, version: 'baseline-v1' }]));
    add(Array.from(decisions(engine, events, { controllers })), `existing-journal:${path}`, info.seed, events.at(-1)!.hash);
}
const layouts: Strategy[][] = [['tactical', 'tactical'], ['tactical', 'random'], ['tactical', 'greedy'], ['tactical', 'tactical', 'tactical'], ['tactical', 'greedy', 'random'], ['tactical', 'tactical', 'tactical', 'tactical']];
const start = performance.now();
for (let i = 0; i < count; i++) {
    const seed = `teacher-v01-${i}`, layout = layouts[i % layouts.length], rotation = i % layout.length, bots = [...layout.slice(rotation), ...layout.slice(0, rotation)];
    const game = simulate(engine, seed, bots, 3000);
    if (game.outcome !== 'win')
        throw Error(`Incomplete teacher game ${seed}: ${game.diagnostic}`);
    writeFileSync(`${dir}/journals/${i}.jsonl`, exportLog(game.state));
    add(Array.from(decisions(engine, game.state.eventLog)), 'generated-tactical', seed, game.state.eventLog.at(-1)!.hash);
    if ((i + 1) % 8 === 0)
        console.log(`${i + 1}/${count}: ${summary.tacticalRecords} verified Tactical decisions`);
}
assertDisjoint(groups);
const counts = Object.fromEntries(['train', 'validation', 'test'].map(p => [p, episodes.filter(e => e.split === p).reduce((n, e) => n + e.tacticalDecisions, 0)]));
if (Object.values(counts).some(n => n === 0))
    throw Error('Empty Tactical split; increase preparation budget');
const manifest = { schemaVersion: 'ai-corpus-v1', featureVersion: FEATURE_VERSION, geometryHash: hash(geometry), rulePolicyHash: hash(engine.create().rulePolicy), rulesVersion: 'v1', teacher: 'tactical@baseline-v1', datasetHash: digest.digest('hex'), generatedGames: count, groups, counts, summary, episodes, elapsedSeconds: (performance.now() - start) / 1000, controls: { trainingSeed: 20261009, simulationSeedPrefix: 'teacher-v01', tournamentSeedPrefix: 'control-v01' } };
writeFileSync(`${dir}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ ...manifest, episodes: undefined }, null, 2));
