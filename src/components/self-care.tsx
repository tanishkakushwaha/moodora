'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Heart, Moon, Sparkles, RotateCcw } from 'lucide-react';
import { GentlePause, WritingPrompt } from './gentle-pause';
import { TulipGarden } from './pastel-art';
const affirmations=['I can take this day one little step at a time.','I deserve the kindness I give to others.','My feelings are allowed to take up space.','Rest is a part of my story, too.'];
export function SelfCarePage(){
 const [tab,setTab]=useState('For you');const [affirmation,setAffirmation]=useState(0);
 return <div id="main-content" className="page-enter"><div className="page-heading"><div><span className="eyebrow">YOUR OWN LITTLE SOFT SPOT</span><h1>Self-care ♡</h1><p>A little kindness. A moment to come back to yourself.</p></div></div><div className="p-care-tabs" role="group" aria-label="Self-care category">{['For you','Relax','Mindfulness'].map(value=><button key={value} aria-pressed={tab===value} onClick={()=>setTab(value)}>{value}</button>)}</div><div className="p-care-grid">{tab!=='Mindfulness'&&<GentlePause/>}{tab!=='Relax'&&<section className="p-care-card"><Sparkles size={31}/><h2>Positive affirmations ♡</h2><p aria-live="polite">{affirmations[affirmation]}</p><button className="button button-outline" onClick={()=>setAffirmation((affirmation+1)%affirmations.length)}><RotateCcw size={15}/> A little more kindness</button></section>}{tab!=='Relax'&&<section className="p-care-card"><Heart size={31}/><h2>A thought to hold</h2><WritingPrompt/><Link href="/diary/new" className="text-button">Write about it →</Link></section>}{tab!=='Mindfulness'&&<section className="p-care-card"><Moon size={31}/><h2>A softer evening</h2><p>Find a cozy spot. Put the day into a few words, and choose one little thing you’re looking forward to tomorrow.</p><Link href="/diary/new" className="text-button">Let the day go →</Link></section>}</div><div className="p-care-footer"><p>Take care of yourself.<br/>You deserve it. ♡</p><TulipGarden/></div></div>;
}
