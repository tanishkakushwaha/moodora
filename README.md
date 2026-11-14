# Moodora

A Korean-inspired self-care and journaling app, redesigned directly in the existing project. Pastel pink and lavender stationery, daisies, bows, hearts, and gentle animations surround a simple everyday experience.

## Everyday features

- Home: daily mood check-in, a diary shortcut, real entry/streak counts, recent pages, and a daily quote.
- Moods: eight feelings, optional notes, past-date editing, and mood history.
- Diary: optional titles, writing prompts, private entries, search, filters, editing, deletion, and unsaved-change protection.
- Calendar: monthly moods and diary entries by date, with links to write or log a mood for the selected day.
- More: saved quotes, copy/share actions, emotional trends, profile, appearance settings, password changes, and data export.
- A one-minute breathing pause with pause, resume, and reset controls.
- Responsive desktop navigation and mobile bottom tabs, dark mode, keyboard focus, and reduced-motion support.

The landing page has a clearly labelled interactive mood preview. Account screens display real records and empty states.

## Start locally

Requires Node.js 24 (24.11 or newer) and PostgreSQL 16. In the project folder:

```bash
npm run launch
```

On this computer, the launcher is also available at:

```bash
bash "$HOME/Desktop/My Moodora/scripts/launch.sh"
```

The launcher installs dependencies, starts the existing local PostgreSQL database, applies committed migrations, validates and builds the app, and runs live integration checks. It prints the actual browser address and opens the browser after the checks pass. Keep the terminal open. It selects a free port if 3000 is occupied.

After setup, use `npm run dev` for development. For the existing production build, `npm start` starts the web server; PostgreSQL must also be running.

No additional project directory was created for Moodora. The previous `fresh-app` directory is excluded from this application's TypeScript configuration, Git, and Vercel upload.

## Configuration and data

Existing `.env` credentials and database records are preserved. The local database uses port 55439. Setup generates random database and authentication credentials when no `.env` exists. Never commit `.env`, `.env.vercel`, or `.data`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection used by the application |
| `AUTH_SECRET` | Random authentication secret |
| `AUTH_URL` | Local browser origin, normally `http://localhost:3000` |
| `AUTH_TRUST_HOST` | `true` for the trusted application host |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Optional Google OAuth credentials; configure both to enable Google login |

Sessions and theme storage retain their internal identifiers so this redesign does not unnecessarily log out existing users or reset their preferences.

## Verification

```bash
npm run typecheck
npm test
npm run build
npm run test:integration
```

The integration runner uses temporary accounts to test signup, login, protected routes, diary CRUD, mood updates, account isolation, quotes, settings, password/session invalidation, and logout. It removes its own test records. It can reuse a local app or start a temporary server.

A restricted coding terminal may block network sockets with `EPERM`. In that case, run live integration checks and the launcher from the normal Linux terminal. A production build verifies compilation and rendering; it does not replace live account testing.

## Production

This change prepares local application code; it does not publish a new deployment or change an existing domain. When deploying, import this project into Vercel, use Node.js 24, connect hosted PostgreSQL, and configure production environment variables. The laptop's local database URL cannot be used by a hosted deployment.

The committed `vercel.json` selects `npm run build:vercel`, which validates production configuration, generates Prisma, applies committed migrations, and builds Next.js. Use `DATABASE_URL_UNPOOLED` or `DIRECT_DATABASE_URL` for migrations when the runtime connection is pooled. Keep preview databases separate from production.

On Vercel, `AUTH_URL` can be omitted to use the detected HTTPS deployment domain. Set it explicitly when using a custom HTTPS domain. Generate a separate production `AUTH_SECRET` with `openssl rand -hex 32`.

Verify account creation, login, saving a mood, writing and reopening a diary entry, and logout against the actual production address before considering deployment complete.

## Stack and privacy

Next.js App Router, TypeScript, Tailwind CSS, Auth.js, Prisma/PostgreSQL, Zod, React Hook Form, Recharts, Framer Motion, Lucide, Sonner, and shadcn-style Radix components. The existing local font is bundled with its license; the new illustrations use SVG and CSS, with no paid asset service or additional dependency.

Passwords use salted scrypt and timing-safe comparison. Private queries are scoped to the authenticated user. API mutations validate input and origin, and password changes invalidate previous sessions. Journal text is rendered as text. Stored entries are private to the account through application access controls; they are not end-to-end encrypted. See the in-app privacy page for details.
