# Monthly and yearly Premium — implementation and deployment

## Scope and current verification

This phase extends existing Moodora billing. It does not impose new Free quotas,
build AI, restrict old journal/history data, or create exclusive wellness content.
Only implemented weekly reporting benefits are advertised.

New monthly subscriptions require USD 15.00 every month; new yearly subscriptions
require USD 150.00 every year. The public page verifies the actual Stripe Price,
currency, amount, and recurring interval before making a plan available. It never
substitutes a made-up amount when configuration or Stripe requests fail.

The existing monthly Price ID remains supported, including its original currency
and amount. If no new monthly Price is configured, checkout continues to offer
the old monthly Price. Keep the original environment variable unchanged so old
subscribers retain their price recognition. This code does not change existing
customers' Stripe subscriptions or automatically move them onto a different plan.

Automated tests cover price validation, yearly/monthly entitlements, legacy access,
expiry, scheduled cancellation, safe authentication destinations, and savings.
They do not prove that real Stripe webhooks, renewals, plan changes, or Portal
settings have been exercised. Complete the Sandbox checklist below before release.

## Setup in Stripe Sandbox

1. Stay in the same Sandbox as the existing key and customers.
2. Open the Moodora Premium product. Reuse the existing monthly Price if it matches,
   and add the yearly Price:
   - USD 15.00, every month.
   - USD 150.00, every year.
   Use the same product for both Prices so applicable Portal changes can
   be configured together. Do not edit, delete, or repoint the legacy Price.
3. Copy each new Price ID directly from Stripe. Avoid truncating its last character.
4. In Vercel → Project Settings → Environment Variables, configure:

| Name | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Existing server-side Sandbox key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this deployed webhook |
| `STRIPE_PREMIUM_PRICE_ID` | Keep the original legacy Price ID |
| `STRIPE_MONTHLY_PRICE_ID` | USD 15 monthly Price ID |
| `STRIPE_YEARLY_PRICE_ID` | USD 150 yearly Price ID |
| `STRIPE_PORTAL_CONFIGURATION_ID` | Optional explicit Customer Portal configuration |

Never expose secret values in chat, documentation, frontend variables, or GitHub.
No publishable key is needed for this hosted-checkout redirect integration.

## Webhook setup

Use `https://my-moodora.vercel.app/api/billing/webhook`, with Snapshot payloads and
API version `2026-10-28.endive`. Enable:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
customer.subscription.paused
customer.subscription.resumed
invoice.paid
invoice.payment_failed
invoice.payment_action_required
```

Subscription and invoice events retrieve the current Stripe subscription under
an account row lock, validate customer association, and update the local snapshot.
Processed event IDs are committed atomically with updates; duplicates skip repeated
processing. Failed processing returns an error so Stripe retries. No raw card or
webhook payload data is stored. Invoice references support the current parent
subscription shape and the older direct subscription field.

Premium requires a recognized price, an active/trialing status, and a future period
end. Scheduled cancellation retains access while those conditions hold. Canceled,
past-due, unpaid, paused, incomplete, incomplete-expired, or date-expired access is
denied by the existing policy. This phase introduces no failed-payment grace period.

## Customer Portal

Configure payment-method updates, invoice history/PDF access, and cancellation.
Only enable plan switching for supported Prices; decide immediate/prorated versus
scheduled changes in Stripe. Confirm the Portal allows the intended monthly/yearly
switch before advertising that action. Other legacy currencies or differently configured products may require a separate
migration/customer flow; verify Portal eligibility before promising a plan change.
Cancellation-at-period-end is the default product recommendation, not a forced
Stripe Dashboard change made by this code.

The app's `/settings/subscription` page shows current status, the known plan amount,
and the current period/access end. It links to the authenticated customer's Portal
for invoices, cards, cancellation, and configured plan changes. Current period end
is deliberately not labeled an unconditional next charge date.

## Deploy to Vercel

1. Upload the update's files and folders to the repository root, preserving paths.
   Upload the extracted contents, not a ZIP file or its wrapper folder.
2. Commit source, schema, and migration together. The existing `build:vercel`
   command generates Prisma, applies additive migrations, and builds Next.js.
3. Set the environment variables above for the intended deployment environment.
4. Redeploy after changing environment variables and wait for Ready.
5. Open `/pricing` while logged out. Verify enabled plans and displayed amounts.
6. Test each billing option with a different Sandbox account or after correctly
   ending the previous subscription. The system intentionally prevents duplicates.

The new migration adds plan/price/interval/currency/amount metadata, a creation
timestamp, and an event receipt table. Existing rows retain their entitlement
fields. Their initial created timestamp is copied from their previous updated
timestamp; a later sync fills Stripe's actual subscription creation date.
Plan details for old rows populate on a subsequent subscription or invoice event.

Do not reverse/drop these tables on a database that has begun receiving new
subscriptions. If code rollback is required, leave additive columns in place,
retain Price recognition and webhook processing, and reconcile accounts before
changing any subscriptions. Back up the database before production migrations.

## Routes and purchase flow

- `/pricing`: public, accurate available plans and savings.
- `/checkout?plan=monthly|yearly`: validates the plan, redirects anonymous visitors
  to login with an allowlisted internal return destination, then opens checkout.
- Login/signup links and optional Google login preserve that destination.
- `/checkout/success`: reads account state; waits for a verified webhook. It never
  grants access or claims payment success based solely on the URL.
- `/checkout/cancel`: provides a route back to pricing and the user's space.
- `/membership`: existing route retained, now with monthly/yearly choices.
- `/settings/subscription`: existing membership component reused for management.

Checkout checks local and Stripe subscription state, locks the account, reuses a
matching open session, and expires an old open session before selecting another
price. Stripe idempotency keys include the price and previous stored Session ID.
Checkout and Portal creation are rate-limited. Browser inputs cannot select arbitrary
Prices, amounts, customers, user IDs, or subscription ownership.

## Changed-file explanation

| File | Change |
| --- | --- |
| `src/lib/plans.ts` | Plan mapping, price validation, safe auth destinations, formatting and actual savings |
| `src/lib/subscription-state.ts` | Recognized subscription item → stored plan/entitlement metadata |
| `src/lib/stripe.ts` | Verified public catalog, legacy/new plan sync, atomic event receipts and membership metadata |
| `prisma/schema.prisma` | Additional subscription fields and processed event IDs |
| `prisma/migrations/20261118000200_subscription_plans/migration.sql` | Additive database changes |
| `src/app/api/billing/checkout/route.ts` | Plan validation, verified prices, duplicate checks, session switching, limits and outcome URLs |
| `src/app/api/billing/webhook/route.ts` | Event receipts plus renewal/payment invoice and subscription events |
| `src/app/api/billing/portal/route.ts` | Optional Portal config, rate limit and settings return URL |
| `src/app/pricing/page.tsx` | Server-verified two-plan catalog |
| `src/components/pricing.tsx` | Real plan choices, disabled unavailable options, calculated savings |
| `src/components/pricing.css` | Existing public pricing design, included for complete upload |
| `src/components/landing.tsx` | Public pricing links, included for complete upload |
| `src/app/checkout/page.tsx` | Auth-aware validated purchase entry |
| `src/components/checkout-start.tsx` | Checkout loading, automatic opening, retry and abort behavior |
| `src/components/auth-form.tsx` | Preserve validated purchase destination across credentials, Google and auth links |
| `src/app/login/page.tsx`, `src/app/signup/page.tsx` | Pass the return destination to existing auth UI |
| `src/components/providers.tsx` | New membership fields and optional request cancellation |
| `src/components/membership.tsx` | Plan choices, current plan information and management actions |
| `src/app/(app)/membership/page.tsx` | Supply the verified catalog to the retained membership screen |
| `src/app/(app)/settings/subscription/page.tsx` | Protected subscription management route |
| `src/components/payment-outcome.tsx` | Verified-state confirmation and cancellation UI |
| `src/app/(app)/checkout/success/page.tsx`, `src/app/(app)/checkout/cancel/page.tsx` | Protected checkout outcome routes |
| `src/components/app-shell.tsx` | Subscription settings navigation |
| `tests/subscriptions.test.ts` | Price, legacy, yearly, expiry, intent and savings tests |
| `package.json` | Include subscription tests in the standard test command |
| `tsconfig.json` | Restrict checks to application/config/test code, excluding extracted copies and unrelated projects |
| `.env.example` | New variable names and migration guidance without secrets |

## Required Sandbox verification before completion

1. Logged-out visitor can browse `/pricing`; only configured verified plans enable.
2. Monthly selection survives signup, login, Google login if enabled, and switching
   between signup/login. Repeat for yearly.
3. Checkout shows the right USD amount, interval, and total for each plan.
4. Test payment activates access through a signed webhook, and reports open.
5. Opening `/checkout/success` without a paid subscription never grants access.
6. Free users get an authenticated 403 from the weekly report endpoint.
7. Repeated clicks reuse checkout. Switching before payment expires the old Session.
8. A second subscription attempt is rejected, including before webhook arrival.
9. Use Stripe Test Clocks to test renewal, payment failure, recovery and expiry.
10. Replay events, deliver older events, and test an invalid signature.
11. Test scheduled and immediate cancellation and access after period end.
12. Test permitted Portal plan changes, payment methods, invoice PDFs and return URL.
13. Confirm existing legacy subscribers keep access and their original billing.
14. Confirm diary, moods, calendar, partner sharing and reminders still work.

Known pending work: no AI/provider integration, new Free quotas, multi-check-in
schema, new analytics/relaxation content, automated periodic reconciliation,
notification emails, or separate production billing migration in this phase.
End-to-end browser, database migration and actual Stripe lifecycle tests require
a permitted database/network environment and configured Sandbox credentials.

References: [Stripe subscription events](https://docs.stripe.com/billing/subscriptions/webhooks),
[Customer Portal options](https://docs.stripe.com/customer-management/configure-portal),
[Expire an abandoned Checkout Session](https://docs.stripe.com/api/checkout/sessions/expire).
