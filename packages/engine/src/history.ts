import { Engine } from './index';
import { activeEvents, logicalTime } from './audit';
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
    const init = events[0].payload as {
        players: GameState['players'];
        gameId: string;
        seedMetadata: string | null;
        rulePolicy: GameState['rulePolicy'];
        participants?: Parameters<Engine['create']>[4];
    };
    const walker = new Engine(engine.geometry, { journalVersion: events[0].journalVersion === 2 ? 2 : 1, timeSource: events[0].timeSource ?? 'logical', clock: (id, seq) => events[seq]?.timestamp ?? logicalTime(id, seq) });
    let state = walker.create(init.players, init.gameId, init.seedMetadata, init.rulePolicy, init.participants);
    const active = new Set(activeEvents(events).map(e => e.seq)), rows: ActionHistory[] = [];
    while (state.eventLog.length < events.length) {
        const e = events[state.eventLog.length];
        switch (e.type) {
            case 'initial_roll':
                state = walker.initialRoll(state, (e.payload as any).values);
                break;
            case 'dice_roll':
                state = walker.roll(state, (e.payload as any).dice);
                break;
            case 'action': {
                const before = state, dice = [...state.currentRoll!.dice] as [
                    number,
                    number
                ];
                state = walker.applyAction(state, e.payload as Action, e.decisionMaker);
                rows.push({ seq: e.seq, eventId: e.eventId ?? `${e.gameId}:${e.seq}`, actor: e.actor!, dice, before, after: state, action: e.payload as Action, timestamp: e.timestamp ?? null, undone: !active.has(e.seq) });
                break;
            }
            case 'undo_action':
                state = walker.undoAction(state, e.actor!, e.decisionMaker!);
                break;
            case 'roll_finished':
                state = walker.finishRoll(state, e.decisionMaker);
                break;
            default: throw Error(`Unsupported history command ${e.type}`);
        }
    }
    return rows;
}
