import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AiPlayback,AI_THINK_DELAY,DICE_DELAY,STEP_DURATION,MOVE_END_DELAY,CAPTURE_ANIMATION,type AiFrame} from '../apps/web/src/aiPlayback';
import {engine,ready,track} from './helpers';
function fakeClock(){let now=0,id=0;const jobs=new Map<number,{at:number;fn:()=>void}>();return {clock:{now:()=>now,set:(fn:()=>void,ms:number)=>{jobs.set(++id,{at:now+ms,fn});return id;},clear:(id:unknown)=>{jobs.delete(id as number);}},tick:(ms:number)=>{const end=now+ms;for(;;){const first=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!first||first[1].at>end)break;now=first[1].at;jobs.delete(first[0]);first[1].fn();}now=end;}};}
function command(capture=false){const before=engine.roll(track(track(ready(),'P1-4',2,1),'P2-1',3,38),capture?[2,1]:[2,2]),action=engine.legalActions(before).find(a=>a.pieceId==='P1-4'&&a.value===(capture?1:2))!;return {before,after:engine.applyAction(before,action),action,kind:'action' as const};}
test('AI playback: requested defaults, validated result commits once before frames and ignores duplicate start',()=>{
 assert.deepEqual([AI_THINK_DELAY,DICE_DELAY,STEP_DURATION,MOVE_END_DELAY,CAPTURE_ANIMATION],[700,800,250,500,600]);const t=fakeClock(),cmd=command(),frames:(AiFrame|null)[]=[],commits:unknown[]=[];const p=new AiPlayback(s=>commits.push(s),f=>frames.push(f),t.clock);
 assert.equal(p.start(cmd,'NORMAL'),true);assert.deepEqual(commits,[cmd.after]);assert.equal(p.start(cmd,'NORMAL'),false);assert.equal(frames.at(-1)?.phase,'thinking');t.tick(699);assert.equal(frames.at(-1)?.phase,'thinking');t.tick(1);assert.equal(frames.at(-1)?.position,'М03');assert.equal(frames.at(-1)?.phase,'moving');t.tick(250);assert.equal(frames.at(-1)?.position,'М04');t.tick(250);assert.equal(frames.at(-1)?.phase,'end');t.tick(500);assert.equal(p.busy,false);assert.equal(frames.at(-1),null);assert.equal(commits.length,1);assert.equal(cmd.before.pieces.find(p=>p.id==='P2-1')!.position,'М03');
});
test('AI playback: pause preserves remaining time; speed change rescales remaining time and cannot recommit',()=>{
 const t=fakeClock();let frame:AiFrame|null=null,commits=0;const p=new AiPlayback(()=>commits++,f=>{frame=f;},t.clock);p.start(command(),'NORMAL');t.tick(350);p.pause();t.tick(9000);assert.equal(p.isPaused,true);assert.equal((frame as unknown as AiFrame).phase,'thinking');p.setSpeed('FAST');p.resume();t.tick(87);assert.equal((frame as unknown as AiFrame).phase,'thinking');t.tick(.5);assert.equal((frame as unknown as AiFrame).position,'М03');t.tick(10000);assert.equal(commits,1);assert.equal(p.busy,false);
});
test('AI playback: destination capture waits 600 ms; passing an enemy has no capture frame; cancel drops timers',()=>{
 const t=fakeClock(),phases:string[]=[];const p=new AiPlayback(()=>{},f=>{if(f)phases.push(f.phase);},t.clock);p.start(command(true),'NORMAL');t.tick(950);assert.equal(phases.at(-1),'capture');t.tick(599);assert.equal(phases.at(-1),'capture');t.tick(1);assert.equal(phases.at(-1),'end');p.cancel();const n=phases.length;t.tick(10000);assert.equal(phases.length,n);p.start(command(false),'SLOW');t.tick(10000);assert.equal(phases.filter(x=>x==='capture').length,1);
});
import {AiRollPlanner} from '../apps/web/src/aiDecisions';
import {resolveAgentRoll,type Strategy} from '../packages/agents/src/index';
import {seeded} from '../packages/engine/src/rng';
import {canonical,stateHash} from '../packages/engine/src/index';
test('AI decisions: visual action boundaries preserve original strategy sequence and RNG consumption',()=>{
 for(const strategy of ['random','greedy','tactical','ai-v0.1'] as Strategy[]){const before=engine.roll(ready(),[6,6]),a=seeded('ai-boundaries'),b=seeded('ai-boundaries');const expected=resolveAgentRoll(engine,before,strategy,a),planner=new AiRollPlanner(engine,()=>b);let actual=before;while(actual.phase==='resolving_roll'&&engine.legalActions(actual).length)actual=planner.next(actual,strategy).after;assert.equal(stateHash(actual),stateHash(expected));assert.equal(b.next(),a.next());}
});
test('AI decisions: serialized remaining plan survives reload without an extra random draw',()=>{
 const rng=seeded('ai-restore-plan'),before=engine.roll(ready(),[6,6]),planner=new AiRollPlanner(engine,()=>rng),after=planner.next(before,'tactical').after,saved=planner.snapshot(after);assert.ok(saved);const reference=planner.next(after,'tactical');const loaded=engine.replay(after.eventLog),resumed=new AiRollPlanner(engine,()=>({next:()=>{throw Error('Unexpected new choice');},die:()=>1}));resumed.restore(saved,loaded,{1:'tactical',2:'random'});assert.equal(canonical(resumed.next(loaded,'tactical').action),canonical(reference.action));
});
