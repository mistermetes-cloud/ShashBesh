import {t, getLocale} from './i18n';
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
    return <section className="panel action-history"><h3>{t("ui.move.history")}</h3><div className="controls"><button onClick={onClose}>{t("ui.return.to.game")}</button>{row && <button onClick={onToggle}>{showBefore ? t("ui.show.after") : t("ui.show.before")}</button>}</div>
 {row && <p className="note">P{row.actor} {" "}{t("ui.dice")}{" "}{row.dice.join(' + ')} · {row.action.pieceId} · {row.action.from ?? t("ui.reserve")} → {row.action.to} {" "}{t("ui.captured")}{" "}{row.action.captureIds.join(', ') || t("ui.none")}{row.undone ? t("ui.undone") : ''}</p>}
 <ol>{rows.map((r, i) => <li key={r.eventId}><button className={index === i ? 'selected-history' : ''} onClick={() => onSelect(i)} aria-pressed={index === i}>#{r.seq + 1} · P{r.actor} · {r.dice.join('–')} · {r.action.pieceId}: {r.action.from ?? t("ui.reserve")} → {r.action.to}{r.undone ? t("ui.undone.40") : ''}<small>{r.timestamp ? new Date(r.timestamp).toLocaleString(getLocale()) : t("ui.logical.time")}</small></button></li>)}</ol>
 </section>;
}
