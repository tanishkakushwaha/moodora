import { MembershipPage } from '@/components/membership';
import { publicPlans } from '@/lib/stripe';
export const metadata = { title: 'Premium membership' };
export default async function Page() { return <MembershipPage catalog={await publicPlans()}/>; }
