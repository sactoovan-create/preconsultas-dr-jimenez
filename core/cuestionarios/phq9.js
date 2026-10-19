/**
 * PHQ-9 (Patient Health Questionnaire-9), traducción oficial «Spanish for Mexico».
 *
 * Licencia: el manual oficial (phqscreeners.com, Pfizer) declara que no se requiere
 * permiso para reproducir, traducir, mostrar o distribuir el PHQ-9. El texto de los
 * reactivos, las opciones y el crédito se copiaron sin cambios del PDF oficial
 * «PHQ9_Spanish for Mexico.pdf» (descargado el 19/10/2026). Único ajuste de formato:
 * la indicación «Marque con una “✔”» se presenta como selección en pantalla.
 *
 * Reglas publicadas (sin modelos ni inteligencia artificial):
 * - Total = suma de los 9 reactivos (0-27); solo con los 9 contestados.
 * - Severidad (Kroenke K, Spitzer RL, Williams JB. J Gen Intern Med 2001;16:606-13):
 *   0-4 mínima, 5-9 leve, 10-14 moderada, 15-19 moderadamente grave, 20-27 grave.
 * - La pregunta de dificultad funcional no entra en ningún puntaje.
 * - Seguridad: cualquier valor > 0 en el reactivo 9 activa el protocolo, sin importar
 *   el total. Total ≥ 20 también es prioridad máxima. Un reactivo 9 sin respuesta se
 *   marca «sin dato de seguridad, revisar».
 * Validación en México: Familiar I et al. Int J Methods Psychiatr Res 2015;24:74-82;
 * Arrieta J et al. J Clin Psychol 2017;73:1076-90. Los cortes vienen de la versión
 * original; las validaciones mexicanas no fijan cortes distintos.
 *
 * Es tamizaje y medida de severidad, no diagnóstico. La paciente nunca ve el puntaje.
 */

export const CLAVE = 'phq9';
export const VERSION = 1;
export const SIGLA = 'PHQ-9';
export const NOMBRE = 'Cuestionario sobre la salud del paciente-9 (PHQ-9)';
export const TITULO_PASO = 'Tu estado de ánimo';
export const ESTADO = 'activo';

export const ENCABEZADO = 'CUESTIONARIO SOBRE LA SALUD DEL PACIENTE-9 (PHQ-9)';
export const INSTRUCCION = 'Durante las últimas 2 semanas, ¿qué tan seguido le han afectado cualquiera de los siguientes problemas?';
export const INSTRUCCION_FORMATO = 'Seleccione una opción en cada renglón para indicar su respuesta.';

export const OPCIONES = [
  { valor: 0, etiqueta: 'Para nada' },
  { valor: 1, etiqueta: 'Varios días' },
  { valor: 2, etiqueta: 'Más de la mitad de los días' },
  { valor: 3, etiqueta: 'Casi todos los días' },
];

export const ITEMS = [
  { id: 'item1', numero: 1, texto: 'Poco interés o placer en hacer las cosas' },
  { id: 'item2', numero: 2, texto: 'Se ha sentido decaído(a), deprimido(a), o sin esperanzas' },
  { id: 'item3', numero: 3, texto: 'Dificultad para dormir o permanecer dormido(a), o ha dormido demasiado' },
  { id: 'item4', numero: 4, texto: 'Se ha sentido cansado(a) o con poca energía' },
  { id: 'item5', numero: 5, texto: 'Con poco apetito o ha comido en exceso' },
  { id: 'item6', numero: 6, texto: 'Se ha sentido mal con usted mismo(a) – o que es un fracaso o que ha quedado mal con usted mismo(a) o con su familia' },
  { id: 'item7', numero: 7, texto: 'Ha tenido dificultad para concentrarse en cosas tales como leer el periódico o ver televisión' },
  { id: 'item8', numero: 8, texto: '¿Se ha estado moviendo o hablando tan lento que otras personas podrían notarlo?, o por el contrario – ha estado tan inquieto(a) o agitado(a), que se ha estado moviendo mucho más de lo normal' },
  { id: 'item9', numero: 9, texto: 'Ha pensado que estaría mejor muerto(a) o se le ha ocurrido lastimarse de alguna manera' },
];

export const DIFICULTAD = {
  id: 'dificultad',
  texto: 'Si usted marcó cualquiera de estos problemas, ¿qué tan difícil fue hacer su trabajo, las tareas del hogar o llevarse bien con otras personas debido a tales problemas?',
  opciones: [
    { valor: 0, etiqueta: 'Para nada difícil' },
    { valor: 1, etiqueta: 'Un poco difícil' },
    { valor: 2, etiqueta: 'Muy difícil' },
    { valor: 3, etiqueta: 'Extremadamente difícil' },
  ],
};

export const CREDITO = 'Desarrollado por los Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke y colegas, con una beca educacional por parte de Pfizer Inc. No se requiere permiso para reproducir, traducir, mostrar o distribuir.';
export const FUENTE = 'PHQ-9, traducción oficial «Spanish for Mexico» (phqscreeners.com, Pfizer Inc.). Severidad: Kroenke 2001. Validación en mujeres mexicanas: Familiar 2015.';

/** Puntos de corte publicados (Kroenke 2001), para el médico. */
export const SEVERIDADES = [
  { min: 0, max: 4, id: 'minima', etiqueta: 'mínima o ninguna' },
  { min: 5, max: 9, id: 'leve', etiqueta: 'leve' },
  { min: 10, max: 14, id: 'moderada', etiqueta: 'moderada' },
  { min: 15, max: 19, id: 'moderadamente_grave', etiqueta: 'moderadamente grave' },
  { min: 20, max: 27, id: 'grave', etiqueta: 'grave' },
];

/** Valor entero 0..3 o null. Rechaza booleanos, textos vacíos y fracciones. */
export function valorItem(x) {
  if (x == null || x === '' || typeof x === 'boolean') return null;
  const n = Number(x);
  return Number.isInteger(n) && n >= 0 && n <= 3 ? n : null;
}

export function severidadPhq9(total) {
  if (!Number.isInteger(total)) return null;
  return SEVERIDADES.find((s) => total >= s.min && total <= s.max) || null;
}

/** Regla fija de seguridad del reactivo 9. `ofrecido` indica que el PHQ-9 se mostró. */
export function seguridadPhq9(respuestas, total = null, ofrecido = true) {
  const item9 = valorItem((respuestas || {}).item9);
  const motivos = [];
  if (item9 != null && item9 > 0) motivos.push('item9_positivo');
  if (Number.isInteger(total) && total >= 20) motivos.push('total_grave');
  const sinDatoItem9 = ofrecido && item9 == null;
  let prioridad = null;
  if ((item9 != null && item9 >= 2) || motivos.includes('total_grave')) prioridad = 'maxima';
  else if (item9 === 1) prioridad = 'alta';
  else if (sinDatoItem9) prioridad = 'revisar';
  return {
    item9,
    positivo: item9 != null && item9 > 0,
    alerta: motivos.length > 0,
    sinDatoItem9,
    prioridad,
    motivos,
  };
}

/** Texto único de la alerta para el médico (lo comparten ruteo y panel). */
export function mensajeAlertaPhq9(seguridad, total = null) {
  const s = seguridad || {};
  if (s.positivo) {
    return `PHQ-9 ítem 9 = ${s.item9} (pensamientos de muerte o de lastimarse): contactar a la paciente el mismo día hábil y hacer una evaluación breve de seguridad.`;
  }
  if ((s.motivos || []).includes('total_grave')) {
    return `PHQ-9 total ${total}/27 (grave): prioridad máxima; contactar a la paciente el mismo día hábil.`;
  }
  if (s.sinDatoItem9) return 'PHQ-9 sin dato de seguridad (ítem 9 sin respuesta): revisar.';
  return null;
}

/**
 * Evalúa las respuestas guardadas en `autoReporte.phq9.respuestas`.
 * Devuelve el resumen que se congela en `resumen.phq9`.
 */
export function evaluar(respuestas, { ofrecido = true } = {}) {
  const r = respuestas || {};
  const valores = ITEMS.map((it) => valorItem(r[it.id]));
  const respondidos = valores.filter((v) => v != null).length;
  const completo = respondidos === ITEMS.length;
  const total = completo ? valores.reduce((s, v) => s + v, 0) : null;
  const sev = severidadPhq9(total);
  const dificultadValor = valorItem(r.dificultad);
  const dificultad = dificultadValor == null
    ? null
    : DIFICULTAD.opciones.find((o) => o.valor === dificultadValor).etiqueta;
  const seguridad = seguridadPhq9(r, total, ofrecido);

  const partes = [];
  if (seguridad.positivo) partes.push(`ALERTA DE SEGURIDAD: ítem 9 = ${seguridad.item9}.`);
  else if (seguridad.sinDatoItem9) partes.push('Sin dato de seguridad (ítem 9 sin respuesta), revisar.');
  if (completo) partes.push(`PHQ-9 ${total}/27: síntomas depresivos de severidad ${sev.etiqueta} (cortes de Kroenke 2001).`);
  else partes.push(`PHQ-9 incompleto (${respondidos}/9): sin total; una escala incompleta no equivale a cero.`);
  if (!seguridad.positivo && seguridad.item9 === 0) partes.push('Ítem 9 = 0.');
  if (dificultad) partes.push(`Dificultad funcional: ${dificultad}.`);
  partes.push('Tamizaje, no diagnóstico.');

  return {
    instrumento: SIGLA,
    version: VERSION,
    validado: true,
    completo,
    respondidos,
    total,
    severidad: sev ? sev.id : null,
    severidadEtiqueta: sev ? sev.etiqueta : null,
    item9: seguridad.item9,
    dificultad: dificultadValor,
    dificultadEtiqueta: dificultad,
    seguridad,
    fuenteCortes: 'Kroenke 2001 (versión original); validación de estructura en mujeres mexicanas: Familiar 2015.',
    resumen: partes.join(' '),
  };
}

/** Recordatorio suave (nunca bloquea): devuelve un mensaje la primera vez que la
 * paciente intenta continuar con reactivos sin contestar, o null si está completo. */
export function recordatorio(respuestas) {
  const r = respuestas || {};
  if (valorItem(r.item9) == null) {
    return {
      mensaje: 'La pregunta 9 nos ayuda a cuidar tu seguridad. Si puedes, respóndela antes de continuar. Si prefieres no hacerlo, presiona «Continuar» otra vez.',
      campo: 'cv-phq9-item9',
    };
  }
  const faltan = ITEMS.filter((it) => valorItem(r[it.id]) == null);
  if (faltan.length) {
    return {
      mensaje: `Te ${faltan.length === 1 ? 'falta 1 pregunta' : `faltan ${faltan.length} preguntas`}. Con todas contestadas el cuestionario le sirve más a tu médico. Si prefieres seguir, presiona «Continuar» otra vez.`,
      campo: `cv-phq9-${faltan[0].id}`,
    };
  }
  return null;
}
