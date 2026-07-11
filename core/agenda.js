/**
 * Agenda del día. El expediente (ERP) publica en Supabase, tabla `agenda_dia`, las
 * citas de hoy sincronizadas desde Huli. El portal las lee para ordenar el panel del
 * médico por quién viene hoy, cruzándolas con los cuestionarios que ya llegaron.
 *
 * Solo lectura: el médico autenticado consulta; nadie escribe desde el portal.
 * Si no hay base de datos configurada (modo local de prueba) o la tabla no existe
 * aún, devuelve una lista vacía sin romper: el panel simplemente no muestra agenda.
 */

import { clienteSupabase } from './respuestas.js';
import { normalizarTelefono, normalizarNombre } from './emparejar.js';

function hayBackend() {
  return !!(import.meta.env && import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

/** Fecha local de hoy en formato AAAA-MM-DD (la misma noción de "hoy" del médico). */
export function hoyLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

/**
 * Citas de hoy publicadas por el expediente. Cada una: { inicio, fin, nombre,
 * telefono, cita_id, estado }. Vacío si no hay base o no hay tabla.
 */
export async function agendaDeHoy(fecha = hoyLocal()) {
  if (!hayBackend()) return [];
  try {
    const sb = await clienteSupabase();
    const { data, error } = await sb
      .from('agenda_dia')
      .select('*')
      .eq('fecha', fecha)
      .order('inicio', { ascending: true });
    if (error) return []; // tabla ausente o sin permiso: el panel sigue sin agenda
    return data || [];
  } catch (_) {
    return [];
  }
}

/**
 * Cruza la agenda de hoy con las respuestas recibidas. Devuelve las citas del día,
 * cada una con la respuesta emparejada (o null), y aparte las respuestas que no
 * corresponden a ninguna cita de hoy (llegaron de alguien no agendado hoy).
 *
 * Emparejamiento: teléfono (últimos diez dígitos) primero; si no, por nombre
 * normalizado. Cada respuesta se usa una sola vez. Es una ayuda de orden, no un
 * dato clínico: el médico ve el estado y decide.
 */
export function cruzarAgenda(agenda, respuestas) {
  const citas = agenda || [];
  const resp = (respuestas || []).slice();

  // Índices para emparejar sin recorrer todo cada vez.
  const usadas = new Set();
  const porTelefono = new Map();
  const porNombre = new Map();
  resp.forEach((r, i) => {
    const tel = normalizarTelefono(r.paciente && r.paciente.telefono);
    const nom = normalizarNombre(r.paciente && r.paciente.nombre);
    if (tel && !porTelefono.has(tel)) porTelefono.set(tel, i);
    if (nom && !porNombre.has(nom)) porNombre.set(nom, i);
  });

  const tomar = (indice) => {
    if (indice == null || usadas.has(indice)) return null;
    usadas.add(indice);
    return resp[indice];
  };

  const agendadas = citas.map((c) => {
    const tel = normalizarTelefono(c.telefono);
    const nom = normalizarNombre(c.nombre);
    let idx = tel && porTelefono.has(tel) ? porTelefono.get(tel) : null;
    if ((idx == null || usadas.has(idx)) && nom && porNombre.has(nom)) idx = porNombre.get(nom);
    const respuesta = tomar(idx);
    return { cita: c, respuesta, contesto: !!respuesta };
  });

  const sinAgendar = resp.filter((_, i) => !usadas.has(i));
  return { agendadas, sinAgendar };
}
