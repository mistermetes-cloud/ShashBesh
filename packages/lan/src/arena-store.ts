import {closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {hash} from '../../engine/src/index';
import type {SavedRoom} from './authority';

/** Single-process durable room transactions, including events and command receipts. */
export class ArenaStore {
    readonly directory: string;
    private lock: string;
    private closed = false;
    private released = false;
    constructor(directory: string) {
        this.directory=resolve(directory);
        mkdirSync(this.directory,{recursive:true,mode:0o700});
        this.lock=join(this.directory,'.writer-lock');
        // Serialize stale-lock recovery too. Without this guard, two starters could
        // both observe a dead PID and the second could rename the first's new lock.
        // An interrupted startup is deliberately fail-closed, preserving all files.
        const startup=join(this.directory,'.startup-lock');
        const startupFd=openSync(startup,'wx',0o600);
        try {
            writeFileSync(startupFd,String(process.pid));fsyncSync(startupFd);
            if(existsSync(this.lock)) {
                const pid=Number(readFileSync(this.lock,'utf8'));
                if(!Number.isSafeInteger(pid)||pid<1)throw Error('Invalid Arena writer lock; inspect storage');
                let live=true;
                try{process.kill(pid,0);}catch(error){if((error as NodeJS.ErrnoException).code==='ESRCH')live=false;else throw Error('Arena writer lock unavailable');}
                if(live)throw Error('Arena storage already in use');
                renameSync(this.lock,this.lock+'.stale-'+randomUUID());
            }
            const fd=openSync(this.lock,'wx',0o600);
            try{writeFileSync(fd,String(process.pid));fsyncSync(fd);}finally{closeSync(fd);}
        } finally {closeSync(startupFd);unlinkSync(startup);}
    }
    load(): SavedRoom[] {
        if(this.closed)throw Error('Arena store closed');
        return readdirSync(this.directory).filter(f=>f.endsWith('.room.json')).map(file=>{
            try {
                const envelope=JSON.parse(readFileSync(join(this.directory,file),'utf8'));
                if(envelope.schema!==1 || envelope.checksum!==hash(envelope.room) || file!==envelope.room.id+'.room.json')throw Error();
                return envelope.room as SavedRoom;
            } catch {throw Error('Arena storage integrity check failed; original file preserved');}
        });
    }
    save = (room: SavedRoom) => {
        if(this.closed)throw Error('Arena store closed');
        if(!/^[a-f0-9-]{36}$/.test(room.id)||room.members.some(m=>!/^sha256:[a-f0-9]{64}$/.test(m.token)))throw Error('Invalid stored credentials');
        const file=join(this.directory,room.id+'.room.json'), temp=file+'.'+randomUUID()+'.tmp';
        const fd=openSync(temp,'wx',0o600);
        try{writeFileSync(fd,JSON.stringify({schema:1,checksum:hash(room),room}));fsyncSync(fd);}finally{closeSync(fd);}
        renameSync(temp,file);
        // Directory fsync makes the rename durable before Authority publishes the state.
        const dir=openSync(this.directory,'r');
        try{fsyncSync(dir);}catch{this.closed=true;throw Error('Arena storage requires recovery');}finally{closeSync(dir);}
    };
    close() {
        if(this.released)return;
        // Remove only our own generated process lock, never rooms or historical data.
        if(existsSync(this.lock)&&readFileSync(this.lock,'utf8')===String(process.pid))unlinkSync(this.lock);
        this.closed=true;
        this.released=true;
    }
}
