'use client';

import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, Wind } from 'lucide-react';
import { Button } from './ui/button';

const prompts = ['What made you smile, even for a second?', 'What’s one thing you can let go of today?', 'What would you tell a friend feeling like you?', 'What’s a little thing you’re grateful for?', 'What do you need more of right now?'];
export function WritingPrompt() {
  const [index, setIndex] = useState(0);
  return <div className="m-writing-prompt"><span className="eyebrow">A LITTLE NUDGE, IF YOU NEED ONE</span><p>{prompts[index]}</p><button className="text-button" type="button" onClick={()=>setIndex((index+1)%prompts.length)}><RotateCcw size={13}/> Try another prompt</button></div>;
}

export function GentlePause() {
  const [remaining, setRemaining] = useState(60);
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(0);
  useEffect(()=>{
    if(!running) return;
    const timer=window.setInterval(()=>setRemaining(value=>Math.max(0,value-1)),1000);
    return ()=>window.clearInterval(timer);
  },[running]);
  useEffect(()=>{if(remaining===0) setRunning(false);},[remaining]);
  const phase=Math.floor((60-remaining)%12/4);
  const instruction = ['Breathe in gently', 'Hold, if comfortable', 'Breathe out slowly'][phase];
  return <section className="card m-pause-card"><div className="section-heading"><div><span className="eyebrow"><Wind size={13}/> A LITTLE RESET</span><h2>One minute, just for you.</h2></div><span className="m-timer" aria-label={`${remaining} seconds remaining`}>{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</span></div><div key={cycle} className={`m-breath-orb ${running?'is-breathing':''}`} aria-hidden="true"><span>♡</span></div><p className="m-breath-instruction" aria-live="polite">{remaining===0?'A little pause. A fresh beginning.':running?instruction:'Unclench your jaw. Drop your shoulders.'}</p><p className="m-breath-hint">Follow your own pace. Skip the hold whenever you like.</p><div className="m-pause-actions"><Button variant="outline" onClick={()=>{if(remaining===0){setRemaining(60);setCycle(value=>value+1);}setRunning(!running);}}>{running?<Pause size={15}/>:<Play size={15}/>} {running?'Pause':remaining===0?'Begin again':remaining===60?'Take a breath':'Continue'}</Button>{remaining<60&&<button className="icon-button" aria-label="Reset breathing timer" onClick={()=>{setRunning(false);setRemaining(60);setCycle(value=>value+1);}}><RotateCcw size={16}/></button>}</div></section>;
}
