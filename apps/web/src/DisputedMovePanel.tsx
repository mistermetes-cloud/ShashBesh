import {t} from './i18n';
import {useDialogFocus} from './useDialogFocus';
import {useMemo,useState} from 'react';
import type {Action,GameState} from '../../../packages/shared/src/index';
import {createDisputedMoveReport,type DisputedMoveReport} from './disputedMove';
const describe=(a:Action)=>t("ui.die",{v0: a.pieceId,v1: a.value,v2: a.from??t("ui.reserve"),v3: a.to,v4: a.kind,v5: a.captureIds.length?t("ui.capture",{v0: a.captureIds.join(',')}):''});
export function DisputedMovePanel({state,legalActions,proposedOptions,selectedAction,onSave}:{state:GameState;legalActions:Action[];proposedOptions:Action[];selectedAction:Action|null;onSave:(report:DisputedMoveReport)=>Promise<void>}){
 const [open,setOpen]=useState(false),[proposed,setProposed]=useState(selectedAction?JSON.stringify(selectedAction):''),[expected,setExpected]=useState(''),[expectedMove,setExpectedMove]=useState(''),[explanation,setExplanation]=useState(''),[saving,setSaving]=useState(false),[error,setError]=useState('');
 useDialogFocus(open,'.dispute-dialog',()=>setOpen(false));
 const proposals=useMemo(()=>[...new Map([...legalActions,...proposedOptions,...(selectedAction?[selectedAction]:[])].map(a=>[JSON.stringify(a),a])).values()],[legalActions,proposedOptions,selectedAction]);
 async function submit(){setSaving(true);setError('');try{const parse=(value:string)=>value?JSON.parse(value) as Action:null;await onSave(createDisputedMoveReport(state,legalActions,parse(proposed),parse(expected),expectedMove,explanation));setOpen(false);setProposed('');setExpected('');setExpectedMove('');setExplanation('');}catch(e){setError((e as Error).message);}finally{setSaving(false);}}
 return <><button type="button" onClick={()=>setOpen(true)}>{t("ui.disputed.move")}</button>{open&&<div className="dispute-backdrop"><section className="dispute-dialog" role="dialog" aria-modal="true" aria-labelledby="dispute-title"><h2 id="dispute-title">{t("ui.report.a.disputed.move")}</h2><p>{t("ui.a.snapshot.of.the.position.legal.actions.and.log.will.be.saved.th")}</p>
 <label>{t("ui.proposed.move")}<select aria-label={t("ui.proposed.move")} value={proposed} onChange={e=>setProposed(e.target.value)}><option value="">{t("ui.not.specified")}</option>{proposals.map(a=><option key={JSON.stringify(a)} value={JSON.stringify(a)}>{describe(a)}</option>)}</select></label>
 <label>{t("ui.expected.move")}<select aria-label={t("ui.expected.move")} value={expected} onChange={e=>setExpected(e.target.value)}><option value="">{t("ui.not.specified")}</option>{proposals.map(a=><option key={JSON.stringify(a)} value={JSON.stringify(a)}>{describe(a)}</option>)}</select></label>
 <label>{t("ui.which.move.do.you.consider.correct")}<textarea aria-label={t("ui.expected.move.description")} value={expectedMove} onChange={e=>setExpectedMove(e.target.value)} rows={2}/></label>
 <label>{t("ui.explanation")}<textarea aria-label={t("ui.explanation")} value={explanation} onChange={e=>setExplanation(e.target.value)} rows={4}/></label>
 {error&&<p role="alert">{t("ui.could.not.save.report")}{" "}{t('game.error')}</p>}<div className="controls"><button disabled={saving} onClick={()=>void submit()}>{saving?t("ui.saving"):t("ui.save.and.export.json")}</button><button disabled={saving} onClick={()=>setOpen(false)}>{t("ui.cancel")}</button></div>
 </section></div>}</>;
}
