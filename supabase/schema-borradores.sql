-- Continuación privada de una preconsulta incompleta.
-- El token aleatorio viaja en el fragmento (#) del enlace, que el navegador no
-- envía al servidor web. PostgreSQL guarda solo su hash y el borrador caduca.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.preconsulta_borradores (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  contenido jsonb not null,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  expira timestamptz not null,
  constraint preconsulta_borrador_token_hash check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint preconsulta_borrador_objeto check (jsonb_typeof(contenido) = 'object'),
  constraint preconsulta_borrador_tamano check (length(contenido::text) < 60000)
);

alter table public.preconsulta_borradores enable row level security;
revoke all on public.preconsulta_borradores from anon, authenticated;

create or replace function public.guardar_borrador_preconsulta(p_token text, p_contenido jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_hash text;
  v_expira timestamptz := now() + interval '48 hours';
begin
  if p_token !~ '^[A-Za-z0-9_-]{43}$' then
    raise exception 'token invalido';
  end if;
  if jsonb_typeof(p_contenido) <> 'object' or length(p_contenido::text) >= 60000 then
    raise exception 'borrador invalido';
  end if;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');
  delete from public.preconsulta_borradores where expira <= now();
  -- Tope de costo: incluso ante abuso, los borradores temporales no pueden crecer
  -- sin límite. El cuestionario final sigue funcionando con su respaldo local.
  if not exists (
    select 1 from public.preconsulta_borradores where token_hash = v_hash
  ) and (
    select count(*) from public.preconsulta_borradores
  ) >= 1000 then
    raise exception 'cupo temporal de borradores agotado';
  end if;
  insert into public.preconsulta_borradores (token_hash, contenido, expira)
  values (v_hash, p_contenido, v_expira)
  on conflict (token_hash) do update
    set contenido = excluded.contenido,
        actualizado = now(),
        expira = excluded.expira;
  return v_expira;
end;
$$;

create or replace function public.leer_borrador_preconsulta(p_token text)
returns jsonb
language sql
security definer
set search_path = pg_catalog, public, extensions
as $$
  select contenido
  from public.preconsulta_borradores
  where p_token ~ '^[A-Za-z0-9_-]{43}$'
    and token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and expira > now()
  limit 1;
$$;

create or replace function public.borrar_borrador_preconsulta(p_token text)
returns void
language sql
security definer
set search_path = pg_catalog, public, extensions
as $$
  delete from public.preconsulta_borradores
  where p_token ~ '^[A-Za-z0-9_-]{43}$'
    and token_hash = encode(digest(p_token, 'sha256'), 'hex');
$$;

revoke all on function public.guardar_borrador_preconsulta(text, jsonb) from public;
revoke all on function public.leer_borrador_preconsulta(text) from public;
revoke all on function public.borrar_borrador_preconsulta(text) from public;
grant execute on function public.guardar_borrador_preconsulta(text, jsonb) to anon;
grant execute on function public.leer_borrador_preconsulta(text) to anon;
grant execute on function public.borrar_borrador_preconsulta(text) to anon;
