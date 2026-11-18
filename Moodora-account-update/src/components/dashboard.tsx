'use client';
import Link from 'next/link';
import { BookHeart, Heart, PenLine, Smile, Sparkles, ChartNoAxesCombined, ArrowRight } from 'lucide-react';
import { useApp } from './providers';
import { MoodPicker } from './mood-picker';
import { EntryCard } from './diary';
import { dailyQuote, findMood } from '@/lib/catalog';
import { localDate, getStreak } from '@/lib/utils';
import { GentlePause, WritingPrompt } from './gentle-pause';
import { Kitten, TulipGarden } from './pastel-art';
import { Button } from './ui/button';
export function Dashboard() {
 const {data}=useApp(); if(!data)return null;
 const today=data.moods.find(mood=>mood.date===localDate()); const feeling=findMood(today?.mood); const quote=dailyQuote();
 return <div id="main-content" className="m-dashboard page-enter">
  <div className="page-heading"><div className="p-home-greeting"><span className="eyebrow greeting-date"><Sparkles size={12}/>{new Date().toLocaleDateString('en',{weekday:'long',month:'long',day:'numeric'})}</span><h1>Hello, {data.user.name.split(' ')[0]}! ♡</h1><p>Take a deep breath. This little moment is yours.</p><Kitten/></div></div>
  <div className="p-welcome-row"><section className="p-today"><div><span className="eyebrow">TODAY’S MOOD ♡</span><h2>{feeling?.label || 'How’s your heart?'}</h2><p>{today?.note || (feeling?'A little feeling, gently held.':'Every feeling has a place here.')}</p><Link href="/mood-tracker" className="text-button">{feeling?'Change mood':'Choose a mood'} <ArrowRight size={14}/></Link></div><span className="p-today-emoji" aria-label={feeling?.label || 'A little sunshine'}>{feeling?.emoji || '🌷'}</span><TulipGarden/></section><aside className="p-quote-note"><Heart size={28}/><p>“{quote.text}”</p><span>— {quote.author}</span></aside></div>
  <h2 className="p-actions-heading">Quick actions ✨</h2><nav className="p-quick-actions" aria-label="Quick actions"><Link href="/diary/new"><BookHeart/>Write diary</Link><Link href="/mood-tracker"><Smile/>Track mood</Link><Link href="/self-care"><Heart/>Self-care</Link><Link href="/insights"><ChartNoAxesCombined/>View insights</Link></nav>
  <section className="card feature-card reflection-overview" aria-labelledby="reflection-heading">
   <div><span className="eyebrow">YOUR WEEK, GENTLY HELD</span>
    <h2 id="reflection-heading">Make room for reflection</h2>
    <p>{data.membership.premium ? 'Your weekly mood report is ready to explore. Take a moment to notice your patterns.' : 'Discover weekly mood reports with Premium, or make time for yourself with a daily reminder.'}</p>
   </div>
   <div className="feature-actions">
    <Button asChild><Link href={data.membership.premium ? '/reports' : '/pricing'}>{data.membership.premium ? 'View weekly report' : 'Upgrade to Premium'} <ArrowRight size={16}/></Link></Button>
    <Button variant="outline" asChild><Link href="/settings#daily-reminders">Set a daily reminder</Link></Button>
   </div>
  </section>
  <div className="p-daily-layout"><section className="card m-checkin-card"><span className="m-card-tab">A LITTLE CHECK-IN</span><MoodPicker/></section><GentlePause/></div>
  <div className="m-tiny-stats"><span><BookHeart size={17}/><b>{data.entries.length}</b> diary {data.entries.length===1?'entry':'entries'}</span><span><Heart size={16}/><b>{getStreak(data.moods.map(m=>m.date))}</b> days of checking in</span><Link href="/calendar">My mood calendar <ArrowRight size={14}/></Link></div>
  <section className="p-recent"><div className="section-heading"><h2>My little diary ♡</h2><Link href="/diary" className="text-button">All entries <ArrowRight size={14}/></Link></div>{data.entries.length?<div className="recent-entries">{data.entries.slice(0,2).map(entry=><EntryCard key={entry.id} entry={entry} compact/>)}</div>:<div className="card m-first-page"><BookHeart size={32}/><h3>A page for your thoughts.</h3><p>Your dreams, your little joys, or just anything.</p><Link href="/diary/new" className="text-button">Write my first entry <PenLine size={15}/></Link></div>}</section><WritingPrompt/>
  <p className="m-dashboard-footer"><Heart size={13}/> Feel · Reflect · Bloom ♡</p>
 </div>;
}
