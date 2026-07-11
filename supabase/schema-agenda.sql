-- Agenda del día en el portal. El expediente (ERP) publica aquí las citas de hoy
-- sincronizadas desde Huli; el portal las lee para ordenar el panel del médico por
-- quién viene hoy y cruzarlas con los cuestionarios recibidos.
--
-- La escritura la hace SOLO el expediente con la clave de servicio (service key),
-- del lado servidor. El portal (médico autenticado) solo lee. La paciente (anon)
-- no tiene acceso a esta tabla. Pégalo en el editor de SQL de Supabase y ejecútalo.

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

-- El médico autenticado puede leer la agenda.
drop policy if exists "agenda_lee_medico" on public.agenda_dia;
create policy "agenda_lee_medico"
  on public.agenda_dia for select
  to authenticated
  using (true);

-- La paciente (anon) NO puede leer la agenda: no se crea ninguna política para anon,
-- así que con la seguridad por filas activada queda sin acceso.

-- La escritura no necesita política: la clave de servicio del expediente ignora la
-- seguridad por filas. Si algún día se quisiera escribir con clave anon (no es el
-- caso), habría que agregar políticas explícitas de insert/update/delete.
