import { Engine, canonical, eventId, hash, activeEvents, logicalTime } from '../../engine/src/index';
import type { Action, ControllerIdentity, GameEvent, GameState, Geometry, Piece, Player, RulePolicy } from '../../shared/src/index';
export type BoardSnapshot = Omit<GameState, 'eventLog' | 'seedMetadata'>;
export type GameMode = 'human-human' | 'human-ai' | 'ai-ai' | 'self-play' | 'unknown';
export interface DecisionRecord {
    schemaVersion: 'shashbesh-decision-v1';
    decisionId: string;
    gameId: string;
    eventSeq: number;
    rollId: number;
    mode: GameMode;
    actor: Player;
    controller: ControllerIdentity;
    before: BoardSnapshot;
    dice: [
        number,
        number
    ];
    decisionKind: 'action' | 'pass';
    legalActions: Action[];
    selectedAction: Action | null;
    after: BoardSnapshot;
    captures: {
        pieceId: string;
        owner: Player;
        before: Piece;
        after: Piece;
    }[];
    result: {
        status: 'completed' | 'timeout' | 'error' | 'unfinished';
        winner: Player | null;
        actorOutcome: 'win' | 'loss' | 'unknown';
        reward: 1 | -1 | null;
    };
    provenance: {
        eventHash: string;
        logHead: string;
        geometryHash: string;
        rulesVersion: 'v1';
        rulePolicy: RulePolicy;
        participants?: Partial<Record<Player, ControllerIdentity>>;
    };
}
export interface DatasetOptions {
    controllers?: Partial<Record<Player, ControllerIdentity>>;
    termination?: 'timeout' | 'error' | 'unfinished';
}
const snapshot = (s: GameState): BoardSnapshot => { const { eventLog, seedMetadata, ...rest } = s; return structuredClone(rest); };
function mode(controllers: ControllerIdentity[]): GameMode {
    if (controllers.some(c => c.kind === 'unknown'))
        return 'unknown';
    if (controllers.every(c => c.kind === 'human'))
        return 'human-human';
    if (controllers.every(c => c.kind === 'agent'))
        return new Set(controllers.map(c => `${c.id}@${c.version}`)).size === 1 ? 'self-play' : 'ai-ai';
    return 'human-ai';
}
/** Validates the source journal before yielding any training records. Labels use the final verified outcome. */
export function* decisions(engine: Engine, events: GameEvent[], options: DatasetOptions = {}): Generator<DecisionRecord> {
    const final = engine.replay(events);
    const retained = new Set(activeEvents(events).map(e => e.seq));
    const init = events[0].payload as {
        players: Player[];
        gameId: string;
        seedMetadata: string | null;
        rulePolicy: RulePolicy;
        participants?: Partial<Record<Player, ControllerIdentity>>;
    };
    const effective: Partial<Record<Player, ControllerIdentity>> = { ...init.participants, ...options.controllers };
    for (const e of events)
        if (e.decisionMaker && e.actor && !effective[e.actor] && e.decisionMaker)
            effective[e.actor] = e.decisionMaker;
    const unknown = (p: Player): ControllerIdentity => ({ kind: 'unknown', id: `P${p}`, version: null });
    const participants = Object.fromEntries(final.players.map(p => [p, effective[p] ?? unknown(p)])) as Record<Player, ControllerIdentity>;
    const logHead = events.at(-1)!.hash, geometryHash = hash(engine.geometry);
    // Audit metadata does not enter board snapshots; transitions are reconstructed sequentially, never from stored snapshots.
    const walker = new Engine(engine.geometry, { journalVersion: events[0].journalVersion === 2 ? 2 : 1, timeSource: events[0].timeSource ?? 'logical', clock: (id, seq) => events[seq]?.timestamp ?? logicalTime(id, seq) });
    let state = walker.create(init.players, init.gameId, init.seedMetadata, init.rulePolicy, init.participants);
    while (state.eventLog.length < events.length) {
        const e = events[state.eventLog.length];
        if (e.type === 'undo_action') {
            state = walker.undoAction(state, e.actor!, e.decisionMaker!);
            continue;
        }
        if (e.type === 'initial_roll') {
            state = walker.initialRoll(state, (e.payload as {
                values: Record<number, number>;
            }).values);
            continue;
        }
        if (e.type === 'dice_roll') {
            state = walker.roll(state, (e.payload as {
                dice: [
                    number,
                    number
                ];
            }).dice);
            continue;
        }
        if (e.type === 'roll_finished' && (e.payload as {
            usedPoints: number;
        }).usedPoints !== 0) {
            state = walker.finishRoll(state, e.decisionMaker);
            continue;
        }
        if (e.type !== 'action' && e.type !== 'roll_finished')
            throw Error(`Unsupported training event ${e.type}`);
        const actor = state.activePlayer, controller = e.decisionMaker?.kind !== 'unknown' && e.decisionMaker ? e.decisionMaker : options.controllers?.[actor] ?? e.decisionMaker ?? unknown(actor);
        participants[actor] = controller;
        const before = snapshot(state), dice = [...state.currentRoll!.dice] as [
            number,
            number
        ];
        const legalActions = structuredClone(walker.legalActions(state)), selectedAction = e.type === 'action' ? structuredClone(e.payload as Action) : null;
        if (selectedAction ? !legalActions.some(a => canonical(a) === canonical(selectedAction)) : legalActions.length !== 0)
            throw Error('Invalid training label');
        state = selectedAction ? walker.applyAction(state, selectedAction, controller) : walker.finishRoll(state, controller);
        if (!retained.has(e.seq))
            continue;
        const after = snapshot(state), winner = final.winner;
        yield {
            schemaVersion: 'shashbesh-decision-v1', decisionId: e.eventId ?? eventId(e.gameId, e.seq), gameId: e.gameId, eventSeq: e.seq, rollId: e.rollId!, mode: mode(Object.values(participants)), actor, controller: structuredClone(controller), before, dice, decisionKind: selectedAction ? 'action' : 'pass', legalActions, selectedAction, after,
            captures: (selectedAction?.captureIds ?? []).map(id => { const p = before.pieces.find(p => p.id === id)!; return { pieceId: id, owner: p.owner, before: p, after: after.pieces.find(p => p.id === id)! }; }),
            result: { status: winner ? 'completed' : options.termination ?? 'unfinished', winner, actorOutcome: winner ? (winner === actor ? 'win' : 'loss') : 'unknown', reward: winner ? (winner === actor ? 1 : -1) : null },
            provenance: { eventHash: e.hash, logHead, geometryHash, rulesVersion: final.rulesVersion, rulePolicy: { ...final.rulePolicy } }
        };
    }
}
export const exportDataset = (engine: Engine, events: GameEvent[], options: DatasetOptions = {}) => Array.from(decisions(engine, events, options), canonical).join('\n');
export interface TrainingExample {
    featureVersion: 'shashbesh-features-v1';
    gameId: string;
    decisionId: string;
    // 20 fixed slots (P1-1..P4-5), each: active owner, 5-way status, 65-way physical position, progress, home index.
    pieces: number[][];
    playerMask: number[];
    activePlayer: number[];
    dice: number[][];
    remainingValues: number[];
    // Variable candidate axis for a pointer policy: [piece slot, kind, nominal, target cell, capture bitmask].
    candidates: number[][];
    chosenIndex: number;
    valueTarget: number | null;
}
export type PublicEncodingState = Pick<GameState, 'pieces' | 'players' | 'activePlayer' | 'currentRoll'>;
export function encodePublic(state: PublicEncodingState, actions: Action[], geometry: Geometry) {
    if (!state.currentRoll)
        throw Error('Encoding requires a current roll');
    const positions = new Map(geometry.cells.map((c, i) => [c.id, i]));
    const oneHot = (i: number, n: number) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0);
    const index = (id: string) => {
        const match = /^P([1-4])-([1-5])$/.exec(id);
        if (!match)
            throw Error('Invalid piece ID');
        return (Number(match[1]) - 1) * 5 + Number(match[2]) - 1;
    };
    const pieces = Array.from({ length: 20 }, (_, i) => {
        const p = state.pieces.find(p => index(p.id) === i);
        if (!p)
            return [0, ...oneHot(4, 5), ...Array(65).fill(0), 0, -1];
        const status = ['reserve', 'track', 'home', 'finished'].indexOf(p.status);
        return [p.owner === state.activePlayer ? 1 : 0, ...oneHot(status, 5), ...oneHot(p.position === null ? 64 : positions.get(p.position)!, 65), p.outerSteps / 48, p.homeIndex === null ? -1 : p.homeIndex / 4];
    });
    const candidates = actions.map(a => [index(a.pieceId), ['deploy', 'move', 'corner_jump'].indexOf(a.kind), a.value, positions.get(a.to)!, ...Array.from({ length: 20 }, (_, i) => a.captureIds.some(id => index(id) === i) ? 1 : 0)]);
    if (!actions.length)
        candidates.push([-1, 3, 0, -1, ...Array(20).fill(0)]);
    return { pieces, playerMask: [1, 2, 3, 4].map(p => state.players.includes(p as Player) ? 1 : 0), activePlayer: oneHot(state.activePlayer - 1, 4), dice: state.currentRoll.dice.map(d => oneHot(d - 1, 6)), remainingValues: [1, 2, 3, 4, 5, 6].map(v => state.currentRoll!.remainingActions.filter(n => n === v).length), candidates };
}
export function encode(record: DecisionRecord, geometry: Geometry): TrainingExample {
    if (record.provenance.geometryHash !== hash(geometry))
        throw Error('Geometry mismatch');
    const input = encodePublic(record.before, record.legalActions, geometry);
    const chosenIndex = record.decisionKind === 'pass' ? 0 : record.legalActions.findIndex(a => canonical(a) === canonical(record.selectedAction));
    if (chosenIndex < 0)
        throw Error('Selected action absent from mask');
    return { featureVersion: 'shashbesh-features-v1', gameId: record.gameId, decisionId: record.decisionId, ...input, chosenIndex, valueTarget: record.result.reward };
}
/** Split whole games, not individual decisions, to avoid leaking a game between train and validation. */
export function split(gameId: string): 'train' | 'validation' | 'test' { const bucket = parseInt(hash(gameId).slice(0, 8), 16) % 100; return bucket < 80 ? 'train' : bucket < 90 ? 'validation' : 'test'; }
