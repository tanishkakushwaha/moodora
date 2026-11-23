# Set up the isolated Moodora testing environment

This checkout is for Moodora, not the TRFYX service's private source. `testing.trfyx.com` can host Moodora only if the owner of `trfyx.com` authorizes it and configures DNS. Using TRFYX analytics does not grant control of its domains. Until ownership is confirmed, use the URL of a separate Vercel testing project.

## 1. Confirm the checkout

Open Terminal and run:

```bash
cd "/home/tanishka/Desktop/Moodora-testing"
git branch --show-current
```

Expected: `testing`. The original folder `/home/tanishka/Desktop/My Moodora` remains on `main`, with its pre-existing uncommitted work preserved.

This branch contains the existing local project's current source, public assets, configurations, dependency manifest/lockfile, tests, scripts, docs and all committed migrations. Archives of earlier updates, unrelated projects, `.env` secrets, personal databases, `node_modules` and generated build outputs are not source and are not committed. The local `main` revision was old; current uncommitted features were copied to testing without committing them on main. Remote-head equivalence remains unverified until GitHub access works.

## 2. Install and run locally

Use Node.js 24 and PostgreSQL 16. In the testing folder:

```bash
npm ci
npm run testing:setup
npm run check:testing
npm run build
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Open `http://localhost:3100`. Setup generates a new ignored local `.env`, a fresh auth secret and dedicated testing database credentials. The new PostgreSQL cluster lives inside this checkout's `.data` and listens on `55440`. The original local cluster on `55439` is not reused or stopped.

If a previous interrupted setup left PostgreSQL using its default port 5432, the testing script now restores its own port 55440 before startup. Retry testing:setup; do not stop another database server or delete the cluster.

If setup shows `EPERM`, it was unable to start a process/socket in the restricted terminal. Run it in the normal Linux terminal; do not replace the test URL with a production URL to get past the error. Never run database commands from the original main folder for this setup.

`npm run test:integration` starts its own local app on a free port in 3100–3110. It never probes/reuses the original app on 3000. Its smoke checks create temporary local test users and clean up only those users. It rejects hosted database connections and enabled Stripe credentials for this automated run. Hosted Stripe/browser tests are manual and separate.

## 3. Push only testing

The agent may commit this branch locally, but a remote push needs working GitHub access. If asked to authenticate, use `gh auth login --hostname github.com --git-protocol https --web` in your normal terminal, or connect the GitHub integration in the application. Never paste a token into chat or embed one in a remote URL.

Then, in the testing checkout:

```bash
git branch --show-current
npm run push:testing
```

Expected branch: `testing`. Expected remote destination: `tanishkakushwaha/moodora`, branch `testing`. No force push, branch rename, merge or push to main is needed. If a remote testing branch already diverges, stop and review it; do not force overwrite it.

Before every future change, work in this folder and confirm the branch. All new edits and commits belong here.

## 4. Provision a separate hosted database

In your PostgreSQL provider, create a NEW testing database named `moodora_testing`, with a dedicated user limited to that database. Prefer a separate provider project/instance. Do not clone production customer records or attach the original production database.

Obtain the testing connection URL and, if pooling requires it, a testing direct migration URL. Both URLs must name `moodora_testing`. The branch rejects default database names such as `neondb` unless you actually create/select the required testing database. Give the testing role no privileges on production databases.

The code checks the URL's database name and uses testing-specific credentials only; that does not independently certify your hosting account permissions. Verify the provider project, database and role before adding credentials to Vercel.

## 5. Create a separate Vercel project

Leave the original Moodora project, its domains, production branch and environment variables unchanged.

1. Open Vercel, choose **Add New → Project**, and import `tanishkakushwaha/moodora` as a NEW project, for example `moodora-testing`.
2. Point the new project's stable deployment branch to `testing` in **Settings → Git / Production Branch**. Check the actual deployed source branch before adding secrets or deploying. Do not change the original project's `main` branch setting.
3. Root directory: repository root. Node version: 24. Build command: `npm run build:vercel`, as supplied by `vercel.json`.
4. Add ONLY the new project's testing variables below. An initial build without configuration is expected to fail safely before migration.
5. Deploy branch `testing`; wait for **Ready**. Check the deployment's source branch and commit.
6. Open its generated Vercel URL. The page must have the Moodora testing banner and `/api/health` must report `environment: "testing"` and `database: true`.

Vercel calls a new project's stable branch its Production Branch even when that project is exclusively for testing. That label does not make it the original live Moodora project. Keep projects, secrets and data separate.

A preview branch on the original project is an alternative only if its variables and database are explicitly isolated. The separate-project procedure above minimizes accidental sharing. Vercel's documented Git and environment-variable behavior is linked below.

## 6. Required variable names

Enter actual secrets privately in the NEW Vercel project's environment settings. Redeploy after changes. Never put server credentials in `NEXT_PUBLIC_*` variables.

| Variable | Value/source |
| --- | --- |
| `TESTING_DATABASE_URL` | New hosted database URL naming `moodora_testing` |
| `TESTING_DIRECT_DATABASE_URL` | Optional direct connection to the same test database for migrations |
| `TESTING_AUTH_SECRET` | Fresh random secret, at least 32 characters; do not reuse production |
| `TESTING_AUTH_URL` | Exact HTTPS testing origin, or leave unset to use this Vercel deployment's detected URL |
| `TESTING_AUTH_GOOGLE_ID` / `TESTING_AUTH_GOOGLE_SECRET` | Optional separate OAuth app; configure both or neither |
| `TESTING_STRIPE_SECRET_KEY` | Optional `sk_test_...` or `rk_test_...` from a separate testing sandbox |
| `TESTING_STRIPE_WEBHOOK_SECRET` | New testing endpoint's signing secret |
| `TESTING_STRIPE_MONTHLY_PRICE_ID` | Recurring USD 15/month price in that same sandbox |
| `TESTING_STRIPE_YEARLY_PRICE_ID` | Recurring USD 150/year price in that same sandbox |
| `TESTING_STRIPE_PORTAL_CONFIGURATION_ID` | Optional testing customer portal configuration |
| `NEXT_PUBLIC_TESTING_TRFYX_WEBSITE_ID` | Optional NEW public TRFYX test website ID; never `wwfhn43v8pg5` |
| `NEXT_PUBLIC_TESTING_TRFYX_DOMAIN` | Exact registered testing analytics hostname |

With billing variables unset, billing remains unavailable; no mock Premium is enabled. If any billing variable is supplied, a test key, testing webhook secret and at least one recurring testing price are required. With no separate TRFYX ID, analytics is disabled and the optional prompt is hidden. That is safer than polluting live reports.

## 7. Configure testing.trfyx.com only with domain-owner permission

1. Confirm who controls `trfyx.com` and obtain permission to use `testing.trfyx.com`. Do not assume this is yours because you have a TRFYX subscription.
2. In the NEW Vercel testing project, open **Settings → Domains → Add Domain** and enter `testing.trfyx.com`.
3. Have the domain owner add the exact DNS record Vercel displays. Do not change the parent/apex domain or existing production records. No guessed DNS target is provided here.
4. Wait for domain verification and HTTPS readiness.
5. Set `TESTING_AUTH_URL=https://testing.trfyx.com` in the testing project and redeploy the `testing` branch. The bootstrap rejects the live Moodora domain and the TRFYX app/apex domains.
6. Update the separate OAuth callback, Stripe testing webhook and TRFYX testing site to the same testing origin.

If domain ownership cannot be provided, keep using the new project's Vercel URL and configure the same integrations for that actual URL. Do not claim `testing.trfyx.com` is live before DNS and HTTPS have been verified.

## 8. Optional provider setup

For Google, use a separate OAuth application with callback `https://TEST_HOST/api/auth/callback/google`. Do not change the production OAuth application's callbacks.

For Stripe, create a separate sandbox so existing live or earlier production-site test customers cannot be modified. Configure the recurring prices and testing Customer Portal. Add a testing webhook at `https://TEST_HOST/api/billing/webhook` for checkout completion, supported subscription lifecycle updates and invoice paid/payment failure events. Preserve the original website's webhook and signing secret. The branch rejects live-mode webhook payloads and live Stripe keys. Eligible methods depend on your sandbox and Checkout settings; do not assume every real method can be exercised with fake details.

For TRFYX, add a separate website for the actual test domain, copy its official installation settings into the two public testing variables and connect ONLY the separate Stripe sandbox. Do not connect the existing Moodora analytics property or webhook. Allow analytics in the test browser before capturing a tagged entry. Define event goals separately if needed; source code alone does not create goals. Respect provider plan/feature availability.

## 9. Verify and keep results

Use `docs/MANUAL_TESTING.md` after the new deployment is Ready. Save the test URL, branch, deployment commit, browser, time zone, inputs, expected/actual results and sanitized screenshots for each run. Do not mark the hosted site tested based on a local build or unit test alone.

References: [Vercel Git deployments](https://vercel.com/docs/git), [Vercel environment variables](https://vercel.com/docs/environment-variables), [Stripe sandbox testing](https://docs.stripe.com/testing), [Stripe webhooks](https://docs.stripe.com/webhooks), [TRFYX official integration guide](https://help.trfyx.com/agent).
