import type { GameState } from '../../../packages/shared/src/index';
import { dicePresentation } from './presentation';
export function PlayerPanel({ state, label, controller, canRoll, onRoll }: {
    state: GameState;
    label: string;
    controller: string;
    canRoll: boolean;
    onRoll: () => void;
}) {
    const { last, units, extra } = dicePresentation(state), player = state.winner ?? state.activePlayer;
    return <div className={`turnbar player-panel panel-p${player}`} data-active-player={player}>
  <div className="player-and-dice"><div><span className="eyebrow">{label}</span><h2 className={`text-p${player}`}>{state.winner ? `Победа P${state.winner}` : state.phase === 'initial_roll' ? 'Начальный жребий' : `Игрок P${player}`}<small>{state.phase !== 'initial_roll' && !state.winner ? controller : ''}</small></h2></div>
   <div><div className="dice" aria-label="Кубики">{(last?.dice ?? [0, 0]).map((d, i) => <span key={i} data-value={d || ''} data-active={units[i] > 0} className={units[i] > 0 ? 'die-active' : 'die-used'} aria-label={`Кубик ${i + 1}: ${d || 'нет броска'}, ${units[i] > 0 ? 'доступен' : 'неактивен'}`}>{d ? '⚀⚁⚂⚃⚄⚅'[d - 1] : '—'}{last?.dice[0] === last?.dice[1] && d > 0 && <small>{units[i]}/2</small>}</span>)}</div>{last && last.actor !== state.activePlayer && <small className="dice-owner">Последний бросок P{last.actor}</small>}</div>
  </div>
  <div><button className="primary" disabled={!canRoll} onClick={onRoll}>{state.phase === 'initial_roll' ? 'Бросить жребий' : 'Бросить кубики'}</button>{extra && <p className="note extra-right">{state.phase === 'await_roll' ? 'Дополнительный бросок доступен' : 'Право дополнительного броска'}</p>}</div>
 </div>;
}
