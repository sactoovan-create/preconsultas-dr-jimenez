/**
 * Lógica clínica del instrumento de Endometriosis. Funciones puras.
 *
 * Base: Guía de endometriosis de la European Society of Human Reproduction and
 * Embryology, 2022. El diagnóstico ya no exige laparoscopia: se sostiene en
 * síntomas, exploración e imagen (ecografía transvaginal y resonancia). La
 * laparoscopia queda para imagen negativa con tratamiento empírico fallido o
 * inapropiado.
 *
 * Estadificación formal: clasificación revisada de la American Society for
 * Reproductive Medicine (estadios por puntos), clasificación Enzian para
 * enfermedad profunda, e índice de fertilidad de endometriosis (Adamson y Pasta,
 * 2010), el único que predice fertilidad de forma fiable.
 *
 * Cubre adultas y adolescentes. Instrumento de apoyo a la decisión.
 */

const v = (x) => x !== null && x !== undefined && !isNaN(x);

/**
 * Probabilidad clínica orientativa. No es un score validado: estructura la
 * sospecha según síntomas cardinales, hallazgos a la exploración e imagen.
 */
export function evaluarClinico(d) {
  const sintomas = [];
  if (d.dismenorreaSevera) sintomas.push('dismenorrea intensa o progresiva');
  if (d.dispareunia) sintomas.push('dispareunia profunda');
  if (d.dolorPelvicoCronico) sintomas.push('dolor pélvico no menstrual');
  if (d.dischezia) sintomas.push('dischezia o síntomas intestinales cíclicos');
  if (d.sintomasUrinarios) sintomas.push('síntomas urinarios cíclicos');
  if (d.infertilidad) sintomas.push('infertilidad');
  const nSintomas = sintomas.length;

  const signos = [];
  if (d.nodularidad) signos.push('nodularidad o dolor en ligamentos uterosacros o fondo de saco');
  if (d.masaAnexial) signos.push('masa anexial sugestiva de endometrioma');
  if (d.uteroFijo) signos.push('útero en retroversión fija o movilidad reducida');
  const hayatSignos = signos.length > 0;

  const imagenPositiva = d.endometriomaImagen || d.endometriosisProfundaImagen;

  let nivel, mensaje;
  if (imagenPositiva) {
    nivel = 'confirmado_imagen';
    mensaje = 'Hallazgos de imagen compatibles: el diagnóstico puede establecerse sin laparoscopia. Caracterizar extensión para planear el manejo.';
  } else if (nSintomas >= 2 && hayatSignos) {
    nivel = 'alta';
    mensaje = 'Cuadro clínico de alta sospecha. Es razonable ofrecer tratamiento empírico o derivar a imagen experta; la laparoscopia no es obligatoria para iniciar.';
  } else if (nSintomas >= 1) {
    nivel = 'intermedia';
    mensaje = 'Sospecha clínica presente. Estudiar con ecografía transvaginal dirigida; valorar tratamiento empírico según el impacto y la preferencia.';
  } else {
    nivel = 'baja';
    mensaje = 'Sin síntomas cardinales con los datos capturados.';
  }
  return { nivel, mensaje, sintomas, signos, imagenPositiva, nSintomas };
}

/** Orientación a estudio dirigido. */
export function orientacionEstudio(d, clinico) {
  const e = [];
  e.push('Ecografía transvaginal como primera imagen, dirigida a endometrioma y a signos de enfermedad profunda (nódulos, adherencias, deslizamiento negativo entre recto y útero).');
  if (d.dischezia || d.sintomasUrinarios || d.endometriosisProfundaImagen) {
    e.push('Resonancia magnética para mapear endometriosis profunda y afectación de recto, vejiga o uréteres; valorar derivación a centro experto.');
  }
  if (!clinico.imagenPositiva) {
    e.push('La laparoscopia se reserva para imagen negativa cuando el tratamiento empírico falla o no es apropiado; no es requisito para iniciar manejo.');
  }
  if (d.infertilidad) e.push('Estudio de fertilidad de la pareja en paralelo; el hallazgo quirúrgico permite calcular el índice de fertilidad.');
  return e;
}

/** Clasificación revisada de la American Society for Reproductive Medicine. */
export function calcularRasrm(d) {
  if (!v(d.rasrmTotal)) return null;
  const t = d.rasrmTotal;
  let estadio, nombre;
  if (t <= 5) { estadio = 'I'; nombre = 'mínima'; }
  else if (t <= 15) { estadio = 'II'; nombre = 'leve'; }
  else if (t <= 40) { estadio = 'III'; nombre = 'moderada'; }
  else { estadio = 'IV'; nombre = 'severa'; }
  return { puntaje: t, estadio, nombre };
}

/**
 * Índice de fertilidad de endometriosis (0 a 10).
 * Factores históricos: edad, años de infertilidad, gestación previa.
 * Factores quirúrgicos: puntaje de función mínima (suma del menor puntaje de cada
 * lado, trompa-fimbria-ovario, cada estructura de 0 a 4), puntaje de lesión y
 * puntaje total de la clasificación revisada.
 */
export function calcularEfi(d) {
  const necesarios = [d.efiEdad, d.efiAniosInfertilidad, d.lfTotal, d.rasrmLesion, d.rasrmTotal];
  if (necesarios.some((x) => !v(x)) || d.efiGestacionPrevia === null || d.efiGestacionPrevia === undefined) return null;

  let hist = 0;
  hist += d.efiEdad <= 35 ? 2 : (d.efiEdad <= 39 ? 1 : 0);
  hist += d.efiAniosInfertilidad <= 3 ? 2 : 0;
  hist += d.efiGestacionPrevia ? 1 : 0;

  let quir = 0;
  const lf = d.lfTotal; // 0 a 8
  quir += lf >= 7 ? 3 : (lf >= 4 ? 2 : (lf >= 1 ? 1 : 0));
  quir += d.rasrmLesion < 16 ? 1 : 0;
  quir += d.rasrmTotal < 71 ? 1 : 0;

  const total = hist + quir;
  let pronostico;
  if (total <= 2) pronostico = 'muy bajo';
  else if (total <= 4) pronostico = 'bajo';
  else if (total <= 6) pronostico = 'intermedio';
  else pronostico = 'bueno';
  return { total, historico: hist, quirurgico: quir, pronostico };
}

/** Resumen estructurado de la clasificación Enzian (enfermedad profunda). */
export function resumenEnzian(d) {
  const comp = [];
  const add = (clave, etiqueta, grado) => { if (grado && grado !== '0') comp.push(`${clave} (${etiqueta}) grado ${grado}`); };
  add('A', 'tabique rectovaginal y vagina', d.enzianA);
  add('B', 'ligamentos uterosacros y pared pélvica', d.enzianB);
  add('C', 'recto y sigmoides', d.enzianC);
  const f = [];
  if (d.enzianFA) f.push('FA adenomiosis');
  if (d.enzianFB) f.push('FB vejiga');
  if (d.enzianFI) f.push('FI intestino');
  if (d.enzianFU) f.push('FU uréter');
  if (d.enzianFO) f.push('FO otra localización');
  return { compartimentos: comp, focales: f, hay: comp.length > 0 || f.length > 0 };
}

/** Orientación a tratamiento. Se bifurca según el eje sea dolor o fertilidad. */
export function orientacionTratamiento(d) {
  const adolescente = d.poblacion === 'adolescente';
  const bloques = [];

  if (d.objetivoFertilidad) {
    bloques.push({
      eje: 'Fertilidad',
      recomendaciones: [
        'No usar supresión hormonal como tratamiento de la infertilidad: no mejora las tasas de embarazo y retrasa la búsqueda.',
        'Valorar cirugía laparoscópica según el caso; el índice de fertilidad orienta el pronóstico tras la operación.',
        'Reproducción asistida según edad, reserva ovárica y factor masculino; la administración prolongada de un agonista de la hormona liberadora de gonadotropinas antes de la fertilización in vitro puede mejorar resultados.',
        'Ante endometrioma, sopesar el beneficio de la cirugía contra el daño a la reserva ovárica.',
      ],
    });
  } else {
    const primera = adolescente
      ? 'Primera línea: antiinflamatorios no esteroideos y anticonceptivos hormonales combinados (de preferencia en pauta continua) o progestágenos. La dismenorrea intensa que no responde justifica evaluar endometriosis de forma temprana.'
      : 'Primera línea: antiinflamatorios no esteroideos y tratamiento hormonal: anticonceptivos combinados (continuos o cíclicos), progestágenos como dienogest, o dispositivo intrauterino liberador de levonorgestrel.';
    bloques.push({
      eje: adolescente ? 'Dolor en la adolescente' : 'Dolor',
      recomendaciones: [
        primera,
        'Segunda línea: agonistas o antagonistas de la hormona liberadora de gonadotropinas, estos últimos con terapia de adición para proteger hueso y controlar síntomas vasomotores.',
        adolescente
          ? 'Cirugía conservadora si fracasa el tratamiento médico, priorizando la preservación de la fertilidad futura.'
          : 'Cirugía si fracasa el tratamiento médico o ante enfermedad profunda sintomática; ofrecer tratamiento médico posoperatorio para reducir recurrencia en quien no busca embarazo inmediato.',
      ],
    });
  }

  bloques.push({
    eje: 'Soporte',
    recomendaciones: [
      'Manejo multimodal del dolor: abordaje del dolor pélvico crónico, fisioterapia de piso pélvico y apoyo en salud mental cuando corresponda.',
      'Información a la paciente sobre la naturaleza crónica y la necesidad de seguimiento a largo plazo.',
    ],
  });
  return bloques;
}

/** Evaluación completa. Punto de entrada del motor. */
export function evaluarEndometriosis(paciente, datos) {
  const d = { ...datos };
  const clinico = evaluarClinico(d);
  const estudio = orientacionEstudio(d, clinico);
  const rasrm = calcularRasrm(d);
  const efi = d.objetivoFertilidad ? calcularEfi(d) : null;
  const enzian = resumenEnzian(d);
  const tratamiento = orientacionTratamiento(d);
  const hojaPaciente = construirHojaPaciente(paciente, d, clinico);
  return { clinico, estudio, rasrm, efi, enzian, tratamiento, hojaPaciente };
}

function construirHojaPaciente(p, d, clinico) {
  const sintomas = clinico.sintomas.map((s) => ({ texto: s }));
  return {
    identificacion: { nombre: p.demografia.nombre, edad: p.demografia.edad },
    titulo: 'Resumen de tu evaluación',
    intro: 'Este es el registro de lo que conversamos hoy sobre tus síntomas. Llévalo a tu seguimiento para ajustar el plan a cómo evoluciones.',
    secciones: [],
    listas: sintomas.length ? [{ titulo: 'Lo que reportaste', items: clinico.sintomas }] : [],
    recomendaciones: [
      'La endometriosis es una condición crónica que se puede controlar; el objetivo es mejorar tu dolor y tu calidad de vida.',
      'Lleva un registro de tu dolor y de cómo respondes al tratamiento para afinarlo en cada consulta.',
      'Si tu plan incluye búsqueda de embarazo, coméntalo a tiempo, porque cambia las decisiones de tratamiento.',
      'El manejo del dolor a largo plazo puede incluir medidas además de los medicamentos, como fisioterapia y apoyo emocional.',
    ],
    pie: 'Documento informativo para la paciente. Su interpretación corresponde a tu médico. Hoja emitida por el consultorio del Dr. Iván Jiménez Martínez.',
  };
}
