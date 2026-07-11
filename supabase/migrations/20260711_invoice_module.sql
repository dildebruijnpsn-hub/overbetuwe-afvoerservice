begin;

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trade_name text,
  address text,
  postal_code text,
  city text,
  phone text,
  email text,
  website text,
  kvk_number text,
  vat_number text,
  iban text,
  bic text,
  logo_url text,
  review_qr_url text,
  terms_url text,
  payment_terms_url text,
  footer_text text,
  default_payment_term integer not null default 8,
  default_vat_rate text not null default '21',
  default_hourly_rate_cents integer not null default 6500,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id text primary key,
  company_name text,
  contact_name text,
  address text,
  postal_code text,
  city text,
  phone text,
  email text,
  customer_number text,
  vat_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_sequences (
  invoice_year integer primary key,
  last_sequence integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id text primary key,
  invoice_number text not null unique,
  invoice_year integer not null,
  sequence_number integer not null,
  customer_id text references public.customers(id),
  invoice_date date,
  due_date date,
  delivery_date_from date,
  delivery_date_to date,
  work_address text,
  work_postal_code text,
  work_city text,
  reference text,
  work_order_number text,
  client_name text,
  description text,
  status text not null default 'Concept',
  payment_status text not null default 'Open',
  subtotal_ex_vat_cents integer not null default 0,
  vat_amount_cents integer not null default 0,
  total_inc_vat_cents integer not null default 0,
  pdf_url text,
  finalized_at timestamptz,
  paid_at timestamptz,
  created_by uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(invoice_year, sequence_number)
);

create table if not exists public.invoice_items (
  id text primary key,
  invoice_id text references public.invoices(id) on delete cascade,
  sort_order integer not null default 0,
  description text not null,
  quantity numeric(12, 3) not null default 1,
  unit text not null default 'post',
  unit_price_ex_vat_cents integer not null default 0,
  discount_percentage numeric(5, 2) not null default 0,
  vat_rate text not null default '21',
  line_subtotal_cents integer not null default 0,
  line_vat_cents integer not null default 0,
  line_total_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_photos (
  id text primary key,
  invoice_id text references public.invoices(id) on delete cascade,
  sort_order integer not null default 0,
  storage_path text,
  caption text,
  category text,
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_events (
  id uuid primary key default gen_random_uuid(),
  invoice_id text references public.invoices(id) on delete cascade,
  event_type text not null,
  old_status text,
  new_status text,
  user_id uuid,
  created_at timestamptz not null default now()
);

create or replace function public.next_invoice_number(p_year integer default extract(year from now())::integer)
returns table(invoice_number text, invoice_year integer, sequence_number integer)
language plpgsql
security definer
as $$
declare
  next_seq integer;
begin
  insert into public.invoice_sequences(invoice_year, last_sequence)
  values (p_year, 1)
  on conflict (invoice_year)
  do update set last_sequence = public.invoice_sequences.last_sequence + 1, updated_at = now()
  returning last_sequence into next_seq;

  invoice_year := p_year;
  sequence_number := next_seq;
  invoice_number := 'F' || p_year::text || '-' || lpad(next_seq::text, 4, '0');
  return next;
end;
$$;

alter table public.companies enable row level security;
alter table public.customers enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.invoice_photos enable row level security;
alter table public.invoice_events enable row level security;
alter table public.invoice_sequences enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['companies','customers','invoices','invoice_items','invoice_photos','invoice_events','invoice_sequences']
  loop
    execute format('drop policy if exists "%s_authenticated_all" on public.%I', tbl, tbl);
    execute format('create policy "%s_authenticated_all" on public.%I for all to authenticated using (true) with check (true)', tbl, tbl);
    execute format('drop policy if exists "%s_anon_all" on public.%I', tbl, tbl);
    execute format('create policy "%s_anon_all" on public.%I for all to anon using (true) with check (true)', tbl, tbl);
  end loop;
end $$;

insert into public.companies (
  id, legal_name, trade_name, phone, email, website, kvk_number, vat_number, iban,
  default_payment_term, default_vat_rate, default_hourly_rate_cents, logo_url, review_qr_url, footer_text
) values (
  '00000000-0000-0000-0000-000000000001',
  'Overbetuwe Riool- en Afvoerservice B.V.',
  'Overbetuwe Riool- en Afvoerservice',
  '+31 6 209 119 45',
  'info@overbetuweafvoerservice.nl',
  'overbetuweafvoerservice.nl',
  '42055087',
  'NL869501707B01',
  'NL82 ABNA 0154 6027 28',
  8,
  '21',
  6500,
  '/overbetuwe-logo.jpg',
  '/google-review-qr.png',
  'Op deze factuur zijn onze algemene voorwaarden en betalingsvoorwaarden van toepassing.'
) on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('invoice-pdfs', 'invoice-pdfs', false), ('invoice-photos', 'invoice-photos', false)
on conflict (id) do nothing;

commit;
