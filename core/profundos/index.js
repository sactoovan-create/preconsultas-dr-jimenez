/**
 * Registro de PROFUNDIZACIONES: instrumentos validados, más específicos, que se
 * ofrecen a la paciente SOLO cuando su tamizaje lo amerita. Convierte la
 * pre-consulta en algo que se profundiza solo: la paciente contesta el tamizaje y,
 * si sale positivo, se le ofrece el instrumento de mayor peso de evidencia para esa
 * rama, dándole al médico un panorama mucho más certero antes de la consulta.
 *
 * Siempre OPCIONAL y orientativo: se ofrece, no se impone; la decisión y el
 * diagnóstico son del médico. Cada módulo trae su disparador, sus preguntas y su
 * evaluación pura. Agregar una rama nueva = un archivo aquí y registrarlo abajo.
 *
 * Ramas previstas (según el informe de cuestionarios del consultorio):
 *  - incontinencia (ICIQ-SF)            [construida]
 *  - genitourinario / GSM (síntoma más molesto + calidad de vida, DIVA/VSQ)  [pendiente]
 *  - salud sexual (Índice de función sexual femenina, versión breve)         [pendiente]
 *  - dolor pélvico / endometriosis (ENDOPAIN-4D, mapa clínico)               [pendiente]
 *  - síndrome poliendocrino (calidad de vida, PCOSQ)                         [pendiente]
 */

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
  }).map((m) => ({ id: m.ID, titulo: m.TITULO, fuente: m.FUENTE, preguntas: m.PREGUNTAS }));
}

/** Evalúa las respuestas de una profundización por su id. Devuelve null si no existe. */
export function evaluarProfundizacion(id, respuestas) {
  const m = MODULOS.find((x) => x.ID === id);
  return m ? m.evaluar(respuestas) : null;
}

export { MODULOS };
