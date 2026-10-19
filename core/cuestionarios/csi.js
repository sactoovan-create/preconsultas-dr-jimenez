/**
 * Central Sensitization Inventory, versión española (CSI-Sp): «Cuestionario de
 * Sensibilización», Parte A (25 enunciados) y Parte B (10 diagnósticos previos).
 *
 * Licencia: el texto español proviene del Apéndice de Cuesta-Vargas AI, Roldan-Jimenez C,
 * Neblett R, Gatchel RJ. Cross-cultural adaptation and validity of the Spanish central
 * sensitization inventory. SpringerPlus 2016;5(1):1837 (doi:10.1186/s40064-016-3515-4),
 * «© The Author(s) 2016», Creative Commons Attribution 4.0
 * (https://creativecommons.org/licenses/by/4.0/). La CC BY obliga a citar, enlazar la
 * licencia e indicar cambios. Cambios hechos aquí (declarados en ATRIBUCION):
 *   - formato electrónico (botones en lugar de rodear con un círculo);
 *   - instrucciones adaptadas a ese formato («rodee» → «seleccione»; en la Parte B se
 *     retiró «a la derecha de cada casilla»);
 *   - corrección tipográfica del enunciado 6 («pare» → «para»).
 * Ninguna palabra de los enunciados ni de las opciones se adaptó al español de México:
 * hacerlo dejaría de ser la versión validada.
 *
 * Reglas publicadas (sin modelos ni inteligencia artificial):
 * - Escala 0-4 por enunciado (Mayer TG et al. Pain Pract 2012;12(4):276-85):
 *   Nunca 0, Pocas veces 1, Algunas veces 2, Continuamente 3, Siempre 4.
 * - Total Parte A = suma de los 25 enunciados (0-100). Versión española unifactorial.
 * - No hay regla publicada para datos faltantes: decisión de diseño, sin los 25 no se
 *   calcula total y queda «incompleto».
 * - Corte ≥ 40 (Neblett R et al. J Pain 2013;14(5):438-45) y niveles 0-29 subclínico,
 *   30-39 leve, 40-49 moderado, 50-59 grave, 60-100 extremo (Neblett R et al. Pain
 *   Pract 2017;17(2):166-75). DERIVADOS DE LA VERSIÓN ORIGINAL EN INGLÉS: el estudio
 *   español no fijó corte propio; publicó la media normativa 24.6 ± 12.0.
 * - La Parte B se registra (sí/no y año) y no se puntúa.
 * Es tamizaje, no diagnóstico. La paciente nunca ve el puntaje.
 */

export const CLAVE = 'csi';
export const VERSION = 1;
export const SIGLA = 'CSI-Sp';
export const NOMBRE = 'Cuestionario de Sensibilización (Central Sensitization Inventory, versión española CSI-Sp)';
export const TITULO_PASO = 'Cuestionario de sensibilización';
export const ESTADO = 'activo';

export const ENCABEZADO = 'Cuestionario de Sensibilización';
export const PARTE_A_TITULO = 'Parte A';
export const PARTE_A_INSTRUCCION = 'Por favor seleccione la respuesta correcta para cada uno de los enunciados.';

export const OPCIONES = [
  { valor: 0, etiqueta: 'Nunca' },
  { valor: 1, etiqueta: 'Pocas Veces' },
  { valor: 2, etiqueta: 'Algunas veces' },
  { valor: 3, etiqueta: 'Continuamente' },
  { valor: 4, etiqueta: 'Siempre' },
];

export const ITEMS_A = [
  'Me siento cansado y desanimado cuando me levanto por las mañanas.',
  'Mis músculos están tensos y doloridos.',
  'Tengo ataques de pánico.',
  'Rechino los dientes o aprieto la mandíbula.',
  'Tengo problemas de diarrea o estreñimiento.',
  'Necesito ayuda para realizar mis actividades diarias.',
  'Soy sensible a la luz brillante.',
  'Me canso fácilmente cuando estoy físicamente activo.',
  'Siento dolor en todo mi cuerpo.',
  'Tengo dolores de cabeza.',
  'Tengo molestia en mi vejiga o sensación de quemazón al orinar.',
  'No duermo bien.',
  'Tengo dificultad para concentrarme.',
  'Tengo problemas en la piel como resequedad, picor o sarpullido.',
  'El estrés hace que mis síntomas físicos empeoren.',
  'Me siento triste o deprimido.',
  'Me siento con poca energía.',
  'Tengo tensión muscular en mi cuello y hombros.',
  'Tengo dolor en mi mandíbula.',
  'Algunos olores, como perfumes, me hacen sentir mareado y con náuseas.',
  'Tengo que orinar frecuentemente.',
  'Mis piernas se sienten incómodas e inquietas cuando intento dormir por la noche.',
  'Tengo dificultad para recordar cosas.',
  'Sufrí algún trauma cuando era niño(a).',
  'Tengo dolor en mi zona pélvica',
].map((texto, i) => ({ id: `a${i + 1}`, numero: i + 1, texto }));

export const PARTE_B_TITULO = 'Parte B';
export const PARTE_B_PREGUNTA = '¿Ha sido usted diagnosticado por algún médico con alguna de las siguientes enfermedades?';
export const PARTE_B_INSTRUCCION = 'Por favor indique si ha tenido alguno de los siguientes diagnósticos y escriba el año en que se le diagnosticó.';
export const OPCIONES_B = [
  { valor: 'no', etiqueta: 'NO' },
  { valor: 'si', etiqueta: 'SÍ' },
];
export const ETIQUETA_ANIO = 'Año del diagnóstico';

export const ITEMS_B = [
  'Síndrome de Piernas Inquietas.',
  'Síndrome de Fatiga Crónica.',
  'Fibromialgia.',
  'Trastornos Temporomandibulares.',
  'Migrañas o Cefalea Tensional.',
  'Síndrome de Colon Irritable.',
  'Sensibilidad Química Múltiple.',
  'Latigazo o Lesión en el Cuello (incluir la lesión de Whiplash).',
  'Ansiedad o Ataques de Pánico.',
  'Depresión.',
].map((texto, i) => ({ id: `b${i + 1}`, numero: i + 1, texto, anioId: `b${i + 1}_anio` }));

export const ATRIBUCION = 'Central Sensitization Inventory: Mayer TG, Neblett R, Cohen H, et al. Pain Pract. 2012;12(4):276-85. Versión española (CSI-Sp): Cuesta-Vargas AI, Roldan-Jimenez C, Neblett R, Gatchel RJ. SpringerPlus. 2016;5(1):1837. doi:10.1186/s40064-016-3515-4. © The Author(s) 2016, licencia Creative Commons Atribución 4.0 Internacional.';
export const LICENCIA_URL = 'https://creativecommons.org/licenses/by/4.0/';
export const CAMBIOS = 'Modificado: formato electrónico, instrucciones adaptadas a selección en pantalla y corrección tipográfica en el enunciado 6 («pare» → «para»).';
export const FUENTE = 'CSI-Sp (Cuesta-Vargas 2016, CC BY 4.0). Cortes: Neblett 2013 y 2017, versión original en inglés.';

export const NIVELES = [
  { min: 0, max: 29, id: 'subclinico', etiqueta: 'subclínico' },
  { min: 30, max: 39, id: 'leve', etiqueta: 'leve' },
  { min: 40, max: 49, id: 'moderado', etiqueta: 'moderado' },
  { min: 50, max: 59, id: 'grave', etiqueta: 'grave' },
  { min: 60, max: 100, id: 'extremo', etiqueta: 'extremo' },
];
export const CORTE = 40;
export const NORMATIVO_CSI_SP = { media: 24.6, de: 12.0 };

export function valorItem(x) {
  if (x == null || x === '' || typeof x === 'boolean') return null;
  const n = Number(x);
  return Number.isInteger(n) && n >= 0 && n <= 4 ? n : null;
}

/** Año de diagnóstico plausible (1900..añoActual) o null. `anioActual` se inyecta en pruebas. */
export function valorAnio(x, anioActual = new Date().getFullYear()) {
  if (x == null || x === '' || typeof x === 'boolean') return null;
  const n = Number(x);
  return Number.isInteger(n) && n >= 1900 && n <= anioActual ? n : null;
}

export function nivelCsi(total) {
  if (!Number.isInteger(total)) return null;
  return NIVELES.find((n) => total >= n.min && total <= n.max) || null;
}

/** Evalúa `autoReporte.csi.respuestas`. Devuelve lo que se congela en `resumen.csi`. */
export function evaluar(respuestas, { anioActual } = {}) {
  const r = respuestas || {};
  const valores = ITEMS_A.map((it) => valorItem(r[it.id]));
  const respondidos = valores.filter((v) => v != null).length;
  const completo = respondidos === ITEMS_A.length;
  const total = completo ? valores.reduce((s, v) => s + v, 0) : null;
  const nivel = nivelCsi(total);
  const sobreCorte = completo ? total >= CORTE : null;

  const parteB = ITEMS_B
    .filter((it) => r[it.id] === 'si')
    .map((it) => ({ id: it.id, diagnostico: it.texto.replace(/\.$/, ''), anio: valorAnio(r[it.anioId], anioActual) }));
  const parteBRespondidos = ITEMS_B.filter((it) => r[it.id] === 'si' || r[it.id] === 'no').length;

  const partes = [];
  if (completo) {
    partes.push(`CSI-Sp ${total}/100: nivel ${nivel.etiqueta}${sobreCorte ? '; por encima del corte de 40, sugiere síntomas posiblemente relacionados con sensibilización central' : '; por debajo del corte de 40'}.`);
    partes.push('Cortes derivados de la versión original en inglés (Neblett 2013 y 2017); media normativa CSI-Sp 24.6 ± 12.0.');
  } else {
    partes.push(`CSI-Sp incompleto (${respondidos}/25): sin total; una escala incompleta no equivale a cero.`);
  }
  if (parteB.length) {
    partes.push(`Parte B: ${parteB.map((d) => d.diagnostico + (d.anio ? ` (${d.anio})` : '')).join('; ')}.`);
  }
  partes.push('Tamizaje, no diagnóstico.');

  return {
    instrumento: SIGLA,
    version: VERSION,
    validado: true,
    completo,
    respondidos,
    total,
    nivel: nivel ? nivel.id : null,
    nivelEtiqueta: nivel ? nivel.etiqueta : null,
    sobreCorte40: sobreCorte,
    parteB,
    parteBRespondidos,
    fuenteCortes: 'Neblett 2013 (corte 40) y Neblett 2017 (niveles), versión original en inglés; el CSI-Sp no fijó corte propio.',
    resumen: partes.join(' '),
  };
}

/** Recordatorio suave de la Parte A (nunca bloquea). */
export function recordatorio(respuestas) {
  const r = respuestas || {};
  const faltan = ITEMS_A.filter((it) => valorItem(r[it.id]) == null);
  if (!faltan.length) return null;
  return {
    mensaje: `Te ${faltan.length === 1 ? 'falta 1 enunciado' : `faltan ${faltan.length} enunciados`} de la Parte A. Con los 25 contestados el cuestionario le sirve más a tu médico. Si prefieres seguir, presiona «Continuar» otra vez.`,
    campo: `cv-csi-${faltan[0].id}`,
  };
}
