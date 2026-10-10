import type { GameState, GameEvent, Player, Action } from '../../../packages/shared/src/index';
import { activeEvents } from '../../../packages/engine/src/audit';
export const effectiveEvents = activeEvents;
export function dicePresentation(state: GameState) {
    const ledger: Partial<Record<Player, {
        dice: [
            number,
            number
        ];
        actor: Player;
        rollId: number;
        extra: boolean;
    }>> = {};
    let last: NonNullable<typeof ledger[Player]> | null = null;
    for (const e of effectiveEvents(state.eventLog))
        if (e.type === 'dice_roll' && e.actor) {
            const dice = (e.payload as {
                dice: [
                    number,
                    number
                ];
            }).dice;
            last = { dice: [...dice], actor: e.actor, rollId: e.rollId!, extra: dice[0] === dice[1] || dice[0] + dice[1] === 11 };
            ledger[e.actor] = last;
        }
    const live = !!last && state.phase === 'resolving_roll' && state.currentRoll?.id === last.rollId;
    const remaining = live ? state.currentRoll!.remainingActions : [];
    const units = last ? last.dice[0] === last.dice[1] ? [Math.max(0, remaining.length - 2), Math.min(2, remaining.length)] : last.dice.map(d => remaining.includes(d) ? 1 : 0) : [0, 0];
    const extra = !!last && last.actor === state.activePlayer && last.extra && !state.winner && (state.phase === 'resolving_roll' || state.phase === 'await_roll' && effectiveEvents(state.eventLog).at(-1)?.type === 'extra_roll');
    return { ledger, last, units, extra };
}
