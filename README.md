# Moodora testing branch

This is the complete Moodora application in a separate `testing` Git worktree. It preserves the mood tracker, diary, calendar, partner sharing, self-care, quotes, insights, reminders, account settings, public pricing, Stripe subscriptions, reports and TRFYX integration.

The original `main` checkout is separate. Do not merge this branch into `main` or deploy it through the live project's production branch.

## Start here

- [Testing environment setup](docs/TESTING_SETUP.md): isolated database, credentials, GitHub, Vercel and optional custom domain.
- [Beginner manual testing guide](docs/MANUAL_TESTING.md): pages, actions, expected results, API checks, payments, analytics and bug reports.
- [Setup verification report](docs/TESTING_STATUS.md): what was checked and what is still blocked.

## Local commands

Use Node.js 24.11 or newer and PostgreSQL 16. Run these commands inside the `Moodora-testing` checkout:

```bash
npm ci
npm run testing:setup
npm run check:testing
npm test
npm run typecheck
npm run build
npm run test:integration
```

`testing:setup` creates a new ignored `.env` with random local testing credentials when none exists. Its dedicated database is `moodora_testing`, port `55440`; it does not reuse the original application's database on `55439`. If your terminal restricts starting PostgreSQL, run setup from the normal Linux terminal. Setup fails rather than falling back to the main database.

To use the app locally after setup:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Open `http://localhost:3100`. The hosted testing domain is not configured merely by creating this branch.

## Isolation rules

Only `TESTING_*` credentials are used for database, authentication, OAuth and Stripe. Ordinary `DATABASE_URL`, `AUTH_SECRET` or `STRIPE_SECRET_KEY` cannot substitute for missing testing credentials. The PostgreSQL database name must be `moodora_testing`. Use a separate database/user, a fresh auth secret, a separate Stripe sandbox, a separate OAuth app and a separate TRFYX website. No production database, account records or secrets are copied.

The live Moodora TRFYX website ID is rejected. Analytics is disabled until a separate test website ID/domain is configured. Stripe live keys and live-mode webhook events are rejected. A visible test banner, separate session-cookie name and noindex rules identify the testing app.

Dependencies are recorded in `package.json` and `package-lock.json`; `npm ci` installs them. Dependency directories, generated files, local databases and secrets are intentionally excluded from Git.

## Commit and push

```bash
git branch --show-current
git add .
git commit -m "Describe the testing-only change"
npm run push:testing
```

The branch must be `testing`. The push script refuses other branches and targets only `refs/heads/testing`, without force-pushing. It never merges into `main`.
