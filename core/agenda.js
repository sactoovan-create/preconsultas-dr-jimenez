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
export async function agendaDeHoy(fecha = hoyLocal(), { estricto = false } = {}) {
  if (!hayBackend()) {
    if (import.meta.env?.DEV && typeof window !== 'undefined' && ['127.0.0.1', 'localhost'].includes(window.location.hostname)) {
      try { return JSON.parse(localStorage.getItem('drj_qa_agenda') || '[]').filter(c => c.fecha === fecha); }
      catch (_) { return []; }
    }
    return [];
  }
  try {
    const sb = await clienteSupabase();
    const { data, error } = await sb
      .from('agenda_dia')
      .select('*')
      .eq('fecha', fecha)
      .order('inicio', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) {
    if (estricto) throw error;
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
    if (tel) porTelefono.set(tel, [...(porTelefono.get(tel) || []), i]);
    if (nom) porNombre.set(nom, [...(porNombre.get(nom) || []), i]);
  });

  const tomar = (indice) => {
    if (indice == null || usadas.has(indice)) return null;
    usadas.add(indice);
    return resp[indice];
  };

  const agendadas = citas.map((c) => {
    const tel = normalizarTelefono(c.telefono);
    const nom = normalizarNombre(c.nombre);
    let idx = null, criterio = null, advertencia = null;
    const telefonos = (porTelefono.get(tel) || []).filter(i => !usadas.has(i));
    const nombresDistintos = new Set(telefonos.map(i => normalizarNombre(resp[i].paciente?.nombre)));
    if (telefonos.length) {
      idx = nombresDistintos.size > 1
        ? telefonos.find(i => nom && normalizarNombre(resp[i].paciente?.nombre) === nom)
        : telefonos[0];
      if (idx == null) advertencia = 'Teléfono compartido; no se puede asociar automáticamente.';
      else {
        criterio = 'teléfono';
        if (nom && normalizarNombre(resp[idx].paciente?.nombre) !== nom) advertencia = 'El nombre es distinto; confirma la identidad.';
      }
    }
    if (idx == null && !advertencia && nom) {
      const nombres = (porNombre.get(nom) || []).filter(i => !usadas.has(i));
      const compatibles = nombres.filter(i => {
        const otroTel = normalizarTelefono(resp[i].paciente?.telefono);
        return !tel || !otroTel || tel === otroTel;
      });
      if (compatibles.length) { idx = compatibles[0]; criterio = 'nombre'; advertencia = 'Coincidencia por nombre; confirma la identidad.'; }
      else if (nombres.length) advertencia = 'Mismo nombre con teléfono diferente; sin asociación automática.';
    }
    const respuesta = tomar(idx);
    return { cita: c, respuesta, contesto: !!respuesta, criterio, advertencia };
  });

  const sinAgendar = resp.filter((_, i) => !usadas.has(i));
  return { agendadas, sinAgendar };
}
