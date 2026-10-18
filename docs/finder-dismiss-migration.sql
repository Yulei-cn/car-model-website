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
