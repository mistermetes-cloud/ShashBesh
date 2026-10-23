import { createServer, type Server, type IncomingMessage } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, renameSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, extname, join } from 'node:path';
import { networkInterfaces, hostname } from 'node:os';
import { WebSocketServer, WebSocket } from 'ws';
import { Bonjour } from 'bonjour-service';
import { Engine, parseGeometry, isCurrentPolicy } from '../../engine/src/index';
import { Authority, type SavedRoom } from './authority';
import {arenaRequestAllowed} from './arena-binding';
import type { ServerFrame, LanHost } from './protocol';
export async function startLanServer(options: {
    port?: number;
    host?: string;
    discovery?: boolean;
    directory?: string;
    authority?: Authority;
    arena?: {maxConnections?:number; maxRooms?:number; idleMs?:number; handshakeMs?:number; messageBytes?:number; messagesPerMinute?:number; now?:()=>number};
} = {}) {
    const dir = options.directory ?? 'artifacts/lan/rooms';
    mkdirSync(dir, { recursive: true });
    const persist = (r: SavedRoom) => { const file = join(dir, `${r.id}.json`); writeFileSync(file + '.tmp', JSON.stringify(r), { mode: 0o600 }); renameSync(file + '.tmp', file); };
    const authority = options.authority ?? new Authority(new Engine(parseGeometry(readFileSync('data/igra_64_koordinaty.csv', 'utf8')), { clock: () => new Date().toISOString(), timeSource: 'wall' }), undefined, persist);
    if (!options.authority)
        for (const file of readdirSync(dir).filter(f => f.endsWith('.json')))
            authority.restore(JSON.parse(readFileSync(join(dir, file), 'utf8')));
    const arena=options.arena, now=arena?.now ?? Date.now;
    const maxConnections=arena?.maxConnections ?? 16, idleMs=arena?.idleMs ?? 24*60*60*1000;
    const expire=()=>{if(!arena)return;for(const [id,r] of authority.rooms)if(!r.members.some(m=>m.online)&&now()-(r.updatedAt??now())>=idleMs)authority.rooms.delete(id);};
    const httpRates=new Map<string,{count:number;until:number}>();
    const take=(entry:{count:number;until:number},limit:number)=>{if(now()>=entry.until){entry.count=0;entry.until=now()+60000;}return ++entry.count<=limit;};
    const allowedRequest=(req:IncomingMessage)=>arenaRequestAllowed(options.host??'127.0.0.1',req.socket.localPort,req.headers.host,req.headers.origin);
    const peers = new Map<string, LanHost>();
    const server = createServer(async (req, res) => {
        if(arena && !allowedRequest(req)){res.writeHead(403);res.end();return;}
        res.setHeader('Access-Control-Allow-Origin', arena ? (req.headers.origin ?? `http://${req.headers.host}`) : '*');
        res.setHeader('Vary','Origin');
        res.setHeader('Cache-Control','no-store');
        res.setHeader('X-Content-Type-Options','nosniff');
        expire();
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        const json = (status: number, value: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
        try {
            const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
            if(arena && url.pathname.startsWith('/api/')) {
                const ip=req.socket.remoteAddress??'local', entry=httpRates.get(ip)??{count:0,until:now()+60000};
                httpRates.set(ip,entry);
                if(!take(entry,120)){json(429,{error:'Request limit reached'});return;}
            }
            if (req.method === 'GET' && url.pathname === '/api/rooms') {
                json(200, authority.list());
                return;
            }
            if (req.method === 'GET' && url.pathname === '/api/discovery') {
                json(200, [...peers.values()]);
                return;
            }
            if (req.method === 'POST' && (url.pathname === '/api/rooms' || /^\/api\/rooms\/[^/]+\/join$/.test(url.pathname))) {
                if(arena && url.pathname==='/api/rooms' && authority.rooms.size >= (arena.maxRooms??16)){json(429,{error:'Room limit reached'});return;}
                let text = ''; let bytes=0;
                for await (const chunk of req) {
                    bytes+=Buffer.byteLength(chunk);
                    text += chunk;
                    if (bytes > 4096)
                        throw Error('Request too large');
                }
                const body = JSON.parse(text);
                if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Invalid body');
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
                json(503, { error: 'Run npm run build:public-preview before starting the host' });
                return;
            }
            res.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' } as Record<string, string>)[extname(file)] ?? 'application/octet-stream' });
            res.end(readFileSync(file));
        }
        catch (e) {
            json(400, { error: arena ? 'Arena request rejected' : (e as Error).message });
        }
    });
    if(arena){server.maxConnections=maxConnections*4;server.headersTimeout=5000;server.requestTimeout=10000;server.keepAliveTimeout=3000;}
    const ws = new WebSocketServer({ server, path: '/ws', maxPayload: arena?.messageBytes ?? 64 * 1024, verifyClient: arena ? (info:{origin:string;req:IncomingMessage;secure:boolean})=>info.req.url==='/ws' && ws.clients.size<maxConnections && allowedRequest(info.req) : undefined }), connections = new Map<WebSocket, {
        roomId: string;
        token: string;
    }>();
    ws.on('error', error => console.warn('WebSocket server:', error.message));
    const send = (socket: WebSocket, value: ServerFrame) => { if(arena && socket.bufferedAmount>1024*1024){socket.terminate();return;} if (socket.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify(value)); };
    function broadcastRoom(id: string) { for (const [socket, c] of connections)
        if (c.roomId === id)
            send(socket, { type: 'room', room: authority.view(authority.room(id)) }); }
    ws.on('connection', socket => {
        socket.on('error',()=>{});
        const rate={count:0,until:now()+60000};
        const authTimer=arena?setTimeout(()=>{if(!connections.has(socket))socket.close(1008,'Authentication timeout');},arena.handshakeMs??5000):null;
        authTimer?.unref();
        let alive = true;
        socket.on('pong', () => alive = true);
        (socket as any).heartbeat = () => { if (!alive) {
            socket.terminate();
            return;
        } alive = false; socket.ping(); };
        socket.on('message', buffer => {
            let requestId: string | undefined;
            try {
                if(arena && !take(rate,arena.messagesPerMinute??120)){socket.close(1008,'Message limit reached');return;}
                const message = JSON.parse(buffer.toString());
                if(!message||typeof message!=='object'||Array.isArray(message))throw Error('Invalid frame');
                const validRequestId=typeof message.requestId==='string' && (arena
                    ? /^(?:[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/.test(message.requestId)
                    : message.requestId.length<=100);
                requestId=validRequestId?message.requestId:undefined;
                if(arena && message.type==='command' && !validRequestId)throw Error('Invalid command identity');
                if (message.type === 'hello') {
                    if (connections.has(socket))
                        throw Error('Already authenticated');
                    const room = authority.room(message.roomId);
                    authority.member(room, message.token);
                    authority.connect(room.id, message.token);
                    connections.set(socket, { roomId: room.id, token: message.token });
                    if(authTimer)clearTimeout(authTimer);
                    send(socket, { type: 'snapshot', room: authority.view(room), events: room.game?.eventLog ?? [], ...stateInfo(room) });
                    broadcastRoom(room.id);
                    return;
                }
                const c = connections.get(socket);
                if (!c)
                    throw Error('Authenticate first');
                if (message.type === 'resync') {
                    const r = authority.room(c.roomId);
                    send(socket, { type: 'snapshot', room: authority.view(r), events: r.game?.eventLog ?? [], ...stateInfo(r) });
                    return;
                }
                const result = authority.command(c.roomId, c.token, message), r = result.room;
                if (!result.duplicate && r.game) {
                    const delta = r.game.eventLog.slice(result.fromSeq);
                    for (const [other, session] of connections)
                        if (session.roomId === r.id)
                            send(other, { type: 'events', room: authority.view(r), fromSeq: result.fromSeq, events: delta, ...stateInfo(r), headHash: r.game.eventLog.at(-1)!.hash });
                }
                send(socket, { type: 'ack', requestId: message.requestId, duplicate: result.duplicate });
            }
            catch (e) {
                send(socket, { type: 'error', requestId, message: arena ? 'Arena command rejected; resynchronize' : (e as Error).message });
            }
        });
        socket.on('close', () => { if(authTimer)clearTimeout(authTimer); const c = connections.get(socket); connections.delete(socket); if (c) {
            const online = [...connections.values()].some(v => v.roomId === c.roomId && v.token === c.token);
            try {authority.connect(c.roomId, c.token, online);broadcastRoom(c.roomId);}catch{ /* Fail closed: no unpersisted state is broadcast. */ }
        } });
    });
    const stateInfo=(room:SavedRoom)=>arena?{version:room.game?.eventLog.length??0,headHash:room.game?.eventLog.at(-1)?.hash??null,legalActions:room.game&&isCurrentPolicy(room.game.rulePolicy)?authority.engine.legalActions(room.game):[]}:{};
    const cleanup=arena?setInterval(()=>{expire();for(const [ip,entry] of httpRates)if(now()>=entry.until)httpRates.delete(ip);},Math.min(idleMs,60000)):null;
    cleanup?.unref();
    const heartbeat = setInterval(() => ws.clients.forEach(socket => (socket as any).heartbeat?.()), 15000);
    heartbeat.unref();
    try {await new Promise<void>((ok, fail) => { server.once('error', fail); server.listen(options.port ?? 8787, options.host ?? '0.0.0.0', () => ok()); });}
    catch(error){clearInterval(heartbeat);if(cleanup)clearInterval(cleanup);ws.close();throw error;}
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
    let closing:Promise<void>|undefined;
    return { server, authority, port, close: () => closing ??= (async () => { clearInterval(heartbeat); if(cleanup)clearInterval(cleanup); browser?.stop(); bonjour?.destroy(); ws.clients.forEach(s => s.terminate()); await new Promise<void>(ok => ws.close(() => ok())); await new Promise<void>(ok => server.close(() => ok())); })() };
}
