-- Corte a "público blindado" con Cloudflare Turnstile.
--
-- EJECUTAR SOLO cuando ya:
--   1) creaste el sitio de Turnstile y pusiste TURNSTILE_SECRET en la Edge Function,
--   2) desplegaste la Edge Function enviar-respuesta,
--   3) definiste VITE_TURNSTILE_SITE_KEY en Vercel y re-desplegaste el portal,
--   4) verificaste que un envío de prueba SÍ entra por la función.
--
-- Este script revoca el insert anónimo directo: a partir de aquí, solo la Edge
-- Function enviar-respuesta (que usa la clave de servicio y salta la seguridad por
-- filas) puede insertar. Si lo ejecutas ANTES de los pasos de arriba, los envíos de
-- las pacientes dejarán de funcionar.
--
-- Para REVERTIR (volver al insert anónimo directo), vuelve a crear la política:
--   create policy "paciente_inserta" on public.respuestas
--     for insert to anon with check (true);

drop policy if exists "paciente_inserta" on public.respuestas;
