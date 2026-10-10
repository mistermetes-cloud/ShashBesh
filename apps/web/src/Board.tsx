import type { ReactNode } from 'react';
import type { Action, GameState, Geometry } from '../../../packages/shared/src/index';
export function Board({ geometry, state, actions, selected, onAction, center, physical=false, chosenPiece=null, onPiece, onDestination }: {
    geometry: Geometry;
    state: GameState;
    actions: Action[];
    selected: Action | null;
    onAction: (a: Action) => void;
    center?: ReactNode;
    physical?: boolean;
    chosenPiece?: string | null;
    onPiece?: (id: string) => void;
    onDestination?: (actions: Action[]) => void;
}) {
    return <div className={`board ${physical ? 'physical-board' : ''}`} aria-label="Игровое поле 13 на 13" data-active-player={state.activePlayer}>
  <div className="board-center">{center ?? <span>ШАШБЕШ</span>}</div>
  {physical && state.players.map(p=><div key={p} className={`reserve-pool reserve-p${p}`} aria-label={`Резерв игрока ${p}`}>{state.pieces.filter(q=>q.owner===p&&q.status==='reserve').map(piece=><button key={piece.id} className={`reserve-chip ${piece.id===chosenPiece?'chosen-piece':''} ${actions.some(a=>a.pieceId===piece.id)?'selectable-piece':''}`} data-piece={piece.id} aria-label={`Фишка ${piece.id} в резерве`} disabled={!onPiece || !actions.some(a=>a.pieceId===piece.id)} onClick={()=>onPiece?.(piece.id)}><span className={`piece p${p}`} aria-hidden="true"/></button>)}</div>)}
  {geometry.cells.map(cell => {
            const piece = state.pieces.find(p => p.position === cell.id), targets = actions.filter(a => a.to === cell.id && (!physical || a.pieceId===chosenPiece));
            const highlighted = selected?.path.includes(cell.id), start = cell.homeIndex === 0, corner = cell.outer !== null && geometry.corners.includes(cell.outer);
            return <button key={cell.id} data-cell={cell.id} data-home-owner={cell.owner ?? ''} data-piece={piece?.id} className={`cell ${start ? 'start' : ''} ${cell.owner===state.activePlayer?'active-home':''} ${piece?.id===chosenPiece?'chosen-piece':''} ${piece && actions.some(a=>a.pieceId===piece.id)?'selectable-piece':''} ${corner ? 'corner' : ''} ${highlighted ? 'path' : ''} ${selected?.from === cell.id ? 'history-from' : ''} ${selected?.to === cell.id ? 'history-to' : ''} ${targets.length ? 'target' : ''}`} style={{ gridColumn: cell.x, gridRow: cell.y, '--home': cell.owner ? `var(--p${cell.owner})` : 'transparent' } as React.CSSProperties} aria-label={`${cell.outer ?? `Дом ${cell.owner}.${cell.homeIndex! + 1}`}${piece ? `, ${piece.id}, ${piece.status === 'finished' ? 'завершена' : 'на поле'}` : ''}${targets.length ? ', доступный ход' : ''}`} onClick={() => {
                    if (physical) {
                        if (piece && actions.some(a=>a.pieceId===piece.id)) onPiece?.(piece.id);
                        else if (targets.length) onDestination?.(targets);
                        return;
                    }
                    const a = selected?.to === cell.id ? selected : targets[0];
                    if (a)
                        onAction(a);
                }}>
    <span className="cell-label">{cell.outer ?? `${cell.owner}.${cell.homeIndex! + 1}`}</span>
    {piece && <span className={`piece p${piece.owner} ${piece.status === 'finished' ? 'fixed' : ''}`} title={piece.id}>{piece.id.split('-')[1]}{piece.status === 'finished' && <small>✓</small>}</span>}
   </button>;
        })}
 </div>;
}
