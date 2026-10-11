import type { Engine } from './index';
import { activeEvents } from './audit';
import type { GameState, GameEvent, Action } from '../../shared/src/index';
export interface ActionHistory {
    seq: number;
    eventId: string;
    actor: number;
    dice: [
        number,
        number
    ];
    before: GameState;
    after: GameState;
    action: Action;
    timestamp: string | null;
    undone: boolean;
}
/** Builds snapshots by deterministic command replay. It never mutates the current party. */
export function actionHistory(engine: Engine, events: GameEvent[]): ActionHistory[] {
    if (!events.length)
        return [];
    const active=new Set(activeEvents(events).map(e=>e.seq)),rows:ActionHistory[]=[];
    engine.replay(events,(before,after,e)=>{if(e.type==='action')rows.push({seq:e.seq,eventId:e.eventId??`${e.gameId}:${e.seq}`,actor:e.actor!,dice:[...before.currentRoll!.dice],before,after,action:e.payload as Action,timestamp:e.timestamp??null,undone:!active.has(e.seq)});});
    return rows;
}
