# Royal Pack — Weekly Ledger

A shared, password-gated weekly KPI dashboard for Royal Pack LLC, backed by Supabase.

## Stack
- **Next.js 14** (App Router) — deployed on Vercel
- **Supabase** (Postgres) — `weekly_kpi` table, one row per week
- Shared password gate via middleware — no per-person accounts

## Local setup
```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

## Environment variables (set in Vercel → Project Settings → Environment Variables)
| Name | Notes |
|---|---|
| `SUPABASE_URL` | Project URL, from Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | Anon/publishable key. Kept server-side only — never prefix with `NEXT_PUBLIC_` |
| `APP_PASSWORD` | The shared password everyone uses to log in |
| `AUTH_SALT` | Any random string, e.g. `openssl rand -hex 16` — used to sign the login cookie |

## How the data model works
Historical 2026 weeks were loaded once from the source spreadsheet with `source = 'ledger'`.
New weeks added through the "+ Add Week" button are saved with `source = 'added'`. Both
show up identically in the ledger and charts — the `source` field is just for reference,
visible in each row's expanded detail.

## Pushing to your own GitHub repo
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/royal-pack-kpi.git
git push -u origin main
```
Then in Vercel, "Import Project" from that repo — Vercel will pick up the same
environment variables you already set, and future `git push`es will auto-deploy.
