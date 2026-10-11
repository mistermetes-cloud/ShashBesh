import type {Action,GameState,Geometry} from '../packages/shared/src/index';
import {trackId} from '../packages/engine/src/geometry';
/** Independent reference search under the recorded v1 policies. Uses no Engine candidate/execute/search function. */
export function referenceMaximum(g:Geometry,start:GameState){
 if(start.rulePolicy.cornerPriority!=='per-unit')throw Error('Archived per-unit reference cannot validate the corrected policy; use independent corner assertions');
 const actor=start.activePlayer;const memo=new Map<string,number>();
 function candidates(s:GameState,v:number):Action[]{
  const own=s.pieces.filter(p=>p.owner===actor&&p.status!=='finished'),occupied=new Map(s.pieces.filter(p=>p.position).map(p=>[p.position,p]));
  const make=(id:string,kind:Action['kind'],from:string|null,path:string[]):Action|null=>{if(path.some(cell=>occupied.get(cell)?.owner===actor))return null;const to=path.at(-1)!,target=occupied.get(to);return {pieceId:id,kind,value:v,from,to,path,captureIds:target?[target.id]:[]};};
  if(v===1){const jumps=own.filter(p=>p.status==='track'&&g.corners.includes(Number(p.position!.slice(1)))).map(p=>make(p.id,'corner_jump',p.position,[trackId((Number(p.position!.slice(1))+11)%48+1)])).filter((a):a is Action=>!!a);if(jumps.length)return jumps;}
  const result:Action[]=[];
  for(const p of own){if(p.status==='reserve'){if(v===6){const a=make(p.id,'deploy',null,[trackId(g.starts[actor])]);if(a)result.push(a);}continue;}
   let pos=p.position!,progress=p.outerSteps,h=p.homeIndex;const path:string[]=[];let valid=true;
   for(let i=0;i<v;i++){if(h!==null){h++;if(h>4){valid=false;break;}pos=g.homes[actor][h];}else{pos=trackId(Number(pos.slice(1))%48+1);progress++;if(pos===trackId(g.starts[actor])&&progress>=48)h=0;}path.push(pos);}
   if(valid){const a=make(p.id,'move',p.position,path);if(a)result.push(a);}
  }return result;
 }
 function execute(s:GameState,a:Action){const n={...s,pieces:s.pieces.map(p=>({...p})),currentRoll:{...s.currentRoll!,remainingActions:[...s.currentRoll!.remainingActions]}};const p=n.pieces.find(p=>p.id===a.pieceId)!;
  for(const id of a.captureIds)Object.assign(n.pieces.find(p=>p.id===id)!,{status:'reserve',position:null,outerSteps:0,homeIndex:null,finishedSlot:null});
  if(a.kind==='deploy')Object.assign(p,{status:'track',position:a.to,outerSteps:0,homeIndex:null,finishedSlot:null});else if(a.kind==='corner_jump'){p.position=a.to;p.outerSteps+=12;}else{for(const cell of a.path){if(p.homeIndex!==null)p.homeIndex++;else{p.outerSteps++;if(cell===g.homes[actor][0]&&p.outerSteps>=48)p.homeIndex=0;}p.position=cell;}p.status=p.homeIndex===null?'track':'home';}
  for(let i=4;i>=0;i--){const q=n.pieces.find(q=>q.owner===actor&&q.position===g.homes[actor][i]&&q.homeIndex===i);if(!q)break;q.status='finished';q.finishedSlot=i;}
  if(n.pieces.filter(p=>p.owner===actor&&p.status==='finished').length===5)n.winner=actor;
  n.currentRoll.remainingActions.splice(n.currentRoll.remainingActions.indexOf(a.value),1);return n;
 }
 function score(s:GameState):number{if(s.winner)return 0;const key=s.pieces.map(p=>[p.owner,p.status,p.position,p.outerSteps,p.homeIndex].join(':')).sort().join(';')+'|'+s.currentRoll!.remainingActions.slice().sort().join(',');const old=memo.get(key);if(old!==undefined)return old;let best=0;for(const v of new Set(s.currentRoll!.remainingActions))for(const a of candidates(s,v))best=Math.max(best,v+score(execute(s,a)));memo.set(key,best);return best;}
 const maximum=score(start),legal:Action[]=[];for(const v of new Set(start.currentRoll!.remainingActions))for(const a of candidates(start,v))if(v+score(execute(start,a))===maximum)legal.push(a);return {maximum,legal};
}
