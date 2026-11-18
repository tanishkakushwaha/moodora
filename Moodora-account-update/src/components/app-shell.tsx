'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { BookOpen, CalendarDays, ChevronDown, Home, LockKeyhole, LogOut, Menu, Smile, X, ChartNoAxesCombined, UserRound } from 'lucide-react';
import { Brand } from './brand';
import { DataBoundary, useApp } from './providers';
import { PageTransition } from './motion';
import { DailyReminder } from './reminders';

const navigation = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/mood-tracker', label: 'Moods', icon: Smile },
  { href: '/diary', label: 'Diary', icon: BookOpen },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/reports', label: 'Reports', icon: ChartNoAxesCombined },
  { href: '/account', label: 'Account', icon: UserRound },
];
const extraLinks = [{ href: '/partner', label: 'Partner' }, { href: '/self-care', label: 'Self-care' }, { href: '/quotes', label: 'Quotes' }, { href: '/insights', label: 'Mood trends' }];
const accountRoutes = ['/account', '/profile', '/settings', '/membership'];
const matchesPath = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
const isActive = (pathname: string, href: string) => href === '/account' ? accountRoutes.some(route => matchesPath(pathname, route)) : matchesPath(pathname, href);
const pageTitles = [{ href: '/settings/subscription', label: 'Subscription' }, { href: '/settings', label: 'Settings' }, { href: '/profile', label: 'Profile' }, { href: '/membership', label: 'Premium' }, { href: '/checkout', label: 'Checkout' }, { href: '/mood-calendar', label: 'Calendar' }];
const mobileNavigation = navigation.filter(item => item.href !== '/calendar');

export function Avatar({ name, image, size = 38 }: { name: string; image?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);
  return <span className="avatar" style={{ width: size, height: size }}>{image && !failed
    ? <img src={image} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    : name.slice(0, 1).toUpperCase()}</span>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data } = useApp();
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width:760px)');
    const update = () => setMobile(media.matches);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(false); };
    update();
    media.addEventListener('change', update);
    window.addEventListener('keydown', escape);
    return () => { media.removeEventListener('change', update); window.removeEventListener('keydown', escape); };
  }, []);
  const current = [...pageTitles, ...navigation, ...extraLinks].find(item => matchesPath(pathname, item.href));
  return (
    <div className="app-shell simple-app moodora-app">
      <button className={`mobile-menu ${menu ? 'menu-open' : ''}`} aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} aria-controls="main-sidebar" onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>
      {menu && <button className="sidebar-backdrop" aria-label="Close menu" onClick={() => setMenu(false)} />}
      <aside id="main-sidebar" inert={mobile && !menu} className={`sidebar ${menu ? 'sidebar-open' : ''}`}>
        <Brand />
        <p className="simple-sidebar-label">a soft place to land ♡</p>
        <nav aria-label="Main navigation">
          {navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenu(false)} aria-current={isActive(pathname, href) ? 'page' : undefined} className={`nav-link ${isActive(pathname, href) ? 'active' : ''}`}><Icon size={20} /><span>{label}</span></Link>)}
        </nav>
        <details className="simple-more" open={extraLinks.some(link => pathname.startsWith(link.href)) || undefined}>
          <summary>More <ChevronDown size={16} /></summary>
          {extraLinks.map(link => <Link key={link.href} href={link.href} aria-current={matchesPath(pathname, link.href) ? 'page' : undefined} className={`nav-link ${matchesPath(pathname, link.href) ? 'active' : ''}`} onClick={() => setMenu(false)}>{link.label}</Link>)}
        </details>
        <div className="sidebar-bottom">
          <p className="simple-private-note"><LockKeyhole size={15} /> Your diary is private.</p>
          <div className="sidebar-user">
            <Link href="/account" className="profile-link" onClick={() => setMenu(false)}><Avatar name={data?.user.name || 'You'} image={data?.user.image} /><span><b>{data?.user.name || 'My account'}</b><small>My account</small></span></Link>
            <button className="icon-button" aria-label="Log out" onClick={() => void signOut({ callbackUrl: '/' })}><LogOut size={18} /></button>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-topbar"><b>{current?.label || 'Moodora'}</b><Link href="/account" className="simple-private-note" aria-label="Open your account"><Avatar name={data?.user.name || 'You'} image={data?.user.image} size={28}/><span title={data?.user.name} style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data?.user.name || 'Your account'}</span></Link></header>
        <main className="app-content"><DataBoundary><DailyReminder/><PageTransition>{children}</PageTransition></DataBoundary><footer className="app-footer">Moodora · A little time for yourself.</footer></main>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Quick navigation">{mobileNavigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={isActive(pathname, href) ? 'page' : undefined}><Icon size={21} /><span>{label}</span></Link>)}</nav>
    </div>
  );
}
