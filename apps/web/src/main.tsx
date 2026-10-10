import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import csv from '../../../data/igra_64_koordinaty.csv?raw';
import { Engine, parseGeometry, exportLog, importLog, POLICY, checkpoint, actionHistory } from '../../../packages/engine/src/index';
import { secure, seeded, type Rng } from '../../../packages/engine/src/rng';
import { resolveAgentRoll, agentIdentity, neuralScorer, type Controllers, type Strategy } from '../../../packages/agents/src/index';
import type { Action, GameState, Player, GameEvent, ControllerIdentity } from '../../../packages/shared/src/index';
import { exportDataset } from '../../../packages/training/src/index';
import { loadLocalGame, saveLocalGame, listLocalGames, type LocalSave } from './storage';
import { uniqueId, restoreRng } from './random';
import { LanPanel } from './LanPanel';
import { RoomClient, type ClientStatus } from '../../../packages/lan/src/client';
import type { Membership } from '../../../packages/lan/src/protocol';
import { HistoryPanel } from './HistoryPanel';
import { PlayerPanel } from './PlayerPanel';
import { dicePresentation } from './presentation';
import { Board } from './Board';
import { HomeScreen } from './HomeScreen';
import { WifiScreen } from './WifiScreen';
import { TableDice } from './TableDice';
import { mobileControllers, playerColors } from './mobile';
import './style.css';
import './mobile.css';
const geometry = parseGeometry(csv), engine = new Engine(geometry, { clock: () => new Date().toISOString(), timeSource: 'wall' });
const names: Record<string, string> = { human: 'Человек', random: 'Случайный', greedy: 'Жадный', tactical: 'Тактический', 'ai-v0.1': neuralScorer.version };
const primary = new Set(['game_created', 'initial_roll', 'dice_roll', 'action', 'roll_finished', 'undo_action']);
function boundaries(events: GameEvent[]) {
    const command = (e: GameEvent) => primary.has(e.type) && !(e.type === 'roll_finished' && (e.payload as {
        reason?: string;
    }).reason === 'victory');
    return events.map((_, i) => i + 1).filter(i => i === events.length || command(events[i]));
}
const shortCell = (id: string | null) => id === null ? 'резерв' : id.startsWith('М') ? String(Number(id.slice(1))) : id.replace('Д', 'Д').replace('-', '.');
const describe = (a: Action) => `${a.pieceId} · ${a.kind === 'corner_jump' ? 'прыжок' : a.kind === 'deploy' ? 'выход' : 'ход'} ${a.value}: ${shortCell(a.from)} → ${shortCell(a.to)}${a.captureIds.length ? ' · сбитие' : ''}`;
function eventText(e: GameEvent) {
    const p = e.payload as Record<string, any>;
    switch (e.type) {
        case 'game_created': return 'Партия создана';
        case 'initial_roll': return 'Жребий: ' + Object.entries(p.values).map(([id, n]) => `P${id}: ${n}`).join(', ');
        case 'dice_roll': return `P${e.actor} бросает ${p.dice.join(' + ')}`;
        case 'action': return describe(e.payload as Action);
        case 'capture': return `${p.pieceId} возвращается в резерв`;
        case 'piece_finished': return `${p.pieceId} завершила путь`;
        case 'roll_finished': return `Бросок завершён · использовано ${p.usedPoints}`;
        case 'extra_roll': return 'Дополнительный бросок';
        case 'turn_changed': return `Очередь P${p.to}`;
        case 'undo_action': return `P${e.actor} отменяет действие #${p.targetSeq + 1}`;
        case 'victory': return `Победа P${p.winner}`;
        default: return e.type;
    }
}
const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const defaults: Controllers = { 1: 'human', 2: 'tactical', 3: 'greedy', 4: 'random' };
function identity(controllers: Controllers, gameId: string, p: Player): ControllerIdentity {
    const type = controllers[p] ?? 'human';
    return { kind: type === 'human' ? 'human' : 'agent', id: type === 'human' ? `local:${gameId}:P${p}` : type, version: type === 'human' ? null : agentIdentity(type).version };
}
function createGame(count: number, controllers: Controllers, seed: string | null) {
    const id = `local-${uniqueId()}`, players = Array.from({ length: count }, (_, i) => (i + 1) as Player);
    return engine.create(players, id, seed, POLICY, Object.fromEntries(players.map(p => [p, identity(controllers, id, p)])));
}
function App() {
    const [screen,setScreen]=useState<'home'|'game'|'wifi'>('home'),[technicalOpen,setTechnicalOpen]=useState(false),[menuOpen,setMenuOpen]=useState(false),[mobileCount,setMobileCount]=useState(2);
    const [chosenPiece,setChosenPiece]=useState<string|null>(null),[actionChoices,setActionChoices]=useState<Action[]>([]),[savedGames,setSavedGames]=useState<LocalSave[]|null>(null);
    const [state, setState] = useState(() => createGame(4, defaults, null)), [count, setCount] = useState(4), [controllers, setControllers] = useState<Controllers>(defaults);
    const [seed, setSeed] = useState(''), [running, setRunning] = useState(false), [speed, setSpeed] = useState(450), [error, setError] = useState(''), [selected, setSelected] = useState<Action | null>(null);
    const [replayEvents, setReplayEvents] = useState<GameEvent[] | null>(null), [replayStep, setReplayStep] = useState(0);
    const [restoring, setRestoring] = useState(true), [saveError, setSaveError] = useState('');
    const [lanStatus, setLanStatus] = useState<ClientStatus | null>(null), [lanMembership, setLanMembership] = useState<Membership | null>(null);
    const lanClient = useRef<RoomClient | null>(null), localBeforeLan = useRef<{
        state: GameState;
        controllers: Controllers;
        count: number;
        seed: string;
        speed: number;
    } | null>(null), resumeLan = useRef(false);
    const [historyOpen, setHistoryOpen] = useState(false), [historyIndex, setHistoryIndex] = useState(0), [historyBefore, setHistoryBefore] = useState(false);
    const historyRows = useMemo(() => historyOpen ? actionHistory(engine, state.eventLog) : [], [historyOpen, state]);
    const historyRow = historyRows[historyIndex];
    const diceRng = useRef<Rng>(secure), agentRng = useRef<Rng>(secure);
    const upload = useRef<HTMLInputElement>(null);
    const replayStops = useMemo(() => replayEvents ? boundaries(replayEvents) : [], [replayEvents]);
    const viewed = useMemo(() => historyOpen && historyRow ? (historyBefore ? historyRow.before : historyRow.after) : replayEvents ? engine.replay(replayEvents.slice(0, replayStops[replayStep])) : state, [historyOpen, historyRow, historyBefore, replayEvents, replayStops, replayStep, state]);
    const actions = useMemo(() => replayEvents ? [] : engine.legalActions(state), [state, replayEvents]);
    const bot = !lanMembership && controllers[state.activePlayer] !== 'human';
    function act(fn: () => GameState) {
        try {
            setState(fn());
            setError('');
            setSelected(null);
        }
        catch (e) {
            setError(String((e as Error).message));
            setRunning(false);
        }
    }
    function advance(s: GameState): GameState {
        if (s.phase === 'initial_roll')
            return engine.initialRoll(s, Object.fromEntries(s.initialContenders.map(p => [p, diceRng.current.die()])));
        if (s.phase === 'await_roll')
            return engine.roll(s, s.pendingRolls?.[0].dice ?? [diceRng.current.die(), diceRng.current.die()]);
        if (s.phase === 'resolving_roll') {
            const strategy = controllers[s.activePlayer];
            if (strategy === 'human' || !strategy)
                throw Error('Выберите действие человека вручную');
            const n = resolveAgentRoll(engine, s, strategy, agentRng.current);
            return n.winner ? n : engine.finishRoll(n, identity(controllers, n.gameId, n.activePlayer));
        }
        return s;
    }
    useEffect(() => {
        if (lanMembership || restoring || !running || historyOpen || replayEvents || state.winner || (!bot && state.phase !== 'initial_roll'))
            return;
        const timer = setTimeout(() => act(() => advance(state)), speed);
        return () => clearTimeout(timer);
    }, [lanMembership, restoring, running, historyOpen, replayEvents, state, bot, speed, controllers]);
    function joinLan(url: string, membership: Membership) {
        if (!lanMembership)
            localBeforeLan.current = { state, controllers, count, seed, speed };
        setRunning(false);
        setHistoryOpen(false);
        setReplayEvents(null);
        lanClient.current?.close();
        let client: RoomClient;
        client = new RoomClient(engine, url, membership, status => { if (lanClient.current !== client)
            return; setLanStatus({ ...status }); if (status.state)
            setState(status.state); });
        lanClient.current = client;
        setLanMembership(membership);
        setLanStatus({ ...client.status, room: membership.room });
        try {
            localStorage.setItem('shashbesh-lan-session', JSON.stringify({ url, membership }));
        }
        catch { }
        client.connect();
    }
    function leaveLan() { lanClient.current?.close(); lanClient.current = null; setLanStatus(null); setLanMembership(null); localStorage.removeItem('shashbesh-lan-session'); if (localBeforeLan.current) {
        const saved = localBeforeLan.current;
        setState(saved.state);
        setControllers(saved.controllers);
        setCount(saved.count);
        setSeed(saved.seed);
        setSpeed(saved.speed);
    } localBeforeLan.current = null; }
    function sendLan(operation: Parameters<RoomClient['command']>[0], action?: Action) { void lanClient.current?.command(operation, action).catch(e => setError(e.message)); }
    function rollGame() { if (lanMembership)
        sendLan('roll');
    else
        act(() => advance(state)); }
    function moveGame(action: Action) { if (lanMembership)
        sendLan('action', action);
    else
        act(() => engine.applyAction(state, action, identity({ ...controllers, [state.activePlayer]: 'human' }, state.gameId, state.activePlayer))); }
    function finishGame() { if (lanMembership)
        sendLan('finish');
    else
        act(() => engine.finishRoll(state, identity({ ...controllers, [state.activePlayer]: 'human' }, state.gameId, state.activePlayer))); }
    function undoGame() { if (lanMembership)
        sendLan('undo');
    else
        act(() => engine.undoAction(state, state.activePlayer, identity({ ...controllers, [state.activePlayer]: 'human' }, state.gameId, state.activePlayer))); }
    const humanActor: ControllerIdentity = lanMembership ? { kind: 'human', id: `lan:${lanMembership.room.id}:P${lanMembership.playerId}`, version: null } : identity({ ...controllers, [state.activePlayer]: 'human' }, state.gameId, state.activePlayer);
    function resetGame(nextControllers: Controllers = controllers) {
        diceRng.current = seed ? seeded(seed + ':dice') : secure;
        agentRng.current = seed ? seeded(seed + ':agents') : secure;
        setState(createGame(count, nextControllers, seed || null));
        setReplayEvents(null);
        setHistoryOpen(false);
        setRunning(false);
        setError('');
        setSelected(null);
    }
    function newGame() { resetGame(); }
    function observeBots() {
        const next: Controllers = { 1: 'tactical', 2: 'greedy', 3: 'random', 4: 'tactical' };
        setControllers(next);
        resetGame(next);
        setRunning(true);
    }
    function download(text: string, name: string) { const url = URL.createObjectURL(new Blob([text], { type: 'application/x-ndjson' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url); }
    function exportLearning() {
        try {
            download(exportDataset(engine, replayEvents ?? state.eventLog), 'shashbesh-dataset.jsonl');
            setError('');
        }
        catch (e) {
            setError((e as Error).message);
        }
    }
    function exportCheckpoint() { download(JSON.stringify(checkpoint(replayEvents ?? state.eventLog), null, 2), 'shashbesh-checkpoint.json'); }
    function exportReplay() { const text = replayEvents ? replayEvents.map(e => JSON.stringify(e)).join('\n') : exportLog(state); const url = URL.createObjectURL(new Blob([text], { type: 'application/x-ndjson' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'shashbesh-replay.jsonl'; anchor.click(); URL.revokeObjectURL(url); }
    async function loadReplay(file: File) {
        try {
            const events = importLog(await file.text());
            engine.replay(events);
            setReplayEvents(events);
            setReplayStep(boundaries(events).length - 1);
            setRunning(false);
            setError('');
        }
        catch (e) {
            setError('Импорт: ' + (e as Error).message);
        }
    }
    useEffect(() => { let live = true; loadLocalGame().then(saved => { if (!live || !saved)
        return; if (saved.version !== 'v0.3')
        throw Error('Unknown save version'); const restored = engine.replay(saved.events); const rng = restoreRng(restored.seedMetadata, saved.events); diceRng.current = rng.dice; agentRng.current = rng.agents; setState(restored); setControllers(saved.controllers); setCount(saved.count); setSeed(saved.seed); setSpeed(saved.speed); }).catch(e => { if (live)
        setSaveError('Не удалось восстановить сохранение: ' + e.message); }).finally(() => { if (live)
        setRestoring(false); }); return () => { live = false; }; }, []);
    useEffect(() => { if (restoring || lanMembership)
        return; saveLocalGame({ version: 'v0.3', events: state.eventLog, controllers, count, seed, speed }).then(() => setSaveError('')).catch(e => setSaveError('Автосохранение недоступно: ' + e.message)); }, [lanMembership, restoring, state, controllers, count, seed, speed]);
    useEffect(() => { if (restoring || resumeLan.current)
        return; resumeLan.current = true; try {
        const text = localStorage.getItem('shashbesh-lan-session');
        if (text) {
            const saved = JSON.parse(text);
            joinLan(saved.url, saved.membership);
        }
    }
    catch (e) {
        setError('Восстановление LAN: ' + (e as Error).message);
    } }, [restoring]);
    useEffect(() => () => { lanClient.current?.close(); }, []);
    useEffect(()=>{
        if(screen!=='game'||technicalOpen||menuOpen||restoring||lanMembership||historyOpen||replayEvents||!bot||state.winner||state.phase==='initial_roll')return;
        const timer=setTimeout(()=>act(()=>advance(state)),450);
        return()=>clearTimeout(timer);
    },[screen,technicalOpen,menuOpen,restoring,lanMembership,historyOpen,replayEvents,bot,state,controllers]);
    useEffect(()=>{if(lanStatus?.state && lanStatus.room?.status!=='lobby' && !technicalOpen)setScreen('game');},[lanStatus?.room?.status,!!lanStatus?.state,technicalOpen]);
    useEffect(()=>{setChosenPiece(null);setActionChoices([]);},[state.eventLog.at(-1)?.hash]);
    function startMobile(where:'local'|'wifi',opponent:'computer'|'human',players:number){
        setMobileCount(players);setMenuOpen(false);setTechnicalOpen(false);setHistoryOpen(false);setReplayEvents(null);setSavedGames(null);setRunning(false);
        if(where==='wifi'){setScreen('wifi');return;}
        if(lanMembership)leaveLan();
        const next=mobileControllers(players,opponent);
        diceRng.current=seed?seeded(seed+':dice'):secure;agentRng.current=seed?seeded(seed+':agents'):secure;
        setControllers(next);setCount(players);setState(createGame(players,next,seed||null));setChosenPiece(null);setError('');setScreen('game');
    }
    function openHistory(){setRunning(false);setHistoryIndex(Math.max(0,actionHistory(engine,state.eventLog).length-1));setHistoryBefore(false);setHistoryOpen(true);setMenuOpen(false);setScreen('game');}
    function resumeSaved(saved:LocalSave){
        try{const restored=engine.replay(saved.events),rng=restoreRng(restored.seedMetadata,saved.events);if(lanMembership)leaveLan();setState(restored);setControllers(saved.controllers);setCount(saved.count);setSeed(saved.seed);setSpeed(saved.speed);diceRng.current=rng.dice;agentRng.current=rng.agents;setHistoryOpen(false);setReplayEvents(null);setRunning(false);setMenuOpen(false);setSavedGames(null);setScreen('game');}
        catch(e){setError('Не удалось открыть партию: '+(e as Error).message);}
    }
    const canManual = !restoring && !historyOpen && !replayEvents && !state.winner && (lanMembership ? !!lanStatus?.state && lanStatus.connected && !lanStatus.busy && lanMembership.playerId === state.activePlayer : (!bot || !running));
    const technicalView = <main className="technical-view">
    <button className="back-to-table" onClick={()=>{setTechnicalOpen(false);setScreen('game');setRunning(false);}}>Вернуться к полю</button>
  <header><div><p className="eyebrow">СТРАТЕГИЯ · СЛУЧАЙНОСТЬ · СОРЕВНОВАНИЕ</p><h1>Шашбеш <em>AI</em></h1></div><span className="local-badge">Локальная игра <i /></span></header>
  <div className="layout"><section className="arena">
   <PlayerPanel state={viewed} label={historyOpen ? 'ИСТОРИЯ · ТОЛЬКО ПРОСМОТР' : lanMembership ? 'LAN · ' + (lanStatus?.room?.name ?? 'ПОДКЛЮЧЕНИЕ') : replayEvents ? 'ПОВТОР ПАРТИИ' : viewed.winner ? 'ИГРА ЗАВЕРШЕНА' : state.players.every(p => controllers[p] !== 'human') ? 'НАБЛЮДЕНИЕ · AI ПРОТИВ AI' : 'ТЕКУЩИЙ ХОД'} controller={lanMembership ? (lanStatus?.room?.players.find(p => p.id === viewed.activePlayer)?.name ?? 'Человек') : names[controllers[viewed.activePlayer] ?? 'human']} canRoll={canManual && ['initial_roll', 'await_roll'].includes(state.phase)} onRoll={rollGame}/>

   <Board geometry={geometry} state={viewed} actions={canManual ? actions : []} selected={historyOpen && historyRow ? historyRow.action : selected} onAction={a => {
            if (canManual)
                moveGame(a);
        }}/>
   <div className="players">{viewed.players.map(p => <div className={`player-card ${p === viewed.activePlayer ? 'active' : ''}`} key={p}><b className={`text-p${p}`}>P{p}</b><span>Резерв {viewed.pieces.filter(q => q.owner === p && q.status === 'reserve').length}</span><span className="player-last-dice">Последние кубики: {dicePresentation(viewed).ledger[p]?.dice.join(' · ') ?? '—'}</span><span>Дом {viewed.pieces.filter(q => q.owner === p && q.status === 'finished').length}/5</span></div>)}</div>
   <details className="instructions"><summary>Как играть</summary><p>Выставите фишку за 6, пройдите внешний круг и заполните дом от дальнего конца. Своих перепрыгивать нельзя. На углах единица — обязательный прыжок +12. Дубль даёт четыре действия и повтор; 5–6 тоже даёт повтор. Используйте максимальную сумму действий: список ходов уже проверен движком.</p><p>Выберите действие в списке или нажмите подсвеченную целевую клетку. Каждый бросок завершите перед следующим. Seed задаёт воспроизводимые кубики; без seed используется криптографический генератор. Рабочие трактовки спорных случаев перечислены в документации проекта.</p></details>
  </section>
  <aside>
   <LanPanel status={lanStatus} client={lanClient.current} onJoin={joinLan} onLeave={leaveLan}/>
   {historyOpen && <HistoryPanel rows={historyRows} index={historyIndex} onSelect={setHistoryIndex} onClose={() => setHistoryOpen(false)} showBefore={historyBefore} onToggle={() => setHistoryBefore(!historyBefore)}/>}
   <section className="panel"><h3>Управление партией</h3>
    <div className="controls"><button onClick={() => { setRunning(false); setHistoryIndex(Math.max(0, actionHistory(engine, state.eventLog).length - 1)); setHistoryBefore(false); setHistoryOpen(true); }}>История</button><button disabled={!canManual || bot || !engine.undoTarget(state, state.activePlayer, humanActor)} onClick={() => undoGame()}>Отменить ход</button></div>
    {restoring && <p className="note">Восстановление партии…</p>}{saveError && <p className="error">{saveError}</p>}{error && <p role="alert" className="error">{error}</p>}
    {!replayEvents && <>
     <div className="controls"><button disabled={!canManual || state.phase !== 'resolving_roll' || actions.length > 0} onClick={() => finishGame()}>Завершить бросок</button></div>
     <div className="controls"><button onClick={() => setRunning(!running)} disabled={!!lanMembership || !!state.winner}>{running ? 'Пауза' : 'Запустить ботов'}</button><button disabled={!!lanMembership || !bot || !!state.winner || running} onClick={() => act(() => advance(state))}>Шаг бота</button></div>
     <label>Скорость ботов<select aria-label="Скорость ботов" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={1000}>Спокойно</option><option value={450}>Обычно</option><option value={80}>Быстро</option></select></label>
     {state.currentRoll?.extraRoll && <p className="note">После этого броска — дополнительный.</p>}
     {state.phase === 'resolving_roll' && <p className="note">Осталось: {state.currentRoll?.remainingActions.join(', ') || 'нет'} · использовано {state.currentRoll?.usedPoints}</p>}
    </>}
    {replayEvents && <><label>Шаг повтора {replayStep + 1}/{replayStops.length}<input type="range" min={0} max={replayStops.length - 1} value={replayStep} onChange={e => setReplayStep(Number(e.target.value))}/></label><button onClick={() => setReplayEvents(null)}>Вернуться к игре</button></>}
    <div className="controls"><button onClick={exportLearning}>Экспорт данных ИИ</button><button onClick={exportCheckpoint}>Контрольный хеш</button></div>
    <div className="controls"><button onClick={exportReplay}>Экспорт журнала</button><button onClick={() => upload.current?.click()}>Открыть повтор</button></div><input ref={upload} type="file" accept=".jsonl,.json,.ndjson" hidden onChange={e => {
            if (e.target.files?.[0])
                void loadReplay(e.target.files[0]);
            e.target.value = '';
        }}/>
   </section>
   {!replayEvents && <section className="panel moves"><h3>Допустимые действия <span>{actions.length}</span></h3>{state.phase === 'resolving_roll' && !actions.length ? <p className="muted">Доступных ходов нет. Завершите бросок.</p> : state.phase !== 'resolving_roll' ? <p className="muted">Бросьте кубики, чтобы увидеть ходы.</p> : <p className="muted">Каждый ход сохраняет максимальную доступную сумму.</p>}<div className="move-list">{actions.map((a, i) => <button key={i} disabled={!canManual} onMouseEnter={() => setSelected(a)} onFocus={() => setSelected(a)} onMouseLeave={() => setSelected(null)} onClick={() => moveGame(a)}>{describe(a)}</button>)}</div></section>}
   <section className="panel"><h3>Новая партия</h3><label>Игроков<select aria-label="Игроков" value={count} onChange={e => setCount(Number(e.target.value))}>{[2, 3, 4].map(n => <option key={n}>{n}</option>)}</select></label>
    {Array.from({ length: count }, (_, i) => (i + 1) as Player).map(p => <label key={p}><b className={`text-p${p}`}>Игрок P{p}</b><select aria-label={`Игрок P${p}`} value={controllers[p] ?? 'human'} onChange={e => setControllers({ ...controllers, [p]: e.target.value as Strategy | 'human' })}>{Object.entries(names).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>)}
    <label>Seed (необязательно)<input value={seed} onChange={e => setSeed(e.target.value)} placeholder="Случайные кубики"/></label><button disabled={!!lanMembership} className="primary" onClick={newGame}>Начать новую партию</button><button disabled={!!lanMembership} onClick={observeBots}>Наблюдать AI vs AI</button><p className="muted">Состав применяется к новой партии. Тип игрока можно менять во время игры.</p>
   </section>
  </aside></div>
  <section className="panel history"><h3>Журнал событий <span>{viewed.eventLog.length}</span></h3><ol>{viewed.eventLog.slice(-100).reverse().map(e => <li key={e.seq}><span>#{e.seq + 1}</span>{e.timeSource === 'wall' && <time dateTime={e.timestamp}>{timeFormatter.format(new Date(e.timestamp!))}</time>}{eventText(e)}</li>)}</ol></section>
  <footer>Шашбеш AI · Правила v1 · Журнал с проверкой целостности · 2–4 игрока</footer>
 </main>;
    if(technicalOpen)return technicalView;
    const manualTable=canManual && !menuOpen && (!bot || !!lanMembership || state.phase==='initial_roll');
    const canFinish=manualTable&&state.phase==='resolving_roll'&&!actions.length;
    const canTapDice=manualTable&&(['initial_roll','await_roll'].includes(state.phase)||canFinish);
    const canUndo=manualTable&&!bot&&!!engine.undoTarget(state,state.activePlayer,humanActor);
    const activePlayer=viewed.winner??viewed.activePlayer;
    const hint=historyOpen?'Просмотр прошлого хода':replayEvents?'Повтор партии':state.winner?`${playerColors[state.winner]} победил!`:lanMembership&&!lanStatus?.connected?'Восстанавливаем связь…':lanStatus?.busy?'Подтверждаем ход…':lanMembership&&lanMembership.playerId!==state.activePlayer?'Другой игрок делает ход':bot?'Компьютер выбирает ход…':state.phase==='initial_roll'?'Нажмите на кубики — определим первый ход':state.phase==='await_roll'?(dicePresentation(state).extra?'Ещё один бросок — нажмите на кубики':'Нажмите на кубики'):!actions.length?(state.currentRoll?.extraRoll?'Нажмите на кубики, чтобы продолжить':'Нажмите на кубики, чтобы передать ход'):chosenPiece?'Выберите подсвеченную клетку':'Выберите фишку';
    return <main className={`mobile-shell ${screen==='game'?'mobile-game':''} ${historyOpen?'viewing-history':''}`}>
        <header className="mobile-header"><button className="table-brand" onClick={()=>{setScreen('home');setRunning(false);}}>Шашбеш</button>{screen==='game'&&<span className="turn-color" data-active-player={activePlayer}><i className={`p${activePlayer}`}/>{historyOpen?'История':state.winner?'Победа':playerColors[activePlayer]}</span>}<button className="menu-button" aria-label="Меню" onClick={()=>{setMenuOpen(true);setRunning(false);}}>☰</button></header>
        {screen==='home'&&restoring&&<p className="home-note" role="status">Возвращаем сохранённую партию…</p>}
        {screen==='home'&&!restoring&&<HomeScreen hasGame={state.eventLog.length>1||!!lanMembership} onResume={()=>setScreen(lanMembership&&!lanStatus?.state?'wifi':'game')} onStart={startMobile}/>}
        {screen==='wifi'&&<WifiScreen status={lanStatus} client={lanClient.current} capacity={mobileCount} onGame={()=>setScreen('game')} onJoin={joinLan} onLeave={()=>{leaveLan();setScreen('home');}}/>}
        {screen==='game'&&<><section className="table-area"><Board geometry={geometry} state={viewed} actions={manualTable?actions:[]} selected={historyOpen&&historyRow?historyRow.action:null} physical chosenPiece={chosenPiece} center={<TableDice state={viewed} canTap={canTapDice} onTap={()=>canFinish?finishGame():rollGame()}/>} onPiece={id=>{if(manualTable)setChosenPiece(id);}} onDestination={options=>{if(!manualTable)return;if(options.length===1)moveGame(options[0]);else setActionChoices(options);}} onAction={moveGame}/></section>
        <section className="table-controls"><p className="table-hint" role="status">{hint}</p>{historyOpen?<div className="table-history-controls"><button aria-label="Предыдущий ход" disabled={historyIndex<=0} onClick={()=>setHistoryIndex(historyIndex-1)}>‹</button><button onClick={()=>setHistoryBefore(!historyBefore)}>{historyBefore?'Показать после':'Показать до'}</button><button aria-label="Следующий ход" disabled={historyIndex>=historyRows.length-1} onClick={()=>setHistoryIndex(historyIndex+1)}>›</button><button onClick={()=>setHistoryOpen(false)}>К игре</button></div>:<button className="table-undo" aria-label="Отменить ход" disabled={!canUndo} onClick={undoGame}>↶ <span>Отменить</span></button>}{(error||saveError)&&<p className="mobile-error" role="alert">{error||saveError}</p>}</section></>}
        {actionChoices.length>0&&<div className="mobile-modal" role="dialog" aria-modal="true" aria-label="Выберите кубик"><section><h2>Каким кубиком?</h2>{actionChoices.map((a,i)=><button key={i} onClick={()=>{setActionChoices([]);moveGame(a);}}>{a.value}</button>)}<button onClick={()=>setActionChoices([])}>Назад</button></section></div>}
        {menuOpen&&<div className="mobile-modal" role="dialog" aria-modal="true" aria-label="Меню игры"><section className="game-menu"><button className="close-menu" onClick={()=>{setMenuOpen(false);setSavedGames(null);}}>Закрыть меню</button><h2>За игровым столом</h2>{historyOpen&&<HistoryPanel rows={historyRows} index={historyIndex} onSelect={i=>{setHistoryIndex(i);setMenuOpen(false);}} onClose={()=>{setHistoryOpen(false);setMenuOpen(false);}} showBefore={historyBefore} onToggle={()=>{setHistoryBefore(!historyBefore);setMenuOpen(false);}}/>}<button onClick={openHistory}>История</button><button onClick={()=>{setScreen('home');setMenuOpen(false);setHistoryOpen(false);setReplayEvents(null);}}>Новая игра</button><button onClick={()=>{void listLocalGames().then(setSavedGames).catch(e=>setError(e.message));}}>Сохранённые партии</button>{savedGames&&<div className="saved-games">{!savedGames.length&&<p>Пока нет сыгранных партий</p>}{savedGames.map((saved,i)=><button key={saved.events[0].gameId} onClick={()=>resumeSaved(saved)}>Партия {savedGames.length-i}<small>{saved.events[0].timestamp?new Date(saved.events[0].timestamp).toLocaleString('ru-RU'):''} · {saved.count} игрока</small></button>)}</div>}{lanMembership&&<button onClick={()=>{setScreen('wifi');setMenuOpen(false);}}>Игроки по Wi-Fi</button>}{lanMembership&&<button onClick={()=>{leaveLan();setScreen('home');setMenuOpen(false);}}>Выйти из Wi-Fi игры</button>}<details className="table-rules"><summary>Как играть</summary><p>Нажмите на кубики. Выберите фишку и подсвеченную клетку. За шестёрку можно вывести фишку из резерва. Соберите пять фишек в своём доме, начиная с дальнего конца.</p><p>Своих фишек нельзя перепрыгивать; попадание на чужую возвращает её в резерв. На углу единица означает обязательный прыжок. Дубль даёт четыре действия и ещё один бросок; 6–5 тоже даёт дополнительный бросок.</p></details><details className="table-advanced"><summary>Дополнительные возможности</summary><button onClick={exportReplay}>Экспорт партии</button><button onClick={()=>{setMenuOpen(false);setTechnicalOpen(true);}}>Технические возможности</button></details></section></div>}
    </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
