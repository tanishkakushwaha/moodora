'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, LoaderCircle, LockKeyhole, PenLine, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { dateSchema, diarySchema } from '@/lib/validation';
import { findMood, moods } from '@/lib/catalog';
import { localDate, readableDate } from '@/lib/utils';
import { useApp, request, notifyError, type Entry } from './providers';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { WritingPrompt } from './gentle-pause';
import { Bow } from './moodora-art';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

export function EntryCard({ entry, compact = false }: { entry: Entry; compact?: boolean }) {
  const mood = findMood(entry.mood);
  return <Link href={`/diary/${entry.id}`} className={`card entry-card ${compact ? 'entry-compact' : ''}`}>
    <div className="entry-top"><span className="entry-date">{readableDate(entry.date, { month: 'short', day: 'numeric', year: 'numeric' })}</span>{mood && <span className="mood-pill" style={{ background: mood.background }}>{mood.emoji} {mood.label}</span>}</div>
    <h3>{entry.title}</h3><p>{entry.content}</p><div className="entry-bottom"><span className="text-button">Read entry</span><ArrowRight size={17} /></div>
  </Link>;
}

export function DiaryPage() {
  const { data } = useApp();
  const [query, setQuery] = useState('');
  const [mood, setMood] = useState('all');
  const [date, setDate] = useState('');
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const activeFilters = Number(mood !== 'all') + Number(!!date) + Number(sort !== 'newest');
  const entries = (data?.entries || []).filter(entry =>
    `${entry.title} ${entry.content} ${entry.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())
    && (mood === 'all' || entry.mood === mood) && (!date || entry.date === date),
  ).sort((a, b) => sort === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  function clearFilters() { setQuery(''); setMood('all'); setDate(''); setSort('newest'); }
  return <div id="main-content" className="page-enter">
    <div className="page-heading"><div><span className="eyebrow">YOUR OWN LITTLE BOOK OF LIFE</span><h1>My diary <span className="heading-flower">♡</span></h1><p>Your thoughts, saved privately.</p></div><Link href="/diary/new" className="button button-primary"><PenLine size={18} />Write an entry</Link></div>
    <div className="diary-toolbar"><div className="search-input"><Search size={19} /><Input aria-label="Search diary entries" placeholder="Search your diary…" value={query} onChange={event => setQuery(event.target.value)} />{query && <button className="icon-button" aria-label="Clear search" onClick={() => setQuery('')}><X size={17} /></button>}</div><Button variant="outline" aria-expanded={showFilters} aria-controls="diary-filters" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={17} />Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}</Button></div>
    <div id="diary-filters" className="simple-filter-panel" hidden={!showFilters}>
      <label className="field-label">Mood<select className="input" value={mood} onChange={event => setMood(event.target.value)}><option value="all">All moods</option>{moods.map(item => <option key={item.id} value={item.id}>{item.emoji} {item.label}</option>)}</select></label>
      <label className="field-label">Date<Input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
      <label className="field-label">Order<select className="input" value={sort} onChange={event => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
    </div>
    <div className="collection-label"><span>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>{(query || activeFilters > 0) && <button className="text-button" onClick={clearFilters}>Clear search and filters</button>}</div>
    {entries.length > 0 ? <div className="diary-grid">{entries.map(entry => <EntryCard key={entry.id} entry={entry} />)}</div> : <div className="card empty-state"><BookOpen size={34} /><h2>{data?.entries.length ? 'No entries found' : 'Your first entry starts here'}</h2><p>{data?.entries.length ? 'Try a different search or clear the filters.' : 'Write about your day, a thought, or something you want to remember.'}</p>{!data?.entries.length && <Link href="/diary/new" className="button button-primary"><PenLine size={18} />Write an entry</Link>}</div>}
  </div>;
}

export function DiaryEditor({ id }: { id?: string }) {
  const { data, refresh } = useApp();
  const entry = data?.entries.find(item => item.id === id);
  const search = useSearchParams();
  const initialDate = dateSchema.safeParse(search.get('date'));
  const router = useRouter();
  const [title, setTitle] = useState(entry?.title || '');
  const [content, setContent] = useState(entry?.content || '');
  const [date, setDate] = useState(entry?.date || (initialDate.success ? initialDate.data : localDate()));
  const [mood, setMood] = useState(entry?.mood || '');
  const [tags, setTags] = useState(entry?.tags.join(', ') || '');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [leave, setLeave] = useState(false);
  const [destination, setDestination] = useState('/diary');
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest('a');
      if (link?.href && new URL(link.href).origin === location.origin && new URL(link.href).pathname !== location.pathname) {
        event.preventDefault(); setDestination(link.href); setLeave(true);
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', click, true);
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', click, true); };
  }, [dirty]);

  async function save() {
    setError('');
    const validDate = dateSchema.safeParse(date);
    if (!validDate.success) { setError('Choose a valid date.'); return; }
    const parsed = diarySchema.safeParse({ title: title.trim() || `Diary entry — ${readableDate(validDate.data)}`, content, date: validDate.data, mood: mood || null, tags: tags.split(',').map(tag => tag.trim()).filter(Boolean) });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setBusy(true);
    try {
      const result = await request(id ? `/api/diary/${id}` : '/api/diary', id ? 'PUT' : 'POST', parsed.data);
      setDirty(false);
      await refresh();
      toast.success('Entry saved.');
      router.push(`/diary/${id || result.id}`);
    } catch (error) { notifyError(error); setError(error instanceof Error ? error.message : 'Could not save your entry. Try again.'); }
    finally { setBusy(false); }
  }
  if (id && !entry) return <div className="empty-state"><h2>Entry not found</h2><Link href="/diary" className="button button-outline">Back to diary</Link></div>;
  return <div id="main-content" className="page-enter editor-page">
    <div className="editor-toolbar"><Link href="/diary" className="text-button"><ArrowLeft size={18} />Back to diary</Link><Button disabled={busy} onClick={() => void save()}>{busy ? <LoaderCircle className="spin" size={18} /> : <Check size={18} />}{busy ? 'Saving…' : 'Save entry'}</Button></div>
    <section className="editor-paper simple-editor"><Bow className="m-editor-bow"/><h1>{id ? 'Edit entry' : 'New diary entry'}</h1><p className="simple-private-note"><LockKeyhole size={15} />Only you can read this.</p>
      <label className="field-label" htmlFor="diary-title">Title <span>(optional)</span></label><Input id="diary-title" className="editor-title" placeholder="Give your entry a title" maxLength={150} value={title} disabled={busy} onChange={event => { setTitle(event.target.value); setDirty(true); }} />
      <WritingPrompt/><label className="field-label" htmlFor="diary-content">Your entry</label><textarea id="diary-content" className="editor-content" placeholder={"How was your day?\n\nWrite anything you want to remember…"} maxLength={50000} value={content} disabled={busy} onChange={event => { setContent(event.target.value); setDirty(true); }} />
      <details className="simple-entry-details"><summary>Date, mood and tags <span>(optional)</span></summary><div className="simple-filter-panel"><label className="field-label">Date<Input type="date" value={date} onChange={event => { setDate(event.target.value); setDirty(true); }} disabled={busy} /></label><label className="field-label">Mood<select className="input" value={mood} disabled={busy} onChange={event => { setMood(event.target.value); setDirty(true); }}><option value="">No mood selected</option>{moods.map(item => <option key={item.id} value={item.id}>{item.emoji} {item.label}</option>)}</select></label></div><label className="field-label">Tags<Input placeholder="For example: family, gratitude" maxLength={250} value={tags} disabled={busy} onChange={event => { setTags(event.target.value); setDirty(true); }} /></label></details>
      {error && <p className="form-error" role="alert">{error}</p>}<div className="editor-footnote"><span>{content.trim() ? content.trim().split(/\s+/).length : 0} words</span><span>{dirty ? 'Unsaved changes' : 'Ready to write'}</span></div>
    </section>
    <Dialog open={leave} onOpenChange={setLeave}><DialogContent><DialogTitle className="dialog-title">Unsaved entry</DialogTitle><DialogDescription className="muted">Save your entry before leaving, or leave without saving.</DialogDescription><div className="dialog-actions"><Button variant="outline" onClick={() => setLeave(false)}>Keep writing</Button><Button variant="destructive" onClick={() => { setDirty(false); setLeave(false); router.push(destination); }}>Leave without saving</Button></div></DialogContent></Dialog>
  </div>;
}

export function DiaryDetail({ id }: { id: string }) {
  const { data, refresh } = useApp();
  const entry = data?.entries.find(item => item.id === id);
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    try { await request(`/api/diary/${id}`, 'DELETE'); await refresh(); toast.success('Entry deleted.'); router.push('/diary'); }
    catch (error) { notifyError(error); }
    finally { setBusy(false); }
  }
  if (!entry) return <div className="empty-state"><h2>Entry not found</h2><Link href="/diary" className="button button-outline">Back to diary</Link></div>;
  const mood = findMood(entry.mood);
  return <div id="main-content" className="page-enter editor-page">
    <div className="editor-toolbar"><Link href="/diary" className="text-button"><ArrowLeft size={18} />Back to diary</Link><div className="inline-actions"><Button variant="ghost" aria-label="Delete entry" onClick={() => setConfirm(true)}><Trash2 size={18} />Delete</Button><Button variant="outline" asChild><Link href={`/diary/${id}/edit`}><PenLine size={17} />Edit</Link></Button></div></div>
    <article className="editor-paper diary-reading"><h1>{entry.title}</h1><div className="reading-meta"><span><CalendarDays size={16} />{readableDate(entry.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>{mood && <span className="mood-pill" style={{ background: mood.background }}>{mood.emoji} {mood.label}</span>}</div><div className="reading-content">{entry.content}</div><div className="entry-tags">{entry.tags.map(tag => <span key={tag}>#{tag}</span>)}</div><p className="reading-footer"><LockKeyhole size={15} />Private diary entry</p></article>
    <Dialog open={confirm} onOpenChange={setConfirm}><DialogContent><DialogTitle className="dialog-title">Delete this entry?</DialogTitle><DialogDescription className="muted">“{entry.title}” will be permanently deleted. This cannot be undone.</DialogDescription><div className="dialog-actions"><Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={() => void remove()}>{busy ? 'Deleting…' : 'Delete entry'}</Button></div></DialogContent></Dialog>
  </div>;
}
