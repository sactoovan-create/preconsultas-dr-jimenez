/**
 * Trabajo clínico del médico en la NUBE. Lo que el médico captura y evalúa por
 * paciente (datos, resultados, decisiones) se guarda en Supabase, no solo en este
 * equipo, para verlo y continuarlo desde cualquier lado.
 *
 * Escribe y lee el médico autenticado; la seguridad por filas (RLS) restringe la
 * tabla `trabajo_clinico` al médico principal (misma función es_medico_principal()
 * que ya protege respuestas y estudios). La paciente (anon) no tiene acceso.
 *
 * El respaldo local (localStorage) sigue existiendo en PacienteContext como copia
 * instantánea y modo sin conexión; esta capa es la fuente en la nube.
 */

import { clienteSupabase } from './respuestas.js';

const TABLA = 'trabajo_clinico';

/** ¿Hay base de datos configurada? (mismas variables que el resto del portal.) */
export function nubeActiva() {
  return !!(import.meta.env && import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

/**
 * Trae el trabajo guardado en la nube para una paciente. Devuelve el contenido con
 * su sello de actualización, o null si no hay o si falla (sin romper: se usará el
 * respaldo local). `clave` = identificador de la paciente (el id de la respuesta).
 */
export async function cargarTrabajoNube(clave) {
  if (!nubeActiva() || clave == null) return null;
  try {
    const sb = await clienteSupabase();
    const { data, error } = await sb
      .from(TABLA)
      .select('contenido, actualizado')
      .eq('paciente_clave', String(clave))
      .maybeSingle();
    if (error || !data) return null;
    return { ...(data.contenido || {}), guardadoEn: data.actualizado || (data.contenido && data.contenido.guardadoEn) || null };
  } catch (_) {
    return null;
  }
}

/**
 * Guarda (upsert) el trabajo de una paciente en la nube. Devuelve true si se logró.
 * Mejor esfuerzo: si falla (sin sesión, sin red), el respaldo local sigue vigente.
 */
export async function guardarTrabajoNube(clave, contenido) {
  if (!nubeActiva() || clave == null) return false;
  try {
    const sb = await clienteSupabase();
    const { error } = await sb
      .from(TABLA)
      .upsert(
        { paciente_clave: String(clave), contenido, actualizado: new Date().toISOString() },
        { onConflict: 'paciente_clave' },
      );
    return !error;
  } catch (_) {
    return false;
  }
}

/** Borra el trabajo de una paciente en la nube (al reiniciar o depurar). */
export async function borrarTrabajoNube(clave) {
  if (!nubeActiva() || clave == null) return;
  try {
    const sb = await clienteSupabase();
    await sb.from(TABLA).delete().eq('paciente_clave', String(clave));
  } catch (_) { /* mejor esfuerzo */ }
}
