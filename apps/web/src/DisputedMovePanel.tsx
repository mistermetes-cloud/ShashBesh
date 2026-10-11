import {useMemo,useState} from 'react';
import type {Action,GameState} from '../../../packages/shared/src/index';
import {createDisputedMoveReport,type DisputedMoveReport} from './disputedMove';
const describe=(a:Action)=>`${a.pieceId} · кубик ${a.value} · ${a.from??'резерв'} → ${a.to} · ${a.kind}${a.captureIds.length?` · взятие ${a.captureIds.join(',')}`:''}`;
export function DisputedMovePanel({state,legalActions,proposedOptions,selectedAction,onSave}:{state:GameState;legalActions:Action[];proposedOptions:Action[];selectedAction:Action|null;onSave:(report:DisputedMoveReport)=>Promise<void>}){
 const [open,setOpen]=useState(false),[proposed,setProposed]=useState(selectedAction?JSON.stringify(selectedAction):''),[expected,setExpected]=useState(''),[expectedMove,setExpectedMove]=useState(''),[explanation,setExplanation]=useState(''),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const proposals=useMemo(()=>[...new Map([...legalActions,...proposedOptions,...(selectedAction?[selectedAction]:[])].map(a=>[JSON.stringify(a),a])).values()],[legalActions,proposedOptions,selectedAction]);
 async function submit(){setSaving(true);setError('');try{const parse=(value:string)=>value?JSON.parse(value) as Action:null;await onSave(createDisputedMoveReport(state,legalActions,parse(proposed),parse(expected),expectedMove,explanation));setOpen(false);setProposed('');setExpected('');setExpectedMove('');setExplanation('');}catch(e){setError((e as Error).message);}finally{setSaving(false);}}
 return <><button type="button" onClick={()=>setOpen(true)}>Спорный ход</button>{open&&<div className="dispute-backdrop"><section className="dispute-dialog" role="dialog" aria-modal="true" aria-labelledby="dispute-title"><h2 id="dispute-title">Сообщить о спорном ходе</h2><p>Будет сохранён снимок текущей позиции, доступных действий и журнала. Отчёт не меняет правила игры.</p>
 <label>Предложенный ход<select aria-label="Предложенный ход" value={proposed} onChange={e=>setProposed(e.target.value)}><option value="">Не указан</option>{proposals.map(a=><option key={JSON.stringify(a)} value={JSON.stringify(a)}>{describe(a)}</option>)}</select></label>
 <label>Ожидаемый ход<select aria-label="Ожидаемый ход" value={expected} onChange={e=>setExpected(e.target.value)}><option value="">Не указан</option>{proposals.map(a=><option key={JSON.stringify(a)} value={JSON.stringify(a)}>{describe(a)}</option>)}</select></label>
 <label>Какой ход считаете правильным?<textarea aria-label="Описание ожидаемого хода" value={expectedMove} onChange={e=>setExpectedMove(e.target.value)} rows={2}/></label>
 <label>Пояснение<textarea aria-label="Пояснение" value={explanation} onChange={e=>setExplanation(e.target.value)} rows={4}/></label>
 {error&&<p role="alert">Не удалось сохранить отчёт: {error}</p>}<div className="controls"><button disabled={saving} onClick={()=>void submit()}>{saving?'Сохранение…':'Сохранить и экспортировать JSON'}</button><button disabled={saving} onClick={()=>setOpen(false)}>Отмена</button></div>
 </section></div>}</>;
}
