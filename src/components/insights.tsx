'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Flame, Smile, ArrowUpRight, Heart, CalendarDays, Trash2 } from 'lucide-react';
import { useApp, request, notifyError } from './providers';
import { MoodPicker } from './mood-picker';
import { TrendChart, DistributionChart } from './charts';
import { findMood, moods } from '@/lib/catalog';
import { getStreak, localDate, readableDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
export function InsightsPage() {
    const { data } = useApp();
    const [period, setPeriod] = useState(30);
    const start = new Date();
    start.setDate(start.getDate() - period + 1);
    const selected = data?.moods.filter(m => m.date >= localDate(start) && m.date <= localDate()) || [];
    const common = moods.map(m => ({ ...m, count: selected.filter(s => s.mood === m.id).length })).sort((a, b) => b.count - a.count)[0];
    return <div id="main-content" className="page-enter">
  <div className="page-heading">
    <div>
      <span className="eyebrow">LITTLE PATTERNS. GENTLE UNDERSTANDING.</span>
      <h1>Getting to know you <span className="heading-flower">✧</span></h1>
      <p>Reflection without judgment. Every feeling has something to tell you.</p>
    </div>
    <select className="input filter-select" aria-label="Insights period" value={period} onChange={e => setPeriod(+e.target.value)}>
      <option value={7}>Past 7 days</option>
      <option value={30}>Past 30 days</option>
    </select>
  </div>
  <div className="stats-grid">
    <div className="stat-card">
      <span className="stat-icon rose"><Flame size={23}/></span>
      <div>
        <span>Your check-in streak</span>
        <b>
          {getStreak(data?.moods.map(m => m.date) || [])}
          <em>days</em>
        </b>
        <small>A little ritual of self-care</small>
      </div>
    </div>
    <div className="stat-card">
      <span className="stat-icon lavender"><CalendarDays size={23}/></span>
      <div>
        <span>Showing up for you</span>
        <b>
          {selected.length}
          <em>check-ins</em>
        </b>
        <small>In the past {period} days</small>
      </div>
    </div>
    <div className="stat-card">
      <span className="stat-icon peach">{selected.length ? common.emoji : <Heart size={23}/>}</span>
      <div>
        <span>Most frequent feeling</span>
        <b>{selected.length ? common.label : 'Still unfolding'}</b>
        <small>{selected.length ? `${common.count} of your ${selected.length} check-ins` : 'Your story is just beginning'}</small>
      </div>
    </div>
  </div>
  <section className="card"><TrendChart large/></section>
  <div className="insights-bottom">
    <DistributionChart />
    <section className="card reflection-card">
      <span className="eyebrow">A GENTLE REFLECTION</span>
      <span className="reflection-flower">✿</span>
      <h2>You are more than<br />a chart or a number.</h2>
      <p>Your mood is a moment, not a definition. Looking back can help you notice what nourishes you, and where you might need a little more care.</p>
      <Link className="text-button" href="/diary/new">Make a little space to reflect <ArrowUpRight size={15}/></Link>
      <small>Moodora offers reflection, not medical assessment.</small>
    </section>
  </div>
    </div>;
}
export function MoodTrackerPage({ initialDate }: { initialDate?: string }) {
    const { data, refresh } = useApp();
    const [toDelete, setToDelete] = useState<string | null>(null);
    const [visible, setVisible] = useState(12);
    const [busy, setBusy] = useState(false);
    async function remove() {
        if (!toDelete)
            return;
        setBusy(true);
        try {
            await request('/api/moods', 'DELETE', { date: toDelete });
            await refresh();
            toast.success('Check-in removed.');
            setToDelete(null);
        }
        catch (e) {
            notifyError(e);
        }
        finally {
            setBusy(false);
        }
    }
    return <div id="main-content" className="page-enter">
  <div className="page-heading">
    <div>
      <span className="eyebrow">MAKE SPACE FOR EVERY FEELING</span>
      <h1>A moment with yourself <span className="heading-flower">❀</span></h1>
      <p>No feeling is too big, too small, or too complicated to belong here.</p>
    </div>
    <Link href="/calendar" className="button button-outline"><CalendarDays size={16}/> See my mood calendar</Link>
  </div>
  <MoodPicker full initialDate={initialDate}/>
  <div className="section-heading history-heading">
    <div>
      <h2>Your recent check-ins</h2>
      <p>Little snapshots of your inner world.</p>
    </div>
    <span className="soft-badge">{data?.moods.length || 0} CHECK-INS</span>
  </div>
  {data?.moods.length ? <div className="card mood-history">{data.moods.slice(0, visible).map(m => {
        const mood = findMood(m.mood);
        return <div className="history-row" key={m.id}>
      <span className="history-emoji" style={{ background: mood?.background }}>{mood?.emoji}</span>
      <div>
        <h3>
          {mood?.label}
          <span>{readableDate(m.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </h3>
        <p>{m.note || 'A feeling, quietly acknowledged.'}</p>
      </div>
      <button className="icon-button" aria-label={`Delete mood from ${m.date}`} onClick={() => setToDelete(m.date)}><Trash2 size={16}/></button>
    </div>;
    })}</div> : <div className="card empty-state">
    <Smile size={30}/>
    <h2>Every journey starts with a check-in.</h2>
    <p>Save your first mood above. There’s no right way to feel.</p>
  </div>}
  {(data?.moods.length || 0) > visible && <div className="load-more"><Button variant="outline" onClick={() => setVisible(n => n + 12)}>Show more check-ins</Button></div>}
  <Dialog open={!!toDelete} onOpenChange={open => {
        if (!open)
            setToDelete(null);
    }}><DialogContent>
      <DialogTitle className="dialog-title">Remove this check-in?</DialogTitle>
      <DialogDescription className="muted">Your mood and note for {toDelete} will be permanently deleted.</DialogDescription>
      <div className="dialog-actions">
        <Button variant="outline" onClick={() => setToDelete(null)}>Keep check-in</Button>
        <Button variant="destructive" disabled={busy} onClick={() => void remove()}>{busy ? 'Removing…' : 'Remove check-in'}</Button>
      </div>
    </DialogContent></Dialog>
    </div>;
}
