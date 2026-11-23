> Historical Moodora integration evidence. For this testing branch, use TESTING_SETUP.md and MANUAL_TESTING.md. Do not run old main-folder or production deployment commands from this history.

# Moodora Revenue Attribution Audit — 19 November 2026

Status: IN PROGRESS. This is an evidence-based partial audit, not an end-to-end completion certificate. Following the owner-run failing test, F01 and F02 were fixed and retested LOCALLY. No production deployment, production data, real customer transactions, prices, settings or secrets were changed. No support message was sent on the owner's behalf. Earlier no-code-change statements below describe the preceding read-only audit phases.

## Latest local fix and retest — F01 and F02

The owner independently ran scripts/test-trfyx-delivery.mts and pasted its failing output: 1 attempt instead of 2, 0 accepted events instead of 1, and an erroneous sent marker after a simulated HTTP 500. After that confirmation, the local helper was corrected; no production upload or deployment was performed.

Changes:

- src/lib/trfyx.ts: only HTTP 200/202 callbacks persist accepted-delivery markers. Explicit HTTP errors release the attempted-session guard for a later user retry. Concurrent callers share one in-flight promise instead of redirecting or sending independently.
- Uncertain delivery (timeout, missing status, transport ambiguity) is not marked successful. A memory guard prevents automatic repeated sends from this same page. A later callback can confirm acceptance or release a definite rejection. Across full reloads/other browsers exact-once delivery remains unguaranteed; this limitation is not disguised as a successful delivery.
- src/lib/trfyx.ts: cookie-access exceptions now fail analytics eligibility closed, resolving the checkout tracking helper instead of rejecting business navigation. The existing localStorage-failure fallback remains.
- tests/trfyx.test.ts: accepted callback fixtures now use actual status values. Added regression checks for explicit rejection followed by successful retry, concurrency, timeout without false success, late acceptance, late rejection/retry, and cookie SecurityError. The full analytics suite has 13 tests.
- scripts/audit-trfyx-findings.mts: F01/F02 now assert fixed local behavior; L01 browser-local deduplication and R01 cross-tab notification limitations remain documented.

Retest: the SAME owner-runnable delivery test now prints expected attempts 2 / actual 2; accepted events 1 / actual 1; marker after failure false / actual false; PASS. The analytics regression suite passed all 13 tests. The existing regression suite passed all 51 tests, and npx tsc --noEmit --incremental false passed (exit 0). Total regression tests after this patch: 64 (13 analytics + 51 existing). No live attribution/report fixes are claimed.

No Stripe/customer/session ownership, plan, price, currency, metadata, webhook, Premium entitlement or redirect code changed. Existing old localStorage markers were NOT cleared: they cannot reliably be distinguished as previously accepted versus erroneously stored failures. Past missing events are not retroactively repaired by this code. Browser-local uncertainty and historical gaps remain in the audit.

Campaign-report inconsistency in Trfyx, Google-signup coverage and cross-tab consent were not fixed by this patch. Local proof does not establish live deployment or provider-side correctness. A separately reviewed upload and live retest are still required.

## Owner independently confirms corrected delivery test

The owner pasted a fresh VERSION 2 result at 2026-11-19T10:48:58.186Z (16:18:58.186 IST). The loaded helper was /home/tanishka/Desktop/My Moodora/src/lib/trfyx.ts with SHA-256 prefix 23d11a2688e8b25a, matching the corrected file tested by the agent.

Observed: expected attempts 2 / actual 2; expected accepted events 1 / actual 1; expected sent marker after failure false / actual false; PASS: failed delivery can retry. This independently confirms the offline local acceptance test on the owner's computer. Earlier repeated FAIL transcripts after the local patch were not reproducible with this identified current file and test run; no unsupported explanation for those prior transcripts is asserted.

Scope: local simulation of F01 only, with no network, payment or production data. This does not establish a deployed fix, repair historical counts, resolve Trfyx campaign-report inconsistency, verify provider aggregations or establish full lifecycle correctness. No upload, commit, push or deployment has been performed by the agent.

## Guided post-upload refresh check

The owner approved publishing the reviewed tracking fix. The agent prepared a one-file upload at Desktop/Moodora-tracking-fix/trfyx.ts with the owner-tested fingerprint and provided the exact GitHub src/lib destination. The owner subsequently reported no deployment error and a clear browser console. The deployed commit, bundle version and Vercel Ready state have not been independently inspected; do not treat those reports as proof of the production helper revision.

For a read-only conversion-refresh test, the owner opened https://my-moodora.vercel.app/checkout/success in an authenticated browser and confirmed refreshing three times. The owner then reported TRFYX Revenue, filtered to 19 November, still showed USD 165 and two conversions.

Expected delta from refreshing an existing confirmation page without another payment: revenue USD 0; conversions 0. Observed reported delta versus the prior USD 165 / two-conversion baseline: USD 0 and 0. Assessment: MANUAL CHECK MATCHES EXPECTATION; no duplicate conversion was observed for those three refreshes. No additional payment was requested or made by the agent. Pageview counts were not part of this assertion and may change under the vendor's pageview rules.

This check does NOT verify rejected-delivery retry behavior on the live deployment, exactly-once behavior across browsers or webhook replays, campaign-report consistency, or current signup/checkout event totals after the second test. It also does not independently reconcile provider ledger records or prove all browser console/network paths are clear.

## Guided event-count comparison after second test

After selecting the agreed 19 November range, the owner reported signup_completed = 2 and checkout_started = 2 (response: 2-2). Against the two reported test signup/checkout flows, the manual counts match: two signup events, two checkout events, four custom-event occurrences across two distinct event names. This is not evidence of four unique people, and it is not a complete total of pageviews, heartbeats or engagement events.

Classification: MANUAL REPORTED COUNTS MATCH THE SIMPLE CONTROLLED FLOW. No missing or extra signup/checkout event is demonstrated by these totals. Identity-level joins, exact Session IDs, per-event timestamps, event retention, delivery failures in production and all-provider signup coverage are still unverified. Two conversions and USD 165 remain the financial snapshot from the preceding guided refresh check. Do not infer that the local fixes alone produced these already-matching totals or that a global deduplication guarantee has been verified.

## Guided rejected-checkout count check

The owner was instructed to open /checkout?plan=monthly while signed into an existing Premium-active account, without completing a payment. Expected: membership rejection and no checkout_started increment. After that instruction and clarification, the owner reported checkout_started = 2, unchanged from the prior 2-event baseline.

Assessment: MANUAL COUNT CHECK MATCHES EXPECTATION; no extra checkout_started event observed for this instructed negative path. The exact rejection message, HTTP response, Session record and Vercel log were not captured independently. No new conversion, payment or production mutation was performed by the agent. This result does not prove all error paths or in-flight analytics retry cases behave correctly.

## Additional genuine registration — signup baseline now 3

During the next checks the owner reported logging into two existing accounts and recently creating another new account. They then reported signup_completed = 3 and checkout_started = 2. Asked whether this represented one new account without opening another Stripe checkout, the owner confirmed the interpretation (its is correct).

Expected custom-event changes for that stated action: signup_completed +1, checkout_started +0. Observed reported changes from the earlier 2/2 baseline: signup 2 to 3, checkout 2 to 2. Assessment: MANUAL REPORTED COUNTS CONSISTENT WITH THE STATED FLOW; no duplicate or missing event established here. Current reported custom-event baseline is three signup events plus two checkout events, five occurrences across two event names. This does not mean five unique users or five conversions.

The prior financial snapshot remains USD 165 / two conversions; current financial totals have not been re-read after this registration and must not be represented as a fresh ledger verification. Repeated-login suppression is consistent with the reports, but exact action timestamps and identity joins were not captured.

The planned duplicate-email signup rejection test has NOT yet been completed: the supplied screenshot showed /login, followed by clarification of logins and a genuine new registration. Do not mark duplicate-email rejection as passed or treat the legitimate third signup as a duplicate-event bug. A new account and a repeat login are different actions.

## New unexplained revenue increase — screenshot at 16:56 IST

Owner screenshot of the main TRFYX Dashboard for 19 November displays four visitors, USD 315 revenue, 75.00% payment rate and USD 78.75 revenue per visitor. The previous guided financial baseline was USD 165 / two conversions. Observed revenue delta: +USD 150. The screenshot does not show current payment rows, transaction identifiers or a conversion total.

Classification: UNEXPLAINED CHANGE REQUIRING RECONCILIATION, NOT A CONFIRMED DUPLICATE-REVENUE BUG. The owner had recently reported a genuine extra account creation but has not yet confirmed whether another payment occurred. Other possible causes (a separate sandbox payment, recurring invoice, changed subscription, ingestion delay/backfill, duplicate record, changed filter scope) remain hypotheses, not conclusions. No new financial action was requested in the intervening refresh/login/source-report checks.

Arithmetic: USD 315 / 4 = USD 78.75, so the displayed revenue/visitor calculation is consistent. 75% of four is three, but the actual definition and denominator of payment rate must be checked; this screenshot alone does not prove three distinct purchases or three paying customers. Do not infer a new average order value or conversion count from this panel.

The screenshot still has Visitors selected, not the Revenue metric needed for the Sources comparison. Pause that dimension comparison while reconciling this monetary change. Next evidence: whether the owner intentionally completed another USD 150 sandbox payment, and current Revenue recent-payment rows with identifiers/timestamps sufficient to distinguish independent Stripe transactions from duplicate ingestion. Hide customer identity and never share secrets. No refund, cancellation, deletion, new transaction, or report correction should be performed merely to investigate this change.

## Three-payment reconciliation screenshot — 16:58 IST

Latest owner screenshot: Revenue Overview for the 19 November custom range shows USD 315, three conversions, USD 105 average order value and 100% visitor attribution (3 of 3). Recent payments contains three rows: USD 150 Direct, USD 150 Campaign, and USD 15 Direct. All three rows show Stripe and Explicit Session (high). Displayed customer labels differ, but stable Stripe Payment/Invoice/Customer IDs were not provided; no customer emails are retained here.

| Check | Expected from the owner's three reported payments | Screenshot | Assessment |
| --- | --- | --- | --- |
| Payment-row count | 3 | 3 | Matches visible count; distinct provider IDs still required |
| Gross revenue | USD 15 + USD 150 + USD 150 = USD 315 | USD 315 | Arithmetic and reported action baseline match |
| Conversions | 3 under an eligible-payment conversion definition | 3 | Matches simple controlled-flow expectation |
| Average order value | USD 315 / 3 = USD 105 | USD 105 | Arithmetic correct |
| Visitor-match rate | 3/3 = 100% if all joins are correct | 100%, Explicit Session (high) on all three | Displayed ratio consistent; identity joins unverified |
| Row-channel totals | Direct USD 150 + USD 15; Campaign USD 150 | Direct USD 165, Campaign USD 150 across rows | Rows partition USD 315 correctly |
| First Touch breakdown | Requires touch-model definition and corresponding source records | Unattributed USD 315, three conversions | Unresolved attribution result despite explicit visitor matches and a Campaign-channel row |

The First Touch display is not evidence of missing financial ingestion. A visitor match and a populated marketing touch are different properties. Combined with the earlier main-dashboard trfyx_setup USD 150 result and specialized Campaign (none) result, it strengthens the need for Trfyx to reconcile its reporting dimensions, but does not identify the underlying database/query cause.

Current conclusion: no gross-revenue addition or AOV division error is demonstrated; no duplicate Stripe transaction is demonstrated by the screenshot. Independent Stripe Sandbox ledger reconciliation, all three distinct provider identifiers, status/currency, refunds/fees/tax treatment and actual billing intervals are still pending. A matched visible count does not establish a complete or duplicate-free provider ledger.

Last confirmed custom-event snapshot was signup_completed 3 / checkout_started 2 before reconciling this third payment. Its post-payment checkout count still needs collection and must not be presumed to remain 2 or to have become 3 without evidence.

## Stripe sandbox screenshot reconciliation — 17:02 IST

Owner screenshot of Stripe Transactions visibly shows Sandbox / Test mode. The three visible records dated 19 November 2026 are USD 150 Succeeded at 16:46, USD 150 Succeeded at 14:50, and USD 15 Succeeded at 13:24. All three descriptions are Subscription creation. Older 18 November records are visible below but are outside the agreed day and excluded from this comparison. Customer details and card information are intentionally not retained in this report.

Compared with the supplied TRFYX 19 November screenshot: three payment rows, USD 315 gross revenue, three conversions, USD 105 average order value. USD 150 + USD 150 + USD 15 = USD 315; USD 315 / 3 = USD 105. Amount/currency and visible successful-payment counts MATCH across the screenshots. No gross-amount discrepancy is observed for these three records.

Classification: PASS FOR THE DISPLAYED SNAPSHOT GROSS-AMOUNT/COUNT COMPARISON. This is owner-supplied visual evidence, not autonomous provider API/database access. It does not prove provider-ID uniqueness, event-level joins, complete export coverage, refund/net/tax/fee definitions, or future/full-day totals. Stripe's displayed timezone was not explicitly shown; no timestamp-boundary test is inferred. Do not sum the older 18 November rows into the 19 November baseline.

No extra Stripe payment, refund, cancellation, webhook replay, record update or deployment was performed by the agent. The third row's explicit Succeeded status is now visually confirmed, but yearly/monthly billing intervals were not displayed, so USD 150 remains consistent with, rather than independent proof of, yearly billing.

Next event check: obtain checkout_started after the third payment. The last reported value 2 preceded the third confirmed payment. If all three successful initial subscriptions came through distinct consented Moodora checkout sessions, the expected count is 3; don't declare a missing event until the actual count and route/session eligibility are known. Repeated refreshes and repeated logins are not new checkout sessions.

## Scope and comparison period

Confirmed by the owner: 19 November 2026, full day, Asia/Kolkata (UTC+05:30).

Use start-inclusive 2026-11-18T18:30:00.000Z and end-exclusive 2026-11-19T18:30:00.000Z. This boundary conversion was checked in a local Node diagnostic. If reviewing before the end of the day, figures are provisional. Do not compare a calendar-day report with a rolling 24-hour or seven-day report.

Owner-confirmed manual baseline: one successful signup, one time reaching the Stripe payment form, and one successful USD 15 payment on 19 November. Broader rules for repeated sessions, Google signup, retries, refunds, renewals and unique-event definitions remain to be agreed. Earlier dashboard screenshots alone were not the independent expected baseline.

## Architecture and access

The local Moodora checkout is Next.js App Router + Auth.js + Prisma/PostgreSQL + server-side Stripe REST calls. Trfyx's script handles pageviews and supported custom events. Moodora adds visitor metadata to new Stripe Checkout Sessions/subscriptions. Trfyx's separate Stripe integration ingests revenue; Moodora's webhook independently manages Premium state.

Moodora's database has User, Subscription and StripeWebhookEvent records. It does not contain Trfyx's event warehouse, source-classification code, campaign aggregation SQL, first-/last-touch reporting implementation, or revenue ledger. A current subscription price is not a ledger of actual paid invoices: multiplying it by subscriber count would not verify revenue.

No authenticated access is available here to the private Trfyx dashboard, Stripe transaction list, Vercel runtime logs or deployed database. Read-only web attempts to the public site and /api/data were inaccessible from this environment; this is an access limitation, not evidence of a site failure. The local repository also has many existing uncommitted changes, so matching it to the exact deployed commit remains necessary.

## Evidence verified so far

1. Owner-provided browser screenshot: collect XHR HTTP 202, preflight HTTP 204.
2. Owner-provided privacy screen: analytics allowed.
3. Owner-provided integration screen: Stripe Connected after sandbox restricted-key setup.
4. Owner-provided Trfyx revenue screen: USD 15.00, 1 conversion, 100% attribution, one Explicit Session (high) visitor match. Customer identity is deliberately omitted from this report. The Stripe source transaction has NOT independently been reconciled.
5. Owner-provided Events screen: signup_completed count 1 and checkout_started count 1, one visitor shown for each event. These counts must not be summed into unique people. The exact calendar-day totals still need a matching filter/export.
6. A separate overview screenshot: 3 visitors, USD 15 revenue, 33.33% payment rate, USD 5 revenue/visitor. Arithmetic is internally consistent: 15/3=5 and 1/3 rounds to 33.33%. This is not proof that ingestion or the underlying transaction list is complete.
7. Tagged pageview payload screenshot: correct website ID and tagged page URL. Campaigns remained empty; revenue channel Direct; first-touch grouping Unattributed; campaign grouping (none). The selected date range included the test, but exact dashboard timezone/filter equivalence is not independently verified.
8. Downloaded public tracker /home/tanishka/Downloads/script.js was inspected, not modified or executed. It forwards window.location.href and uses a sliding 30-minute session cookie. There is no browser UTM classification function in that version. Refreshes do not necessarily create a new session.

## Expected versus actual

Initial one-payment baseline comparison, BEFORE the later second test payment: owner-reported values after being instructed to select Today (19 November). This is a guided manual comparison, not independent access to Stripe/TRFYX exports or their databases. Stripe payment status was reported Succeeded, date 19 November at 13:24; its display timezone was not shown and remains unverified. Report/dashboard timezone equivalence is still pending.

| Metric | Expected | Actual available | Status |
| --- | --- | --- | --- |
| Successful email signup custom events | 1 | Owner reports signup_completed = 1 | Matches reported baseline; manual check |
| Checkout-start custom events | 1 | Owner reports checkout_started = 1 | Matches reported baseline; manual check |
| Total business custom events for these two names | 2 | 1 + 1 = 2 | Arithmetic matches; not all tracker event types |
| Unique event names | 2 intended names | 2 named event types reported | Matches names only; not unique users/actions |
| Total events including pageviews/engagement/heartbeats | Rules and complete event ledger required | Not provided | Not verified |
| Unique customers/people/actions | Definition and identifiers required | Per-event visitor counts do not prove cross-event identity | Not verified |
| Successful payments | 1 | Owner reports one Stripe Succeeded payment of USD 15 | Manual baseline established; ledger completeness pending |
| Conversions | 1 | Owner reports TRFYX Today = 1 | Matches reported baseline; eligibility/deduplication edge cases pending |
| Total revenue for the one successful payment | USD 15 gross payment amount | Owner reports TRFYX Today = USD 15 | Matches reported gross amount; net/refund/tax policy and ledger reconciliation pending |
| Visitor-matched revenue | USD 15 if that payment is correctly visitor-linked | USD 15 with 1 conversion and 100% attribution reported; earlier row Explicit Session (high) | Matching amount observed; correct customer/source join not independently verified |
| Campaign revenue for original untagged payment | No campaign expectation was established before this original payment | Earlier campaign (none); owner later confirmed no tagged entry before payment | Not a demonstrated bug; see later tagged test and R02 |
| Attribution percentage | 1 matched / 1 eligible = 100%, if join and eligibility are correct | Owner reports 100% | Arithmetic consistent; marketing-source accuracy unverified |
| Average order value | USD 15 / 1 = USD 15 | Earlier screenshot USD 15 | Arithmetic consistent only |
| Payment rate | 1 / 3 = 33.33% if those visitors and eligible conversion belong to same scope | Earlier screenshot 33.33% | Earlier snapshot arithmetic consistent; current-day denominator unverified |
| Revenue per visitor | USD 15 / 3 = USD 5 for the earlier snapshot only | Earlier screenshot USD 5 | Earlier snapshot arithmetic consistent only |

No complete live end-to-end PASS is claimed. One event each does not establish correct behavior under retries, refreshes, separate browsers or duplicate webhooks. No monetary discrepancy is demonstrated in the owner-reported simple one-payment case; this does not exclude missing or duplicated records elsewhere.

## Follow-up sandbox conversion — screenshot at 14:51 IST

The owner confirmed that the initial USD 15 payment was made WITHOUT opening the campaign link beforehand. It therefore does not establish a campaign-attribution failure. The earlier empty campaign result for that original transaction must not be called a confirmed bug.

The owner approved a fresh sandbox test. They reported opening the tagged URL and allowing analytics in a fresh Incognito context; the campaign became visible in the traffic dashboard before the intended conversion. The instruction was to create a new test account in that same browser context and select Monthly Premium. Continued use of the same browser/visitor through the actual second checkout has not independently been inspected.

A new screenshot shows the exact-date Revenue overview with USD 165 total, two conversions, USD 82.50 average order value, and 100% visitor attribution (2 of 2). The two payment rows show USD 150 and USD 15. Both report Explicit Session (high). The USD 150 row's channel is Campaign, while the USD 15 row's channel is Direct. Campaign grouping nevertheless shows (none), two conversions, USD 165. Customer identifiers and email addresses are intentionally omitted.

| Check | Expected for the instructed scenario | Observed in screenshot | Assessment |
| --- | --- | --- | --- |
| Number of conversions after one additional payment | 2 if no unrelated conversion | 2 | Count consistent with the planned extra conversion; Stripe ledger reconciliation pending |
| New payment amount | USD 15 for the instructed monthly checkout | USD 150 | Amount differs from the instructed test; confirm selected plan and actual Stripe transaction before calling it a charge/calculation bug |
| Revenue after original USD 15 plus new instructed USD 15 | USD 30 if both were monthly USD 15 payments | USD 165 | The difference is explained arithmetically by the USD 150 row; pricing-selection or charge correctness not established |
| Sum of displayed payment rows | USD 15 + USD 150 = USD 165 | USD 165 | Displayed addition correct |
| Average of displayed payments | USD 165 / 2 = USD 82.50 | USD 82.50 | Displayed division correct |
| Visitor match rate | 2 matched / 2 eligible = 100% if those joins are correct | 100%, Explicit Session (high) on both rows | Displayed arithmetic consistent; identity joins not independently reconciled |
| Channel of new tagged conversion | Campaign if tags were captured for that conversion | Campaign | Broad channel classification observed |
| Campaign name/revenue grouping of new tagged conversion | trfyx_setup for the applicable touch model if this exact visitor/session retained that campaign | (none), grouping both payments | Unresolved dimension discrepancy; detailed session/attribution mapping required |

USD 150 matches the yearly amount configured in the local plans code, but the screenshot alone does not establish which plan was selected or whether the user intended yearly billing. Do not refund, cancel, or create another payment to investigate this without approval. No duplicate financial record is proven merely by two different payment amounts.

Next evidence needed: read-only Stripe details for the USD 150 payment (success status, currency and related subscription billing interval) and the corresponding Trfyx attribution/session details showing touch model, source, medium and campaign. Do not assume that a Campaign channel guarantees a populated campaign-name dimension, or that the traffic campaign visitor is automatically the same visitor as the new payment.

## Campaign revenue confirmed in one view — screenshots at 14:53–14:54 IST

The owner supplied two more screenshots for 19 November:

- Main Dashboard, Campaigns dimension, Revenue metric: trfyx_setup = USD 150.
- Revenue > Attribution, Source dimension: (none), USD 165 first-touch revenue, USD 165 last-touch revenue, two conversions, USD 82.50 AOV. Header totals are USD 165, two conversions and 100% visitor attribution.

This changes the earlier diagnosis: campaign-linked revenue IS visible for the fresh test in the main dashboard. Do not continue reporting that campaign capture/revenue attribution is wholly broken. The original USD 15 payment was untagged; the new USD 150 is represented under trfyx_setup in this main-dashboard screenshot.

An unresolved report discrepancy remains: the earlier Revenue Overview Campaign grouping put both payments under (none), while the main Dashboard Campaigns report assigns USD 150 to the named campaign. The newest Revenue Attribution screenshot is Source, not Campaign, so it is not yet a same-dimension comparison. First compare Revenue > Attribution > Campaign to Main Dashboard > Campaigns under identical date filters. Also compare Source to Sources separately. Different dimensions or touch-model definitions must not be conflated into a confirmed reporting bug.

No source/campaign classification code inside Trfyx is available in the Moodora repository. Do not patch the working browser tracker or fabricate event fields to conceal a possible report-aggregation problem. The new Stripe USD 150 transaction's plan, billing interval, identity and successful amount remain to be independently confirmed in Stripe. No additional payment or production-data mutation is needed for this comparison.

## Same-dimension report discrepancy — owner confirmation

After being directed to select Revenue > Attribution > Campaign, the owner reported (none). The main-dashboard screenshot already shows Campaigns > Revenue > trfyx_setup = USD 150 for 19 November. Thus a campaign-dimension report discrepancy is observed in the guided test, not merely a comparison of Source to Campaign. The specialized Campaign result is owner-reported; a current screenshot/export of its exact rows, filter parameters and response has not been independently inspected.

Classification: UNRESOLVED REPORTING DISCREPANCY. Main-dashboard campaign revenue is observed working; specialized first-/last-touch campaign reporting is not validated. It is not yet established whether the difference is caused by documented touch-model semantics, stored attribution snapshots, query joins, campaign persistence, stale data, filtering or a UI transformation. Do not claim a particular database bug or prescribe an invented campaign API.

Expected reconciliation for the controlled sequence, if the reports use equivalent eligible payments/touch rules: original untagged payment USD 15 remains without a campaign; the fresh campaign-linked USD 150 appears under trfyx_setup; total remains USD 165 and two conversions. Stripe confirmation of the new payment amount and interval, a customer/session identifier match, and report-definition equivalence still remain necessary.

To diagnose/fix the reporting implementation requires the Trfyx application's source/API/query access or its support team's investigation. This code is not in Moodora. Do not request secret keys, reuse browser authentication tokens, mutate production report rows, or deploy speculative changes. Ask the owner whether Trfyx source is available; if not, provide the sanitized evidence to official Trfyx support. The independently reproduced Moodora failed-event marker bug is a separate pending fix and must not be described as the cause of this campaign discrepancy.

## Confirmed local bug: failed checkout events are marked sent

Location: src/lib/trfyx.ts, trackCheckoutStarted.

A diagnostic imported the ACTUAL local helper and used a mocked browser/storage/collector callback. The callback returned HTTP 500. The helper persisted moodora:checkout-started:<session> as 1 and added the session to the memory set. Calling the helper again with the same session emitted no new event. Actual sends across two calls: 1. This is a local failure-path reproduction, not a live Trfyx request or a production transaction.

Root cause: send() returns true when the tracking function was invoked, not when the event was accepted. The marker is set immediately, and the callback's status is ignored. A failed delivery can therefore suppress later retry attempts for that same checkout session.

Impact: missing checkout_started events when delivery fails. No evidence that this caused the missing campaign or changed financial revenue. Financial revenue is ingested through Stripe separately.

Proposed fix, NOT APPLIED: distinguish an in-flight/uncertain attempt from acknowledged delivery; persist a successful marker only after an accepted callback; release the marker on definite failure; keep bounded navigation delay and failure isolation. Treat timeout delivery as uncertain and do not blindly retry in a way that creates duplicate events. Exactly-once client delivery cannot be promised without a documented provider-side idempotency mechanism. First confirm whether the owner wants one event per created session, per opening attempt, or per successfully delivered conversion.

The reproduction is saved at /tmp/moodora-attribution-audit.mts. It asserts the existing faulty behavior to demonstrate the finding; its successful exit does NOT mean the delivery behavior passed acceptance criteria.

## Additional coverage gaps and risks

- Email registration sends signup_completed only after /api/register succeeds. Google login/signup does not emit that event. This is a scope gap if the owner's rule includes Google-created accounts, not a confirmed discrepancy until the rule and Google availability are confirmed.
- Reused open Stripe sessions retain original visitor metadata. A session created before opt-in/integration is not tagged retroactively. Whether attribution should preserve the original visitor or attach a later one requires an explicit policy; do not overwrite ownership fields or attribution without agreement.
- Deduplication is browser-local storage plus memory; separate browsers and simultaneous tabs are not guaranteed exactly once. Reopening one reused Session is suppressed, while a genuinely new Session can count again.
- Existing tests cover queueing, consent, preview exclusion, ordinary reuse deduplication, blocked storage/throws, bounded navigation wait and optional metadata. They did not cover a callback explicitly reporting HTTP failure, explaining why the bug was not detected by that suite.
- Root consent state uses a window-local event; cross-tab withdrawal behavior needs live verification. A different already-open tab may keep its tracker running. Do not mark withdrawal complete without this test.
- The script's automatic pageview deduplication does not establish business-event deduplication. Heartbeats, engagement, preflights, pageviews, event names and successful payments are different units; counting Network rows as purchases would be incorrect.
- Trfyx's 100% visitor-match rate does not prove source/campaign accuracy. A visitor can match while marketing dimensions are missing.
- First-touch grouping was observed; last-touch and multi-touch have not been tested. Multi-touch is not implemented in Moodora's source and must not be advertised as supported merely because revenue is displayed.
- Refunds, discounts, taxes, fees, currency conversion, failed/asynchronous payments, renewals, cancellation/proration, missed webhook recovery and replayed/out-of-order webhooks require sandbox ledger and provider evidence.

## Extended finding register — read-only follow-up

The owner requested continued checking and detailed notes, not an unapproved production change. No application implementation, prices, revenue records, tracker settings or production database rows were changed in this follow-up. Added a local offline diagnostic script only: scripts/audit-trfyx-findings.mts. It imports the actual current helper in isolated module instances and substitutes browser/collector fixtures. It makes no network or database calls.

| ID | Finding | Evidence and status | Impact / proposed next action |
| --- | --- | --- | --- |
| F01 | Failed delivery is permanently treated as sent | CONFIRMED LOCAL BUG. HTTP 500 callback followed by retry: one send total; persistent marker remains 1. Previously identified and reproduced again. | Checkout event undercount on failed sends. Separate pending from accepted state; consume callback status; never claim exactly-once delivery from client markers. No fix applied. |
| F02 | Cookie access exception escapes checkout analytics helper | NEW CONFIRMED LOCAL BUG. A simulated document.cookie getter throws SecurityError. The actual trackCheckoutStarted promise rejects. Both checkout callers await it before window.location.assign, then catch the error without navigating. | Analytics can prevent a prepared checkout from opening in that edge case. Put the permission/cookie check inside failure isolation so tracking cannot reject business navigation. Reproduced locally; not observed in the owner's real browser. No fix applied. |
| L01 | Same checkout may emit in separate browsers | NEW CONFIRMED LOCAL LIMITATION. Two isolated helper/module/storage contexts using the same cs_ fixture and accepted callbacks emit two events. | Browser-local deduplication is not global per-Stripe-session deduplication. Actual Trfyx storage/deduplication and the desired business rule remain unverified. Do not label this a proven duplicate payment or live conversion. |
| R01 | Consent-change notification does not reach another open tab | NOTIFICATION GAP REPRODUCED; LIVE TRACKER IMPACT NOT VERIFIED. Calling actual saveAnalyticsChoice(denied) notifies tab A once and tab B zero times in separate EventTargets. The root component only listens to this window-local event, with no cross-tab subscription. | A previously mounted tab may retain granted state after another tab withdraws consent. Verify in a real browser; if confirmed, synchronize preference state and safely stop existing listeners/queued traffic. Unmounting a Script element alone is insufficient. No fix applied. |
| G01 | Google-created accounts lack signup_completed | CODE-REVIEW COVERAGE GAP, conditional on Google sign-in being enabled and included in the counting rule. Google account creation occurs in auth.ts; the only signup analytics call is in the email registration branch. | All-provider signup reports may undercount. Define the metric as email signup only, or add genuine new-account-only Google instrumentation after approval. Do not count every Google login as signup. |
| R02 | Campaign revenue differs between report views | OWNER SCREENSHOT + CONFIRMATION. Main Dashboard Campaigns: trfyx_setup USD 150. Revenue Attribution Campaign: (none), owner reported. | Unresolved reporting discrepancy; needs provider report definitions, response/filter comparison and Trfyx investigation. This is separate from F01/F02. No unsupported campaign setter or fabricated payload was added. |
| D01 | Second payment differs from instructed monthly scenario | TEST-SCENARIO MISMATCH, NOT YET A BILLING BUG. Planned new payment USD 15; observed new row USD 150. Local yearly plan is USD 150. | Confirm successful Stripe transaction and actual subscription interval. USD 165 total and USD 82.50 AOV are correct for the two observed rows; do not call their arithmetic wrong. No refund/cancellation/payment performed. |
| T01 | Exact cross-system timezone reconciliation incomplete | AUDIT EVIDENCE GAP. Owner reported payment at 19 November 13:24 but no timezone displayed. Correct IST UTC bounds were calculated; report range includes the day. | Before final ledger sign-off, use unambiguous UTC timestamps or a report timezone setting/export. No fabricated boundary-pass claim. |

### Reproduction details and limitations

Run: node --experimental-strip-types scripts/audit-trfyx-findings.mts

The runner outputs four diagnostic classifications (F01, F02, L01, R01). Its assertions confirm observed behavior, including the bad behavior. Exit code 0 means the findings were reproduced, NOT that all four behaviors satisfy acceptance criteria. Existing regression and analytics suites last passed 51 + 8 tests in this audit; they do not cover all of these newly reproduced failure paths. Production application code has not changed, so those earlier passing tests must not be presented as a fix/retest.

F02 minimal reproduction: replace document.cookie with a getter that throws SecurityError; invoke trackCheckoutStarted with a valid fixture Session and plan; observe rejection before any tracker call. Location: src/lib/trfyx.ts:49 invokes analyticsAllowed outside the send try/catch. analyticsAllowed calls analyticsChoice, which reads document.cookie without a catch. The caller's await occurs before the redirect in src/components/checkout-start.tsx and src/components/membership.tsx.

L01 minimal reproduction: import helper in two isolated module contexts, install independent localStorage fixtures and accepted collector callbacks, call with the same Session ID. Each context has its own marker set, yielding two sends. This fixture is a genuine isolation test of the local helper, not a live two-browser Trfyx ingestion test.

R01 minimal reproduction: use two EventTargets representing separate windows; register the root component's preference event listener in each; call saveAnalyticsChoice in A. Only A is notified. The fixture does not mount React, execute the vendor recorder or prove ongoing real requests after withdrawal; those remain required live checks.

### Remaining live checks, no new financial mutations authorized

- Compare post-second-test signup/checkout counts against actual successful registrations and DISTINCT Session IDs. Do not assume a conversion count equals custom events or that there were exactly two registrations without confirming the new account flow.
- Inspect payment/customer/subscription identifiers in Stripe and Trfyx read-only, masking customer details. Confirm the new USD 150 payment and yearly/monthly interval independently.
- Compare Sources, Campaigns, Medium and Landing Page across dashboard and first-/last-touch reports under identical bounds and explain any different attribution definitions before classifying a provider bug.
- Test navigation/back/refresh and ordinary checkout reuse without completing another payment. Observe actual custom-event count deltas, not just HTTP request counts.
- Check invalid signup produces no signup_completed. A truly successful account creation followed by failed automatic login should still count as signup, not as a failed registration.
- Verify consent withdrawal in one tab and another already-open tab, including pagehide/engagement traffic, without recording private writing.
- First-touch versus last-touch needs a controlled, distinguishable sequence of at least two sources and then an approved sandbox conversion. The current single tagged-touch example cannot distinguish attribution models. Multi-touch support remains unestablished.
- Renewal, refund, plan-change, tax/discount, failed-payment and webhook-replay tests still need a separately agreed sandbox plan. Do not alter existing records merely to fill a checklist.

The provider's private report implementation, production Vercel logs and deployed database remain inaccessible to this agent. Therefore this follow-up is a local failure-path audit plus documented user-supplied live evidence, not a completed autonomous end-to-end verification.

## Local checks rerun in this audit

- Analytics suite: 8 tests passed.
- Existing regression suite: 51 tests passed.
- Failed-delivery diagnostic: reproduced failure suppression against the local helper; no network used.
- IST boundary diagnostic: correct inclusive/exclusive UTC bounds verified.
- TypeScript: npx tsc --noEmit --incremental false passed (exit code 0).
- No new production build/deployment was performed because no application source was modified in this audit.

These tests do not query Trfyx, run the deployed Vercel API, replay real Stripe webhooks, inspect provider aggregations or prove the full live lifecycle.

## Next read-only evidence, one guided step at a time

1. Basic owner baseline received: one signup, one checkout opening and one successful USD 15 payment. Obtain the remaining counting rules, unique-event definition and timezone evidence before full sign-off.
2. Compare successful Stripe invoice/payment IDs, currency, amounts, timestamps and refund/tax/fee treatment with Trfyx using equivalent filters. Mask customer details; never share keys or tokens.
3. Match the test Session/Subscription df_visitor_id metadata to the browser visitor and confirm the intended customer association without using email as the only proof.
4. Inspect Vercel logs for the exact deployed revision and relevant timestamps, excluding secrets/private writing. Compare Stripe deliveries to Moodora and to Trfyx separately.
5. Verify route changes, refresh/back, failed signup, repeated checkout openings and consent withdrawal in a regular browser. No new payment is necessary for most of these checks.
6. Inspect source/campaign results with a genuinely fresh consented visit and known tagged entry; escalate ingestion/reporting diagnostics to Trfyx if unavailable to the operator. Do not invent a campaign API or mutate Trfyx data.
7. Agree on approved fixes and a separate sandbox-only lifecycle test plan before replaying webhooks, advancing test clocks, refunding or canceling anything.
8. Retest each fix and reconcile identical report windows before marking any end-to-end test passed.

## Official reference

https://help.trfyx.com/agent
https://help.trfyx.com/troubleshooting

These sources describe the installation and diagnostic workflow. They do not grant this agent access to the private Trfyx implementation or prove outcomes for this site.

## Owner-runnable first bug test

Prepared scripts/test-trfyx-delivery.mts without changing application code. It invokes the actual checkout analytics helper using offline browser and delivery fixtures. The first callback returns HTTP 500; a second attempt, if made, would return 202.

Run: node --experimental-strip-types scripts/test-trfyx-delivery.mts

Observed with current code: expected 2 attempts, actual 1; expected 1 accepted event, actual 0; expected no sent marker after failure, actual marker present. The acceptance test intentionally exits 1 and prints FAIL: BUG REPRODUCED. This is a real failing local acceptance check of F01, not a live provider request and not a successful fix. No production data or real customer transaction was used.

## Pending allegation: signup increment after rejection

The owner answered yes when asked whether signup_completed increased despite an email-already-exists error. Exact before/after counts, actual error message, timestamps and live request/collector evidence have not yet been supplied for this alleged rejection. Last confirmed baseline was 3 signups / 2 checkouts following a genuine additional account. This is an UNVERIFIED REPORT, not a confirmed new duplicate-signup bug.

Read-only local review: /api/register rejects existing emails with ApiError's default HTTP 400; request() throws for non-OK responses; AuthPage invokes trackSignupCompleted only after awaiting successful registration. No second signup tracking call was found. This source review is not proof of the deployed revision or actual live outcome. Next evidence: current signup count, then a sanitized rejection message and matching request/event timestamp. No source code was changed based on the allegation.

## Signup-increment allegation clarified — count remains 3

After the prior ambiguous yes response, the owner supplied the actual current signup_completed count: 3. The last confirmed baseline was also 3. Therefore the observed reported delta is zero, not an increase, and there is no demonstrated additional duplicate-signup event. The earlier 2-to-3 change was explained and confirmed as one genuine new registration.

Status: SIGNUP-INCREMENT ALLEGATION NOT REPRODUCED; no count mismatch demonstrated. The exact duplicate-email rejection UI/API path still was not independently captured, so the unchanged total alone must not be represented as proof that the full rejection test was executed correctly. No signup-tracking fix is justified by this evidence. This clarification supersedes any reading of the preceding pending allegation as a confirmed bug. Campaign-report inconsistency and the separately documented limitations remain open.

## Revenue increase explained by owner — third intentional payment

After being asked whether another USD 150 test payment was completed, the owner answered yes. The expected gross total for the three stated payments is USD 15 + USD 150 + USD 150 = USD 315. The latest dashboard USD 315 is therefore consistent with the owner's additional-payment history. The +USD 150 change is EXPLAINED BY REPORTED ACTIVITY, not a demonstrated duplicate or revenue-calculation bug. This supersedes the earlier unexplained-change status.

Expected payment/conversion count for three distinct eligible successful payments would be three under a payment-based conversion definition; the current actual conversion count, all three distinct Stripe payment/invoice identifiers, statuses and timestamps still need read-only reconciliation. Do not infer that two identical USD 150 amounts are duplicates, and do not assume intentional extra payment alone proves provider ingestion uniqueness.

Current financial baseline: owner-reported payments of USD 15, USD 150 and USD 150; expected gross USD 315; latest main-dashboard screenshot revenue USD 315. Current signup/checkout totals after the third payment have not been re-read. The previous confirmed custom-event snapshot was three signups / two checkout events before this payment confirmation; do not hold its checkout count fixed across a later genuine checkout. Campaign/source allocation of the third payment is still unknown. No monetary data was modified by the agent.
