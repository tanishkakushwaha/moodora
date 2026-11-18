import { PricingPage } from '@/components/pricing';
import { publicPlans } from '@/lib/stripe';
export const metadata = { title: 'Plans and pricing', description: 'Compare Moodora Free, Monthly Premium, and Yearly Premium. Explore before creating an account.' };
export const dynamic = 'force-dynamic';
export default async function Page() { return <PricingPage catalog={await publicPlans()}/>; }
