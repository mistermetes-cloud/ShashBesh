import assert from 'node:assert/strict';
import type {Action,GameState,Geometry} from '../packages/shared/src/index';
import {trackId} from '../packages/engine/src/geometry';
/** Independent transition checks from RULES_V1. No engine movement/capture helper is used. */
export function checkTransition(g:Geometry,b:GameState,a:Action,n:GameState){
 const p=b.pieces.find(p=>p.id===a.pieceId)!;assert.equal(p.owner,b.activePlayer);assert.notEqual(p.status,'finished');assert.equal(a.from,p.position);
 let pos=p.position,steps=p.outerSteps,home=p.homeIndex;const path:string[]=[];
 if(a.kind==='deploy'){assert.equal(p.status,'reserve');assert.equal(a.value,6);pos=trackId(g.starts[p.owner]);steps=0;home=null;path.push(pos);}
 else if(a.jump&&b.rulePolicy.cornerPriority==='absolute'){
  assert.equal(a.kind,'corner_jump');assert.equal(a.value,1);assert.equal(p.status,'track');assert.equal(home,null);assert.ok(g.corners.includes(Number(pos!.slice(1))));const from=pos!,ray=Array.from({length:12},(_,i)=>trackId((Number(from.slice(1))+i)%48+1)),to=ray.at(-1)!;
  assert.deepEqual(a.jump,{from,to,path:ray});assert.ok(ray.every(cell=>!b.pieces.some(q=>q.owner===p.owner&&q.position===cell)),'Own piece jumped over');steps+=12;pos=to;path.push(pos);
 }
 else if(a.kind==='corner_jump'){assert.equal(a.value,1);assert.equal(p.status,'track');assert.ok(g.corners.includes(Number(pos!.slice(1))));pos=trackId((Number(pos!.slice(1))+11)%48+1);steps+=12;home=null;path.push(pos);}
 else for(let i=0;i<a.value;i++){if(home!==null){home++;assert.ok(home<=4);pos=g.homes[p.owner][home];}else{pos=trackId(Number(pos!.slice(1))%48+1);steps++;if(pos===trackId(g.starts[p.owner])&&steps>=48)home=0;}path.push(pos!);}
 if(b.rulePolicy.cornerPriority==='absolute'&&b.currentRoll!.forcedPieceId&&a.pieceId!==b.currentRoll!.forcedPieceId){
  const forced=b.pieces.find(q=>q.id===b.currentRoll!.forcedPieceId)!;const occupied=new Map(b.pieces.filter(q=>q.position).map(q=>[q.position!,q]));
  const canMove=(value:number)=>{if(forced.status==='reserve')return value===6;let q=forced.position!,homeIndex=forced.homeIndex;const cells:string[]=[];if(value===1&&forced.status==='track'&&g.corners.includes(Number(q.slice(1)))){const ray=Array.from({length:12},(_,i)=>trackId((Number(q.slice(1))+i)%48+1));if(ray.every(c=>occupied.get(c)?.owner!==forced.owner))return true;}
   for(let i=0;i<value;i++){if(homeIndex!==null){homeIndex++;if(homeIndex>4)return false;q=g.homes[forced.owner][homeIndex];}else{q=trackId(Number(q.slice(1))%48+1);cells.push(q);if(q===trackId(g.starts[forced.owner])&&forced.outerSteps+i+1>=48)homeIndex=0;}}
   return cells.every(c=>occupied.get(c)?.owner!==forced.owner)&& (homeIndex===null||cells.filter(c=>c.startsWith('Д')).every(c=>occupied.get(c)?.owner!==forced.owner));
  };
  assert.ok(!new Set(b.currentRoll!.remainingActions).size||![...new Set(b.currentRoll!.remainingActions)].some(canMove),'Transfer is allowed only when the jumper has no legal continuation');
 }
 if(b.rulePolicy.cornerPriority==='absolute')assert.equal(n.currentRoll!.forcedPieceId,a.jump?p.id:(a.pieceId===b.currentRoll!.forcedPieceId?b.currentRoll!.forcedPieceId:undefined));
 assert.deepEqual(a.path,path);assert.equal(a.to,pos);assert.ok(path.every(cell=>!b.pieces.some(q=>q.owner===p.owner&&q.position===cell)),'Own piece crossed/landed on');
 const victim=b.pieces.find(q=>q.position===pos);assert.deepEqual(a.captureIds,victim?[victim.id]:[],'Capture must be destination-only');
 const moved=n.pieces.find(q=>q.id===p.id)!;assert.equal(moved.position,pos);assert.equal(moved.outerSteps,steps);assert.equal(moved.homeIndex,home);
 for(const q of b.pieces){const after=n.pieces.find(x=>x.id===q.id)!;if(q.id===p.id)continue;if(q.id===victim?.id){assert.equal(after.status,'reserve');assert.equal(after.position,null);assert.equal(after.outerSteps,0);assert.equal(after.homeIndex,null);}else{assert.equal(after.position,q.position,'Intermediate enemy or uninvolved piece moved');assert.equal(after.outerSteps,q.outerSteps);}}
 const remaining=[...b.currentRoll!.remainingActions];const index=remaining.indexOf(a.value);assert.ok(index>=0);remaining.splice(index,1);assert.deepEqual(n.currentRoll!.remainingActions,remaining);assert.equal(n.currentRoll!.usedPoints,b.currentRoll!.usedPoints+a.value);assert.equal(n.activePlayer,b.activePlayer);
 for(const owner of n.players){const tail:number[]=[];for(let i=4;i>=0;i--){if(!n.pieces.some(q=>q.owner===owner&&q.position===g.homes[owner][i]&&q.homeIndex===i))break;tail.push(i);}for(const q of n.pieces.filter(q=>q.owner===owner)){assert.equal(q.status==='finished',q.homeIndex!==null&&tail.includes(q.homeIndex),'contiguous-tail policy');}}
 const won=n.pieces.filter(q=>q.owner===p.owner&&q.status==='finished').length===5;assert.equal(n.winner,won?p.owner:null);assert.equal(n.phase,won?'game_over':'resolving_roll');
}
export function checkFinish(b:GameState,n:GameState){assert.equal(n.activePlayer,b.currentRoll!.extraRoll?b.activePlayer:b.turnOrder[(b.turnOrder.indexOf(b.activePlayer)+1)%b.turnOrder.length]);assert.equal(n.phase,'await_roll');assert.equal(n.currentRoll,null);}
