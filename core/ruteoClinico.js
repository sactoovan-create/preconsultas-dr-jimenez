/**
 * Motor de ruteo clínico. A partir de lo que la paciente reportó en la preconsulta
 * (edad + síntomas + antecedentes), SUGIERE qué instrumentos conviene revisar y por
 * qué, y levanta banderas de alarma. El resultado viaja versionado dentro del JSON de
 * la respuesta (campo aditivo `ruteoClinico`) para que el expediente (ERP) lo consuma.
 *
 * REGLA NO NEGOCIABLE: esto SUGIERE, no diagnostica. La decisión de agregar, quitar o
 * usar un instrumento es del médico. No produce conclusiones de riesgo ni diagnóstico
 * para la paciente; `accionSugerida` siempre deja la última palabra al médico.
 *
 * Función pura y testeable: no usa reloj ni estado. El timestamp lo pone quien arma el
 * registro (construirRegistro), no este motor.
 */

import { MRS_IDS } from './preconsultaFlow.js';

export const RUTEO_VERSION = 2;

// Catálogo de instrumentos (ids = carpetas en instruments/).
const NOMBRE = {
  menopausia: 'Climaterio y terapia hormonal',
  cardiometabolico: 'Riesgo cardiovascular-renal-metabólico',
  mama: 'Salud y riesgo mamario',
  osea: 'Salud ósea / osteoporosis',
  sop: 'Síndrome poliendocrino metabólico ovárico',
  hemorragia: 'Sangrado uterino anormal',
  'dolor-pelvico': 'Dolor pélvico',
  endometriosis: 'Endometriosis',
  anticoncepcion: 'Anticoncepción',
  incontinencia: 'Incontinencia urinaria',
};

const ORDEN_PRIORIDAD = { alta: 0, media: 1, baja: 2 };

// Ojo: Number(null) y Number('') dan 0; un dato ausente debe quedar en null.
function num(x) { if (x == null || x === '') return null; const n = Number(x); return Number.isFinite(n) ? n : null; }
function txt(x) { return (x == null ? '' : String(x)).toLowerCase(); }

/** Suma del MRS a partir de los síntomas crudos (0..44). */
function mrsResultado(mrs) {
  const datos = mrs || {};
  const respondidos = MRS_IDS.filter((id) => {
    const n = num(datos[id]);
    return n != null && n >= 0 && n <= 4;
  }).length;
  if (respondidos !== MRS_IDS.length) return { total: null, respondidos, completa: false };
  const total = MRS_IDS.reduce((s, id) => s + num(datos[id]), 0);
  return { total, respondidos, completa: true };
}

const RE_METABOLICO = /(tirzepatida|tirzepatide|mounjaro|zepbound|semaglutida|semaglutide|ozempic|wegovy|saxenda|liraglutida|liraglutide)/;

/**
 * @param {object} pre  El contenido de la preconsulta: { paciente:{edad,...},
 *   autoReporte:{mrs,dolor,hc}, resumen:{...} }.
 * @returns {{version:number, instrumentosSugeridos:Array, banderas:Array}}
 */
export function instrumentosPara(pre) {
  const p = pre || {};
  const pac = p.paciente || {};
  const ar = p.autoReporte || {};
  const mrs = ar.mrs || {};
  const dolor = ar.dolor || {};
  const hc = ar.hc || {};
  const edad = num(pac.edad);
  const resultadoMrs = mrsResultado(mrs);
  const total = resultadoMrs.total;
  const temas = Array.isArray(hc.temasConsulta) ? hc.temasConsulta : [];
  const etapa = hc.etapaReproductiva || '';
  const posmenopausia = etapa === 'menopausia';
  const enfermedadCardiovascular = hc.enfCorazon === true;

  const sug = [];
  const banderas = [];
  const vistos = new Set();

  // Helper: agrega una sugerencia (sin duplicar; conserva la de mayor prioridad).
  const add = (instrumento, prioridad, motivo, fuente, precarga, accion) => {
    const existente = sug.find((s) => s.instrumento === instrumento);
    if (existente) {
      if (ORDEN_PRIORIDAD[prioridad] < ORDEN_PRIORIDAD[existente.prioridad]) {
        existente.prioridad = prioridad; existente.motivo = motivo; existente.fuente = fuente;
      }
      return;
    }
    sug.push({
      instrumento, nombre: NOMBRE[instrumento] || instrumento,
      prioridad, motivo, fuente,
      precarga: precarga || {},
      accionSugerida: accion || 'revisar_en_consulta',
    });
    vistos.add(instrumento);
  };

  // ---------------- Capa 1: recordatorios por edad ----------------
  if (edad != null) {
    if (edad >= 65) {
      add('osea', 'media', 'Revisar tamizaje de osteoporosis por edad.', ['edad'], {}, 'completar_datos');
    }
    if (edad >= 40 && edad <= 74) {
      add('mama', 'baja', 'Revisar vigencia del tamizaje mamario según edad.', ['edad']);
    }
    if (edad >= 40 && edad <= 79 && !enfermedadCardiovascular) {
      add('cardiometabolico', 'media', 'Valorar riesgo cardiovascular (PREVENT) por edad.', ['edad'], {}, 'completar_datos');
    }
  }

  // ---------------- Capa 2: por respuestas ----------------

  // Menopausia (síntomas vasomotores / MRS). Sintomática pesa más que la edad sola.
  const sintomatica = (total != null && total >= 5) || num(mrs.mrs_bochornos) >= 2;
  const contextoClimaterio = temas.includes('climaterio')
    || ['sin_regla_menos_12m', 'menopausia'].includes(etapa);
  if (sintomatica || contextoClimaterio) {
    const prio = total != null && total >= 17 ? 'alta' : (sintomatica ? 'media' : 'baja');
    const motivo = resultadoMrs.completa
      ? `Menopause Rating Scale completa: total ${total}/44.`
      : 'Síntomas o cambio menstrual reportado: completar valoración de climaterio.';
    add('menopausia', prio, motivo, resultadoMrs.completa ? ['mrs'] : ['motivo', 'etapa_reproductiva'],
      { mrs: { total, completa: resultadoMrs.completa, respondidos: resultadoMrs.respondidos, resumen: p.resumen && p.resumen.menopausia } });
  }

  // Dolor pélvico (+ endometriosis si edad reproductiva)
  if (dolor.tiene || temas.includes('dolor')) {
    const inten = num(dolor.intensidad);
    const prio = (inten != null && inten >= 7) || (num(dolor.meses) >= 6) ? 'alta' : 'media';
    add('dolor-pelvico', prio, `Reportó dolor pélvico${inten != null ? ` (${inten}/10)` : ''}${dolor.meses != null ? `, ${dolor.meses} meses` : ''}.`,
      ['dolor'], { dolor });
    const patronEndometriosis = Array.isArray(dolor.asociados)
      && dolor.asociados.some((x) => ['menstruacion', 'relaciones', 'evacuar', 'orinar'].includes(x));
    if (patronEndometriosis) {
      add('endometriosis', 'media', 'Dolor relacionado con menstruación, relaciones, evacuación u orina: valorar endometriosis.', ['dolor']);
    }
  }

  // Incontinencia / vejiga
  const urinarios = Array.isArray(hc.sintomasUrinarios) ? hc.sintomasUrinarios : [];
  if (num(mrs.mrs_vejiga) >= 2 || urinarios.includes('escapes')) {
    add('incontinencia', 'media', 'Escapes o molestias urinarias reportadas.', urinarios.length ? ['hc'] : ['mrs']);
  }

  // Cardiometabólico por antecedentes o fármaco metabólico. El seguimiento
  // longitudinal de composición corporal vive solo en el ERP/expediente.
  const meds = txt(hc.medicamentos);
  const enMetabolico = RE_METABOLICO.test(meds);
  if (enfermedadCardiovascular) {
    add(
      'cardiometabolico',
      'alta',
      'Enfermedad cardiovascular o evento vascular previo reportado: revisar perfil cardiometabólico; PREVENT no aplica.',
      ['antecedentes'],
      {},
      'revisar_en_consulta',
    );
  }
  if (hc.enfDiabetes || hc.enfHipertension || hc.fuma || enMetabolico) {
    const causas = [hc.enfDiabetes && 'diabetes', hc.enfHipertension && 'hipertensión', hc.fuma && 'tabaquismo', enMetabolico && 'fármaco metabólico'].filter(Boolean);
    add('cardiometabolico', 'alta', `Factores cardiometabólicos: ${causas.join(', ')}.`, ['antecedentes'], {}, 'completar_datos');
  }

  // Mama por antecedente familiar
  if (hc.famCancerMama || hc.famCancerOvario) {
    const f = [hc.famCancerMama && 'mama', hc.famCancerOvario && 'ovario'].filter(Boolean).join(' y ');
    const detalle = hc.cancerFamiliarDetalle ? ' con parentesco/edad reportados' : ' sin parentesco ni edad completos';
    add('mama', 'alta', `Antecedente familiar de cáncer de ${f}${detalle}: completar evaluación de riesgo.`, ['antecedente_familiar'], {}, 'completar_datos');
  }
  const sintomasMama = Array.isArray(hc.sintomasMama) ? hc.sintomasMama : [];
  const sintomasMamaPrioritarios = sintomasMama.filter((x) => [
    'bolita', 'secrecion', 'piel_pezon',
  ].includes(x));
  if (sintomasMamaPrioritarios.length) {
    add('mama', 'alta', 'Síntoma mamario nuevo reportado: requiere valoración clínica dirigida.', ['hc'], {}, 'revisar_en_consulta');
  } else if (sintomasMama.includes('dolor')) {
    add('mama', 'media', 'Dolor o sensibilidad mamaria persistente reportada.', ['hc'], {}, 'revisar_en_consulta');
  }

  // Ósea por factor de riesgo
  if (hc.famOsteoporosis || (posmenopausia && hc.fuma)) {
    add('osea', 'media', 'Posmenopausia con factor de riesgo óseo reportado.', ['etapa_reproductiva', 'antecedentes'], {}, 'completar_datos');
  }

  // Síndrome poliendocrino metabólico ovárico (ciclos irregulares + androgénico nuevo)
  const androgenico = hc.acne || hc.hirsutismo || hc.caidaCabello;
  const etapaCompatibleSop = !['menopausia', 'embarazada', 'posparto', 'histerectomia'].includes(etapa);
  if (hc.reglasRegulares === false && etapaCompatibleSop) {
    const motivo = androgenico ? 'Ciclos irregulares y datos androgénicos.' : 'Ciclos irregulares reportados.';
    if (edad == null || edad <= 50) add('sop', androgenico ? 'alta' : 'media', motivo, ['hc'], {}, 'completar_datos');
  }

  // Sangrado uterino anormal (campo nuevo `sangrado`) + bandera posmenopáusica
  const sangradoTipos = Array.isArray(hc.sangradoTipos) ? hc.sangradoTipos : [];
  if (hc.sangrado || temas.includes('sangrado') || sangradoTipos.length) {
    add('hemorragia', 'alta', 'Sangrado uterino anormal reportado.', ['hc']);
    if (posmenopausia || sangradoTipos.includes('despues_menopausia')) {
      banderas.push({ tipo: 'roja', mensaje: 'Sangrado posmenopáusico: descartar patología endometrial.', instrumentoRelacionado: 'hemorragia' });
    }
  }

  // Anticoncepción solo por objetivo expresado, nunca por edad.
  if (hc.objetivoReproductivo === 'evitar' || temas.includes('anticoncepcion')) {
    add('anticoncepcion', 'media', 'La paciente desea revisar anticoncepción.', ['objetivo_reproductivo']);
  }

  // Otras banderas de alarma
  if (dolor.tiene && num(dolor.intensidad) >= 9) {
    banderas.push({ tipo: 'roja', mensaje: 'Dolor pélvico intenso (9-10/10): valorar causa aguda.', instrumentoRelacionado: 'dolor-pelvico' });
  }

  const senales = Array.isArray(hc.senalesUrgencia) ? hc.senalesUrgencia : [];
  if (senales.some((x) => x !== 'ninguna')) {
    banderas.push({
      tipo: 'roja',
      mensaje: 'La paciente reportó señales que ameritaron orientación de atención urgente en el portal.',
      instrumentoRelacionado: hc.sangrado ? 'hemorragia' : (dolor.tiene ? 'dolor-pelvico' : ''),
    });
  }
  const senalesMaternas = Array.isArray(hc.senalesMaternas)
    ? hc.senalesMaternas.filter((x) => x !== 'ninguna')
    : [];
  if (senalesMaternas.length) {
    banderas.push({
      tipo: 'roja',
      mensaje: senalesMaternas.includes('ideas_dano')
        ? 'La paciente reportó una señal urgente de salud mental durante embarazo o posparto.'
        : 'La paciente reportó una señal materna urgente durante embarazo o posparto.',
      instrumentoRelacionado: '',
    });
  }

  sug.sort((a, b) => ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad]);
  return { version: RUTEO_VERSION, instrumentosSugeridos: sug, banderas };
}
