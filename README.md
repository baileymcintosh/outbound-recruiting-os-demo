# Outbound Recruiting OS

Speed-first outbound engine for student recruiting outreach.

## Flow

1. Sign up with Supabase auth
2. Search the alumni/contact database
3. Select targets and create a campaign
4. Connect Gmail
5. Run the send queue and auto-schedule follow-ups

## Stack

- Next.js App Router
- Supabase for auth + Postgres
- Gmail API for sending
- Vercel cron routes for queue processing

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in the values.

3. In Supabase SQL editor, run:

```sql
\i supabase/migrations/001_init.sql
\i supabase/seed.sql
```

4. In Google Cloud:

- Enable `Gmail API`
- Configure the OAuth consent screen
- Add redirect URI: `http://localhost:3000/api/gmail/callback`

5. Start the app:

```bash
npm run dev
```

## Routes

- `/login`
- `/search`
- `/dashboard`
- `/campaigns/[id]`

## Public Demo

A public static demo site lives under `docs/` and is intended for GitHub Pages deployment.

- It is generated from an anonymized export of `Networking Tracker.xlsx`
- Names are masked
- Direct contact details are hidden
- Campaign activity is simulated client-side in browser storage

To regenerate the public demo dataset locally:

```bash
python scripts/generate_public_demo_data.py
```

## Queue workers

- `/api/cron/send` sends due emails
- `/api/cron/follow-up` schedules follow-ups after 5 days without a marked reply

The campaign page can trigger both locally. Production cron config lives in `vercel.json`.
