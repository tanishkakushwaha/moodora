'use client';
import { useState } from 'react';
import { Heart, Copy, Share2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { quotes, dailyQuote } from '@/lib/catalog';
import { useApp, request, notifyError } from './providers';
export function QuoteCard({ quote, featured = false }: {
    quote: typeof quotes[number];
    featured?: boolean;
}) {
    const { data, refresh } = useApp();
    const [busy, setBusy] = useState(false);
    const saved = data?.favorites.includes(quote.id);
    const text = `“${quote.text}” — ${quote.author}`;
    async function toggle() {
        setBusy(true);
        try {
            await request('/api/favorites', 'POST', { quoteId: quote.id, saved: !saved });
            await refresh();
            toast.success(saved ? 'Removed from your collection' : 'A little inspiration, saved for later.');
        }
        catch (e) {
            notifyError(e);
        }
        finally {
            setBusy(false);
        }
    }
    async function copy() {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied a little encouragement.');
        }
        catch {
            toast.error('Your browser couldn’t copy this quote.');
        }
    }
    async function share() {
        try {
            if (navigator.share)
                await navigator.share({ title: 'A little inspiration from Moodora', text });
            else
                await copy();
        }
        catch (e) {
            if ((e as Error).name !== 'AbortError')
                notifyError(e);
        }
    }
    return <article className={`quote-card ${featured ? 'featured-quote' : 'card'}`}>
  <div className="quote-top">
    <span className="eyebrow">
      <Sparkles size={13}/>
      {featured ? 'A LITTLE INSPIRATION' : quote.category.replace('-', ' ')}
    </span>
    <button className={`icon-button ${saved ? 'is-saved' : ''}`} aria-label={saved ? 'Unsave quote' : 'Save quote'} aria-pressed={!!saved} disabled={busy} onClick={() => void toggle()}><Heart size={17} fill={saved ? 'currentColor' : 'none'}/></button>
  </div>
  <span className="quote-mark">“</span>
  <blockquote>{quote.text}</blockquote>
  <cite>— {quote.author}</cite>
  <div className="quote-bottom">
    <span>{featured ? 'A gentle reminder for today' : 'Keep this one close'}</span>
    <div>
      <button className="icon-button" aria-label="Copy quote" onClick={() => void copy()}><Copy size={14}/></button>
      <button className="icon-button" aria-label="Share quote" onClick={() => void share()}><Share2 size={14}/></button>
    </div>
  </div>
    </article>;
}
export function QuotesPage() {
    const [category, setCategory] = useState('all');
    const [savedOnly, setSavedOnly] = useState(false);
    const { data } = useApp();
    const filtered = quotes.filter(q => (category === 'all' || q.category === category) && (!savedOnly || data?.favorites.includes(q.id)));
    return <div id="main-content" className="page-enter">
  <div className="page-heading">
    <div>
      <span className="eyebrow">WORDS TO COME BACK TO</span>
      <h1>A little inspiration <span className="heading-flower">✧</span></h1>
      <p>Gentle words for wherever you are in your journey.</p>
    </div>
    <button className={`button ${savedOnly ? 'button-primary' : 'button-outline'}`} onClick={() => setSavedOnly(!savedOnly)}>
      <Heart size={16} fill={savedOnly ? 'currentColor' : 'none'}/>
      {savedOnly ? 'Showing saved' : 'My saved quotes'}
      <span className="count-badge">{data?.favorites.length || 0}</span>
    </button>
  </div>
  <div className="quote-hero">
    <div>
      <span className="eyebrow">YOUR DAILY DOSE OF KINDNESS</span>
      <h2>Sometimes, a few words<br />can make a <em>little difference.</em></h2>
      <p>Take what you need. Keep what feels like you.</p>
    </div>
    <QuoteCard quote={dailyQuote()} featured/>
  </div>
  <div className="filter-chips" role="group" aria-label="Quote category">{['all', 'self-love', 'happiness', 'healing', 'confidence', 'positivity'].map(c => <button key={c} className={category === c ? 'selected' : ''} onClick={() => setCategory(c)}>{c === 'all' ? 'All inspirations' : c.replace('-', ' ')}</button>)}</div>
  {filtered.length ? <div className="quotes-grid">{filtered.map(q => <QuoteCard key={q.id} quote={q}/>)}</div> : <div className="card empty-state">
    <Heart size={30}/>
    <h2>A little collection of your own</h2>
    <p>Tap the heart on any quote to keep it close.</p>
    <button className="text-button" onClick={() => {
        setSavedOnly(false);
        setCategory('all');
    }}>Explore all quotes</button>
  </div>}
    </div>;
}
