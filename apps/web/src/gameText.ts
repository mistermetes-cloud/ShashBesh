import type {Action,Player} from '../../../packages/shared/src/index';
import type {AiFrame} from './aiPlayback';
import {t,formatNumber} from './i18n';
export const colorName=(player:Player)=>t(`game.color${player}`);
export const cellName=(id:string|null)=>id===null?t('ui.reserve'):id.startsWith('М')?formatNumber(Number(id.slice(1))):id;
export function actionText(action:Action){return t('game.move',{
    kind:t(action.kind==='corner_jump'?'game.jump':action.kind==='deploy'?'game.deploy':'game.moveKind'),
    value:action.value,from:cellName(action.from),to:cellName(action.to),capture:action.captureIds.length?t('game.capture'):'',
});}
export function localizedFrameHint(frame:AiFrame){
    const action=frame.command.action;
    if(frame.phase==='extra')return t('ui.extra.roll');
    if(frame.phase==='dice')return t('game.aiDice');
    if(!action)return t('game.aiFinished');
    const status=frame.phase==='thinking'?t('game.aiSelected'):frame.phase==='capture'?t('game.aiCapture'):frame.phase==='end'?t('game.aiEnd'):(frame.phase==='jumping'?t('game.jump')+' · ':'')+`${cellName(frame.from)} → ${cellName(frame.position)}`;
    return t('game.aiFrame',{piece:action.pieceId,value:action.value,status});
}
