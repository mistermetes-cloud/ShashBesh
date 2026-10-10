import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createScorer, type ModelArtifact } from './index';
import { rollback, promote, monitor, modelFingerprint, type ModelRegistry, type PromotionEvidence } from './lifecycle';
const args = process.argv.slice(2), arg = (name: string, fallback: string) => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; };
const root = arg('--root', 'packages/agents/models'), operation = arg('--operation', 'rollback');
const registry = JSON.parse(readFileSync(`${root}/registry.json`, 'utf8')) as ModelRegistry;
let next: ModelRegistry;
if (operation === 'rollback')
    next = rollback(registry, arg('--reason', 'manual local rollback'));
else if (operation === 'monitor')
    next = monitor(registry, JSON.parse(readFileSync(arg('--evidence', ''), 'utf8')) as PromotionEvidence);
else if (operation === 'promote') {
    const path = arg('--candidate', ''), model = JSON.parse(readFileSync(path, 'utf8')) as ModelArtifact;
    createScorer(model);
    const checksum = modelFingerprint(model), archive = resolve(root, 'versions', `${checksum}.json`);
    next = promote(registry, { version: model.modelVersion, checksum, path: archive, parent: registry.active, datasetHash: model.training.datasetHash }, JSON.parse(readFileSync(arg('--evidence', ''), 'utf8')));
    if (next !== registry) {
        mkdirSync(resolve(root, 'versions'), { recursive: true });
        if (existsSync(archive)) {
            if (modelFingerprint(JSON.parse(readFileSync(archive, 'utf8'))) !== checksum)
                throw Error('Archive checksum conflict');
        }
        else
            writeFileSync(archive, JSON.stringify(model));
    }
}
else
    throw Error('Unknown registry operation');
if (next !== registry) {
    const selected = next.versions.find(v => v.version === next.active)!;
    const model = JSON.parse(readFileSync(selected.path, 'utf8')) as ModelArtifact;
    createScorer(model);
    if (modelFingerprint(model) !== selected.checksum)
        throw Error('Checkpoint checksum mismatch');
    copyFileSync(selected.path, `${root}/active-model.json`);
    writeFileSync(`${root}/registry.json`, JSON.stringify(next, null, 2));
}
console.log(JSON.stringify({ active: next.active, previous: next.previous, changed: next !== registry }, null, 2));
