import {networkInterfaces} from 'node:os';
import {isIPv4} from 'node:net';

/** Explicit opt-in only: never choose an interface or expose a wildcard listener. */
export function arenaBindHost(host='127.0.0.1', interfaces?:ReturnType<typeof networkInterfaces>):string {
    if(host==='127.0.0.1')return host;
    const [a,b]=host.split('.').map(Number);
    const privateAddress=isIPv4(host)&&(a===10||a===172&&b>=16&&b<=31||a===192&&b===168);
    if(!privateAddress)throw Error('Arena host must be loopback or an explicitly selected assigned private IPv4');
    const assigned=Object.values(interfaces??networkInterfaces()).flat().some(address=>address?.family==='IPv4'&&!address.internal&&address.address===host);
    if(!privateAddress||!assigned)throw Error('Arena host must be loopback or an explicitly selected assigned private IPv4');
    return host;
}

export function arenaRequestAllowed(boundHost:string, port:number|undefined, host:string|undefined, origin:string|undefined):boolean {
    if(boundHost==='127.0.0.1') {
        return typeof host==='string' && /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)
            && (!origin||origin===`http://${host}`||['http://127.0.0.1:5173','http://localhost:5173'].includes(origin));
    }
    // LAN uses one exact origin for both static assets and WS, with no dev CORS exception.
    return host===`${boundHost}:${port}` && (!origin||origin===`http://${host}`);
}
