import type { Action, GameEvent, Player } from '../../shared/src/index';
export interface RoomView {
    id: string;
    name: string;
    capacity: number;
    hostPlayer: Player;
    players: {
        id: Player;
        name: string;
        online: boolean;
    }[];
    gameId: string | null;
    status: 'lobby' | 'playing' | 'finished';
}
export interface Membership {
    room: RoomView;
    playerId: Player;
    token: string;
}
export interface Command {
    type: 'command';
    requestId: string;
    operation: 'start' | 'roll' | 'action' | 'finish' | 'undo';
    expectedHead: string | null;
    action?: Action;
}
export type ServerFrame = {
    type: 'snapshot';
    version?:number;
    headHash?:string|null;
    legalActions?:Action[];
    room: RoomView;
    events: GameEvent[];
} | {
    type: 'events';
    version?:number;
    legalActions?:Action[];
    room: RoomView;
    fromSeq: number;
    events: GameEvent[];
    headHash: string;
} | {
    type: 'room';
    room: RoomView;
} | {
    type: 'ack';
    requestId: string;
    duplicate: boolean;
} | {
    type: 'error';
    requestId?: string;
    message: string;
};
export interface LanHost {
    name: string;
    url: string;
}
