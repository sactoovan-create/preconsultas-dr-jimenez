-- Trabajo clínico del médico en la nube. Guarda, por paciente, lo que el médico
-- captura y evalúa en los instrumentos (datos, resultados, decisiones), para verlo
-- y continuarlo desde cualquier equipo, no solo en el navegador donde se capturó.
--
-- Solo el médico principal lee y escribe (misma función es_medico_principal() que
-- ya protege respuestas y estudios). La paciente (anon) no tiene acceso.
-- Pégalo en el editor de SQL de Supabase y ejecútalo.

create table if not exists public.trabajo_clinico (
  paciente_clave text primary key,      -- identificador de la paciente (id de la respuesta)
  contenido      jsonb not null,          -- el trabajo: paciente, resultados, datos de instrumentos, decisiones
  actualizado    timestamptz not null default now()
);

alter table public.trabajo_clinico enable row level security;
revoke all on table public.trabajo_clinico from anon;
grant all on table public.trabajo_clinico to authenticated;
grant all on table public.trabajo_clinico to service_role;

-- Solo el médico principal puede leer y escribir su trabajo clínico.
drop policy if exists "trabajo_medico_todo" on public.trabajo_clinico;
create policy "trabajo_medico_todo"
  on public.trabajo_clinico
  for all
  to authenticated
  using ((select public.es_medico_principal()))
  with check ((select public.es_medico_principal()));
