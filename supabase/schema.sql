-- Run this entire script in Supabase Dashboard > SQL Editor > New query
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_date date not null,
  symbol text not null,
  side text not null check (side in ('Buy','Sell')),
  entry_price numeric,
  exit_price numeric,
  stop_loss numeric,
  take_profit numeric,
  lot_size numeric,
  pnl numeric not null default 0,
  strategy text default '',
  notes text default '',
  created_at timestamptz not null default now()
);
create index if not exists trades_user_date_idx on public.trades(user_id, trade_date desc);
alter table public.trades enable row level security;
drop policy if exists "Users can read their own trades" on public.trades;
create policy "Users can read their own trades" on public.trades for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own trades" on public.trades;
create policy "Users can insert their own trades" on public.trades for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their own trades" on public.trades;
create policy "Users can update their own trades" on public.trades for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own trades" on public.trades;
create policy "Users can delete their own trades" on public.trades for delete using (auth.uid() = user_id);
