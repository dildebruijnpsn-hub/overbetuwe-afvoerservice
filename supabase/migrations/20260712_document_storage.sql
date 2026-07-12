insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'oras-documenten',
  'oras-documenten',
  true,
  20971520,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "oras_documenten_lezen" on storage.objects;
create policy "oras_documenten_lezen"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'oras-documenten');

drop policy if exists "oras_documenten_toevoegen" on storage.objects;
create policy "oras_documenten_toevoegen"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'oras-documenten');

drop policy if exists "oras_documenten_bijwerken" on storage.objects;
create policy "oras_documenten_bijwerken"
on storage.objects for update
to anon, authenticated
using (bucket_id = 'oras-documenten')
with check (bucket_id = 'oras-documenten');
