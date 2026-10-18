-- Run once in the existing Supabase project's SQL Editor.
-- Only finder_* objects are added. No existing application tables are modified.
begin;
create table if not exists public.finder_watches (
  id uuid primary key default gen_random_uuid(),
  name text not null, query text not null,
  color text not null default '' check (color in ('', 'white', 'blue')),
  max_price numeric check (max_price > 0), enabled boolean not null default true,
  created_at timestamptz not null default now(), last_checked_at timestamptz, last_error text
);
create table if not exists public.finder_items (
  id uuid primary key default gen_random_uuid(),
  watch_id uuid not null references public.finder_watches(id) on delete cascade,
  item_id text not null, title text not null, url text not null,
  price numeric, currency text, buying_options jsonb not null default '[]',
  match text not null check (match in ('match', 'review', 'excluded')), reason text not null,
  listed_at timestamptz, first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(), seen boolean not null default false,
  unique(watch_id, item_id)
);
create index if not exists finder_items_recent on public.finder_items(first_seen_at desc, id desc);
create table if not exists public.finder_runs (
  id uuid primary key default gen_random_uuid(), started_at timestamptz not null default now(),
  finished_at timestamptz, status text not null default 'running', summary jsonb
);
alter table public.finder_watches enable row level security;
alter table public.finder_items enable row level security;
alter table public.finder_runs enable row level security;
revoke all on public.finder_watches, public.finder_items, public.finder_runs from anon, authenticated;
grant select, insert, update, delete on public.finder_watches, public.finder_items, public.finder_runs to service_role;

create or replace function public.finder_claim_run() returns uuid
language plpgsql security invoker set search_path = public as $$
declare run_id uuid;
begin
  perform pg_advisory_xact_lock(82147291);
  if exists(select 1 from finder_runs where started_at > now() - interval '5 minutes') then return null; end if;
  update finder_runs set status = 'failed', finished_at = now(), summary = '{"error":"任务超时，等待下次重试"}'
    where status = 'running' and started_at <= now() - interval '5 minutes';
  insert into finder_runs default values returning id into run_id;
  return run_id;
end $$;

create or replace function public.finder_add_watch(entry jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare watch_id uuid;
begin
  perform pg_advisory_xact_lock(82147292);
  if (select count(*) from finder_watches) >= 10 then return null; end if;
  insert into finder_watches(name, query, color, max_price)
    values (entry->>'name', entry->>'query', coalesce(entry->>'color', ''), (entry->>'max_price')::numeric)
    returning id into watch_id;
  return watch_id;
end $$;

create or replace function public.finder_save_results(records jsonb) returns integer
language plpgsql security invoker set search_path = public as $$
declare added integer;
begin
  insert into finder_items(watch_id, item_id, title, url, price, currency, buying_options, match, reason, listed_at, last_seen_at)
  select x.watch_id, x.item_id, x.title, x.url, x.price, x.currency, x.buying_options, x.match, x.reason, x.listed_at, x.last_seen_at
  from jsonb_to_recordset(records) as x(watch_id uuid, item_id text, title text, url text, price numeric,
    currency text, buying_options jsonb, match text, reason text, listed_at timestamptz, last_seen_at timestamptz)
  on conflict (watch_id, item_id) do nothing;
  get diagnostics added = row_count;
  update finder_items i set title = x.title, url = x.url, price = x.price, currency = x.currency,
    buying_options = x.buying_options, match = x.match, reason = x.reason, last_seen_at = x.last_seen_at
  from jsonb_to_recordset(records) as x(watch_id uuid, item_id text, title text, url text, price numeric,
    currency text, buying_options jsonb, match text, reason text, last_seen_at timestamptz)
  where i.watch_id = x.watch_id and i.item_id = x.item_id;
  return added;
end $$;
revoke all on function public.finder_claim_run(), public.finder_add_watch(jsonb), public.finder_save_results(jsonb) from public, anon, authenticated;
grant execute on function public.finder_claim_run(), public.finder_add_watch(jsonb), public.finder_save_results(jsonb) to service_role;

insert into public.finder_watches(id, name, query, color) values
('de207000-0000-4000-8000-000000000001', 'Peugeot 207 CC · 白色', 'Peugeot 207 CC Norev 1/18', 'white'),
('de006000-0000-4000-8000-000000000002', 'Citroën C6 · 蓝色', 'Citroen C6 Norev 1/18', 'blue'),
('de005000-0000-4000-8000-000000000003', 'Citroën DS5 · 不限颜色', 'Citroen DS5 Norev 1/18', '')
on conflict (id) do nothing;
commit;

-- Add persistent per-watch dismissals. Safe to run again; existing data is preserved.
begin;
alter table public.finder_items add column if not exists dismissed_snapshot jsonb;
alter table public.finder_items add column if not exists reopened_at timestamptz;

create or replace function public.finder_item_snapshot(item_title text, item_price numeric, item_currency text, options jsonb)
returns jsonb language sql immutable security invoker set search_path = public as $$
  select jsonb_build_object('title', item_title, 'price', item_price, 'currency', item_currency,
    'buying_options', coalesce((select jsonb_agg(value order by value) from jsonb_array_elements(coalesce(options, '[]'::jsonb))), '[]'::jsonb));
$$;

create or replace function public.finder_dismiss_item(target_id uuid, expected jsonb)
returns boolean language plpgsql security invoker set search_path = public as $$
declare affected integer;
begin
  update finder_items set dismissed_snapshot = expected, seen = true
    where id = target_id
      and finder_item_snapshot(title, price, currency, buying_options) = expected;
  get diagnostics affected = row_count;
  return affected = 1;
end $$;

create or replace function public.finder_save_results(records jsonb) returns integer
language plpgsql security invoker set search_path = public as $$
declare added integer;
begin
  insert into finder_items(watch_id, item_id, title, url, price, currency, buying_options, match, reason, listed_at, last_seen_at)
  select x.watch_id, x.item_id, x.title, x.url, x.price, x.currency, x.buying_options, x.match, x.reason, x.listed_at, x.last_seen_at
  from jsonb_to_recordset(records) as x(watch_id uuid, item_id text, title text, url text, price numeric,
    currency text, buying_options jsonb, match text, reason text, listed_at timestamptz, last_seen_at timestamptz)
  on conflict (watch_id, item_id) do nothing;
  get diagnostics added = row_count;

  update finder_items i set title = x.title, url = x.url, price = x.price, currency = x.currency,
    buying_options = x.buying_options, match = x.match, reason = x.reason, last_seen_at = x.last_seen_at,
    dismissed_snapshot = case when i.dismissed_snapshot is not null
      and i.dismissed_snapshot is distinct from finder_item_snapshot(x.title, x.price, x.currency, x.buying_options)
      then null else i.dismissed_snapshot end,
    reopened_at = case when i.dismissed_snapshot is not null
      and i.dismissed_snapshot is distinct from finder_item_snapshot(x.title, x.price, x.currency, x.buying_options)
      then now() else i.reopened_at end,
    seen = case when i.dismissed_snapshot is not null
      and i.dismissed_snapshot is distinct from finder_item_snapshot(x.title, x.price, x.currency, x.buying_options)
      then false else i.seen end
  from jsonb_to_recordset(records) as x(watch_id uuid, item_id text, title text, url text, price numeric,
    currency text, buying_options jsonb, match text, reason text, last_seen_at timestamptz)
  where i.watch_id = x.watch_id and i.item_id = x.item_id;
  return added;
end $$;

revoke all on function public.finder_item_snapshot(text, numeric, text, jsonb), public.finder_dismiss_item(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.finder_item_snapshot(text, numeric, text, jsonb), public.finder_dismiss_item(uuid, jsonb) to service_role;
commit;
