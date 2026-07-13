/**
 * Profundización de INCONTINENCIA URINARIA para la paciente.
 * Instrumento: ICIQ-SF (International Consultation on Incontinence Questionnaire —
 * Short Form), versión validada al español. Autoaplicable, breve, con puntaje y
 * bandas de severidad reproducibles, y una pregunta de tipo (esfuerzo / urgencia /
 * mixta) que es justo lo que pide diferenciar la nota clínica de incontinencia.
 *
 * Orientativo, no diagnóstico: entrega al médico una línea basal ordenada. Sirve
 * también como medida basal para repetir tras iniciar tratamiento.
 *
 * Puntaje = frecuencia (0-5) + cantidad (0/2/4/6) + afectación (0-10). Rango 0-21.
 * Bandas (Klovning y cols.): 1-5 leve, 6-12 moderada, 13-18 grave, 19-21 muy grave.
 */

export const ID = 'incontinencia';
export const TITULO = 'Escapes de orina';
export const FUENTE = 'ICIQ-SF (versión validada al español)';

// Se ofrece cuando la paciente reporta molestias de vejiga en el tamizaje, o marcó
// que tiene escapes de orina. Umbral moderado (2) para no molestar por una molestia leve.
export function disparador(ar) {
  const mrs = (ar && ar.mrs) || {};
  const hc = (ar && ar.hc) || {};
  const vejiga = Number(mrs.mrs_vejiga);
  return (Number.isFinite(vejiga) && vejiga >= 2) || hc.escapesOrina === true;
}

export const PREGUNTAS = [
  {
    id: 'frecuencia',
    texto: '¿Con qué frecuencia se le escapa la orina?',
    tipo: 'opcion',
    opciones: [
      { etiqueta: 'Nunca', valor: 0 },
      { etiqueta: 'Una vez a la semana o menos', valor: 1 },
      { etiqueta: 'Dos o tres veces a la semana', valor: 2 },
      { etiqueta: 'Una vez al día', valor: 3 },
      { etiqueta: 'Varias veces al día', valor: 4 },
      { etiqueta: 'Todo el tiempo', valor: 5 },
    ],
  },
  {
    id: 'cantidad',
    texto: 'En general, ¿qué cantidad de orina se le escapa?',
    ayuda: 'Aunque use protección, piensa en cuánto se te escapa.',
    tipo: 'opcion',
    opciones: [
      { etiqueta: 'No se me escapa nada', valor: 0 },
      { etiqueta: 'Muy poca', valor: 2 },
      { etiqueta: 'Una cantidad moderada', valor: 4 },
      { etiqueta: 'Mucha', valor: 6 },
    ],
  },
  {
    id: 'afectacion',
    texto: '¿Qué tanto afectan estos escapes tu vida diaria?',
    tipo: 'escala',
    min: 0,
    max: 10,
    etiquetaMin: 'Nada',
    etiquetaMax: 'Muchísimo',
  },
  {
    id: 'cuando',
    texto: '¿Cuándo se te escapa la orina?',
    ayuda: 'Marca todas las que te pasen.',
    tipo: 'multiple',
    opciones: [
      { id: 'antes_bano', etiqueta: 'Antes de llegar al baño', patron: 'urgencia' },
      { id: 'tos_estornudo', etiqueta: 'Al toser o estornudar', patron: 'esfuerzo' },
      { id: 'ejercicio', etiqueta: 'Al hacer esfuerzo físico o ejercicio', patron: 'esfuerzo' },
      { id: 'dormida', etiqueta: 'Mientras duermo', patron: 'otro' },
      { id: 'sin_razon', etiqueta: 'Sin una razón clara', patron: 'urgencia' },
      { id: 'termina', etiqueta: 'Al terminar de orinar y ya vestida', patron: 'otro' },
      { id: 'siempre', etiqueta: 'Todo el tiempo', patron: 'otro' },
    ],
  },
];

function num(x) { const n = Number(x); return Number.isFinite(n) ? n : null; }

/** Evalúa las respuestas. Devuelve puntaje, severidad, tipo y un resumen orientativo. */
export function evaluar(resp) {
  const r = resp || {};
  const f = num(r.frecuencia), c = num(r.cantidad), a = num(r.afectacion);
  const completo = f != null && c != null && a != null;
  const puntaje = completo ? f + c + a : null;

  let severidad = null;
  if (puntaje != null) {
    if (puntaje === 0) severidad = 'sin escapes';
    else if (puntaje <= 5) severidad = 'leve';
    else if (puntaje <= 12) severidad = 'moderada';
    else if (puntaje <= 18) severidad = 'grave';
    else severidad = 'muy grave';
  }

  // Tipo por la pregunta 'cuando' (no puntúa; orienta esfuerzo vs urgencia vs mixta).
  const cuando = Array.isArray(r.cuando) ? r.cuando : [];
  const mapa = {};
  PREGUNTAS.find((p) => p.id === 'cuando').opciones.forEach((o) => { mapa[o.id] = o.patron; });
  const patrones = new Set(cuando.map((id) => mapa[id]).filter(Boolean));
  let tipo = null;
  const esf = patrones.has('esfuerzo'), urg = patrones.has('urgencia');
  if (esf && urg) tipo = 'mixta';
  else if (esf) tipo = 'esfuerzo';
  else if (urg) tipo = 'urgencia';
  else if (cuando.length) tipo = 'otra';

  const NOMBRE_TIPO = {
    esfuerzo: 'de esfuerzo (al toser, estornudar o hacer fuerza)',
    urgencia: 'de urgencia (ganas súbitas de orinar)',
    mixta: 'mixta (de esfuerzo y de urgencia)',
    otra: 'de otro patrón por precisar',
  };

  const partes = [];
  if (puntaje != null) partes.push(`ICIQ-SF ${puntaje} de 21 (${severidad}).`);
  if (tipo) partes.push(`Patrón sugerido: incontinencia ${NOMBRE_TIPO[tipo]}.`);
  const resumen = partes.join(' ') || null;

  return { instrumento: 'ICIQ-SF', completo, puntaje, severidad, tipo, resumen };
}
