function randomUUID() { return globalThis.crypto.randomUUID?.() ?? token(); }
function token() { const bytes = new Uint8Array(24); globalThis.crypto.getRandomValues(bytes); return Array.from(bytes, n => n.toString(16).padStart(2, '0')).join(''); }
import { Engine, canonical, hash, POLICY } from '../../engine/src/index';
import { secure, type Rng } from '../../engine/src/rng';
import type { ControllerIdentity, GameState, Player } from '../../shared/src/index';
import type { RoomView, Membership, Command } from './protocol';
export interface SavedRoom {
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
    constructor(readonly engine: Engine, readonly rng: Rng = secure, readonly persist: (room: SavedRoom) => void = () => { }) { }
    view(r: SavedRoom): RoomView { return { id: r.id, name: r.name, capacity: r.capacity, hostPlayer: 1, players: r.members.map(({ id, name, online }) => ({ id, name, online })), gameId: r.game?.gameId ?? null, status: r.game?.winner ? 'finished' : r.game ? 'playing' : 'lobby' }; }
    list() { return [...this.rooms.values()].map(r => this.view(r)); }
    room(id: string) { const r = this.rooms.get(id); if (!r)
        throw Error('Комната не найдена'); return r; }
    member(r: SavedRoom, token: string) { const m = r.members.find(m => m.token === token); if (!m)
        throw Error('Неверный ключ игрока'); return m; }
    create(name: string, capacity: number, playerName: string): Membership {
        if (!Number.isInteger(capacity) || capacity < 2 || capacity > 4)
            throw Error('В комнате должно быть 2–4 места');
        const room: SavedRoom = { id: randomUUID(), name: this.name(name), capacity, members: [{ id: 1, name: this.name(playerName), token: token(), online: false }], game: null, receipts: [] };
        this.rooms.set(room.id, room);
        this.persist(room);
        return { room: this.view(room), playerId: 1, token: room.members[0].token };
    }
    private name(name: string) { if (typeof name !== 'string' || !name.trim() || name.length > 48)
        throw Error('Имя должно содержать 1–48 символов'); return name.trim(); }
    join(id: string, name: string): Membership { const r = this.room(id); if (r.game)
        throw Error('Партия уже началась; используйте свой ключ для восстановления'); if (r.members.length >= r.capacity)
        throw Error('Комната заполнена'); const m = { id: (r.members.length + 1) as Player, name: this.name(name), token: token(), online: false }; r.members.push(m); this.persist(r); return { room: this.view(r), playerId: m.id, token: m.token }; }
    connect(id: string, token: string, online = true) { const r = this.room(id), m = this.member(r, token); m.online = online; this.persist(r); return this.view(r); }
    restore(saved: SavedRoom) { if (saved.game)
        saved.game = this.engine.replay(saved.game.eventLog); if (saved.members.length < 1 || saved.members.length > 4 || saved.members.some((m, i) => m.id !== i + 1 || !m.token))
        throw Error('Invalid saved room'); saved.members.forEach(m => m.online = false); this.rooms.set(saved.id, saved); }
    identity(r: SavedRoom, p: Player): ControllerIdentity { return { kind: 'human', id: `lan:${r.id}:P${p}`, version: null }; }
    command(id: string, token: string, input: unknown) {
        const r = this.room(id), m = this.member(r, token);
        if (!input || typeof input !== 'object' || Array.isArray(input))
            throw Error('Invalid command');
        const c = input as Command;
        if (Object.keys(c).some(k => !['type', 'requestId', 'operation', 'expectedHead', 'action'].includes(k)) || c.type !== 'command' || typeof c.requestId !== 'string' || !c.requestId || c.requestId.length > 100 || !['start', 'roll', 'action', 'finish', 'undo'].includes(c.operation))
            throw Error('Неверная команда: клиент не задаёт кубики или игрока');
        const key = `${m.id}:${c.requestId}`, fingerprint = hash(c), receipt = r.receipts.find(x => x.key === key);
        if (receipt) {
            if (receipt.fingerprint !== fingerprint)
                throw Error('Request ID reused for another command');
            return { duplicate: true, fromSeq: r.game?.eventLog.length ?? 0, room: r };
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
        if (r.receipts.length > 1000)
            r.receipts.shift();
        this.persist(r);
        return { duplicate: false, fromSeq, room: r };
    }
}
