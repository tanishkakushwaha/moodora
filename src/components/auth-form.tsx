'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Heart, LoaderCircle, ShieldCheck } from 'lucide-react';
import { signupSchema, loginFormSchema } from '@/lib/validation';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Brand } from './brand';
import { Bow, JournalArt } from './moodora-art';
import { request } from './providers';
import { safeAuthDestination } from '@/lib/plans';
import { trackSignupCompleted } from '@/lib/trfyx';

type AuthFields = { name: string; email: string; password: string };

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <span id={id} className="field-error" role="alert">{message}</span>;
}

export function AuthPage({ signup = false, google = false, next = '/dashboard' }: { signup?: boolean; google?: boolean; next?: string }) {
  const destination = safeAuthDestination(next);
  const authQuery = destination === '/dashboard' ? '' : `?next=${encodeURIComponent(destination)}`;
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AuthFields>({
    resolver: zodResolver(signup ? signupSchema : loginFormSchema),
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onBlur',
  });

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get('error');
    if (error) setServerError(error === 'GoogleAccountNotLinked'
      ? 'This email already uses a password. Please log in with your email and password.'
      : 'Google sign-in could not be completed. Please try again.');
  }, []);

  async function submit(values: AuthFields) {
    setServerError('');
    try {
      if (signup) {
        await request('/api/register', 'POST', values);
        trackSignupCompleted();
      }
      const result = await signIn('credentials', {
        email: values.email, password: values.password, redirect: false,
      });
      if (result?.error || !result?.ok) {
        setServerError(signup
          ? 'Your account was created. Please log in to continue.'
          : 'We couldn’t log you in. Check your details, or wait a little if you’ve tried several times.');
        return;
      }
      router.push(destination);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'We couldn’t connect. Please try again.');
    }
  }

  return (
    <main id="main-content" className="auth-page">
      <aside className="auth-art">
        <Brand />
        <div className="auth-art-copy">
          <span className="eyebrow">A LITTLE SPACE TO SIMPLY BE</span>
          <h1>Your feelings<br />deserve a <em>place.</em></h1>
          <p>For the days you bloom.<br />And the days you just need to be.</p>
          <JournalArt />
        </div>
        <div className="auth-art-footer"><Heart size={14} /> Grow gently. At your own pace.</div>
      </aside>
      <section className="auth-form-panel">
        <Link href="/" className="auth-home">← Back to Moodora</Link>
        <div className="auth-form-wrap">
          <Bow className="m-auth-bow"/>
          <h1>{signup ? 'Your little space awaits.' : 'Welcome home.'}</h1>
          <p>{signup ? 'A little more self-care. A little more you.' : 'Take a breath. Make yourself at home.'}</p>
          {google && <>
            <Button className="w-full google-button" variant="outline" disabled={isSubmitting} onClick={() => void signIn('google', { callbackUrl: destination })}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c2-1.8 2.9-4.4 2.9-7.5Z" />
                <path fill="#34A853" d="M12 22c2.7 0 5-1 6.7-2.5L15.4 17c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1H3V16a10 10 0 0 0 9 6Z" />
                <path fill="#FBBC05" d="M6.4 13.8a6 6 0 0 1 0-3.6V7.7H3a10 10 0 0 0 0 8.6l3.4-2.5Z" />
                <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.7l3.4 2.5C7.2 7.9 9.4 6.1 12 6.1Z" />
              </svg>
              Continue with Google
            </Button>
            <div className="auth-divider">or with your email</div>
          </>}
          <form className="auth-form" noValidate onSubmit={handleSubmit(submit)}>
            {signup && <label className="field-label" htmlFor="auth-name">
              Your name
              <Input id="auth-name" autoComplete="name" placeholder="What should we call you?" maxLength={60} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'auth-name-error' : undefined} {...register('name')} />
              <FieldError id="auth-name-error" message={errors.name?.message} />
            </label>}
            <label className="field-label" htmlFor="auth-email">
              Email address
              <Input id="auth-email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'auth-email-error' : undefined} {...register('email')} />
              <FieldError id="auth-email-error" message={errors.email?.message} />
            </label>
            <label className="field-label" htmlFor="auth-password">
              Password
              <div className="password-input">
                <Input id="auth-password" type={showPassword ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} placeholder={signup ? 'At least 10 characters' : 'Your password'} maxLength={128} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'auth-password-error' : undefined} {...register('password')} />
                <button className="icon-button" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <FieldError id="auth-password-error" message={errors.password?.message} />
            </label>
            {signup && <small className="password-hint">A longer password helps keep your little world private.</small>}
            {serverError && <div className="form-error" role="alert">{serverError}</div>}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <><LoaderCircle className="spin" size={17} /><span>{signup ? 'Creating your space…' : 'Signing in…'}</span></> : <>{signup ? 'Create my cozy corner' : 'Log in to my space'} <ArrowRight size={16} /></>}
            </Button>
          </form>
          <p className="auth-switch">{signup ? 'Already have a little space here?' : 'New to Moodora?'} <Link href={`${signup ? '/login' : '/signup'}${authQuery}`}>{signup ? 'Log in' : 'Start your journey'}</Link></p>
          <div className="auth-security"><ShieldCheck size={15} /> A private space. Just for you.</div>
          {signup && <p className="auth-legal">By joining, you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</p>}
        </div>
      </section>
    </main>
  );
}
