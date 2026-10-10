import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocket } from 'ws';
import { Authority } from '../packages/lan/src/authority';
import { LanHostSession } from '../packages/lan/src/host';
import { startLanServer } from '../packages/lan/src/server';
import { engine } from './helpers';
import { seeded } from '../packages/engine/src/rng';
import { stateHash } from '../packages/engine/src/index';
import type { Command, Membership, ServerFrame } from '../packages/lan/src/protocol';
let seq = 0;
function command(a: Authority, m: Membership, operation: Command['operation'], extra = {}) { return { type: 'command' as const, requestId: `test-${++seq}`, operation, expectedHead: a.room(m.room.id).game?.eventLog.at(-1)?.hash ?? null, ...extra }; }
function setup() { let draws = 0; const stream = [6, 5, 4, 3, 6, 6, 3, 2, 5, 6, 1, 2], rng = { next: () => .5, die: () => stream[draws++ % stream.length] }; const a = new Authority(engine, rng), members = [a.create('test', 4, 'one')]; for (const name of ['two', 'three', 'four'])
    members.push(a.join(members[0].room.id, name)); members.forEach(m => a.connect(m.room.id, m.token)); return { a, members, draws: () => draws }; }
test('LAN authority owns dice, enforces active ownership/engine masks, idempotence and current-turn undo', () => {
    const { a, members, draws } = setup(), host = members[0], room = a.room(host.room.id);
    assert.throws(() => a.join(room.id, 'fifth'));
    assert.equal(JSON.stringify(a.list()).includes(host.token), false);
    a.command(room.id, host.token, command(a, host, 'start'));
    assert.equal(room.game!.players.length, 4);
    assert.throws(() => a.command(room.id, members[1].token, command(a, members[1], 'roll')));
    const before = draws();
    assert.throws(() => a.command(room.id, host.token, { ...command(a, host, 'roll'), dice: [1, 1] }));
    assert.equal(draws(), before);
    a.command(room.id, host.token, command(a, host, 'roll'));
    const roll = command(a, host, 'roll');
    a.command(room.id, host.token, roll);
    const count = draws(), head = room.game!.eventLog.at(-1)!.hash;
    a.command(room.id, host.token, roll);
    assert.equal(draws(), count);
    assert.equal(room.game!.eventLog.at(-1)!.hash, head);
    assert.throws(() => a.command(room.id, host.token, command(a, host, 'roll')));
    assert.equal(draws(), count);
    assert.throws(() => a.command(room.id, host.token, command(a, host, 'action', { action: { ...engine.legalActions(room.game!)[0], to: 'М99' } })));
    const original = room.game!.pieces.map(p => p.position);
    a.command(room.id, host.token, command(a, host, 'action', { action: engine.legalActions(room.game!)[0] }));
    a.command(room.id, host.token, command(a, host, 'undo'));
    assert.deepEqual(room.game!.pieces.map(p => p.position), original);
    assert.equal(room.game!.eventLog.at(-1)!.type, 'undo_action');
    assert.equal(stateHash(engine.replay(room.game!.eventLog)), stateHash(room.game!));
    const restored = new Authority(engine, rngFallback);
    restored.restore(JSON.parse(JSON.stringify(room)));
    restored.connect(room.id, host.token);
    assert.equal(restored.command(room.id, host.token, roll).duplicate, true);
});
const rngFallback = seeded('lan-restored');
test('Android host adapter: phone creates, Ubuntu joins, server dice, reconnect and saved-room restart', () => {
    let saved: string | undefined;
    const authority = new Authority(engine, seeded('android-host'), room => saved = JSON.stringify(room));
    const received = new Map<string, ServerFrame[]>();
    const session = new LanHostSession(authority, (peer, frame) => { const frames = received.get(peer) ?? []; frames.push(frame); received.set(peer, frames); });
    const phone = session.http('POST', '/api/rooms', {roomName:'Android', capacity:2, playerName:'Phone'}) as Membership;
    const desktop = session.http('POST', `/api/rooms/${phone.room.id}/join`, {playerName:'Ubuntu'}) as Membership;
    for (const [peer, member] of [['phone',phone],['ubuntu',desktop]] as const) session.message(peer,{type:'hello',roomId:phone.room.id,token:member.token});
    session.message('ubuntu',command(authority,desktop,'start'));
    assert.equal(received.get('ubuntu')!.at(-1)!.type,'error');
    session.message('phone',command(authority,phone,'start'));
    session.message('phone',command(authority,phone,'roll'));
    const state = authority.room(phone.room.id).game!;
    const member = state.activePlayer === 1 ? phone : desktop;
    const peer = member === phone ? 'phone' : 'ubuntu';
    const before = state.eventLog.length;
    session.message(peer,{...command(authority,member,'roll'),dice:[6,6]});
    assert.equal(authority.room(phone.room.id).game!.eventLog.length,before);
    session.message(peer,command(authority,member,'roll'));
    session.disconnect('ubuntu');
    session.message('ubuntu-rejoined',{type:'hello',roomId:phone.room.id,token:desktop.token});
    const snapshot = received.get('ubuntu-rejoined')!.find(f => f.type==='snapshot') as Extract<ServerFrame,{type:'snapshot'}>;
    assert.equal(stateHash(engine.replay(snapshot.events)),stateHash(authority.room(phone.room.id).game!));
    const recovered = new Authority(engine);
    recovered.restore(JSON.parse(saved!));
    assert.equal(stateHash(recovered.room(phone.room.id).game!),stateHash(engine.replay(snapshot.events)));
    assert.equal(JSON.stringify(session.http('GET','/api/rooms',{})).includes(phone.token),false);
});
test('Four WebSocket clients receive only confirmed events and recover missed state after disconnect', { timeout: 30000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'shashbesh-lan-')), authority = new Authority(engine, seeded('socket-v03'));
    const server = await startLanServer({ port: 0, host: '127.0.0.1', discovery: false, directory, authority });
    const base = `http://127.0.0.1:${server.port}`;
    const clients: {
        socket: WebSocket;
        frames: ServerFrame[];
        wait: (p: (f: ServerFrame) => boolean) => Promise<ServerFrame>;
    }[] = [];
    async function connect(m: Membership) {
        const socket = new WebSocket(base.replace('http:', 'ws:') + '/ws'), frames: ServerFrame[] = [];
        socket.on('message', b => frames.push(JSON.parse(b.toString())));
        const wait = (predicate: (f: ServerFrame) => boolean) => new Promise<ServerFrame>((resolve, reject) => { const existing = frames.find(predicate); if (existing) {
            resolve(existing);
            return;
        } const timeout = setTimeout(() => { socket.off('message', check); reject(Error('Network frame timeout')); }, 5000); function check(b: any) { const f = JSON.parse(b.toString()); if (predicate(f)) {
            clearTimeout(timeout);
            socket.off('message', check);
            resolve(f);
        } } socket.on('message', check); });
        await new Promise<void>(ok => socket.once('open', () => ok()));
        socket.send(JSON.stringify({ type: 'hello', roomId: m.room.id, token: m.token }));
        await wait(f => f.type === 'snapshot');
        const c = { socket, frames, wait };
        clients.push(c);
        return c;
    }
    try {
        const response = await fetch(base + '/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomName: 'WiFi', capacity: 4, playerName: 'host' }) });
        const members: Membership[] = [await response.json() as Membership];
        for (let i = 1; i < 4; i++)
            members.push(await (await fetch(`${base}/api/rooms/${members[0].room.id}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerName: `p${i + 1}` }) })).json() as Membership);
        for (const m of members)
            await connect(m);
        const room = authority.room(members[0].room.id);
        let cmd = command(authority, members[0], 'start');
        clients[0].socket.send(JSON.stringify(cmd));
        await clients[0].wait(f => f.type === 'ack' && f.requestId === cmd.requestId);
        while (room.game!.phase === 'initial_roll') {
            cmd = command(authority, members[0], 'roll');
            clients[0].socket.send(JSON.stringify(cmd));
            const id = cmd.requestId;
            await clients[0].wait(f => f.type === 'ack' && f.requestId === id);
        }
        const actor = room.game!.activePlayer - 1, offline = (actor + 1) % 4;
        clients[offline].socket.close();
        await new Promise<void>(ok => clients[offline].socket.once('close', () => ok()));
        cmd = command(authority, members[actor], 'roll');
        clients[actor].socket.send(JSON.stringify(cmd));
        await clients[actor].wait(f => f.type === 'ack' && f.requestId === cmd.requestId);
        const newest = stateHash(room.game!), rejoined = await connect(members[offline]);
        const snapshot = rejoined.frames.find(f => f.type === 'snapshot') as Extract<ServerFrame, {
            type: 'snapshot';
        }>;
        assert.equal(stateHash(engine.replay(snapshot.events)), newest);
        assert.equal(snapshot.room.players.length, 4);
        assert.ok(snapshot.events.every(e => e.eventId && e.gameId === room.game!.gameId));
        const before = room.game!.eventLog.length;
        clients[actor].socket.send(JSON.stringify(cmd));
        await new Promise(ok => setTimeout(ok, 30));
        assert.equal(room.game!.eventLog.length, before);
    }
    finally {
        for (const c of clients)
            c.socket.terminate();
        await server.close();
        rmSync(directory, { recursive: true, force: true });
    }
});
