import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mobileControllers,pieceActions,pipPositions} from '../apps/web/src/mobile';
import {engine} from './helpers';
test('Mobile setup: 2–4 human players or a human against confirmed Tactical',()=>{
    for(const count of [2,3,4]){
        const humans=mobileControllers(count,'human'),computers=mobileControllers(count,'computer');
        assert.equal(Object.keys(humans).length,count);assert.ok(Object.values(humans).every(c=>c==='human'));
        assert.equal(computers[1],'human');assert.ok(Object.values(computers).slice(1).every(c=>c==='tactical'));
    }
});
test('Mobile piece selection preserves the engine maximal legal mask and actual dice pips',()=>{
    let state=engine.create([1,2],'mobile-mask',null);state=engine.initialRoll(state,{1:6,2:2});state=engine.roll(state,[6,3]);
    const legal=engine.legalActions(state),copy=JSON.stringify(legal),piece=legal[0].pieceId;
    assert.equal(pieceActions(legal,null).length,0);assert.equal(pieceActions(legal,'foreign').length,0);
    assert.ok(pieceActions(legal,piece).every(a=>a.pieceId===piece&&legal.includes(a)));
    assert.equal(JSON.stringify(legal),copy);
    for(let die=0;die<=6;die++){assert.equal(pipPositions[die].length,die);assert.equal(new Set(pipPositions[die]).size,die);}
});
