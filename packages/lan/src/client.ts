import { Engine } from '../../engine/src/index';
import type { GameEvent, GameState } from '../../shared/src/index';
import type { RoomView, Membership, Command, ServerFrame } from './protocol';
export interface ClientStatus {
    connected: boolean;
    busy: boolean;
    room: RoomView | null;
    state: GameState | null;
    error: string | null;
}
const id = () => { const b = new Uint8Array(16); crypto.getRandomValues(b); return Array.from(b, n => n.toString(16).padStart(2, '0')).join(''); };
export function baseUrl(value: string) { const u = new URL(value.includes('://') ? value : `http://${value}`); if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password)
    throw Error('Укажите HTTP адрес LAN узла'); return u.origin; }
export async function rooms(url: string) { const r = await fetch(baseUrl(url) + '/api/rooms'); if (!r.ok)
    throw Error('Узел не отвечает'); return await r.json() as RoomView[]; }
export async function register(url: string, body: {
    roomName?: string;
    capacity?: number;
    playerName: string;
}, roomId?: string) { const r = await fetch(baseUrl(url) + (roomId ? `/api/rooms/${encodeURIComponent(roomId)}/join` : '/api/rooms'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const result = await r.json(); if (!r.ok)
    throw Error(result.error ?? 'Ошибка подключения'); return result as Membership; }
export class RoomClient {
    private socket: WebSocket | null = null;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private stopped = false;
    private attempt = 0;
    private events: GameEvent[] = [];
    private finishAttemptHead: string | null = null;
    private pending = new Map<string, {
        command: Command;
        resolve: () => void;
        reject: (e: Error) => void;
    }>();
    status: ClientStatus = { connected: false, busy: false, room: null, state: null, error: null };
    constructor(readonly engine: Engine, readonly url: string, readonly membership: Membership, readonly update: (s: ClientStatus) => void) { }
    private emit() {
        this.status = { ...this.status, busy: this.pending.size > 0 };
        this.update(this.status);
        const state = this.status.state, head = this.events.at(-1)?.hash ?? null;
        if (!this.status.connected || this.status.busy || this.status.error || !state ||
            state.winner || state.phase !== 'resolving_roll' ||
            state.activePlayer !== this.membership.playerId || !head || this.finishAttemptHead === head) return;
        // Core may require a rule clarification; an empty/error UI is not permission to finish.
        try { if (this.engine.legalActions(state).length) return; }
        catch { return; }
        // Mark before command() emits busy, and never retry a rejected revision in a loop.
        this.finishAttemptHead = head;
        void this.command('finish').catch(() => { /* The normal command/error path reports failures. */ });
    }
    connect() {
        this.stopped = false;
        const endpoint = new URL(baseUrl(this.url));
        endpoint.protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:';
        endpoint.pathname = '/ws';
        const socket = new WebSocket(endpoint.toString());
        this.socket = socket;
        socket.onopen = () => socket.send(JSON.stringify({ type: 'hello', roomId: this.membership.room.id, token: this.membership.token, lastSeq: this.events.length - 1, lastHash: this.events.at(-1)?.hash ?? null }));
        socket.onmessage = e => {
            if(this.socket !== socket)return;
            try {
                const frame = JSON.parse(e.data) as ServerFrame;
                if ('room' in frame && frame.room.id !== this.membership.room.id)
                    throw Error('Снимок другой комнаты');
                if (frame.type === 'snapshot') {
                    if(frame.version!==undefined && (frame.version!==frame.events.length || frame.headHash!==(frame.events.at(-1)?.hash??null)))throw Error('Invalid state version');
                    const state = frame.events.length ? this.engine.replay(frame.events) : null;
                    if (state && state.gameId !== frame.room.gameId)
                        throw Error('Неверный идентификатор партии');
                    this.events = frame.events;
                    this.status = { ...this.status, state, room: frame.room, connected: true, error: null };
                    this.attempt = 0;
                    const retries = [...this.pending.values()];
                    this.emit();
                    for (const p of retries)
                        socket.send(JSON.stringify(p.command));
                    return;
                }
                if (frame.type === 'events') {
                    if (frame.fromSeq !== this.events.length) {
                        socket.send(JSON.stringify({ type: 'resync' }));
                        return;
                    }
                    const events = [...this.events, ...frame.events];
                    if(frame.version!==undefined && frame.version!==events.length)throw Error('Invalid state version');
                    if (events.at(-1)?.hash !== frame.headHash)
                        throw Error('Неверный хеш состояния узла');
                    const state = this.engine.replay(events);
                    this.events = events;
                    this.status = { ...this.status, state, room: frame.room, error: null };
                    this.emit();
                    return;
                }
                if (frame.type === 'room') {
                    this.status = { ...this.status, room: frame.room };
                    this.emit();
                    return;
                }
                if (frame.type === 'ack') {
                    const p = this.pending.get(frame.requestId);
                    this.pending.delete(frame.requestId);
                    p?.resolve();
                    this.emit();
                    return;
                }
                if (frame.type === 'error') {
                    const p = frame.requestId ? this.pending.get(frame.requestId) : undefined;
                    if (frame.requestId)
                        this.pending.delete(frame.requestId);
                    p?.reject(Error(frame.message));
                    this.status = { ...this.status, error: frame.message };
                    this.emit();
                    if (this.status.connected)
                        socket.send(JSON.stringify({ type: 'resync' }));
                }
            }
            catch (error) {
                this.status = { ...this.status, error: (error as Error).message };
                this.emit();
                socket.send(JSON.stringify({ type: 'resync' }));
            }
        };
        socket.onclose = () => { if (this.socket !== socket)
            return; this.status = { ...this.status, connected: false }; this.emit(); if (!this.stopped)
            this.timer = setTimeout(() => this.connect(), Math.min(10000, 500 * 2 ** this.attempt++)); };
        socket.onerror = () => { this.status = { ...this.status, error: 'Связь потеряна; выполняется переподключение' }; this.emit(); };
    }
    command(operation: Command['operation'], action?: Command['action']) {
        if (!this.status.connected || this.socket?.readyState !== WebSocket.OPEN)
            return Promise.reject(Error('Нет связи с авторитетным узлом'));
        if (this.pending.size)
            return Promise.reject(Error('Дождитесь подтверждения предыдущего действия'));
        const command: Command = { type: 'command', requestId: id(), operation, expectedHead: this.events.at(-1)?.hash ?? null, ...(action ? { action } : {}) };
        const result = new Promise<void>((resolve, reject) => this.pending.set(command.requestId, { command, resolve, reject }));
        this.emit();
        this.socket.send(JSON.stringify(command));
        return result;
    }
    close() { this.stopped = true; if (this.timer)
        clearTimeout(this.timer); this.socket?.close(); for (const p of this.pending.values())
        p.reject(Error('Комната закрыта на этом устройстве')); this.pending.clear(); this.status = { ...this.status, connected: false }; this.emit(); }
}
