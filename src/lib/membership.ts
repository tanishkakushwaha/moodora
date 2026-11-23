export type MembershipRecord = {
  status: string;
  qualifies: boolean;
  currentPeriodEnd: Date | string | null;
};

export function hasPremium(subscriptions: MembershipRecord[], now = new Date()) {
  return subscriptions.some(subscription => subscription.qualifies &&
    ['active', 'trialing'].includes(subscription.status) &&
    subscription.currentPeriodEnd !== null &&
    new Date(subscription.currentPeriodEnd).getTime() > now.getTime());
}
