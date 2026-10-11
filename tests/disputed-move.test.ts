import {test} from 'node:test';
import assert from 'node:assert/strict';
import {engine,ready} from './helpers';
import {activeEvents,stateHash} from '../packages/engine/src/index';
import {createDisputedMoveReport} from '../apps/web/src/disputedMove';

test('Disputed move report preserves the exact engine snapshot and enough journal data to reproduce it',()=>{
 const state=engine.roll(ready(),[6,3]),legal=engine.legalActions(state),selected=legal[0];
 const report=createDisputedMoveReport(state,legal,selected,selected,'P1 uses six to leave reserve','The rejected suggestion used the wrong die.',new Date('2026-10-11T12:34:56.000Z'));
 assert.equal(report.reportType,'disputed_move');assert.ok(report.reportId);assert.equal(report.gameId,state.gameId);assert.equal(report.engineVersion,'v1');assert.equal(report.timestamp,'2026-10-11T12:34:56.000Z');
 assert.equal(stateHash(engine.replay(report.gameState.eventLog)),stateHash(report.gameState));assert.deepEqual(report.dice,[6,3]);assert.deepEqual(report.remainingDice,[6,3]);assert.deepEqual(report.legalActions,legal);assert.deepEqual(report.expectedAction,selected);assert.deepEqual(report.proposedAction,selected);assert.deepEqual(report.recentHistory,activeEvents(state.eventLog).slice(-20));
 state.pieces[0].position='М48';assert.notEqual(report.gameState.pieces[0].position,'М48');
});
