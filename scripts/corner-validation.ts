import {readFileSync,mkdirSync,appendFileSync,writeFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {Engine,parseGeometry,trackId,POLICY,canonical,stateHash} from '../packages/engine/src/index';
import {seeded} from '../packages/engine/src/rng';
import {choose,observe,resolveAgentRoll,neuralScorer,type Strategy} from '../packages/agents/src/index';
import {selectAction} from '../packages/neural/src/index';
import type {GameState,Player,Action,ControllerIdentity} from '../packages/shared/src/index';
import {checkTransition,checkFinish} from '../tests/gameplay-oracle';
const dir='artifacts/gameplay-token-priority-v4';if(existsSync(dir+'/targeted.jsonl'))throw Error('Refusing to append or overwrite an existing targeted run');mkdirSync(dir+'/failures',{recursive:true});const g=parseGeometry(readFileSync('data/igra_64_koordinaty.csv','utf8')),engine=new Engine(g),at=(n:number)=>(n-1+480)%48+1;
let moves=0;const rawExecute=(engine as unknown as {applyValidated:(s:GameState,a:Action,c?:ControllerIdentity)=>GameState}).applyValidated.bind(engine);
(engine as unknown as {applyValidated:typeof rawExecute}).applyValidated=(s,a,c)=>{const n=rawExecute(s,a,c);engine.assertInvariants(n);checkTransition(g,s,a,n);moves++;return n;};
const report={schema:'corner-validation-v4',policy:POLICY,seedPrefix:'corner-priority-v4',executed:0,pass:0,blocked:0,fail:0,moves:0,neuralRawTopExcluded:0,neuralComparisons:0,strategies:{} as Record<string,number>,families:{} as Record<string,number>};
for(let i=0;i<10000;i++){
 const seed=`corner-priority-v4-${i}`,rng=seeded(seed),actor=(1+Math.floor(rng.next()*4)) as Player,opponent=(actor%4+1) as Player,corner=g.corners[Math.floor(rng.next()*4)],family=i%9;let step=family===0?1+Math.floor(rng.next()*6):family===6?1:3;
 let s=engine.initialRoll(engine.create([1,2,3,4],seed,seed),Object.fromEntries([1,2,3,4].map(p=>[p,p===actor?6:1])));
 const A=`P${actor}-1`,B=`P${actor}-2`,C=`P${actor}-3`,enemy=`P${opponent}-1`;
 const place=(id:string,n:number)=>{const p=s.pieces.find(p=>p.id===id)!;n=at(n);Object.assign(p,{status:'track',position:trackId(n),outerSteps:(n-g.starts[p.owner]+48)%48,homeIndex:null,finishedSlot:null});};
 const allowed:[string,number][]=[];
 if(family===2){place(A,corner);place(B,corner+24);place(enemy,corner+12);allowed.push([A,1],[B,1]);step=3;}
 else if(family===7||family===8){place(A,corner+30);if(family===7){place(enemy,corner+31);allowed.push([A,1]);}else{place(enemy,corner+5);allowed.push([A,1],[A,2]);}step=2;}
 else{place(A,corner-step);allowed.push([A,step]);if(family===1){place(B,corner+30);place(enemy,corner+31);}if(family===3)place(enemy,corner+12);if(family===4||family===5){place(B,family===4?corner-2:corner+5);place(C,corner+30);place(enemy,corner+31);allowed.splice(0,allowed.length,[C,1]);}if(family===6){place(B,corner+13);place(C,corner+30);place(enemy,corner+31);}if(family===0)place(enemy,corner+8);}
 const dice:[number,number]=rng.next()<.5?[step,1]:[1,step],fixture=structuredClone(s);s=engine.roll(s,dice);engine.assertInvariants(s);const before=moves,strategy=(['random','greedy','tactical','ai-v0.1'] as Strategy[])[i%4];let status:'PASS'|'BLOCKED'|'FAIL'='PASS',error:string|null=null;
 try{const legal=engine.legalActions(s);assert.deepEqual([...new Set(legal.map(a=>`${a.pieceId}:${a.value}`))].sort(),allowed.map(([p,v])=>`${p}:${v}`).sort(),'Independently specified first-action set');
  if(family===0||family===1||family===3){const a=legal[0];assert.equal(a.kind,'move');assert.equal(a.to,trackId(corner));assert.equal(a.value,step);assert.equal(a.jump,undefined);if(family===0)assert.deepEqual(a.captureIds,[],'Jump-route opponent is passed and is not captured during approach');}
  const raw=[...new Set(s.currentRoll!.remainingActions)].flatMap(v=>engine.candidates(s,v));const preferred=selectAction(neuralScorer,observe(s),raw,g);report.neuralComparisons++;if(preferred&&!legal.some(a=>canonical(a)===canonical(preferred)))report.neuralRawTopExcluded++;
  s=resolveAgentRoll(engine,s,strategy,seeded(seed+':agent'));if(!s.winner){const prior=s;s=engine.finishRoll(s);checkFinish(prior,s);engine.assertInvariants(s);}
  const actions=s.eventLog.filter(e=>e.type==='action').map(e=>e.payload as Action);if(family===0||family===1||family===2||family===3)assert.ok(actions.every(a=>a.pieceId===actions[0].pieceId),'Same-piece continuation was bypassed');
 }catch(e){status='FAIL';error=(e as Error).stack??String(e);writeFileSync(`${dir}/failures/${seed}.json`,JSON.stringify({seed,fixture,dice,allowed,error},null,2));}
 report.executed++;report[status==='PASS'?'pass':status==='BLOCKED'?'blocked':'fail']++;report.strategies[strategy]=(report.strategies[strategy]??0)+1;report.families[String(family)]=(report.families[String(family)]??0)+1;
 appendFileSync(`${dir}/targeted.jsonl`,JSON.stringify({index:i,seed,actor,corner,family,dice,strategy,status,moves:moves-before,error,stateHash:stateHash(s)})+'\n');if((i+1)%250===0){report.moves=moves;writeFileSync(`${dir}/targeted-summary.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({executed:report.executed,pass:report.pass,blocked:report.blocked,fail:report.fail,moves}));}
}
report.moves=moves;writeFileSync(`${dir}/targeted-summary.json`,JSON.stringify(report,null,2));if(report.fail)process.exitCode=1;
