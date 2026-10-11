import {useEffect,useRef,useState} from 'react';
import type {GameState} from '../../../packages/shared/src/index';
import {AiPlayback,speedName,type AiFrame} from './aiPlayback';
export function useAiPlayback(commit:(state:GameState)=>void,enabled:boolean,speed:number){
 const commitRef=useRef(commit);commitRef.current=commit;const [frame,setFrame]=useState<AiFrame|null>(null);const controller=useRef<AiPlayback|null>(null);if(!controller.current)controller.current=new AiPlayback(s=>commitRef.current(s),setFrame);
 useEffect(()=>{if(enabled)controller.current!.resume();else controller.current!.pause();},[enabled]);
 useEffect(()=>controller.current!.setSpeed(speedName(speed)),[speed]);
 useEffect(()=>()=>controller.current!.cancel(),[]);
 return {frame,controller:controller.current,busy:!!frame};
}
