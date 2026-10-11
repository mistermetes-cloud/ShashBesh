import React,{useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import csv from '../../../data/igra_64_koordinaty.csv?raw';
import {Engine,parseGeometry,RuleClarificationRequired} from '../../../packages/engine/src/index';
import {seeded} from '../../../packages/engine/src/rng';
import type {Action,GameState} from '../../../packages/shared/src/index';
import {AiRollPlanner} from '../../../apps/web/src/aiDecisions';
import {useAiPlayback} from '../../../apps/web/src/useAiPlayback';
import {speedName,frameHint} from '../../../apps/web/src/aiPlayback';
import {Board} from '../../../apps/web/src/Board';
import {TableDice} from '../../../apps/web/src/TableDice';
import {AiControls} from '../../../apps/web/src/AiControls';
import '../../../apps/web/src/style.css';
import '../../../apps/web/src/mobile.css';
import '../../../apps/web/src/aiPlayback.css';
const geometry=parseGeometry(csv),engine=new Engine(geometry),scenario=new URLSearchParams(location.search).get('scenario')??'pass';
function fixture(){let s=engine.initialRoll(engine.create([1,2],`fixture-${scenario}`),{1:6,2:1});const place=(id:string,pos:number)=>{const p=s.pieces.find(p=>p.id===id)!;Object.assign(p,{status:'track',position:`М${String(pos).padStart(2,'0')}`,outerSteps:(pos-geometry.starts[p.owner]+48)%48});};
 if(scenario==='double'){place('P1-4',2);}else if(scenario==='priority'){place('P1-1',40);place('P1-2',20);place('P2-1',21);}else if(scenario==='capture'){place('P1-4',2);place('P2-1',3);}else{place('P1-4',5);place('P2-1',6);}s=engine.roll(s,scenario==='double'?[2,2]:scenario==='priority'?[1,3]:[2,1]);engine.assertInvariants(s);return s;
}
function Harness(){const [state,setState]=useState(fixture),[running,setRunning]=useState(false),[speed,setSpeed]=useState(700),[piece,setPiece]=useState<string|null>(null);const rng=useRef(seeded('fixture-choice')),planner=useRef(new AiRollPlanner(engine,()=>rng.current));const playback=useAiPlayback(setState,running,speed);let actions:Action[];try{actions=engine.legalActions(state);}catch(e){if(!(e instanceof RuleClarificationRequired))throw e;actions=[];}
 const frame=playback.frame,shown=frame?(frame.phase==='end'||frame.phase==='extra'?frame.command.after:frame.command.before):state;
 function step(){if(playback.controller.busy){playback.controller.resume();return;}const {after,action}=planner.current.next(state,'tactical');playback.controller.start({before:state,after,action,kind:action?'action':'finish'},speedName(speed));}
 function toggle(){if(running||(playback.controller.busy&&!playback.controller.isPaused)){playback.controller.pause();setRunning(false);}else{playback.controller.resume();setRunning(true);}}
 return <main className="mobile-shell mobile-game observer-mode"><header className="mobile-header">Deterministic test-only fixture</header><section className="table-area"><Board geometry={geometry} state={shown} actions={playback.busy?[]:actions} selected={frame?.command.action??null} animation={frame} physical chosenPiece={frame?.command.action?.pieceId??piece} onPiece={setPiece} onDestination={a=>setState(engine.applyAction(state,a[0]))} onAction={a=>setState(engine.applyAction(state,a))} center={<TableDice state={shown} canTap={false} onTap={()=>{}} selectedValue={frame?.command.action?.value}/>}/></section><section className="table-controls"><AiControls running={running} busy={playback.busy} paused={playback.controller.isPaused} speed={speed} disabled={!!state.winner} onToggle={toggle} onStep={step} onSpeed={setSpeed} onRestart={()=>{playback.controller.cancel();planner.current.clear();setRunning(false);setState(fixture());}}/><p role="status">{frame?frameHint(frame):'Готово'}</p><output hidden data-testid="state">{JSON.stringify({pieces:state.pieces,remaining:state.currentRoll?.remainingActions,used:state.currentRoll?.usedPoints,actions:state.eventLog.filter(e=>e.type==='action').map(e=>e.payload),legal:actions})}</output></section></main>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
