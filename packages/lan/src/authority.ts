function randomUUID() { return globalThis.crypto.randomUUID?.() ?? token(); }
function token() { const bytes = new Uint8Array(24); globalThis.crypto.getRandomValues(bytes); return Array.from(bytes, n => n.toString(16).padStart(2, '0')).join(''); }
import { Engine, canonical, hash, POLICY } from '../../engine/src/index';
import { secure, type Rng } from '../../engine/src/rng';
import type { ControllerIdentity, GameState, Player } from '../../shared/src/index';
import type { RoomView, Membership, Command } from './protocol';
export const credentialHash = (secret: string) => `sha256:${hash(secret)}`;
export interface SavedRoom {
    updatedAt?: number;
    id: string;
    name: string;
    capacity: number;
    members: {
        id: Player;
        name: string;
        token: string;
        online: boolean;
    }[];
    game: GameState | null;
    receipts: {
        key: string;
        fingerprint: string;
    }[];
}
export class Authority {
    readonly rooms = new Map<string, SavedRoom>();
    constructor(readonly engine: Engine, readonly rng: Rng = secure, readonly persist: (room: SavedRoom) => void = () => { }, readonly options: {maxRooms?:number; capacity?:number; receiptLimit?:number; now?:()=>number} = {}) { }
    private commit(target: SavedRoom, draft: SavedRoom) {
        draft.updatedAt = (this.options.now ?? Date.now)();
        this.persist(draft); // No visible mutation or ACK until durable persistence succeeds.
        Object.assign(target, draft);
    }
    view(r: SavedRoom): RoomView { return { id: r.id, name: r.name, capacity: r.capacity, hostPlayer: 1, players: r.members.map(({ id, name, online }) => ({ id, name, online })), gameId: r.game?.gameId ?? null, status: r.game?.winner ? 'finished' : r.game ? 'playing' : 'lobby' }; }
    list() { return [...this.rooms.values()].map(r => this.view(r)); }
    room(id: string) { const r = this.rooms.get(id); if (!r)
        throw Error('Комната не найдена'); return r; }
    member(r: SavedRoom, token: string) { const m = typeof token === 'string' && /^[a-f0-9]{48}$/.test(token) ? r.members.find(m => m.token === credentialHash(token)) : undefined; if (!m)
        throw Error('Неверный ключ игрока'); return m; }
    create(name: string, capacity: number, playerName: string): Membership {
        if (this.rooms.size >= (this.options.maxRooms ?? Infinity)) throw Error('Room limit reached');
        if (this.options.capacity !== undefined && capacity !== this.options.capacity) throw Error('Arena requires two players');
        if (!Number.isInteger(capacity) || capacity < 2 || capacity > 4)
            throw Error('В комнате должно быть 2–4 места');
        const secret = token();
        const room: SavedRoom = { id: randomUUID(), name: this.name(name), capacity, members: [{ id: 1, name: this.name(playerName), token: credentialHash(secret), online: false }], game: null, receipts: [] };
        this.commit(room, structuredClone(room));
        this.rooms.set(room.id, room);
        return { room: this.view(room), playerId: 1, token: secret };
    }
    private name(name: string) { if (typeof name !== 'string' || !name.trim() || name.length > 48)
        throw Error('Имя должно содержать 1–48 символов'); return name.trim(); }
    join(id: string, name: string): Membership {
        const target = this.room(id), r = structuredClone(target);
        if (r.game) throw Error('Партия уже началась; используйте свой ключ для восстановления');
        if (r.members.length >= r.capacity) throw Error('Комната заполнена');
        const secret = token(), m = {id: (r.members.length + 1) as Player, name: this.name(name), token: credentialHash(secret), online:false};
        r.members.push(m); this.commit(target,r);
        return {room:this.view(target),playerId:m.id,token:secret};
    }
    connect(id: string, token: string, online = true) {
        const target=this.room(id), r=structuredClone(target), m=this.member(r,token);
        m.online=online; this.commit(target,r); return this.view(target);
    }
    restore(input: SavedRoom) {
        const saved=structuredClone(input);
        if (!saved || typeof saved.id !== 'string' || !Array.isArray(saved.members) || saved.members.length < 1 || saved.members.length > 4 ||
            !Number.isInteger(saved.capacity) || saved.capacity < saved.members.length || saved.capacity > 4 || saved.capacity < 2 ||
            (this.options.capacity !== undefined && saved.capacity !== this.options.capacity) ||
            saved.members.some((m,i)=>m.id!==i+1 || typeof m.token!=='string' || !/^(?:sha256:)?[a-f0-9]{48,64}$/.test(m.token)) ||
            !Array.isArray(saved.receipts) || saved.receipts.some(x=>typeof x.key!=='string'||typeof x.fingerprint!=='string')) throw Error('Invalid saved room');
        // Legacy LAN saves are read without changing the original file; future commits use verifiers.
        saved.members.forEach(m=>{if(!m.token.startsWith('sha256:'))m.token=credentialHash(m.token);m.online=false;});
        if(saved.game) saved.game=this.engine.replay(saved.game.eventLog);
        if(this.rooms.has(saved.id))throw Error('Duplicate room');
        this.rooms.set(saved.id,saved);
    }
    identity(r: SavedRoom, p: Player): ControllerIdentity { return { kind: 'human', id: `lan:${r.id}:P${p}`, version: null }; }
    command(id: string, token: string, input: unknown) {
        const target = this.room(id), r = structuredClone(target), m = this.member(r, token);
        if (!input || typeof input !== 'object' || Array.isArray(input))
            throw Error('Invalid command');
        const c = input as Command;
        if (Object.keys(c).some(k => !['type', 'requestId', 'operation', 'expectedHead', 'action'].includes(k)) || c.type !== 'command' || typeof c.requestId !== 'string' || !c.requestId || c.requestId.length > 100 || !['start', 'roll', 'action', 'finish', 'undo'].includes(c.operation))
            throw Error('Неверная команда: клиент не задаёт кубики или игрока');
        const key = `${m.id}:${c.requestId}`, fingerprint = hash(c), receipt = r.receipts.find(x => x.key === key);
        if (receipt) {
            if (receipt.fingerprint !== fingerprint)
                throw Error('Request ID reused for another command');
            return { duplicate: true, fromSeq: target.game?.eventLog.length ?? 0, room: target };
        }
        if (!m.online)
            throw Error('Игрок не подключён');
        const head = r.game?.eventLog.at(-1)?.hash ?? null;
        if (c.expectedHead !== head)
            throw Error('Устаревшее состояние: синхронизируйтесь');
        const fromSeq = r.game?.eventLog.length ?? 0;
        if (c.operation === 'start') {
            if (m.id !== 1 || r.game)
                throw Error('Начать партию может только создатель');
            if (r.members.length < 2 || r.members.some(p => !p.online))
                throw Error('Нужны минимум два подключённых игрока');
            const players = r.members.map(p => p.id);
            r.game = this.engine.create(players, `lan-game-${randomUUID()}`, null, POLICY, Object.fromEntries(players.map(p => [p, this.identity(r, p)])));
        }
        else {
            const state = r.game;
            if (!state)
                throw Error('Партия ещё не началась');
            if (state.activePlayer !== m.id)
                throw Error('Сейчас ход другого игрока');
            switch (c.operation) {
                case 'roll':
                    if (!['initial_roll', 'await_roll'].includes(state.phase))
                        throw Error('Завершите предыдущий бросок');
                    r.game = state.phase === 'initial_roll' ? this.engine.initialRoll(state, Object.fromEntries(state.initialContenders.map(p => [p, this.rng.die()]))) : this.engine.roll(state, state.pendingRolls?.[0].dice ?? [this.rng.die(), this.rng.die()]);
                    break;
                case 'action':
                    if (!c.action)
                        throw Error('Действие отсутствует');
                    r.game = this.engine.applyAction(state, c.action, this.identity(r, m.id));
                    break;
                case 'finish':
                    r.game = this.engine.finishRoll(state, this.identity(r, m.id));
                    break;
                case 'undo':
                    r.game = this.engine.undoAction(state, m.id, this.identity(r, m.id));
                    break;
            }
            this.engine.assertInvariants(r.game!);
        }
        r.receipts.push({ key, fingerprint });
        if (r.receipts.length > (this.options.receiptLimit ?? 1000))
            r.receipts.shift();
        this.commit(target,r);
        return { duplicate: false, fromSeq, room: target };
    }
}
