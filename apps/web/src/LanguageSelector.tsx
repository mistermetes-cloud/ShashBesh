import {getLocale,languageNames,locales,setLocale,t,type Locale} from './i18n';
export function LanguageSelector(){
    return <label className="language-selector"><span>{t('game.language')}</span><select aria-label={t('game.language')} value={getLocale()} onChange={event=>setLocale(event.target.value as Locale)}>{locales.map(locale=><option key={locale} value={locale} lang={locale}>{languageNames[locale]}</option>)}</select></label>;
}
