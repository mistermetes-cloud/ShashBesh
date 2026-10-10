import type { ActionHistory } from '../../../packages/engine/src/history';
export function HistoryPanel({ rows, index, onSelect, onClose, showBefore, onToggle }: {
    rows: ActionHistory[];
    index: number;
    onSelect: (i: number) => void;
    onClose: () => void;
    showBefore: boolean;
    onToggle: () => void;
}) {
    const row = rows[index];
    return <section className="panel action-history"><h3>История действий</h3><div className="controls"><button onClick={onClose}>Вернуться к игре</button>{row && <button onClick={onToggle}>{showBefore ? 'Показать после' : 'Показать до'}</button>}</div>
 {row && <p className="note">P{row.actor} · кубики {row.dice.join(' + ')} · {row.action.pieceId} · {row.action.from ?? 'резерв'} → {row.action.to} · сбиты: {row.action.captureIds.join(', ') || 'нет'}{row.undone ? ' · отменён' : ''}</p>}
 <ol>{rows.map((r, i) => <li key={r.eventId}><button className={index === i ? 'selected-history' : ''} onClick={() => onSelect(i)} aria-pressed={index === i}>#{r.seq + 1} · P{r.actor} · {r.dice.join('–')} · {r.action.pieceId}: {r.action.from ?? 'резерв'} → {r.action.to}{r.undone ? ' (отменён)' : ''}<small>{r.timestamp ? new Date(r.timestamp).toLocaleString('ru-RU') : 'логическое время'}</small></button></li>)}</ol>
 </section>;
}
