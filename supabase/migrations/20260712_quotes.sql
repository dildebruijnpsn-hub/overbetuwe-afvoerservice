create table if not exists public.quote_number_sequences (
  year integer primary key,
  last_number integer not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.next_quote_number(p_year integer)
returns table(quote_year integer, sequence_number integer, quote_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number integer;
begin
  insert into public.quote_number_sequences(year, last_number, updated_at)
  values (p_year, 1, now())
  on conflict (year)
  do update set last_number = public.quote_number_sequences.last_number + 1, updated_at = now()
  returning last_number into next_number;

  quote_year := p_year;
  sequence_number := next_number;
  quote_number := 'O' || p_year::text || '-' || lpad(next_number::text, 4, '0');
  return next;
end;
$$;

revoke all on function public.next_quote_number(integer) from public;
grant execute on function public.next_quote_number(integer) to anon, authenticated;

create table if not exists public.quotes (
  id text primary key,
  quote_number text not null unique,
  quote_year integer,
  sequence_number integer,
  customer_id text,
  quote_date date,
  valid_until date,
  status text not null default 'Concept',
  reference text,
  work_address text,
  work_house_number text,
  work_address_addition text,
  work_postal_code text,
  work_city text,
  expected_execution_date date,
  expected_duration text,
  description text,
  notes text,
  subtotal_ex_vat_cents integer not null default 0,
  vat_amount_cents integer not null default 0,
  total_inc_vat_cents integer not null default 0,
  pdf_url text,
  finalized_pdf_url text,
  sent_pdf_url text,
  sent_at timestamptz,
  sent_to_email text,
  sent_email_subject text,
  sent_email_body text,
  accepted_at timestamptz,
  accepted_email text,
  accepted_by text,
  acceptance_note text,
  acceptance_evidence_url text,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  converted_to_invoice_at timestamptz,
  invoice_id text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_items (
  id text primary key,
  quote_id text not null references public.quotes(id) on delete cascade,
  sort_order integer not null default 0,
  service_rate_id text,
  description text not null,
  quantity numeric not null,
  unit text not null,
  unit_price_ex_vat_cents integer not null,
  discount_percentage numeric not null default 0,
  vat_rate text not null default '21',
  line_subtotal_cents integer not null default 0,
  line_vat_cents integer not null default 0,
  line_total_cents integer not null default 0,
  rate_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_photos (
  id text primary key,
  quote_id text not null references public.quotes(id) on delete cascade,
  sort_order integer not null default 0,
  storage_path text not null,
  caption text,
  category text,
  created_at timestamptz not null default now()
);

create table if not exists public.quote_events (
  id text primary key,
  quote_id text not null references public.quotes(id) on delete cascade,
  event_type text not null,
  old_status text,
  new_status text,
  description text,
  user_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.quote_versions (
  id text primary key,
  quote_id text not null references public.quotes(id) on delete cascade,
  version_number integer not null,
  pdf_url text,
  customer_snapshot jsonb not null default '{}'::jsonb,
  project_snapshot jsonb not null default '{}'::jsonb,
  items_snapshot jsonb not null default '[]'::jsonb,
  totals_snapshot jsonb not null default '{}'::jsonb,
  terms_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (quote_id, version_number)
);

create index if not exists quotes_status_idx on public.quotes(status);
create index if not exists quotes_customer_id_idx on public.quotes(customer_id);
create index if not exists quotes_quote_date_idx on public.quotes(quote_date);
create index if not exists quote_items_quote_id_idx on public.quote_items(quote_id);
create index if not exists quote_events_quote_id_idx on public.quote_events(quote_id);
create index if not exists quote_versions_quote_id_idx on public.quote_versions(quote_id);

alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.quote_photos enable row level security;
alter table public.quote_events enable row level security;
alter table public.quote_versions enable row level security;

drop policy if exists quotes_app_access on public.quotes;
create policy quotes_app_access on public.quotes for all to anon, authenticated using (true) with check (true);
drop policy if exists quote_items_app_access on public.quote_items;
create policy quote_items_app_access on public.quote_items for all to anon, authenticated using (true) with check (true);
drop policy if exists quote_photos_app_access on public.quote_photos;
create policy quote_photos_app_access on public.quote_photos for all to anon, authenticated using (true) with check (true);
drop policy if exists quote_events_app_access on public.quote_events;
create policy quote_events_app_access on public.quote_events for all to anon, authenticated using (true) with check (true);
drop policy if exists quote_versions_app_access on public.quote_versions;
create policy quote_versions_app_access on public.quote_versions for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.quotes to anon, authenticated;
grant select, insert, update, delete on public.quote_items to anon, authenticated;
grant select, insert, update, delete on public.quote_photos to anon, authenticated;
grant select, insert, update, delete on public.quote_events to anon, authenticated;
grant select, insert, update, delete on public.quote_versions to anon, authenticated;
grant select, insert, update on public.quote_number_sequences to anon, authenticated;
