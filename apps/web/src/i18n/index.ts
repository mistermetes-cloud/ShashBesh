import {useSyncExternalStore} from 'react';
import en from './en.json';
import ru from './ru.json';
import es from './es.json';
import ptBR from './pt-BR.json';
import de from './de.json';
import uk from './uk.json';
import fr from './fr.json';
import tr from './tr.json';
import uzLatn from './uz-Latn.json';

export const locales = ['en','ru','es','pt-BR','de','uk','fr','tr','uz-Latn'] as const;
export type Locale = typeof locales[number];
export type MessageKey = keyof typeof en;
export const dictionaries: Record<Locale, Record<MessageKey,string>> = {en,ru,es,'pt-BR':ptBR,de,uk,fr,tr,'uz-Latn':uzLatn};
export const languageNames: Record<Locale,string> = {en:'English',ru:'Русский',es:'Español','pt-BR':'Português (Brasil)',de:'Deutsch',uk:'Українська',fr:'Français',tr:'Türkçe','uz-Latn':'Oʻzbekcha'};
export const LANGUAGE_STORAGE_KEY = 'shashbesh-language';
export function matchLocale(value: string | null | undefined): Locale | undefined {
    const tag=value?.replaceAll('_','-').toLowerCase();
    if(tag==='uz'||tag?.startsWith('uz-latn')||tag==='uz-uz')return 'uz-Latn';
    if(tag?.split('-')[0]==='pt')return 'pt-BR';
    return locales.find(locale=>locale.toLowerCase()===tag) ?? locales.find(locale=>locale===tag?.split('-')[0]);
}
export function detectLocale(saved?:string|null, platform?:string, browser:readonly string[]=[]):Locale {
    return matchLocale(saved) ?? matchLocale(platform) ?? browser.map(matchLocale).find(Boolean) ?? 'en';
}
let current:Locale='en';
const listeners=new Set<()=>void>();
export const getLocale=()=>current;
export function setLocale(locale:Locale,persist=true) {
    if(!locales.includes(locale))return;
    current=locale;
    if(typeof document!=='undefined'){document.documentElement.lang=locale;document.title=t('ui.shashbesh');}
    if(persist)try{localStorage.setItem(LANGUAGE_STORAGE_KEY,locale);}catch{/* Private mode still supports in-memory selection. */}
    listeners.forEach(listener=>listener());
}
export function initializeLocale(platformLanguage?:string) {
    let saved:string|null=null;try{saved=localStorage.getItem(LANGUAGE_STORAGE_KEY);}catch{}
    setLocale(detectLocale(saved,platformLanguage,typeof navigator==='undefined'?[]:navigator.languages),false);
}
export function useLocale(){return useSyncExternalStore(listener=>{listeners.add(listener);return()=>{listeners.delete(listener);};},getLocale,()=> 'en' as Locale);}
const numbers=new Map<Locale,Intl.NumberFormat>();
const plurals=new Map<Locale,Intl.PluralRules>();
export function formatNumber(value:number,locale:Locale=current){
    if(!numbers.has(locale))numbers.set(locale,new Intl.NumberFormat(locale));
    return numbers.get(locale)!.format(value);
}
export function translate(locale:Locale,key:MessageKey,values:Record<string,string|number|null|undefined>={}):string {
    const message=dictionaries[locale]?.[key]||en[key]||en['game.error'];
    return message.replace(/\{(\w+)\}/g,(_,name:string)=>typeof values[name]==='number'?formatNumber(values[name],locale):String(values[name]??''));
}
export function t(key:MessageKey,values:Record<string,string|number|null|undefined>={}){return translate(current,key,values);}
export function plural(key:'actions'|'players',count:number,locale:Locale=current){
    if(!plurals.has(locale))plurals.set(locale,new Intl.PluralRules(locale));
    const category=plurals.get(locale)!.select(count);
    const candidate=`game.${key}.${category}` as MessageKey;
    return translate(locale,candidate in en?candidate:`game.${key}.other`,{count});
}
