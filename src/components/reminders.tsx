'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { notifyError, request, useApp } from './providers';
import { reminderDue, zonedClock } from '@/lib/reminders';

export function ReminderSettings() {
  const { data, refresh } = useApp();
  const [enabled, setEnabled] = useState(data?.user.reminderEnabled || false);
  const [time, setTime] = useState(data?.user.reminderTime || '20:00');
  const [timezone, setTimezone] = useState(data?.user.reminderTimezone || 'Asia/Kolkata');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await request('/api/reminders', 'PUT', { enabled, time, timezone });
      await refresh(); toast.success('Your reminder preferences are saved.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save your reminder.'); }
    finally { setBusy(false); }
  }
  return <section className="card feature-card" aria-labelledby="reminders-heading">
    <span className="eyebrow"><Bell size={15}/> A LITTLE MOMENT FOR YOU</span>
    <h2 id="reminders-heading">Daily reminders</h2>
    <p className="muted">A gentle nudge to track your mood. Reminders appear inside Moodora when it is open, after your chosen time.</p>
    <form className="settings-form" onSubmit={event => void save(event)}>
      <label className="reminder-toggle"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)}/> Remind me each day</label>
      <div className="feature-form-row">
        <label className="field-label">Reminder time<Input type="time" required value={time} onChange={event => setTime(event.target.value)}/></label>
        <label className="field-label">Time zone<Input value={timezone} required placeholder="Asia/Kolkata" onChange={event => setTimezone(event.target.value)}/></label>
      </div>
      <Button type="button" variant="ghost" onClick={() => setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)}>Use my device’s time zone</Button>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button disabled={busy} type="submit"><Check size={16}/>{busy ? 'Saving…' : 'Save reminder'}</Button>
    </form>
  </section>;
}

export function DailyReminder() {
  const { data } = useApp();
  const [now, setNow] = useState<Date | null>(null);
  const [dismissedDate, setDismissedDate] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 30000);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, []);
  useEffect(() => {
    if (!data) return;
    try { setDismissedDate(localStorage.getItem(`moodora-reminder-${data.user.id}`)); }
    catch { /* Reminder can still be dismissed for this visit. */ }
  }, [data?.user.id]);
  if (!data || !now || !reminderDue({ enabled: data.user.reminderEnabled, time: data.user.reminderTime,
    timezone: data.user.reminderTimezone, completedDates: data.moods.map(mood => mood.date), dismissedDate, now })) return null;
  function dismiss() {
    const date = zonedClock(now!, data!.user.reminderTimezone).date;
    setDismissedDate(date);
    try { localStorage.setItem(`moodora-reminder-${data!.user.id}`, date); }
    catch (error) { notifyError(new Error('Dismissed for this visit. Your browser could not save this preference.')); }
  }
  const date = zonedClock(now, data.user.reminderTimezone).date;
  return <aside className="daily-reminder" aria-label="Daily mood reminder">
    <Bell size={22}/><div><b>A little check-in?</b><p>Take a moment to notice how you’re feeling today.</p>
      <Link className="text-button" href={`/mood-tracker?date=${date}`}>Track today’s mood →</Link></div>
    <button className="icon-button" aria-label="Dismiss today’s reminder" onClick={dismiss}><X size={18}/></button>
  </aside>;
}
