import {getLocale,t} from './i18n';
import en from '../../../docs/i18n/rules/en.md?raw';
import ru from '../../../docs/i18n/rules/ru.md?raw';
import es from '../../../docs/i18n/rules/es.md?raw';
import ptBR from '../../../docs/i18n/rules/pt-BR.md?raw';
import de from '../../../docs/i18n/rules/de.md?raw';
import uk from '../../../docs/i18n/rules/uk.md?raw';
import fr from '../../../docs/i18n/rules/fr.md?raw';
import tr from '../../../docs/i18n/rules/tr.md?raw';
import uzLatn from '../../../docs/i18n/rules/uz-Latn.md?raw';
const rules={en,ru,es,'pt-BR':ptBR,de,uk,fr,tr,'uz-Latn':uzLatn};
export default function RulesContent(){return <section className="full-rules"><p className="rules-review">{t('game.rulesDraft')}</p><div className="rules-text">{rules[getLocale()]}</div></section>;}
