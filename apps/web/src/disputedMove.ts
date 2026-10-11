import {activeEvents} from '../../../packages/engine/src/index';
import type {Action,GameEvent,GameState} from '../../../packages/shared/src/index';

export interface DisputedMoveReport{
 reportType:'disputed_move';reportId:string;gameId:string;engineVersion:string;timestamp:string;
 gameState:GameState;currentPlayer:GameState['activePlayer'];dice:number[];remainingDice:number[];
 legalActions:Action[];proposedAction:Action|null;expectedAction:Action|null;expectedMove:string;userExplanation:string;recentHistory:GameEvent[];
}
export function createDisputedMoveReport(state:GameState,legal:Action[],proposed:Action|null,expected:Action|null,expectedMove:string,userExplanation:string,now=new Date()):DisputedMoveReport{
 return {reportType:'disputed_move',reportId:crypto.randomUUID(),gameId:state.gameId,engineVersion:state.rulesVersion,timestamp:now.toISOString(),gameState:structuredClone(state),currentPlayer:state.activePlayer,dice:state.currentRoll?[...state.currentRoll.dice]:[],remainingDice:state.currentRoll?[...state.currentRoll.remainingActions]:[],legalActions:structuredClone(legal),proposedAction:proposed?structuredClone(proposed):null,expectedAction:expected?structuredClone(expected):null,expectedMove,userExplanation,recentHistory:structuredClone(activeEvents(state.eventLog).slice(-20))};
}
