import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import checkpoint from '../packages/agents/models/shashbesh-v0.1.json' with { type: 'json' };
import { engine, geometry, ready } from './helpers';
import { encode, encodePublic, decisions } from '../packages/training/src/index';
import { actionVectors, compact, forwardMlp, createScorer, selectAction, type ModelArtifact } from '../packages/neural/src/index';
import { validateRecord, assertDisjoint } from '../packages/neural/src/integrity';
import { promotionDecision, promote, monitor, rollback, modelFingerprint, validateSelfPlayBudget, type ModelRegistry, type PromotionEvidence } from '../packages/neural/src/lifecycle';
import { resolveAgentRoll, neuralScorer } from '../packages/agents/src/index';
import { seeded } from '../packages/engine/src/rng';
import { canonical } from '../packages/engine/src/index';
const model = checkpoint as ModelArtifact;
test('Public numerical features match existing encoder; future outcomes/after-state cannot enter model input', () => {
    let s = engine.roll(ready(), [6, 3]);
    s = engine.applyAction(s, engine.legalActions(s)[0], { kind: 'agent', id: 'tactical', version: 'baseline-v1' });
    const r = Array.from(decisions(engine, s.eventLog))[0], x = encode(r, geometry), vectors = compact(x, geometry);
    assert.equal(vectors[0].length, model.architecture.inputDim);
    assert.deepEqual(vectors, actionVectors(r.before, r.legalActions, geometry));
    const poisoned = structuredClone(r);
    poisoned.result.winner = 2;
    poisoned.result.reward = -1;
    poisoned.after.pieces = [];
    assert.deepEqual(compact(encode(poisoned, geometry), geometry), vectors);
    assert.equal('seedMetadata' in r.before, false);
    assert.equal('result' in encodePublic(r.before, r.legalActions, geometry), false);
    assert.throws(() => assertDisjoint({ train: ['party'], validation: [], test: ['party'] }));
});
test('Corpus rejects incomplete outcomes, illegal masks and false after-states', () => {
    const raw = readFileSync('tests/fixtures/neural-decision.json', 'utf8');
    const r = JSON.parse(raw);
    validateRecord(engine, r);
    const noOutcome = structuredClone(r);
    noOutcome.result.status = 'unfinished';
    assert.throws(() => validateRecord(engine, noOutcome));
    const badMask = structuredClone(r);
    badMask.legalActions = [{ pieceId: 'P1-1', kind: 'move', value: 1, from: null, to: 'М99', path: ['М99'], captureIds: [] }];
    assert.throws(() => validateRecord(engine, badMask));
    const badAfter = structuredClone(r);
    badAfter.after.pieces[0].outerSteps += 1;
    assert.throws(() => validateRecord(engine, badAfter));
    const badDice = structuredClone(r);
    badDice.dice = [1, 1];
    assert.throws(() => validateRecord(engine, badDice));
});
test('Exported model agrees with NumPy oracle and fails closed for incompatible model or invalid score', () => {
    const oracle = JSON.parse(readFileSync('tests/fixtures/neural-oracle.json', 'utf8'));
    oracle.vectors.forEach((v: number[], i: number) => assert.ok(Math.abs(forwardMlp(model, v) - oracle.scores[i]) < 1e-5));
    const bad = structuredClone(model);
    bad.weights.w1.pop();
    assert.throws(() => createScorer(bad));
    const old = structuredClone(model);
    old.rulePolicyHash = 'wrong';
    assert.throws(() => createScorer(old));
    const s = engine.roll(ready(), [6, 3]), legal = engine.legalActions(s);
    assert.ok(legal.includes(selectAction(neuralScorer, s, legal, geometry)!));
    assert.throws(() => selectAction({ ...neuralScorer, score: () => [NaN] }, s, legal, geometry));
    assert.equal(selectAction(neuralScorer, s, [], geometry), null);
});
test('Neural rollout uses only maximal legal prefixes and keeps invariants for 2–4 players', () => {
    for (const players of [[1, 2], [1, 2, 3], [1, 2, 3, 4]] as const) {
        const values = Object.fromEntries(players.map((p, i) => [p, 6 - i]));
        let s = engine.initialRoll(engine.create([...players]), values);
        const rng = seeded(`neural-test-${players.length}`);
        for (let i = 0; i < 12 && !s.winner; i++) {
            s = engine.roll(s, [rng.die(), rng.die()]);
            s = resolveAgentRoll(engine, s, 'ai-v0.1', rng);
            engine.assertInvariants(s);
            if (!s.winner) {
                assert.equal(engine.legalActions(s).length, 0);
                s = engine.finishRoll(s);
            }
        }
        assert.ok(s.eventLog.filter(e => e.type === 'action').every(e => e.decisionMaker?.id === 'ai-v0.1'));
    }
});
test('Promotion and regression rollback require independent balanced controls; inconclusive monitoring does not roll back', () => {
    const base = { version: 'old', checksum: modelFingerprint(model), path: 'old.json', parent: null, datasetHash: model.training.datasetHash };
    const registry: ModelRegistry = { schemaVersion: 'shashbesh-model-registry-v1', active: 'old', previous: null, versions: [base], history: [] };
    const evidence: PromotionEvidence = { candidateVersion: 'new', championVersion: 'old', pairedSeeds: Array.from({ length: 24 }, (_, i) => `fresh-${i}`), wins: 44, losses: 4, timeouts: 0, illegalActions: 0, heldoutNonforcedAccuracy: .6, championHeldoutNonforcedAccuracy: .6 };
    assert.equal(promotionDecision({ ...evidence, wins: 24, losses: 24 }).accept, false);
    assert.equal(promotionDecision({ ...evidence, illegalActions: 1 }).accept, false);
    const next = promote(registry, { ...base, version: 'new', parent: 'old' }, evidence);
    assert.equal(next.active, 'new');
    assert.equal(next.previous, 'old');
    assert.equal(monitor(next, { ...evidence, wins: 24, losses: 24 }), next);
    assert.equal(monitor(next, { ...evidence, wins: 4, losses: 44 }).active, 'old');
    assert.equal(rollback(next, 'manual').active, 'old');
    assert.throws(() => validateSelfPlayBudget({ games: 100, maxRolls: 1500, temperature: 1, maxWallSeconds: 60, maxRamMiB: 384, seedPrefix: 's', modelVersion: 'v', parentVersion: 'v' }, 3000));
});
test('Local rollback restores exact previous weights and registry pointer', () => {
    const root = mkdtempSync(join(tmpdir(), 'shashbesh-registry-'));
    try {
        const old = { ...model, modelVersion: 'fixture-old' }, next = { ...model, modelVersion: 'fixture-new' };
        const oldPath = join(root, 'old.json'), nextPath = join(root, 'new.json');
        writeFileSync(oldPath, JSON.stringify(old));
        writeFileSync(nextPath, JSON.stringify(next));
        const registry: ModelRegistry = { schemaVersion: 'shashbesh-model-registry-v1', active: 'fixture-new', previous: 'fixture-old', versions: [{ version: 'fixture-old', checksum: modelFingerprint(old), path: oldPath, parent: null, datasetHash: model.training.datasetHash }, { version: 'fixture-new', checksum: modelFingerprint(next), path: nextPath, parent: 'fixture-old', datasetHash: model.training.datasetHash }], history: [] };
        writeFileSync(join(root, 'registry.json'), JSON.stringify(registry));
        writeFileSync(join(root, 'active-model.json'), JSON.stringify(next));
        execFileSync(process.execPath, ['--import', 'tsx', 'packages/neural/src/registry-cli.ts', '--root', root, '--operation', 'rollback']);
        assert.equal(JSON.parse(readFileSync(join(root, 'registry.json'), 'utf8')).active, 'fixture-old');
        assert.equal(canonical(JSON.parse(readFileSync(join(root, 'active-model.json'), 'utf8'))), canonical(old));
    }
    finally {
        rmSync(root, { recursive: true, force: true });
    }
});
test('Checkpoint is frozen for a rollout and a scorer cannot expand the legal mask', () => {
    const mutable = structuredClone(model), scorer = createScorer(mutable), state = engine.roll(ready(), [6, 3]), legal = engine.legalActions(state);
    const before = scorer.score(state, legal, geometry);
    mutable.weights.w1.fill(100);
    assert.deepEqual(scorer.score(state, legal, geometry), before);
    assert.throws(() => selectAction({ ...neuralScorer, score: (_s, mask) => { mask.push(mask[0]); return mask.map(() => 0); } }, state, legal, geometry));
});
test('Promotion archives an immutable checkpoint independently of the experimental candidate file', () => {
    const root = mkdtempSync(join(tmpdir(), 'shashbesh-promotion-'));
    try {
        const old = { ...model, modelVersion: 'archive-old' }, candidate = { ...model, modelVersion: 'archive-new' }, oldPath = join(root, 'old.json'), scratch = join(root, 'candidate.json');
        writeFileSync(oldPath, JSON.stringify(old));
        writeFileSync(scratch, JSON.stringify(candidate));
        const registry: ModelRegistry = { schemaVersion: 'shashbesh-model-registry-v1', active: 'archive-old', previous: null, versions: [{ version: 'archive-old', checksum: modelFingerprint(old), path: oldPath, parent: null, datasetHash: model.training.datasetHash }], history: [] };
        writeFileSync(join(root, 'registry.json'), JSON.stringify(registry));
        const evidence: PromotionEvidence = { candidateVersion: 'archive-new', championVersion: 'archive-old', pairedSeeds: Array.from({ length: 24 }, (_, i) => `archive-${i}`), wins: 44, losses: 4, timeouts: 0, illegalActions: 0, heldoutNonforcedAccuracy: .6, championHeldoutNonforcedAccuracy: .6 };
        const evidencePath = join(root, 'evidence.json');
        writeFileSync(evidencePath, JSON.stringify(evidence));
        execFileSync(process.execPath, ['--import', 'tsx', 'packages/neural/src/registry-cli.ts', '--root', root, '--operation', 'promote', '--candidate', scratch, '--evidence', evidencePath]);
        const promoted = JSON.parse(readFileSync(join(root, 'registry.json'), 'utf8')) as ModelRegistry, archive = promoted.versions.find(v => v.version === 'archive-new')!.path;
        assert.notEqual(archive, scratch);
        writeFileSync(scratch, '{}');
        assert.equal(canonical(JSON.parse(readFileSync(archive, 'utf8'))), canonical(candidate));
    }
    finally {
        rmSync(root, { recursive: true, force: true });
    }
});
