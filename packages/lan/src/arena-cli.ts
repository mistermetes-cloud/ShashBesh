import {startArenaServer} from './arena';
const bindHost=process.env.SHASHBESH_ARENA_HOST??'127.0.0.1';
const host=await startArenaServer({host:bindHost,port:Number(process.env.SHASHBESH_ARENA_PORT??8787),directory:process.env.SHASHBESH_ARENA_DIRECTORY});
console.log(`ShashBesh Arena local: http://${bindHost}:${host.port}`);
console.log('Two seats per room; explicit interface only, no discovery. Keep player browser profiles for reconnect.');
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{void host.close().then(()=>process.exit(0));});
