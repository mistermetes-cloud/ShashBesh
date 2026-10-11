import {canonical,type Engine} from '../../../packages/engine/src/index';
import {choose,observe,agentIdentity,neuralScorer,type Strategy,type Controllers} from '../../../packages/agents/src/index';
import {selectAction} from '../../../packages/neural/src/index';
import type {Rng} from '../../../packages/engine/src/rng';
import type {Action,GameState} from '../../../packages/shared/src/index';
export interface SavedAiPlan{gameId:string;rollId:number;headHash:string;strategy:Strategy;queue:Action[];}
/** Retain the original full-roll baseline choice across visual steps, pauses and reloads. No timing inputs. */
export class AiRollPlanner{
 private plan:{expected:GameState;strategy:Strategy;queue:Action[]}|null=null;
 constructor(private readonly engine:Engine,private readonly rng:()=>Rng){}
 next(s:GameState,strategy:Strategy){let action:Action|null;
  if(strategy==='ai-v0.1'){this.plan=null;action=selectAction(neuralScorer,observe(s),this.engine.legalActions(s),this.engine.geometry);}
  else{if(this.plan?.expected!==s||this.plan.strategy!==strategy)this.plan={expected:s,strategy,queue:[...choose(strategy,observe(s),this.engine.legalSequencesForRoll(s),this.rng())]};action=this.plan.queue.shift()??null;}
  if(action){const after=this.engine.applyAction(s,action,agentIdentity(strategy));if(this.plan)this.plan.expected=after;return {after,action};}
  this.plan=null;return {after:this.engine.finishRoll(s,agentIdentity(strategy)),action:null};
 }
 snapshot(s:GameState):SavedAiPlan|undefined{const p=this.plan;return p?.expected===s&&s.phase==='resolving_roll'&&s.currentRoll?{gameId:s.gameId,rollId:s.currentRoll.id,headHash:s.eventLog.at(-1)!.hash,strategy:p.strategy,queue:[...p.queue]}:undefined;}
 restore(saved:SavedAiPlan|undefined,s:GameState,controllers:Controllers){this.plan=null;if(!saved)return;if(saved.gameId!==s.gameId||saved.rollId!==s.currentRoll?.id||saved.headHash!==s.eventLog.at(-1)?.hash||saved.strategy!==controllers[s.activePlayer]||saved.strategy==='ai-v0.1'||s.phase!=='resolving_roll'||!this.engine.legalSequencesForRoll(s).some(seq=>canonical(seq)===canonical(saved.queue)))throw Error('Сохранённый план ИИ не соответствует журналу');this.plan={expected:s,strategy:saved.strategy,queue:[...saved.queue]};}
 clear(){this.plan=null;}
}
