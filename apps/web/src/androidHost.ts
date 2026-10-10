import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import csv from '../../../data/igra_64_koordinaty.csv?raw';
import { Engine, parseGeometry } from '../../../packages/engine/src/index';
import { Authority, type SavedRoom } from '../../../packages/lan/src/authority';
import { LanHostSession } from '../../../packages/lan/src/host';

interface BridgeEvent {kind: 'http'|'message'|'close'; id: string; peer?: string; method?: string; path?: string; body?: string; message?: string}
const bridge = registerPlugin<{
    addListener(name: 'request', fn: (event: BridgeEvent) => void): Promise<PluginListenerHandle>;
    start(): Promise<{urls: string[]}>;
    respond(value: {id: string; status: number; body: string}): Promise<void>;
    send(value: {peer: string; message: string}): Promise<void>;
}>('LanHost');
let active: Promise<string[]> | undefined;
export const canHostAndroid = () => Capacitor.getPlatform() === 'android';
export function startAndroidHost(): Promise<string[]> {
    return active ??= (async () => {
        const engine = new Engine(parseGeometry(csv), {clock: () => new Date().toISOString(), timeSource:'wall'});
        const authority = new Authority(engine, undefined, room => localStorage.setItem('lan-host-room:' + room.id, JSON.stringify(room)));
        for (let i=0;i<localStorage.length;i++) {
            const key = localStorage.key(i)!;
            if (key.startsWith('lan-host-room:')) authority.restore(JSON.parse(localStorage.getItem(key)!) as SavedRoom);
        }
        const session = new LanHostSession(authority, (peer, frame) => { void bridge.send({peer, message:JSON.stringify(frame)}).catch(console.error); });
        const listener = await bridge.addListener('request', event => {
            if (event.kind === 'close') {session.disconnect(event.peer!); return;}
            if (event.kind === 'message') {
                try { session.message(event.peer!, JSON.parse(event.message!)); }
                catch { void bridge.send({peer:event.peer!,message:JSON.stringify({type:'error',message:'Invalid JSON'})}); }
                return;
            }
            try {
                const result = session.http(event.method!, event.path!, event.body ? JSON.parse(event.body) : {});
                void bridge.respond({id:event.id, status:200, body:JSON.stringify(result)});
            } catch (error) { void bridge.respond({id:event.id, status:400, body:JSON.stringify({error:(error as Error).message})}); }
        });
        try { const result = await bridge.start(); localStorage.setItem('lan-host-enabled','true'); return result.urls; }
        catch(error) { await listener.remove(); throw error; }
    })().catch(error => {active = undefined; throw error;});
}
// Reopen the authority before a saved LAN client reconnects after WebView reload.
if (canHostAndroid() && localStorage.getItem('lan-host-enabled') === 'true') void startAndroidHost().catch(console.error);
