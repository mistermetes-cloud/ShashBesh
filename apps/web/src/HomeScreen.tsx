import { NETWORK_ENABLED } from './networkFeature';
import {t, plural} from './i18n';
import {useState} from 'react';
export function HomeScreen({hasGame,onResume,onStart,onObserve}:{hasGame:boolean;onResume:()=>void;onStart:(where:'local'|'wifi',opponent:'computer'|'human',count:number)=>void;onObserve?:(count:number)=>void}) {
    const [where,setWhere]=useState<'local'|'wifi'>('local'),[opponent,setOpponent]=useState<'computer'|'human'>('computer'),[count,setCount]=useState(2);
    return <section className="home-screen" aria-label={t("ui.new.game")}>
        <div className="home-brand"><div className="home-tokens" aria-hidden="true">{[1,2,3,4].map(p=><i key={p} className={`p${p}`}/>)}</div><h1>{t("ui.shashbesh.43")}</h1><p>{t("ui.gather.around.one.board")}</p></div>
        <fieldset><legend>{t("ui.where.to.play")}</legend><div className="choice-pair"><button aria-pressed={where==='local'} onClick={()=>setWhere('local')}>{t("ui.on.this.device")}</button>{NETWORK_ENABLED&&<button aria-pressed={where==='wifi'} onClick={()=>{setWhere('wifi');setOpponent('human');}}>{t("ui.over.wi.fi")}</button>}</div></fieldset>
        <fieldset><legend>{t("ui.who.to.play.with")}</legend><div className="choice-pair"><button disabled={where==='wifi'} aria-pressed={opponent==='computer'} onClick={()=>setOpponent('computer')}>{t("ui.against.computer")}</button><button aria-pressed={opponent==='human'} onClick={()=>setOpponent('human')}>{t("ui.with.a.person")}</button></div><div className="player-count"><span>{t("ui.players")}</span>{[2,3,4].map(n=><button key={n} aria-label={plural('players',n)} aria-pressed={count===n} onClick={()=>setCount(n)}>{n}</button>)}</div>{where==='wifi' && <p className="home-note">{t("ui.play.together.on.the.same.wi.fi.network")}</p>}</fieldset>
        <button className="start-playing" onClick={()=>onStart(where,opponent,count)}>{where==='wifi'?t("ui.play.over.wi.fi"):t("ui.start.game")}</button>
        {onObserve&&<button className="quiet-button" onClick={()=>onObserve(count)}>{t("ui.watch.ai.vs.ai")}</button>}
        {hasGame && <button className="quiet-button" onClick={onResume}>{t("ui.resume.match")}</button>}
    </section>;
}
