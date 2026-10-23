export type Player = 1 | 2 | 3 | 4;
export type Phase = 'initial_roll' | 'await_roll' | 'resolving_roll' | 'game_over';
export interface RulePolicy {
    jumpEntry: 'skip';
    victory: 'atomic';
    homeFreeze: 'contiguous-tail';
    cornerPriority: 'per-unit' | 'absolute';
    capturePriority?: 'mandatory' | 'optional';
    cornerLanding?: 'automatic' | 'ordinary';
    cornerContinuation?: 'same-piece-if-legal-otherwise-transfer' | 'any-piece';
    cornerObstruction?: 'whole-path';
    cornerJumpConsumes?: 'one-die';
}
export interface Piece {
    id: string;
    owner: Player;
    status: 'reserve' | 'track' | 'home' | 'finished';
    position: string | null;
    outerSteps: number;
    homeIndex: number | null;
    finishedSlot: number | null;
}
export interface Action {
    pieceId: string;
    kind: 'deploy' | 'move' | 'corner_jump';
    value: number;
    from: string | null;
    to: string;
    path: string[];
    captureIds: string[];
    jump?: {from:string;to:string;path:string[]};
}
export interface Roll {
    id: number;
    dice: [
        number,
        number
    ];
    remainingActions: number[];
    extraRoll: boolean;
    rollSequenceNumber: number;
    usedPoints: number;
    forcedPieceId?:string;
}
export interface ControllerIdentity {
    kind: 'human' | 'agent' | 'unknown';
    id: string;
    version: string | null;
}
export interface GameEvent {
    // Optional only for reading legacy v1 journals. Every newly written v2 event has these fields.
    journalVersion?: 2;
    eventId?: string;
    gameNumber?: string;
    timestamp?: string;
    timeSource?: 'logical' | 'wall';
    decisionMaker?: ControllerIdentity;
    seq: number;
    gameId: string;
    rollId: number | null;
    actor: Player | null;
    type: string;
    payload: unknown;
    prevHash: string;
    hash: string;
}
export interface PreservedRoll {
    dice: [
        number,
        number
    ];
    sourceSeq: number;
    sourceRollId: number;
}
export interface GameState {
    pendingRolls?: PreservedRoll[];
    gameId: string;
    rulesVersion: 'v1';
    rulePolicy: RulePolicy;
    players: Player[];
    turnOrder: Player[];
    activePlayer: Player;
    phase: Phase;
    initialContenders: Player[];
    currentRoll: Roll | null;
    rollCount: number;
    rollSeriesCount: number;
    pieces: Piece[];
    winner: Player | null;
    seedMetadata: string | null;
    eventLog: GameEvent[];
}
export interface Cell {
    id: string;
    x: number;
    y: number;
    outer: number | null;
    owner: Player | null;
    homeIndex: number | null;
}
export interface Geometry {
    cells: Cell[];
    homes: Record<number, string[]>;
    starts: Record<number, number>;
    corners: number[];
}
