/**
 * Lógica clínica del instrumento de Menopausia y Terapia Hormonal. Funciones puras.
 *
 * Síntomas: Menopause Rating Scale, la escala de síntomas de la menopausia con
 * mayor validación y uso internacional (once reactivos en tres dominios: somático,
 * psicológico y urogenital, cada uno de cero a cuatro).
 *
 * Terapia hormonal: guía clínica de The Menopause Society (Menopause Practice,
 * sexta edición, 2024), guía de la European Society of Endocrinology (2025) y
 * recomendaciones de la International Menopause Society (2025).
 * Ventana de oportunidad, vía transdérmica ante riesgo, progestágeno metabólicamente
 * neutro si hay útero, con la combinación sin progestágeno de estrógeno y bazedoxifeno
 * como alternativa. Incluye insuficiencia ovárica primaria y menopausia precoz, donde
 * la terapia se recomienda hasta la edad natural de la menopausia aunque no haya
 * síntomas, y las alternativas no hormonales, incluidos los antagonistas del receptor
 * de neuroquinina. Se evitan las hormonas compuestas por seguridad.
 *
 * Instrumento de apoyo a la decisión.
 */

const v = (x) => x !== null && x !== undefined && !isNaN(x);

import { recomendacionesMenopausia } from '../../core/recomendaciones.js';

export const MRS_ITEMS = [
  { id: 'mrs_bochornos', dominio: 'somatico', texto: 'Bochornos y sudoración' },
  { id: 'mrs_cardiaco', dominio: 'somatico', texto: 'Molestias cardíacas (palpitaciones)' },
  { id: 'mrs_sueno', dominio: 'somatico', texto: 'Problemas de sueño' },
  { id: 'mrs_musculo', dominio: 'somatico', texto: 'Molestias musculares y articulares' },
  { id: 'mrs_animo', dominio: 'psicologico', texto: 'Estado de ánimo depresivo' },
  { id: 'mrs_irritable', dominio: 'psicologico', texto: 'Irritabilidad' },
  { id: 'mrs_ansiedad', dominio: 'psicologico', texto: 'Ansiedad' },
  { id: 'mrs_agotamiento', dominio: 'psicologico', texto: 'Agotamiento físico y mental' },
  { id: 'mrs_sexual', dominio: 'urogenital', texto: 'Problemas sexuales' },
  { id: 'mrs_vejiga', dominio: 'urogenital', texto: 'Problemas de vejiga' },
  { id: 'mrs_sequedad', dominio: 'urogenital', texto: 'Sequedad vaginal' },
];

function severidad(valor, cortes) {
  // cortes: [maxMinima, maxLeve, maxModerada]; por encima es severa
  if (valor <= cortes[0]) return 'mínima';
  if (valor <= cortes[1]) return 'leve';
  if (valor <= cortes[2]) return 'moderada';
  return 'severa';
}

/** Menopause Rating Scale: puntaje total y por dominio con su severidad. */
export function evaluarMrs(d) {
  const suma = (dom) => MRS_ITEMS.filter((i) => i.dominio === dom).reduce((a, i) => a + (v(d[i.id]) ? d[i.id] : 0), 0);
  const somatico = suma('somatico');
  const psicologico = suma('psicologico');
  const urogenital = suma('urogenital');
  const total = somatico + psicologico + urogenital;
  return {
    total, somatico, psicologico, urogenital,
    sevTotal: severidad(total, [4, 8, 16]),
    sevSomatico: severidad(somatico, [2, 4, 8]),
    sevPsicologico: severidad(psicologico, [1, 3, 6]),
    sevUrogenital: severidad(urogenital, [0, 1, 3]),
  };
}

/** Clasifica el tipo según la edad de la menopausia. */
export function clasificarTipo(d) {
  const e = d.edadMenopausia;
  if (d.tipo) {
    const mapa = {
      insuficiencia: { tipo: 'insuficiencia', etiqueta: 'Insuficiencia ovárica primaria', nota: 'Menopausia antes de los cuarenta años. Confirmar con hormona folículo estimulante elevada en dos muestras separadas cuatro a seis semanas.' },
      precoz: { tipo: 'precoz', etiqueta: 'Menopausia precoz o temprana', nota: 'Menopausia entre los cuarenta y los cuarenta y cuatro años.' },
      habitual: { tipo: 'habitual', etiqueta: 'Menopausia habitual', nota: '' },
    };
    return mapa[d.tipo];
  }
  if (v(e) && e < 40) return { tipo: 'insuficiencia', etiqueta: 'Insuficiencia ovárica primaria', nota: 'Menopausia antes de los cuarenta años.' };
  if (v(e) && e < 45) return { tipo: 'precoz', etiqueta: 'Menopausia precoz o temprana', nota: 'Menopausia entre los cuarenta y los cuarenta y cuatro años.' };
  return { tipo: 'habitual', etiqueta: 'Menopausia habitual', nota: '' };
}

/** Candidatura a terapia hormonal sistémica. */
export function evaluarCandidatura(paciente, d, tipo) {
  const { edad, histerectomia } = d;
  // Las contraindicaciones viven en el paciente compartido (fuente única), no en
  // el estado local del instrumento. Así coinciden con el cardiometabólico.
  const a = paciente.antecedentes;

  const contra = [];
  if (a.cancerMama) contra.push('cáncer de mama');
  if (a.ecvEstablecida) contra.push('enfermedad cardiovascular establecida');
  if (a.tromboembolismo) contra.push('tromboembolismo venoso o trombofilia');
  if (a.hepatica) contra.push('enfermedad hepática activa');
  if (a.sangradoNoDx) contra.push('sangrado vaginal no diagnosticado');

  if (contra.length) {
    return { recomienda: false, tipo: 'contraindicada', titulo: 'Terapia hormonal sistémica contraindicada', detalle: 'Contraindicación presente: ' + contra.join(', ') + '. Considerar alternativas no hormonales y tratamiento local del síndrome genitourinario.' };
  }

  // Insuficiencia ovárica primaria y menopausia precoz: indicar hasta la edad natural.
  if (tipo.tipo === 'insuficiencia' || tipo.tipo === 'precoz') {
    return {
      recomienda: true, tipo: 'indicada_edad',
      titulo: 'Terapia hormonal indicada hasta la edad natural de la menopausia',
      detalle: 'En insuficiencia ovárica primaria y menopausia precoz se recomienda terapia hormonal hasta al menos los cincuenta y un años, aunque no haya síntomas, para reducir el riesgo óseo, cardiovascular y cognitivo de la deficiencia estrogénica.',
      progestageno: histerectomia !== true,
    };
  }

  // Menopausia habitual: ventana de oportunidad.
  const aniosMeno = (v(d.edadMenopausia) && v(edad)) ? edad - d.edadMenopausia : null;
  const enVentana = v(edad) && edad < 60 && (aniosMeno === null || aniosMeno < 10);
  if (enVentana) {
    return {
      recomienda: true, tipo: 'ventana',
      titulo: 'Ventana de oportunidad favorable',
      detalle: 'Menor de sesenta años y dentro de los diez años de la menopausia: el balance favorece el inicio cuando hay síntomas que afectan la calidad de vida, y el beneficio es mayor cuanto más temprano se inicia. La terapia hormonal también está indicada cuando coexiste un riesgo alto de fractura con síntomas de moderados a severos.',
      progestageno: histerectomia !== true,
    };
  }
  return {
    recomienda: false, tipo: 'fuera_ventana',
    titulo: 'Fuera de la ventana de inicio',
    detalle: 'No se recomienda iniciar terapia sistémica de rutina por mayor riesgo cardiovascular, de evento vascular cerebral y de tromboembolismo. No es necesario suspenderla de rutina en quien ya la usa y la tolera. Para síntomas, valorar alternativas no hormonales y tratamiento local.',
  };
}

/** Vía de administración sugerida según factores de riesgo. */
export function evaluarVia(paciente, d) {
  const peso = paciente.signos.peso, talla = paciente.signos.talla;
  const imc = (v(peso) && v(talla)) ? peso / Math.pow(talla / 100, 2) : null;
  const factores = [];
  if (v(imc) && imc >= 30) factores.push('índice de masa corporal de treinta o más');
  if (d.tabaquismo) factores.push('tabaquismo');
  if (d.hipertension) factores.push('hipertensión');
  if (d.sindromeMetabolico) factores.push('síndrome metabólico');
  if (d.riesgoTev) factores.push('riesgo de tromboembolismo');
  const transdermica = factores.length > 0;
  return {
    via: transdermica ? 'transdérmica' : 'oral o transdérmica',
    transdermica,
    factores,
    nota: transdermica
      ? 'Preferir la vía transdérmica: no aumenta el riesgo de tromboembolismo a dosis estándar y tiene menor impacto sobre los triglicéridos, los factores de coagulación y la vesícula, con efecto mínimo sobre la globulina fijadora. Motivos: ' + factores.join(', ') + '.'
      : 'Sin factores que obliguen a una vía; elegir según la preferencia y el perfil de la paciente.',
  };
}

/** Síndrome genitourinario de la menopausia. */
export function evaluarGenitourinario(d, mrs) {
  const sintomas = (v(d.mrs_sequedad) && d.mrs_sequedad >= 1) || (v(d.mrs_vejiga) && d.mrs_vejiga >= 1) || (v(d.mrs_sexual) && d.mrs_sexual >= 1) || d.gsmSintomas;
  if (!sintomas) return { presente: false };
  return {
    presente: true,
    detalle: 'Estrógeno vaginal local como primera línea; es eficaz y puede usarse incluso junto con terapia sistémica y, en general, no requiere progestágeno. Hidratantes y lubricantes como complemento. Otras opciones: prasterona vaginal y ospemifeno para la dispareunia.',
  };
}

/** Alternativas no hormonales para síntomas vasomotores. */
export function alternativasNoHormonales(candidatura, d) {
  // Relevantes si hay contraindicación, está fuera de ventana, o se prefiere no hormonal.
  const aplica = !candidatura.recomienda || d.prefiereNoHormonal;
  if (!aplica) return null;
  return {
    detalle: [
      'Primera línea: un inhibidor de la recaptación de serotonina o de serotonina y noradrenalina (la paroxetina en dosis baja es la única aprobada de forma específica; también venlafaxina), o un antagonista del receptor de neuroquinina como el fezolinetant para síntomas vasomotores de moderados a severos.',
      'Segunda línea: gabapentina, en especial si predominan los síntomas nocturnos, u oxibutinina de liberación prolongada, con evidencia para los síntomas vasomotores.',
      'Terapia cognitivo-conductual específica para la menopausia, con evidencia para los síntomas vasomotores y el sueño.',
    ],
  };
}

/** Evaluación completa. Punto de entrada del motor. */
export function evaluarMenopausia(paciente, datos) {
  const dem = paciente.demografia;
  const d = { ...datos, edad: dem.edad, edadMenopausia: dem.edadMenopausia, histerectomia: dem.histerectomia };
  const mrs = evaluarMrs(d);
  const tipo = clasificarTipo(d);
  const candidatura = evaluarCandidatura(paciente, d, tipo);
  const via = candidatura.recomienda ? evaluarVia(paciente, d) : null;
  const genitourinario = evaluarGenitourinario(d, mrs);
  const noHormonales = alternativasNoHormonales(candidatura, d);
  const recomendaciones = recomendacionesMenopausia(d);
  const hojaPaciente = construirHojaPaciente(paciente, d, mrs, recomendaciones);
  return { mrs, tipo, candidatura, via, genitourinario, noHormonales, recomendaciones, hojaPaciente };
}

function construirHojaPaciente(p, d, mrs, recomendaciones) {
  return {
    identificacion: { nombre: p.demografia.nombre, edad: p.demografia.edad },
    titulo: 'Resumen de tu evaluación',
    intro: 'Este es el registro de tus síntomas de hoy, con una puntuación que usaremos para ver cómo mejoras con el tratamiento, y unas recomendaciones pensadas para lo que tú reportaste.',
    secciones: [{
      titulo: 'Tu puntuación de síntomas',
      filas: [
        { parametro: 'Puntuación total de síntomas', valor: mrs.total, unidad: 'de 44', meta: `Intensidad ${mrs.sevTotal}`, ok: mrs.total <= 8 },
        { parametro: 'Síntomas físicos', valor: mrs.somatico, unidad: 'de 16', meta: '', ok: mrs.sevSomatico === 'mínima' || mrs.sevSomatico === 'leve' },
        { parametro: 'Síntomas emocionales', valor: mrs.psicologico, unidad: 'de 16', meta: '', ok: mrs.sevPsicologico === 'mínima' || mrs.sevPsicologico === 'leve' },
        { parametro: 'Síntomas urinarios y vaginales', valor: mrs.urogenital, unidad: 'de 12', meta: '', ok: mrs.sevUrogenital === 'mínima' || mrs.sevUrogenital === 'leve' },
      ],
    }],
    recomendaciones: (recomendaciones || []).map((r) => `${r.tema}: ${r.texto}`),
    pie: 'Documento informativo para la paciente. Su interpretación corresponde a tu médico. Hoja emitida por el consultorio del Dr. Iván Jiménez Martínez.',
  };
}
