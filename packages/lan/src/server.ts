import { createServer, type Server } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, renameSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, extname, join } from 'node:path';
import { networkInterfaces, hostname } from 'node:os';
import { WebSocketServer, WebSocket } from 'ws';
import { Bonjour } from 'bonjour-service';
import { Engine, parseGeometry } from '../../engine/src/index';
import { Authority, type SavedRoom } from './authority';
import type { ServerFrame, LanHost } from './protocol';
export async function startLanServer(options: {
    port?: number;
    host?: string;
    discovery?: boolean;
    directory?: string;
    authority?: Authority;
} = {}) {
    const dir = options.directory ?? 'artifacts/lan/rooms';
    mkdirSync(dir, { recursive: true });
    const persist = (r: SavedRoom) => { const file = join(dir, `${r.id}.json`); writeFileSync(file + '.tmp', JSON.stringify(r), { mode: 0o600 }); renameSync(file + '.tmp', file); };
    const authority = options.authority ?? new Authority(new Engine(parseGeometry(readFileSync('data/igra_64_koordinaty.csv', 'utf8')), { clock: () => new Date().toISOString(), timeSource: 'wall' }), undefined, persist);
    if (!options.authority)
        for (const file of readdirSync(dir).filter(f => f.endsWith('.json')))
            authority.restore(JSON.parse(readFileSync(join(dir, file), 'utf8')));
    const peers = new Map<string, LanHost>();
    const server = createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
        const json = (status: number, value: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
        try {
            if (req.method === 'GET' && url.pathname === '/api/rooms') {
                json(200, authority.list());
                return;
            }
            if (req.method === 'GET' && url.pathname === '/api/discovery') {
                json(200, [...peers.values()]);
                return;
            }
            if (req.method === 'POST' && (url.pathname === '/api/rooms' || /^\/api\/rooms\/[^/]+\/join$/.test(url.pathname))) {
                let text = '';
                for await (const chunk of req) {
                    text += chunk;
                    if (text.length > 4096)
                        throw Error('Request too large');
                }
                const body = JSON.parse(text);
                const result = url.pathname === '/api/rooms' ? authority.create(body.roomName, body.capacity, body.playerName) : authority.join(decodeURIComponent(url.pathname.split('/')[3]), body.playerName);
                json(200, result);
                broadcastRoom(result.room.id);
                return;
            }
            const base = resolve('apps/web/dist'), path = resolve(base, '.' + decodeURIComponent(url.pathname));
            if (!path.startsWith(base + '/') && path !== base) {
                json(403, { error: 'Forbidden' });
                return;
            }
            const file = existsSync(path) && statSync(path).isFile() ? path : join(base, 'index.html');
            if (!existsSync(file)) {
                json(503, { error: 'Run npm run build before starting the LAN host' });
                return;
            }
            res.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' } as Record<string, string>)[extname(file)] ?? 'application/octet-stream' });
            res.end(readFileSync(file));
        }
        catch (e) {
            json(400, { error: (e as Error).message });
        }
    });
    const ws = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 }), connections = new Map<WebSocket, {
        roomId: string;
        token: string;
    }>();
    ws.on('error', error => console.warn('WebSocket server:', error.message));
    const send = (socket: WebSocket, value: ServerFrame) => { if (socket.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify(value)); };
    function broadcastRoom(id: string) { for (const [socket, c] of connections)
        if (c.roomId === id)
            send(socket, { type: 'room', room: authority.view(authority.room(id)) }); }
    ws.on('connection', socket => {
        let alive = true;
        socket.on('pong', () => alive = true);
        (socket as any).heartbeat = () => { if (!alive) {
            socket.terminate();
            return;
        } alive = false; socket.ping(); };
        socket.on('message', buffer => {
            let requestId: string | undefined;
            try {
                const message = JSON.parse(buffer.toString());
                requestId = message.requestId;
                if (message.type === 'hello') {
                    if (connections.has(socket))
                        throw Error('Already authenticated');
                    const room = authority.room(message.roomId);
                    authority.member(room, message.token);
                    connections.set(socket, { roomId: room.id, token: message.token });
                    authority.connect(room.id, message.token);
                    send(socket, { type: 'snapshot', room: authority.view(room), events: room.game?.eventLog ?? [] });
                    broadcastRoom(room.id);
                    return;
                }
                const c = connections.get(socket);
                if (!c)
                    throw Error('Authenticate first');
                if (message.type === 'resync') {
                    const r = authority.room(c.roomId);
                    send(socket, { type: 'snapshot', room: authority.view(r), events: r.game?.eventLog ?? [] });
                    return;
                }
                const result = authority.command(c.roomId, c.token, message), r = result.room;
                if (!result.duplicate && r.game) {
                    const delta = r.game.eventLog.slice(result.fromSeq);
                    for (const [other, session] of connections)
                        if (session.roomId === r.id)
                            send(other, { type: 'events', room: authority.view(r), fromSeq: result.fromSeq, events: delta, headHash: r.game.eventLog.at(-1)!.hash });
                }
                send(socket, { type: 'ack', requestId: message.requestId, duplicate: result.duplicate });
            }
            catch (e) {
                send(socket, { type: 'error', requestId, message: (e as Error).message });
            }
        });
        socket.on('close', () => { const c = connections.get(socket); connections.delete(socket); if (c) {
            const online = [...connections.values()].some(v => v.roomId === c.roomId && v.token === c.token);
            authority.connect(c.roomId, c.token, online);
            broadcastRoom(c.roomId);
        } });
    });
    const heartbeat = setInterval(() => ws.clients.forEach(socket => (socket as any).heartbeat?.()), 15000);
    heartbeat.unref();
    await new Promise<void>((ok, fail) => { server.once('error', fail); server.listen(options.port ?? 8787, options.host ?? '0.0.0.0', () => ok()); });
    const port = (server.address() as any).port as number;
    let bonjour: Bonjour | undefined, browser: ReturnType<Bonjour['find']> | undefined;
    if (options.discovery !== false) {
        try {
            bonjour = new Bonjour(undefined, (error: Error) => console.warn('mDNS discovery unavailable:', error.message));
            bonjour.publish({ name: `ShashBesh ${hostname()} ${port}`, type: 'shashbesh', port, txt: { version: '0.3', path: '/api/rooms' } });
            browser = bonjour.find({ type: 'shashbesh' }, service => { const address = (service.addresses ?? []).find(a => /^\d+\.\d+\.\d+\.\d+$/.test(a)); if (address)
                peers.set(service.fqdn, { name: service.name, url: `http://${address}:${service.port}` }); });
            browser.on('down', service => peers.delete(service.fqdn));
        }
        catch (e) {
            console.warn('mDNS:', (e as Error).message);
        }
    }
    return { server, authority, port, close: async () => { clearInterval(heartbeat); browser?.stop(); bonjour?.destroy(); ws.clients.forEach(s => s.terminate()); await new Promise<void>(ok => ws.close(() => ok())); await new Promise<void>(ok => server.close(() => ok())); } };
}
