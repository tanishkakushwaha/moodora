import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { CheckoutStart } from '@/components/checkout-start';
import { isPlan, purchaseDestination } from '@/lib/plans';
import { publicPlans } from '@/lib/stripe';
export const metadata = { title: 'Your Premium checkout' };
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  if (!isPlan(plan)) redirect('/pricing');
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?next=${encodeURIComponent(purchaseDestination(plan))}`);
  const catalog = await publicPlans();
  return <CheckoutStart plan={catalog[plan]} testMode={catalog.testMode}/>;
}
