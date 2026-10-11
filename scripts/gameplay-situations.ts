import {readFileSync,mkdirSync,appendFileSync,writeFileSync,existsSync} from 'node:fs';
import {Engine,parseGeometry,POLICY,trackId,stateHash} from '../packages/engine/src/index';
import {seeded} from '../packages/engine/src/rng';
import {observe,neuralScorer,agentIdentity} from '../packages/agents/src/index';
import {selectAction} from '../packages/neural/src/index';
import type {Player} from '../packages/shared/src/index';
import {referenceMaximum} from '../tests/gameplay-reference';
import {canonical} from '../packages/engine/src/index';
import assert from 'node:assert/strict';
import {checkTransition,checkFinish} from '../tests/gameplay-oracle';
const dir='artifacts/gameplay-full',reference=process.argv.includes('--reference'),file=dir+(reference?'/situations-reference.jsonl':'/situations.jsonl');mkdirSync(dir+'/failures',{recursive:true});const g=parseGeometry(readFileSync('data/igra_64_koordinaty.csv','utf8')),engine=new Engine(g);const done=new Set(existsSync(file)?readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l).index):[]);
for(let i=0;i<10000;i++){if(done.has(i))continue;const seed=`full-situation-v1-${i}`,rng=seeded(seed),players=Array.from({length:2+i%3},(_,j)=>j+1) as Player[],actor=players[Math.floor(i/3)%players.length];let s=engine.initialRoll(engine.create(players,seed,seed,POLICY),Object.fromEntries(players.map(p=>[p,p===actor?6:1])));const occupied=new Set<string>();
 for(const owner of players){const own=s.pieces.filter(p=>p.owner===owner),tail=Math.floor(rng.next()*4);for(let j=0;j<tail;j++){const q=own[4-j],slot=4-j;Object.assign(q,{position:g.homes[owner][slot],outerSteps:48,homeIndex:slot,finishedSlot:slot,status:'finished'});occupied.add(q.position!);}
  for(let j=0;j<5-tail;j++){if(rng.next()<.22)continue;const q=own[j];let pos=1+Math.floor(rng.next()*48);while(occupied.has(trackId(pos)))pos=pos%48+1;const progress=(pos-g.starts[owner]+48)%48;Object.assign(q,{position:trackId(pos),outerSteps:progress+(pos===g.starts[owner]?0:48*Math.floor(rng.next()*3)),homeIndex:null,finishedSlot:null,status:'track'});occupied.add(q.position!);}
 }
 const fixture=structuredClone(s),dice:[number,number]=[1+i%6,1+Math.floor(i/6)%6];let moves=0,error:string|null=null;
 try{engine.assertInvariants(s);s=engine.roll(s,dice);engine.assertInvariants(s);if(reference){const expected=referenceMaximum(g,s),actual=engine.legalActions(s);assert.deepEqual(actual.map(canonical).sort(),expected.legal.map(canonical).sort(),'Independent maximal legal mask');}
 while(s.phase==='resolving_roll'){const legal=engine.legalActions(s);if(!legal.length)break;const a=i%2===0?selectAction(neuralScorer,observe(s),legal,g)!:legal[Math.floor(rng.next()*legal.length)];const b=s;s=engine.applyAction(s,a,agentIdentity(i%2===0?'ai-v0.1':'random'));checkTransition(g,b,a,s);engine.assertInvariants(s);moves++;}
 if(!s.winner){const b=s;s=engine.finishRoll(s);checkFinish(b,s);engine.assertInvariants(s);}}
 catch(e){error=(e as Error).stack??String(e);writeFileSync(dir+`/failures/situation-${reference?'reference-':''}${i}.json`,JSON.stringify({seed,fixture,dice,error},null,2));}
 appendFileSync(file,JSON.stringify({index:i,seed,players:players.length,actor,dice,moves,winner:s.winner,error,stateHash:stateHash(s)})+'\n');if(i%250===0)console.log(JSON.stringify({situations:i+1,moves,error}));
}
console.log(reference?'10000 existing situations independently cross-checked':'10000 generated situations executed');
