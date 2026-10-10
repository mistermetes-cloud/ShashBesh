import {useEffect,useState} from 'react';
import {baseUrl,rooms,register,type ClientStatus,type RoomClient} from '../../../packages/lan/src/client';
import type {RoomView,Membership} from '../../../packages/lan/src/protocol';
import {canHostAndroid,startAndroidHost} from './androidHost';
import {discoverLan} from './lanDiscovery';
import {playerColors} from './mobile';
export function WifiScreen({status,client,capacity,onJoin,onLeave,onGame}:{status:ClientStatus|null;client:RoomClient|null;capacity:number;onJoin:(url:string,m:Membership)=>void;onLeave:()=>void;onGame:()=>void}) {
    const [address,setAddress]=useState(()=>localStorage.getItem('mobile-wifi-address') || (location.port==='5173'?`http://${location.hostname}:8787`:location.origin));
    const [name,setName]=useState('Игрок'),[gameName,setGameName]=useState('Шашбеш'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[canCreate,setCanCreate]=useState(canHostAndroid()),[hostAddresses,setHostAddresses]=useState<string[]>([]);
    const [found,setFound]=useState<{url:string;room:RoomView}[]>([]);
    useEffect(()=>{let live=true;if(canHostAndroid())return;setCanCreate(false);void rooms(address).then(list=>{if(live&&Array.isArray(list))setCanCreate(true);}).catch(()=>{});return()=>{live=false;};},[address]);
    useEffect(()=>{if(canHostAndroid()&&localStorage.getItem('lan-host-enabled')==='true')void startAndroidHost().then(setHostAddresses).catch(()=>{});},[]);
    const run=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');setNotice('');try{await fn();}catch{setError('Не удалось связаться с игрой. Проверьте общую сеть Wi-Fi или укажите адрес в подключении вручную.');}finally{setBusy(false);}};
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
        if(!games.length)setNotice('Игр пока не найдено. Создайте игру на другом устройстве или подключитесь вручную.');
    }
    return <section className="wifi-screen"><h1>Игра по Wi-Fi</h1>
        {status?.room ? <><h2>{status.room.name}</h2><p>Вы — {playerColors[client!.membership.playerId].toLowerCase()}</p><ul className="wifi-seats">{status.room.players.map(p=><li key={p.id}><i className={`p${p.id}`}/>{p.name}<span>{p.online?'Готов':'Ждём возвращения'}</span></li>)}</ul><p>{!status.connected?'Восстанавливаем связь…':status.busy?'Подтверждаем ход…':'Все игроки подключаются к одной игре'}</p>{status.room.status==='lobby' && status.room.hostPlayer===client?.membership.playerId && <button className="start-playing" disabled={!status.connected||status.busy||status.room.players.length<2||status.room.players.some(p=>!p.online)} onClick={()=>void run(()=>client!.command('start'))}>Начать игру</button>}{status.room.status!=='lobby'&&<button className="start-playing" onClick={onGame}>Вернуться на поле</button>}<button className="quiet-button" onClick={onLeave}>Выйти из игры</button></> : <><div className="wifi-main-actions"><button disabled={busy||!canCreate} onClick={()=>void run(create)}>Создать игру</button><button disabled={busy} onClick={()=>void run(find)}>Найти игру</button></div>{!canCreate&&!canHostAndroid() && <p className="home-note">Создание игры здесь пока недоступно. Найдите открытую игру или настройте подключение вручную.</p>}{busy && <p role="status">Ищем связь…</p>}{found.map(({url,room})=><div className="found-game" key={`${url}:${room.id}`}><span>{room.name}<small>{room.players.length} из {room.capacity} игроков</small></span><button disabled={busy||room.players.length>=room.capacity} onClick={()=>void run(async()=>onJoin(url,await register(url,{playerName:name},room.id)))}>Присоединиться</button></div>)}</>}
        {notice && <p role="status" className="home-note">{notice}</p>}{error && <p role="alert" className="mobile-error">{error}</p>}
        <details className="wifi-advanced"><summary>Подключение вручную и настройки</summary><label>Ваше имя<input value={name} maxLength={48} onChange={e=>setName(e.target.value)}/></label><label>Название игры<input value={gameName} maxLength={48} onChange={e=>setGameName(e.target.value)}/></label><label>Адрес устройства<input aria-label="Адрес устройства" value={address} onChange={e=>{setAddress(e.target.value);localStorage.setItem('mobile-wifi-address',e.target.value);}} placeholder="192.168.1.10:8787"/></label><button disabled={busy} onClick={()=>void run(async()=>{const url=baseUrl(address),list=await rooms(url);if(!Array.isArray(list))throw Error('No games');setFound(list.filter(room=>room.status==='lobby').map(room=>({url,room})));if(!list.length)setNotice('На этом устройстве пока нет открытых игр.');})}>Показать игры по адресу</button>{hostAddresses.map(url=><p key={url}>Адрес вашей игры: {url}</p>)}{!canHostAndroid()&&<p>Для размещения игры на Ubuntu запустите <code>npm run lan:dev</code>. Браузер ищет игры по известному адресу; автоматический поиск в Wi-Fi доступен в Android и ещё требует проверки на телефоне.</p>}{canHostAndroid()&&<p>Держите приложение, создавшее игру, открытым. Если поиск в вашей сети не сработал, введите адрес другого устройства.</p>}</details>
    </section>;
}
