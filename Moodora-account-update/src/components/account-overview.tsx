'use client';
import Link from 'next/link';
import { ArrowRight, Bell, Crown, Settings, UserRound } from 'lucide-react';
import { useApp } from './providers';
import { Button } from './ui/button';

export function AccountOverview() {
  const { data } = useApp();
  if (!data) return null;
  const membership = data.membership;
  const manageBilling = membership.premium || (membership.canManage && membership.status !== 'free');
  const planName = membership.premium ? membership.planId === 'yearly' ? 'Yearly Premium' : membership.planId === 'monthly' ? 'Monthly Premium' : 'Moodora Premium' : 'Moodora Free';
  const links = [
    { href: '/profile', label: 'Profile', description: 'Your name, email, and profile picture.', icon: UserRound },
    { href: '/settings#daily-reminders', label: 'Daily reminders', description: 'Choose a time for your daily mood check-in.', icon: Bell },
    { href: '/settings', label: 'Settings and privacy', description: 'Appearance, account security, and your data export.', icon: Settings },
  ];
  return <div id="main-content" className="page-enter account-overview">
    <div className="page-heading"><div><span className="eyebrow">YOUR PERSONAL SPACE</span><h1>My account</h1><p>Your profile, preferences, and membership, all in one place.</p></div></div>
    <section className="card account-membership" aria-labelledby="account-plan-heading"><div><span className="eyebrow"><Crown size={15}/> YOUR MEMBERSHIP</span><h2 id="account-plan-heading">{planName}</h2><p>{membership.premium ? 'Your weekly mood reports and downloads are included.' : 'Your mood tracking, journal, and everyday self-care tools are here for you.'}</p>{membership.premium && membership.currentPeriodEnd && <small>{membership.cancelAtPeriodEnd ? 'Premium access until ' : 'Current period ends '}{new Date(membership.currentPeriodEnd).toLocaleDateString()}.</small>}{!membership.premium && membership.status !== 'free' && <small>Billing status: {membership.status.replaceAll('_', ' ')}. Review your subscription for details.</small>}</div><Button asChild><Link href={manageBilling ? '/settings/subscription' : '/pricing'}>{manageBilling ? 'Manage subscription' : 'Upgrade to Premium'}<ArrowRight size={16}/></Link></Button></section>
    <nav className="account-links" aria-label="Account options">{links.map(({ href, label, description, icon: Icon }) => <Link className="card account-link" key={href} href={href}><span className="account-link-icon"><Icon size={22}/></span><div><h2>{label}</h2><p>{description}</p></div><ArrowRight size={18}/></Link>)}</nav>
  </div>;
}
