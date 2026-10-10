import { Authority } from './authority';
import type { ServerFrame } from './protocol';

/** Transport adapter shared by the Android bridge and software contract checks. */
export class LanHostSession {
    private connections = new Map<string, {roomId: string; token: string}>();
    constructor(readonly authority: Authority, readonly send: (id: string, frame: ServerFrame) => void) {}
    private broadcast(id: string) {
        const room = this.authority.view(this.authority.room(id));
        for (const [peer, session] of this.connections) if (session.roomId === id) this.send(peer, {type: 'room', room});
    }
    http(method: string, path: string, body: any): unknown {
        if (method === 'GET' && path === '/api/rooms') return this.authority.list();
        if (method === 'GET' && path === '/api/discovery') return [];
        let membership;
        if (method === 'POST' && path === '/api/rooms') membership = this.authority.create(body.roomName, body.capacity, body.playerName);
        else if (method === 'POST' && /^\/api\/rooms\/[^/]+\/join$/.test(path)) membership = this.authority.join(decodeURIComponent(path.split('/')[3]), body.playerName);
        else throw Error('Unknown API route');
        this.broadcast(membership.room.id);
        return membership;
    }
    message(peer: string, message: any) {
        try {
            if (message.type === 'hello') {
                if (this.connections.has(peer)) throw Error('Already authenticated');
                const room = this.authority.room(message.roomId);
                this.authority.member(room, message.token);
                this.authority.connect(room.id, message.token);
                this.connections.set(peer, {roomId: room.id, token: message.token});
                this.send(peer, {type:'snapshot', room:this.authority.view(room), events:room.game?.eventLog ?? []});
                this.broadcast(room.id);
                return;
            }
            const session = this.connections.get(peer);
            if (!session) throw Error('Authenticate first');
            const room = this.authority.room(session.roomId);
            if (message.type === 'resync') {
                this.send(peer, {type:'snapshot', room:this.authority.view(room), events:room.game?.eventLog ?? []});
                return;
            }
            const result = this.authority.command(room.id, session.token, message);
            if (!result.duplicate && room.game) for (const [other, connection] of this.connections) if (connection.roomId === room.id)
                this.send(other, {type:'events', room:this.authority.view(room), fromSeq:result.fromSeq, events:room.game.eventLog.slice(result.fromSeq), headHash:room.game.eventLog.at(-1)!.hash});
            this.send(peer, {type:'ack', requestId:message.requestId, duplicate:result.duplicate});
        } catch (error) { this.send(peer, {type:'error', requestId:message?.requestId, message:(error as Error).message}); }
    }
    disconnect(peer: string) {
        const connection = this.connections.get(peer);
        this.connections.delete(peer);
        if (connection) {
            const online = [...this.connections.values()].some(c => c.roomId === connection.roomId && c.token === connection.token);
            this.authority.connect(connection.roomId, connection.token, online);
            this.broadcast(connection.roomId);
        }
    }
}
