import '@/lib/testing-runtime';
import { AuthPage } from '@/components/auth-form';
export const metadata = { title: 'Create your account' };
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthPage signup={true} next={next} google={!!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)} />;
}
