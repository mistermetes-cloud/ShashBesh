import { Engine, canonical, hash, POLICY } from '../../engine/src/index';
import { encode, split, type DecisionRecord, type BoardSnapshot } from '../../training/src/index';
import type { GameState } from '../../shared/src/index';
export function validateRecord(engine: Engine, r: DecisionRecord) {
    if (r.before.phase !== 'resolving_roll' || r.before.winner !== null || r.before.rulesVersion !== 'v1' || r.provenance.rulesVersion !== 'v1')
        throw Error('Decision outside a supported active roll');
    if (r.result.winner && !r.before.players.includes(r.result.winner))
        throw Error('Outcome winner outside player roster');
    if (r.result.actorOutcome !== (r.actor === r.result.winner ? 'win' : 'loss'))
        throw Error('Inconsistent actor outcome');
    if (r.schemaVersion !== 'shashbesh-decision-v1' || r.result.status !== 'completed' || !r.result.winner || r.result.reward !== (r.actor === r.result.winner ? 1 : -1))
        throw Error('Completed outcome missing or inconsistent');
    if (r.gameId !== r.before.gameId || r.gameId !== r.after.gameId || r.actor !== r.before.activePlayer || canonical(r.dice) !== canonical(r.before.currentRoll?.dice))
        throw Error('Inconsistent decision identity/dice');
    if (r.provenance.geometryHash !== hash(engine.geometry) || canonical(r.before.rulePolicy) !== canonical(POLICY))
        throw Error('Dataset geometry/policy mismatch');
    const before: GameState = { ...structuredClone(r.before), seedMetadata: null, eventLog: [] };
    engine.assertInvariants(before);
    if (canonical(engine.legalActions(before)) !== canonical(r.legalActions))
        throw Error('Legal mask differs from engine');
    const after = r.selectedAction ? engine.applyAction(before, r.selectedAction) : engine.finishRoll(before);
    engine.assertInvariants(after);
    const { eventLog, seedMetadata, ...snapshot } = after;
    if (canonical(snapshot) !== canonical(r.after))
        throw Error('After-state differs from engine');
    const captures = (r.selectedAction?.captureIds ?? []).map(id => ({ pieceId: id, owner: before.pieces.find(p => p.id === id)!.owner, before: before.pieces.find(p => p.id === id)!, after: after.pieces.find(p => p.id === id)! }));
    if (canonical(captures) !== canonical(r.captures))
        throw Error('Capture labels differ');
    return encode(r, engine.geometry);
}
export function assertDisjoint(groups: {
    train: string[];
    validation: string[];
    test: string[];
}) {
    const seen = new Set<string>();
    for (const ids of Object.values(groups))
        for (const id of ids) {
            if (seen.has(id))
                throw Error('Game split overlap');
            seen.add(id);
        }
}
