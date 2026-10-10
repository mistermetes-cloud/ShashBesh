import { networkInterfaces } from 'node:os';
import { startLanServer } from './server';
const host = await startLanServer({ port: Number(process.env.SHASHBESH_LAN_PORT ?? 8787) });
console.log(`ShashBesh LAN authority ready on port ${host.port}`);
for (const values of Object.values(networkInterfaces()))
    for (const ip of values ?? [])
        if (ip.family === 'IPv4')
            console.log(`http://${ip.address}:${host.port}`);
console.log('Room discovery: _shashbesh._tcp.local; fallback: connect by IP');
for (const signal of ['SIGINT', 'SIGTERM'] as const)
    process.once(signal, () => { void host.close().then(() => process.exit(0)); });
