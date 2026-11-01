'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowRight, Check, Coffee, Hand, Headphones, Leaf, LockKeyhole, Mic, Minus, Plus, RotateCcw, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import dynamic from 'next/dynamic';
const CoffeeScene = dynamic(() => import('./CoffeeScene'), {ssr:false, loading:()=><div className="scene-loading">Warming up the coffee lab…</div>});
import { CAPACITY, DEFAULT_RECIPE, INGREDIENTS, SAMPLE_ORDER, type IngredientId, type OrderResult, type Poured, type Recipe, type RoastResult } from '@/lib/contracts';
import { buildRoast, describeIngredient, parseOrder, reconcileRecipe, scoreRecipe } from '@/lib/recipe';
import { brewReducer, initialBrew } from '@/lib/brew';
import { playSound } from '@/lib/sound';

const PRESETS = [
  {label:'The usual', order:'An iced oat milk latte with two espresso shots and two pumps of vanilla.'},
  {label:'Main character', order:'A large iced oat latte with three espresso shots, four pumps of caramel and strawberry cold foam.'},
  {label:'Pure chaos', order:SAMPLE_ORDER},
];
const QUIPS:Partial<Record<IngredientId,string>> = {
  ice:'A little ice. A brief illusion of composure.',
  caramel:'The caramel has entered the chat. And the glass.',
  vanilla:'Vanilla. A classic with excellent PR.',
  chocolate:'The coffee is developing a dessert subplot.',
  oat:'Oat milk. Keeping the plot beautifully smooth.',
  milk:'Milk, meeting its new responsibilities.',
  almond:'Almond milk. A nutty supporting character.',
  soy:'Soy milk. Calm in the middle of all this.',
  espresso:'Espresso incoming. The plot thickens.',
  matcha:'A little green main-character energy.',
  strawberry:'Strawberry foam. Your coffee is wearing a pink hat.',
  foam:'A cloud on top. Absolutely necessary, apparently.',
  whipped:'And now a tiny, edible victory lap.',
  water:'Water. A very sensible plot twist.',
};

function committedPhrase(poured: Poured): string | null {
  const last = Object.entries(poured).filter(([, quantity]) => (quantity ?? 0) > .01).at(-1);
  if (!last) return null;
  const [id, quantity] = last as [IngredientId, number];
  const amount = Math.round(quantity * 10) / 10;
  const unit = INGREDIENTS[id].unit;
  return `${amount} ${unit}${unit !== 'ml' && amount !== 1 ? 's' : ''} of ${INGREDIENTS[id].label.toLowerCase()}`;
}

function revisionQuip(order: string, poured: Poured, fallback: string): string {
  const already = committedPhrase(poured);
  if (!already) return fallback;
  const request = order.toLowerCase();
  const caramel = poured.caramel ?? 0;
  const caramelAmount = Math.round(caramel * 10) / 10;
  const caramelUnit = caramelAmount === 1 ? 'pump' : 'pumps';
  if (/healthy|less sweet|less sugar|cut the sugar/.test(request)) {
    return caramel > .01
      ? `Already in the glass: ${caramelAmount} ${caramelUnit} of caramel. I can cancel the rest; this cup keeps receipts.`
      : `I can cancel future sweet extras. Already in the glass: ${already}. This cup keeps receipts.`;
  }
  if (/no (?:more )?caramel|without caramel|remove caramel/.test(request) && caramel > .01)
    return `I can stop the caramel now. ${caramelAmount} ${caramelUnit} already made it in, with a receipt.`;
  if (/(?:add|extra|another|more).*(?:shot|espresso)/.test(request))
    return `Extra espresso is on the way. Already in the glass: ${already}. This edit has consequences.`;
  if (/(?:switch|swap|change).*(?:milk|oat|almond|soy)/.test(request))
    return `I can change the remaining milk. Already in the glass: ${already}. No take-backs from this cup.`;
  return `Already in the glass: ${already}. I can rewrite the rest; this cup keeps receipts.`;
}

function BaristaFace() { return <svg viewBox="0 0 80 80" aria-hidden="true"><path d="m40 2 8 9 12-2 3 12 12 5-4 12 7 10-10 8-1 12-13 1-8 9-10-8-12 2-5-12-11-5 4-12-7-10 10-8 1-12 13-1Z" fill="currentColor"/><path d="M23 28c5-5 11-5 15-1m9 0c4-3 8-2 11 1" stroke="#f7eddb" fill="none" strokeWidth="3" strokeLinecap="round"/><ellipse cx="30" cy="37" rx="2.8" ry="4" fill="#f7eddb"/><ellipse cx="51" cy="37" rx="2.8" ry="4" fill="#f7eddb"/><path d="M28 48c6 11 19 11 25-1" stroke="#f7eddb" strokeWidth="3" fill="none" strokeLinecap="round"/></svg>; }

function Modal({children,onClose,label}:{children:ReactNode;onClose:()=>void;label:string}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const prior=document.activeElement as HTMLElement|null;ref.current?.showModal();return()=>{prior?.focus();};},[]);
  return <dialog ref={ref} className="modal" aria-label={label} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><button className="icon-button modal-close" aria-label="Close" onClick={onClose}><X size={18}/></button>{children}</dialog>;
}

export default function CoffeeLab() {
  const [state,dispatch]=useReducer(brewReducer,initialBrew);
  const [order,setOrder]=useState(SAMPLE_ORDER), [preset,setPreset]=useState(2);
  const [change,setChange]=useState(''),[busy,setBusy]=useState(false);
  const [commentary,setCommentary]=useState('Go on. Order something complicated. I have all day. Emotionally, at least.');
  const [warnings,setWarnings]=useState<string[]>([]),[source,setSource]=useState<'local'|'openai'>('local');
  const [ai,setAi]=useState(false),[sound,setSound]=useState(false),[stirred,setStirred]=useState(false);
  const [modal,setModal]=useState<'about'|'receipt'|null>(null),[voiceStatus,setVoiceStatus]=useState(''),[recording,setRecording]=useState(false);
  const [orderNo,setOrderNo]=useState(1),[receiptSaved,setReceiptSaved]=useState(false);
  const [finalName,setFinalName]=useState('');
  const recorder=useRef<MediaRecorder|null>(null), recognition=useRef<{stop:()=>void}|null>(null), voiceTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const requestId=useRef(0), finishId=useRef(0), quipHoldUntil=useRef(0), scene=useRef<HTMLDivElement>(null), changeInput=useRef<HTMLTextAreaElement>(null);
  const idle=state.phase==='idle', brewing=state.phase==='brewing', paused=state.phase==='paused', complete=state.phase==='complete';
  const active=brewing?state.plan[state.index]?.id??null:null;
  const score=useMemo(()=>scoreRecipe(state.recipe,idle?undefined:state.poured,state.changes),[state.recipe,state.poured,state.changes,idle]);
  const totalMl=Object.entries(state.poured).reduce((sum,[id,q])=>sum+(q??0)*INGREDIENTS[id as IngredientId].ml,0);
  const displayedIngredients=state.recipe.ingredients.filter(i=>i.quantity>.001);
  const progress=complete?100:state.plan.length?((state.index+state.elapsed/(state.plan[state.index]?.duration??1))/state.plan.length)*100:0;

  useEffect(()=>{void fetch('/api/health').then(r=>r.ok?r.json() as Promise<{ai:boolean}>:null).then(d=>setAi(d?.ai===true)).catch(()=>{});},[]);
  useEffect(()=>{
    if(!brewing)return;
    let previous=performance.now();
    const timer=setInterval(()=>{const now=performance.now();dispatch({type:'tick',dt:(now-previous)/1000});previous=now;},50);
    return()=>clearInterval(timer);
  },[brewing]);
  useEffect(()=>{if(active && performance.now()>=quipHoldUntil.current)setCommentary(QUIPS[active]??'Another ingredient. Another life choice.');},[active]);
  useEffect(()=>{if(paused)changeInput.current?.focus();},[paused]);
  useEffect(()=>()=>{recognition.current?.stop();if(recorder.current?.state==='recording')recorder.current.stop();if(voiceTimer.current)clearTimeout(voiceTimer.current);},[]);
  useEffect(()=>{
    if(!complete)return;
    const id=++finishId.current;
    const roast=buildRoast(state.recipe,state.poured);
    setCommentary(roast);setFinalName(score.archetype);playSound('finish',sound);
    if(ai)void fetch('/api/roast',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({recipe:state.recipe,poured:state.poured,changes:state.changes}),signal:AbortSignal.timeout(10000)}).then(r=>r.ok?r.json() as Promise<RoastResult>:null).then((r:RoastResult|null)=>{if(r&&finishId.current===id){setCommentary(r.commentary);setFinalName(r.name);setSource(r.source);}}).catch(()=>{});
    return()=>{finishId.current++;};
    // Completion is an event; streamed quantities must not retrigger a roast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[complete]);

  const submit=useCallback(async(text:string,isChange=false)=>{
    if(!text.trim()||busy)return;
    const id=++requestId.current;setBusy(true);setWarnings([]);setVoiceStatus('');
    try{
      let result:OrderResult;
      const currentRecipe=isChange?state.recipe:undefined;
      const poured=isChange?state.poured:{};
      try{
        const response=await fetch('/api/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({order:text,currentRecipe,poured}),signal:AbortSignal.timeout(ai?10000:2500)});
        if(!response.ok)throw new Error('Order service unavailable');result=await response.json();
      }catch{
        const reconciled=reconcileRecipe(parseOrder(text,currentRecipe),poured);
        result={...reconciled,warnings:[...new Set([...reconciled.warnings,...reconciled.recipe.notes])],commentary:buildRoast(reconciled.recipe),source:'local'};
      }
      if(id!==requestId.current)return;
      quipHoldUntil.current=performance.now()+2500;
      setCommentary(isChange?revisionQuip(text,poured,result.commentary):result.commentary);setSource(result.source);setWarnings(result.warnings);setStirred(false);setReceiptSaved(false);
      if(isChange){dispatch({type:'revise',recipe:result.recipe});setChange('');playSound('pop',sound);}
      else{dispatch({type:'start',recipe:result.recipe});playSound('start',sound);if(window.innerWidth<621)scene.current?.scrollIntoView({behavior:'smooth',block:'start'});}
    }catch{setVoiceStatus('Could not read that order. Try “an iced oat latte”.');}
    finally{if(id===requestId.current)setBusy(false);}
  },[busy,state.recipe,state.poured,ai,sound]);

  function pause(){dispatch({type:'pause'});const already=committedPhrase(state.poured);setCommentary(already?`Already in the glass: ${already}. I can rewrite the rest; this cup keeps receipts.`:'An “actually” mid-pour? Bold. What’s already in the glass stays in the glass.');setChange('');playSound('pause',sound);}
  function reset(){requestId.current++;finishId.current++;setBusy(false);dispatch({type:'reset'});setWarnings([]);setStirred(false);setFinalName('');setOrderNo(n=>n+1);setCommentary('Fresh glass. Fresh start. Same questionable judgement.');setModal(null);}
  function acceptTranscript(text:string){if(paused)setChange(text);else setOrder(text);setPreset(-1);setVoiceStatus('Heard you. Check the words, then send your order.');}
  async function voice(){
    if(recording){recorder.current?.stop();recognition.current?.stop();return;}
    setVoiceStatus('');
    if(ai&&navigator.mediaDevices?.getUserMedia&&typeof MediaRecorder!=='undefined'){
      try{
        const stream=await navigator.mediaDevices.getUserMedia({audio:true});
        const type=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
        const r=new MediaRecorder(stream,type?{mimeType:type}:undefined);recorder.current=r;const chunks:BlobPart[]=[];
        r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
        r.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());setRecording(false);if(voiceTimer.current)clearTimeout(voiceTimer.current);setVoiceStatus('Transcribing your order…');try{const form=new FormData();form.append('file',new Blob(chunks,{type:r.mimeType}),r.mimeType.includes('mp4')?'order.mp4':'order.webm');const response=await fetch('/api/transcribe',{method:'POST',body:form,signal:AbortSignal.timeout(15000)});const data=await response.json() as {text?:string};if(!response.ok||!data.text)throw new Error();acceptTranscript(data.text);}catch{setVoiceStatus('Transcription is unavailable. You can still type your order.');}};
        r.start();setRecording(true);setVoiceStatus('Listening… tap the microphone to finish.');voiceTimer.current=setTimeout(()=>{if(r.state==='recording')r.stop();},20000);
      }catch{setVoiceStatus('Microphone access was unavailable. Type your order below.');}
      return;
    }
    const w=window as unknown as {SpeechRecognition?:new()=>any;webkitSpeechRecognition?:new()=>any};
    const Speech=w.SpeechRecognition??w.webkitSpeechRecognition;
    if(!Speech){setVoiceStatus('Voice isn’t available in this browser. Your keyboard makes an excellent microphone.');return;}
    const r=new Speech();recognition.current=r;r.lang='en-GB';r.interimResults=false;r.maxAlternatives=1;
    r.onresult=(event:any)=>acceptTranscript(event.results[0][0].transcript);
    r.onerror=()=>{setVoiceStatus('Browser voice couldn’t connect or was denied. Type your order instead.');setRecording(false);};
    r.onend=()=>setRecording(false);
    try{r.start();setRecording(true);setVoiceStatus('Listening through your browser’s speech service…');}catch{setVoiceStatus('Voice couldn’t start. Type your order instead.');}
  }

  async function downloadReceipt(){
    await document.fonts.ready;
    const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1450;const c=canvas.getContext('2d')!;
    c.fillStyle='#f7f2e8';c.fillRect(0,0,1000,1450);c.fillStyle='#d95836';c.fillRect(0,0,1000,16);
    c.fillStyle='#30291f';c.textAlign='center';c.font='44px "Playfair Display", Georgia';c.fillText('barista roast',500,100);
    c.font='17px "DM Mono", monospace';c.fillStyle='#7a7164';c.fillText('YOUR COFFEE. FRESHLY JUDGED.',500,140);
    const sourceCanvas=scene.current?.querySelector('canvas');
    if(sourceCanvas){const ratio=sourceCanvas.width/sourceCanvas.height;const h=470,w=h*ratio;c.save();c.beginPath();c.roundRect(90,180,820,470,20);c.clip();c.fillStyle='#e9dcc6';c.fillRect(90,180,820,470);c.drawImage(sourceCanvas,500-w/2,180,w,h);c.restore();}
    c.fillStyle='#d95836';c.font='18px "DM Mono", monospace';c.fillText('CERTIFIED '+(score.chaos>60?'CHAOTIC':'COFFEE PERSON'),500,700);
    c.fillStyle='#30291f';c.font='42px "Playfair Display", Georgia';c.fillText((finalName||score.archetype).slice(0,35),500,755);
    function wrap(text:string,y:number,font:string,max=800,line=34){c.font=font;let row='';for(const word of text.split(' ')){if(c.measureText(row+word+' ').width>max){c.fillText(row.trim(),500,y);y+=line;row='';}row+=word+' ';}if(row)c.fillText(row.trim(),500,y);return y+line;}
    let y=wrap('“'+commentary+'”',815,'24px "DM Sans", sans-serif');
    c.setLineDash([5,8]);c.strokeStyle='#c9bda8';c.beginPath();c.moveTo(100,y+20);c.lineTo(900,y+20);c.stroke();c.setLineDash([]);y+=65;
    c.font='20px "DM Mono", monospace';c.fillText('CHAOS '+score.chaos+'/100  ·  COMPLEXITY '+score.complexity+'/100',500,y);y+=55;
    for(const ingredient of state.recipe.ingredients){const quantity=state.poured[ingredient.id]??0;if(quantity<.01)continue;c.font='22px "DM Sans", sans-serif';c.fillText(describeIngredient({...ingredient,quantity}),500,y);y+=34;}
    c.fillStyle='#7a7164';c.font='16px "DM Mono", monospace';c.fillText('PLAYFUL SCORES. ZERO SCIENTIFIC CREDENTIALS.',500,1340);c.fillText('BARISTA ROAST · LONDON 2026 · '+(source==='local'?'LOCAL DEMO':'OPENAI'),500,1375);
    canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='barista-roast-receipt.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setReceiptSaved(true);},'image/png');
  }

  return <div className="app-shell">
    <header className="site-header"><a href="/" className="brand" aria-label="Barista Roast home"><span className="brand-symbol"><Coffee size={22}/></span>barista roast<span className="brand-dot">®</span></a><nav aria-label="Main navigation"><span className="nav-current">The coffee lab</span><button onClick={()=>setModal('about')}>How it works <span>↗</span></button></nav><span className="open-sign"><i/>OPEN FOR QUESTIONABLE ORDERS</span></header>
    <main>
      <section className="intro"><div><p className="eyebrow">SPECIALTY COFFEE. UNSOLICITED OPINIONS.</p><h1>Your coffee.<br className="mobile-break"/> <em>Freshly judged.</em></h1><p className="intro-copy">You bring the order. We bring it to life.<br/>Then our barista has a few thoughts.</p></div><div className="intro-stamp"><span>100%</span><p>YOUR TASTE.<br/>OUR JUDGEMENT.</p><Sparkles size={18}/></div></section>
      <section className="lab-grid" aria-label="The coffee lab">
        <aside className="order-panel">
          <div className="panel-kicker"><span>01 — THE ORDER</span><span className="tiny-star">✳</span></div>
          <h2>{paused?'A change of heart?':complete?'A beautiful mess.':'What’s your usual?'} </h2>
          <p className="panel-copy">{paused?'We can change what’s next. What’s in the glass is staying.':complete?'Made to order. Roasted with affection. Ready for its close-up.':'Or your wildly unreasonable unusual.'}</p>
          {idle&&<div className="preset-tabs" aria-label="Sample orders">{PRESETS.map((p,i)=><button key={p.label} className={preset===i?'selected':''} onClick={()=>{setPreset(i);setOrder(p.order);}}>{p.label}</button>)}</div>}
          {(idle||paused)&&<form onSubmit={e=>{e.preventDefault();void submit(paused?change:order,paused);}}>
            <div className={'order-input '+(recording?'is-recording':'')}><label htmlFor={paused?'change-order':'coffee-order'}>{paused?'ACTUALLY…':'I’LL HAVE…'}</label><textarea ref={paused?changeInput:undefined} id={paused?'change-order':'coffee-order'} value={paused?change:order} maxLength={1200} rows={paused?3:5} onChange={e=>{if(paused)setChange(e.target.value);else{setOrder(e.target.value);setPreset(-1);}}} placeholder={paused?'No more caramel. One extra shot. You get the idea.':'An iced oat latte, but make it dramatic.'} disabled={busy}/><div className="input-foot"><span>{recording?'LISTENING…':paused?'YOUR PLOT TWIST':'SAY IT. TYPE IT. OWN IT.'}</span><button type="button" className={'mic-button '+(recording?'recording':'')} onClick={()=>void voice()} aria-label={recording?'Stop recording':'Speak your order'} disabled={busy}><Mic size={18}/></button></div></div>
            {paused&&<div className="change-options"><button type="button" disabled={busy} onClick={()=>void submit('Make it healthy',true)}><Leaf size={14}/>Make it healthy</button><button type="button" disabled={busy} onClick={()=>void submit('Add one extra espresso shot',true)}><Plus size={14}/>One more shot</button><button type="button" disabled={busy} onClick={()=>void submit('No more caramel',true)}><Minus size={14}/>No more caramel</button></div>}
            <button type="submit" className="primary-button" disabled={busy||!(paused?change:order).trim()}>{busy?'Reading your intentions…':paused?'Rewrite the rest':'Make my coffee'}{busy?<span className="spinner"/>:<ArrowRight size={19}/>}</button>
            {paused&&<button type="button" className="text-button resume-button" disabled={busy} onClick={()=>dispatch({type:'resume'})}>Never mind, keep pouring →</button>}
          </form>}
          {voiceStatus&&<p className="voice-status" role="status">{voiceStatus}</p>}
          {brewing&&<div className="order-running"><span className="big-quotes">“</span><p>{order}</p><div className="live-indicator"><i/>MAKING QUESTIONABLE DECISIONS</div><button className="primary-button interrupt-side" onClick={pause}><Hand size={18}/>Actually… change my order</button><p className="small-note">Yes, you can interrupt the barista.</p></div>}
          {complete&&<div className="order-complete"><div className="completed-check"><Check size={28}/></div><p className="archetype-label">YOUR ORDER ARCHETYPE</p><h3>{finalName||score.archetype}</h3><p>A fictional label. A very real commitment to this order.</p><button className="primary-button" onClick={()=>setModal('receipt')}>Get my roast receipt<ArrowDownToLine size={18}/></button><button className="text-button" onClick={reset}><RotateCcw size={14}/>Another round</button></div>}
          <div className="order-bottom"><span><Headphones size={14}/>{ai?'Voice powered by OpenAI':'Voice via your browser, where supported'}</span><p>No perfect orders. Just interesting ones.</p></div>
        </aside>
        <div className={'scene-panel '+(complete?'scene-complete':'')}>
          <div className="scene-topline"><span><i className={brewing?'live-dot':''}/>{idle?'ON THE MENU':paused?'POUR PAUSED':complete?'YOUR MASTERPIECE':'BREW IN PROGRESS'}</span><span>NO. {String(orderNo).padStart(3,'0')}</span></div>
          <div className="coffee-scene" ref={scene}><CoffeeScene recipe={idle?DEFAULT_RECIPE:state.recipe} poured={state.poured} active={active} preview={idle} stirred={stirred}/></div>
          {idle&&<><div className="ingredient-callout callout-one"><span>strawberry cloud</span><i/></div><div className="ingredient-callout callout-two"><i/><span>questionable intentions</span></div></>}
          <div className="scene-drag"><span>↔</span> DRAG TO TAKE A LOOK</div>
          <div className="scene-caption"><p className="eyebrow">{complete?'ORDER UP. NO TAKE-BACKS.':paused?'REALITY HAS ENTERED THE CHAT.':idle?'TODAY’S BEAUTIFUL BAD IDEA':active?`ADDING ${INGREDIENTS[active].label.toUpperCase()}`:'ONE MOMENT OF DELICIOUS CHAOS'}</p><h2>{idle?'The “make it healthy”':complete?(finalName||score.archetype):paused?'You can’t un-pour caramel.':state.recipe.name}</h2><p>{idle?'Oat latte · caramel · strawberry foam · audacity':paused?`${Math.round(totalMl)} ml already committed. The rest is negotiable.`:complete?'Made with good ingredients and questionable intentions.':`${Math.round(totalMl)} / ${CAPACITY[state.recipe.size]} ml · ${state.recipe.temperature} · ${state.recipe.size}`}</p></div>
          <div className="scene-bottom">{(brewing||paused)?<><div className="progress-track"><span style={{width:progress+'%'}}/></div><div className="pour-controls"><span>{paused?'Your barista is listening.':`STEP ${Math.min(state.index+1,state.plan.length)} OF ${state.plan.length}`}</span>{brewing?<button onClick={pause}><Hand size={15}/>Actually…</button>:<span className="paused-label">ON HOLD</span>}</div></>:<><span className="mini-label">{idle?'A LITTLE EXTRA. LIKE YOU.':'LOOKS GOOD FROM EVERY ANGLE.'}</span><button className="stir-button" onClick={()=>{setStirred(v=>!v);playSound('pop',sound);}} aria-pressed={stirred}><RotateCcw size={14}/>{stirred?'Show the layers':'Give it a swirl'}</button></>}</div>
        </div>
        <aside className="barista-panel">
          <div className="panel-kicker"><span>02 — THE ROAST</span><span className="tiny-star">✳</span></div><div className="barista-profile"><div className="barista-avatar"><BaristaFace/></div><div><h2>Meet Beau.</h2><p>YOUR BARISTA & PART-TIME CRITIC</p></div><button className="icon-button sound-button" onClick={()=>{setSound(v=>!v);playSound('pop',!sound);}} aria-label={sound?'Mute sound':'Enable sound'}>{sound?<Volume2 size={17}/>:<VolumeX size={17}/>}</button></div>
          <div className="speech-bubble" aria-live="polite"><span className="quote-mark">“</span><p>{commentary}</p><span className="speech-signature">— WITH LOVE, BEAU</span></div>
          {warnings.length>0&&<div className="reality-note" role="status"><LockKeyhole size={15}/><div><strong>A note from Beau</strong>{warnings.map((w,i)=><p key={i}>{w}</p>)}</div></div>}
          <div className="score-section"><div className="score-heading"><span>THE VIBE CHECK</span><span>STRICTLY UNSCIENTIFIC</span></div><div className="chaos-score"><span>{idle?'—':score.chaos}<small>/100</small></span><p>chaos<br/>energy <Sparkles size={12}/></p></div><div className="chaos-meter"><span style={{width:idle?'0%':score.chaos+'%'}}/></div><div className="meter-labels"><span>WELL-ADJUSTED</span><span>ABSOLUTE MENACE</span></div></div>
          <details className="recipe-ledger" open={!idle}><summary>{idle?'WHAT’S IN THIS BEAUTIFUL MESS':'WHAT’S ACTUALLY IN THE GLASS'}<Plus size={13}/></summary><ul>{displayedIngredients.map(ingredient=>{const q=idle?ingredient.quantity:state.poured[ingredient.id]??0;const done=q>=ingredient.quantity-.01;return <li key={ingredient.id}><span className="ingredient-dot" style={{background:INGREDIENTS[ingredient.id].color}}/><span>{INGREDIENTS[ingredient.id].label}</span><span className="ingredient-amount">{idle?`${ingredient.quantity} ${INGREDIENTS[ingredient.id].unit}${INGREDIENTS[ingredient.id].unit!=='ml'&&ingredient.quantity!==1?'s':''}`:q>.001?`${Math.round(q*10)/10} ${INGREDIENTS[ingredient.id].unit}${INGREDIENTS[ingredient.id].unit!=='ml'&&q!==1?'s':''}`:'queued'}</span>{!idle&&(done?<Check size={11}/>:q>.001?<LockKeyhole size={10}/>:<span className="queued-dot"/>)}</li>;})}</ul></details>
          {!idle&&<details className="score-rules"><summary>How we scored your order</summary><ul>{score.reasons.map((r,i)=><li key={i}>{r}</li>)}</ul><p>Playful arithmetic, not nutrition or a personality assessment.</p></details>}
          <div className="beau-note">Judging the coffee.<br/><em>Never the person.</em><span>♡</span></div>
        </aside>
      </section>
      <div className="bottom-strip"><span><i className="status-dot"/>{source==='openai'?'OPENAI CONNECTED':'LOCAL DEMO'}<span className="strip-divider">/</span>REAL INGREDIENTS. REAL CONSEQUENCES.</span><span>CRAFTED WITH CODEX <span className="orange-star">✳</span> LONDON, 2026</span></div>
    </main>
    {modal==='about'&&<Modal label="How Barista Roast works" onClose={()=>setModal(null)}><p className="eyebrow">A LITTLE COFFEE. A LITTLE CHAOS.</p><h2>Order. Interrupt.<br/><em>Get roasted.</em></h2><ol className="how-steps"><li><span>01</span><div><h3>Ask for the unreasonable.</h3><p>Type an order, pick a sample, or use voice in a supported browser.</p></div></li><li><span>02</span><div><h3>Drop an “actually…” mid-pour.</h3><p>Change future ingredients. Already-poured quantities stay committed—even half a pump.</p></div></li><li><span>03</span><div><h3>Keep the receipt.</h3><p>Get a friendly roast and a playful score based on the drink you actually made.</p></div></li></ol><div className="mode-explanation"><strong>{ai?'OpenAI is connected.':'You’re in local demo mode.'}</strong><p>{ai?'AI interprets your order and writes the final roast.':'A local parser and ingredient-based jokes power this demo. No model call is being represented as live AI.'} Three.js renders every pour deterministically. Browser voice may require an internet connection.</p></div><button className="primary-button" onClick={()=>setModal(null)}>Let’s make questionable decisions<ArrowRight size={18}/></button></Modal>}
    {modal==='receipt'&&<Modal label="Your roast receipt" onClose={()=>setModal(null)}><div className="receipt"><span className="receipt-brand">barista roast</span><p className="eyebrow">FRESHLY BREWED. FRESHLY JUDGED.</p><div className="receipt-rule"/><span className="receipt-stamp">{score.chaos>60?'CERTIFIED CHAOTIC':'CERTIFIED COFFEE PERSON'}</span><h2>{finalName||score.archetype}</h2><blockquote>“{commentary}”</blockquote><div className="receipt-scores"><span><strong>{score.chaos}</strong>CHAOS / 100</span><span><strong>{score.complexity}</strong>COMPLEXITY / 100</span><span><strong>{state.changes}</strong>PLOT TWISTS</span></div><div className="receipt-rule"/><ul>{state.recipe.ingredients.filter(i=>(state.poured[i.id]??0)>.001).map(i=><li key={i.id}><span>{INGREDIENTS[i.id].label}</span><span>{Math.round((state.poured[i.id]??0)*10)/10} {INGREDIENTS[i.id].unit}{INGREDIENTS[i.id].unit!=='ml'&&(state.poured[i.id]??0)!==1?'s':''}</span></li>)}</ul><p className="receipt-footnote">Playful scores. Zero scientific credentials.<br/>{source==='local'?'Local demo · ingredient-based commentary':'Roast written with OpenAI'} · Made with Codex</p><button className="primary-button" onClick={()=>void downloadReceipt()}>{receiptSaved?'Receipt downloaded':'Save my roast receipt'}{receiptSaved?<Check size={18}/>:<ArrowDownToLine size={18}/>}</button><button className="text-button" onClick={reset}><RotateCcw size={14}/>Another round?</button></div></Modal>}
  </div>;
}
