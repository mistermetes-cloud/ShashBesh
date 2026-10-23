import type {Engine} from '../../../packages/engine/src/index';
import type {Action,ControllerIdentity,GameState} from '../../../packages/shared/src/index';
/** A snapshot-bound command boundary shared by every local frontend host.
 * Core remains the only validator. RNG, persistence and transport stay with their existing owners.
 * Online sessions continue to send intents through RoomClient rather than this local facade.
 */
export function localSession(engine:Engine,state:GameState,actor:ControllerIdentity){
    return {
        snapshot:state,
        actions:()=>engine.legalActions(state),
        move:(action:Action)=>engine.applyAction(state,action,actor),
        finish:()=>engine.finishRoll(state,actor),
        undo:()=>engine.undoAction(state,state.activePlayer,actor),
    };
}

/** Idempotent automatic completion; never rolls or skips a legal action. */
export function settleLocalRoll(engine:Engine,state:GameState,actor:ControllerIdentity):GameState{
    return state.phase==='resolving_roll'&&!state.winner&&!engine.legalActions(state).length?engine.finishRoll(state,actor):state;
}
