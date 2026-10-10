import { hash } from '../../engine/src/index';
import type { ModelArtifact } from './index';
export interface ModelVersion {
    version: string;
    checksum: string;
    path: string;
    parent: string | null;
    datasetHash: string;
}
export interface ModelRegistry {
    schemaVersion: 'shashbesh-model-registry-v1';
    active: string;
    previous: string | null;
    versions: ModelVersion[];
    history: {
        type: 'promote' | 'rollback';
        from: string;
        to: string;
        reason: string;
    }[];
}
export interface PromotionEvidence {
    candidateVersion: string;
    championVersion: string;
    pairedSeeds: string[];
    wins: number;
    losses: number;
    timeouts: number;
    illegalActions: number;
    heldoutNonforcedAccuracy: number;
    championHeldoutNonforcedAccuracy: number;
}
export function wilson(wins: number, total: number) {
    if (!total)
        return { low: 0, high: 1 };
    const z = 1.96, p = wins / total, den = 1 + z * z / total, center = (p + z * z / (2 * total)) / den, margin = z * Math.sqrt(p * (1 - p) / total + z * z / (4 * total * total)) / den;
    return { low: center - margin, high: center + margin };
}
export function promotionDecision(e: PromotionEvidence) {
    if (![e.wins, e.losses, e.timeouts, e.illegalActions].every(n => Number.isInteger(n) && n >= 0) || ![e.heldoutNonforcedAccuracy, e.championHeldoutNonforcedAccuracy].every(n => Number.isFinite(n) && n >= 0 && n <= 1))
        return { accept: false, reason: 'invalid_evidence' };
    const total = e.wins + e.losses;
    if (e.timeouts || e.illegalActions)
        return { accept: false, reason: 'safety_failure' };
    if (total !== e.pairedSeeds.length * 2 || new Set(e.pairedSeeds).size !== e.pairedSeeds.length || e.pairedSeeds.length < 24)
        return { accept: false, reason: 'insufficient_or_unbalanced_controls' };
    if (e.heldoutNonforcedAccuracy < e.championHeldoutNonforcedAccuracy - .02)
        return { accept: false, reason: 'heldout_regression' };
    // This is a conservative screen, not a claim that paired games are statistically independent.
    if (wilson(e.wins, total).low <= .5)
        return { accept: false, reason: 'no_confirmed_head_to_head_gain' };
    return { accept: true, reason: 'passed_control_gate' };
}
export function promote(registry: ModelRegistry, candidate: ModelVersion, e: PromotionEvidence): ModelRegistry {
    const decision = promotionDecision(e);
    if (!decision.accept)
        return registry;
    if (e.championVersion !== registry.active || e.candidateVersion !== candidate.version || registry.versions.some(v => v.version === candidate.version))
        throw Error('Registry/evaluation identity mismatch');
    return { ...registry, active: candidate.version, previous: registry.active, versions: [...registry.versions, candidate], history: [...registry.history, { type: 'promote', from: registry.active, to: candidate.version, reason: decision.reason }] };
}
export function rollback(registry: ModelRegistry, reason: string): ModelRegistry {
    if (!registry.previous)
        throw Error('No previous model to restore');
    return { ...registry, active: registry.previous, previous: registry.active, history: [...registry.history, { type: 'rollback', from: registry.active, to: registry.previous, reason }] };
}
export function monitor(registry: ModelRegistry, e: PromotionEvidence) {
    if (e.candidateVersion !== registry.active || e.championVersion !== registry.previous)
        throw Error('Monitoring version mismatch');
    if (e.timeouts || e.illegalActions)
        return rollback(registry, 'safety_regression');
    if (e.heldoutNonforcedAccuracy < e.championHeldoutNonforcedAccuracy - .02)
        return rollback(registry, 'heldout_regression');
    const total = e.wins + e.losses;
    if (e.pairedSeeds.length >= 24 && total === e.pairedSeeds.length * 2 && new Set(e.pairedSeeds).size === e.pairedSeeds.length && wilson(e.wins, total).high < .5)
        return rollback(registry, 'confirmed_head_to_head_regression');
    return registry;
}
export const modelFingerprint = (model: ModelArtifact) => hash(model);
export interface SelfPlayConfig {
    games: number;
    maxRolls: number;
    temperature: number;
    maxWallSeconds: number;
    maxRamMiB: number;
    seedPrefix: string;
    modelVersion: string;
    parentVersion: string;
}
export function validateSelfPlayBudget(config: SelfPlayConfig, availableRamMiB: number) {
    if (!Number.isInteger(config.games) || config.games < 1 || config.games > 16 || config.maxWallSeconds < 1 || config.maxWallSeconds > 120 || config.maxRamMiB > Math.min(512, availableRamMiB / 2) || config.temperature <= 0 || config.maxRolls < 1)
        throw Error('Self-play budget requires a new resource review');
}
