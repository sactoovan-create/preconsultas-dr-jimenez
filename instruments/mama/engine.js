/**
 * Lógica del instrumento de Riesgo de Cáncer de Mama. Funciones puras.
 *
 * Enfoque: estratificación de riesgo y conducta según criterios de guía
 * (American College of Obstetricians and Gynecologists, American Cancer Society,
 * National Comprehensive Cancer Network y criterios de derivación a genética). No
 * reproduce el porcentaje de modelos propietarios como el Tyrer-Cuzick o el
 * Breast Cancer Risk Assessment Tool; cuando la historia familiar lo amerita,
 * remite a calcular el riesgo de por vida con un modelo validado.
 *
 * Umbrales de referencia: resonancia magnética anual añadida a la mastografía con
 * riesgo de por vida del veinte por ciento o más por modelos basados en historia
 * familiar; tratamiento de reducción de riesgo con riesgo a cinco años elevado o
 * lesión de alto riesgo. Cubre adultas. Instrumento de apoyo a la decisión.
 */

const v = (x) => x !== null && x !== undefined && !isNaN(x);

/** Criterios categóricos de alto riesgo, independientes del porcentaje. */
export function criteriosAltoRiesgo(d) {
  const c = [];
  if (d.mutacionConocida) c.push('Portadora de una variante patogénica (por ejemplo BRCA1 o BRCA2).');
  if (d.familiarPortador) c.push('Familiar de primer grado portador de una variante patogénica, sin estudio propio.');
  if (d.radiacionTorax) c.push('Radioterapia torácica entre los diez y los treinta años de edad.');
  if (d.carcinomaLobulillarInSitu) c.push('Carcinoma lobulillar in situ.');
  if (d.hiperplasiaAtipica) c.push('Hiperplasia atípica (ductal o lobulillar) en biopsia.');
  return c;
}

/** Historia familiar que amerita estimar el riesgo de por vida con un modelo. */
export function señalesHistoriaFamiliar(d) {
  const s = [];
  if (d.familiarMama2oMas) s.push('Dos o más familiares con cáncer de mama.');
  if (d.familiarMamaMenor50) s.push('Familiar de primer grado con cáncer de mama antes de los cincuenta años.');
  if (d.familiarOvario) s.push('Familiar con cáncer de ovario.');
  if (d.familiarMamaHombre) s.push('Cáncer de mama en un familiar hombre.');
  if (d.familiarTripleNegativo) s.push('Familiar con cáncer de mama triple negativo antes de los sesenta años.');
  return s;
}

/** Criterios de derivación a consejo genético. */
export function criteriosGenetica(d) {
  const c = [];
  if (d.mutacionConocida || d.familiarPortador) c.push('Variante patogénica conocida en la paciente o en la familia.');
  if (d.familiarMamaMenor50) c.push('Cáncer de mama en familiar antes de los cincuenta años.');
  if (d.familiarOvario) c.push('Cáncer de ovario en la familia.');
  if (d.familiarMamaHombre) c.push('Cáncer de mama en un familiar hombre.');
  if (d.familiarTripleNegativo) c.push('Cáncer de mama triple negativo antes de los sesenta años.');
  if (d.ascendenciaAskenazi && (d.familiarMama2oMas || d.familiarMamaMenor50 || d.familiarOvario)) c.push('Ascendencia judía askenazí con antecedente de cáncer de mama u ovario.');
  if (d.multiplesCanceres) c.push('Tres o más familiares con cánceres asociados (mama, ovario, páncreas, próstata agresivo, melanoma, entre otros).');
  return c;
}

/** Factores hormonales y reproductivos que elevan el riesgo basal. */
export function factoresModuladores(d) {
  const f = [];
  if (d.menarcaTemprana) f.push('Menarca antes de los doce años.');
  if (d.nuliparaTardia) f.push('Nuliparidad o primer parto después de los treinta años.');
  if (d.menopausiaTardia) f.push('Menopausia después de los cincuenta y cinco años.');
  if (d.densidadAlta) f.push('Mama densa en la mastografía.');
  if (d.biopsiaPreviaSinAtipia) f.push('Biopsia previa sin atipia.');
  return f;
}

export function evaluarMama(paciente, datos) {
  const d = { ...datos, edad: paciente.demografia.edad };
  const altoRiesgo = criteriosAltoRiesgo(d);
  const histFamiliar = señalesHistoriaFamiliar(d);
  const genetica = criteriosGenetica(d);
  const moduladores = factoresModuladores(d);

  let categoria, etiqueta, estado;
  if (altoRiesgo.length > 0) {
    categoria = 'alto';
    etiqueta = 'Alto riesgo';
    estado = 'alerta';
  } else if (histFamiliar.length > 0) {
    categoria = 'estimar';
    etiqueta = 'Estimar riesgo de por vida';
    estado = 'aviso';
  } else if (moduladores.length >= 2) {
    categoria = 'intermedio';
    etiqueta = 'Riesgo por encima del promedio';
    estado = 'aviso';
  } else {
    categoria = 'promedio';
    etiqueta = 'Riesgo promedio';
    estado = 'ok';
  }

  const tamizaje = orientacionTamizaje(categoria, d);
  const prevencion = orientacionPrevencion(d, categoria);
  const hojaPaciente = construirHojaPaciente(paciente, categoria);
  return { categoria, etiqueta, estado, altoRiesgo, histFamiliar, genetica, moduladores, tamizaje, prevencion, hojaPaciente };
}

function orientacionTamizaje(categoria, d) {
  const t = [];
  if (categoria === 'alto') {
    t.push('Mastografía anual y resonancia magnética mamaria anual, idealmente alternadas cada seis meses.');
    t.push('Examen clínico mamario cada seis a doce meses.');
    t.push('En antecedente familiar, iniciar diez años antes de la edad del caso más joven de la familia, sin comenzar la resonancia antes de los veinticinco a treinta años.');
  } else if (categoria === 'estimar') {
    t.push('Calcular el riesgo de por vida con un modelo basado en historia familiar, como el Tyrer-Cuzick.');
    t.push('Si el riesgo de por vida es del veinte por ciento o más, añadir resonancia magnética anual a la mastografía.');
    t.push('Mientras tanto, mantener la mastografía según la edad y el examen clínico.');
  } else if (categoria === 'intermedio') {
    t.push('Mastografía según la edad; valorar resonancia complementaria si la mama es densa o el riesgo resulta limítrofe.');
    t.push('Considerar estimar el riesgo a cinco años para afinar la conducta.');
  } else {
    t.push('Mastografía de tamizaje según la edad y el examen clínico habitual.');
  }
  return t;
}

function orientacionPrevencion(d, categoria) {
  const p = [];
  if (d.hiperplasiaAtipica || d.carcinomaLobulillarInSitu) {
    p.push('La hiperplasia atípica y el carcinoma lobulillar in situ se benefician de tratamiento de reducción de riesgo con un modulador selectivo del receptor estrogénico o un inhibidor de la aromatasa, según el estado menopáusico.');
  }
  if (categoria === 'alto' || categoria === 'estimar') {
    p.push('Valorar el tratamiento de reducción de riesgo cuando el riesgo a cinco años es elevado (referencia del uno punto sesenta y seis por ciento o más del Breast Cancer Risk Assessment Tool).');
  }
  p.push('Reforzar las medidas de estilo de vida: peso saludable, actividad física, moderar el alcohol.');
  return p;
}

function construirHojaPaciente(p, categoria) {
  const reco = {
    alto: [
      'Tu perfil indica un riesgo mayor al promedio, por lo que conviene un seguimiento más cercano de tus mamas.',
      'El plan puede incluir estudios adicionales a la mastografía y la valoración de medidas de prevención; lo definiremos en consulta.',
    ],
    estimar: [
      'Tu historia familiar amerita calcular tu riesgo con una herramienta específica para decidir el mejor seguimiento.',
      'Según ese resultado, podríamos añadir estudios a la mastografía habitual.',
    ],
    intermedio: [
      'Tienes algunos factores que conviene tener en cuenta para personalizar tu seguimiento.',
    ],
    promedio: [
      'Tu perfil corresponde a un riesgo promedio; mantén tu tamizaje según tu edad.',
    ],
  };
  return {
    identificacion: { nombre: p.demografia.nombre, edad: p.demografia.edad },
    titulo: 'Tu evaluación de salud mamaria',
    intro: 'Este es el resumen de tu evaluación de hoy. Sirve para decidir juntos el seguimiento más adecuado para ti.',
    secciones: [],
    recomendaciones: [
      ...(reco[categoria] || reco.promedio),
      'Conoce tus mamas y consulta sin demora si notas un cambio, un bulto, hundimiento de la piel o secreción.',
      'Mantén un peso saludable, actividad física regular y modera el alcohol; ayudan a cuidar tu salud mamaria.',
    ],
    pie: 'Documento informativo para la paciente. La indicación final corresponde a tu médico. Hoja emitida por el consultorio del Dr. Iván Jiménez Martínez.',
  };
}
