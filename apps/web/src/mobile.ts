import type { Action, Player } from '../../../packages/shared/src/index';
import type { Controllers } from '../../../packages/agents/src/index';
export const playerColors: Record<Player, string> = {1:'Оранжевый',2:'Зелёный',3:'Сиреневый',4:'Розовый'};
export function mobileControllers(count: number, opponent: 'computer'|'human'): Controllers {
    return Object.fromEntries(Array.from({length:count},(_,i)=>[i+1,i===0 || opponent==='human' ? 'human' : 'tactical'])) as Controllers;
}
export function pieceActions(actions: Action[], piece: string | null) {
    return piece ? actions.filter(action => action.pieceId === piece) : [];
}
export const pipPositions: Record<number, number[]> = {0:[],1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
