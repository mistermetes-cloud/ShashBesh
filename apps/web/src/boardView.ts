import type {Geometry,Player} from '../../../packages/shared/src/index';
export type QuarterTurn=0|1|2|3;
export function projectPoint(x:number,y:number,turn:QuarterTurn){
    for(let i=0;i<turn;i++) [x,y]=[14-y,x];
    return {x,y};
}
export function unprojectPoint(x:number,y:number,turn:QuarterTurn){return projectPoint(x,y,((4-turn)%4) as QuarterTurn);}
export function viewerRotation(geometry:Geometry,viewer:Player|null):QuarterTurn{
    if(!viewer)return 0;
    const home=geometry.cells.find(c=>c.id===geometry.homes[viewer][0])!;
    return ([0,1,2,3] as QuarterTurn[]).find(turn=>projectPoint(home.x,home.y,turn).y===13)!;
}
export function reserveSide(geometry:Geometry,player:Player,turn:QuarterTurn){
    const home=geometry.cells.find(c=>c.id===geometry.homes[player][0])!;
    const {x,y}=projectPoint(home.x,home.y,turn);
    return y===1?'top':y===13?'bottom':x===1?'left':'right';
}
