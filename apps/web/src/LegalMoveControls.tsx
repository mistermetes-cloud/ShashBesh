import type {Action} from '../../../packages/shared/src/index';
import {t,plural} from './i18n';
import {actionText} from './gameText';
/** Touch alternatives use the exact Core mask; no new move calculation. */
export function LegalMoveControls({actions,chosenPiece,onPiece,onAction}:{actions:Action[];chosenPiece:string|null;onPiece:(id:string)=>void;onAction:(action:Action)=>void}){
    const pieces=[...new Set(actions.map(action=>action.pieceId))];
    if(!pieces.length)return null;
    return <details className="touch-moves"><summary>{plural('actions',actions.length)}</summary><div className="touch-piece-list" aria-label={t('game.choosePiece')}>{pieces.map(id=><button key={id} aria-pressed={chosenPiece===id} onClick={()=>onPiece(id)}>{t('game.piece',{id})}</button>)}</div>{chosenPiece&&<div className="touch-action-list">{actions.filter(action=>action.pieceId===chosenPiece).map((action,index)=><button key={index} onClick={()=>onAction(action)}>{actionText(action)}</button>)}</div>}</details>;
}
