import {t} from './i18n';
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
    const [url, setUrl] = useState(`http://${location.hostname === 'localhost' ? '127.0.0.1' : location.hostname}:8787`), [name, setName] = useState(t("ui.player")), [roomName, setRoomName] = useState(t("ui.shashbesh.43")), [capacity, setCapacity] = useState(2), [list, setList] = useState<RoomView[]>([]), [hosts, setHosts] = useState<LanHost[]>([]), [error, setError] = useState(''), [hostUrls, setHostUrls] = useState<string[]>([]);
    const run = async (fn: () => Promise<unknown>) => { try {
        await fn();
        setError('');
    }
    catch (e) {
        setError((e as Error).message);
    } };
    useEffect(() => { if (canHostAndroid() && localStorage.getItem('lan-host-enabled') === 'true') void startAndroidHost().then(setHostUrls).catch(e => setError(e.message)); }, []);
    return <section className="panel lan-panel"><h3>{t("ui.local.network.wi.fi")}</h3>{error && <p className="error" role="alert">{t('game.error')}</p>}
 {hostUrls.length > 0 && <p className="note">{t("ui.address.for.ubuntu")}{" "}{hostUrls.join(', ')}{t("ui.keep.the.app.open")}</p>}
 {status?.room ? <><p className="note">{status.room.name} {" "}{t("ui.you.are.p")}{client?.membership.playerId} · {status.connected ? t("ui.connected") : t("ui.reconnecting")}{status.busy ? t("ui.waiting.for.host") : ''}</p><ul>{status.room.players.map(p => <li key={p.id}>P{p.id} {p.name} · {p.online ? t("ui.online") : t("ui.waiting.for.return")}</li>)}</ul>{status.error && <p className="error">{t('game.error')}</p>}{status.room.status === 'lobby' && <button disabled={!status.connected || client?.membership.playerId !== status.room.hostPlayer || status.room.players.length < 2 || status.room.players.some(p => !p.online)} onClick={() => void run(() => client!.command('start'))}>{t("ui.start.lan.match")}</button>}<button onClick={onLeave}>{t("ui.leave.room")}</button></> : <>
 <label>{t("ui.host.address.ip")}<input aria-label={t("ui.host.address.ip")} value={url} onChange={e => setUrl(e.target.value)}/></label><label>{t("ui.your.name")}<input value={name} onChange={e => setName(e.target.value)}/></label><label>{t("ui.room.name")}<input value={roomName} onChange={e => setRoomName(e.target.value)}/></label><label>{t("ui.maximum.players")}<select value={capacity} onChange={e => setCapacity(Number(e.target.value))}>{[2, 3, 4].map(n => <option key={n}>{n}</option>)}</select></label>
 {canHostAndroid() && <button onClick={() => void run(async () => { const addresses = await startAndroidHost(); setHostUrls(addresses); setUrl('http://127.0.0.1:8787'); })}>{t("ui.host.on.android")}</button>}
 <div className="controls"><button onClick={() => void run(async () => onJoin(baseUrl(url), await register(url, { roomName, capacity, playerName: name })))}>{t("ui.create.room")}</button><button onClick={() => void run(async () => setList(await rooms(url)))}>{t("ui.host.rooms")}</button><button onClick={() => void run(async () => setHosts(await discoverLan(baseUrl(url))))}>{t("ui.find.on.wi.fi")}</button></div>
 {hosts.map(host => <button key={host.url} onClick={() => { setUrl(host.url); void run(async () => setList(await rooms(host.url))); }}>{host.name} · {host.url}</button>)}
 {list.map(room => <div key={room.id} className="lan-room"><span>{room.name} · {room.players.length}/{room.capacity}</span><button disabled={room.status !== 'lobby' || room.players.length >= room.capacity} onClick={() => void run(async () => onJoin(baseUrl(url), await register(url, { playerName: name }, room.id)))}>{t("ui.connect")}</button></div>)}
 <p className="muted">{t("ui.one.ubuntu.or.android.host.validates.moves.and.rolls.dice.android")}</p></>}
 </section>;
}
