'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, BookOpen, ArrowUpRight } from 'lucide-react';
import { useApp } from './providers';
import { findMood, moods } from '@/lib/catalog';
import { localDate, readableDate } from '@/lib/utils';
export function MoodCalendar({ compact = false }: {
    compact?: boolean;
}) {
    const { data } = useApp();
    const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [selected, setSelected] = useState(localDate());
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const offset = (month.getDay() + 6) % 7;
    const changeMonth = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
    const record = data?.moods.find(m => m.date === selected);
    const entries = data?.entries.filter(e => e.date === selected) || [];
    return <div className={compact ? '' : 'calendar-page-grid'}>
  <section className="card calendar-card">
    <div className="section-heading">
      <div>
        <h2>{compact ? 'Your month in moods' : 'A little feeling, every day'}</h2>
        {!compact && <p>Every day has a story. Here’s yours.</p>}
      </div>
      {compact && <Link href="/calendar" aria-label="Open full calendar" className="icon-button"><ArrowUpRight size={18}/></Link>}
    </div>
    <div className="calendar-month">
      <button className="icon-button" aria-label="Previous month" onClick={() => changeMonth(-1)}><ChevronLeft size={17}/></button>
      <b>{month.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</b>
      <button className="icon-button" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronRight size={17}/></button>
    </div>
    <div className="calendar-grid">
      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span className="calendar-weekday" key={i}>{d}</span>)}
      {Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`}/>)}
      {Array.from({ length: count }, (_, i) => {
        const date = localDate(new Date(month.getFullYear(), month.getMonth(), i + 1));
        const mood = findMood(data?.moods.find(m => m.date === date)?.mood);
        const hasEntry = data?.entries.some(e => e.date === date);
        return <button key={date} aria-label={`${readableDate(date)}, ${mood?.label || 'no mood'}${hasEntry ? ', diary entry' : ''}`} onClick={() => setSelected(date)} className={`calendar-day ${selected === date ? 'chosen' : ''} ${date === localDate() ? 'today' : ''}`} style={mood ? { background: mood.background } : undefined}>
        <span>{i + 1}</span>
        {mood && <span className="calendar-emoji">{mood.emoji}</span>}
        {hasEntry && <span className="entry-dot"/>}
      </button>;
    })}
    </div>
    <div className="calendar-legend">
      <span><i className="entry-dot"/> Diary entry</span>
      <span><i className="today-dot"/> Today</span>
    </div>
    {compact && <div className="calendar-preview-note">{readableDate(selected, { month: 'short', day: 'numeric' })} · {record ? `${findMood(record.mood)?.emoji} ${findMood(record.mood)?.label}` : 'A blank little canvas'}{entries.length ? ` · ${entries.length} diary ${entries.length === 1 ? 'entry' : 'entries'}` : ''}</div>}
  </section>
  {!compact && <aside className="card date-detail">
    <span className="eyebrow">A PAGE FROM YOUR LIFE</span>
    <h2>{readableDate(selected, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
    {record ? <div className="day-mood">
      <span>{findMood(record.mood)?.emoji}</span>
      <h3>Feeling {findMood(record.mood)?.label.toLowerCase()}</h3>
      <p>{record.note || 'Sometimes a feeling says it all.'}</p>
    </div> : <div className="empty-small">
      <p>No mood logged for this day.</p>
      <Link className="text-button" href={`/mood-tracker?date=${selected}`}>Log a mood <ArrowUpRight size={15}/></Link>
    </div>}
    <h3 className="detail-subheading"><BookOpen size={17}/> Diary entries</h3>
    {entries.length ? entries.map(e => <Link key={e.id} className="date-entry" href={`/diary/${e.id}`}>
      <h3>{e.title}</h3>
      <p>
        {e.content.slice(0, 130)}
        {e.content.length > 130 ? '…' : ''}
      </p>
      <span className="text-button">Read this moment <ArrowUpRight size={14}/></span>
    </Link>) : <div className="empty-small">
      <p>No pages written for this day.</p>
      <Link className="text-button" href={`/diary/new?date=${selected}`}>Write a little something <ArrowUpRight size={15}/></Link>
    </div>}
  </aside>}
    </div>;
}
