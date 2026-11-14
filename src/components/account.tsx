'use client';
import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { LoaderCircle, Heart, Check, Sun, Moon, Monitor, LockKeyhole, LogOut, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar } from './app-shell';
import { useApp, request, notifyError, setTheme } from './providers';
import { profileSchema, passwordChangeSchema } from '@/lib/validation';
export { AuthPage } from './auth-form';
export function ProfilePage() {
    const { data, refresh } = useApp();
    const [name, setName] = useState(data?.user.name || '');
    const [image, setImage] = useState(data?.user.image || '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function save(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        const parsed = profileSchema.safeParse({ name, image });
        if (!parsed.success) {
            setError(parsed.error.issues[0].message);
            return;
        }
        setBusy(true);
        try {
            await request('/api/profile', 'PUT', parsed.data);
            await refresh();
            toast.success('Your space feels a little more you.');
        }
        catch (e) {
            notifyError(e);
        }
        finally {
            setBusy(false);
        }
    }
    return <div id="main-content" className="page-enter">
  <div className="page-heading"><div>
      <span className="eyebrow">BEAUTIFULLY, UNAPOLOGETICALLY YOU</span>
      <h1>My little corner <span className="heading-flower">✿</span></h1>
      <p>Make this space feel like home.</p>
    </div></div>
  <div className="settings-grid">
    <section className="card profile-summary">
      <Avatar name={data?.user.name || name} image={data?.user.image} size={90}/>
      <h2>{data?.user.name}</h2>
      <p>{data?.user.email}</p>
      <span className="soft-badge">GROWING AT MY OWN PACE</span>
      <div className="profile-numbers">
        <div>
          <b>{data?.entries.length || 0}</b>
          <span>pages written</span>
        </div>
        <div>
          <b>{data?.moods.length || 0}</b>
          <span>little check-ins</span>
        </div>
      </div>
      <p className="profile-joined">Journaling since {new Date(data?.user.createdAt || Date.now()).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</p>
    </section>
    <section className="card">
      <h2>The little details</h2>
      <p className="muted">How you show up in your personal space.</p>
      <form className="settings-form" onSubmit={e => void save(e)}>
        <label className="field-label">Your name<Input value={name} required minLength={2} maxLength={60} onChange={e => setName(e.target.value)} autoComplete="name"/></label>
        <label className="field-label">Email address<Input value={data?.user.email || ''} disabled type="email"/><small>Your account email is used to sign in.</small></label>
        <label className="field-label">Profile picture URL <span>(optional)</span><Input value={image} onChange={e => setImage(e.target.value)} type="url" placeholder="https://example.com/your-photo.jpg"/><small>Use an HTTPS image link, or leave empty for your initial.</small></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16}/> : <Check size={16}/>}Save my profile</Button>
      </form>
    </section>
  </div>
    </div>;
}
export function SettingsPage() {
    const { data, refresh } = useApp();
    const [theme, setSelected] = useState(typeof window === 'undefined' ? 'light' : localStorage.getItem('moodora-pastel-theme') || 'light');
    const [themeBusy, setThemeBusy] = useState(false);
    const [current, setCurrent] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function themeChange(value: string) {
        if (themeBusy)
            return;
        setThemeBusy(true);
        const prev = theme;
        setSelected(value);
        setTheme(value);
        try {
            await request('/api/profile', 'PUT', { name: data!.user.name, image: data!.user.image || '', theme: value });
            await refresh();
            toast.success('A new atmosphere for your space.');
        }
        catch (e) {
            setSelected(prev);
            setTheme(prev);
            notifyError(e);
        }
        finally {
            setThemeBusy(false);
        }
    }
    async function changePassword(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        const parsed = passwordChangeSchema.safeParse({ currentPassword: current, newPassword: password });
        if (!parsed.success) {
            setError(parsed.error.issues[0].message);
            return;
        }
        setBusy(true);
        try {
            await request('/api/password', 'PUT', parsed.data);
            toast.success('Password updated. Please log in again.');
            await signOut({ callbackUrl: '/login' });
        }
        catch (e) {
            notifyError(e);
        }
        finally {
            setBusy(false);
        }
    }
    function exportData() {
        const payload = { exportedAt: new Date().toISOString(), profile: { name: data?.user.name, email: data?.user.email }, moods: data?.moods, diary: data?.entries, savedQuoteIds: data?.favorites };
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my-mood-and-dairy-journal.json';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Your memories, ready to take with you.');
    }
    return <div id="main-content" className="page-enter settings-page">
  <div className="page-heading"><div>
      <span className="eyebrow">A SPACE THAT FEELS LIKE YOU</span>
      <h1>Your space, your way</h1>
      <p>A few little things to make yourself comfortable.</p>
    </div></div>
  <section className="card">
    <h2><Sun size={20}/> Your atmosphere</h2>
    <p className="muted">Choose the light that feels right for you.</p>
    <div className="theme-options">{[{ id: 'light', label: 'Morning light', icon: Sun }, { id: 'dark', label: 'Evening calm', icon: Moon }, { id: 'system', label: 'Follow my device', icon: Monitor }].map(({ id, label, icon: Icon }) => <button key={id} aria-pressed={theme === id} disabled={themeBusy} className={`theme-option ${theme === id ? 'selected' : ''}`} onClick={() => void themeChange(id)}>
        <div className={`theme-preview theme-${id}`}>
          <div />
          <span />
          <span />
        </div>
        <span>
          <Icon size={16}/>
          {label}
          {theme === id && <Check size={15}/>}
        </span>
      </button>)}</div>
  </section>
  <section className="card">
    <h2><LockKeyhole size={20}/> Keep your space safe</h2>
    <p className="muted">{data?.user.hasPassword ? 'Update your password. You’ll be asked to log in again on all devices.' : 'You sign in with Google. Manage your password in your Google account.'}</p>
    {data?.user.hasPassword && <form className="settings-form" onSubmit={e => void changePassword(e)}>
      <label className="field-label">Current password<Input type="password" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" required/></label>
      <label className="field-label">New password<Input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={10} maxLength={128} autoComplete="new-password" placeholder="At least 10 characters" required/></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button variant="outline" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</Button>
    </form>}
  </section>
  <section className="card">
    <h2><BookIcon /> Your story belongs to you</h2>
    <p className="muted">Download a private copy of your diary, mood history, and saved quote IDs.</p>
    <Button variant="outline" onClick={exportData}><Download size={16}/>Download my data</Button>
  </section>
  <section className="card account-settings-row">
    <div>
      <h2>Until next time</h2>
      <p className="muted">Your little space will be here when you return.</p>
    </div>
    <Button variant="outline" onClick={() => void signOut({ callbackUrl: '/' })}><LogOut size={16}/>Log out</Button>
  </section>
    </div>;
}
function BookIcon() {
    return <Heart size={20}/>;
}
