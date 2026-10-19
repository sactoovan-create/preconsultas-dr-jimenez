/**
 * Cuestionarios validados PENDIENTES DE LICENCIA O REGISTRO.
 *
 * Aquí solo vive la ESTRUCTURA (identificadores, rangos y número de reactivo) y el
 * MOTOR DE PUNTAJE publicado. NO contiene el texto de ningún reactivo ni de sus
 * opciones: copiarlo sin licencia infringiría los derechos de autor. Ninguno de estos
 * cuestionarios está conectado al flujo de la paciente (`ACTIVOS` en index.js no los
 * incluye) y el portal no los muestra.
 *
 * Para activarlos, el Dr. debe obtener la licencia o el registro (pasos en
 * `INSTRUCCIONES_DR` de cada uno), recibir el texto oficial en español y el manual de
 * puntuación, confirmar aquí las reglas marcadas «confirmar con el manual» y entonces
 * crear su módulo con texto, como phq9.js o csi.js.
 *
 * Investigación de licencias del 19/10/2026 (fuentes primarias en cada entrada).
 */

function entero(x, min, max) {
  if (x == null || x === '' || typeof x === 'boolean') return null;
  const n = Number(x);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}
function media(valores) {
  return valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null;
}
function redondear(x, decimales = 2) {
  return x == null ? null : Math.round(x * 10 ** decimales) / 10 ** decimales;
}

// ---------------------------------------------------------------------------
// PCS · Pain Catastrophizing Scale (13 reactivos)
// ---------------------------------------------------------------------------
export const PCS = {
  CLAVE: 'pcs',
  SIGLA: 'PCS',
  NOMBRE: 'Pain Catastrophizing Scale (PCS)',
  ESTADO: 'pendiente_licencia',
  LICENCIA: '«Copyright © Sullivan Mental Health Inc.» Distribución exclusiva de Mapi Research Trust (ePROVIDE). Las versiones electrónicas requieren acuerdo de licencia firmado; puede haber cuota para usuarios comerciales u organizaciones.',
  INSTRUCCIONES_DR: [
    'Crear una cuenta gratuita en https://eprovide.mapi-trust.org («SIGN UP FREE»).',
    'En la ficha del PCS, «Submit a request» como médico en práctica clínica privada: pedir la versión «Spanish for Mexico» y declarar que se administrará en formato electrónico en su portal de preconsulta y su ERP, sin venta a terceros.',
    'Firmar el acuerdo de licencia de versión electrónica y enviar capturas si Mapi las pide.',
    'Pedir el manual del PCS (Sullivan) para confirmar el corte de 30.',
  ],
  FUENTES: [
    'https://eprovide.mapi-trust.org/instruments/pain-catastrophizing-scale',
    'Sullivan MJL, Bishop SR, Pivik J. Psychol Assess 1995;7(4):524-32',
    'García Campayo J et al. Med Clin (Barc) 2008;131(13):487-92 (versión española)',
  ],
  // Estructura sin texto: 13 reactivos 0..4.
  ITEMS: Array.from({ length: 13 }, (_, i) => ({ id: `item${i + 1}`, numero: i + 1, min: 0, max: 4 })),
  SUBESCALAS: {
    rumiacion: [8, 9, 10, 11],
    magnificacion: [6, 7, 13],
    desesperanza: [1, 2, 3, 4, 5, 12],
  },
  CORTE_PENDIENTE: 'Total ≥ 30 (manual del PCS, Sullivan 2009): confirmar con el manual antes de mostrarlo. No usar cortes por subescala.',
  /** Total 0-52 y subescalas (Sullivan 1995). Sin los 13 reactivos no hay total. */
  evaluar(respuestas) {
    const r = respuestas || {};
    const v = PCS.ITEMS.map((it) => entero(r[it.id], 0, 4));
    const respondidos = v.filter((x) => x != null).length;
    const completo = respondidos === 13;
    const sub = Object.fromEntries(Object.entries(PCS.SUBESCALAS).map(([id, nums]) => {
      const vals = nums.map((n) => v[n - 1]);
      return [id, vals.every((x) => x != null) ? vals.reduce((s, x) => s + x, 0) : null];
    }));
    return {
      instrumento: 'PCS', estado: PCS.ESTADO, completo, respondidos,
      total: completo ? v.reduce((s, x) => s + x, 0) : null,
      subescalas: sub,
      interpretacion: null,
      nota: PCS.CORTE_PENDIENTE,
    };
  },
};

// ---------------------------------------------------------------------------
// BPI-SF · Brief Pain Inventory, forma corta
// ---------------------------------------------------------------------------
export const BPI_SF = {
  CLAVE: 'bpi_sf',
  SIGLA: 'BPI-SF',
  NOMBRE: 'Brief Pain Inventory, forma corta (BPI-SF)',
  ESTADO: 'pendiente_licencia',
  LICENCIA: '«BPI-SF © Copyright 1991 Charles S. Cleeland, PhD. Pain Research Group». Administra MD Anderson. Requiere License Agreement; puede haber cuota y un cargo de trámite de 200 USD. No se puede modificar ni traducir sin consentimiento escrito.',
  INSTRUCCIONES_DR: [
    'Llenar el formulario de MD Anderson (https://www4.mdanderson.org/symptomresearch/index.cfm) con uso «Clinical practice», BPI Short Form en español, administración electrónica en su portal y su ERP de uso exclusivo del consultorio.',
    'Firmar el License Agreement y pagar la factura si la hay.',
    'Pedir la BPI User\'s Guide a symptomresearch@mdanderson.org para confirmar las reglas de datos faltantes.',
  ],
  FUENTES: [
    'https://www.mdanderson.org/research/departments-labs-institutes/departments-divisions/symptom-research/symptom-assessment-tools/brief-pain-inventory.html',
    'de Andrés Ares J et al. Pain Pract 2015;15(7):643-53 (versión española)',
    'Serlin RC et al. Pain 1995;61(2):277-84 (categorías de severidad)',
  ],
  // Estructura sin texto (numeración del formulario oficial).
  INTENSIDAD: [
    { id: 'q3', clave: 'peor', min: 0, max: 10 },
    { id: 'q4', clave: 'menor', min: 0, max: 10 },
    { id: 'q5', clave: 'promedio', min: 0, max: 10 },
    { id: 'q6', clave: 'ahora', min: 0, max: 10 },
  ],
  ALIVIO: { id: 'q8', min: 0, max: 100, paso: 10 },
  INTERFERENCIA: ['q9a', 'q9b', 'q9c', 'q9d', 'q9e', 'q9f', 'q9g'].map((id) => ({ id, min: 0, max: 10 })),
  MINIMO_INTERFERENCIA: 4, // confirmar con la User Guide
  /** Severidad = media de q3..q6; interferencia = media de q9a..q9g si hay ≥ 4 de 7. */
  evaluar(respuestas) {
    const r = respuestas || {};
    const intens = BPI_SF.INTENSIDAD.map((q) => entero(r[q.id], 0, 10));
    const interf = BPI_SF.INTERFERENCIA.map((q) => entero(r[q.id], 0, 10)).filter((x) => x != null);
    const alivio = entero(r.q8, 0, 100);
    const peor = intens[0];
    let categoriaPeor = null;
    if (peor != null) categoriaPeor = peor === 0 ? 'sin dolor' : peor <= 4 ? 'leve' : peor <= 6 ? 'moderado' : 'grave';
    return {
      instrumento: 'BPI-SF', estado: BPI_SF.ESTADO,
      peor,
      severidadMedia: intens.every((x) => x != null) ? redondear(media(intens)) : null,
      interferenciaMedia: interf.length >= BPI_SF.MINIMO_INTERFERENCIA ? redondear(media(interf)) : null,
      interferenciaRespondidos: interf.length,
      alivio: alivio != null && alivio % 10 === 0 ? alivio : null,
      categoriaPeor,
      nota: 'Sin puntaje total único. Categorías de severidad (Serlin 1995) y cambios IMMPACT (≥30 % moderado, ≥50 % sustancial) son referencias provisionales; no hay cortes de interferencia validados en español.',
    };
  },
};

// ---------------------------------------------------------------------------
// GSRS · Gastrointestinal Symptom Rating Scale, versión autoadministrada (15 reactivos)
// ---------------------------------------------------------------------------
export const GSRS = {
  CLAVE: 'gsrs',
  SIGLA: 'GSRS',
  NOMBRE: 'Gastrointestinal Symptom Rating Scale (GSRS), autoadministrada',
  ESTADO: 'pendiente_licencia',
  LICENCIA: '«GSRS Self © AstraZeneca R&D, 1995. All rights reserved». Licencias vía RWS Life Sciences (COAaccess@rws.com). Gratis para uso no comercial; formato electrónico con capturas aprobadas por RWS y AstraZeneca; prohibido modificar.',
  INSTRUCCIONES_DR: [
    'Llenar «Order Instrument» en https://www.astrazeneca.com/patient-reported-outcomes/order-instrument.html: GSRS (self-administered), español (preguntar si hay versión para México; si no, la de España), administración Web/Electronic, práctica clínica privada con financiamiento propio, sin fines comerciales.',
    'Firmar el acuerdo de RWS y mandar capturas del portal y del ERP para aprobación; preguntar si la práctica privada cuenta como «non-commercial».',
    'Recibir el manual de puntuación y confirmar la agrupación de dominios.',
  ],
  FUENTES: [
    'https://www.astrazeneca.com/patient-reported-outcomes.html',
    'Kulich KR et al. Health Qual Life Outcomes 2008;6:12',
    'Kulich KR et al. Rev Clin Esp 2005;205(12):588-94 (versión española)',
  ],
  ITEMS: Array.from({ length: 15 }, (_, i) => ({ id: `item${i + 1}`, numero: i + 1, min: 1, max: 7 })),
  // Agrupación reportada en estudios publicados; confirmar con el manual de RWS.
  DOMINIOS: {
    reflujo: [2, 3],
    dolorAbdominal: [1, 4, 5],
    indigestion: [6, 7, 8, 9],
    diarrea: [11, 12, 14],
    estrenimiento: [10, 13, 15],
  },
  /** Media por dominio si se contestó más de la mitad de sus reactivos (Kulich 2008).
   * Total = media de los 15 solo con los 15 contestados (decisión conservadora). */
  evaluar(respuestas) {
    const r = respuestas || {};
    const v = GSRS.ITEMS.map((it) => entero(r[it.id], 1, 7));
    const dominios = Object.fromEntries(Object.entries(GSRS.DOMINIOS).map(([id, nums]) => {
      const vals = nums.map((n) => v[n - 1]).filter((x) => x != null);
      return [id, vals.length > nums.length / 2 ? redondear(media(vals)) : null];
    }));
    const respondidos = v.filter((x) => x != null).length;
    return {
      instrumento: 'GSRS', estado: GSRS.ESTADO, respondidos,
      dominios,
      total: respondidos === 15 ? redondear(media(v)) : null,
      nota: 'Sin puntos de corte diagnósticos publicados: interpretar como carga de síntomas por dominio (1-7) y su cambio en la misma paciente.',
    };
  },
};

// ---------------------------------------------------------------------------
// ICIQ-UI SF · International Consultation on Incontinence Questionnaire, forma corta
// ---------------------------------------------------------------------------
export const ICIQ_UI_SF = {
  CLAVE: 'iciq_ui_sf',
  SIGLA: 'ICIQ-UI SF',
  NOMBRE: 'ICIQ-UI Short Form (incontinencia urinaria)',
  ESTADO: 'pendiente_registro',
  LICENCIA: '«Copyright © ICIQ Group» (Bristol Urological Institute, iciq.net). Uso clínico rutinario gratuito, pero exige cuenta, solicitud y aprobación de un «Approved Purpose»; texto exacto, sin cambiar redacción, formato ni puntaje, y con el aviso de copyright.',
  INSTRUCCIONES_DR: [
    'Registrarse en https://iciq.net y solicitar el módulo ICIQ-UI SF en la categoría «Clinical use – routine clinical care», versión «Spanish (Mexico)», administración electrónica en el portal y el ERP del consultorio, sin venta a terceros.',
    'Aceptar el User Agreement y esperar la aprobación.',
    'Usar el PDF aprobado sin cambiar la redacción y con el aviso «© ICIQ Group».',
  ],
  FUENTES: [
    'https://iciq.net/iciq-ui-sf',
    'https://iciq.net/user-agreement',
    'Espuña Pons M et al. Med Clin (Barc) 2004;122(8):288-92 (versión española)',
    'Klovning A et al. Neurourol Urodyn 2009;28(5):411-5 (severidad)',
  ],
  // Estructura sin texto: P3 frecuencia 0-5, P4 cantidad {0,2,4,6}, P5 afectación 0-10,
  // P6 ocho opciones de autodiagnóstico sin puntaje.
  P3: { id: 'q3', min: 0, max: 5 },
  P4: { id: 'q4', valores: [0, 2, 4, 6] },
  P5: { id: 'q5', min: 0, max: 10 },
  P6: Array.from({ length: 8 }, (_, i) => `q6_${i + 1}`),
  /** «ICIQ score: sum scores 3+4+5» (0-21). Severidad de Klovning 2009 (mujeres noruegas). */
  evaluar(respuestas) {
    const r = respuestas || {};
    const p3 = entero(r.q3, 0, 5);
    const p4n = entero(r.q4, 0, 6);
    const p4 = ICIQ_UI_SF.P4.valores.includes(p4n) ? p4n : null;
    const p5 = entero(r.q5, 0, 10);
    const completo = p3 != null && p4 != null && p5 != null;
    const total = completo ? p3 + p4 + p5 : null;
    let severidad = null;
    if (total != null) severidad = total === 0 ? 'sin pérdida' : total <= 5 ? 'leve' : total <= 12 ? 'moderada' : total <= 18 ? 'grave' : 'muy grave';
    return {
      instrumento: 'ICIQ-UI SF', estado: ICIQ_UI_SF.ESTADO, completo, total, severidad,
      p6: ICIQ_UI_SF.P6.filter((id) => r[id] === true),
      nota: 'Severidad derivada en mujeres noruegas (Klovning 2009), no en la versión española.',
    };
  },
};

export const PENDIENTES = [PCS, BPI_SF, GSRS, ICIQ_UI_SF];
