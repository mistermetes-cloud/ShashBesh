import { hash, POLICY, LEGACY_POLICY } from '../../engine/src/index';
import type { Action, Geometry } from '../../shared/src/index';
import type { PublicEncodingState } from '../../training/src/index';
import { actionVectors, FEATURE_VERSION } from './features';
export * from './features';
export interface ModelArtifact {
    schemaVersion: 'shashbesh-model-v1';
    modelVersion: string;
    status: 'trained';
    rulesVersion: 'v1';
    rulePolicyHash: string;
    geometryHash: string;
    featureVersion: string;
    architecture: {
        kind: 'mlp-tanh-v1';
        inputDim: number;
        hiddenDim: number;
    };
    weights: {
        w1: number[];
        b1: number[];
        w2: number[];
        b2: number;
    };
    training: {
        seed: number;
        config: Record<string, unknown>;
        datasetHash: string;
        metrics: Record<string, unknown>;
    };
}
export interface ActionScorer {
    id: string;
    version: string;
    score(state: PublicEncodingState, actions: Action[], geometry: Geometry): number[];
}
/** Replace this scorer with a future architecture; the agent/engine contract remains a legal-action mask. */
export function createScorer(inputModel: ModelArtifact): ActionScorer {
    const model = structuredClone(inputModel);
    const { inputDim, hiddenDim, kind } = model.architecture;
    if (!Number.isInteger(inputDim) || !Number.isInteger(hiddenDim) || inputDim < 1 || hiddenDim < 1 || hiddenDim > 1024)
        throw Error('Invalid neural architecture');
    if (model.status !== 'trained' || model.schemaVersion !== 'shashbesh-model-v1' || model.rulesVersion !== 'v1' || model.featureVersion !== FEATURE_VERSION || kind !== 'mlp-tanh-v1' || ![hash(POLICY),hash(LEGACY_POLICY)].includes(model.rulePolicyHash))
        throw Error('Unsupported neural model');
    const { w1, b1, w2, b2 } = model.weights;
    if (w1.length !== inputDim * hiddenDim || b1.length !== hiddenDim || w2.length !== hiddenDim || ![...w1, ...b1, ...w2, b2].every(Number.isFinite))
        throw Error('Invalid model weights');
    const forward = (x: number[]) => forwardMlp(model, x);
    return { id: 'ai-v0.1', version: model.modelVersion, score(state, actions, geometry) {
            if (hash(geometry) !== model.geometryHash)
                throw Error('Model geometry mismatch');
            return actionVectors(state, actions, geometry).map(forward);
        } };
}
export function selectAction(scorer: ActionScorer, state: PublicEncodingState, legal: Action[], geometry: Geometry): Action | null {
    if (!legal.length)
        return null;
    const allowed = Object.freeze([...legal]) as unknown as Action[];
    const scores = scorer.score(state, allowed, geometry);
    if (scores.length !== legal.length || !scores.every(Number.isFinite))
        throw Error('Invalid neural scores');
    let best = 0;
    for (let i = 1; i < scores.length; i++)
        if (scores[i] > scores[best])
            best = i;
    return allowed[best];
}
export function forwardMlp(model: ModelArtifact, x: number[]) {
    const { inputDim, hiddenDim } = model.architecture;
    const { w1, b1, w2, b2 } = model.weights;
    if (x.length !== inputDim || !x.every(Number.isFinite))
        throw Error('Invalid neural input');
    let output = b2;
    for (let j = 0; j < hiddenDim; j++) {
        let z = b1[j];
        for (let i = 0; i < inputDim; i++)
            z += x[i] * w1[i * hiddenDim + j];
        output += Math.tanh(z) * w2[j];
    }
    return output;
}
