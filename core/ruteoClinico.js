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

export const RUTEO_VERSION = 1;

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
function mrsTotal(mrs) {
  if (!mrs) return 0;
  return Object.keys(mrs).reduce((s, k) => s + (num(mrs[k]) || 0), 0);
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
  const total = mrsTotal(mrs);

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

  // ---------------- Capa 1: por edad (panel base) ----------------
  if (edad != null) {
    if (edad >= 52) {
      add('osea', 'media', 'Riesgo de osteoporosis por edad posmenopáusica.', ['edad'], {}, 'completar_datos');
      add('mama', 'media', 'Tamizaje mamario por edad.', ['edad']);
      add('cardiometabolico', 'media', 'Valorar riesgo cardiovascular (PREVENT) por edad.', ['edad'], {}, 'completar_datos');
    } else if (edad >= 40) {
      add('cardiometabolico', 'media', 'Valorar riesgo cardiometabólico por edad.', ['edad'], {}, 'completar_datos');
      add('mama', 'baja', 'Tamizaje mamario según edad.', ['edad']);
    } else if (edad >= 18) {
      add('anticoncepcion', 'baja', 'Edad reproductiva: valorar anticoncepción.', ['edad']);
    }
  }

  // ---------------- Capa 2: por respuestas ----------------

  // Menopausia (síntomas vasomotores / MRS). Sintomática pesa más que la edad sola.
  const sintomatica = total >= 5 || num(mrs.mrs_bochornos) >= 2;
  if (sintomatica || (edad != null && edad >= 45)) {
    const prio = total >= 17 ? 'alta' : (sintomatica ? 'media' : 'baja');
    const motivo = sintomatica
      ? `Menopause Rating Scale: total ${total}/44.`
      : 'Edad perimenopáusica: valorar síntomas y candidatura a terapia hormonal.';
    add('menopausia', prio, motivo, sintomatica ? ['mrs'] : ['edad'],
      { mrs: { total, resumen: p.resumen && p.resumen.menopausia } });
  }

  // Dolor pélvico (+ endometriosis si edad reproductiva)
  if (dolor.tiene) {
    const inten = num(dolor.intensidad);
    const prio = (inten != null && inten >= 7) || (num(dolor.meses) >= 6) ? 'alta' : 'media';
    add('dolor-pelvico', prio, `Reportó dolor pélvico${inten != null ? ` (${inten}/10)` : ''}${dolor.meses != null ? `, ${dolor.meses} meses` : ''}.`,
      ['dolor'], { dolor });
    if (edad != null && edad <= 45) add('endometriosis', 'baja', 'Dolor pélvico en edad reproductiva: considerar endometriosis.', ['dolor', 'edad']);
  }

  // Incontinencia / vejiga
  if (num(mrs.mrs_vejiga) >= 2) add('incontinencia', 'media', 'Molestias urinarias reportadas en la escala.', ['mrs']);

  // Cardiometabólico por antecedentes o fármaco metabólico. El seguimiento
  // longitudinal de composición corporal vive solo en el ERP/expediente.
  const meds = txt(hc.medicamentos);
  const enMetabolico = RE_METABOLICO.test(meds);
  if (hc.enfDiabetes || hc.enfHipertension || hc.fuma || enMetabolico) {
    const causas = [hc.enfDiabetes && 'diabetes', hc.enfHipertension && 'hipertensión', hc.fuma && 'tabaquismo', enMetabolico && 'fármaco metabólico'].filter(Boolean);
    add('cardiometabolico', 'alta', `Factores cardiometabólicos: ${causas.join(', ')}.`, ['antecedentes'], {}, 'completar_datos');
  }

  // Mama por antecedente familiar
  if (hc.famCancerMama || hc.famCancerOvario) {
    const f = [hc.famCancerMama && 'mama', hc.famCancerOvario && 'ovario'].filter(Boolean).join(' y ');
    add('mama', 'alta', `Antecedente familiar de cáncer de ${f}: valorar riesgo (Tyrer-Cuzick).`, ['antecedente_familiar']);
  }

  // Ósea por factor de riesgo
  if (hc.famOsteoporosis) add('osea', 'media', 'Antecedente familiar de osteoporosis.', ['antecedente_familiar'], {}, 'completar_datos');

  // Síndrome poliendocrino metabólico ovárico (ciclos irregulares + androgénico nuevo)
  const androgenico = hc.acne || hc.hirsutismo || hc.caidaCabello;
  if (hc.reglasRegulares === false || androgenico) {
    const motivo = hc.reglasRegulares === false
      ? (androgenico ? 'Ciclos irregulares y datos androgénicos.' : 'Ciclos irregulares reportados.')
      : 'Datos androgénicos reportados.';
    if (edad == null || edad <= 50) add('sop', androgenico && hc.reglasRegulares === false ? 'alta' : 'media', motivo, ['hc']);
  }

  // Sangrado uterino anormal (campo nuevo `sangrado`) + bandera posmenopáusica
  if (hc.sangrado) {
    add('hemorragia', 'alta', 'Sangrado uterino anormal reportado.', ['hc']);
    if (edad != null && edad >= 51) {
      banderas.push({ tipo: 'roja', mensaje: 'Sangrado posmenopáusico: descartar patología endometrial.', instrumentoRelacionado: 'hemorragia' });
    }
  }

  // Otras banderas de alarma
  if (dolor.tiene && num(dolor.intensidad) >= 9) {
    banderas.push({ tipo: 'roja', mensaje: 'Dolor pélvico intenso (9-10/10): valorar causa aguda.', instrumentoRelacionado: 'dolor-pelvico' });
  }

  sug.sort((a, b) => ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad]);
  return { version: RUTEO_VERSION, instrumentosSugeridos: sug, banderas };
}
