import {test} from 'node:test';
import assert from 'node:assert/strict';
import {engine,geometry,ready,track,home} from './helpers';
import {trackId,Engine} from '../packages/engine/src/index';
import type {Player,Action,GameState} from '../packages/shared/src/index';
import {checkTransition} from './gameplay-oracle';
function fixture(owner:Player){return engine.initialRoll(engine.create([1,2,3,4]),Object.fromEntries([1,2,3,4].map(p=>[p,p===owner?6:1])));}
function find(s:GameState,id:string,value:number){const a=engine.legalActions(s).find(a=>a.pieceId===id&&a.value===value);assert.ok(a,`${id} value ${value}`);return a;}
test('Gameplay: Orange piece 4 passes enemy at 6; 2 reaches 7 and 1 jumps to 19',()=>{
 for(const dice of [[2,1],[1,2]] as [number,number][]){let s=engine.roll(track(track(ready(),'P1-4',5,4),'P2-1',6,41),dice);const a=find(s,'P1-4',2);assert.deepEqual(a.path,['М06','М07']);assert.deepEqual(a.captureIds,[]);let n=engine.applyAction(s,a);checkTransition(geometry,s,a,n);assert.equal(n.pieces.find(p=>p.id==='P2-1')!.position,'М06');
 const b=find(n,'P1-4',1);assert.equal(b.kind,'corner_jump');assert.equal(b.to,'М19');s=n;n=engine.applyAction(n,b);checkTransition(geometry,s,b,n);assert.equal(n.pieces.find(p=>p.id==='P2-1')!.position,'М06');assert.equal(n.currentRoll!.usedPoints,3);}
});
test('Gameplay: capture at 6 is geometrically possible but cannot bypass the mandatory 2-cell corner action',()=>{
 const s=engine.roll(track(track(ready(),'P1-4',5,4),'P2-1',6,41),[2,1]);const a=engine.candidates(s,1).find(a=>a.pieceId==='P1-4')!;assert.deepEqual(a.path,['М06']);assert.deepEqual(a.captureIds,['P2-1']);assert.throws(()=>engine.applyAction(s,a));assert.ok(engine.legalActions(s).every(a=>a.value===2));
});
test('Gameplay: without a corner opportunity, separate 1-cell landing captures and remaining 2 moves normally',()=>{
 let s=engine.roll(track(track(ready(),'P1-4',2,1),'P2-1',3,38),[2,1]);const a=find(s,'P1-4',1);assert.deepEqual(a.path,['М03']);assert.deepEqual(a.captureIds,['P2-1']);let n=engine.applyAction(s,a);checkTransition(geometry,s,a,n);assert.equal(n.pieces.find(p=>p.id==='P2-1')!.status,'reserve');const b=find(n,'P1-4',2);assert.deepEqual(b.path,['М04','М05']);s=n;n=engine.applyAction(n,b);checkTransition(geometry,s,b,n);assert.equal(n.pieces.find(p=>p.id==='P1-4')!.position,'М05');assert.equal(n.pieces.find(p=>p.id==='P2-1')!.outerSteps,0);
});
test('Gameplay: all 48 outer origins, all owners, values 1..6 and all four home tracks',()=>{
 for(const owner of [1,2,3,4] as Player[])for(let origin=1;origin<=48;origin++)for(let value=1;value<=6;value++){
  const s=fixture(owner);track(s,`P${owner}-1`,origin,(origin-geometry.starts[owner]+48)%48);
  const a=engine.candidates(s,value).find(a=>a.pieceId===`P${owner}-1`);let pos=trackId(origin),steps=(origin-geometry.starts[owner]+48)%48,homeIndex:number|null=null;
  if(value===1&&geometry.corners.includes(origin))pos=trackId((origin+11)%48+1);else for(let j=0;j<value;j++){if(homeIndex!==null){homeIndex++;if(homeIndex>4)break;pos=geometry.homes[owner][homeIndex];}else{pos=trackId(Number(pos.slice(1))%48+1);steps++;if(pos===trackId(geometry.starts[owner])&&steps>=48)homeIndex=0;}}
  if(homeIndex!==null&&homeIndex>4){assert.equal(a,undefined);continue;}const standingJump=value===1&&geometry.corners.includes(origin);assert.ok(a);if(standingJump)pos=trackId((origin+11)%48+1);assert.equal(a.to,pos);assert.equal(a.path.length,value);
 }
 for(const owner of [1,2,3,4] as Player[])for(let index=0;index<4;index++)for(let value=1;value<=6;value++){
  const s=fixture(owner);home(s,`P${owner}-1`,index);const a=engine.candidates(s,value).find(a=>a.pieceId===`P${owner}-1`);assert.equal(!!a,index+value<=4);if(a)assert.equal(a.to,geometry.homes[owner][index+value]);
 }
});
test('Gameplay: all 36 ordered rolls, six doubles, 6–5/5–6, dice exhaustion and extra-turn boundaries',()=>{
 for(let d1=1;d1<=6;d1++)for(let d2=1;d2<=6;d2++){
  let s=engine.roll(track(ready(),'P1-1',2,1),[d1,d2]);assert.deepEqual(s.currentRoll!.remainingActions,d1===d2?[d1,d1,d1,d1]:[d1,d2]);assert.equal(s.currentRoll!.extraRoll,d1===d2||d1+d2===11);assert.throws(()=>engine.roll(s,[1,2]));
  const seq=engine.legalSequencesForRoll(s)[0];assert.equal(seq.reduce((n,a)=>n+a.value,0),d1===d2?4*d1:d1+d2);s=engine.applySequence(s,seq);engine.assertInvariants(s);s=engine.finishRoll(s);assert.equal(s.activePlayer,d1===d2||d1+d2===11?1:2);assert.equal(s.currentRoll,null);
 }
});
test('Gameplay: own blockers vs enemy passing/landing for all outer cells (normal moves)',()=>{
 for(let origin=1;origin<=48;origin++){
  const owner:Player=origin>=47?2:1,id=`P${owner}-1`,middle=origin%48+1,end=(origin+1)%48+1,progress=(pos:number)=>(pos-geometry.starts[owner]+48)%48;
  const own=track(track(fixture(owner),id,origin,progress(origin)),`P${owner}-2`,middle,progress(middle));assert.equal(engine.candidates(own,2).some(a=>a.pieceId===id),false);
  const final=end;
  const foreign=track(track(fixture(owner),id,origin,progress(origin)),'P3-1',middle,(middle-25+48)%48);const a=engine.candidates(foreign,2).find(a=>a.pieceId===id)!;assert.equal(a.to,trackId(final));assert.deepEqual(a.captureIds,[]);
  track(foreign,'P3-1',final,(final-25+48)%48);assert.deepEqual(engine.candidates(foreign,2).find(a=>a.pieceId===id)!.captureIds,['P3-1']);
 }
});
test('Gameplay: deployment, full-lap entry and exact victory for every owner',()=>{
 for(const owner of [1,2,3,4] as Player[]){let s=fixture(owner),id=`P${owner}-5`;assert.equal(engine.candidates(s,5).some(a=>a.kind==='deploy'),false);assert.equal(engine.candidates(s,6).filter(a=>a.kind==='deploy').length,5);
  const entrance=geometry.starts[owner],before=(entrance+46)%48+1;track(s,id,before,47);s=engine.roll(s,[1,2]);const entry=find(s,id,1);assert.equal(entry.to,trackId(entrance));s=engine.applyAction(s,entry);assert.equal(s.pieces.find(p=>p.id===id)!.homeIndex,0);
  let won=fixture(owner);for(let i=1;i<=4;i++)home(won,`P${owner}-${i}`,i,true);track(won,id,before,47);won=engine.roll(won,[1,2]);const last=find(won,id,1);won=engine.applyAction(won,last);engine.assertInvariants(won);assert.equal(won.winner,owner);assert.equal(won.phase,'game_over');assert.throws(()=>engine.roll(won,[6,6]));
 }
});
