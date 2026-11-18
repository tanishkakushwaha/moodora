import { MembershipPage } from '@/components/membership';
import { publicPlans } from '@/lib/stripe';
export const metadata = { title: 'Subscription settings' };
export default async function Page() { return <MembershipPage settings catalog={await publicPlans()}/>; }
