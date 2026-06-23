/**
 * Lógica del instrumento de Anticoncepción. Funciones puras.
 *
 * Base: Criterios médicos de elegibilidad para el uso de anticonceptivos,
 * Organización Mundial de la Salud, sexta edición (2025, revisión de 2024), y la
 * adaptación de los Centros para el Control y la Prevención de Enfermedades (2024).
 *
 * Cada par de condición y método se clasifica en cuatro categorías:
 *   1: sin restricción de uso.
 *   2: las ventajas generalmente superan los riesgos.
 *   3: los riesgos generalmente superan las ventajas (no recomendado salvo falta de alternativa).
 *   4: riesgo de salud inaceptable (no usar).
 *
 * Para cada método, manda la condición más restrictiva de las presentes. Se usan
 * las categorías de inicio del método; algunas condiciones suben en la continuación.
 *
 * Cubre adultas y adolescentes. Incluye la lactancia como condición. Instrumento
 * de apoyo a la decisión.
 */

export const METODOS = [
  { id: 'combinados', nombre: 'Anticonceptivos hormonales combinados', detalle: 'píldora, parche o anillo' },
  { id: 'progestina', nombre: 'Píldora de solo progestina', detalle: '' },
  { id: 'inyectable', nombre: 'Inyectable de progestina', detalle: 'acetato de medroxiprogesterona' },
  { id: 'implante', nombre: 'Implante subdérmico', detalle: '' },
  { id: 'diuHormonal', nombre: 'Dispositivo intrauterino de levonorgestrel', detalle: '' },
  { id: 'diuCobre', nombre: 'Dispositivo intrauterino de cobre', detalle: '' },
];

const C = (combinados, progestina, inyectable, implante, diuHormonal, diuCobre) => ({ combinados, progestina, inyectable, implante, diuHormonal, diuCobre });

// Matriz de condición por método. Categorías de inicio.
export const CONDICIONES = [
  // Cardiovascular
  { id: 'edad40', grupo: 'Cardiovascular', nombre: 'Edad de cuarenta años o más', cat: C(2, 1, 1, 1, 1, 1) },
  { id: 'tabacoMenor35', grupo: 'Cardiovascular', nombre: 'Tabaquismo, menor de treinta y cinco años', cat: C(2, 1, 1, 1, 1, 1) },
  { id: 'tabaco35menos', grupo: 'Cardiovascular', nombre: 'Tabaquismo, treinta y cinco años o más, menos de quince cigarrillos al día', cat: C(3, 1, 1, 1, 1, 1) },
  { id: 'tabaco35mas', grupo: 'Cardiovascular', nombre: 'Tabaquismo, treinta y cinco años o más, quince cigarrillos o más al día', cat: C(4, 1, 1, 1, 1, 1) },
  { id: 'htaControlada', grupo: 'Cardiovascular', nombre: 'Hipertensión controlada con tratamiento', cat: C(3, 1, 2, 1, 1, 1) },
  { id: 'htaModerada', grupo: 'Cardiovascular', nombre: 'Presión de ciento cuarenta a ciento cincuenta y nueve sobre noventa a noventa y nueve', cat: C(3, 1, 2, 1, 1, 1) },
  { id: 'htaSevera', grupo: 'Cardiovascular', nombre: 'Presión de ciento sesenta sobre cien o más', cat: C(4, 2, 3, 2, 2, 1) },
  { id: 'tevAntecedente', grupo: 'Cardiovascular', nombre: 'Tromboembolismo venoso, antecedente', cat: C(4, 2, 2, 2, 2, 1) },
  { id: 'tevAgudo', grupo: 'Cardiovascular', nombre: 'Tromboembolismo venoso agudo', cat: C(4, 3, 3, 3, 3, 1) },
  { id: 'trombofilia', grupo: 'Cardiovascular', nombre: 'Trombofilia conocida', cat: C(4, 2, 2, 2, 2, 1) },
  { id: 'cardiopatiaIsq', grupo: 'Cardiovascular', nombre: 'Cardiopatía isquémica, actual o antecedente', cat: C(4, 2, 3, 2, 2, 1) },
  { id: 'evc', grupo: 'Cardiovascular', nombre: 'Evento vascular cerebral', cat: C(4, 2, 3, 2, 2, 1) },
  { id: 'migranaAura', grupo: 'Cardiovascular', nombre: 'Migraña con aura, cualquier edad', cat: C(4, 2, 2, 2, 2, 1) },
  { id: 'migranaSinAura', grupo: 'Cardiovascular', nombre: 'Migraña sin aura', cat: C(2, 1, 2, 1, 1, 1) },
  { id: 'multiplesRcv', grupo: 'Cardiovascular', nombre: 'Múltiples factores de riesgo cardiovascular', cat: C(3, 2, 3, 2, 2, 1) },
  // Oncológico
  { id: 'cancerMamaActual', grupo: 'Oncológico', nombre: 'Cáncer de mama actual', cat: C(4, 4, 4, 4, 4, 1) },
  { id: 'cancerMamaPasado', grupo: 'Oncológico', nombre: 'Cáncer de mama, sin enfermedad por cinco años', cat: C(3, 3, 3, 3, 3, 1) },
  // Metabólico
  { id: 'diabetesComplic', grupo: 'Metabólico', nombre: 'Diabetes con complicación vascular o de larga evolución', cat: C(3, 2, 3, 2, 2, 1) },
  { id: 'diabetesSinComplic', grupo: 'Metabólico', nombre: 'Diabetes sin complicaciones', cat: C(2, 2, 2, 2, 2, 1) },
  { id: 'obesidad', grupo: 'Metabólico', nombre: 'Índice de masa corporal de treinta o más', cat: C(2, 1, 1, 1, 1, 1) },
  // Hepático y autoinmune
  { id: 'lupusAntifosf', grupo: 'Hepático y autoinmune', nombre: 'Lupus con anticuerpos antifosfolípidos positivos o desconocidos', cat: C(4, 3, 3, 3, 3, 1) },
  { id: 'cirrosisSevera', grupo: 'Hepático y autoinmune', nombre: 'Cirrosis descompensada', cat: C(4, 3, 3, 3, 3, 1) },
  { id: 'tumorHepatico', grupo: 'Hepático y autoinmune', nombre: 'Tumor hepático', cat: C(4, 3, 3, 3, 3, 1) },
  // Lactancia y ginecológico
  { id: 'lactanciaTemprana', grupo: 'Lactancia y ginecológico', nombre: 'Lactancia, menos de seis semanas posparto', cat: C(4, 1, 1, 1, 1, 1) },
  { id: 'lactanciaTardia', grupo: 'Lactancia y ginecológico', nombre: 'Lactancia, de seis semanas a seis meses', cat: C(3, 1, 1, 1, 1, 1) },
  { id: 'sangradoNoExpl', grupo: 'Lactancia y ginecológico', nombre: 'Sangrado vaginal no explicado, antes de evaluar', cat: C(2, 2, 3, 3, 4, 4) },
  // Interacciones y absorción
  { id: 'enzimaticos', grupo: 'Interacciones', nombre: 'Anticonvulsivantes inductores enzimáticos o rifampicina', cat: C(3, 3, 1, 2, 1, 1) },
  { id: 'bariatrica', grupo: 'Interacciones', nombre: 'Cirugía bariátrica con malabsorción', cat: C(3, 3, 1, 1, 1, 1) },
];

const RECOMENDACION = {
  1: 'Sin restricción',
  2: 'Generalmente apropiado',
  3: 'Generalmente no recomendado',
  4: 'No usar',
};

const v = (x) => x !== null && x !== undefined && !isNaN(x);

/**
 * Deriva condiciones automáticas a partir del paciente compartido (edad, presión,
 * índice de masa corporal, tabaquismo), para no recapturar lo ya conocido.
 */
export function condicionesAutomaticas(paciente, seleccion) {
  const auto = {};
  const dem = paciente.demografia, sig = paciente.signos, ant = paciente.antecedentes || {};
  const edad = dem.edad;
  // Tabaquismo según edad e intensidad declarada en la selección.
  if (seleccion.fuma) {
    if (v(edad) && edad >= 35) auto[seleccion.fumaIntenso ? 'tabaco35mas' : 'tabaco35menos'] = true;
    else auto.tabacoMenor35 = true;
  }
  if (v(edad) && edad >= 40) auto.edad40 = true;
  // Presión
  const s = sig.sistolica, d = sig.diastolica;
  if (v(s) && v(d)) {
    if (s >= 160 || d >= 100) auto.htaSevera = true;
    else if (s >= 140 || d >= 90) auto.htaModerada = true;
  }
  // Índice de masa corporal
  if (v(sig.peso) && v(sig.talla)) {
    const imc = sig.peso / Math.pow(sig.talla / 100, 2);
    if (imc >= 30) auto.obesidad = true;
  }
  return auto;
}

/** Evalúa la elegibilidad de cada método según las condiciones presentes. */
export function evaluarElegibilidad(condicionesPresentes) {
  const activas = CONDICIONES.filter((c) => condicionesPresentes[c.id]);
  const metodos = METODOS.map((m) => {
    let peor = 1;
    let causas = [];
    activas.forEach((c) => {
      const cat = c.cat[m.id];
      if (cat > peor) { peor = cat; causas = [c.nombre]; }
      else if (cat === peor && cat >= 3) causas.push(c.nombre);
    });
    return { id: m.id, nombre: m.nombre, detalle: m.detalle, categoria: peor, recomendacion: RECOMENDACION[peor], causas: peor >= 3 ? causas : [] };
  });
  metodos.sort((a, b) => a.categoria - b.categoria);
  return {
    metodos,
    preferibles: metodos.filter((m) => m.categoria <= 2),
    restringidos: metodos.filter((m) => m.categoria === 3),
    contraindicados: metodos.filter((m) => m.categoria === 4),
    nCondiciones: activas.length,
  };
}

/** Evaluación completa. Punto de entrada del motor. */
export function evaluarAnticoncepcion(paciente, datos) {
  const auto = condicionesAutomaticas(paciente, datos);
  const presentes = { ...auto, ...datos.condiciones };
  const elegibilidad = evaluarElegibilidad(presentes);
  const hojaPaciente = construirHojaPaciente(paciente, elegibilidad);
  return { elegibilidad, condicionesAuto: auto, presentes, hojaPaciente };
}

function construirHojaPaciente(p, elegibilidad) {
  const preferibles = elegibilidad.preferibles.map((m) => m.nombre);
  return {
    identificacion: { nombre: p.demografia.nombre, edad: p.demografia.edad },
    titulo: 'Opciones de anticoncepción para ti',
    intro: 'Con base en tus antecedentes, estas son las opciones que conviene considerar. La elección final la haremos juntos en consulta, según tus preferencias.',
    secciones: [],
    listas: preferibles.length
      ? [{ titulo: 'Métodos apropiados para tu caso', items: preferibles }]
      : [],
    recomendaciones: [
      'La mejor opción es la que se ajusta a tu salud y a tu estilo de vida, y la decidimos en conjunto.',
      'Si tienes dudas sobre cómo se usa un método, qué esperar los primeros meses o cómo cambiar de método, coméntalo con confianza.',
      'Ningún método protege frente a infecciones de transmisión sexual; para ello se usa además el preservativo.',
    ],
    pie: 'Documento informativo para la paciente. La indicación final corresponde a tu médico. Hoja emitida por el consultorio del Dr. Iván Jiménez Martínez.',
  };
}
