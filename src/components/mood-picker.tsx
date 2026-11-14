'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { moods, findMood } from '@/lib/catalog';
import { localDate } from '@/lib/utils';
import { dateSchema } from '@/lib/validation';
import { request, useApp } from './providers';
import { Button } from './ui/button';
import { Input, Textarea } from './ui/input';

export function MoodChoices({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const reduceMotion = useReducedMotion();
  return <div className="mood-choices" role="group" aria-label="Choose your mood">{moods.map(mood => (
    <motion.button key={mood.id} type="button" disabled={disabled} aria-pressed={value === mood.id} whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { scale: 0.97 }} className={`mood-choice ${value === mood.id ? 'selected' : ''}`} style={{ '--mood-bg': mood.background, '--mood-color': mood.color } as React.CSSProperties} onClick={() => onChange(mood.id)}>
      <span className="mood-emoji">{mood.emoji}</span><span>{mood.label}</span>{value === mood.id && <Check className="mood-check" size={13} />}
    </motion.button>
  ))}</div>;
}

export function MoodPicker({ full = false, initialDate }: { full?: boolean; initialDate?: string }) {
  const { data, refresh } = useApp();
  const today = localDate();
  const parsedDate = dateSchema.safeParse(initialDate);
  const startingDate = parsedDate.success && parsedDate.data <= today ? parsedDate.data : today;
  const [date, setDate] = useState(startingDate);
  const current = data?.moods.find(mood => mood.date === date);
  const [selected, setSelected] = useState(current?.mood || '');
  const [note, setNote] = useState(current?.note || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const changed = selected !== current?.mood || note.trim() !== (current?.note || '');
  const saved = !!current && !changed;

  function chooseDate(value: string) {
    setDate(value);
    const previous = data?.moods.find(mood => mood.date === value);
    setSelected(previous?.mood || '');
    setNote(previous?.note || '');
    setError('');
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    try {
      await request('/api/moods', 'POST', { date, mood: selected, note: note.trim() });
      setNote(note.trim());
      await refresh();
      toast.success('Mood saved.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save your mood. Try again.';
      setError(message);
      toast.error(message);
    } finally { setBusy(false); }
  }
  return (
    <form className={full ? 'card mood-full simple-mood-form' : 'simple-mood-form'} onSubmit={save}>
      <div className="section-heading"><div><h2>How are you feeling{date === today ? ' today' : ''}?</h2><p>Choose a mood, then save it.</p></div>{full && <Input className="date-input" type="date" aria-label="Mood date" value={date} max={today} disabled={busy} onChange={event => chooseDate(event.target.value)} />}</div>
      <MoodChoices value={selected} onChange={setSelected} disabled={busy} />
      <details className="simple-note"><summary>{note ? 'Edit note' : 'Add a note'} <span>(optional)</span></summary><label className="field-label" htmlFor={full ? 'mood-note-page' : 'mood-note-home'}>What’s on your mind?</label><Textarea id={full ? 'mood-note-page' : 'mood-note-home'} rows={2} maxLength={500} disabled={busy} placeholder="A few words about your day…" value={note} onChange={event => setNote(event.target.value)} /></details>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="simple-save-row"><p role="status">{saved ? `${findMood(current.mood)?.emoji} ${findMood(current.mood)?.label} saved` : selected ? `${findMood(selected)?.label} selected` : 'No mood selected yet'}</p><Button type="submit" disabled={busy || !selected || saved}>{busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}{busy ? 'Saving…' : saved ? 'Saved' : current ? 'Update mood' : 'Save mood'}</Button></div>
    </form>
  );
}
