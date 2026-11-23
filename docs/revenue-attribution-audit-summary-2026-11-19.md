> Historical Moodora integration evidence. For this testing branch, use TESTING_SETUP.md and MANUAL_TESTING.md. Do not run old main-folder or production deployment commands from this history.

# Moodora / TRFYX audit — current status

Provisional snapshot as of owner screenshots on 19 November 2026, approximately 17:02 India time. Full audit is IN PROGRESS. No provider backend access or autonomous live browser access is available. The observation period has not yet ended; these are not finalized end-of-day totals.

## Latest expected versus actual

| Metric | Expected | Actual evidence | Status |
| --- | --- | --- | --- |
| Successful payments for the displayed 19 November records | 3 | Stripe: three USD Succeeded records; TRFYX: three payment rows/conversions | Matches displayed snapshot |
| Gross revenue | USD 15 + USD 150 + USD 150 = USD 315 | Stripe rows sum USD 315; TRFYX USD 315 | Pass for displayed records |
| Average order value | USD 315 / 3 = USD 105 | TRFYX USD 105 | Arithmetic pass |
| Signup events | 3 for the reported three registrations | Latest owner-reported signup_completed 3 | Manual match at that checkpoint |
| Checkout events after third payment | 3 IF three distinct eligible consented checkout sessions | Last reported 2 was before third payment | Current count pending |
| Extra conversions after three confirmation-page refreshes | 0 | Earlier checkpoint remained USD 165 / two conversions | Manual refresh check matched expectation |
| Extra checkout event from existing-member rejection | 0 | Earlier checkpoint stayed checkout_started 2 | Manual count check matched expectation; response independently unverified |
| Unique event names | 2 named business events | signup_completed, checkout_started | Observed; not a unique-person total |
| All event occurrences / unique people | Counting rules and complete ledger required | Not available | Unverified |
| Campaign revenue in main dashboard | USD 150 for the explicitly tagged test | trfyx_setup USD 150 in supplied screenshot | Observed working in that view |
| Same campaign in dedicated attribution report | Reconciled dimensions/touch rules required | Owner reports (none); first-touch all Unattributed | Unresolved reporting discrepancy |
| Visitor attribution rate | 3/3=100% if joins are correct | TRFYX 100%, Explicit Session on all rows | Ratio consistent; identifiers/marketing-source accuracy unverified |

## Bugs and limitations

- F01: failed checkout analytics delivery marked as sent and suppresses retry. Reproduced, fixed locally, and owner-confirmed offline PASS with matching file fingerprint. Owner subsequently reported deployment without error and clear console; exact deployed source version and live failure-path retest are not independently verified.
- F02: cookie-read SecurityError could reject checkout analytics before navigation. Reproduced and fixed locally; regression test passes. Actual browser/live failure-path test remains pending.
- L01: deduplication is browser-local, not guaranteed globally across browsers. Demonstrated two local sends for the same Session in isolated contexts; provider-side duplicate storage not established.
- R01: consent preference notification only reaches the current tab. Notification gap reproduced; continued live tracking in another tab needs browser verification and a separately reviewed fix.
- G01: Google-created accounts lack signup_completed instrumentation if Google signup is enabled and included in the metric. Code coverage gap, not a verified live count discrepancy.
- R02: named campaign revenue appears in the main dashboard while the dedicated report shows (none). Requires TRFYX report definitions/provider investigation; Moodora does not contain that reporting implementation.
- D01: the second instructed monthly USD 15 test instead produced USD 150, consistent with local yearly pricing. Stripe confirms the amount succeeded. Actual intended selection and billing interval remain unverified; not a confirmed pricing bug.
- T01: Stripe display timezone not explicitly established. Intended IST filter bounds were calculated correctly; cross-system boundary testing remains pending.

The original USD 15 payment was made without a campaign-tagged entry. Its missing campaign does not establish a bug. The extra USD 150 revenue increase was explicitly confirmed as another intentional payment, not a duplicate. Signup count rising from 2 to 3 was explained by a genuine additional registration; the later alleged further increment was not observed (count remained 3). Duplicate-email rejection was not independently completed/captured.

## Verification and boundaries

Local regression checks after the fixes: 13 analytics tests plus 51 existing tests passed; TypeScript passed. The dedicated offline acceptance test also passed on the owner's computer. This does not replace end-to-end provider verification or repair historical data.

Outstanding: post-third-payment event counts; distinct Stripe Payment/Invoice/Customer/Session mapping; report-response/model comparison; full first-/last-touch and any supported multi-touch behavior; live retry/consent cross-tab tests; filtered ledger/export reconciliation; net/refund/tax/fees/currency treatment; renewal/failure/cancellation/plan-change/webhook-replay scenarios; deployed source/log/database checks.

No production financial data or real customer transaction was changed by the agent. No support message was sent on the owner's behalf. Further financial mutations need approval and must remain in sandbox. See revenue-attribution-audit-2026-11-19.md for the detailed evidence journal and proposed fixes.
