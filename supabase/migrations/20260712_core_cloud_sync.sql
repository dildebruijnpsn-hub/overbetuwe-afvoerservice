create table if not exists public.storingen (
  id text primary key,
  aangemaakt timestamptz not null default now(),
  datum text,
  monteur text,
  opdrachtgever text,
  adres text,
  plaats text,
  type_melding text,
  locatie text,
  oorzaak text,
  opgelost text,
  reparatie_nodig text,
  urgentie text default 'Normaal',
  uitvoering text,
  status_storing text default 'Nieuw',
  status_reparatie text default 'Te plannen',
  geplande_datum text,
  opmerking text,
  historie jsonb not null default '[]'::jsonb,
  prijsregels jsonb not null default '[]'::jsonb
);

create table if not exists public.companies (
  id text primary key,
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
  default_payment_term integer not null default 8,
  default_vat_rate text not null default '21',
  default_hourly_rate_cents integer not null default 6500,
  logo_url text,
  review_qr_url text,
  terms_url text,
  payment_terms_url text,
  footer_text text,
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

create table if not exists public.invoice_number_sequences (
  year integer primary key,
  last_number integer not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.next_invoice_number(p_year integer)
returns table(invoice_year integer, sequence_number integer, invoice_number text)
language plpgsql
security definer
set search_path = public
as $$
declare next_number integer;
begin
  insert into public.invoice_number_sequences(year, last_number, updated_at)
  values (p_year, 1, now())
  on conflict (year)
  do update set last_number = public.invoice_number_sequences.last_number + 1, updated_at = now()
  returning last_number into next_number;
  invoice_year := p_year;
  sequence_number := next_number;
  invoice_number := 'F' || p_year::text || '-' || lpad(next_number::text, 4, '0');
  return next;
end;
$$;

revoke all on function public.next_invoice_number(integer) from public;
grant execute on function public.next_invoice_number(integer) to anon, authenticated;

create table if not exists public.invoices (
  id text primary key,
  invoice_number text not null unique,
  invoice_year integer,
  sequence_number integer,
  customer_id text,
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
  subtotal_ex_vat_cents bigint not null default 0,
  vat_amount_cents bigint not null default 0,
  total_inc_vat_cents bigint not null default 0,
  pdf_url text,
  finalized_at timestamptz,
  paid_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_invoice_date_idx on public.invoices(invoice_date);
create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists customers_customer_number_idx on public.customers(customer_number);
create index if not exists storingen_aangemaakt_idx on public.storingen(aangemaakt desc);

alter table public.storingen enable row level security;
alter table public.companies enable row level security;
alter table public.customers enable row level security;
alter table public.invoices enable row level security;

drop policy if exists storingen_app_access on public.storingen;
create policy storingen_app_access on public.storingen for all to anon, authenticated using (true) with check (true);
drop policy if exists companies_app_access on public.companies;
create policy companies_app_access on public.companies for all to anon, authenticated using (true) with check (true);
drop policy if exists customers_app_access on public.customers;
create policy customers_app_access on public.customers for all to anon, authenticated using (true) with check (true);
drop policy if exists invoices_app_access on public.invoices;
create policy invoices_app_access on public.invoices for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.storingen to anon, authenticated;
grant select, insert, update, delete on public.companies to anon, authenticated;
grant select, insert, update, delete on public.customers to anon, authenticated;
grant select, insert, update, delete on public.invoices to anon, authenticated;
grant select, insert, update on public.invoice_number_sequences to anon, authenticated;
