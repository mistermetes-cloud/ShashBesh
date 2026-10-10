import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import type { GameEvent, GameState, ControllerIdentity } from '../../shared/src/index';
export function canonical(value: unknown): string {
    if (value === null || typeof value !== 'object')
        return JSON.stringify(value);
    if (Array.isArray(value))
        return '[' + value.map(canonical).join(',') + ']';
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical((value as Record<string, unknown>)[k])).join(',') + '}';
}
export const hash = (value: unknown) => bytesToHex(sha256(new TextEncoder().encode(canonical(value))));
function freeze(value: unknown) {
    if (value && typeof value === 'object') {
        for (const child of Object.values(value))
            freeze(child);
        Object.freeze(value);
    }
    return value;
}
export interface AuditOptions {
    journalVersion?: 1 | 2;
    clock?: (gameId: string, seq: number) => string;
    timeSource?: 'logical' | 'wall';
}
export const logicalTime = (_gameId: string, seq: number) => new Date(Date.UTC(2000, 0, 1) + seq).toISOString();
export const eventId = (gameId: string, seq: number) => hash({ gameId, seq });
export function append(state: GameState, type: string, payload: unknown, actor = state.activePlayer, options: AuditOptions = {}, decisionMaker?: ControllerIdentity): GameState {
    const seq = state.eventLog.length;
    const metadata: Partial<GameEvent> = options.journalVersion === 1 ? {} : {
        journalVersion: 2 as const, eventId: eventId(state.gameId, seq), gameNumber: state.gameId,
        timestamp: (options.clock ?? logicalTime)(state.gameId, seq), timeSource: options.timeSource ?? 'logical',
        ...((type === 'action' || type === 'undo_action' || type === 'roll_finished' && (payload as {
            usedPoints?: number;
        }).usedPoints === 0) ? { decisionMaker: decisionMaker ?? { kind: 'unknown' as const, id: `P${actor}`, version: null } } : {})
    };
    if ('timestamp' in metadata && (!Number.isFinite(Date.parse(metadata.timestamp!)) || new Date(metadata.timestamp!).toISOString() !== metadata.timestamp))
        throw Error('Invalid event timestamp');
    const body = { ...metadata, seq, gameId: state.gameId, rollId: state.currentRoll?.id ?? null, actor, type, payload: structuredClone(payload), prevHash: state.eventLog.at(-1)?.hash ?? '0'.repeat(64) };
    const event = { ...body, hash: hash(body) };
    freeze(event);
    return { ...state, eventLog: [...state.eventLog, event] };
}
export function verifyChain(events: GameEvent[]) {
    let previous = '0'.repeat(64);
    const ids = new Set<string>();
    for (const [i, event] of events.entries()) {
        const { hash: actual, ...body } = event;
        if (event.seq !== i || event.prevHash !== previous || hash(body) !== actual || event.gameId !== events[0].gameId)
            throw Error(`Повреждён журнал: событие ${i}`);
        if (event.journalVersion !== undefined) {
            if (event.journalVersion !== 2 || event.gameNumber !== event.gameId || event.eventId !== eventId(event.gameId, i) || ids.has(event.eventId))
                throw Error(`Invalid event identity ${i}`);
            if (!event.timestamp || !Number.isFinite(Date.parse(event.timestamp)) || new Date(event.timestamp).toISOString() !== event.timestamp || !['logical', 'wall'].includes(event.timeSource!))
                throw Error(`Invalid event time ${i}`);
            ids.add(event.eventId);
            if (event.type === 'action' || event.type === 'undo_action' || event.type === 'roll_finished' && (event.payload as {
                usedPoints?: number;
            }).usedPoints === 0) {
                const c = event.decisionMaker;
                if (!c || !['human', 'agent', 'unknown'].includes(c.kind) || typeof c.id !== 'string' || !c.id || !(c.version === null || typeof c.version === 'string'))
                    throw Error(`Invalid controller ${i}`);
            }
        }
        else if (event.eventId !== undefined || event.timestamp !== undefined || event.gameNumber !== undefined)
            throw Error(`Invalid legacy metadata ${i}`);
        previous = actual;
    }
}
export const stateHash = (s: GameState) => { const { eventLog, ...body } = s; return hash(body); };
export const exportLog = (s: GameState) => s.eventLog.map(canonical).join('\n');
export function importLog(text: string): GameEvent[] { const events = text.trim().split(/\r?\n/).map(line => JSON.parse(line)); verifyChain(events); return events; }
export function checkpoint(events: GameEvent[]) {
    verifyChain(events);
    if (!events.length)
        throw Error('Empty journal');
    return { schemaVersion: 'shashbesh-checkpoint-v1' as const, gameId: events[0].gameId, eventCount: events.length, lastSeq: events.at(-1)!.seq, headHash: events.at(-1)!.hash, hashAlgorithm: 'SHA-256' as const, canonicalization: 'sorted-json-v1' as const };
}
export function verifyCheckpoint(events: GameEvent[], expected: ReturnType<typeof checkpoint>) {
    if (canonical(checkpoint(events)) !== canonical(expected))
        throw Error('Checkpoint mismatch');
}
/** Active branch projection. Raw events remain append-only, including abandoned actions. */
export function activeEvents(events: GameEvent[]): GameEvent[] {
    let active: GameEvent[] = [];
    for (const e of events) {
        if (e.type === 'undo_action') {
            const i = active.findIndex(a => a.seq === (e.payload as {
                targetSeq: number;
            }).targetSeq);
            if (i < 0 || active[i].type !== 'action')
                throw Error('Invalid undo branch');
            active = active.slice(0, i);
        }
        active.push(e);
    }
    return active;
}
