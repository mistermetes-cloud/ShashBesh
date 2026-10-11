import {test} from 'node:test';
import assert from 'node:assert/strict';
import {engine,geometry,ready,track} from './helpers';
import {canonical,RuleClarificationRequired,LEGACY_POLICY,Engine,hash,stateHash} from '../packages/engine/src/index';
import {choose,observe,resolveAgentRoll,neuralScorer,type Strategy} from '../packages/agents/src/index';
import {selectAction} from '../packages/neural/src/index';
import {seeded} from '../packages/engine/src/rng';
import type {GameState,Action} from '../packages/shared/src/index';
function approach(dice:[number,number]=[3,1],capture=false){let s=track(ready(),'P1-1',40,39);if(capture)s=track(track(s,'P1-2',5,4),'P2-1',6,41);return engine.roll(s,dice);}
function ready3(){return engine.initialRoll(engine.create([1,2,3]),{1:6,2:1,3:1});}
function picked(s:GameState,id:string,value:number){const a=engine.legalActions(s).find(a=>a.pieceId===id&&a.value===value);assert.ok(a);return a;}
test('A/F: 40→43 consumes 3, then mandatory 43→7 consumes 1 in either display order',()=>{
 for(const dice of [[3,1],[1,3]] as [number,number][]){const s=approach(dice),legal=engine.legalActions(s);assert.equal(legal.length,1);assert.equal(legal[0].value,3);assert.deepEqual(legal[0].path,['М41','М42','М43']);assert.equal(legal[0].jump,undefined);assert.throws(()=>engine.applyAction(s,engine.candidates(s,1)[0]));const n=engine.applyAction(s,legal[0]);assert.equal(n.pieces[0].position,'М43');assert.equal(n.pieces[0].outerSteps,42);assert.deepEqual(n.currentRoll!.remainingActions,[1]);assert.equal(n.currentRoll!.usedPoints,3);const jump=picked(n,'P1-1',1);assert.equal(jump.kind,'corner_jump');assert.equal(jump.to,'М07');assert.deepEqual(jump.path,['М07']);assert.deepEqual(jump.jump!.path,['М44','М45','М46','М47','М48','М01','М02','М03','М04','М05','М06','М07']);const after=engine.applyAction(n,jump);assert.deepEqual(after.currentRoll!.remainingActions,[]);assert.equal(after.currentRoll!.usedPoints,4);assert.equal(after.pieces[0].position,'М07');assert.deepEqual(engine.legalActions(after),[]);}
});
test('D/E: corner sequence beats a competing other-piece capture or ordinary move',()=>{
 const base=track(ready(),'P1-1',40,39),s=engine.roll(track(track(base,'P1-2',20,19),'P2-1',21,8),[3,1]);assert.deepEqual(engine.legalActions(s).map(a=>[a.pieceId,a.value]),[['P1-1',3]]);assert.throws(()=>engine.applyAction(s,engine.candidates(s,1).find(a=>a.pieceId==='P1-2')!));const n=engine.applyAction(s,picked(s,'P1-1',3));assert.deepEqual(engine.legalActions(n).map(a=>[a.kind,a.pieceId,a.to]),[['corner_jump','P1-1','М07']]);assert.equal(n.pieces.find(p=>p.id==='P2-1')!.position,'М21');
});
test('B/G: piece standing on a corner jumps on an available 1 and locks a legal remaining die',()=>{
 const s=engine.roll(track(track(ready(),'P1-1',43,42),'P1-2',20,19),[1,3]);const legal=engine.legalActions(s);assert.deepEqual(legal.map(a=>[a.kind,a.pieceId,a.value,a.to]),[['corner_jump','P1-1',1,'М07']]);const n=engine.applyAction(s,legal[0]);assert.equal(n.currentRoll!.forcedPieceId,'P1-1');assert.deepEqual(engine.legalActions(n).map(a=>[a.value,a.to]),[[3,'М10']]);
});
test('B: same-piece continuation is mandatory when legal; otherwise the remaining die may transfer',()=>{
 let s=engine.roll(track(track(track(ready(),'P1-1',7,6),'P1-2',20,19),'P1-3',30,29),[1,3]);
 s=engine.applyAction(s,picked(s,'P1-1',1));const transfer=engine.legalActions(s);assert.ok(transfer.length>0);assert.ok(transfer.every(a=>a.pieceId!=='P1-1'),'blocked jumper cannot consume the remaining die');assert.ok(transfer.some(a=>a.pieceId==='P1-3'&&a.value===3));
 s=engine.applyAction(s,transfer.find(a=>a.pieceId==='P1-3')!);assert.equal(s.pieces.find(p=>p.id==='P1-1')!.position,'М19');assert.equal(s.pieces.find(p=>p.id==='P1-3')!.position,'М33');assert.deepEqual(s.currentRoll!.remainingActions,[]);assert.equal(s.currentRoll!.forcedPieceId,undefined);
});
test('E/I: absent corners, available capture beats ordinary movement',()=>{
 const s=engine.roll(track(track(track(ready(),'P1-1',2,1),'P1-2',20,19),'P2-1',3,38),[2,1]);const legal=engine.legalActions(s);assert.equal(legal.length,1);assert.equal(legal[0].value,1);assert.equal(legal[0].to,'М03');assert.deepEqual(legal[0].captureIds,['P2-1']);assert.throws(()=>engine.applyAction(s,engine.candidates(s,2).find(a=>a.pieceId==='P1-1')!));
});
test('F: allied piece on approach or jump ray cannot create a mandatory legal corner opportunity',()=>{
 let s=track(track(ready(),'P1-1',28,27),'P1-2',29,28);s=engine.roll(s,[3,1]);assert.ok(!engine.candidates(s,3).some(a=>a.pieceId==='P1-1'));
 s=engine.roll(track(track(ready(),'P1-1',40,39),'P1-2',47,46),[3,1]);const a=engine.candidates(s,3).find(a=>a.pieceId==='P1-1')!;assert.equal(a.jump,undefined);assert.equal(a.to,'М43');
});
test('G: two legal initial corner alternatives are retained even if only one captures',()=>{
 const s=engine.roll(track(track(track(ready(),'P1-1',7,6),'P1-2',31,30),'P2-1',19,6),[1,3]);assert.deepEqual(engine.legalActions(s).map(a=>a.pieceId).sort(),['P1-1','P1-2']);assert.ok(engine.legalSequencesForRoll(s).every(seq=>seq[0].jump&&seq.every(a=>a.pieceId===seq[0].pieceId)));
});
test('H/J: jump landing captures only on its destination; intermediate opponent remains',()=>{
 let s=engine.roll(track(track(track(ready3(),'P1-1',40,39),'P2-1',7,42),'P3-1',48,23),[3,1]);s=engine.applyAction(s,picked(s,'P1-1',3));assert.equal(s.pieces.find(p=>p.id==='P2-1')!.position,'М07');const jump=picked(s,'P1-1',1);assert.deepEqual(jump.captureIds,['P2-1']);s=engine.applyAction(s,jump);engine.assertInvariants(s);assert.equal(s.pieces[0].position,'М07');assert.equal(s.pieces[0].outerSteps,54);assert.equal(s.pieces.find(p=>p.id==='P2-1')!.position,null);assert.equal(s.pieces.find(p=>p.id==='P3-1')!.position,'М48');assert.equal(s.currentRoll!.usedPoints,4);assert.deepEqual(s.currentRoll!.remainingActions,[]);s=engine.finishRoll(s);assert.equal(s.activePlayer,2);
});
test('J: all agents choose only filtered corner prefixes; standalone neural selection cannot authorize an illegal action',()=>{
 for(const strategy of ['random','greedy','tactical','ai-v0.1'] as Strategy[]){const base=track(ready(),'P1-1',40,39),s=engine.roll(track(track(base,'P1-2',20,19),'P2-1',21,8),[3,1]),legal=engine.legalSequencesForRoll(s),seq=choose(strategy,observe(s),legal,seeded('priority-agent'),geometry);assert.equal(seq[0].pieceId,'P1-1');assert.equal(seq[0].value,3);const n=resolveAgentRoll(engine,s,strategy,seeded('priority-agent'));assert.ok(n.eventLog.filter(e=>e.type==='action').every(e=>(e.payload as Action).pieceId==='P1-1'));assert.equal(n.pieces.find(p=>p.id==='P2-1')!.position,'М21');}
 const base=track(ready(),'P1-1',40,39),s=engine.roll(track(track(base,'P1-2',20,19),'P2-1',21,8),[3,1]),raw=engine.candidates(s,1);const illegal=selectAction(neuralScorer,observe(s),raw,geometry)!;assert.throws(()=>engine.applyAction(s,illegal));
});
test('C: reaching a corner with no unused one does not impose corner-jump priority',()=>{
 const s=engine.roll(track(track(ready(),'P1-1',40,39),'P1-2',5,4),[3,2]);assert.deepEqual([...new Set(engine.legalActions(s).map(a=>a.value))].sort(),[2,3]);const n=engine.applyAction(s,engine.legalActions(s).find(a=>a.pieceId==='P1-1'&&a.value===3)!);assert.equal(n.pieces[0].position,'М43');assert.equal(n.currentRoll!.usedPoints,3);assert.deepEqual(n.currentRoll!.remainingActions,[2]);assert.ok(engine.legalActions(n).every(a=>a.kind!=='corner_jump'));
});
test('K: real new-policy journal and doubles replay exactly; old policy is not accepted for new gameplay',()=>{
 let s=engine.roll(ready(),[6,6]);s=engine.applySequence(s,engine.legalSequencesForRoll(s)[0]);engine.assertInvariants(s);assert.equal(s.currentRoll!.usedPoints,24);assert.equal(stateHash(engine.replay(s.eventLog)),stateHash(s));s=engine.finishRoll(s);assert.equal(s.activePlayer,1);assert.equal(s.eventLog.at(-1)!.type,'extra_roll');assert.throws(()=>engine.create([1,2],'old',null,LEGACY_POLICY));
});
