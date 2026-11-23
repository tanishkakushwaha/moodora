# Moodora complete manual testing guide

Use this guide only on the isolated Moodora testing deployment. Its intended custom address is `https://testing.trfyx.com`, subject to domain-owner permission and actual deployment. If that domain has not been authorized, use the separate testing project's verified Vercel address instead. In the instructions below, “test site” means that verified testing address, never `my-moodora.vercel.app`.

This guide describes tests to perform, not results already obtained. Mark a test Passed only after observing its expected result. Google, Stripe and TRFYX checks are Blocked until their separate testing integrations are configured.

## Before you begin

1. Open the NEW Vercel testing project. Confirm the deployment source branch is **testing** and its status is **Ready**. Record the commit ID and URL.
2. Confirm the database provider/project and database are the new **moodora_testing** database, with a dedicated role. Do not import real customer data.
3. Open the test site. Confirm the yellow **Moodora testing** banner. If you see the live production URL, stop.
4. Open `/api/health` on the test site. Expected: `environment: "testing"`, `database: true`. A 503 means the database is not ready; fix configuration before account tests.
5. Prepare two invented test accounts, A and B. Use different email addresses that you control or clearly disposable QA addresses. Record them privately. Use a password of at least ten characters. Do not use real journal text or real card details.
6. Use a normal browser for A and an Incognito window for B. Multiple Incognito windows share one Incognito session; close all existing ones when a genuinely fresh visitor is needed.
7. Press **F12**, click **Network**, and keep it available. Click **Console** to inspect errors when a case fails. Do not paste authentication tokens or secrets into reports.
8. Start a results sheet with columns: Test ID, URL, Action, Expected, Actual, Status, Time/timezone, Screenshot. Use Pass, Fail, or Blocked. “Page opened” alone does not prove its save function works.

## First visit and public pages

| ID | Where to go | What to do | Expected result |
| --- | --- | --- | --- |
| P01 | `/` | Open while signed out. Use navigation links and the labelled mood preview. | Landing page loads, links work; the preview does not create account records or a real saved mood. |
| P02 | `/pricing` | View Free, Monthly and Yearly cards. Toggle monthly/yearly. | Page works without login. Monthly USD 15 and yearly USD 150 appear only when those separate sandbox prices are configured. Disabled/unavailable billing is clear. Selecting a plan uses that card's plan, not the other plan. |
| P03 | `/privacy`, `/terms` | Open links and return to the home page. | Pages render; links are usable; testing marker remains. Analytics controls are covered below. |
| P04 | `/page-that-does-not-exist` | Enter the URL directly. | Moodora's 404 page appears with a working return link, not private data or a crash. |
| P05 | `/robots.txt` | Open in another tab. | All crawlers are disallowed. The testing site's page headers/metadata also say noindex. |
| P06 | `/dashboard`, `/diary`, `/account`, `/reports`, `/settings/subscription` | Try each while signed out. | Redirect to login; no private content is visible in the response or before redirect. |

## Signup and login

| ID | Action | Expected result |
| --- | --- | --- |
| A01 | On `/signup`, leave fields empty, then try an invalid email and a short password. | Helpful field validation; no account created. Signup analytics must not increment for failed validation. |
| A02 | Create account A with valid fields. | Account is created once and the user reaches their space. New accounts start Free. If analytics was allowed/configured, a successful email registration adds one signup event. |
| A03 | Open `/signup` again, enter the EXACT same registered email, fill valid required fields and submit once. | Account-already-exists error; no second account; signup event count does not increase. Make sure the page is Signup, not `/login`. |
| A04 | Log out. Try A's email with an incorrect password, then the correct password. | Incorrect login fails; correct login opens A's data. A repeated login is not a new signup or a payment. |
| A05 | Log in and refresh; close/reopen a tab; use back/forward. | Session remains valid as intended; no duplicate account or private-data mixup. |
| A06 | Create B in the other browser, then switch between A and B. | Accounts remain separate. Visitor counts can differ from account counts because cookies identify browsers, not necessarily people. |
| A07 | If configured, create a new Google test account and then log in with Google again. | Only verified Google emails are accepted. Repeat login is not signup. Note the known coverage gap: Google account creation currently has no `signup_completed` instrumentation; do not mark all-provider signup counts correct based only on email tests. |
| A08 | Use Account → Settings to change A's password. Try the old and new passwords, including an already-open old session. | Old password and old sessions are rejected; new password works. Only use the test account. |
| A09 | Log out and revisit `/api/data` and a private page. | API returns 401; private page returns to login. |

## Daily mood, dashboard and calendar

| ID | Action | Expected result |
| --- | --- | --- |
| M01 | On `/mood-tracker`, choose a mood for today, add a harmless note, save and refresh. | One persisted mood for that date; correct mood/note appears on Home and Calendar. |
| M02 | Change the mood for the same date and save repeatedly. | The existing daily record is updated, not duplicated. Current implementation is one mood record per user/date; no proposed unlimited-per-day feature is assumed. |
| M03 | Save a permitted past date and view it in `/calendar`; change months. | Record appears on the correct local calendar date. Impossible dates/unknown moods are rejected by the API. |
| M04 | Clear/delete a test mood using available controls. | It disappears from A's calendar/history after refresh; B's records are unaffected. |
| M05 | Open `/dashboard` after saving/deleting data. | Entry counts, streak, current feeling and recent entries reflect real data. Empty states work on a fresh account. |
| M06 | Open `/insights` with empty data, then with test moods. | Charts and totals match saved records; no invented emotional trend. Calendar/insight counts must not include B's private records. |

## Diary and forms

| ID | Action | Expected result |
| --- | --- | --- |
| D01 | Open `/diary/new`, submit empty writing, then save a valid short QA entry. | Empty writing is rejected; valid entry saves once and appears in `/diary`. |
| D02 | Open its detail and edit screens, change title/content/date/tags, save and refresh. | Changes persist on the correct entry. Search and filters find it correctly. |
| D03 | Begin editing, then leave before saving. | Unsaved-change protection behaves clearly; canceling navigation preserves the draft. Test browser-specific behavior separately. |
| D04 | Enter the harmless text `<script>QA text</script>` as diary writing. | It appears as text, not executed markup. Never enter real sensitive writing for QA. |
| D05 | Delete only this QA entry and refresh. | Entry and related display counts update; old detail URL does not reveal a deleted record. |
| D06 | In B's browser, try opening A's private diary URL; use developer tools only if comfortable to test another account's edit/delete request. | Private record is not readable; unauthorized mutation returns 404/denial. No other account's record is modified. |

## Partner sharing

1. In A, open `/partner`, create an invitation and record the test code privately. In B, accept that code.
2. Expected: both accounts show the connection, but neither account automatically sees all private records.
3. In A, explicitly share one QA mood/entry. Expected: B can see only the selected shared records and cannot edit/delete A's originals.
4. Unshare the entry. Expected: it stops appearing in B's shared view after refresh.
5. Try an invalid or reused invitation. Expected: clear error, no duplicate membership. Do not wait 24 hours to call expiration tested; use an approved dedicated local scenario for expiry boundaries.
6. Disconnect the QA relationship. Expected: shared access stops; private originals remain with their owners.

## Self-care, reminders, quotes and account settings

| ID | Action | Expected result |
| --- | --- | --- |
| F01 | `/self-care`: start, pause, resume and reset the breathing timer. | Time and controls behave consistently; switching pages does not create payments or signup events. |
| F02 | `/quotes`: save/unsave the same quote repeatedly; test copy/share where the browser supports it. | No duplicate favorites; preference persists after refresh. Unsupported native sharing has a usable fallback. |
| F03 | Account → Settings: change name, allowed HTTPS profile image and theme. Refresh and sign in again. | Values persist; invalid image schemes are rejected; light/dark and system settings remain usable. |
| F04 | Set an in-app reminder a few minutes ahead in Asia/Kolkata. Keep the app open; dismiss it; refresh. | Reminder appears when due, respects dismissal and completed mood, and does not repeat incorrectly that day. It is not a background email/push notification. |
| F05 | Try invalid reminder time/timezone, then disable reminders. | Invalid values are rejected; disabled reminders stop appearing. |
| F06 | Use Settings data export. | Download is valid data for A only; no password hash, provider secret, B's private records or production records. |
| F07 | Use Tab/Shift+Tab, Enter and Escape; test a narrow mobile viewport and reduced-motion setting. | Visible focus, accessible labels, dismissible dialogs, usable navigation, no clipped forms or essential motion. Desktop HTTP tests do not replace this browser check. |

## API checks without creating financial transactions

Most beginners can inspect existing form requests through **F12 → Network → Fetch/XHR**. Click a request, then Headers/Payload/Response. Refreshing a response tab does not rerun a form. Do not copy session cookies, Authorization headers, passwords or raw private writing into bug reports.

| Endpoint | Method and context | Expected result |
| --- | --- | --- |
| `/api/health` | GET | 200 and testing/database-ready marker once configured; 503 during a database outage. |
| `/api/auth/session` | GET, before and after login | Signed-out/empty session versus the correct logged-in test user. No secrets returned. |
| `/api/register` | POST from signup form | 201 for a genuinely new account; 400 for duplicate/invalid data; 429 after rate limits. Do not count errors as successful signups. |
| `/api/data` | GET | 401 signed out; 200 for the correct user's scoped data signed in, with no-store caching. |
| `/api/moods` | POST/DELETE via mood controls | Allowed values persist; invalid dates/moods fail; repeated same-date writes do not duplicate rows. |
| `/api/diary`, `/api/diary/ID` | POST/PUT/DELETE via diary UI | New record 201; owner changes 200; invalid body 400; wrong owner cannot modify it. |
| `/api/profile`, `/api/reminders`, `/api/password` | PUT via Settings | Valid changes save; invalid input fails; password change invalidates previous sessions. |
| `/api/favorites`, `/api/partner` | UI actions | No duplicate favorite; invitation/ownership rules apply. Inspect actual method chosen by the UI. |
| `/api/reports/weekly` | GET as Free user | 403 even if the user manually enters the API address. Premium is checked server-side. |
| `/api/billing/checkout`, `/api/billing/portal` | POST through approved billing UI | Authentication/origin validation applies. Portal without a Stripe customer is 404. Unconfigured billing is unavailable; do not bypass it or manually create production customers. |
| `/api/billing/webhook` | Stripe test delivery | Valid test signature is required. Invalid signature is rejected; live-mode events are rejected. A normal browser GET is not a valid webhook test. |

For origin-protection and cross-account mutation testing, use the automated LOCAL integration runner or work with the developer. Do not send destructive ad hoc requests to a production address. Server logs are checked in the new Vercel testing project for the relevant timestamp/request; an expected 400/401/403 is not automatically a server bug.

## Stripe and Premium tests — separate sandbox only

Run this section only after its sandbox and testing webhook are configured. Do not use the Stripe sandbox already attached to the live Moodora website. These actions create test financial records; record each intended action so expected totals remain clear. Do not refund/cancel existing unrelated records or generate extra payments simply to retry a report.

1. Open `/pricing` while signed out. Select Monthly. Expected: login/signup preserves the monthly selection; after authentication the checkout opens for the same plan.
2. On Stripe, confirm Sandbox/Test mode and USD 15/month BEFORE submitting. For a successful sandbox card test, use Stripe's documented `4242 4242 4242 4242`, a future expiry and any valid three-digit test CVC. Never use a real card.
3. Complete exactly one sandbox payment. Expected: Stripe shows the actual successful amount; Moodora activates Premium only after the verified test webhook. A success URL alone must not grant access.
4. Refresh the confirmation page three times. Expected: no additional payment, conversion or signup. Pageviews are a different metric and can change.
5. Open weekly reports as the new Premium user, compare the report to their saved test moods, then download it. Expected: actual data, correct range/counts and a usable download. Free user B remains blocked.
6. Try opening another subscription checkout for the same active Premium account. Expected: existing-membership protection; do not pay again. A rejected opening must not add a checkout-start event.
7. On a different Free test account, repeat for Yearly only when this additional test is intended. Expected: USD 150/year. One monthly plus one yearly successful initial payment totals USD 165 and two payment conversions; average USD 82.50. Three distinct successful payments USD 15, USD 150, USD 150 total USD 315; average USD 105. These are examples, not pre-existing expected records in the new isolated environment.
8. Close Checkout without paying. Expected: cancellation page and no new paid Premium entitlement/conversion. A checkout_started event may exist because the session really opened; it is not a paid conversion.
9. Use Stripe's documented decline/authentication test scenarios when you intentionally test failure. Expected: clear failure, no successful paid conversion, no unsupported Premium activation. Follow official values rather than inventing card numbers.
10. Manage subscription opens the separate sandbox Customer Portal for the current customer only. Inspect billing interval, payment methods and invoices. Wrong-user access must be denied.
11. With a separately recorded sandbox lifecycle test, schedule cancellation: access follows actual status/paid-through rules. Immediate canceled, unpaid, expired and past_due states must not be accepted as paid Premium by the current entitlement rules. A future period date alone does not override a disallowed status.
12. Test renewal, payment failure, plan changes/proration, refunds and repeated/out-of-order webhooks using disposable sandbox subscriptions/test clocks where supported. Compare distinct Stripe invoice/payment IDs with TRFYX, not just matching amounts. Cancellation is not itself a refund. Keep original transaction currency, paid amount, discounts/taxes/refunds and metric definitions explicit.
13. Check the sandbox webhook delivery log and the new Vercel project's function logs. Expected: successful verified events are applied once; failed processing is retried; no exposed signing secret. Do not call lifecycle tests Passed from unit tests or a confirmation screen alone.

Official test values and provider procedures: [Stripe testing](https://docs.stripe.com/testing), [Stripe Billing testing](https://docs.stripe.com/billing/testing), [Stripe webhooks](https://docs.stripe.com/webhooks). The app's webhook and TRFYX's separately created provider webhook serve different purposes; preserve both testing configurations.

## TRFYX events, counting and attribution

Use only the NEW testing analytics website and its separate sandbox connection. The browser must allow analytics. Disabled analytics, an ad blocker or an opted-out owner may legitimately produce no event; never force tracking or call missing consented events Passed without evidence.

1. Note initial event and revenue totals for the test time range/timezone. Use absolute before/after counts, not a rolling date range that changes mid-test.
2. For a fresh campaign visit, close all Incognito windows, open a new one and paste `https://TEST_HOST/?utm_source=integration_test&utm_medium=manual&utm_campaign=moodora_testing`. Allow analytics while that complete address remains visible. Confirm the campaign appears in the testing traffic dashboard BEFORE a payment test.
3. In Network, filter `collect`. A pageview from the official script should include the test website ID/domain and tagged URL. A 202 response proves request acceptance, not correct campaign aggregation. The preflight row is not another event.
4. Navigate through the app, use back/forward and refresh. The official script handles pageviews; no second manual pageview call exists. Its same-URL one-minute suppression means five rapid refreshes do not necessarily mean five views. Check actual payload types and dashboard scope.
5. Create one successful EMAIL account with consent: expected signup_completed delta +1. Rejected signup, visiting Signup, and repeated login: delta 0. A successful account creation followed by failed automatic login is still a genuine signup. Google signup coverage remains a separate known gap.
6. Open one NEW eligible checkout session with consent: expected checkout_started delta +1. Reusing that same session in the same browser is intended to avoid another accepted event. A different new Session can legitimately add another. Portal visits, active-member rejection and button clicks that fail before a Session is returned are not checkout starts.
7. Complete only the planned sandbox payment. Match its Stripe customer/session/subscription and payment/invoice identifiers with TRFYX without publishing customer information. New Session and subscription metadata should carry df_visitor_id. Missing cookie must not block checkout; missing identity may limit attribution.
8. Compare gross paid totals and the agreed revenue metric. Net, refunded, taxed, discounted or converted-currency totals may differ; write down the formula. Do not sum every historical sandbox payment or count the same invoice plus its PaymentIntent as two purchases without an explicit rule.
9. Compare the same Source, Campaign, Medium and Landing Page dimensions in Dashboard and Revenue Attribution using identical filters. Compare first-touch and last-touch independently. A 100% visitor-match rate does not prove 100% known marketing sources.
10. To distinguish first-touch from last-touch, design two known tagged source visits followed by an approved conversion, preserving/restarting identity only according to the provider's defined model. A single tagged visit cannot distinguish those algorithms. Test multi-touch only if TRFYX actually exposes/supports it; Moodora does not implement that model itself.
11. Expected custom-event example: two successful email registrations and two distinct eligible checkout sessions produce two signup events plus two checkout events. That is four event occurrences, two event names, not necessarily four people or two paid conversions. Renewals may create revenue without a new signup or checkout.
12. The local retry acceptance test is `node --experimental-strip-types scripts/test-trfyx-delivery.mts`. It simulates a rejected request and a retry without any provider/network calls. Passing locally is not proof of the deployed code or live network behavior. Do not inject unknown events or replay real payments to test the helper.
13. Decline analytics on `/privacy#analytics-settings`, refresh, then inspect requests. No tracker should load in that fresh page. Also check another tab that was already open: cross-tab withdrawal is a documented unresolved risk. No mood values, journal text, password or form contents should appear in analytics. Inputs being hidden visually does not prove payload privacy; inspect sanitized payloads.
14. Check for the known report mismatch seen on the live website: a named campaign's revenue in Dashboard versus (none) in the dedicated report. If reproduced here, preserve the evidence and contact TRFYX with filters, time/timezone and sanitized results; do not change Moodora to fabricate the campaign or edit stored revenue.

## Recording and reporting a bug

Copy this template for each separate issue:

```text
Title: A short description of the incorrect behavior
Test URL and path:
Branch and Vercel deployment commit: testing / ...
Date, exact time and timezone:
Browser/device:
Account label: QA-A or QA-B (no real customer details)
Setup / starting counts:
Actions performed:
Expected result:
Actual result:
API status / request ID if available:
Before and after event/revenue counts:
Reproduces every time or sometimes:
Sanitized screenshot or short recording:
Impact: blocks testing / incorrect amount / incorrect access / reporting / appearance
```

First check the URL, date range, selected metric and consent. A Visitors panel cannot be directly compared with a Revenue panel. Existing test accounts logging in again do not add signups. A new successful payment legitimately changes revenue; do not call it a duplicate merely because its amount matches another payment.

Do not clear provider records, delete a sandbox customer with unrelated tests, refund/cancel a subscription, alter a database, disable validation or change a business rule to hide a mismatch. Agree on the fix, test it on this branch, rerun the failing case and regressions, then record the new result. Never merge to main as part of these testing instructions.

## Completion checklist

Call the test run complete only when the required browser cases and APIs have observed results, the separate provider integrations are configured and exercised, access-control and failure cases are checked, every intended financial record reconciles and remaining failures/blocked cases are reported. A clean console, successful build or unit-test count alone is not a complete end-to-end test.
