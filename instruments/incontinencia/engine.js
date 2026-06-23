/**
 * Lógica del instrumento de Incontinencia Urinaria. Funciones puras.
 *
 * Base: evaluación de la incontinencia urinaria del American College of
 * Obstetricians and Gynecologists; clasificación del tipo con la lógica del
 * Questionnaire for Urinary Incontinence Diagnosis (tres reactivos de esfuerzo y
 * tres de urgencia); severidad e impacto con la lógica del International
 * Consultation on Incontinence Questionnaire (forma corta); y el diario miccional
 * recomendado por la International Continence Society.
 *
 * Pensado para detectar la incontinencia no diagnosticada y orientar el manejo.
 * Cubre mujeres adultas. Instrumento de apoyo a la decisión.
 */

const v = (x) => x !== null && x !== undefined && !isNaN(x);
const n0 = (x) => (v(x) ? x : 0);

export const ITEMS_ESFUERZO = [
  { id: 'esf_tos', texto: 'Pérdida de orina al toser o estornudar' },
  { id: 'esf_actividad', texto: 'Pérdida de orina al hacer ejercicio o actividad física' },
  { id: 'esf_levantar', texto: 'Pérdida de orina al levantar peso o agacharse' },
];
export const ITEMS_URGENCIA = [
  { id: 'urg_sensacion', texto: 'Pérdida asociada a una necesidad fuerte y repentina de orinar' },
  { id: 'urg_llegar', texto: 'Pérdida de orina antes de llegar al baño' },
  { id: 'urg_camino', texto: 'Pérdida de orina mientras va de camino al baño' },
];
export const FREC_OPCIONES = ['Nunca', 'Rara vez', 'A veces', 'A menudo', 'Casi siempre', 'Siempre'];

/** Clasifica el tipo según los puntajes de esfuerzo y urgencia. */
export function clasificarTipo(d) {
  const esfuerzo = ITEMS_ESFUERZO.reduce((a, i) => a + n0(d[i.id]), 0);
  const urgencia = ITEMS_URGENCIA.reduce((a, i) => a + n0(d[i.id]), 0);
  const esfPos = esfuerzo >= 4;
  const urgPos = urgencia >= 6;
  let tipo, etiqueta;
  if (esfPos && urgPos) { tipo = 'mixta'; etiqueta = 'Incontinencia mixta'; }
  else if (esfPos) { tipo = 'esfuerzo'; etiqueta = 'Incontinencia de esfuerzo'; }
  else if (urgPos) { tipo = 'urgencia'; etiqueta = 'Incontinencia de urgencia'; }
  else if (esfuerzo > 0 || urgencia > 0) { tipo = 'indeterminada'; etiqueta = 'Síntomas leves o no concluyentes'; }
  else { tipo = 'ninguna'; etiqueta = 'Sin síntomas capturados'; }
  const predominio = tipo === 'mixta' ? (esfuerzo >= urgencia ? 'esfuerzo' : 'urgencia') : null;
  return { tipo, etiqueta, esfuerzo, urgencia, predominio };
}

/** Severidad e impacto, con la lógica del cuestionario internacional. */
export function evaluarSeveridad(d) {
  if (!v(d.frecuenciaPerdida) && !v(d.cantidadPerdida) && !v(d.impactoVida)) return null;
  const pesoCantidad = [0, 2, 4, 6][n0(d.cantidadPerdida)] || 0;
  const puntaje = n0(d.frecuenciaPerdida) + pesoCantidad + n0(d.impactoVida);
  let nivel, estado;
  if (puntaje <= 5) { nivel = 'leve'; estado = 'ok'; }
  else if (puntaje <= 12) { nivel = 'moderada'; estado = 'aviso'; }
  else if (puntaje <= 18) { nivel = 'severa'; estado = 'alerta'; }
  else { nivel = 'muy severa'; estado = 'alerta'; }
  return { puntaje, nivel, estado };
}

/** Hábitos de vejiga a corregir. */
export function evaluarHabitos(d) {
  const h = [];
  if (d.cafeina) h.push('Reducir cafeína: es irritante vesical y aumenta la urgencia.');
  if (d.alcohol) h.push('Moderar el alcohol, que aumenta la producción de orina y la urgencia.');
  if (d.liquidosAltos) h.push('Ajustar la ingesta de líquidos: ni excesiva ni muy restringida, y reducirla por la noche.');
  if (v(d.frecuenciaDiurna) && d.frecuenciaDiurna > 8) h.push('Frecuencia urinaria diurna aumentada; el entrenamiento vesical ayuda a espaciar las micciones.');
  if (v(d.nicturia) && d.nicturia >= 2) h.push('Nicturia relevante; revisar líquidos vespertinos y causas asociadas.');
  if (d.vaciaPorSiAcaso) h.push('Evitar orinar "por si acaso": refuerza la urgencia y reduce la capacidad funcional.');
  return h;
}

/** Interpreta el resumen del diario miccional que trae la paciente. */
export function interpretarDiario(d) {
  if (!d.tieneDiario) return null;
  const notas = [];
  if (v(d.diarioFrecuenciaDiurna)) notas.push(d.diarioFrecuenciaDiurna > 8 ? `Frecuencia diurna aumentada (${d.diarioFrecuenciaDiurna} micciones).` : `Frecuencia diurna normal (${d.diarioFrecuenciaDiurna} micciones).`);
  if (v(d.diarioNicturia)) notas.push(d.diarioNicturia >= 2 ? `Nicturia de ${d.diarioNicturia} episodios.` : `Nicturia mínima.`);
  if (v(d.diarioEpisodios)) notas.push(`${d.diarioEpisodios} episodios de incontinencia en el registro.`);
  if (v(d.diarioVolumenMax)) notas.push(d.diarioVolumenMax < 200 ? `Capacidad funcional reducida (volumen máximo ${d.diarioVolumenMax} mililitros).` : `Volumen máximo de ${d.diarioVolumenMax} mililitros.`);
  return notas;
}

/** Banderas de alarma. */
export function evaluarBanderas(d) {
  const b = [];
  if (d.hematuria) b.push('Hematuria: descartar causa urológica; la cistoscopia se justifica.');
  if (d.dolorVesical) b.push('Dolor vesical o al orinar: valorar infección u otra causa.');
  if (d.infeccionesRecurrentes) b.push('Infecciones urinarias recurrentes: estudio dirigido.');
  if (d.vaciamientoIncompleto) b.push('Síntomas de vaciamiento incompleto: medir orina residual para descartar retención.');
  if (d.prolapso) b.push('Prolapso de órganos pélvicos: valoración conjunta, orienta a uroginecología.');
  return b;
}

/** Orientación de manejo según el tipo. */
export function orientacionTratamiento(d, clas, banderas) {
  const bloques = [];
  bloques.push({
    titulo: 'Medidas conductuales',
    items: [
      'Manejo de líquidos, con reducción de irritantes como la cafeína y el alcohol.',
      'Entrenamiento vesical con micciones programadas para espaciar las idas al baño, en especial si hay urgencia.',
      'Diario miccional para objetivar el patrón y medir la respuesta.',
    ],
  });
  bloques.push({
    titulo: 'Piso pélvico',
    items: ['Entrenamiento de la musculatura del piso pélvico, primera línea sobre todo en la incontinencia de esfuerzo; la fisioterapia especializada mejora los resultados.'],
  });
  if (clas.tipo === 'urgencia' || clas.tipo === 'mixta') {
    bloques.push({ titulo: 'Incontinencia de urgencia', items: ['Si no responde a las medidas conductuales, valorar tratamiento farmacológico con un antimuscarínico o un agonista del receptor beta tres.'] });
  }
  if (clas.tipo === 'esfuerzo' || clas.tipo === 'mixta') {
    bloques.push({ titulo: 'Incontinencia de esfuerzo', items: ['Como opciones según el caso: pesario de continencia o valoración quirúrgica con cabestrillo suburetral.'] });
  }
  const derivar = banderas.length > 0 || clas.tipo === 'esfuerzo' || clas.tipo === 'mixta' || d.prolapso;
  bloques.push({
    titulo: 'Estudio y derivación',
    items: [
      'Análisis de orina para descartar infección como causa o agravante.',
      ...(banderas.length ? ['Atender primero las banderas de alarma con el estudio correspondiente.'] : []),
      ...(derivar ? ['Valorar derivación a uroginecología para los casos con indicación quirúrgica, prolapso asociado o falta de respuesta al manejo conservador.'] : []),
    ],
  });
  return bloques;
}

export function evaluarIncontinencia(paciente, datos) {
  const d = { ...datos };
  const presencia = d.tieneEscapes || ITEMS_ESFUERZO.some((i) => n0(d[i.id]) > 0) || ITEMS_URGENCIA.some((i) => n0(d[i.id]) > 0);
  const clas = clasificarTipo(d);
  const severidad = evaluarSeveridad(d);
  const habitos = evaluarHabitos(d);
  const diario = interpretarDiario(d);
  const banderas = evaluarBanderas(d);
  const tratamiento = orientacionTratamiento(d, clas, banderas);
  const hojaPaciente = construirHojaPaciente(paciente, clas, severidad);
  const hojaDiario = construirHojaDiario(paciente);
  return { presencia, clas, severidad, habitos, diario, banderas, tratamiento, hojaPaciente, hojaDiario };
}

function construirHojaPaciente(p, clas, severidad) {
  return {
    identificacion: { nombre: p.demografia.nombre, edad: p.demografia.edad },
    titulo: 'Tu evaluación urinaria',
    intro: 'Este es el resumen de tu evaluación de hoy. La pérdida de orina es frecuente y, sobre todo, tiene solución; el objetivo es mejorar tu día a día.',
    secciones: [],
    recomendaciones: [
      'La pérdida de orina no es algo que debas aceptar como normal por la edad o por haber tenido hijos: se puede tratar.',
      'Los ejercicios del piso pélvico, hechos de forma correcta y constante, son de gran ayuda; te explicaremos cómo.',
      'Cuida tus hábitos de vejiga: modera la cafeína y el alcohol, y evita ir al baño "por si acaso".',
      'Llevar un diario de tus idas al baño y de los escapes durante unos días nos ayuda mucho a personalizar tu tratamiento.',
    ],
    pie: 'Documento informativo para la paciente. La indicación final corresponde a tu médico. Hoja emitida por el consultorio del Dr. Iván Jiménez Martínez.',
  };
}

/** Hoja de diario miccional en blanco para imprimir y entregar a la paciente. */
function construirHojaDiario(p) {
  return {
    identificacion: { nombre: p.demografia.nombre, edad: p.demografia.edad },
    esDiario: true,
    titulo: 'Diario miccional',
    intro: 'Anota durante tres días seguidos. En cada renglón registra la hora, lo que bebiste, cada vez que orinaste, si sentiste urgencia y si tuviste algún escape y qué estabas haciendo. Trae este registro a tu próxima consulta.',
    columnas: ['Hora', 'Líquido que bebí', 'Orina (poca, normal, mucha)', 'Sentí urgencia', 'Tuve escape', 'Qué estaba haciendo'],
    renglones: 16,
    pie: 'Diario miccional. Consultorio del Dr. Iván Jiménez Martínez.',
  };
}
