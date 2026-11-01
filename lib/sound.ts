let context: AudioContext | null = null;
export function playSound(kind:'start'|'pause'|'finish'|'pop',enabled:boolean) {
  if(!enabled||typeof window==='undefined')return;
  try{
    context ??= new AudioContext(); void context.resume();
    const notes=kind==='finish'?[523,659,784]:kind==='pause'?[330,262]:kind==='start'?[392,523]:[660];
    notes.forEach((frequency,i)=>{const oscillator=context!.createOscillator();const gain=context!.createGain();const t=context!.currentTime+i*.12;oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.045,t+.015);gain.gain.exponentialRampToValueAtTime(.001,t+.3);oscillator.connect(gain);gain.connect(context!.destination);oscillator.start(t);oscillator.stop(t+.32);});
  }catch{/* Sound is an enhancement. */}
}
