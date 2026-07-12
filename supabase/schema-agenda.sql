-- Agenda del día en el portal. El expediente (ERP) publica aquí las citas de hoy
-- sincronizadas desde Huli; el portal las lee para ordenar el panel del médico por
-- quién viene hoy y cruzarlas con los cuestionarios recibidos.
--
-- La escritura la hace SOLO el expediente con la clave de servicio (service key),
-- del lado servidor. El portal del médico solo lee. Pégalo en el editor SQL de
-- Supabase después de crear el usuario médico.

-- Este proyecto es de un solo médico. Se autoriza únicamente al primer usuario
-- creado en Auth (el usuario médico), incluso si el registro por correo quedara
-- abierto por accidente. SECURITY DEFINER permite consultar auth.users sin
-- exponer esa tabla al navegador.
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

create table if not exists public.agenda_dia (
  cita_id      text primary key,
  fecha        date not null,
  inicio       timestamptz not null,
  fin          timestamptz,
  nombre       text,
  telefono     text,
  estado       text,
  actualizado  timestamptz not null default now()
);

-- Consulta por día: la que hace el portal al abrir el panel.
create index if not exists agenda_dia_fecha_idx on public.agenda_dia (fecha, inicio);

alter table public.agenda_dia enable row level security;
revoke all on table public.agenda_dia from anon;
grant select on table public.agenda_dia to authenticated;
grant all on table public.agenda_dia to service_role;

-- Solo el usuario médico principal puede leer la agenda. `authenticated` por sí
-- solo no basta: cualquier cuenta registrada también pertenece a ese rol.
drop policy if exists "agenda_lee_medico" on public.agenda_dia;
create policy "agenda_lee_medico"
  on public.agenda_dia for select
  to authenticated
  using ((select public.es_medico_principal()));

-- Al ejecutar esta migración en un proyecto existente, endurece también las
-- políticas médicas de respuestas y estudios. Es condicional para que el script
-- siga siendo reutilizable aunque alguno de esos módulos todavía no exista.
do $$
begin
  if to_regclass('public.respuestas') is not null then
    execute 'drop policy if exists "medico_lee" on public.respuestas';
    execute 'create policy "medico_lee" on public.respuestas for select to authenticated using ((select public.es_medico_principal()))';
    execute 'drop policy if exists "medico_borra" on public.respuestas';
    execute 'create policy "medico_borra" on public.respuestas for delete to authenticated using ((select public.es_medico_principal()))';
  end if;

  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "estudios_lee_medico" on storage.objects';
    execute 'create policy "estudios_lee_medico" on storage.objects for select to authenticated using (bucket_id = ''estudios'' and (select public.es_medico_principal()))';
    execute 'drop policy if exists "estudios_borra_medico" on storage.objects';
    execute 'create policy "estudios_borra_medico" on storage.objects for delete to authenticated using (bucket_id = ''estudios'' and (select public.es_medico_principal()))';
  end if;
end
$$;

-- La paciente (anon) NO puede leer la agenda: no se crea ninguna política para anon,
-- así que con la seguridad por filas activada queda sin acceso.

-- La escritura no necesita política: la clave de servicio del expediente ignora la
-- seguridad por filas. Si algún día se quisiera escribir con clave anon (no es el
-- caso), habría que agregar políticas explícitas de insert/update/delete.
