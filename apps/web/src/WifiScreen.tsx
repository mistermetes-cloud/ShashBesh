import {t,type MessageKey} from './i18n';
import {useEffect,useState} from 'react';
import {baseUrl,rooms,register,type ClientStatus,type RoomClient} from '../../../packages/lan/src/client';
import type {RoomView,Membership} from '../../../packages/lan/src/protocol';
import {canHostAndroid,startAndroidHost} from './androidHost';
import {discoverLan} from './lanDiscovery';
import {colorName} from './gameText';
export function WifiScreen({status,client,capacity,onJoin,onLeave,onGame}:{status:ClientStatus|null;client:RoomClient|null;capacity:number;onJoin:(url:string,m:Membership)=>void;onLeave:()=>void;onGame:()=>void}) {
    const [address,setAddress]=useState(()=>localStorage.getItem('mobile-wifi-address') || (location.port==='5173'?`http://${location.hostname}:8787`:location.origin));
    const [name,setName]=useState(t("ui.player")),[gameName,setGameName]=useState(t("ui.shashbesh.43")),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState<MessageKey|''>(''),[canCreate,setCanCreate]=useState(canHostAndroid()),[hostAddresses,setHostAddresses]=useState<string[]>([]);
    const [found,setFound]=useState<{url:string;room:RoomView}[]>([]);
    useEffect(()=>{let live=true;if(canHostAndroid())return;setCanCreate(false);void rooms(address).then(list=>{if(live&&Array.isArray(list))setCanCreate(true);}).catch(()=>{});return()=>{live=false;};},[address]);
    useEffect(()=>{if(canHostAndroid()&&localStorage.getItem('lan-host-enabled')==='true')void startAndroidHost().then(setHostAddresses).catch(()=>{});},[]);
    const run=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');setNotice('');try{await fn();}catch{setError(t("ui.could.not.connect.check.the.shared.wi.fi.network.or.enter.the.hos"));}finally{setBusy(false);}};
    async function create(){
        let url=baseUrl(address);
        if(canHostAndroid()){setHostAddresses(await startAndroidHost());url='http://127.0.0.1:8787';}
        onJoin(url,await register(url,{roomName:gameName,capacity,playerName:name}));
    }
    async function find(){
        const addresses=new Set<string>();
        if(canHostAndroid())for(const host of await discoverLan(address))addresses.add(host.url);
        else {addresses.add(baseUrl(address));try{for(const host of await discoverLan(address))addresses.add(host.url);}catch{}}
        const results=await Promise.allSettled([...addresses].map(async url=>({url,list:await rooms(url)})));
        const games:{url:string;room:RoomView}[]=[];
        for(const result of results)if(result.status==='fulfilled'&&Array.isArray(result.value.list))for(const room of result.value.list)if(room.status==='lobby')games.push({url:result.value.url,room});
        setFound(games);
        if(!games.length)setNotice("ui.no.games.found.create.a.game.on.another.device.or.connect.manuall");
    }
    return <section className="wifi-screen"><h1>{t("ui.wi.fi.game")}</h1>
        {status?.room ? <><h2>{status.room.name}</h2><p>{t("ui.you.are")}{" "}{colorName(client!.membership.playerId)}</p><ul className="wifi-seats">{status.room.players.map(p=><li key={p.id}><i className={`p${p.id}`} aria-hidden="true"/>{colorName(p.id)} · {p.name}<span>{p.online?t("ui.ready"):t("ui.waiting.for.return.100")}</span></li>)}</ul><p>{!status.connected?t("ui.reconnecting.101"):status.busy?t("ui.confirming.move"):t("ui.everyone.connects.to.the.same.game")}</p>{status.room.status==='lobby' && status.room.hostPlayer===client?.membership.playerId && <button className="start-playing" disabled={!status.connected||status.busy||status.room.players.length<2||status.room.players.some(p=>!p.online)} onClick={()=>void run(()=>client!.command('start'))}>{t("ui.start.game")}</button>}{status.room.status!=='lobby'&&<button className="start-playing" onClick={onGame}>{t("ui.return.to.board")}</button>}<button className="quiet-button" onClick={onLeave}>{t("ui.leave.game")}</button></> : <><div className="wifi-main-actions"><button disabled={busy||!canCreate} onClick={()=>void run(create)}>{t("ui.create.game")}</button><button disabled={busy} onClick={()=>void run(find)}>{t("ui.find.game")}</button></div>{!canCreate&&!canHostAndroid() && <p className="home-note">{t("ui.hosting.is.unavailable.here.find.a.game.or.configure.a.manual.con")}</p>}{busy && <p role="status">{t("ui.connecting")}</p>}{found.map(({url,room})=><div className="found-game" key={`${url}:${room.id}`}><span>{room.name}<small>{room.players.length} {" "}{t("ui.of")}{" "}{room.capacity} {" "}{t("ui.players.111")}</small></span><button disabled={busy||room.players.length>=room.capacity} onClick={()=>void run(async()=>onJoin(url,await register(url,{playerName:name},room.id)))}>{t("ui.join")}</button></div>)}</>}
        {notice && <p role="status" className="home-note">{t(notice)}</p>}{error && <p role="alert" className="mobile-error">{t('game.error')}</p>}
        <details className="wifi-advanced"><summary>{t("ui.manual.connection.and.settings")}</summary><label>{t("ui.your.name")}<input value={name} maxLength={48} onChange={e=>setName(e.target.value)}/></label><label>{t("ui.game.name")}<input value={gameName} maxLength={48} onChange={e=>setGameName(e.target.value)}/></label><label>{t("ui.device.address")}<input aria-label={t("ui.device.address")} value={address} onChange={e=>{setAddress(e.target.value);localStorage.setItem('mobile-wifi-address',e.target.value);}} placeholder="192.168.1.10:8787"/></label><button disabled={busy} onClick={()=>void run(async()=>{const url=baseUrl(address),list=await rooms(url);if(!Array.isArray(list))throw Error('No games');setFound(list.filter(room=>room.status==='lobby').map(room=>({url,room})));if(!list.length)setNotice("ui.no.open.games.on.this.device.yet");})}>{t("ui.show.games.at.address")}</button>{hostAddresses.map(url=><p key={url}>{t("ui.your.game.address")}{" "}{url}</p>)}{!canHostAndroid()&&<p>{t("ui.to.host.on.ubuntu.run")}{" "}<code>npm run lan:dev</code>{t("ui.browsers.search.a.known.address.automatic.wi.fi.discovery.is.avai")}</p>}{canHostAndroid()&&<p>{t("ui.keep.the.hosting.app.open.if.discovery.fails.enter.the.other.devi")}</p>}</details>
    </section>;
}
