import type {Action,GameState} from '../../../packages/shared/src/index';
export const AI_THINK_DELAY=700,DICE_DELAY=800,STEP_DURATION=250,MOVE_END_DELAY=500,CAPTURE_ANIMATION=600;
export type AiSpeed='FAST'|'NORMAL'|'SLOW';
export const SPEED_VALUE:Record<AiSpeed,number>={FAST:175,NORMAL:700,SLOW:1400};
export const speedName=(value:number):AiSpeed=>value<=175?'FAST':value>=1000?'SLOW':'NORMAL';
export interface AiCommand{before:GameState;after:GameState;action:Action|null;kind:'roll'|'action'|'finish'|'initial';}
export interface AiFrame{command:AiCommand;phase:'thinking'|'dice'|'moving'|'jumping'|'capture'|'end'|'extra';position:string|null;from:string|null;step:number;duration:number;paused:boolean;}
interface Clock{now:()=>number;set:(fn:()=>void,ms:number)=>unknown;clear:(id:unknown)=>void;}
const clock:Clock={now:()=>performance.now(),set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id as ReturnType<typeof setTimeout>)};
/** Presentation-only transaction queue. Receives an already validated result; never invokes the engine or an agent. */
export class AiPlayback{
 private frames:Omit<AiFrame,'paused'|'duration'>[]=[];private index=0;private timer:unknown=null;private startTime=0;private remaining=0;private multiplier=1;private paused=false;private frameId=0;
 constructor(private readonly commit:(s:GameState)=>void,private readonly show:(f:AiFrame|null)=>void,private readonly timing:Clock=clock){}
 get busy(){return this.frames.length>0;}get isPaused(){return this.paused;}
 start(command:AiCommand,speed:AiSpeed){if(this.busy)return false;this.multiplier=speed==='FAST'?.25:speed==='SLOW'?2:1;this.index=0;this.paused=false;
 const {action:a}=command,base={command,position:a?.from??null,from:a?.from??null,step:-1};
 if(a){this.frames.push({...base,phase:'thinking'});const cells=a.jump?[...a.path.slice(0,-1).map(position=>({position,phase:'moving' as const})),...a.jump.path.map(position=>({position,phase:'jumping' as const}))]:a.path.map(position=>({position,phase:'moving' as const}));cells.forEach(({position,phase},step)=>this.frames.push({...base,phase,position,from:step?cells[step-1].position:a.from,step}));if(a.captureIds.length)this.frames.push({...base,phase:'capture',position:a.to,from:a.to,step:cells.length});this.frames.push({...base,phase:'end',position:a.to,from:a.to,step:cells.length+1});}
 else this.frames.push({...base,phase:command.kind==='finish'&&command.after.eventLog.at(-1)?.type==='extra_roll'?'extra':command.kind==='finish'?'end':'dice'});
 // Commit once, before the first frame. Persistence/reload sees the authoritative result; board frames retain the before-snapshot.
 try{this.commit(command.after);}catch(e){this.cancel();throw e;}this.remaining=this.duration();this.publish();this.schedule();return true;}
 private duration(){const phase=this.frames[this.index]?.phase;return (phase==='thinking'?AI_THINK_DELAY:(phase==='moving'||phase==='jumping')?STEP_DURATION:phase==='capture'?CAPTURE_ANIMATION:phase==='dice'?DICE_DELAY:MOVE_END_DELAY)*this.multiplier;}
 private publish(){const f=this.frames[this.index];this.show(f?{...f,duration:this.duration(),paused:this.paused}:null);}
 private schedule(){if(!this.busy||this.paused)return;this.startTime=this.timing.now();const id=++this.frameId;this.timer=this.timing.set(()=>{if(id!==this.frameId||this.paused)return;this.timer=null;this.index++;if(this.index===this.frames.length){this.frames=[];this.show(null);return;}this.remaining=this.duration();this.publish();this.schedule();},this.remaining);}
 pause(){if(!this.busy||this.paused)return;this.remaining=Math.max(0,this.remaining-(this.timing.now()-this.startTime));this.clearTimer();this.paused=true;this.publish();}
 resume(){if(!this.busy||!this.paused)return;this.paused=false;this.publish();this.schedule();}
 setSpeed(speed:AiSpeed){const next=speed==='FAST'?.25:speed==='SLOW'?2:1;if(this.busy){if(!this.paused)this.remaining=Math.max(0,this.remaining-(this.timing.now()-this.startTime));this.clearTimer();this.remaining=this.remaining/this.multiplier*next;}this.multiplier=next;if(this.busy){this.publish();this.schedule();}}
 cancel(){this.clearTimer();this.frames=[];this.paused=false;this.show(null);}
 private clearTimer(){this.frameId++;if(this.timer!==null)this.timing.clear(this.timer);this.timer=null;}
}
export function frameHint(frame:AiFrame){const a=frame.command.action;if(frame.phase==='extra')return 'Дополнительный бросок';if(frame.phase==='dice')return 'ИИ бросает кубики';if(!a)return 'Бросок завершён';const cell=(id:string|null)=>id?.startsWith('М')?String(Number(id.slice(1))):id??'резерв';return `${a.pieceId} · кубик ${a.value} · ${frame.phase==='thinking'?'фишка выбрана':frame.phase==='capture'?'сбитие соперника':frame.phase==='end'?'ход завершён':frame.phase==='jumping'?`обязательный прыжок ${cell(a.jump?.from??null)} → ${cell(a.jump?.to??null)} · клетка ${cell(frame.position)}`:`${cell(frame.from)} → ${cell(frame.position)}`}`;}
