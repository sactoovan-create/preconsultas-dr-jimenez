/**
 * Motor de recomendaciones personalizadas para la paciente.
 *
 * Toma las respuestas de los cuestionarios y produce una hoja de recomendaciones
 * específica para cada paciente: solo aparecen los consejos que corresponden a los
 * síntomas que ella reportó, en lenguaje sencillo y cálido, sin tecnicismos. No es
 * contenido dirigido al médico; es orientación para la paciente.
 *
 * Diseñado para crecer: cada instrumento aporta su función de recomendaciones.
 */

const val = (d, k) => (d[k] !== null && d[k] !== undefined && !isNaN(d[k]) ? d[k] : 0);

/** Recomendaciones según los síntomas de la menopausia (Menopause Rating Scale). */
export function recomendacionesMenopausia(d) {
  const recs = [];
  const add = (tema, texto) => recs.push({ tema, texto });

  if (val(d, 'mrs_bochornos') >= 2) add('Bochornos y sudoraciones',
    'Vístete en capas que puedas quitarte con facilidad, mantén tu entorno fresco y ten agua a la mano. Identifica qué los dispara en tu caso, como las comidas muy condimentadas, el alcohol, las bebidas calientes o el estrés, y reduce esos desencadenantes. Si te afectan bastante, hay tratamientos muy eficaces que vemos juntos.');

  if (val(d, 'mrs_sueno') >= 2) add('Descanso y sueño',
    'Procura un horario regular para acostarte y levantarte, mantén la habitación fresca y oscura, evita las pantallas antes de dormir y reduce la cafeína y el alcohol por la tarde.');

  if (val(d, 'mrs_animo') >= 2) add('Estado de ánimo',
    'La actividad física regular, mantener contacto con las personas que te hacen bien y cuidar tu descanso ayudan mucho. Si la tristeza es intensa o no se va, no la cargues sola: hay apoyo y lo podemos abordar en tu consulta.');

  if (val(d, 'mrs_ansiedad') >= 2) add('Ansiedad y nerviosismo',
    'Las técnicas de respiración lenta, la relajación y el ejercicio regular ayudan a bajar la tensión. Si sientes que te rebasa, coméntalo para apoyarte.');

  if (val(d, 'mrs_irritable') >= 2) add('Irritabilidad',
    'Dormir bien y manejar el estrés con pausas, respiración o algo de actividad física hace una diferencia real en cómo te sientes durante el día.');

  if (val(d, 'mrs_agotamiento') >= 2) add('Energía y cansancio',
    'Equilibra los periodos de actividad con descanso, cuida tu sueño y reserva algún momento para ti en el día. El cansancio de esta etapa mejora cuando se atiende lo que lo alimenta, como el mal dormir.');

  if (val(d, 'mrs_musculo') >= 2) add('Músculos y articulaciones',
    'Mantén actividad física regular, con algo de fuerza y estiramiento. El movimiento constante suele aliviar estas molestias más que el reposo.');

  if (val(d, 'mrs_cardiaco') >= 2) add('Palpitaciones',
    'Sentir el corazón acelerado en esta etapa suele ser benigno, pero conviene que lo comentemos para revisarlo con calma. Reducir la cafeína ayuda.');

  if (val(d, 'mrs_sexual') >= 1) add('Vida sexual',
    'Los cambios en tu vida sexual son frecuentes en esta etapa y tienen solución. La comunicación con tu pareja y, si hay sequedad o molestia, los tratamientos locales ayudan mucho. Háblalo en tu consulta con confianza.');

  if (val(d, 'mrs_vejiga') >= 1) add('Salud urinaria',
    'Para las molestias al orinar o el control de la orina, cuidar los hábitos de vejiga y fortalecer el piso pélvico ayuda, y existen tratamientos efectivos. Cuéntame los detalles para orientarte mejor.');

  if (val(d, 'mrs_sequedad') >= 1) add('Sequedad vaginal',
    'Los hidratantes vaginales de uso regular y los lubricantes para la intimidad ayudan, y existen tratamientos locales muy efectivos. Es muy común y se trata bien; no hay por qué resignarse a la molestia.');

  if (recs.length === 0) add('Tus síntomas hoy',
    'Tus síntomas hoy son leves. Mantén tus hábitos saludables y comparte en tu consulta cualquier cambio que notes; estamos para acompañarte en esta etapa.');

  add('Cuidado general de esta etapa',
    'Mantén actividad física regular y una alimentación equilibrada, y cuida tus huesos con suficiente calcio y vitamina D. La menopausia tiene tratamientos eficaces; el objetivo es que vivas bien y cuides tu salud a largo plazo.');

  return recs;
}

/** Recomendaciones según el dolor pélvico reportado en la pre-consulta. */
export function recomendacionesDolor(autoReporte) {
  const dolor = autoReporte && autoReporte.dolor;
  if (!dolor || !dolor.tiene) return [];
  const i = dolor.intensidad;
  let texto;
  if (i != null && i >= 7) texto = 'El dolor que reportas es importante. Lo vamos a evaluar con detalle para encontrar su origen y darte alivio; trae cualquier estudio que tengas.';
  else if (i != null && i >= 4) texto = 'Tienes un dolor moderado. En tu consulta lo revisaremos para entender su causa y plantear cómo aliviarlo.';
  else texto = 'Registras un dolor leve. Lo tendremos en cuenta en tu evaluación; avísanos si cambia o aumenta.';
  return [{ tema: 'Dolor pélvico', texto }];
}

/** Reúne las recomendaciones personalizadas a partir de las respuestas. */
export function recomendacionesPaciente(d, autoReporte) {
  return [...recomendacionesMenopausia(d), ...recomendacionesDolor(autoReporte)];
}
