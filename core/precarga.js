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
import { PRECARGA_VERSION, numeroClinico } from './precargaClinica.js';

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
  if (hc.cancerMamaPersonal === true) antecedentes.cancerMama = true;
  if (hc.enfTrombosis === true) antecedentes.tromboembolismo = true;
  // Los antecedentes amplios requieren precisar el diagnóstico, no inferirlo.
  if (hc.enfCorazon === true) antecedentes.corazonPorPrecisar = true;
  if (hc.enfHepatica === true) antecedentes.hepaticaPorPrecisar = true;

  const demografia = { nombre: pac.nombre || '', edad: numeroClinico(pac.edad, 1, 110) };
  const campos = [];
  const registrar = (grupo, destino, valor, fuente, etiqueta) => {
    if (valor == null || valor === '') return;
    grupo[destino] = valor;
    campos.push({ destino: (grupo === demografia ? 'demografia.' : 'antecedentes.') + destino, valor, fuente, etiqueta });
  };
  registrar(demografia, 'nombre', pac.nombre, 'paciente.nombre', 'Nombre');
  registrar(demografia, 'edad', numeroClinico(pac.edad, 1, 110), 'paciente.edad', 'Edad');
  if (typeof hc.histerectomiaConfirmada === 'boolean') registrar(demografia, 'histerectomia', hc.histerectomiaConfirmada, 'autoReporte.hc.histerectomiaConfirmada', 'Histerectomía reportada');
  else if (hc.etapaReproductiva === 'histerectomia') registrar(demografia, 'histerectomia', true, 'autoReporte.hc.etapaReproductiva', 'Histerectomía reportada');
  if (hc.causaAusenciaRegla === 'menopausia_confirmada') {
    registrar(demografia, 'etapaReproductiva', 'post', 'autoReporte.hc.causaAusenciaRegla', 'Menopausia confirmada según autorreporte');
    registrar(demografia, 'edadMenopausia', numeroClinico(hc.edadMenopausiaReportada, 10, demografia.edad || 70), 'autoReporte.hc.edadMenopausiaReportada', 'Edad de menopausia reportada');
  }
  const seleccionExplicita = Array.isArray(hc.antecedentesSeleccionados) && hc.antecedentesSeleccionados.length > 0;
  for (const [dest, src, label] of [
    ['diabetes', 'enfDiabetes', 'Diabetes reportada'], ['cancerMama', 'cancerMamaPersonal', 'Antecedente de cáncer de mama'],
    ['tromboembolismo', 'enfTrombosis', 'Antecedente de trombosis'],
  ]) {
    if (hc[src] === true || (seleccionExplicita && hc[src] === false)) registrar(antecedentes, dest, hc[src], 'autoReporte.hc.' + src, label);
  }
  if (['actual', 'antes', 'nunca'].includes(hc.tabacoEstado)) registrar(antecedentes, 'tabaquismo', hc.tabacoEstado === 'actual', 'autoReporte.hc.tabacoEstado', 'Tabaco actual');
  else if (hc.fuma === true) registrar(antecedentes, 'tabaquismo', true, 'autoReporte.hc.fuma', 'Tabaco actual');
  for (const [dest, src, label] of [
    ['antihipertensivo', 'tomaAntihipertensivo', 'Tratamiento para presión'], ['estatina', 'tomaEstatina', 'Estatina'],
    ['ecvEstablecida', 'eventoCardiovascularConfirmado', 'Enfermedad cardiovascular reportada'],
  ]) if (typeof hc[src] === 'boolean') registrar(antecedentes, dest, hc[src], 'autoReporte.hc.' + src, label);
  if (hc.sangrado === true) registrar(antecedentes, 'sangradoNoDx', true, 'autoReporte.hc.sangrado', 'Sangrado por estudiar');

  return {
    demografia,
    antecedentes,
    procedencia: { version: PRECARGA_VERSION, tipo: 'autorreporte', respuestaId: r.id || null, fecha: r.creado || null, campos },
    autoReporte: {
      mrs: ar.mrs || {},
      dolor: ar.dolor || {},
      hc,
      profundos: ar.profundos || {},
    },
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
