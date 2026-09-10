/** Entrevistas locales opcionales por síntomas. No equivalen a los cuestionarios
 * oficiales citados como referencia. La selección y el diagnóstico son médicos. */

import * as incontinencia from './incontinencia.js';
import * as genitourinario from './genitourinario.js';
import * as saludSexual from './saludSexual.js';
import * as dolorPelvico from './dolorPelvico.js';
import * as sop from './sop.js';

// Orden en que se ofrecen si varias ramas disparan a la vez.
const MODULOS = [incontinencia, genitourinario, saludSexual, dolorPelvico, sop];

/** Módulos cuya condición de disparo se cumple con el tamizaje actual. */
export function profundizacionesSugeridas(autoReporte) {
  return MODULOS.filter((m) => {
    try { return m.disparador(autoReporte); } catch (_) { return false; }
  }).map((m) => ({ id: m.ID, titulo: m.TITULO, fuente: m.FUENTE, tipo: 'Entrevista complementaria', preguntas: m.PREGUNTAS }));
}

/** Conserva únicamente respuestas de módulos que siguen visibles en el flujo. */
export function filtrarProfundizacionesActivas(autoReporte, respuestas) {
  const activas = new Set(profundizacionesSugeridas(autoReporte).map((m) => m.id));
  return Object.fromEntries(
    Object.entries(respuestas || {}).filter(([id]) => activas.has(id)),
  );
}

/** Evalúa las respuestas de una profundización por su id. Devuelve null si no existe. */
export function evaluarProfundizacion(id, respuestas) {
  const m = MODULOS.find((x) => x.ID === id);
  return m ? m.evaluar(respuestas) : null;
}

export { MODULOS };
