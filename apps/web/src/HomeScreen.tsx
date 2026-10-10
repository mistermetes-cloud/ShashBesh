import {useState} from 'react';
export function HomeScreen({hasGame,onResume,onStart}:{hasGame:boolean;onResume:()=>void;onStart:(where:'local'|'wifi',opponent:'computer'|'human',count:number)=>void}) {
    const [where,setWhere]=useState<'local'|'wifi'>('local'),[opponent,setOpponent]=useState<'computer'|'human'>('computer'),[count,setCount]=useState(2);
    return <section className="home-screen" aria-label="Новая игра">
        <div className="home-brand"><div className="home-tokens" aria-hidden="true">{[1,2,3,4].map(p=><i key={p} className={`p${p}`}/>)}</div><h1>Шашбеш</h1><p>Соберитесь за одним полем</p></div>
        <fieldset><legend>ГДЕ ИГРАТЬ</legend><div className="choice-pair"><button aria-pressed={where==='local'} onClick={()=>setWhere('local')}>На этом устройстве</button><button aria-pressed={where==='wifi'} onClick={()=>{setWhere('wifi');setOpponent('human');}}>По Wi-Fi</button></div></fieldset>
        <fieldset><legend>С КЕМ ИГРАТЬ</legend><div className="choice-pair"><button disabled={where==='wifi'} aria-pressed={opponent==='computer'} onClick={()=>setOpponent('computer')}>С компьютером</button><button aria-pressed={opponent==='human'} onClick={()=>setOpponent('human')}>С человеком</button></div><div className="player-count"><span>Игроков</span>{[2,3,4].map(n=><button key={n} aria-label={`${n} игрока`} aria-pressed={count===n} onClick={()=>setCount(n)}>{n}</button>)}</div>{where==='wifi' && <p className="home-note">Игра с людьми в одной сети Wi-Fi</p>}</fieldset>
        <button className="start-playing" onClick={()=>onStart(where,opponent,count)}>{where==='wifi'?'Играть по Wi-Fi':'Начать игру'}</button>
        {hasGame && <button className="quiet-button" onClick={onResume}>Продолжить партию</button>}
    </section>;
}
