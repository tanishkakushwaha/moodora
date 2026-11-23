# Moodora testing setup verification

Date: 23 November 2026. Status: locally prepared; remote deployment and hosted end-to-end verification are not complete.

## Branch and source

- Isolated worktree: `/home/tanishka/Desktop/Moodora-testing`, branch `testing`.
- Original worktree: `/home/tanishka/Desktop/My Moodora`, branch `main`.
- Initial local main revision: `03e2230`. Its already-existing uncommitted application features were copied into testing, without committing, resetting, stashing or editing the original working copy.
- Complete application source, assets, migrations, dependency manifest/lockfile, scripts, tests and repository documentation are included. Update ZIPs, unrelated projects, installed dependencies, generated files, actual secrets and personal database data are excluded.
- Remote main freshness has not been verified because authenticated GitHub access is unavailable. This branch represents the inspected current local Moodora project, not a verified latest remote snapshot.

## Checks performed

| Check | Result | Limit |
| --- | --- | --- |
| Fresh dependency installation | Pass: `npm ci --offline --ignore-scripts --no-audit --no-fund`, 258 packages | Versions unchanged; security-advisory audit not performed |
| Unit/regression/analytics/isolation suite | 77 cases: 75 passed, 0 failed, 2 skipped for nested-process restrictions | Corresponding CLI guards also checked directly; unit tests do not establish live provider correctness |
| TypeScript | Pass: `npm run typecheck` | Compile-time validation |
| Next.js optimized build | Pass: `npm run build` | No database or external-provider lifecycle exercised |
| Offline event delivery acceptance | Pass: two attempts, one accepted event, no false sent marker after failure | Simulated browser/collector; no real requests |
| Actual build safety command | Pass: with testing DB/auth values empty, build exits 1 with sanitized configuration errors before Prisma/migrations | Invoked directly because nested Node subprocesses are restricted |
| Actual push safety command | Pass: from a disposable temporary Git main checkout, helper exits 1 with Refusing to push | No remote contacted; original main checkout not used |
| Local testing database setup | Passed in owner normal-terminal run after testing-port repair | moodora_testing on 127.0.0.1:55440; four migrations up to date; initial restricted-terminal EPERM retained as historical environment limitation |
| Local HTTP/database integration | Passed in owner normal-terminal run; full success log supplied | Temporary users cleaned up; browser and external-provider checks remain separate |
| Browser/mobile/accessibility flows | Not run here | Follow MANUAL_TESTING.md after a separate test deployment is ready |
| Google/Stripe/TRFYX testing integration | Not configured/verified | Requires separate test credentials; currently disabled rather than reusing production |
| GitHub Actions workflow | Added for testing branch only; not executed remotely | Needs remote push and Actions access |
| testing.trfyx.com | Not assigned or verified | Domain owner's DNS permission is required; using the TRFYX service does not grant domain ownership |

The two CLI subprocess tests are automatically skipped only when `CODEX_SANDBOX_NETWORK_DISABLED=1`, because nested Node invocations here fail without usable child output. Both corresponding commands were separately checked through the terminal. Those tests remain enabled in ordinary environments/CI. Do not present skipped checks as passed end-to-end tests.

## Isolation and corrections made only in testing

- Runtime credentials are mapped exclusively from `TESTING_*` values; production-style database/authentication/billing fields are overwritten or removed in this testing process.
- Runtime and Prisma operations require a separate PostgreSQL database named `moodora_testing`. Generic production DB URLs are ignored. Database ownership/permissions still require operator verification when provisioning.
- Local cluster/application use ports 55440/3100, avoiding the original app's ports. Automated smoke tests never borrow the original running server.
- Vercel build preflight rejects missing test credentials before generating/migrating/building. A Git branch supplied by Vercel must be testing.
- Stripe live keys and live-mode webhook payloads are rejected; the production website's sandbox must not be reused. Existing prices, entitlements and billing logic are preserved.
- Live Moodora's TRFYX website ID/domain are rejected. Optional analytics needs a separate website and is disabled until configured.
- Auth sessions use a distinct testing cookie name; testing pages show a banner and disallow search indexing.
- Found legacy push helper targeted main and an old moodbloom repository. Testing copy now delegates only to the guarded testing push command; the original script on main is unchanged.
- The copied desktop launcher originally referred to the main folder. Its testing copy now refers to the testing folder.
- Existing event retry/cookie-error fixes are retained and regression-tested. Cross-browser deduplication, Google signup instrumentation and cross-tab consent remain known review/test items; external TRFYX report discrepancies cannot be fixed in Moodora's repository.

## Remaining work before hosted testing can be declared complete

1. Establish working GitHub access and push ONLY testing. Never force-overwrite a remote testing branch if it diverges.
2. Connect Vercel and create/configure a separate testing project, leaving the original production project untouched.
3. Provision a separate hosted `moodora_testing` database/user and testing auth secret. Supply secrets privately in the testing project, not chat or Git.
4. Confirm permission/DNS control for `testing.trfyx.com`, or use the new Vercel testing URL. No domain/DNS change was performed by this agent.
5. Configure separate optional Google OAuth, Stripe sandbox/webhook/portal and TRFYX testing website.
6. Run local HTTP/database checks in an unrestricted terminal or execute the isolated CI workflow; then complete the browser manual guide on the actual hosted testing URL.
7. Record results and remaining bugs. A clean console, passing build or previous production-site screenshots do not certify this new deployment.

## Guides

- TESTING_SETUP.md: branch, database, environment, Vercel, domain and provider setup.
- MANUAL_TESTING.md: full beginner browser/API/feature/payment/analytics test cases, expected outcomes and bug-report template.

No changes were merged into main. No production database credentials or data were copied into the testing repository. No real customer transaction was generated by these checks.

Main-isolation verification before committing testing: main ref, active main branch, original index, Git status and all 116 original tracked-file hashes match the saved pre-task baseline.

## Commit and remote outcome

The complete testing snapshot was committed locally as 5360719 on branch testing. An explicit non-force push targeted HEAD:refs/heads/testing only. It failed with Could not resolve host: github.com. No remote branch update is confirmed; main was not targeted. The GitHub CLI also reported an authentication failure during initial inspection. GitHub and Vercel integrations were found but not confirmed connected. No Vercel project, hosted database, DNS record or domain was changed.

After enabling GitHub access in a normal terminal, push from this testing folder using npm run push:testing. Do not push main or force overwrite a divergent remote testing branch. Commit IDs printed by git log show subsequent documentation updates as separate testing-only commits.

Local manual testing can start independently: npm run testing:setup, then npm run dev -- --hostname 127.0.0.1 --port 3100, then open http://localhost:3100. Database initialization must first work in an unrestricted terminal; the observed EPERM failures here are not a passing end-to-end result.

## Testing PostgreSQL startup repair

The owner's normal-terminal setup found an initialized PG_VERSION=16 cluster whose postgresql.auto.conf contained only default comments. PostgreSQL therefore tried port 5432 and failed because it was occupied. The testing setup script had written the intended port only immediately after a first initdb; a retry against an already initialized folder could skip that write. This is a confirmed testing-setup recovery bug, not a reason to stop the unrelated server on 5432.

Fix on testing only: scripts/lib/testing-postgres-config.mjs restores loopback/55440/testing socket settings on every setup attempt, preserving unrelated settings and normalizing duplicate old settings. scripts/database.mjs uses this helper outside the first-init block. No cluster files were deleted and no existing server was stopped.

Verification: three new regression cases passed (default initialized config, replacing old/conflicting network settings while preserving unrelated values, repeated-setup idempotence). After repairing only the stopped testing cluster's configuration, PostgreSQL itself reported port 55440 through postgres -D <testing-data> -C port. This is a read-only config check; successful server startup, migration and live integration still require the owner's subsequent normal-terminal run. No production database or main checkout was changed.

Port-repair regression result: npm test completed with 77 cases, 75 passed, no failures, and the same two restricted CLI-process checks skipped. Main ref/status/tracked files were checked unchanged before the testing-only port-repair commit.

## Owner-confirmed local HTTP and database integration pass

After the testing-port repair, the owner supplied a successful npm run testing:setup log. PostgreSQL reported 127.0.0.1:55440, database moodora_testing, four migrations found and no pending migrations. The owner then ran npm run test:integration from the testing checkout and supplied the complete success output.

The isolated temporary app started on port 3100. Reported passing groups: signup/credentials login/sessions/protected routes; diary CRUD and account isolation; daily mood upsert/privacy/validation/origin checks; couple invitations/expiry/consent/sharing/owner isolation/unsharing/disconnect; quote favorites/profile/theme; deletion/password change/session invalidation/logout. The runner reported temporary test accounts and records removed and All isolated local HTTP/database checks passed. Additional assertions in the executed runner cover public/authenticated page responses, duplicate and invalid signup rejection, Free report API denial, billing authentication/no-customer behavior, and reminder persistence/validation. These are HTTP/database assertions, not a browser-button or external-payment test.

An Auth.js CredentialsSignin log appeared during the deliberate rejected-old-password case after a password change. The source calls login(a, emails[0], password, false), asserts old credentials are rejected, and then logs in with the new password. The reported suite subsequently passed. This expected negative-path log is not an authentication defect and was not suppressed. A similar error on an unintended valid login would require separate investigation.

The integration runner stops its owned temporary Next.js server in finally. For manual browser testing, start npm run dev -- --hostname 127.0.0.1 --port 3100 and open http://localhost:3100, retaining the testing banner and using only QA accounts. No production account data or production database was used by this local suite.

Remaining: browser/mobile/form interactions, optional Google/Stripe/TRFYX test integrations, full provider lifecycle and attribution cases, GitHub push, separate Vercel project configuration and authorized custom-domain deployment. The domain testing.trfyx.com is not yet proven owned, configured or live.
