'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Crown, Download, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { useApp } from './providers';
import { localDate } from '@/lib/utils';
import { dateBefore, type WeeklyReport } from '@/lib/weekly-report';

const prettyDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
export function WeeklyReportPage() {
  const { data } = useApp();
  const [end, setEnd] = useState(localDate());
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    setReport(null);
    if (!data?.membership.premium) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    void fetch(`/api/reports/weekly?end=${end}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error); return result as WeeklyReport; })
      .then(setReport).catch(error => { if (error.name !== 'AbortError') setError(error.message || 'Could not load your report.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [data?.membership.premium, end, retry]);
  function download() {
    if (!report) return;
    const text = [`Moodora weekly report`, `${report.start} to ${report.end}`, '',
      `Check-ins: ${report.checkIns} of 7 days`, `Previous week: ${report.previousCheckIns} check-ins`, '',
      ...report.days.map(day => `${day.date}: ${day.mood?.label || 'No check-in'}`), '', report.reflection,
    ].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `moodora-week-${report.end}.txt`; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div id="main-content" className="page-enter feature-page">
    <div className="page-heading"><div><span className="eyebrow">SEVEN DAYS, GENTLY HELD</span><h1>Your weekly mood report</h1><p>A little space to look back and notice your patterns.</p></div></div>
    {!data?.membership.premium ? <section className="card empty-state"><Crown size={34}/><h2>A weekly reflection, just for you</h2><p>With Premium, see your daily feelings, your most frequent moods, and how often you checked in compared with the previous week.</p><Button asChild><Link href="/membership">Explore Premium</Link></Button></section> : <>
      <div className="report-toolbar"><Button variant="outline" aria-label="Previous week" disabled={end < '1900-01-21'} onClick={() => setEnd(dateBefore(end, 7))}><ArrowLeft size={17}/>Previous week</Button><label className="field-label">Week ending<input className="input" type="date" value={end} min="1900-01-14" max={localDate()} required onChange={event => { if (event.target.validity.valid && event.target.value) setEnd(event.target.value); }}/></label><Button variant="outline" disabled={end >= localDate()} onClick={() => setEnd(dateBefore(end, -7) > localDate() ? localDate() : dateBefore(end, -7))}>Next week<ArrowRight size={17}/></Button></div>
      {loading && <p role="status">Gathering your week…</p>}
      {error && <section className="card" role="alert"><p>{error}</p><Button onClick={() => setRetry(value => value + 1)}>Try again</Button></section>}
      {report && <>
        <div className="section-heading"><h2>{prettyDate(report.start)} — {prettyDate(report.end)}</h2><Button variant="outline" onClick={download}><Download size={16}/>Download report</Button></div>
        <div className="report-stats"><section className="card feature-card"><CalendarDays/><h2>{report.checkIns} of 7 days</h2><p>You made time for a check-in.</p></section><section className="card feature-card"><h2>{report.mostFrequent.map(mood => `${mood.emoji} ${mood.label}`).join(' · ') || 'Still unfolding'}</h2><p>{report.mostFrequent.length > 1 ? 'Your equally frequent feelings' : 'Your most frequent feeling'}</p></section><section className="card feature-card"><h2>{report.change > 0 ? '+' : ''}{report.change} check-ins</h2><p>Compared with {report.previousCheckIns} in the previous week.</p></section></div>
        <section className="card feature-card"><h2>Your week, day by day</h2><div className="report-days">{report.days.map(day => <div key={day.date}><span>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</span><small>{prettyDate(day.date)}</small><b className="report-emoji" aria-hidden="true">{day.mood?.emoji || '○'}</b><span>{day.mood?.label || 'No check-in'}</span></div>)}</div></section>
        <section className="card feature-card"><h2>Feelings you recorded</h2>{report.distribution.length ? <ul className="report-distribution">{report.distribution.map(mood => <li key={mood.id}><span>{mood.emoji} {mood.label}</span><meter min={0} max={7} value={mood.count} aria-label={`${mood.label}: ${mood.count} days`}/><span>{mood.count} {mood.count === 1 ? 'day' : 'days'}</span></li>)}</ul> : <p>No check-ins for this week yet. <Link className="text-button" href="/mood-tracker">Track a mood →</Link></p>}</section>
        <section className="card feature-card"><h2>A gentle reflection</h2><p>{report.reflection}</p><Link className="text-button" href="/diary/new">Write about your week →</Link></section>
      </>}
    </>}
  </div>;
}
