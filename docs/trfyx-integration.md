# Moodora: Trfyx analytics and revenue attribution

## Current state

Prepared locally on 19 November 2026. Installation is not yet verified on Vercel or in the Trfyx dashboard. Existing Moodora Stripe webhooks still control subscriptions and Premium access.

## Architecture and scope

Moodora uses Next.js App Router, React, Auth.js credentials/optional Google login, Prisma/PostgreSQL and server-side Stripe Checkout. Public pages and signed-in pages share src/app/layout.tsx. Trfyx was absent before this change. No dependencies, database migrations, environment variables, Stripe keys, prices or Premium rules were changed.

The installation uses the public website ID Wwfhn43v8pg5 and registered domain my-moodora.vercel.app from the supplied installation screen. These values are not secrets. Confirm the ID exactly matches the Copy snippet in Trfyx before deploying.

## Changed files

- src/app/layout.tsx: mounts one shared analytics component; no manual pageview listeners.
- src/components/trfyx-analytics.tsx (new): Next Script installation after analytics opt-in, restricted to the production domain; privacy settings can withdraw consent by reloading the privacy page.
- src/components/trfyx-analytics.css (new): compact responsive preference panel using existing Moodora colors and button classes.
- src/lib/trfyx.ts (new): public configuration, documented deferred-event queue, safe fixed custom properties, checkout attempt deduplication, optional Stripe visitor metadata.
- src/components/auth-form.tsx: signup_completed after successful email registration only. Login and failed registration do not count. Google signup is not counted because this client does not know whether Google created a new account.
- src/components/checkout-start.tsx and src/components/membership.tsx: checkout_started after the server supplies a valid Stripe session. Portal openings do not count. These events are checkout starts, not purchases.
- src/app/api/billing/checkout/route.ts: adds df_visitor_id to new Checkout Session and subscription metadata only when analytics was allowed; adds sessionId to the JSON response for deduplication. The existing url response field and application ownership fields remain. No existing sessions are expired just for analytics.
- src/app/privacy/page.tsx: describes optional analytics and provides controls.
- tests/trfyx.test.ts (new): failure safety, consent, preview exclusion, queue readiness, deduplication, bounded callback wait, cookie parsing and metadata preservation.
- docs/trfyx-integration.md (this file): installation, configuration and verification instructions.

## Privacy and reliability

The script loads only after opt-in on the registered production hostname. Replay, heatmaps, automatic forms and automatic file downloads are disabled. No identify command, email fallback, journal text, mood values, passwords, card details, or user-entered event properties are added. Standard page tracking includes page addresses/titles and referrers; record identifiers may appear in route paths. Avoid putting personal writing into URLs or page titles in future changes.

A first-party preference cookie records allow/decline. The visitor cookie is optional: absent or malformed values do not break checkout. Withdraw on /privacy#analytics-settings to unload the running tracker through a page reload and remove the visitor cookie on the known host/domain. This does not delete historical data. Consent requirements and the hosted service operator's privacy identity/retention details still require operator review.

Custom events queue before script readiness. Checkout gives the documented delivery callback up to 700 ms before navigating. A persistent marker attempts to count each Checkout Session once; memory is the fallback when storage is blocked. This is best-effort deduplication and delivery, not guaranteed exactly-once network delivery. A blocked script, immediate navigation, storage restrictions, or network loss may omit events. Automatic pageview handling is left entirely to Trfyx.

## Upload and deployment: beginner steps

1. Open Desktop/Moodora-Trfyx-update.
2. Select the three folders INSIDE it: src, tests and docs.
3. Open https://github.com/tanishkakushwaha/moodora/upload/main in your browser.
4. Drag those three folders into the upload area. Do not upload the outer Moodora-Trfyx-update folder or a ZIP.
5. Confirm paths start with src/, tests/ and docs/, not Moodora-Trfyx-update/.
6. Review and commit the upload as Add Trfyx analytics and Stripe attribution.
7. Wait for the latest Vercel deployment to show Ready. If it fails, save the first error; do not disable TypeScript checks.
8. Open https://my-moodora.vercel.app in a normal browser and choose Allow analytics. Tracking does not run on localhost or preview deployments.
9. Return to Trfyx Settings > Installation and click Verify installation. Verification may need a real opted-in visit first; a machine-only scanner will not grant visitor consent.

No additional environment variables or secrets are needed for this code. Do not paste Stripe secret keys into GitHub, public environment variables, screenshots, chat or frontend code.

## Stripe connection: required in Trfyx

Open the site's Integrations > Stripe section in Trfyx. Follow its displayed provider connection instructions using the same Stripe account and sandbox/test mode as Moodora. Trfyx creates its own provider webhook. Preserve Moodora's existing /api/billing/webhook and STRIPE_WEBHOOK_SECRET; they independently activate and synchronize Premium. Never replace those settings with Trfyx's webhook.

The existing client_reference_id is Moodora's user ID and remains unchanged. New sessions add metadata[df_visitor_id]; subscription_data[metadata][df_visitor_id] enables subscription attribution. Existing customers do not need new customer metadata. Previously created sessions/subscriptions are not retroactively tagged by this change. Test with a fresh sandbox user and new session after allowing analytics. Provider permissions, availability on the workspace's plan, successful connection, and actual revenue ingestion still need verification in the user's dashboard. Do not infer revenue from checkout/success or custom events.

## Testing report and checklist

Local results: 51 existing regression tests passed; all 8 new analytics tests passed; TypeScript passed; the isolated production build passed. The final privacy wording/preference synchronization adjustment also passed TypeScript. No browser, live Trfyx collector, Stripe provider connection, or revenue lifecycle test has been completed. The live checks below remain pending until deployment and dashboard access.

| Check | Expected | Verification |
| --- | --- | --- |
| Source build/typecheck | Production build and TypeScript pass | Local commands below |
| Decline analytics | No Trfyx script or collector requests; login/checkout still work | Browser required |
| Allow analytics | One script.js request and POST collect response 202 | Browser Network required |
| SPA navigation | Route changes appear without manual pageview calls | Browser/dashboard required |
| Refresh/back/forward | Trfyx applies its documented same-URL one-minute suppression | Browser/dashboard required |
| Email signup | One signup_completed only after real registration succeeds | Browser/dashboard required |
| Failed signup/login | No signup_completed from these actions | Browser/dashboard required |
| Checkout retry | Reused session does not generate another custom attempt in the same browser with storage | Browser/dashboard required |
| Missing cookie/ad blocker | Checkout still opens; attribution may be absent | Browser/Stripe required |
| Stripe metadata | Fresh Session and Subscription carry matching df_visitor_id and existing Moodora fields | Stripe dashboard required |
| Stripe payment | Actual successful sandbox payment appears in Trfyx through the connected provider | Stripe/Trfyx required |
| Renewal/refund/cancellation | Provider reports actual revenue adjustments; Moodora subscription state remains correct | Stripe sandbox lifecycle required |
| Withdraw analytics | Privacy control reloads; no tracker on next page load; checkout remains usable | Browser required |
| Journal confidentiality | Inspect requests for absence of private writing/health values | Browser Network required |

Run existing regression tests: npm test
Run analytics tests: node --experimental-strip-types --test --test-isolation=none tests/trfyx.test.ts
Run TypeScript: npx tsc --noEmit --incremental false
Run source build: npm run build

Do not run production database migrations just to test analytics. The Vercel build continues to use the project's existing build:vercel script.

For live testing, open browser developer tools > Network, filter collect, then allow analytics and navigate Home > Pricing > Login. Check successful requests and payloads. Use a tagged landing URL such as https://my-moodora.vercel.app/?utm_source=integration_test&utm_medium=manual&utm_campaign=trfyx_setup before starting the test subscription. Do not put names, emails or journal content in query parameters. A second refresh within one minute may intentionally not add another pageview. Automated/headless browsers may be excluded by Trfyx; use a regular browser. Check that df_ignore is not enabled when testing.

Custom-event goals can be added in Trfyx using the exact names signup_completed and checkout_started if supported by the workspace plan. Pageviews and revenue are different metrics; do not create a purchase metric from a checkout click.

## Official references

- https://help.trfyx.com/install-tracking
- https://help.trfyx.com/agent
- https://www.trfyx.com/privacy

The implementation follows these published installation and provider-attribution instructions. No private collector endpoint, manual pageview API or custom purchase protocol was invented.
