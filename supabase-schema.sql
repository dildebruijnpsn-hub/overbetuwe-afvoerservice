create table if not exists public.storingen (
  id text primary key,
  aangemaakt timestamptz default now(),
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
  historie jsonb default '[]'::jsonb,
  prijsregels jsonb default '[]'::jsonb
);

create index if not exists storingen_geplande_datum_idx on public.storingen (geplande_datum);
create index if not exists storingen_datum_idx on public.storingen (datum);
create index if not exists storingen_status_reparatie_idx on public.storingen (status_reparatie);

alter table public.storingen enable row level security;

-- De app gebruikt Vercel serverless functies met SUPABASE_SERVICE_ROLE_KEY.
-- Daarom zijn er geen anonieme browser-policies nodig.
