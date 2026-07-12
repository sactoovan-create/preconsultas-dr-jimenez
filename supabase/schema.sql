-- Esquema de la base de datos del consultorio (Supabase / PostgreSQL).
-- Ejecutar una vez en el editor SQL de Supabase (SQL Editor → New query → pegar → Run).

-- Autoriza únicamente al primer usuario creado en Auth: el médico principal.
-- Un usuario nuevo no obtiene acceso a datos clínicos solo por autenticarse.
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

-- Tabla de respuestas de las pacientes.
create table if not exists public.respuestas (
  id        uuid primary key default gen_random_uuid(),
  creado    timestamptz not null default now(),
  nombre    text,
  contenido jsonb not null,
  -- Tope de tamaño: limita cargas enormes desde el endpoint público (anti-abuso).
  constraint respuestas_contenido_tamano check (length(contenido::text) < 60000)
);

create index if not exists respuestas_creado_idx on public.respuestas (creado desc);

-- Seguridad a nivel de fila: nadie accede salvo por las reglas de abajo.
alter table public.respuestas enable row level security;

-- La paciente (rol anónimo, con la clave pública) solo puede INSERTAR su respuesta.
-- No puede leer ninguna respuesta, ni la propia ni la de otras.
drop policy if exists "paciente_inserta" on public.respuestas;
create policy "paciente_inserta"
  on public.respuestas for insert
  to anon
  with check (true);

-- El médico (autenticado) puede LEER todas las respuestas.
drop policy if exists "medico_lee" on public.respuestas;
create policy "medico_lee"
  on public.respuestas for select
  to authenticated
  using ((select public.es_medico_principal()));

-- El médico (autenticado) puede BORRAR respuestas: depurar spam o atender una
-- solicitud de borrado de datos de la paciente (derechos de protección de datos).
drop policy if exists "medico_borra" on public.respuestas;
create policy "medico_borra"
  on public.respuestas for delete
  to authenticated
  using ((select public.es_medico_principal()));

-- Nota: el usuario del médico se crea en Authentication → Users → Add user
-- (con su correo y una contraseña). Con ese usuario inicia sesión en el panel.
