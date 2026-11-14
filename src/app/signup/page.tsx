import { AuthPage } from '@/components/auth-form';
export const metadata = { title: 'Create your account' };
export const dynamic = 'force-dynamic';
export default function Page() {
  return <AuthPage signup={true} google={!!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)} />;
}
