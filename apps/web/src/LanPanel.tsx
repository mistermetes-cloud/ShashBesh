import { useEffect, useState } from 'react';
import { rooms, register, baseUrl, type RoomClient, type ClientStatus } from '../../../packages/lan/src/client';
import type { RoomView, Membership, LanHost } from '../../../packages/lan/src/protocol';
import { canHostAndroid, startAndroidHost } from './androidHost';
import { discoverLan } from './lanDiscovery';
export function LanPanel({ status, client, onJoin, onLeave }: {
    status: ClientStatus | null;
    client: RoomClient | null;
    onJoin: (url: string, m: Membership) => void;
    onLeave: () => void;
}) {
    const [url, setUrl] = useState(`http://${location.hostname === 'localhost' ? '127.0.0.1' : location.hostname}:8787`), [name, setName] = useState('Игрок'), [roomName, setRoomName] = useState('Шашбеш'), [capacity, setCapacity] = useState(2), [list, setList] = useState<RoomView[]>([]), [hosts, setHosts] = useState<LanHost[]>([]), [error, setError] = useState(''), [hostUrls, setHostUrls] = useState<string[]>([]);
    const run = async (fn: () => Promise<unknown>) => { try {
        await fn();
        setError('');
    }
    catch (e) {
        setError((e as Error).message);
    } };
    useEffect(() => { if (canHostAndroid() && localStorage.getItem('lan-host-enabled') === 'true') void startAndroidHost().then(setHostUrls).catch(e => setError(e.message)); }, []);
    return <section className="panel lan-panel"><h3>Локальная сеть · Wi-Fi</h3>{error && <p className="error" role="alert">{error}</p>}
 {hostUrls.length > 0 && <p className="note">Адрес для Ubuntu: {hostUrls.join(', ')}. Держите приложение открытым.</p>}
 {status?.room ? <><p className="note">{status.room.name} · вы P{client?.membership.playerId} · {status.connected ? 'подключено' : 'переподключение…'}{status.busy ? ' · ожидание узла' : ''}</p><ul>{status.room.players.map(p => <li key={p.id}>P{p.id} {p.name} · {p.online ? 'в сети' : 'ожидаем возврата'}</li>)}</ul>{status.error && <p className="error">{status.error}</p>}{status.room.status === 'lobby' && <button disabled={!status.connected || client?.membership.playerId !== status.room.hostPlayer || status.room.players.length < 2 || status.room.players.some(p => !p.online)} onClick={() => void run(() => client!.command('start'))}>Начать LAN партию</button>}<button onClick={onLeave}>Выйти из комнаты</button></> : <>
 <label>Адрес узла / IP<input aria-label="Адрес узла / IP" value={url} onChange={e => setUrl(e.target.value)}/></label><label>Ваше имя<input value={name} onChange={e => setName(e.target.value)}/></label><label>Название комнаты<input value={roomName} onChange={e => setRoomName(e.target.value)}/></label><label>Максимум игроков<select value={capacity} onChange={e => setCapacity(Number(e.target.value))}>{[2, 3, 4].map(n => <option key={n}>{n}</option>)}</select></label>
 {canHostAndroid() && <button onClick={() => void run(async () => { const addresses = await startAndroidHost(); setHostUrls(addresses); setUrl('http://127.0.0.1:8787'); })}>Разместить узел на Android</button>}
 <div className="controls"><button onClick={() => void run(async () => onJoin(baseUrl(url), await register(url, { roomName, capacity, playerName: name })))}>Создать комнату</button><button onClick={() => void run(async () => setList(await rooms(url)))}>Комнаты узла</button><button onClick={() => void run(async () => setHosts(await discoverLan(baseUrl(url))))}>Найти в Wi-Fi</button></div>
 {hosts.map(host => <button key={host.url} onClick={() => { setUrl(host.url); void run(async () => setList(await rooms(host.url))); }}>{host.name} · {host.url}</button>)}
 {list.map(room => <div key={room.id} className="lan-room"><span>{room.name} · {room.players.length}/{room.capacity}</span><button disabled={room.status !== 'lobby' || room.players.length >= room.capacity} onClick={() => void run(async () => onJoin(baseUrl(url), await register(url, { playerName: name }, room.id)))}>Подключиться</button></div>)}
 <p className="muted">Один узел Ubuntu или Android проверяет действия и бросает кубики. Android ищет узлы через NSD; браузер показывает комнаты указанного узла. При отсутствии обнаружения укажите IP.</p></>}
 </section>;
}
