import {readFileSync,mkdirSync,writeFileSync,appendFileSync,existsSync} from 'node:fs';
import {Engine,parseGeometry,POLICY,exportLog,stateHash,canonical,RuleClarificationRequired} from '../packages/engine/src/index';
import {seeded} from '../packages/engine/src/rng';
import {choose,observe,agentIdentity,neuralScorer,type Strategy} from '../packages/agents/src/index';
import {selectAction} from '../packages/neural/src/index';
import type {Action,GameState,Player,ControllerIdentity} from '../packages/shared/src/index';
import {checkTransition,checkFinish} from '../tests/gameplay-oracle';
const args=process.argv.slice(2),arg=(k:string,v:string)=>args.includes(k)?args[args.indexOf(k)+1]:v;
const mode=arg('--mode','ai'),count=Number(arg('--games','10000')),shard=Number(arg('--shard','0')),shards=Number(arg('--shards','1')),maxRolls=Number(arg('--max-rolls','5000'));
const dir=arg('--output','artifacts/gameplay-current-priority'),file=`${dir}/${mode}-${shard}.jsonl`;mkdirSync(`${dir}/failures`,{recursive:true});mkdirSync(`${dir}/blocked`,{recursive:true});
const geometry=parseGeometry(readFileSync('data/igra_64_koordinaty.csv','utf8')),engine=new Engine(geometry);
let moves=0;const execute=(engine as unknown as {applyValidated:(s:GameState,a:Action,c?:ControllerIdentity)=>GameState}).applyValidated.bind(engine);
// Test-only observer wraps execution without replacing any decision, transition or journal logic.
(engine as unknown as {applyValidated:typeof execute}).applyValidated=(s,a,c)=>{const n=execute(s,a,c);engine.assertInvariants(n);checkTransition(geometry,s,a,n);moves++;return n;};
const prior=existsSync(file)?readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(x=>JSON.parse(x)):[];if(prior.some(x=>canonical(x.rulePolicy)!==canonical(POLICY)))throw Error('Cannot resume/mix rows from another rule policy');const done=new Set(prior.map(x=>x.index));const started=Date.now();
for(let i=shard;i<count;i+=shards){if(done.has(i))continue;const seed=`full-${mode}-corner-v2-${i}`,rng=seeded(seed+':dice'),agent=seeded(seed+':agents'),players=Array.from({length:2+i%3},(_,j)=>j+1) as Player[];
 const lineups:Strategy[][]=[['ai-v0.1','tactical','greedy','random'],['tactical','ai-v0.1','random','greedy'],['ai-v0.1','ai-v0.1','tactical','random']];const bots=lineups[Math.floor(i/3)%3].slice(0,players.length);
 let s=engine.create(players,`stress-${seed}`,seed,POLICY,Object.fromEntries(players.map((p,j)=>[p,agentIdentity(mode==='random'?'random':bots[j])]))),err:string|null=null,blocked=false;const before=moves;
 try{while(s.phase==='initial_roll'){s=engine.initialRoll(s,Object.fromEntries(s.initialContenders.map(p=>[p,rng.die()])));engine.assertInvariants(s);}
 while(!s.winner&&s.rollCount<maxRolls){const dice:[number,number]=[rng.die(),rng.die()];s=engine.roll(s,dice);engine.assertInvariants(s);const strategy=bots[s.activePlayer-1];
  if(mode==='random'){while(s.phase==='resolving_roll'){const legal=engine.legalActions(s);if(!legal.length)break;s=engine.applyAction(s,legal[Math.floor(agent.next()*legal.length)],agentIdentity('random'));}}
  else if(strategy==='ai-v0.1'){while(s.phase==='resolving_roll'){const legal=engine.legalActions(s),a=selectAction(neuralScorer,observe(s),legal,geometry);if(!a)break;s=engine.applyAction(s,a,agentIdentity(strategy));}}
  else s=engine.applySequence(s,choose(strategy,observe(s),engine.legalSequencesForRoll(s),agent),agentIdentity(strategy));
  if(!s.winner){const b=s;s=engine.finishRoll(s,agentIdentity(mode==='random'?'random':strategy));engine.assertInvariants(s);checkFinish(b,s);}
 }
 if(!s.winner)err='roll_limit';
 }catch(e){err=(e as Error).stack??String(e);blocked=e instanceof RuleClarificationRequired;}
 const status=blocked?'BLOCKED':err==='roll_limit'?'TIMEOUT':err?'FAIL':'PASS';
 const row={index:i,seed,mode,rulePolicy:POLICY,status,players:players.length,strategies:mode==='random'?players.map(()=> 'uniform-legal-action'):bots,winner:s.winner,rolls:s.rollCount,moves:moves-before,error:blocked?null:err,blockedReason:blocked?err:null,stateHash:stateHash(s)};appendFileSync(file,JSON.stringify(row)+'\n');
 if(err){const destination=blocked?'blocked':'failures';writeFileSync(`${dir}/${destination}/${mode}-${i}.jsonl`,exportLog(s));writeFileSync(`${dir}/${destination}/${mode}-${i}.json`,JSON.stringify(row,null,2));}
 if((i-shard)/shards%25===0)console.log(JSON.stringify({mode,shard,index:i,moves,seconds:(Date.now()-started)/1000,error:err}));
}
console.log(JSON.stringify({mode,shard,done:true,moves,seconds:(Date.now()-started)/1000}));
