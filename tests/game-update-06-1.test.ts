import {test} from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Board} from '../apps/web/src/Board';
import assert from 'node:assert/strict';
import {engine,geometry,track} from './helpers';
import {canonical} from '../packages/engine/src/index';
import {localSession,settleLocalRoll} from '../apps/web/src/session';
import {AiRollPlanner} from '../apps/web/src/aiDecisions';
import {seeded} from '../packages/engine/src/rng';
import type {Player} from '../packages/shared/src/index';

const pairs=Array.from({length:5},(_,i)=>i+2).flatMap(x=>[[1,x],[x,1]] as [number,number][]);
const cell=(n:number)=>(n-1+48)%48+1;
function position(owner:Player,blocked=false){
 const corner=geometry.corners[owner-1];
 let state=engine.initialRoll(engine.create([1,2,3,4]),Object.fromEntries([1,2,3,4].map(p=>[p,p===owner?6:1])));
 state=track(track(state,`P${owner}-1`,corner,6),`P${owner}-2`,cell(corner+(blocked?17:19)),blocked?23:25);
 if(blocked)state=track(state,`P${owner}-3`,cell(corner+6),12);
 return state;
}
for(const owner of [1,2,3,4] as Player[])for(const dice of pairs){
 test(`06.1 P${owner} ${dice.join('-')}: jump first, one die consumed, free follow-up including reserve`,()=>{
  const state=engine.roll(position(owner),dice),other=dice.find(v=>v!==1)!;
  const legal=engine.legalActions(state);assert.equal(legal.length,1);assert.equal(legal[0].pieceId,`P${owner}-1`);assert.equal(legal[0].kind,'corner_jump');assert.equal(legal[0].value,1);
  const html=renderToStaticMarkup(createElement(Board,{geometry,state,actions:legal,selected:null,onAction:()=>{},onPiece:()=>{},physical:true,chosenPiece:`P${owner}-1`}));
  const selectable=[...html.matchAll(/<button[^>]*class="[^"]*selectable-piece[^"]*"[^>]*>/g)].map(match=>match[0].match(/data-piece="([^"]+)"/)?.[1]);
  assert.deepEqual(selectable,[`P${owner}-1`],'UI must not expose raw ordinary/deploy candidates');
  const ordinary=engine.candidates(state,1).find(a=>a.pieceId===`P${owner}-2`)!;assert.ok(ordinary);assert.throws(()=>engine.applyAction(state,ordinary));
  if(other===6){assert.ok(engine.candidates(state,6).some(a=>a.kind==='deploy'));assert.ok(!legal.some(a=>a.kind==='deploy'));}
  const actor={kind:'human' as const,id:'verification',version:null};const session=localSession(engine,state,actor);
  assert.deepEqual(session.actions(),legal);
  for(const strategy of ['random','greedy','tactical'] as const){const pick=new AiRollPlanner(engine,()=>seeded('06.1')).next(state,strategy).action;assert.equal(canonical(pick),canonical(legal[0]));}
  const next=session.move(legal[0]);assert.deepEqual(next.currentRoll!.remainingActions,[other]);assert.equal(next.currentRoll!.usedPoints,1);assert.equal(next.currentRoll!.forcedPieceId,undefined);
  assert.equal(next.eventLog.filter(e=>e.type==='action').length,1);assert.equal(next.rollCount,state.rollCount);
  assert.equal(settleLocalRoll(engine,next,actor),next,'Do not finish while the other die is usable');
  const follow=engine.legalActions(next);assert.ok(follow.some(a=>a.pieceId===`P${owner}-2`&&a.value===other));
  if(other===6)assert.ok(follow.some(a=>a.kind==='deploy'));
  const after=engine.applyAction(next,follow.find(a=>a.pieceId===`P${owner}-2`)!);
  assert.equal(after.eventLog.filter(e=>e.type==='action').length,2);assert.equal(after.currentRoll!.usedPoints,1+other);assert.deepEqual(after.currentRoll!.remainingActions,[]);
  assert.throws(()=>engine.applyAction(after,legal[0]));
  const finished=engine.finishRoll(after);assert.equal(finished.phase,'await_roll');assert.notEqual(finished.activePlayer,owner);assert.equal(finished.eventLog.filter(e=>e.type==='roll_finished').length,1);
 });
 test(`06.1 P${owner} ${dice.join('-')}: blocked ray does not force an illegal jump`,()=>{
  const state=engine.roll(position(owner,true),dice),legal=engine.legalActions(state);
  assert.ok(legal.length);assert.ok(legal.every(a=>!a.jump));assert.ok(legal.some(a=>a.value===1));
  for(const action of legal)assert.ok(action.path.every(to=>!state.pieces.some(p=>p.owner===owner&&p.position===to)));
  let next=state,movements=0;while(engine.legalActions(next).length){assert.ok(movements<2);next=engine.applyAction(next,engine.legalActions(next)[0]);movements++;assert.equal(next.currentRoll!.remainingActions.length,2-movements);}
  assert.equal(next.eventLog.filter(e=>e.type==='action').length,movements);
  next=engine.finishRoll(next);assert.equal(next.phase,'await_roll');assert.equal(next.currentRoll,null);assert.notEqual(next.activePlayer,owner);
 });
}
for(const owner of [1,2,3,4] as Player[])for(const dice of [[3,1],[1,3]] as [number,number][])test(`06.1 P${owner} arrival ${dice.join('-')}: approach then separate jump`,()=>{
 const base=position(owner),corner=geometry.corners[owner-1];track(base,`P${owner}-1`,cell(corner-3),3);
 let state=engine.roll(base,dice);const legal=engine.legalActions(state);assert.equal(legal.length,1);assert.equal(legal[0].value,3);assert.equal(legal[0].kind,'move');
 state=engine.applyAction(state,legal[0]);assert.deepEqual(state.currentRoll!.remainingActions,[1]);assert.equal(state.currentRoll!.usedPoints,3);
 const jump=engine.legalActions(state);assert.equal(jump.length,1);assert.equal(jump[0].kind,'corner_jump');state=engine.applyAction(state,jump[0]);assert.equal(state.currentRoll!.usedPoints,4);assert.deepEqual(state.currentRoll!.remainingActions,[]);
});
for(const owner of [1,2,3,4] as Player[])test(`06.1 P${owner}: optional capture and automatic landing capture`,()=>{
 const other=(owner%4+1) as Player,start=geometry.starts[owner];let base=position(owner);
 track(base,`P${owner}-1`,cell(start+1),1);track(base,`P${other}-1`,cell(start+3),0);
 const state=engine.roll(base,[2,4]),legal=engine.legalActions(state),capture=legal.find(a=>a.pieceId===`P${owner}-1`&&a.captureIds.length)!;
 assert.ok(capture);const ordinary=legal.find(a=>a.pieceId===`P${owner}-2`&&!a.captureIds.length)!;assert.ok(ordinary);
 assert.equal(engine.applyAction(state,ordinary).pieces.find(p=>p.id===`P${other}-1`)!.status,'track');
 const victim=engine.applyAction(state,capture).pieces.find(p=>p.id===`P${other}-1`)!;assert.equal(victim.status,'reserve');assert.equal(victim.position,null);assert.equal(victim.outerSteps,0);
});
