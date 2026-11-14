import { AuthPage } from '@/components/auth-form';
export const metadata = { title: 'Log in' };
export const dynamic = 'force-dynamic';
export default function Page() {
  return <AuthPage signup={false} google={!!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)} />;
}
