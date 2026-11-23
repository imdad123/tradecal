# TradeCal — deploy to Vercel for free

This project uses Next.js on Vercel and Supabase for cloud authentication + PostgreSQL. Vercel's filesystem is not persistent, so the database is external by design.

## 1. Create the Supabase database
1. Open https://supabase.com and create a free account.
2. Create a project. Save the database password somewhere safe.
3. In the project, open **SQL Editor → New query**.
4. Copy all of `supabase/schema.sql` into the editor and click **Run**.
5. Open **Project Settings → API** (or **Connect**) and copy:
   - Project URL
   - Publishable key (or legacy anon public key)

Free-plan note: Supabase currently includes a 500 MB database and 1 GB file storage; free projects may pause after one week of inactivity. Check current limits at https://supabase.com/pricing.

## 2. Push this folder to GitHub
1. Extract the ZIP.
2. Create a new GitHub repository.
3. Upload/push the contents of this folder to the repository root (not the enclosing ZIP folder).
4. Do not commit `.env.local` or secret keys.

## 3. Deploy to Vercel
1. Open https://vercel.com and sign in with GitHub.
2. Click **Add New → Project**, import your repository.
3. Framework should be detected as **Next.js**.
4. Before deploying, add these Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase publishable/anon key
5. Click **Deploy**.

## 4. Configure email confirmation
For easiest first test, in Supabase go to **Authentication → URL Configuration** and add your Vercel deployment URL to Site URL and Redirect URLs. If email confirmation is enabled, confirm the signup email before signing in. You can change confirmation settings in Supabase Auth if you prefer.

## 5. Use it
Open your Vercel URL, create an account, and start adding trades. Each user can only read or modify their own trades because Row Level Security is enabled.

## Features in this starter
- Google Calendar-style monthly P&L calendar (Monday-first)
- Green profitable days / red losing days
- Click a day to inspect its trades; double-click to add
- Add/edit/delete trades
- Symbol, side, entry, exit, SL, TP, lot size, realized P&L, strategy and notes
- Monthly P&L, trade count, win rate and all-time P&L
- CSV export and basic CSV import (use this app's exported CSV format)
- Email/password accounts; user-specific database access

## Notes / limitations
- This first version stores realized P&L exactly as entered. It does not calculate forex P&L from pips/lot size because contract size, quote currency, and account currency vary by broker.
- CSV import supports this app's own exported column format; MT5 statement parsing can be added as a follow-up.
- Screenshots/image attachments are not included in this first version.
- Make regular CSV exports. Supabase Free does not include automatic backups and inactive projects can pause. A pause does not mean the database is deleted, but you may need to restore/resume the project.
