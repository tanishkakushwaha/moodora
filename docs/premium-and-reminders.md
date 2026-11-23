# Premium, reminders, and weekly reports

For the current monthly/yearly subscription setup, see
[Monthly and yearly subscriptions](monthly-yearly-subscriptions.md).
The instructions below describe the original single-price setup.

## Features

- Home has links to weekly reports, reminder settings, and membership.
- Settings → Daily reminders saves an opt-in time and IANA time zone per account.
  A reminder appears inside Moodora when it is open at or after that local time,
  unless that local day's mood is already recorded or the reminder is dismissed.
  Dismissal lasts for that day in that browser. No background notification or email
  is sent. Diary writing does not dismiss a mood reminder.
- More → Premium membership has subscription checkout and a Stripe customer portal
  for updating payment information or cancelling. Existing free features remain free.
- More → Weekly reports shows seven days ending on the selected date, all tied most
  frequent moods, mood counts, and the change in check-in count from the preceding
  seven days. Missing days have no mood assigned. Reports can be downloaded as text.
  They describe saved observations and do not diagnose mental health.

## Local setup

1. Run `npm run db:deploy` to apply the additive migration, then `npm run dev`.
2. Log in. Configure a daily reminder in Settings. Set it to a time earlier than
   now and choose a date without a mood entry to see the reminder.
3. Verify that weekly reports ask free users to explore Premium. Premium is enforced
   in `/api/reports/weekly`, not just the interface. No client-supplied account or
   membership value is trusted.

## Stripe sandbox setup

The existing `buy.stripe.com/test_...` payment button is only a checkout demo.
It does not activate Premium. Membership uses a separate recurring checkout tied
to the signed-in account; no user ID is accepted from browser input.

1. In your Stripe sandbox, create **Moodora Premium** and a **recurring** price.
   Choose the amount and billing interval yourself. Copy the `price_...` ID.
2. Add `STRIPE_SECRET_KEY`, `STRIPE_PREMIUM_PRICE_ID`, and
   `STRIPE_WEBHOOK_SECRET` as server environment variables. Do not put them in
   GitHub code, frontend variables, screenshots, or chat.
3. Register `https://my-moodora.vercel.app/api/billing/webhook` in Stripe for:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy that endpoint's signing secret to `STRIPE_WEBHOOK_SECRET` in Vercel.
   When testing locally with Stripe CLI, use the CLI's own signing secret instead:
   `stripe listen --forward-to localhost:3000/api/billing/webhook`.
5. Enable Stripe's hosted customer portal, including cancellation and payment
   method updates. Leave plan switching disabled unless additional prices are
   explicitly supported by the application.
6. Deploy, open More → Premium membership, and subscribe with test card
   `4242 4242 4242 4242`, any future expiry, and any three-digit CVC.
7. Confirm Stripe delivers the webhook successfully, Premium becomes active, and
   weekly reports open. Test cancelling at period end, immediate cancellation,
   renewal, failed renewal, repeated delivery, and out-of-order delivery as well.

Only an active or trialing subscription containing the configured price and a
future current-period end grants Premium. Failed payments that put a subscription
in `past_due` or `unpaid` suspend access; cancelling at period end retains access
until the paid-through date. Configure Stripe's retry/cancellation rules to match
this policy. Every relevant event retrieves the subscription's current state
under an account row lock so delayed or repeated events cannot replay old access.

The Stripe REST adapter pins API version `2026-10-28.endive`; configure the webhook
endpoint to the same version. It verifies the raw request body with HMAC-SHA256,
a five-minute timestamp tolerance, and constant-time signature comparison.
Checkout uses one stored session per account and reuses open sessions. Completed
sessions must be reconciled before another subscription can be created.

## Vercel deployment

Commit the code and migration together. The existing `build:vercel` command runs
`prisma migrate deploy` before building. Add the three Stripe variables for the
intended Vercel environment, then deploy again after changing them.

If billing variables are absent, Moodora still works: checkout is disabled and
membership displays as unavailable. This does not grant free Premium access.

Before live billing, activate the Stripe account, create a live recurring price,
use live keys and a live webhook endpoint secret, enable the live customer portal,
and redeploy. Never mix sandbox customer IDs with live keys. Use a separate sandbox
database for testing subscriptions; when moving an existing test database live,
explicitly reconcile/remove test-only Stripe mappings before selling memberships.

References: [Subscriptions](https://docs.stripe.com/billing/subscriptions/build-subscriptions),
[Webhook handling](https://docs.stripe.com/events/manage-webhook-endpoints),
[Customer portal](https://docs.stripe.com/customer-management).
