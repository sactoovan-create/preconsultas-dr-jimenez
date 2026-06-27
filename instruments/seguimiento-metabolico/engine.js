/**
 * Seguimiento metabólico (control de peso con tirzepatida / semaglutida).
 *
 * Compara el panel de composición corporal de la báscula de bioimpedancia entre el
 * inicio y la visita actual, y orienta la conducta con base en la evidencia:
 *  - La pérdida de peso con tirzepatida es sustancial (SURMOUNT-1: ~21% a 72 semanas).
 *  - ~26% de lo perdido suele ser masa magra; vigilarla por MASA (kg), no por porcentaje
 *    (el porcentaje de músculo sube al bajar la grasa aunque el músculo en kg baje).
 *  - Preservar músculo: proteína 1.2-1.6 g/kg/día + entrenamiento de resistencia 2-3/sem.
 *  - La grasa visceral es mejor marcador metabólico que el peso solo.
 *  - Recordatorios ginecológicos: la tirzepatida reduce la absorción de anticonceptivos
 *    ORALES (barrera/no-oral 4 semanas tras iniciar y cada aumento de dosis); la pérdida
 *    de peso puede restaurar la ovulación.
 *
 * Es captura puntual (basal vs actual). El historial longitudinal de muchas visitas vive
 * en el expediente (ERP), no aquí.
 */

function v(x) { const n = Number(x); return Number.isFinite(n) ? n : null; }
function delta(a, b) { return (v(a) != null && v(b) != null) ? Number((a - b).toFixed(1)) : null; }

const FARMACOS = {
  tirzepatida: 'Tirzepatida', semaglutida: 'Semaglutida', liraglutida: 'Liraglutida', otro: 'Otro',
};

/** Interpreta la pérdida de peso porcentual desde el inicio. */
export function interpretarPerdida(pct) {
  if (pct == null) return { etiqueta: 'Sin datos para comparar', estado: 'neutro', detalle: 'Captura el peso inicial y el actual para medir el avance.' };
  if (pct >= 15) return { etiqueta: `Respuesta excelente (${pct}%)`, estado: 'ok', detalle: 'Pérdida igual o mayor al 15%; mantener el plan y vigilar masa muscular.' };
  if (pct >= 10) return { etiqueta: `Respuesta buena (${pct}%)`, estado: 'ok', detalle: 'Pérdida del 10% o más; beneficio metabólico relevante.' };
  if (pct >= 5) return { etiqueta: `Respuesta clínicamente significativa (${pct}%)`, estado: 'ok', detalle: 'Pérdida del 5% o más: ya hay beneficio metabólico.' };
  if (pct > 0) return { etiqueta: `Respuesta insuficiente (${pct}%)`, estado: 'aviso', detalle: 'Menos del 5%: revisar adherencia, dosis, alimentación y actividad antes de escalar.' };
  return { etiqueta: 'Sin pérdida de peso', estado: 'alerta', detalle: 'No hay descenso de peso: reevaluar adherencia, técnica de aplicación, dosis y causas secundarias.' };
}

export function evaluarSeguimiento(paciente, datos) {
  const d = datos || {};
  const b = d.basal || {}, a = d.actual || {};

  const pesoPerdido = delta(b.peso, a.peso); // positivo = bajó
  const pct = (v(b.peso) && pesoPerdido != null && b.peso > 0) ? Number(((pesoPerdido / b.peso) * 100).toFixed(1)) : null;
  const perdida = interpretarPerdida(pct);

  // Masa muscular en kg (no porcentaje): peso * %músculo / 100
  const masaBasal = (v(b.peso) != null && v(b.musculo) != null) ? Number((b.peso * b.musculo / 100).toFixed(1)) : null;
  const masaActual = (v(a.peso) != null && v(a.musculo) != null) ? Number((a.peso * a.musculo / 100).toFixed(1)) : null;
  const deltaMusculoKg = (masaBasal != null && masaActual != null) ? Number((masaActual - masaBasal).toFixed(1)) : null;
  const fraccionMusculo = (deltaMusculoKg != null && pesoPerdido != null && pesoPerdido > 0)
    ? Number(((-deltaMusculoKg) / pesoPerdido).toFixed(2)) : null;

  let musculoEstado = 'ok', musculoNota = 'Masa muscular preservada con los datos capturados.';
  let banderaMusculo = false;
  if (fraccionMusculo != null && fraccionMusculo > 0.4) {
    musculoEstado = 'alerta'; banderaMusculo = true;
    musculoNota = `Una parte alta de la pérdida (${Math.round(fraccionMusculo * 100)}%) es masa muscular. Reforzar proteína y entrenamiento de resistencia.`;
  } else if (deltaMusculoKg != null && deltaMusculoKg < 0) {
    musculoEstado = 'aviso';
    musculoNota = `Descenso de masa muscular de ${Math.abs(deltaMusculoKg)} kg. Vigilar proteína y resistencia.`;
  }

  const tendencias = {
    peso: { basal: v(b.peso), actual: v(a.peso), delta: pesoPerdido != null ? -pesoPerdido : null, unidad: 'kg' },
    imc: { basal: v(b.imc), actual: v(a.imc), delta: delta(a.imc, b.imc), unidad: '' },
    grasa: { basal: v(b.grasa), actual: v(a.grasa), delta: delta(a.grasa, b.grasa), unidad: '%' },
    musculoKg: { basal: masaBasal, actual: masaActual, delta: deltaMusculoKg, unidad: 'kg' },
    visceral: { basal: v(b.visceral), actual: v(a.visceral), delta: delta(a.visceral, b.visceral), unidad: 'nivel' },
    cintura: { basal: v(b.cintura), actual: v(a.cintura), delta: delta(a.cintura, b.cintura), unidad: 'cm' },
    metabolismo: { basal: v(b.metabolismo), actual: v(a.metabolismo), delta: delta(a.metabolismo, b.metabolismo), unidad: 'kcal' },
    edadCorporal: { basal: v(b.edadCorporal), actual: v(a.edadCorporal), delta: delta(a.edadCorporal, b.edadCorporal), unidad: 'años' },
  };

  // Recordatorios (siempre, para esta población)
  const recordatorios = [
    'Preservar músculo: proteína 1.2 a 1.6 gramos por kilogramo al día (20 a 30 g por comida) y entrenamiento de resistencia dos a tres veces por semana.',
  ];
  if (d.anticonceptivoOral) {
    recordatorios.push('Interacción anticonceptiva: la tirzepatida reduce la absorción de anticonceptivos orales. Usar método de barrera o no oral durante cuatro semanas al iniciar y tras cada aumento de dosis.');
  }
  if (d.buscaEmbarazo) {
    recordatorios.push('Si busca embarazo: suspender el fármaco. La pérdida de peso puede restaurar la ovulación; planear con anticipación.');
  } else {
    recordatorios.push('Anticoncepción confiable y descartar embarazo: la pérdida de peso puede restaurar la ovulación, sobre todo en síndrome poliendocrino.');
  }

  const banderas = [];
  if (banderaMusculo) banderas.push(musculoNota);

  const farmacoNombre = FARMACOS[d.farmaco] || (d.farmaco ? d.farmaco : null);

  // ---- Hoja para la paciente (sin tecnicismos) ----
  const hojaPaciente = {
    titulo: 'Tu avance',
    identificacion: { nombre: paciente.demografia?.nombre, edad: paciente.demografia?.edad },
    secciones: [],
    recomendaciones: [
      { tema: 'Proteína', texto: 'Incluye proteína en cada comida; ayuda a conservar tu músculo mientras bajas de peso.' },
      { tema: 'Fuerza', texto: 'Haz ejercicio de fuerza dos o tres veces por semana.' },
      { tema: 'Constancia', texto: 'Acude a tus citas de control; ahí ajustamos lo que haga falta.' },
    ],
  };
  if (pct != null) {
    hojaPaciente.secciones.push({
      titulo: 'Tu progreso', filas: [
        { parametro: 'Peso perdido', valor: `${pesoPerdido} kg (${pct}%)`, estado: perdida.estado === 'alerta' ? 'rev' : 'ok' },
        ...(tendencias.visceral.delta != null ? [{ parametro: 'Grasa abdominal (visceral)', valor: tendencias.visceral.delta <= 0 ? 'Bajó' : 'Subió', estado: tendencias.visceral.delta <= 0 ? 'ok' : 'rev' }] : []),
      ],
    });
  }

  return {
    farmacoNombre, semanas: v(d.semanas),
    perdida, pct, pesoPerdido,
    tendencias,
    musculo: { masaBasal, masaActual, deltaKg: deltaMusculoKg, fraccion: fraccionMusculo, estado: musculoEstado, nota: musculoNota, bandera: banderaMusculo },
    recordatorios, banderas,
    hojaPaciente,
  };
}
