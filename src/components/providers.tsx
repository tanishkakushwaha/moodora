'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { MotionConfig } from 'framer-motion';
export type MoodRecord = {
    id: string;
    date: string;
    mood: string;
    note: string;
};
export type Entry = {
    id: string;
    title: string;
    content: string;
    date: string;
    mood: string | null;
    tags: string[];
    createdAt: string;
};
export type Profile = {
    id: string;
    name: string;
    email: string;
    image: string | null;
    theme: string;
    createdAt: string;
    hasPassword: boolean;
};
export type AppData = {
    user: Profile;
    moods: MoodRecord[];
    entries: Entry[];
    favorites: string[];
};
const Context = createContext<{
    data: AppData | null;
    loading: boolean;
    error: string;
    refresh: () => Promise<void>;
}>({ data: null, loading: true, error: '', refresh: async () => {
    } });
export async function request(url: string, method = 'POST', body?: unknown) {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const json = await res.json();
    if (!res.ok)
        throw new Error(json.error || 'Something went wrong. Try again.');
    return json;
}
export function ThemeProvider({ children }: {
    children: React.ReactNode;
}) {
    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const apply = () => {
            const theme = localStorage.getItem('moodora-pastel-theme') || 'light';
            document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && media.matches));
        };
        apply();
        media.addEventListener('change', apply);
        return () => media.removeEventListener('change', apply);
    }, []);
    return <MotionConfig reducedMotion="user">
  {children}
  <Toaster position="bottom-right" richColors closeButton/>
    </MotionConfig>;
}
export function setTheme(theme: string) {
    localStorage.setItem('moodora-pastel-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
}
export function AppProvider({ children }: {
    children: React.ReactNode;
}) {
    const [data, setData] = useState<AppData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const refresh = useCallback(async () => {
        try {
            const res = await fetch('/api/data', { cache: 'no-store' });
            if (res.status === 401) {
                window.location.assign('/login');
                return;
            }
            const json = await res.json();
            if (!res.ok)
                throw new Error(json.error);
            setData(json);
            setError('');
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load your space.');
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        void refresh();
    }, [refresh]);
    useEffect(() => {
        if (data?.user.id)
            setTheme(localStorage.getItem('moodora-pastel-theme') || 'light');
    }, [data?.user.id]);
    return <Context.Provider value={{ data, loading, error, refresh }}>{children}</Context.Provider>;
}
export const useApp = () => useContext(Context);
export function DataBoundary({ children }: {
    children: React.ReactNode;
}) {
    const { data, loading, error, refresh } = useApp();
    if (loading)
        return <div className="skeleton-grid" aria-label="Loading your space" aria-busy="true">
  <div className="skeleton tall"/>
  <div className="skeleton"/>
  <div className="skeleton"/>
  <div className="skeleton tall"/>
        </div>;
    if (error || !data)
        return <div className="empty-state">
  <h2>A little pause</h2>
  <p>{error || 'We couldn’t load your space.'}</p>
  <button className="button button-primary" onClick={() => void refresh()}>Try again</button>
        </div>;
    return children;
}
export function notifyError(e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
}
