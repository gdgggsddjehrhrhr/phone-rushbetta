import { useEffect, useMemo, useRef, useState } from 'react'
import { Archive, ArrowRight, BarChart3, Box, Check, ChevronRight, Coins, Crown, Dices, Info, Lock, PackageOpen, Pause, Play, RotateCcw, ShieldCheck, Smartphone, Sparkles, TrendingUp, Trophy, Volume2, VolumeX, X, Zap } from 'lucide-react'
import { audio, sceneEvent, startGame, stopGame } from '@/game/boot'
import { CASES, PHONES, phoneById, rollFromCase, xpForLevel, formatCoins, type Phone } from '@/game/data'
import { storage } from '@/game/storage'

type Tab = 'cases' | 'inventory' | 'upgrade' | 'stats'
interface Owned { uid: string; phoneId: string }
interface Save { balance: number; inventory: Owned[]; xp: number; level: number; opened: number; wins: number; losses: number; best: number; introSeen: boolean }
const fresh: Save = { balance: 2500, inventory: [], xp: 0, level: 1, opened: 0, wins: 0, losses: 0, best: 0, introSeen: false }
const load = (): Save => {
  const s = storage.get<Partial<Save>>('phoneRush.save.v1', {})
  return { ...fresh, ...s, balance: Number.isFinite(s.balance) ? Math.max(0, s.balance!) : fresh.balance, inventory: Array.isArray(s.inventory) ? s.inventory.filter(x => x && typeof x.uid === 'string' && PHONES.some(p => p.id === x.phoneId)) : [] }
}
const categoryClass: Record<string,string> = { 'Бюджет':'budget', 'Средний класс':'mid', 'Субфлагман':'sub', 'Флагман':'flag', 'Ультрафлагман':'ultra', 'Лимитированный':'limited' }

function PhoneArt({ phone, small=false }: { phone: Phone; small?: boolean }) {
  const brandClass = phone.brand.toLowerCase().replace(/[^a-z]/g, '')
  const cameraCount = phone.brand === 'Apple' ? 3 : phone.brand === 'Samsung' || phone.brand === 'Google' ? 3 : 2
  return <div className={`phone-art ${small?'small':''} brand-${brandClass}`} style={{'--phone':phone.color,'--accent':phone.accent} as React.CSSProperties}>
    <div className={`phone-cameras camera-${brandClass}`}>{Array.from({length:cameraCount},(_,i)=><i key={i}/>)}</div><div className="phone-logo">{phone.brand === 'Apple' ? '●' : phone.brand === 'Google' ? 'G' : phone.brand === 'Samsung' ? 'SAMSUNG' : phone.brand === 'Xiaomi' ? 'mi' : phone.brand === 'Nothing' ? '· ·' : phone.brand === 'OnePlus' ? '1+' : phone.brand === 'Motorola' ? 'M' : phone.brand === 'Vertu' ? 'V' : 'C'}</div><div className="phone-shine"/>
  </div>
}
function Rarity({phone}:{phone:Phone}) { return <span className={`rarity ${categoryClass[phone.category]}`}>{phone.category}</span> }

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const [save,setSave] = useState<Save>(load)
  const [tab,setTab] = useState<Tab>('cases')
  const [intro,setIntro] = useState(!save.introSeen)
  const [paused,setPaused] = useState(false)
  const [muted,setMuted] = useState(audio.muted)
  const [opening,setOpening] = useState<{caseId:string;reward:Phone;strip:Phone[];offset:number;revealed:boolean}|null>(null)
  const [selected,setSelected] = useState<string[]>([])
  const [sourceUid,setSourceUid] = useState<string|null>(null)
  const [targetId,setTargetId] = useState<string>(PHONES[6].id)
  const [upgrade,setUpgrade] = useState<{active:boolean;result:'win'|'lose'|null;angle:number}|null>(null)
  const [toast,setToast] = useState('')
  const [resetAsk,setResetAsk] = useState(false)

  useEffect(()=>{ const c=canvasRef.current; if(c) startGame(c); return ()=>{stopGame();timers.current.forEach(clearTimeout)} },[])
  useEffect(()=>storage.set('phoneRush.save.v1',save),[save])
  useEffect(()=>{ if(toast){const t=setTimeout(()=>setToast(''),2600);return()=>clearTimeout(t)} },[toast])
  const later=(fn:()=>void,ms:number)=>{timers.current.push(setTimeout(fn,ms))}
  const source = save.inventory.find(x=>x.uid===sourceUid)
  const sourcePhone = source ? phoneById(source.phoneId) : null
  const targets = sourcePhone ? PHONES.filter(p=>p.price>=sourcePhone.price*1.25 && p.price<=sourcePhone.price*12) : []
  const target = phoneById(targetId)
  const chance = sourcePhone && target ? Math.min(75,Math.floor(85*sourcePhone.price/target.price)) : 0
  const canUpgrade = !!sourcePhone && targets.some(p=>p.id===targetId) && !upgrade?.active
  const inventoryValue = save.inventory.reduce((sum,x)=>sum+phoneById(x.phoneId).price,0)

  const start = () => { audio.startMusic();audio.sfx('ui');setIntro(false);setSave(s=>({...s,introSeen:true})) }
  const openCase = (caseId:string) => {
    const c=CASES.find(x=>x.id===caseId)!
    if(save.level<c.level){setToast(`Нужен ${c.level} уровень`);audio.sfx('lose');return}
    if(save.balance<c.price){setToast('Не хватает монет — продай телефоны');audio.sfx('lose');return}
    const reward=rollFromCase(c)
    const strip=Array.from({length:26},()=>rollFromCase(c));strip[21]=reward
    setSave(s=>({...s,balance:s.balance-c.price,opened:s.opened+1}))
    setOpening({caseId,reward,strip,offset:0,revealed:false});sceneEvent('opening',c.color,c.color);audio.sfx('explosion')
    requestAnimationFrame(()=>requestAnimationFrame(()=>setOpening(o=>o?{...o,offset:21*(innerWidth<=760?138:176)+(innerWidth<=760?65:88)}:o)))
    later(()=>{setOpening(o=>o?{...o,revealed:true}:null);sceneEvent('reward',reward.color,reward.accent);audio.sfx('win')},3900)
  }
  const keepReward=()=>{
    if(!opening)return
    const phone=opening.reward
    setSave(s=>{let xp=s.xp+35,level=s.level;while(xp>=xpForLevel(level)){xp-=xpForLevel(level);level++}return{...s,inventory:[...s.inventory,{uid:crypto.randomUUID(),phoneId:phone.id}],xp,level,best:Math.max(s.best,phone.price)}})
    setOpening(null);sceneEvent('idle');audio.sfx('pickup')
  }
  const sellReward=()=>{
    if(!opening)return
    setSave(s=>{let xp=s.xp+35,level=s.level;while(xp>=xpForLevel(level)){xp-=xpForLevel(level);level++}return{...s,balance:s.balance+opening.reward.price,xp,level,best:Math.max(s.best,opening.reward.price)}})
    setOpening(null);sceneEvent('idle');audio.sfx('pickup')
  }
  const sellSelected=()=>{
    const value=save.inventory.filter(x=>selected.includes(x.uid)).reduce((a,x)=>a+phoneById(x.phoneId).price,0)
    if(!selected.length)return
    setSave(s=>({...s,balance:s.balance+value,inventory:s.inventory.filter(x=>!selected.includes(x.uid))}));setSelected([]);setSourceUid(null);audio.sfx('pickup');setToast(`Продано за ${formatCoins(value)}`)
  }
  const beginUpgrade=()=>{
    if(!canUpgrade||!sourcePhone||!targets.some(p=>p.id===targetId))return
    // The pointer's final position is the source of truth: the highlighted arc is the win zone.
    // This prevents the animation and the displayed result from disagreeing.
    const landingAngle=Math.random()*360
    const won=landingAngle < chance*3.6
    const finalAngle=1440+landingAngle
    setUpgrade({active:true,result:null,angle:0});sceneEvent('opening');audio.sfx('explosion')
    requestAnimationFrame(()=>requestAnimationFrame(()=>setUpgrade(u=>u?{...u,angle:finalAngle}:u)))
    later(()=>{
      setUpgrade({active:false,result:won?'win':'lose',angle:finalAngle})
      setSave(s=>({...s,inventory:won?[...s.inventory.filter(x=>x.uid!==sourceUid),{uid:crypto.randomUUID(),phoneId:target.id}]:s.inventory.filter(x=>x.uid!==sourceUid),wins:s.wins+(won?1:0),losses:s.losses+(won?0:1),best:Math.max(s.best,won?target.price:0)}))
      if(won){sceneEvent('upgrade-win',target.color,target.accent);audio.sfx('win')}else{sceneEvent('upgrade-lose');audio.sfx('lose')}
    },3300)
  }
  const closeUpgrade=()=>{setUpgrade(null);setSourceUid(null);sceneEvent('idle')}
  const rescue=()=>{setSave(s=>({...s,balance:s.balance+1000}));audio.sfx('pickup');setToast('Стартовый бонус: +1 000 ₵')}
  const reset=()=>{setSave({...fresh,introSeen:true});setSelected([]);setSourceUid(null);setResetAsk(false);setPaused(false);setTab('cases');sceneEvent('idle')}

  return <div id="game-root">
    <canvas id="game-canvas" ref={canvasRef}/>
    <div className="ambient-grid"/>
    <header className="topbar">
      <button className="brand" onClick={()=>setTab('cases')}><span className="brand-icon"><Smartphone size={21}/></span><span>PHONE<span>RUSH</span><small>CASE SIMULATOR</small></span></button>
      <nav>{([['cases','Кейсы',Box],['inventory','Коллекция',Archive],['upgrade','Апгрейдер',TrendingUp],['stats','Статистика',BarChart3]] as const).map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>{setTab(id);audio.sfx('ui')}}><Icon size={17}/>{label}{id==='inventory'&&save.inventory.length>0&&<b>{save.inventory.length}</b>}</button>)}</nav>
      <div className="header-actions"><div className="balance"><Coins size={18}/><span>{formatCoins(save.balance)}</span></div><button className="icon-btn" onClick={()=>{setMuted(audio.toggleMute())}} aria-label="Звук">{muted?<VolumeX/>:<Volume2/>}</button><button className="icon-btn" onClick={()=>setPaused(true)} aria-label="Пауза"><Pause/></button></div>
    </header>

    <main className="content">
      {tab==='cases'&&<section className="page cases-page">
        <div className="hero"><div><div className="eyebrow"><Sparkles size={14}/> ТВОЙ СЛЕДУЮЩИЙ ФЛАГМАН УЖЕ В КЕЙСЕ</div><h1>Рискни. Открой.<br/><em>Собери лучший.</em></h1><p>От бюджетника до лимитированного флагмана.<br/>Каждый телефон имеет свою цену.</p></div><div className="level-card"><div className="level-num">{save.level}</div><div><span>УРОВЕНЬ КОЛЛЕКЦИОНЕРА</span><div className="xpbar"><i style={{width:`${save.xp/xpForLevel(save.level)*100}%`}}/></div><small>{save.xp} / {xpForLevel(save.level)} XP</small></div></div></div>
        <div className="case-grid">{CASES.map((c,i)=><article className={`case-card case-${i}`} key={c.id} style={{'--case':c.color} as React.CSSProperties}>
          <div className="case-glow"/><div className="case-top"><span>0{i+1}</span>{save.level<c.level?<span className="locked"><Lock size={13}/> {c.level} УРОВЕНЬ</span>:<span className="available"><i/> ДОСТУПЕН</span>}</div>
          <div className="case-box"><div className="box-lid"><i/><i/><i/></div><div className="box-body"><Smartphone/><span>PHONE<br/>RUSH</span></div><div className="box-shadow"/></div>
          <h2>{c.name}</h2><p>{c.subtitle}</p><div className="case-footer"><div><small>ЦЕНА КЕЙСА</small><strong>{formatCoins(c.price)}</strong></div><button onClick={()=>openCase(c.id)} disabled={!!opening}>{save.level<c.level?<Lock size={18}/>:<PackageOpen size={19}/>}<span>ОТКРЫТЬ</span></button></div>
        </article>)}</div>
        {save.balance<500&&save.inventory.length===0&&<button className="rescue" onClick={rescue}><Zap/> Получить 1 000 ₵ на новый старт</button>}
        <div className="drops-title"><span>ВОЗМОЖНЫЕ НАГРАДЫ</span><i/></div><div className="mini-phones">{PHONES.slice(14,20).map(p=><div key={p.id}><PhoneArt phone={p} small/><Rarity phone={p}/><b>{p.name}</b><span>{formatCoins(p.price)}</span></div>)}</div>
      </section>}

      {tab==='inventory'&&<section className="page"><div className="section-heading"><div><span className="eyebrow">ТВОИ УСТРОЙСТВА</span><h1>Коллекция <em>{save.inventory.length}</em></h1><p>Общая стоимость: {formatCoins(inventoryValue)}</p></div><button className="primary" disabled={!selected.length} onClick={sellSelected}><Coins/> Продать выбранное {selected.length>0&&`(${selected.length})`}</button></div>
        {save.inventory.length===0?<div className="empty"><Archive/><h2>Здесь пока пусто</h2><p>Открой первый кейс — телефон появится в коллекции.</p><button className="primary" onClick={()=>setTab('cases')}>К кейсам <ArrowRight/></button></div>:<div className="inventory-grid">{save.inventory.map(item=>{const p=phoneById(item.phoneId),active=selected.includes(item.uid);return <button className={`inventory-card ${active?'selected':''}`} key={item.uid} onClick={()=>setSelected(s=>active?s.filter(x=>x!==item.uid):[...s,item.uid])}><div className="check">{active&&<Check/>}</div><PhoneArt phone={p}/><Rarity phone={p}/><h3>{p.name}</h3><strong>{formatCoins(p.price)}</strong></button>})}</div>}
      </section>}

      {tab==='upgrade'&&<section className="page upgrade-page"><div className="section-heading"><div><span className="eyebrow"><Dices/> РИСК = НАГРАДА</span><h1>Апгрейдер</h1><p>Поставь телефон на шанс получить более дорогой. При проигрыше ставка сгорает.</p></div><div className="fair"><ShieldCheck/> Честный шанс<br/><b>указан до ставки</b></div></div>
        <div className="upgrade-board"><div className="upgrade-side"><label>1. ТВОЯ СТАВКА</label>{sourcePhone?<button className="chosen-phone" onClick={()=>{setSourceUid(null);setUpgrade(null)}}><PhoneArt phone={sourcePhone}/><Rarity phone={sourcePhone}/><h3>{sourcePhone.name}</h3><b>{formatCoins(sourcePhone.price)}</b><X/></button>:<div className="select-source"><Smartphone/><span>Выбери телефон из коллекции</span></div>}<div className="source-list">{save.inventory.map(item=>{const p=phoneById(item.phoneId);return <button key={item.uid} className={sourceUid===item.uid?'active':''} onClick={()=>{setSourceUid(item.uid);const first=PHONES.find(x=>x.price>=p.price*1.25&&x.price<=p.price*12);if(first)setTargetId(first.id)}}><PhoneArt phone={p} small/><span>{p.name}</span><b>{formatCoins(p.price)}</b></button>})}</div></div>
        <div className="upgrade-center"><div className={`chance-ring ${upgrade?.active?'spinning':''}`} style={{'--chance':`${chance*3.6}deg`,'--angle':`${upgrade?.angle||0}deg`} as React.CSSProperties}><div><strong>{chance}%</strong><span>ШАНС</span></div><i/></div><span className="versus">UPGRADE</span><button className="upgrade-btn" disabled={!canUpgrade} onClick={beginUpgrade}><Zap/> {upgrade?.active?'КРУТИМ...':'УЛУЧШИТЬ'}</button><small>{sourcePhone?`Проигрыш: потеря ${sourcePhone.name}`:'Сначала выбери ставку и цель'}</small></div>
        <div className="upgrade-side target-side"><label>2. ЖЕЛАЕМЫЙ ТЕЛЕФОН</label><div className="target-list">{!sourcePhone?<div className="select-source"><Crown/><span>Цели появятся после выбора ставки</span></div>:targets.length===0?<div className="select-source"><Info/><span>Для этой модели нет доступных целей</span></div>:targets.map(p=><button key={p.id} className={targetId===p.id?'active':''} onClick={()=>setTargetId(p.id)}><PhoneArt phone={p} small/><span>{p.name}<small>×{(p.price/sourcePhone.price).toFixed(1)}</small></span><b>{formatCoins(p.price)}</b></button>)}</div></div></div>
      </section>}

      {tab==='stats'&&<section className="page"><div className="section-heading"><div><span className="eyebrow">ТВОЙ ПРОГРЕСС</span><h1>Статистика</h1><p>Каждый риск оставляет след.</p></div></div><div className="stats-grid"><div><PackageOpen/><span>Кейсов открыто</span><b>{save.opened}</b></div><div><Trophy/><span>Удачных апгрейдов</span><b>{save.wins}</b></div><div><Dices/><span>Неудачных апгрейдов</span><b>{save.losses}</b></div><div><Crown/><span>Самый дорогой дроп</span><b>{formatCoins(save.best)}</b></div></div><div className="collection-progress"><h2>Коллекционный рейтинг</h2><p>Уровень {save.level} · {save.inventory.length} устройств · {formatCoins(inventoryValue)} в коллекции</p><div className="xpbar"><i style={{width:`${save.xp/xpForLevel(save.level)*100}%`}}/></div><span>До следующего уровня: {xpForLevel(save.level)-save.xp} XP</span></div></section>}
    </main>

    {intro&&<div className="overlay intro-overlay"><div className="intro-card"><div className="intro-logo"><Smartphone/><i/></div><span className="eyebrow">CASE • COLLECT • UPGRADE</span><h1>PHONE<span>RUSH</span></h1><p>Открывай кейсы, собирай телефоны и рискуй в апгрейдере ради лимитированных моделей.</p><div className="intro-features"><span><Box/> 3 кейса</span><span><Smartphone/> 24 модели</span><span><TrendingUp/> Апгрейдер</span></div><button className="start-btn" onClick={start}>НАЧАТЬ ИГРУ <ChevronRight/></button><small>2 500 ₵ на старте · виртуальная валюта</small></div></div>}
    {paused&&<div className="overlay"><div className="pause-card"><Pause/><h2>Пауза</h2><p>Прогресс сохранён в этом браузере.</p><button className="primary" onClick={()=>setPaused(false)}><Play/> Продолжить</button><button className="ghost" onClick={()=>setResetAsk(true)}><RotateCcw/> Сбросить прогресс</button></div></div>}
    {resetAsk&&<div className="overlay"><div className="pause-card"><RotateCcw/><h2>Начать заново?</h2><p>Баланс, коллекция и статистика будут удалены.</p><button className="danger" onClick={reset}>Да, сбросить</button><button className="ghost" onClick={()=>setResetAsk(false)}>Отмена</button></div></div>}
    {opening&&<div className="overlay case-overlay"><div className={`opening-modal ${opening.revealed?'revealed':''}`}><div className="modal-kicker">{opening.revealed?'НОВЫЙ ТЕЛЕФОН':'ОТКРЫВАЕМ КЕЙС'}</div>{!opening.revealed?<><h2>Удача выбирает...</h2><div className="roulette"><div className="pointer"/><div className="roulette-strip" style={{transform:`translateX(calc(50% - ${opening.offset}px))`}}>{opening.strip.map((p,i)=><div className="roulette-item" key={i}><PhoneArt phone={p} small/><b>{p.name}</b><span>{formatCoins(p.price)}</span></div>)}</div></div><div className="loading-line"><i/></div></>:<><div className="reward-burst"/><PhoneArt phone={opening.reward}/><Rarity phone={opening.reward}/><h2>{opening.reward.name}</h2><div className="reward-price">{formatCoins(opening.reward.price)}</div><div className="reward-actions"><button className="ghost" onClick={sellReward}><Coins/> Продать</button><button className="primary" onClick={keepReward}><Check/> В коллекцию</button></div></>}</div></div>}
    {upgrade?.result&&<div className="overlay"><div className={`result-modal ${upgrade.result}`}><div className="result-icon">{upgrade.result==='win'?<Trophy/>:<X/>}</div><span className="eyebrow">{upgrade.result==='win'?'АПГРЕЙД УДАЛСЯ':'В ЭТОТ РАЗ НЕ ПОВЕЗЛО'}</span><h2>{upgrade.result==='win'?'Новый телефон твой!':'Ставка сгорела'}</h2>{upgrade.result==='win'?<><PhoneArt phone={target}/><h3>{target.name}</h3><b>{formatCoins(target.price)}</b></>:<p>{sourcePhone?.name} удалён из коллекции.<br/>Попробуй цель с более высоким шансом.</p>}<button className="primary" onClick={closeUpgrade}>Продолжить <ArrowRight/></button></div></div>}
    {toast&&<div className="toast"><Info/>{toast}</div>}
  </div>
}
