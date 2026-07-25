/**
 * Reglas puras del cuestionario adaptativo de pre-consulta.
 *
 * Este archivo no renderiza nada ni emite diagnósticos. Define qué pasos necesita
 * cada paciente, qué campos mínimos hacen interpretable una respuesta y cuándo el
 * portal debe mostrar una orientación de seguridad inmediata.
 */

export const FORMULARIO_VERSION = '2026.08';

export const TEMAS_CONSULTA = [
  { id: 'control', etiqueta: 'Revisión o chequeo ginecológico' },
  { id: 'sangrado', etiqueta: 'Sangrado o cambios en la menstruación' },
  { id: 'dolor', etiqueta: 'Dolor pélvico o cólicos' },
  { id: 'ciclos', etiqueta: 'Ciclos irregulares, acné o vello' },
  { id: 'climaterio', etiqueta: 'Bochornos, sueño o menopausia' },
  { id: 'anticoncepcion', etiqueta: 'Anticoncepción' },
  { id: 'fertilidad', etiqueta: 'Fertilidad o búsqueda de embarazo' },
  { id: 'embarazo', etiqueta: 'Embarazo o posparto' },
  { id: 'urinario', etiqueta: 'Orina, urgencia o escapes' },
  { id: 'intimidad', etiqueta: 'Sequedad, dolor o salud sexual' },
  { id: 'mama', etiqueta: 'Molestia o revisión de mama' },
  { id: 'metabolico', etiqueta: 'Peso, metabolismo o riesgo cardiovascular' },
  { id: 'otro', etiqueta: 'Otro motivo' },
];

export const MRS_IDS = [
  'mrs_bochornos', 'mrs_cardiaco', 'mrs_sueno', 'mrs_musculo',
  'mrs_animo', 'mrs_irritable', 'mrs_ansiedad', 'mrs_agotamiento',
  'mrs_sexual', 'mrs_vejiga', 'mrs_sequedad',
];

export const SENAL_NINGUNA = 'ninguna';
export const OPCION_NINGUNA = 'ninguna';
export const SENAL_MATERNA_NINGUNA = 'ninguna';

const PASO_TEMA = {
  sangrado: { id: 'sangrado', titulo: 'Tu sangrado' },
  dolor: { id: 'dolor', titulo: 'Tu dolor' },
  ciclos: { id: 'ciclos', titulo: 'Tus ciclos' },
  climaterio: { id: 'climaterio', titulo: 'Síntomas de climaterio' },
  urinario: { id: 'urinario', titulo: 'Salud urinaria' },
  intimidad: { id: 'intimidad', titulo: 'Salud íntima' },
  mama: { id: 'mama', titulo: 'Salud mamaria' },
};

function lista(valor) {
  return Array.isArray(valor) ? valor : [];
}

export function contextoMaterno(hc = {}) {
  const temas = lista(hc.temasConsulta);
  return temas.includes('embarazo')
    || ['embarazada', 'posparto'].includes(hc.etapaReproductiva)
    || hc.posibleEmbarazo === 'confirmado';
}

export function senalFuerzaDolor(hc = {}) {
  return lista(hc.senalesUrgencia).some((id) => [
    'dolor_subito_intenso', 'dolor_hombro', 'fiebre_dolor',
  ].includes(id));
}

export function senalFuerzaSangrado(hc = {}) {
  return lista(hc.senalesUrgencia).includes('sangrado_abundante');
}

/** Quita respuestas que pertenecen a módulos que la paciente desmarcó.
 * Se aplica otra vez al enviar para cubrir borradores de versiones anteriores. */
export function filtrarHistoriaActiva(hc = {}) {
  const limpia = { ...hc };
  const temas = lista(limpia.temasConsulta);

  if (!temas.includes('sangrado') && !senalFuerzaSangrado(limpia)) {
    limpia.sangrado = false;
    limpia.sangradoTipos = [];
    limpia.sangradoAhora = null;
    limpia.sangradoDuracionDias = null;
    limpia.sangradoDesde = '';
  }
  if (!temas.includes('urinario')) {
    limpia.sintomasUrinarios = [];
    limpia.urinarioDetalle = '';
    limpia.escapesOrina = false;
  }
  if (!temas.includes('intimidad')) limpia.molestiasIntimas = [];
  if (!temas.includes('mama')) {
    limpia.sintomasMama = [];
    limpia.mamaDetalle = '';
  }
  if (!temas.includes('ciclos')) {
    limpia.cambiosAndrogenicos = [];
    limpia.acne = false;
    limpia.hirsutismo = false;
    limpia.caidaCabello = false;
    limpia.diasEntreReglas = null;
  }
  if (!temas.some((tema) => ['anticoncepcion', 'fertilidad', 'embarazo'].includes(tema))) {
    limpia.objetivoReproductivo = null;
    limpia.mesesBuscandoEmbarazo = null;
  }
  return limpia;
}

export function digitosTelefono(valor) {
  return String(valor || '').replace(/\D/g, '');
}

/** Convierte un teléfono mexicano a sus diez dígitos. Rechaza números de otros
 * países para que el ERP nunca los trunque y los confunda con una paciente local. */
export function normalizarTelefonoMexicano(valor) {
  const digitos = digitosTelefono(valor);
  if (digitos.length === 10) return digitos;
  if (digitos.length === 12 && digitos.startsWith('52')) return digitos.slice(2);
  // Prefijo móvil mexicano antiguo +521, todavía presente en algunas agendas.
  if (digitos.length === 13 && digitos.startsWith('521')) return digitos.slice(3);
  return '';
}

export function telefonoValido(valor) {
  return normalizarTelefonoMexicano(valor).length === 10;
}

export function correoValido(valor) {
  const correo = String(valor || '').trim();
  return !correo || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

/** Alterna una opción múltiple y hace mutuamente exclusiva la opción "ninguna". */
export function alternarOpcion(actual, id, exclusiva = OPCION_NINGUNA) {
  const valores = lista(actual);
  if (id === exclusiva) return valores.includes(exclusiva) ? [] : [exclusiva];
  const sinExclusiva = valores.filter((x) => x !== exclusiva);
  return sinExclusiva.includes(id)
    ? sinExclusiva.filter((x) => x !== id)
    : [...sinExclusiva, id];
}

export function mrsRespondidos(mrs) {
  const datos = mrs || {};
  return MRS_IDS.filter((id) => {
    const n = Number(datos[id]);
    return Number.isInteger(n) && n >= 0 && n <= 4;
  }).length;
}

export function mrsCompleta(mrs) {
  return mrsRespondidos(mrs) === MRS_IDS.length;
}

export function hayProfundizaciones(tamizaje) {
  const ar = tamizaje || {};
  const mrs = ar.mrs || {};
  const dolor = ar.dolor || {};
  const hc = ar.hc || {};
  const temas = lista(hc.temasConsulta);
  return (
    dolor.tiene === true
    || hc.reglasRegulares === false
    || hc.acne === true
    || hc.hirsutismo === true
    || hc.caidaCabello === true
    || lista(hc.sintomasUrinarios).includes('escapes')
    || temas.includes('intimidad')
    || Number(mrs.mrs_vejiga) >= 2
    || Number(mrs.mrs_sequedad) >= 2
    || Number(mrs.mrs_sexual) >= 2
  );
}

/**
 * Pasos visibles. Los módulos por tema se agregan solo si la paciente los eligió;
 * las profundizaciones, solo si una respuesta concreta las justifica.
 */
export function pasosPara({ hc, mrs, dolor } = {}) {
  const historia = hc || {};
  const temas = lista(historia.temasConsulta);
  const pasos = [
    { id: 'inicio', titulo: 'Tus datos' },
    { id: 'motivo', titulo: 'Tu consulta' },
    { id: 'seguridad', titulo: 'Primero, tu seguridad' },
    { id: 'contexto', titulo: 'Tu etapa actual' },
  ];

  Object.keys(PASO_TEMA).forEach((tema) => {
    const forzado = (tema === 'dolor' && senalFuerzaDolor(historia))
      || (tema === 'sangrado' && senalFuerzaSangrado(historia));
    if (temas.includes(tema) || forzado) pasos.push(PASO_TEMA[tema]);
  });

  if (temas.some((t) => ['anticoncepcion', 'fertilidad', 'embarazo'].includes(t))) {
    pasos.push({ id: 'plan-reproductivo', titulo: 'Plan reproductivo' });
  }
  if (hayProfundizaciones({ hc: historia, mrs, dolor })) {
    pasos.push({ id: 'profundizaciones', titulo: 'Preguntas específicas' });
  }

  pasos.push(
    { id: 'antecedentes', titulo: 'Tu salud general' },
    { id: 'prevencion', titulo: 'Estudios preventivos' },
    { id: 'envio', titulo: 'Revisar y enviar' },
  );
  return pasos;
}

/** Avance por etapa, estable aunque elegir temas agregue módulos adaptativos. */
export function porcentajePaso(id, pasos = []) {
  const fijos = {
    inicio: 8,
    motivo: 18,
    seguridad: 30,
    contexto: 40,
    antecedentes: 76,
    prevencion: 88,
    envio: 100,
  };
  if (Object.prototype.hasOwnProperty.call(fijos, id)) return fijos[id];
  const inicioClinico = pasos.findIndex((p) => p.id === 'contexto') + 1;
  const finClinico = pasos.findIndex((p) => p.id === 'antecedentes');
  const actual = pasos.findIndex((p) => p.id === id);
  if (actual < inicioClinico || finClinico <= inicioClinico) return 40;
  const posicion = actual - inicioClinico + 1;
  const cantidad = Math.max(1, finClinico - inicioClinico);
  return Math.round(40 + (posicion / cantidad) * 32);
}

function error(mensaje, campo) {
  return { ok: false, mensaje, campo };
}

export function validarPaso(id, { demografia, hc, mrs, dolor } = {}) {
  const dem = demografia || {};
  const historia = hc || {};
  const temas = lista(historia.temasConsulta);

  if (id === 'inicio') {
    if (!String(dem.nombre || '').trim()) return error('Escribe tu nombre para poder identificar tu cuestionario.', 'nombre');
    const edad = Number(dem.edad);
    if (!Number.isInteger(edad) || edad < 1 || edad > 110) return error('Escribe una edad válida.', 'edad');
    if (!telefonoValido(historia.telefono)) return error('Escribe un teléfono mexicano válido de 10 dígitos; puedes incluir +52.', 'telefono');
    if (!correoValido(historia.correo)) return error('Revisa el formato de tu correo electrónico.', 'correo');
  }

  if (id === 'motivo') {
    if (!String(historia.motivo || '').trim()) return error('Cuéntanos brevemente qué te gustaría resolver.', 'motivo');
    if (!temas.length) return error('Elige al menos un tema para adaptar las siguientes preguntas.', 'temasConsulta');
  }

  if (id === 'seguridad') {
    if (!historia.posibleEmbarazo) {
      return error('Indica si existe posibilidad de embarazo.', 'posibleEmbarazo');
    }
    if (!lista(historia.senalesUrgencia).length) {
      return error('Marca si tienes alguna señal de alarma o elige “Ninguna de estas”.', 'senalesUrgencia');
    }
    if (contextoMaterno(historia) && !lista(historia.senalesMaternas).length) {
      return error('Revisa también las señales de alarma del embarazo o posparto.', 'senalesMaternas');
    }
  }

  if (id === 'contexto') {
    if (!historia.etapaReproductiva) return error('Elige la opción que mejor describe tu etapa actual.', 'etapaReproductiva');
    if (!historia.posibleEmbarazo) return error('Indica si existe posibilidad de embarazo.', 'posibleEmbarazo');
  }

  if (id === 'sangrado' && !lista(historia.sangradoTipos).length) {
    return error('Elige cuál cambio de sangrado has notado.', 'sangradoTipos');
  }

  if (id === 'dolor') {
    const intensidad = Number((dolor || {}).intensidad);
    if (!Number.isFinite(intensidad) || intensidad < 0 || intensidad > 10) {
      return error('Marca la intensidad de tu dolor de 0 a 10.', 'dolorIntensidad');
    }
    if (!(dolor || {}).inicio) return error('Indica cómo comenzó el dolor.', 'dolorInicio');
  }

  if (id === 'climaterio' && !mrsCompleta(mrs)) {
    return error('Responde los 11 síntomas para que la escala pueda interpretarse correctamente.', 'mrs');
  }

  if (id === 'ciclos' && historia.reglasRegulares == null) {
    return error('Indica si tus ciclos suelen ser regulares.', 'reglasRegulares');
  }

  if (id === 'urinario' && !lista(historia.sintomasUrinarios).length) {
    return error('Marca qué molestia urinaria presentas o elige “Ninguna actualmente”.', 'sintomasUrinarios');
  }

  if (id === 'intimidad' && !lista(historia.molestiasIntimas).length) {
    return error('Marca qué te gustaría revisar o elige “Prefiero no responder”.', 'molestiasIntimas');
  }

  if (id === 'mama' && !lista(historia.sintomasMama).length) {
    return error('Marca qué has notado o elige “Ninguna molestia actual”.', 'sintomasMama');
  }

  if (id === 'plan-reproductivo' && !historia.objetivoReproductivo) {
    return error('Elige qué te gustaría respecto a un embarazo en este momento.', 'objetivoReproductivo');
  }

  if (
    id === 'antecedentes'
    && (
      historia.antecedentesRevisados !== true
      || !lista(historia.antecedentesSeleccionados).length
    )
  ) {
    return error('Revisa los antecedentes y confirma tu respuesta, aunque no tengas ninguno.', 'antecedentes');
  }

  return { ok: true };
}

export function alertaUrgente({ hc, dolor } = {}) {
  const historia = hc || {};
  const senales = lista(historia.senalesUrgencia).filter((x) => x !== SENAL_NINGUNA);
  const senalesMaternas = lista(historia.senalesMaternas)
    .filter((x) => x !== SENAL_MATERNA_NINGUNA);
  const embarazo = ['posible', 'confirmado', 'no_se'].includes(historia.posibleEmbarazo);
  const dolorImportante = senales.includes('dolor_subito_intenso')
    || Number((dolor || {}).intensidad) >= 9;
  const sangrado = senales.includes('sangrado_abundante');
  const inestabilidad = senales.some((x) => [
    'desmayo_mareo', 'dificultad_respirar', 'dolor_hombro',
  ].includes(x));
  const infeccion = senales.includes('fiebre_dolor');
  const embarazoConSintomas = embarazo && (dolorImportante || sangrado || inestabilidad);
  const saludMental = senalesMaternas.includes('ideas_dano');

  return {
    urgente: dolorImportante || sangrado || inestabilidad || infeccion
      || embarazoConSintomas || senalesMaternas.length > 0,
    embarazoConSintomas,
    saludMental,
    senales,
    senalesMaternas,
  };
}
