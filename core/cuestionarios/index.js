/**
 * Cuestionarios validados de la preconsulta (decisión del Dr., 19/10/2026).
 *
 * Activos (texto oficial en español con licencia libre):
 *   - PHQ-9, siempre (phq9.js).
 *   - CSI-Sp, cuando hay dolor pélvico (mismo criterio que el ruteo de dolor pélvico y
 *     endometriosis: la paciente eligió el tema «dolor» o reportó dolor) (csi.js).
 * Pendientes de licencia o registro, sin texto y sin conexión al flujo: PCS, BPI-SF,
 * GSRS e ICIQ-UI SF (pendientes.js).
 *
 * Forma en el registro (CONTRATO-PRECONSULTA.md):
 *   autoReporte.<clave> = { version, respuestas: { <reactivo>: valor } }
 *   resumen.<clave>     = lectura congelada al enviar (evaluar() de cada módulo)
 *   alertaSeguridad.phq9 = regla fija del reactivo 9
 * Funciones puras, sin reloj ni red, verificables con tests/cuestionarios.mjs.
 */

import * as phq9 from './phq9.js';
import * as csi from './csi.js';
import { PENDIENTES } from './pendientes.js';

/** Orden de aparición en el flujo: primero el de dolor, después el estado de ánimo. */
export const ACTIVOS = [csi, phq9];
export { PENDIENTES, phq9, csi };

const PREFIJO = 'cuestionario:';

function lista(x) { return Array.isArray(x) ? x : []; }

export function moduloCuestionario(clave) {
  return ACTIVOS.find((m) => m.CLAVE === clave) || null;
}

/** El CSI se ofrece con dolor pélvico: mismo disparador que `instrumentosPara`. */
export function disparaCsi({ hc, dolor } = {}) {
  return (dolor || {}).tiene === true || lista((hc || {}).temasConsulta).includes('dolor');
}

/** Cuestionarios que corresponden a este tamizaje, en el orden del flujo. */
export function cuestionariosSugeridos(tamizaje = {}) {
  return ACTIVOS.filter((m) => m.CLAVE === 'phq9' || (m.CLAVE === 'csi' && disparaCsi(tamizaje)))
    .map((m) => ({ id: m.CLAVE, titulo: m.TITULO_PASO, sigla: m.SIGLA }));
}

/** Inserta un paso por cuestionario antes de «Tu salud general» (o antes del envío). */
export function insertarPasosCuestionarios(pasos = [], sugeridos = []) {
  if (!sugeridos.length) return pasos;
  const nuevos = sugeridos.map((c) => ({ id: PREFIJO + c.id, titulo: c.titulo, cuestionarioId: c.id }));
  const sinPrevios = pasos.filter((p) => !String(p.id).startsWith(PREFIJO));
  let i = sinPrevios.findIndex((p) => p.id === 'antecedentes');
  if (i < 0) i = sinPrevios.findIndex((p) => p.id === 'envio');
  if (i < 0) i = sinPrevios.length;
  return [...sinPrevios.slice(0, i), ...nuevos, ...sinPrevios.slice(i)];
}

export function esPasoCuestionario(id) {
  return String(id || '').startsWith(PREFIJO);
}

/** Limpia las respuestas: solo reactivos conocidos y valores válidos. No inventa ceros. */
export function normalizarRespuestas(clave, respuestas) {
  const r = respuestas && typeof respuestas === 'object' ? respuestas : {};
  const limpio = {};
  if (clave === 'phq9') {
    [...phq9.ITEMS, phq9.DIFICULTAD].forEach((it) => {
      const v = phq9.valorItem(r[it.id]);
      if (v != null) limpio[it.id] = v;
    });
  } else if (clave === 'csi') {
    csi.ITEMS_A.forEach((it) => {
      const v = csi.valorItem(r[it.id]);
      if (v != null) limpio[it.id] = v;
    });
    csi.ITEMS_B.forEach((it) => {
      if (r[it.id] === 'si' || r[it.id] === 'no') limpio[it.id] = r[it.id];
      // El año solo se conserva con «sí»: un año sin diagnóstico no significa nada.
      const anio = csi.valorAnio(r[it.anioId]);
      if (r[it.id] === 'si' && anio != null) limpio[it.anioId] = anio;
    });
  }
  return limpio;
}

/**
 * Objeto que viaja en `autoReporte`: una entrada por cuestionario ofrecido, incluso
 * vacía (así el PHQ-9 sin respuesta queda como «ofrecido, sin dato de seguridad»).
 */
export function cuestionariosParaEnviar(tamizaje, cuestionarios = {}) {
  const salida = {};
  cuestionariosSugeridos(tamizaje).forEach(({ id }) => {
    const m = moduloCuestionario(id);
    salida[id] = { version: m.VERSION, respuestas: normalizarRespuestas(id, cuestionarios?.[id]?.respuestas) };
  });
  return salida;
}

function respuestasDe(autoReporte, clave) {
  const entrada = (autoReporte || {})[clave];
  return entrada && typeof entrada === 'object' ? (entrada.respuestas || {}) : null;
}

/** Lecturas congeladas para `resumen.<clave>`; solo de los cuestionarios presentes. */
export function resumenCuestionarios(autoReporte) {
  const salida = {};
  ACTIVOS.forEach((m) => {
    const r = respuestasDe(autoReporte, m.CLAVE);
    if (r) salida[m.CLAVE] = m.evaluar(r);
  });
  return salida;
}

/** Regla del reactivo 9 para `alertaSeguridad`. Null si el PHQ-9 no se ofreció. */
export function alertaPhq9(autoReporte) {
  const r = respuestasDe(autoReporte, 'phq9');
  if (!r) return null;
  const lectura = phq9.evaluar(r);
  const s = lectura.seguridad;
  return {
    version: phq9.VERSION,
    item9: s.item9,
    positivo: s.positivo,
    alerta: s.alerta,
    sinDatoItem9: s.sinDatoItem9,
    prioridad: s.prioridad,
    motivos: s.motivos,
    total: lectura.total,
    mensaje: phq9.mensajeAlertaPhq9(s, lectura.total),
  };
}

/** Une la orientación urgente existente con la regla del PHQ-9 sin perder campos. */
export function combinarAlertaSeguridad(base, autoReporte) {
  const alerta = { urgente: false, embarazoConSintomas: false, saludMental: false, senales: [], senalesMaternas: [], ...(base || {}) };
  const p = alertaPhq9(autoReporte);
  if (!p) return alerta;
  return { ...alerta, saludMental: alerta.saludMental === true || p.alerta, phq9: p };
}

/** Banderas para `ruteoClinico.banderas` (el ERP las muestra como pendientes). */
export function banderasCuestionarios(autoReporte) {
  const p = alertaPhq9(autoReporte);
  if (!p || !p.mensaje) return [];
  return [{
    tipo: p.alerta ? 'roja' : 'aviso',
    codigo: p.positivo ? 'phq9_item9_positivo' : p.alerta ? 'phq9_total_grave' : 'phq9_sin_dato_item9',
    mensaje: p.mensaje,
    instrumentoRelacionado: 'phq9',
  }];
}

/** Recordatorio suave para el paso (null si no hace falta). Nunca bloquea el envío. */
export function recordatorioCuestionario(clave, respuestas) {
  const m = moduloCuestionario(clave);
  return m ? m.recordatorio(respuestas || {}) : null;
}
