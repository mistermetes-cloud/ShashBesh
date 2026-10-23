import {t} from './i18n';
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
  <div className="player-and-dice"><div><span className="eyebrow">{label}</span><h2 className={`text-p${player}`}>{state.winner ? t("ui.p.wins",{v0: state.winner}) : state.phase === 'initial_roll' ? t("ui.opening.draw") : t("ui.player.p",{v0: player})}<small>{state.phase !== 'initial_roll' && !state.winner ? controller : ''}</small></h2></div>
   <div><div className="dice" aria-label={t("ui.dice.83")}>{(last?.dice ?? [0, 0]).map((d, i) => <span key={i} data-value={d || ''} data-active={units[i] > 0} className={units[i] > 0 ? 'die-active' : 'die-used'} aria-label={t("ui.die.84",{v0: i + 1,v1: d || t("ui.not.rolled"),v2: units[i] > 0 ? t("ui.available") : t("ui.inactive")})}>{d ? '⚀⚁⚂⚃⚄⚅'[d - 1] : '—'}{last?.dice[0] === last?.dice[1] && d > 0 && <small>{units[i]}/2</small>}</span>)}</div>{last && last.actor !== state.activePlayer && <small className="dice-owner">{t("ui.last.roll.p")}{last.actor}</small>}</div>
  </div>
  <div><button className="primary" disabled={!canRoll} onClick={onRoll}>{state.phase === 'initial_roll' ? t("ui.roll.for.first.turn") : t("ui.roll.dice")}</button>{extra && <p className="note extra-right">{state.phase === 'await_roll' ? t("ui.extra.roll.available") : t("ui.extra.roll.entitlement")}</p>}</div>
 </div>;
}
