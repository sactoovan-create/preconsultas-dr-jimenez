-- Buzón privado de estudios. Crea un bucket PRIVADO y sus políticas de seguridad por
-- filas: la paciente (anon) puede SUBIR, pero NO leer ni listar; solo el médico
-- autenticado lee y borra. Pégalo en el SQL Editor de Supabase y ejecútalo.
--
-- Tope por archivo: 15 MB. Tipos permitidos: PDF e imágenes. Las imágenes ya llegan
-- comprimidas desde el portal, así que el almacenamiento se llena muy despacio.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'estudios', 'estudios', false, 15728640,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- La paciente (anon) solo puede INSERTAR (subir) en este bucket, y únicamente con la
-- forma "carpeta/archivo" (una carpeta de estudios más el nombre del archivo). Esto
-- impide escribir en la raíz del bucket o crear subrutas arbitrarias.
--
-- Riesgo residual conocido: la clave anon es pública (viaja en el navegador), así que
-- quien la tenga puede subir archivos válidos a carpetas nuevas (posible abuso de
-- almacenamiento). El tope de tamaño por archivo y los tipos permitidos se aplican a
-- nivel de bucket (arriba); el tope de diez archivos es solo del cliente. Para cerrar
-- del todo el vector conviene, más adelante, mover la subida detrás de una Edge
-- Function con la clave de servicio y quitar esta política de anon.
drop policy if exists "estudios_sube_anon" on storage.objects;
create policy "estudios_sube_anon"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'estudios'
    and name ~ '^[^/]+/[^/]+$'
  );

-- El médico autenticado puede LEER/LISTAR los estudios.
drop policy if exists "estudios_lee_medico" on storage.objects;
create policy "estudios_lee_medico"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'estudios');

-- El médico autenticado puede BORRAR un estudio (depurar o atender una solicitud).
drop policy if exists "estudios_borra_medico" on storage.objects;
create policy "estudios_borra_medico"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'estudios');

-- Nota: NO se crea política de SELECT para anon. Por eso la paciente puede subir pero
-- nunca leer ni listar lo que hay en el bucket: los estudios son privados.
