import type {Action,GameState,Player,Geometry,ControllerIdentity} from '../../../packages/shared/src/index';
import type {Engine} from '../../../packages/engine/src/index';
import type {Rng} from '../../../packages/engine/src/rng';
import type {ActionScorer} from '../../../packages/neural/src/index';

export type Strategy='random'|'greedy'|'tactical'|'ai-v0.1';
export const baselineStrategies:Strategy[]=['random','greedy','tactical'];
export const strategies:Strategy[]=[...baselineStrategies,'ai-v0.1'];
export type Observation=Pick<GameState,'pieces'|'activePlayer'|'players'|'currentRoll'|'rulePolicy'|'rulesVersion'>;
export const observe=(s:GameState):Observation=>structuredClone({pieces:s.pieces,activePlayer:s.activePlayer,players:s.players,currentRoll:s.currentRoll,rulePolicy:s.rulePolicy,rulesVersion:s.rulesVersion});

// This inert scorer exists only to keep the shared UI's controller types intact.
// The preview build aliases out the model-bearing agent module and never exposes
// the neural strategy in its controls.
export const neuralScorer:ActionScorer={id:'neural-unavailable',version:'Neural agent omitted from public preview',score(){throw Error('Neural weights are not included in this licensing-review preview.');}};

export function choose(strategy:Strategy,state:Observation,legal:Action[][],rng:Rng,_geometry?:Geometry):Action[]{
 if(!legal.length)throw Error('Нет списка допустимых последовательностей');
 if(strategy==='ai-v0.1')throw Error('Нейросеть не включена в публичный preview до завершения проверки лицензирования.');
 if(strategy==='random')return legal[Math.floor(rng.next()*legal.length)];
 if(strategy!=='greedy'&&strategy!=='tactical')throw Error('Неизвестная стратегия');
 const score=(seq:Action[])=>{let n=0;const own=new Map(state.pieces.filter(p=>p.owner===state.activePlayer).map(p=>[p.id,p]));for(const a of seq){const piece=own.get(a.pieceId)!;n+=a.kind==='deploy'?8:a.kind==='corner_jump'?12:a.value;if(a.to.startsWith('Д'))n+=24+Number(a.to.split('-')[1])*4;if(strategy==='tactical')n+=a.captureIds.reduce((acc,id)=>acc+16+(state.pieces.find(p=>p.id===id)?.outerSteps??0)*0.35,0);if(piece.outerSteps>=40)n+=a.value*0.5;}if(strategy==='tactical'){const ends=new Map(state.pieces.filter(p=>p.owner===state.activePlayer&&p.position).map(p=>[p.id,p.position!]));for(const a of seq)ends.set(a.pieceId,a.to);for(const pos of ends.values())if(pos.startsWith('М')){const target=Number(pos.slice(1));for(const enemy of state.pieces.filter(p=>p.owner!==state.activePlayer&&p.status==='track')){const distance=(target-Number(enemy.position!.slice(1))+48)%48;if(distance>0&&distance<=6)n-=3;}}}return n;};
 let best=-Infinity,choices:Action[][]=[];for(const seq of legal){const n=score(seq);if(n>best){best=n;choices=[];}if(n===best)choices.push(seq);}return choices[Math.floor(rng.next()*choices.length)];
}
export type Controllers=Partial<Record<Player,Strategy|'human'>>;
export function agentIdentity(strategy:Strategy):ControllerIdentity{return strategy==='ai-v0.1'?{kind:'agent',id:neuralScorer.id,version:neuralScorer.version}:{kind:'agent',id:strategy,version:'baseline-v1'};}
export function resolveAgentRoll(engine:Engine,state:GameState,strategy:Strategy,rng:Rng):GameState{if(strategy==='ai-v0.1')throw Error('Neural agent unavailable in public preview');return engine.applySequence(state,choose(strategy,observe(state),engine.legalSequencesForRoll(state),rng),agentIdentity(strategy));}
