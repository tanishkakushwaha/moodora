# Deploy Moodora to Vercel

The source is prepared for Vercel’s Next.js runtime. A hosted PostgreSQL database and your Vercel account authorization are required. Your laptop’s PostgreSQL server at `127.0.0.1:55439` cannot serve as the database for Vercel.

## 1. Push the deployment configuration

In your normal Linux terminal:

```bash
bash "$HOME/Desktop/My Moodora/scripts/push-github.sh"
```

This uploads the new Vercel configuration to `tanishkakushwaha/moodbloom`. The generated `.env.vercel` file is excluded from Git.

## 2. Import your GitHub repository

1. Sign in to https://vercel.com using your GitHub account.
2. Choose **Add New → Project** and import `tanishkakushwaha/moodbloom`.
3. Use **Next.js** as the framework, the repository root as the root directory, and Node.js **24.x**.
4. The committed `vercel.json` selects `npm run build:vercel`. Leave the output directory at its framework default.

Do not expect a database-less deployment to support login or journaling. If you create the Vercel project before adding its database, the first build may stop at the explicit environment check. Connect storage, add the remaining environment variables, then redeploy.

## 3. Connect PostgreSQL

In the Vercel dashboard, open **Storage**, select a PostgreSQL provider such as **Neon**, and connect the database to this project. Select the provider plan appropriate for your account.

For the Neon Vercel-managed integration, connect with no custom variable prefix:

- `DATABASE_URL`: pooled connection string for application queries.
- `DATABASE_URL_UNPOOLED`: direct connection string used for Prisma migrations.

For an existing provider, add its pooled URL as `DATABASE_URL`. Add its direct URL as `DIRECT_DATABASE_URL` when the pooler requires direct migration access. Both URLs must point to the same database and environment. The Prisma config prefers `DIRECT_DATABASE_URL`, then `DATABASE_URL_UNPOOLED`, then `DATABASE_URL`.

Connect Production first. If you enable Preview deployments, use isolated preview database branches/credentials for Preview. The build runs committed migrations on the database configured for that deployment; do not point experimental preview schemas at your production database.

This creates the hosted schema; it does not copy the accounts or diary entries stored on your laptop.

## 4. Add authentication environment variables

A private `.env.vercel` has been generated in the project folder with a fresh production secret. Open it locally and add its two values to the Vercel project’s **Settings → Environment Variables**:

| Variable | Value |
| --- | --- |
| `AUTH_SECRET` | The generated value in `.env.vercel` |
| `AUTH_TRUST_HOST` | `true` |

Keep **Automatically expose System Environment Variables** enabled. `AUTH_URL` can be left unset: Auth.js detects Vercel’s host, the app accepts only its configured Vercel domains, and session cookies use HTTPS. For a custom domain, set `AUTH_URL` to its HTTPS origin, such as `https://your-domain.example`.

Do not import the local `.env` wholesale: it contains a localhost database URL and a localhost authentication URL.

Google login is optional. To enable it, add both `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` and register this Google OAuth callback for the actual deployed domain:

```text
https://YOUR_ACTUAL_DOMAIN/api/auth/callback/google
```

## 5. Deploy and verify

Click **Deploy**, or **Redeploy** after adding the environment variables. The hosted build:

1. Validates required environment settings without logging secrets.
2. Generates the Prisma client.
3. Applies committed migrations with `prisma migrate deploy`.
4. Builds Next.js.

The website then runs as Vercel Functions; it does not use `scripts/launch.sh` or start a local PostgreSQL service.

Open the **actual URL returned by Vercel**. Check `/api/health`; it should return `database: true`. Create a hosted account and verify login, mood logging, diary creation/editing, saved quotes, and logout.

The local integration suite intentionally runs only against localhost and creates temporary users. Do not point it at a hosted production database. Keep personal-data migration, if desired, as a separate explicit operation.

## Deployment is not yet confirmed

Preparing and pushing this configuration does not itself deploy the website. Vercel authorization, a hosted database, and environment variables must be configured, and a deployment must finish successfully before a live URL can be reported.

## References

- [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [PostgreSQL integrations on Vercel](https://vercel.com/docs/postgres)
- [Neon’s Vercel-managed integration](https://neon.com/docs/guides/vercel-managed-integration)
- [Prisma 7 deployment to Vercel](https://www.prisma.io/docs/orm/v7/prisma-client/deployment/serverless/deploy-to-vercel)
- [Auth.js deployment](https://authjs.dev/getting-started/deployment)

## Fix: Cannot resolve environment variable DATABASE_URL

This means a database connection string has not been added to that Vercel environment. Connect Neon through Storage to inject `DATABASE_URL` and `DATABASE_URL_UNPOOLED`, or add your hosted provider’s values in Settings → Environment Variables. Apply them to Production for a production deployment.

The updated Prisma config permits client generation during dependency installation without any database credentials. The hosted build then performs an explicit environment check before migrations. A regression test generates the actual Prisma client in a clean temporary project with all database URL variables absent.

If Vercel’s log still says commit `4330f8f`, it is building the initial upload. Push the current changes with `scripts/push-github.sh`, then deploy the latest `main` commit. Redeploying the old commit will not include the fix or the `24.x` Node setting.
