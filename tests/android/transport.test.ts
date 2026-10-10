import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {WebSocket} from 'ws';
import {Authority} from '../../packages/lan/src/authority';
import {LanHostSession} from '../../packages/lan/src/host';
import {engine} from '../helpers';
import {seeded} from '../../packages/engine/src/rng';
import {stateHash} from '../../packages/engine/src/index';
import type {Membership, ServerFrame} from '../../packages/lan/src/protocol';

test('Native Android HTTP/WebSocket transport: Ubuntu joins, synchronized dice and reconnect', {timeout:30000}, async () => {
    const child = spawn('java',['-cp',process.env.SHASHBESH_TRANSPORT_CP!,'LanTransportHarness'],{stdio:['pipe','pipe','inherit']});
    const lines=createInterface({input:child.stdout});
    const authority=new Authority(engine,seeded('native-android-host'));
    const output=(fields:string[])=>child.stdin.write(fields.join('\t')+'\n');
    const b64=(value:string)=>Buffer.from(value).toString('base64');
    const session=new LanHostSession(authority,(peer,frame)=>output(['SEND',peer,b64(JSON.stringify(frame))]));
    const ready=new Promise<number>((resolve,reject)=>{
        child.once('error',reject);
        lines.on('line',line=>{
            const [type,kind,id,peer,method,path,body]=line.split('\t');
            if(type==='READY') {resolve(Number(kind));return;}
            if(type!=='EVENT')return;
            const text=Buffer.from(body,'base64').toString();
            if(kind==='message'){session.message(peer,JSON.parse(text));return;}
            if(kind==='close'){session.disconnect(peer);return;}
            try{output(['RESPONSE',id,'200',b64(JSON.stringify(session.http(method,path,text?JSON.parse(text):{})))]);}
            catch(error){output(['RESPONSE',id,'400',b64(JSON.stringify({error:(error as Error).message}))]);}
        });
    });
    const sockets:WebSocket[]=[];
    try {
        const port=await ready,base=`http://127.0.0.1:${port}`;
        const post=async(path:string,body:unknown)=>(await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).json() as Promise<Membership>;
        assert.match(await(await fetch(base)).text(),/root/);
        const phone=await post('/api/rooms',{roomName:'Android native',capacity:2,playerName:'Phone'});
        const ubuntu=await post(`/api/rooms/${phone.room.id}/join`,{playerName:'Ubuntu'});
        async function connect(member:Membership){
            const socket=new WebSocket(`ws://127.0.0.1:${port}/ws`);sockets.push(socket);
            const frames:ServerFrame[]=[];socket.on('message',b=>frames.push(JSON.parse(b.toString())));
            await new Promise<void>(resolve=>socket.once('open',()=>resolve()));
            const wait=async(predicate:(f:ServerFrame)=>boolean)=>{for(let i=0;i<500;i++){const frame=frames.find(predicate);if(frame)return frame;await new Promise(r=>setTimeout(r,10));}throw Error('Frame timeout');};
            socket.send(JSON.stringify({type:'hello',roomId:phone.room.id,token:member.token}));
            await wait(f=>f.type==='snapshot');return{socket,wait,frames};
        }
        const p=await connect(phone),u=await connect(ubuntu);
        let request=0;
        async function command(client:typeof p,operation:string,extra={}){
            const requestId=`native-${++request}`;
            client.socket.send(JSON.stringify({type:'command',requestId,operation,expectedHead:authority.room(phone.room.id).game?.eventLog.at(-1)?.hash??null,...extra}));
            return client.wait(f=>(f.type==='ack'||f.type==='error')&&f.requestId===requestId);
        }
        assert.equal((await command(p,'start')).type,'ack');
        while(authority.room(phone.room.id).game!.phase==='initial_roll') assert.equal((await command(p,'roll')).type,'ack');
        const actor=authority.room(phone.room.id).game!.activePlayer===1?p:u;
        assert.equal((await command(actor,'roll',{dice:[6,6]})).type,'error');
        assert.equal((await command(actor,'roll')).type,'ack');
        const state=authority.room(phone.room.id).game!,length=state.eventLog.length;
        for(const client of [p,u]){
            await client.wait(f=>f.type==='events'&&f.fromSeq+f.events.length===length);
            const events=client.frames.filter((f):f is Extract<ServerFrame,{type:'events'}>=>f.type==='events').flatMap(f=>f.events);
            assert.equal(stateHash(engine.replay(events)),stateHash(state));
        }
        u.socket.close();await new Promise<void>(r=>u.socket.once('close',()=>r()));
        const returned=await connect(ubuntu),snapshot=returned.frames.find(f=>f.type==='snapshot') as Extract<ServerFrame,{type:'snapshot'}>;
        assert.equal(stateHash(engine.replay(snapshot.events)),stateHash(state));
    } finally {sockets.forEach(s=>s.terminate());child.stdin.end();await new Promise<void>(r=>child.once('exit',()=>r()));lines.close();}
});
