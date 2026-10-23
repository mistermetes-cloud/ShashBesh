import { NETWORK_ENABLED } from './networkFeature';
import {viewerRotation} from './boardView';
import {settleLocalRoll} from './session';
import {t, getLocale, useLocale, initializeLocale, plural, formatNumber} from './i18n';
import {useDialogFocus} from './useDialogFocus';
import {LanguageSelector} from './LanguageSelector';
import {LegalMoveControls} from './LegalMoveControls';
import {colorName, localizedFrameHint as frameHint} from './gameText';
import {localSession} from './session';
import {browserPlatform} from './platform';
import {usePlatform} from './platform/usePlatform';
import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import csv from '../../../data/igra_64_koordinaty.csv?raw';
import { Engine, parseGeometry, exportLog, importLog, POLICY, isCurrentPolicy, RuleClarificationRequired, LegacyRulePolicyReadOnly, checkpoint, actionHistory } from '../../../packages/engine/src/index';
import { secure, seeded, type Rng } from '../../../packages/engine/src/rng';
import { agentIdentity, neuralScorer, type Controllers, type Strategy } from '../../../packages/agents/src/index';
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
import { mobileControllers } from './mobile';
import './style.css';
import './mobile.css';
import './aiPlayback.css';
import {AiRollPlanner} from './aiDecisions';
import {useAiPlayback} from './useAiPlayback';
import {AiControls} from './AiControls';
import {DisputedMovePanel} from './DisputedMovePanel';
import {saveDisputedReport} from './storage';
import type {DisputedMoveReport} from './disputedMove';
import {speedName,SPEED_VALUE,type AiCommand} from './aiPlayback';
const RulesContent=lazy(()=>import('./RulesContent'));
const geometry = parseGeometry(csv), engine = new Engine(geometry, { clock: () => new Date().toISOString(), timeSource: 'wall' });
const publicPreview=import.meta.env.MODE==='cloudflare-preview';

const primary = new Set(['game_created', 'initial_roll', 'dice_roll', 'action', 'roll_finished', 'undo_action']);
function boundaries(events: GameEvent[]) {
    const command = (e: GameEvent) => primary.has(e.type) && !(e.type === 'roll_finished' && (e.payload as {
        reason?: string;
    }).reason === 'victory');
    return events.map((_, i) => i + 1).filter(i => i === events.length || command(events[i]));
}
const shortCell = (id: string | null) => id === null ? t("ui.reserve") : id.startsWith('М') ? String(Number(id.slice(1))) : id.replace('Д', 'Д').replace('-', '.');
const describe = (a: Action) => `${a.pieceId} · ${a.kind === 'corner_jump' ? t("ui.jump") : a.kind === 'deploy' ? t("ui.entry") : t("ui.move")} ${a.value}: ${shortCell(a.from)} → ${shortCell(a.to)}${a.captureIds.length ? t("ui.capture.129") : ''}`;
function eventText(e: GameEvent) {
    const p = e.payload as Record<string, any>;
    switch (e.type) {
        case 'game_created': return t("ui.match.created");
        case 'initial_roll': return t("ui.draw") + Object.entries(p.values).map(([id, n]) => `P${id}: ${n}`).join(', ');
        case 'dice_roll': return t("ui.p.rolls",{v0: e.actor,v1: p.dice.join(' + ')});
        case 'action': return describe(e.payload as Action);
        case 'capture': return t("ui.returns.to.reserve",{v0: p.pieceId});
        case 'piece_finished': return t("ui.finished.its.route",{v0: p.pieceId});
        case 'roll_finished': return t("ui.roll.finished.used",{v0: p.usedPoints});
        case 'extra_roll': return t("ui.extra.roll");
        case 'turn_changed': return t("ui.p.to.play",{v0: p.to});
        case 'undo_action': return t("ui.p.undoes.action",{v0: e.actor,v1: p.targetSeq + 1});
        case 'victory': return t("ui.p.wins",{v0: p.winner});
        default: return e.type;
    }
}

const defaults: Controllers = { 1: 'human', 2: 'tactical', 3: 'greedy', 4: 'random' };
function identity(controllers: Controllers, gameId: string, p: Player): ControllerIdentity {
    const type = controllers[p] ?? 'human';
    return { kind: type === 'human' ? 'human' : 'agent', id: type === 'human' ? `local:${gameId}:P${p}` : type, version: type === 'human' ? null : agentIdentity(type).version };
}
function createGame(count: number, controllers: Controllers, seed: string | null, seats?:Player[]) {
    const id = `local-${uniqueId()}`, players = seats??Array.from({ length: count }, (_, i) => (i + 1) as Player);
    return engine.create(players, id, seed, POLICY, Object.fromEntries(players.map(p => [p, identity(controllers, id, p)])));
}
const platform=browserPlatform();
initializeLocale(platform.snapshot().language);
function App() {
    const locale=useLocale();
    const [viewerSeat,setViewerSeat]=useState<Player|null>(null);
    const timeFormatter=useMemo(()=>new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit',second:'2-digit'}),[locale]);
    const names: Record<string, string> = { human: t("ui.human"), random: t("ui.random"), greedy: t("ui.greedy"), tactical: t("ui.tactical"), ...(!publicPreview?{'ai-v0.1':neuralScorer.version}:{}) };
    const [screen,setScreen]=useState<'home'|'game'|'wifi'>('home'),[technicalOpen,setTechnicalOpen]=useState(false),[menuOpen,setMenuOpen]=useState(false),[mobileCount,setMobileCount]=useState(2);
    const [chosenPiece,setChosenPiece]=useState<string|null>(null),[actionChoices,setActionChoices]=useState<Action[]>([]),[savedGames,setSavedGames]=useState<LocalSave[]|null>(null),[rulesOpen,setRulesOpen]=useState(false);
    const [state, setState] = useState(() => createGame(4, defaults, null)), [count, setCount] = useState(4), [controllers, setControllers] = useState<Controllers>(defaults);
    const [seed, setSeed] = useState(''), [running, setRunning] = useState(false), [speed, setSpeed] = useState(700), [error, setError] = useState(''), [selected, setSelected] = useState<Action | null>(null);
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
    const legality=useMemo(()=>{try{return {actions:replayEvents?[]:engine.legalActions(state),blocked:''};}catch(e){if(e instanceof RuleClarificationRequired||e instanceof LegacyRulePolicyReadOnly)return {actions:[] as Action[],blocked:e.message};throw e;}},[state,replayEvents]);
    const actions=legality.actions;
    const bot = !lanMembership && controllers[state.activePlayer] !== 'human';
    const allBots=!lanMembership&&state.players.every(p=>controllers[p]&&controllers[p]!=='human');
    const latest=useRef(state);latest.current=state;
    const plan=useRef<AiRollPlanner|null>(null);if(!plan.current)plan.current=new AiRollPlanner(engine,()=>agentRng.current);
    const enabled=!legality.blocked&&!restoring&&!lanMembership&&!historyOpen&&!replayEvents&&!menuOpen&&(technicalOpen?running:screen==='game'&&(!allBots||running));
    const playback=useAiPlayback(next=>{latest.current=next;setState(next);setError('');},enabled,speed);
    const displayFrame=historyOpen||replayEvents||lanMembership?null:playback.frame;
    const disputedState=displayFrame?.command.before??state;
    const disputedActions=useMemo(()=>{try{return engine.legalActions(disputedState);}catch{return [] as Action[];}},[disputedState]);
    const disputedOptions=useMemo(()=>{if(!disputedState.currentRoll)return disputedActions;const values=[...new Set(disputedState.currentRoll.remainingActions)];return [...new Map([...disputedActions,...values.flatMap(value=>engine.candidates(disputedState,value))].map(a=>[JSON.stringify(a),a])).values()];},[disputedState,disputedActions]);
    const displayed=displayFrame?(displayFrame.phase==='dice'||displayFrame.phase==='end'||displayFrame.phase==='extra'?displayFrame.command.after:displayFrame.command.before):viewed;
    usePlatform(platform,menuOpen||technicalOpen||screen!=='home',()=>{if(menuOpen)setMenuOpen(false);else if(technicalOpen)setTechnicalOpen(false);else{setScreen('home');setRunning(false);}});
    useDialogFocus(menuOpen,'.game-menu',()=>setMenuOpen(false));
    useDialogFocus(actionChoices.length>0,'.mobile-modal[aria-label]',()=>setActionChoices([]));
    function cancelPlayback(){playback.controller.cancel();plan.current!.clear();}
    function toggleBots(){if(running||(playback.controller.busy&&!playback.controller.isPaused)){playback.controller.pause();setRunning(false);}else{playback.controller.resume();setRunning(true);}}
    function stepBot(){if(playback.controller.busy){if(playback.controller.isPaused)playback.controller.resume();return;}if(latest.current.winner)return;try{const command=prepare(latest.current);if(command.after!==command.before)playback.controller.start(command,speedName(speed));}catch(e){setError((e as Error).message);setRunning(false);cancelPlayback();}}

    function act(fn: () => GameState) {
        try {
            const next=fn(); latest.current=next; setState(next);
            setError('');
            setSelected(null);
        }
        catch (e) {
            setError(String((e as Error).message));
            setRunning(false);
        }
    }
    function prepare(s:GameState):AiCommand {
        if(s.phase==='initial_roll')return {before:s,after:engine.initialRoll(s,Object.fromEntries(s.initialContenders.map(p=>[p,diceRng.current.die()]))),kind:'initial',action:null};
        if(s.phase==='await_roll')return {before:s,after:engine.roll(s,s.pendingRolls?.[0].dice??[diceRng.current.die(),diceRng.current.die()]),kind:'roll',action:null};
        if(s.phase==='resolving_roll'){
            const strategy=controllers[s.activePlayer];if(!strategy||strategy==='human')throw Error(t("ui.select.a.human.move.manually"));
            const {after,action}=plan.current!.next(s,strategy);
            return {before:s,after,action,kind:action?'action':'finish'};
        }
        return {before:s,after:s,action:null,kind:'finish'};
    }
    function advance(s:GameState){return prepare(s).after;}
    // One scheduler for both views. Timings and pause state never enter strategy selection.
    useEffect(()=>{
        if(!enabled||playback.busy||state.winner||(!bot&&state.phase!=='initial_roll')||(state.phase==='initial_roll'&&!allBots&&!(technicalOpen&&running)))return;
        const timer=setTimeout(stepBot,0);return()=>clearTimeout(timer);
    },[enabled,playback.busy,state,bot,controllers]);
    function joinLan(url: string, membership: Membership) {
        if (!NETWORK_ENABLED) return;
        cancelPlayback();
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
    function leaveLan() { if (!NETWORK_ENABLED) return; lanClient.current?.close(); lanClient.current = null; setLanStatus(null); setLanMembership(null); localStorage.removeItem('shashbesh-lan-session'); if (localBeforeLan.current) {
        const saved = localBeforeLan.current;
        setState(saved.state);
        setControllers(saved.controllers);
        setCount(saved.count);
        setSeed(saved.seed);
        setSpeed(SPEED_VALUE[speedName(saved.speed)]);
    } localBeforeLan.current = null; }
    function sendLan(operation: Parameters<RoomClient['command']>[0], action?: Action) { void lanClient.current?.command(operation, action).catch(e => setError(e.message)); }
    function rollGame() { if (lanMembership)
        sendLan('roll');
    else
        act(() => latest.current.phase==='initial_roll'||latest.current.phase==='await_roll'?advance(latest.current):latest.current); }
    function moveGame(action: Action) { if (lanMembership)
        sendLan('action', action);
    else
        act(() => localSession(engine,latest.current,humanActor).move(action)); }
    function finishGame() { if (lanMembership)
        sendLan('finish');
    else
        act(() => session.finish()); }
    function undoGame() { if (lanMembership)
        sendLan('undo');
    else
        act(() => session.undo()); }
    const humanActor: ControllerIdentity = lanMembership ? { kind: 'human', id: `lan:${lanMembership.room.id}:P${lanMembership.playerId}`, version: null } : identity({ ...controllers, [state.activePlayer]: 'human' }, state.gameId, state.activePlayer);
    const session=localSession(engine,state,humanActor);
    // Only the session/Core decides entitlement. AI finishes through its playback scheduler.
    useEffect(()=>{
        if(restoring||lanMembership||historyOpen||replayEvents||playback.busy||bot||legality.blocked||screen!=='game')return;
        const current=latest.current;
        const next=settleLocalRoll(engine,current,humanActor);
        if(next!==current){latest.current=next;setState(next);setChosenPiece(null);}
    },[state,restoring,lanMembership,historyOpen,replayEvents,playback.busy,bot,legality.blocked,screen]);
    function resetGame(nextControllers: Controllers = controllers, nextCount=count) {
        cancelPlayback();setViewerSeat(null);setCount(nextCount);
        diceRng.current = seed ? seeded(seed + ':dice') : secure;
        agentRng.current = seed ? seeded(seed + ':agents') : secure;
        setState(createGame(nextCount, nextControllers, seed || null));
        setReplayEvents(null);
        setHistoryOpen(false);
        setRunning(false);
        setError('');
        setSelected(null);
    }
    function newGame() { resetGame(); }
    function observeBots(nextCount=count) {
        if(lanMembership)leaveLan();
        const next:Controllers={1:publicPreview?'tactical':'ai-v0.1',2:'tactical',3:'greedy',4:'random'};
        setControllers(next);resetGame(next,nextCount);setScreen('game');setMenuOpen(false);setTechnicalOpen(false);setRunning(true);
    }
    function download(text: string, name: string) { const url = URL.createObjectURL(new Blob([text], { type: 'application/x-ndjson' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url); }
    async function saveAndExportDispute(report:DisputedMoveReport){await saveDisputedReport(report);const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const anchor=document.createElement('a');anchor.href=url;anchor.download=`disputed-move-${report.timestamp.replaceAll(':','-')}.json`;anchor.click();URL.revokeObjectURL(url);}
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
            cancelPlayback();
            engine.replay(events);
            setReplayEvents(events);
            setReplayStep(boundaries(events).length - 1);
            setRunning(false);
            setError('');
        }
        catch (e) {
            setError(t("ui.import") + (e as Error).message);
        }
    }
    useEffect(() => { let live = true; loadLocalGame().then(saved => { if (!live || !saved)
        return; if (saved.version !== 'v0.3')
        throw Error('Unknown save version'); const restored = engine.replay(saved.events); isCurrentPolicy(restored.rulePolicy)?plan.current!.restore(saved.aiPlan,restored,saved.controllers):plan.current!.clear(); const rng = restoreRng(restored.seedMetadata, saved.events); diceRng.current = rng.dice; agentRng.current = rng.agents; setState(restored); setControllers(saved.controllers); setCount(saved.count); setSeed(saved.seed); setSpeed(SPEED_VALUE[speedName(saved.speed)]); }).catch(e => { if (live)
        setSaveError(t("ui.could.not.restore.save") + e.message); }).finally(() => { if (live)
        setRestoring(false); }); return () => { live = false; }; }, []);
    useEffect(() => { if (restoring || lanMembership || !isCurrentPolicy(state.rulePolicy))
        return; saveLocalGame({ version: 'v0.3', events: state.eventLog, controllers, count, seed, speed, aiPlan:plan.current!.snapshot(state) }).then(() => setSaveError('')).catch(e => setSaveError(t("ui.autosave.unavailable") + e.message)); }, [lanMembership, restoring, state, controllers, count, seed, speed]);
    useEffect(() => { if (!NETWORK_ENABLED || restoring || resumeLan.current)
        return; resumeLan.current = true; try {
        const text = localStorage.getItem('shashbesh-lan-session');
        if (text) {
            const saved = JSON.parse(text);
            joinLan(saved.url, saved.membership);
        }
    }
    catch (e) {
        setError(t("ui.lan.restore") + (e as Error).message);
    } }, [restoring]);
    useEffect(() => () => { lanClient.current?.close(); }, []);
    useEffect(()=>{if(lanStatus?.state && lanStatus.room?.status!=='lobby' && !technicalOpen)setScreen('game');},[lanStatus?.room?.status,!!lanStatus?.state,technicalOpen]);
    useEffect(()=>{setChosenPiece(null);setActionChoices([]);},[state.eventLog.at(-1)?.hash]);
    function startMobile(where:'local'|'wifi',opponent:'computer'|'human',players:number){
        cancelPlayback();
        setMobileCount(players);setMenuOpen(false);setTechnicalOpen(false);setHistoryOpen(false);setReplayEvents(null);setSavedGames(null);setRunning(false);
        if(where==='wifi'){if(NETWORK_ENABLED)setScreen('wifi');return;}
        if(lanMembership)leaveLan();
        const next=mobileControllers(players,opponent);
        diceRng.current=seed?seeded(seed+':dice'):secure;agentRng.current=seed?seeded(seed+':agents'):secure;
        setControllers(next);setCount(players);setViewerSeat(null);setState(createGame(players,next,seed||null,players===2?[1,3]:undefined));setChosenPiece(null);setError('');setScreen('game');
    }
    function openHistory(){playback.controller.cancel();setRunning(false);setHistoryIndex(Math.max(0,actionHistory(engine,state.eventLog).length-1));setHistoryBefore(false);setHistoryOpen(true);setMenuOpen(false);setScreen('game');}
    function resumeSaved(saved:LocalSave){
        cancelPlayback();
        try{const restored=engine.replay(saved.events);isCurrentPolicy(restored.rulePolicy)?plan.current!.restore(saved.aiPlan,restored,saved.controllers):plan.current!.clear();const rng=restoreRng(restored.seedMetadata,saved.events);if(lanMembership)leaveLan();setState(restored);setControllers(saved.controllers);setCount(saved.count);setSeed(saved.seed);setSpeed(SPEED_VALUE[speedName(saved.speed)]);diceRng.current=rng.dice;agentRng.current=rng.agents;setHistoryOpen(false);setReplayEvents(null);setRunning(false);setMenuOpen(false);setSavedGames(null);setScreen('game');}
        catch(e){setError(t("ui.could.not.open.match")+(e as Error).message);}
    }
    const canManual = !legality.blocked && !playback.busy && !restoring && !historyOpen && !replayEvents && !state.winner && (lanMembership ? !!lanStatus?.state && lanStatus.connected && !lanStatus.busy && lanMembership.playerId === state.activePlayer : (!bot || (!running&&!allBots)));
    const technicalView = <main className="technical-view"><LanguageSelector/>
    <button className="back-to-table" onClick={()=>{setTechnicalOpen(false);setScreen('game');setRunning(false);}}>{t("ui.back.to.table")}</button>
  <header><div><p className="eyebrow">{t("ui.strategy.chance.competition")}</p><h1>{t("ui.shashbesh.43")}{" "}<em>AI</em></h1></div><span className="local-badge">{t("ui.local.game")}{" "}<i /></span></header>
  <div className="layout"><section className="arena">
   <PlayerPanel state={displayed} label={historyOpen ? t("ui.history.read.only") : lanMembership ? 'LAN · ' + (lanStatus?.room?.name ?? t("ui.connecting.149")) : replayEvents ? t("ui.match.replay") : displayed.winner ? t("ui.game.over") : state.players.every(p => controllers[p] !== 'human') ? t("ui.watching.ai.vs.ai") : t("ui.current.turn")} controller={lanMembership ? (lanStatus?.room?.players.find(p => p.id === viewed.activePlayer)?.name ?? t("ui.human")) : names[controllers[viewed.activePlayer] ?? 'human']} canRoll={canManual && ['initial_roll', 'await_roll'].includes(state.phase)} onRoll={rollGame}/>

   <Board geometry={geometry} state={displayed} actions={canManual ? actions : []} animation={displayFrame} selected={historyOpen && historyRow ? historyRow.action : displayFrame?.command.action??selected} onAction={a => {
            if (canManual)
                moveGame(a);
        }}/>
   <p className="ai-status" role="status">{displayFrame?frameHint(displayFrame):''}</p><div className="players">{displayed.players.map(p => <div className={`player-card ${p === viewed.activePlayer ? 'active' : ''}`} key={p}><b className={`text-p${p}`}>P{p}</b><span>{t("ui.reserve.154")}{" "}{viewed.pieces.filter(q => q.owner === p && q.status === 'reserve').length}</span><span className="player-last-dice">{t("ui.last.dice")}{" "}{dicePresentation(viewed).ledger[p]?.dice.join(' · ') ?? '—'}</span><span>{t("ui.home.156")}{" "}{viewed.pieces.filter(q => q.owner === p && q.status === 'finished').length}/5</span></div>)}</div>
   <details className="instructions"><summary>{t("ui.how.to.play")}</summary><p>{t("ui.enter.with.a.six.complete.the.outer.route.and.fill.home.from.the.")}</p><p>{t("ui.choose.a.listed.action.or.a.highlighted.destination.finish.each.r")}</p></details>
  </section>
  <aside>
   {NETWORK_ENABLED&&<LanPanel status={lanStatus} client={lanClient.current} onJoin={joinLan} onLeave={leaveLan}/>}
   {historyOpen && <HistoryPanel rows={historyRows} index={historyIndex} onSelect={setHistoryIndex} onClose={() => setHistoryOpen(false)} showBefore={historyBefore} onToggle={() => setHistoryBefore(!historyBefore)}/>}
   <section className="panel"><h3>{t("ui.match.controls")}</h3>
    {!replayEvents&&<div className="controls"><DisputedMovePanel state={disputedState} legalActions={disputedActions} proposedOptions={disputedOptions} selectedAction={selected??displayFrame?.command.action??null} onSave={saveAndExportDispute}/></div>}
    <div className="controls"><button onClick={() => { playback.controller.cancel(); setRunning(false); setHistoryIndex(Math.max(0, actionHistory(engine, state.eventLog).length - 1)); setHistoryBefore(false); setHistoryOpen(true); }}>{t("ui.history")}</button><button disabled={!canManual || bot || !engine.undoTarget(state, state.activePlayer, humanActor)} onClick={() => undoGame()}>{t("ui.undo.move")}</button></div>
    {restoring && <p className="note">{t("ui.restoring.match")}</p>}{legality.blocked&&<p className="error" role="status">{t('game.rulesBlocked')}</p>}{saveError && <p className="error">{t('game.error')}</p>}{error && <p role="alert" className="error">{t('game.error')}</p>}
    {!replayEvents && <>
     <div className="controls"><button disabled={!canManual || state.phase !== 'resolving_roll' || actions.length > 0} onClick={() => finishGame()}>{t("ui.finish.roll")}</button></div>
     <div className="controls"><button onClick={toggleBots} disabled={!!lanMembership || !!legality.blocked || (!!state.winner&&!playback.busy)}>{running ? t("ui.pause") : t("ui.start.bots")}</button><button disabled={!!lanMembership || !!legality.blocked || !bot || (!!state.winner&&!playback.busy) || running || (playback.busy&&!playback.controller.isPaused)} onClick={stepBot}>{t("ui.bot.step")}</button></div>
     <label>{t("ui.bot.speed")}<select aria-label={t("ui.bot.speed")} value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={175}>{t('game.fast')}</option><option value={700}>{t('game.normal')}</option><option value={1400}>{t('game.slow')}</option></select></label>
     {state.currentRoll?.extraRoll && <p className="note">{t("ui.another.roll.follows.this.one")}</p>}
     {state.phase === 'resolving_roll' && <p className="note">{t("ui.remaining")}{" "}{state.currentRoll?.remainingActions.join(', ') || t("ui.none")} {" "}{t("ui.used")}{" "}{state.currentRoll?.usedPoints}</p>}
    </>}
    {replayEvents && <><label>{t("ui.replay.step")}{" "}{replayStep + 1}/{replayStops.length}<input type="range" min={0} max={replayStops.length - 1} value={replayStep} onChange={e => setReplayStep(Number(e.target.value))}/></label><button onClick={() => setReplayEvents(null)}>{t("ui.return.to.game")}</button></>}
    <div className="controls"><button onClick={exportLearning}>{t("ui.export.ai.data")}</button><button onClick={exportCheckpoint}>{t("ui.checkpoint.hash")}</button></div>
    <div className="controls"><button onClick={exportReplay}>{t("ui.export.log")}</button><button onClick={() => upload.current?.click()}>{t("ui.open.replay")}</button></div><input ref={upload} type="file" accept=".jsonl,.json,.ndjson" hidden onChange={e => {
            if (e.target.files?.[0])
                void loadReplay(e.target.files[0]);
            e.target.value = '';
        }}/>
   </section>
   {!replayEvents && <section className="panel moves"><h3>{t("ui.legal.actions")}{" "}<span>{actions.length}</span></h3>{state.phase === 'resolving_roll' && !actions.length ? <p className="muted">{t("ui.no.moves.available.finish.the.roll")}</p> : state.phase !== 'resolving_roll' ? <p className="muted">{t("ui.roll.dice.to.see.moves")}</p> : <p className="muted">{t("ui.each.move.preserves.the.maximum.available.sum")}</p>}<div className="move-list">{actions.map((a, i) => <button key={i} disabled={!canManual} onMouseEnter={() => setSelected(a)} onFocus={() => setSelected(a)} onMouseLeave={() => setSelected(null)} onClick={() => moveGame(a)}>{describe(a)}</button>)}</div></section>}
   <section className="panel"><h3>{t("ui.new.match")}</h3><label>{t("ui.players")}<select aria-label={t("ui.players")} value={count} onChange={e => setCount(Number(e.target.value))}>{[2, 3, 4].map(n => <option key={n}>{n}</option>)}</select></label>
    {(state.players.length===count?state.players:Array.from({ length: count }, (_, i) => (i + 1) as Player)).map(p => <label key={p}><b className={`text-p${p}`}>{t("ui.player.p.180")}{p}</b><select aria-label={t("ui.player.p",{v0: p})} value={controllers[p] ?? 'human'} onChange={e => setControllers({ ...controllers, [p]: e.target.value as Strategy | 'human' })}>{Object.entries(names).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>)}
    <label>{t("ui.seed.optional")}<input value={seed} onChange={e => setSeed(e.target.value)} placeholder={t("ui.random.dice")}/></label><button disabled={!!lanMembership} className="primary" onClick={newGame}>{t("ui.start.new.match")}</button><button disabled={!!lanMembership} onClick={()=>observeBots()}>{t("ui.watch.ai.vs.ai")}</button><p className="muted">{t("ui.setup.applies.to.a.new.match.player.type.can.change.during.play")}</p>
   </section>
  </aside></div>
  <section className="panel history"><h3>{t("ui.event.log")}{" "}<span>{viewed.eventLog.length}</span></h3><ol>{viewed.eventLog.slice(-100).reverse().map(e => <li key={e.seq}><span>#{e.seq + 1}</span>{e.timeSource === 'wall' && <time dateTime={e.timestamp}>{timeFormatter.format(new Date(e.timestamp!))}</time>}{eventText(e)}</li>)}</ol></section>
  <footer>{t("ui.shashbesh.ai.rules.v1.integrity.checked.log.2.4.players")}</footer>
 </main>;
    if(technicalOpen)return technicalView;
    const manualTable=canManual && !menuOpen && (!bot || !!lanMembership || state.phase==='initial_roll');
    const canFinish=manualTable&&state.phase==='resolving_roll'&&!actions.length;
    const canTapDice=manualTable&&['initial_roll','await_roll'].includes(state.phase);
    const canUndo=canManual&&!bot&&!!engine.undoTarget(state,state.activePlayer,humanActor);
    const activePlayer=displayed.winner??displayed.activePlayer;
    const hint=(legality.blocked?t('game.rulesBlocked'):'')|| (displayFrame?frameHint(displayFrame):historyOpen?t("ui.viewing.a.past.move"):replayEvents?t("ui.match.replay.188"):state.winner?t("ui.wins",{v0: colorName(state.winner)}):lanMembership&&!lanStatus?.connected?t("ui.reconnecting.101"):lanStatus?.busy?t("ui.confirming.move"):lanMembership&&lanMembership.playerId!==state.activePlayer?t("ui.another.player.is.moving"):bot?t("ui.computer.is.choosing.a.move"):state.phase==='initial_roll'?t("ui.tap.dice.to.choose.who.starts"):state.phase==='await_roll'?(dicePresentation(state).extra?t("ui.extra.roll.tap.dice"):t("ui.tap.the.dice")):!actions.length?(state.currentRoll?.extraRoll?t("ui.tap.dice.to.continue"):t("ui.tap.dice.to.pass.the.turn")):chosenPiece?t("ui.choose.a.highlighted.cell"):t("ui.choose.a.piece"));
    return <main className={`mobile-shell ${screen==='game'?'mobile-game':''} ${historyOpen?'viewing-history':''} ${allBots?'observer-mode':''} ${publicPreview?'has-preview-note':''}`}>
        {publicPreview&&<aside className="public-preview-note" role="note">{t("ui.public.preview.neural.weights.are.excluded.pending.licensing.revi")}{" "}<a href="/shashbesh-source.tar.gz" download>{t("ui.source.and.licenses")}</a>{" · "}<a href="/THIRD_PARTY_NOTICES.txt">{t("ui.component.licenses")}</a></aside>}
        <header className="mobile-header">{screen==='game'?<>{[['☰','ui.menu'],['⚙','ui.more.options'],['ⓘ','ui.how.to.play']].map(([icon,key])=><button key={key} aria-label={t(key as Parameters<typeof t>[0])} onClick={()=>{setMenuOpen(true);setRulesOpen(key==='ui.how.to.play');}}>{icon}</button>)}</>:<><LanguageSelector/><button className="table-brand" onClick={()=>setScreen('home')}>{t('ui.shashbesh.43')}</button><button aria-label={t('ui.menu')} onClick={()=>setMenuOpen(true)}>☰</button></>}</header>
        {screen==='home'&&restoring&&<p className="home-note" role="status">{t("ui.restoring.saved.match")}</p>}
        {screen==='home'&&!restoring&&<HomeScreen hasGame={state.eventLog.length>1||!!lanMembership} onResume={()=>setScreen(lanMembership&&!lanStatus?.state?'wifi':'game')} onStart={startMobile} onObserve={observeBots}/>}
        {NETWORK_ENABLED&&screen==='wifi'&&<WifiScreen status={lanStatus} client={lanClient.current} capacity={mobileCount} onGame={()=>setScreen('game')} onJoin={joinLan} onLeave={()=>{leaveLan();setScreen('home');}}/>}
        {screen==='game'&&<><section className="table-area"><Board rotation={viewerRotation(geometry,viewerSeat??lanMembership?.playerId??(state.players.filter(p=>controllers[p]==='human').length===1?state.players.find(p=>controllers[p]==='human')!:null))} geometry={geometry} state={displayed} actions={manualTable?actions:[]} animation={displayFrame} selected={historyOpen&&historyRow?historyRow.action:displayFrame?.command.action??null} physical chosenPiece={displayFrame?.command.action?.pieceId??chosenPiece} center={<TableDice state={displayed} selectedValue={displayFrame?.command.action?.value} canTap={canTapDice} onTap={rollGame}/>} onPiece={id=>{if(manualTable)setChosenPiece(id);}} onDestination={options=>{if(!manualTable)return;if(options.length===1)moveGame(options[0]);else setActionChoices(options);}} onAction={moveGame}/></section>
        <div className="table-status" role="status">{state.winner?hint:(error||saveError)?t('game.error'):''}</div></>}
        {actionChoices.length>0&&<div className="mobile-modal" role="dialog" aria-modal="true" aria-label={t("ui.choose.a.die")}><section><h2>{t("ui.which.die")}</h2>{actionChoices.map((a,i)=><button key={i} onClick={()=>{setActionChoices([]);moveGame(a);}}>{a.value}</button>)}<button onClick={()=>setActionChoices([])}>{t("ui.back")}</button></section></div>}
        {menuOpen&&<div className="mobile-modal" role="dialog" aria-modal="true" aria-label={t("ui.game.menu")}><section className="game-menu"><LanguageSelector/>{publicPreview&&<p className="note">{t("ui.public.preview.neural.weights.are.excluded.pending.licensing.revi")} <a href="/shashbesh-source.tar.gz" download>{t("ui.source.and.licenses")}</a>{" · "}<a href="/THIRD_PARTY_NOTICES.txt">{t('ui.component.licenses')}</a></p>}<label>{t('table.view')}<select value={viewerSeat??''} onChange={e=>setViewerSeat(e.target.value?Number(e.target.value) as Player:null)}><option value="">{t('ui.at.the.game.table')}</option>{state.players.filter(p=>controllers[p]==='human').map(p=><option key={p} value={p}>{colorName(p)}</option>)}</select></label>{allBots&&!historyOpen&&!replayEvents&&<AiControls running={running} busy={playback.busy} paused={playback.controller.isPaused} speed={speed} disabled={!!legality.blocked||!!state.winner&&!playback.busy} onToggle={()=>{toggleBots();setMenuOpen(false);}} onStep={()=>{stepBot();setMenuOpen(false);}} onSpeed={setSpeed} onRestart={()=>{resetGame();setRunning(false);}}/>}<p className="table-hint" role="status">{hint}</p>{state.phase==='resolving_roll'&&!historyOpen&&!replayEvents&&<small className="turn-progress">{t('game.progress',{values:state.currentRoll?.remainingActions.map(v=>formatNumber(v)).join(' · ')||'—',points:state.currentRoll?.usedPoints??0})}</small>}{canManual&&<LegalMoveControls actions={actions} chosenPiece={chosenPiece} onPiece={setChosenPiece} onAction={moveGame}/>}{state.winner&&!historyOpen&&!replayEvents&&<button onClick={()=>{setScreen('home');setRunning(false);}}>{t('ui.start.new.match')}</button>}{historyOpen?<div className="table-history-controls"><button aria-label={t("ui.previous.move")} disabled={historyIndex<=0} onClick={()=>setHistoryIndex(historyIndex-1)}>‹</button><button onClick={()=>setHistoryBefore(!historyBefore)}>{historyBefore?t("ui.show.after"):t("ui.show.before")}</button><button aria-label={t("ui.next.move")} disabled={historyIndex>=historyRows.length-1} onClick={()=>setHistoryIndex(historyIndex+1)}>›</button><button onClick={()=>setHistoryOpen(false)}>{t("ui.back.to.game")}</button></div>:!allBots&&<button className="table-undo" aria-label={t("ui.undo.move")} disabled={!canUndo} onClick={undoGame}>↶ <span>{t("ui.undo")}</span></button>}{(error||saveError)&&<p className="mobile-error" role="alert">{t('game.error')}</p>}<button className="close-menu" onClick={()=>{setMenuOpen(false);setSavedGames(null);}}>{t("ui.close.menu")}</button><h2>{t("ui.at.the.game.table")}</h2>{historyOpen&&<HistoryPanel rows={historyRows} index={historyIndex} onSelect={i=>{setHistoryIndex(i);setMenuOpen(false);}} onClose={()=>{setHistoryOpen(false);setMenuOpen(false);}} showBefore={historyBefore} onToggle={()=>{setHistoryBefore(!historyBefore);setMenuOpen(false);}}/>}<button onClick={openHistory}>{t("ui.history")}</button><button onClick={()=>{setScreen('home');setMenuOpen(false);setHistoryOpen(false);setReplayEvents(null);}}>{t("ui.new.game")}</button><button onClick={()=>{void listLocalGames().then(setSavedGames).catch(e=>setError(e.message));}}>{t("ui.saved.matches")}</button>{savedGames&&<div className="saved-games">{!savedGames.length&&<p>{t("ui.no.played.matches.yet")}</p>}{savedGames.map((saved,i)=><button key={saved.events[0].gameId} onClick={()=>resumeSaved(saved)}>{t("ui.match")}{" "}{savedGames.length-i}<small>{saved.events[0].timestamp?new Date(saved.events[0].timestamp).toLocaleString(getLocale()):''} · {plural('players',saved.count)}</small></button>)}</div>}{lanMembership&&<button onClick={()=>{setScreen('wifi');setMenuOpen(false);}}>{t("ui.wi.fi.players")}</button>}{lanMembership&&<button onClick={()=>{leaveLan();setScreen('home');setMenuOpen(false);}}>{t("ui.leave.wi.fi.game")}</button>}<details className="table-rules" open={rulesOpen} onToggle={event=>setRulesOpen(event.currentTarget.open)}><summary>{t("ui.how.to.play")}</summary>{rulesOpen&&<Suspense fallback={<p role="status">…</p>}><RulesContent/></Suspense>}<p>{t("ui.tap.dice.choose.a.piece.and.a.highlighted.cell.a.six.lets.a.piece")}</p><p>{t("ui.you.cannot.pass.your.own.pieces.landing.on.an.opponent.returns.it")}</p></details><details className="table-advanced"><summary>{t("ui.more.options")}</summary><DisputedMovePanel state={disputedState} legalActions={disputedActions} proposedOptions={disputedOptions} selectedAction={selected??displayFrame?.command.action??null} onSave={saveAndExportDispute}/><button onClick={exportReplay}>{t("ui.export.match")}</button><button onClick={()=>{setMenuOpen(false);setTechnicalOpen(true);}}>{t("ui.technical.options")}</button></details></section></div>}
    </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
