-- Buzón privado de estudios. Crea un bucket PRIVADO y sus políticas de seguridad por
-- filas: la paciente usa una sesión anónima autenticada y puede SUBIR/LEER/BORRAR
-- únicamente sus propios objetos; el médico principal lee y borra cualquier estudio.
-- Activa Anonymous Sign-Ins en Supabase Auth.
--
-- Tope por archivo: 15 MB. Tipos permitidos: PDF e imágenes. Las imágenes ya llegan
-- comprimidas desde el portal, así que el almacenamiento se llena muy despacio.

-- Autoriza únicamente al primer usuario creado en Auth: el médico principal.
create or replace function public.es_medico_principal()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) = (
    select id from auth.users order by created_at asc limit 1
  );
$$;

revoke all on function public.es_medico_principal() from public;
grant execute on function public.es_medico_principal() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'estudios', 'estudios', false, 15728640,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Retira la política pública anterior. Cada navegador obtiene una sesión anónima
-- aislada; `owner_id` impide borrar archivos de otra paciente aunque conozca la ruta.
drop policy if exists "estudios_sube_anon" on storage.objects;
drop policy if exists "estudios_sube_paciente" on storage.objects;
create policy "estudios_sube_paciente"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'estudios'
    and name ~ '^[^/]+/[^/]+$'
    and owner_id = (select auth.uid()::text)
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false)
  );

-- Storage consulta los metadatos del objeto para completar ciertas operaciones
-- (incluida la eliminación). La sesión solo ve objetos cuyo owner_id es el suyo;
-- nunca puede ver estudios de otra paciente ni listar sus carpetas.
drop policy if exists "estudios_lee_paciente" on storage.objects;
create policy "estudios_lee_paciente"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'estudios'
    and owner_id = (select auth.uid()::text)
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false)
  );

drop policy if exists "estudios_borra_paciente" on storage.objects;
create policy "estudios_borra_paciente"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'estudios'
    and owner_id = (select auth.uid()::text)
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false)
  );

-- El médico autenticado puede LEER/LISTAR los estudios.
drop policy if exists "estudios_lee_medico" on storage.objects;
create policy "estudios_lee_medico"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'estudios'
    and (select public.es_medico_principal())
  );

-- El médico autenticado puede BORRAR un estudio (depurar o atender una solicitud).
drop policy if exists "estudios_borra_medico" on storage.objects;
create policy "estudios_borra_medico"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'estudios'
    and (select public.es_medico_principal())
  );

-- La sesión anónima solo puede ver sus propios objetos. Esto permite que Storage
-- confirme y retire una carga, sin exponer archivos de otra paciente.
