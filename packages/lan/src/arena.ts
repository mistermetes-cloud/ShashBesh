import {readFileSync} from 'node:fs';
import {Engine, parseGeometry} from '../../engine/src/index';
import type {Rng} from '../../engine/src/rng';
import {Authority} from './authority';
import {ArenaStore} from './arena-store';
import {startLanServer} from './server';
import {arenaBindHost} from './arena-binding';

export async function startArenaServer(options: {
    port?:number; host?:string; directory?:string; rng?:Rng; now?:()=>number;
    maxRooms?:number; maxConnections?:number; idleMs?:number; handshakeMs?:number;
    messageBytes?:number; messagesPerMinute?:number;
}={}) {
    const bindHost=arenaBindHost(options.host);
    const maxRooms=options.maxRooms??16, idleMs=options.idleMs??24*60*60*1000, now=options.now??Date.now;
    for(const n of [maxRooms,idleMs,options.maxConnections??16,options.handshakeMs??5000,options.messageBytes??8192,options.messagesPerMinute??120])
        if(!Number.isSafeInteger(n)||n<1)throw Error('Invalid Arena limits');
    const store=new ArenaStore(options.directory??'artifacts/arena/rooms');
    try {
        const engine=new Engine(parseGeometry(readFileSync(new URL('../../../data/igra_64_koordinaty.csv',import.meta.url),'utf8')),{clock:()=>new Date().toISOString(),timeSource:'wall'});
        const authority=new Authority(engine,options.rng,store.save,{maxRooms,capacity:2,receiptLimit:Infinity,now});
        for(const room of store.load()) {
            // Validate even expired archives; never silently skip corruption or overwrite it.
            authority.restore(room);
            if(!Number.isFinite(room.updatedAt))throw Error('Arena room missing activity timestamp');
            if(now()-room.updatedAt!>=idleMs)authority.rooms.delete(room.id);
        }
        if(authority.rooms.size>maxRooms)throw Error('Stored Arena rooms exceed configured limit');
        const host=await startLanServer({port:options.port??8787,host:bindHost,discovery:false,directory:store.directory,authority,
            arena:{...options,maxRooms,idleMs,now,messageBytes:options.messageBytes??8192}});
        return {...host, close:async()=>{try{await host.close();}finally{store.close();}}};
    } catch(error){store.close();throw error;}
}
