import {test} from 'node:test';
import assert from 'node:assert/strict';
import {engine,ready} from './helpers';
import {activeEvents,stateHash} from '../packages/engine/src/index';
import {createDisputedMoveReport} from '../apps/web/src/disputedMove';
import {readFileSync} from 'node:fs';
import type {DisputedMoveReport} from '../apps/web/src/disputedMove';
import {AiRollPlanner} from '../apps/web/src/aiDecisions';
import {seeded} from '../packages/engine/src/rng';
import type {Strategy} from '../packages/agents/src/index';

test('reported 5–5: both М07 and М32 pieces remain legal before any capture is available',()=>{
 const report=JSON.parse(readFileSync(new URL('./fixtures/corner-priority-disputed-move.json',import.meta.url),'utf8')) as DisputedMoveReport;
 const state=engine.replay(report.gameState.eventLog);
 assert.equal(stateHash(state),stateHash(report.gameState));
 assert.deepEqual(state.currentRoll!.remainingActions,[5,5,5,5]);
 assert.deepEqual(report.legalActions.map(a=>a.pieceId),['P1-3']);
 const legal=engine.legalActions(state);
 assert.deepEqual(legal.map(a=>a.pieceId).sort(),['P1-3','P1-5']);
 assert.ok(legal.every(a=>!a.jump&&a.captureIds.length===0));
 for(const a of legal){const after=engine.applyAction(state,a);engine.assertInvariants(after);assert.deepEqual(after.currentRoll!.remainingActions,[5,5,5]);}
 let approach=state;
 for(let i=0;i<3;i++)approach=engine.applyAction(approach,engine.legalActions(approach).find(a=>a.pieceId==='P1-3')!);
 const capture=engine.legalActions(approach);
 assert.equal(capture.length,1);assert.equal(capture[0].to,'М27');assert.deepEqual(capture[0].captureIds,['P2-3']);
 for(const strategy of ['random','greedy','tactical','ai-v0.1'] as Strategy[]){
  let chosenOther=false;
  for(let seed=0;seed<20;seed++){
   const a=new AiRollPlanner(engine,()=>seeded(`reported-${seed}`)).next(state,strategy).action!;
   assert.ok(legal.some(l=>JSON.stringify(l)===JSON.stringify(a)));
   assert.equal(a.kind,'move');chosenOther ||= a.pieceId==='P1-5';
  }
  if(strategy==='random')assert.ok(chosenOther,'random AI must be allowed to choose М32');
 }
});

test('Disputed move report preserves the exact engine snapshot and enough journal data to reproduce it',()=>{
 const state=engine.roll(ready(),[6,3]),legal=engine.legalActions(state),selected=legal[0];
 const report=createDisputedMoveReport(state,legal,selected,selected,'P1 uses six to leave reserve','The rejected suggestion used the wrong die.',new Date('2026-10-11T12:34:56.000Z'));
 assert.equal(report.reportType,'disputed_move');assert.ok(report.reportId);assert.equal(report.gameId,state.gameId);assert.equal(report.engineVersion,'v1');assert.equal(report.timestamp,'2026-10-11T12:34:56.000Z');
 assert.equal(stateHash(engine.replay(report.gameState.eventLog)),stateHash(report.gameState));assert.deepEqual(report.dice,[6,3]);assert.deepEqual(report.remainingDice,[6,3]);assert.deepEqual(report.legalActions,legal);assert.deepEqual(report.expectedAction,selected);assert.deepEqual(report.proposedAction,selected);assert.deepEqual(report.recentHistory,activeEvents(state.eventLog).slice(-20));
 state.pieces[0].position='М48';assert.notEqual(report.gameState.pieces[0].position,'М48');
});
