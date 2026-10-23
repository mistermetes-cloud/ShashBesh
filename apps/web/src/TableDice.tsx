import {t} from './i18n';
import {colorName} from './gameText';
import type { GameState } from '../../../packages/shared/src/index';
import { dicePresentation } from './presentation';
import { pipPositions } from './mobile';
export function DiceFace({value,active=false,units=0,selected=false}:{value:number;active?:boolean;units?:number;selected?:boolean}) {
    return <span role="img" aria-label={t("ui.die.93",{v0: value || t("ui.not.rolled")})} className={`table-die ${active?'available-die':'spent-die'} ${selected?'selected-die':''}`} data-selected={selected} data-value={value || ''} data-active={active}>
        <svg viewBox="0 0 32 32" aria-hidden="true">{pipPositions[value].map(position=><circle key={position} cx={8+position%3*8} cy={8+Math.floor(position/3)*8} r="2.6"/>)}</svg>
        {units>1 && <i className="double-mark" aria-hidden="true">••</i>}
    </span>;
}
export function TableDice({state,canTap,onTap,selectedValue}:{state:GameState;canTap:boolean;onTap:()=>void;selectedValue?:number}) {
    const presentation=dicePresentation(state);
    // Historical dice stay in the ledger, but must never be painted as the next player's roll.
    const last=presentation.last?.actor===state.activePlayer?presentation.last:null;
    const units=last?presentation.units:[0,0],extra=!!last&&presentation.extra;
    const selectedIndex=last?.dice.findIndex((v,i)=>v===selectedValue&&units[i]>0)??-1;
    const finishing=state.phase==='resolving_roll';
    const label=state.phase==='initial_roll'?t("ui.roll.for.first.turn"):finishing?t("ui.finish.roll"):t("ui.roll.dice");
    return <div className="table-center" role="group" aria-label={`${t("ui.player.p",{v0:state.activePlayer})} · ${colorName(state.activePlayer)}`} data-active-player={state.activePlayer} style={{'--dice-color':`var(--p${state.activePlayer})`} as React.CSSProperties}>
        <button className="table-dice" aria-label={label} disabled={!canTap} onClick={onTap}>
            {(last?.dice ?? [0,0]).map((value,i)=><DiceFace key={i} value={value} selected={i===selectedIndex} active={units[i]>0} units={units[i]}/>)}
        </button>
        {extra && <span className="extra-token" aria-label={t("ui.extra.roll.entitlement")}>↻</span>}
    </div>;
}
