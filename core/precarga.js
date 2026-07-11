/**
 * Precarga: traduce una respuesta de pre-consulta (el registro que la paciente
 * envió desde el portal) a la forma del paciente compartido, para que el médico
 * la abra en los instrumentos sin recapturar nada.
 *
 * Regla: solo se precarga lo que la paciente afirmó explícitamente. Lo no
 * contestado queda en null para que lo capture el médico; nada se inventa.
 *
 * Funciones puras y testeables: no tocan estado ni reloj.
 */

import { instrumentosPara } from './ruteoClinico.js';

// Ojo: Number(null) y Number('') dan 0; un dato ausente debe quedar en null.
function num(x) { if (x == null || x === '') return null; const n = Number(x); return Number.isFinite(n) ? n : null; }

/**
 * Forma parcial del paciente compartido a partir del registro enviado.
 * Se mezcla por grupo sobre la forma vacía del contexto (no la reemplaza).
 * El auto-reporte viaja anidado en el paciente: es lo que leen los instrumentos
 * para prellenar (escala de síntomas, dolor, historia clínica).
 */
export function pacienteDesdeRespuesta(registro) {
  const r = registro || {};
  const pac = r.paciente || {};
  const ar = r.autoReporte || {};
  const hc = ar.hc || {};

  const antecedentes = {};
  // Afirmaciones directas de la paciente que mapean uno a uno al paciente
  // compartido. Se precargan como punto de partida; el médico puede corregirlas.
  if (hc.enfDiabetes === true) antecedentes.diabetes = true;
  if (hc.fuma === true) antecedentes.tabaquismo = true;
  // Sangrado anormal reportado: cuenta como sangrado no diagnosticado hasta que
  // el médico lo estudie (pesa en las contraindicaciones de terapia hormonal).
  if (hc.sangrado === true) antecedentes.sangradoNoDx = true;

  return {
    demografia: { nombre: pac.nombre || '', edad: num(pac.edad) },
    antecedentes,
    autoReporte: { mrs: ar.mrs || {}, dolor: ar.dolor || {}, hc },
  };
}

/**
 * Ruteo clínico de la respuesta: el que viajó guardado en el registro o, si la
 * respuesta es anterior a esa versión del contrato, se calcula aquí mismo con
 * el mismo motor. Siempre es una sugerencia; la decisión es del médico.
 */
export function ruteoDesdeRespuesta(registro) {
  const r = registro || {};
  if (r.ruteoClinico && Array.isArray(r.ruteoClinico.instrumentosSugeridos)) {
    return r.ruteoClinico;
  }
  return { ...instrumentosPara(r), generadoEn: r.creado || null };
}
