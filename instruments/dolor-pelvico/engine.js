/**
 * Lógica clínica del instrumento de Dolor Pélvico Crónico. Funciones puras.
 *
 * Base: artículo de evaluación y tratamiento del dolor pélvico crónico,
 * Obstetrics and Gynecology, enero de 2026, y Boletín de Práctica de ACOG. El
 * dolor pélvico crónico no es una enfermedad única sino un síntoma con causas
 * múltiples y a menudo coexistentes; se aborda por sistemas (ginecológico,
 * urológico, gastrointestinal, musculoesquelético, neurológico y vascular),
 * reconociendo la sensibilización central como mecanismo que perpetúa el dolor.
 *
 * Cubre adultas y adolescentes. Instrumento de apoyo a la decisión.
 */

const v = (x) => x !== null && x !== undefined && !isNaN(x);

// Definición de pistas por sistema: cada sistema reúne los datos que lo sugieren.
const SISTEMAS = [
  { id: 'ginecologico', nombre: 'Ginecológico', pistas: {
    gin_ciclico: 'dolor ligado a la menstruación (orienta a endometriosis o adenomiosis)',
    gin_dispareunia: 'dispareunia profunda',
    gin_sangradoAnormal: 'sangrado uterino anormal asociado',
  } },
  { id: 'urologico', nombre: 'Urológico', pistas: {
    uro_dolorVesical: 'dolor vesical que mejora al vaciar (orienta a cistitis intersticial o síndrome de vejiga dolorosa)',
    uro_urgenciaDisuria: 'urgencia o disuria sin infección',
    uro_polaquiuria: 'polaquiuria',
  } },
  { id: 'gastrointestinal', nombre: 'Gastrointestinal', pistas: {
    gi_cambiaDefecacion: 'dolor que cambia con la defecación (orienta a síndrome de intestino irritable)',
    gi_distension: 'distensión abdominal',
    gi_habitoAlterado: 'cambio del hábito intestinal',
  } },
  { id: 'musculoesqueletico', nombre: 'Musculoesquelético', pistas: {
    mus_sensibilidadPiso: 'sensibilidad del piso pélvico a la exploración',
    mus_posturaActividad: 'dolor que cambia con la postura o la actividad',
    mus_puntosGatillo: 'puntos gatillo miofasciales',
  } },
  { id: 'neurologico', nombre: 'Neurológico', pistas: {
    neu_ardorElectrico: 'dolor ardoroso, eléctrico o en choque (orienta a compresión o atrapamiento nervioso)',
    neu_dermatomica: 'distribución por un territorio nervioso',
    neu_alodinia: 'alodinia (dolor al tacto leve)',
  } },
  { id: 'vascular', nombre: 'Vascular', pistas: {
    vas_empeoraDePie: 'dolor que empeora al estar de pie y al final del día (orienta a congestión venosa pélvica)',
    vas_varices: 'várices pélvicas o vulvares',
  } },
];

/** Caracterización del dolor. */
export function caracterizarDolor(d) {
  const cronico = v(d.duracionMeses) && d.duracionMeses >= 6;
  let patronTxt = '';
  if (d.patron === 'ciclico') patronTxt = 'cíclico';
  else if (d.patron === 'constante') patronTxt = 'constante';
  else if (d.patron === 'intermitente') patronTxt = 'intermitente';
  return {
    cronico,
    duracionMeses: d.duracionMeses,
    intensidad: d.intensidadEVA,
    patron: patronTxt,
    nota: v(d.duracionMeses)
      ? (cronico ? 'Cumple el criterio temporal de dolor pélvico crónico (seis meses o más).' : 'Aún no alcanza los seis meses; vigilar evolución, ya que la persistencia favorece la cronificación.')
      : 'Duración no capturada.',
  };
}

/** Diagnóstico diferencial por sistemas: lista priorizada según las pistas marcadas. */
export function evaluarSistemas(d) {
  const resultado = SISTEMAS.map((s) => {
    const presentes = Object.keys(s.pistas).filter((k) => d[k]).map((k) => s.pistas[k]);
    return { id: s.id, nombre: s.nombre, n: presentes.length, pistas: presentes };
  }).filter((s) => s.n > 0);
  resultado.sort((a, b) => b.n - a.n);
  return resultado;
}

/** Sensibilización central: mecanismo de amplificación del dolor. */
export function evaluarSensibilizacionCentral(d, sistemas) {
  const datos = [];
  if (d.sc_desproporcionado) datos.push('dolor desproporcionado a los hallazgos');
  if (d.neu_alodinia) datos.push('alodinia');
  if (d.sc_multiplesSindromes) datos.push('coexistencia de varios síndromes de dolor');
  if (d.sc_generalizado) datos.push('dolor generalizado más allá de la pelvis');
  // Varios sistemas implicados también apoya un componente central.
  const variosSistemas = sistemas.length >= 3;
  const presente = datos.length >= 2 || (datos.length >= 1 && variosSistemas);
  return {
    presente,
    sospechada: !presente && (datos.length === 1 || variosSistemas),
    datos,
    nota: presente
      ? 'Datos de sensibilización central: el manejo debe ser multimodal, pues es improbable que el dolor ceda con una sola intervención.'
      : (datos.length || variosSistemas ? 'Posible componente de sensibilización central; tenerlo presente en el plan.' : ''),
  };
}

/** Banderas de alarma. */
export function evaluarBanderas(d) {
  const b = [];
  if (d.ba_sangradoPosmenopausico) b.push('Sangrado posmenopáusico: descartar neoplasia endometrial.');
  if (d.ba_sangradoPoscoital) b.push('Sangrado poscoital: valorar el cuello uterino y descartar neoplasia cervical.');
  if (d.ba_perdidaPeso) b.push('Pérdida de peso no intencional: descartar enfermedad maligna o sistémica.');
  if (d.ba_sangradoRectal) b.push('Sangrado rectal: estudio gastrointestinal dirigido.');
  if (d.ba_hematuria) b.push('Hematuria: estudio urológico; la cistoscopia se justifica.');
  if (d.ba_masa) b.push('Masa pélvica palpable: caracterizar con imagen.');
  if (d.ba_fiebre) b.push('Fiebre: descartar proceso infeccioso o inflamatorio agudo.');
  return b;
}

/** Orientación a estudio: dirigida por la presentación, no de rutina. */
export function orientacionEstudio(d, sistemas, banderas) {
  const e = [];
  e.push('Los estudios de laboratorio e imagen se solicitan solo cuando la presentación los sugiere, no de rutina.');
  const tiene = (id) => sistemas.some((s) => s.id === id);
  if (tiene('ginecologico')) e.push('Ecografía transvaginal ante sospecha ginecológica; estudio dirigido a endometriosis o adenomiosis si el dolor es cíclico.');
  if (tiene('urologico')) e.push('Análisis de orina y cultivo; el diagnóstico de cistitis intersticial o síndrome de vejiga dolorosa es clínico. Reservar cistoscopia para hematuria, diagnóstico incierto o riesgo de malignidad, y considerar derivación a urología.');
  if (tiene('gastrointestinal')) e.push('Valorar criterios de síndrome de intestino irritable; derivación a gastroenterología según hallazgos.');
  if (tiene('musculoesqueletico')) e.push('Exploración del piso pélvico en busca de hipertonía y puntos gatillo; derivación a fisioterapia de piso pélvico.');
  if (tiene('neurologico')) e.push('Mapear el territorio del dolor; valorar bloqueo diagnóstico o derivación a clínica del dolor ante sospecha de atrapamiento nervioso.');
  if (tiene('vascular')) e.push('Ante sospecha de congestión venosa pélvica, imagen vascular dirigida tras excluir otras causas.');
  if (banderas.length) e.push('Atender primero las banderas de alarma con el estudio correspondiente.');
  return e;
}

/** Orientación a tratamiento multimodal. */
export function orientacionTratamiento(d, sistemas, central) {
  const bloques = [];
  bloques.push({
    titulo: 'Pilares del manejo',
    recomendaciones: [
      'Educación sobre la fisiología del dolor, explicando la interacción entre la causa periférica y la amplificación central; mejora la adherencia y los resultados.',
      'Tratar los generadores de dolor identificados en cada sistema.',
      'Atender la comorbilidad emocional: el manejo del ánimo y la ansiedad es parte esencial del tratamiento, no un añadido.',
    ],
  });

  const noFarmacologico = ['Fisioterapia de piso pélvico, en especial si hay hipertonía o puntos gatillo.', 'Terapia cognitivo-conductual y, cuando corresponda, terapia sexual; solas o combinadas.'];
  bloques.push({ titulo: 'No farmacológico', recomendaciones: noFarmacologico });

  const farmacologico = ['Analgesia escalonada según el mecanismo del dolor.'];
  if (central.presente || sistemas.some((s) => s.id === 'neurologico')) {
    farmacologico.push('Para dolor con componente neuropático o central, neuromoduladores extrapolados de otros dolores crónicos: antidepresivos tricíclicos, inhibidores de la recaptación de serotonina y noradrenalina, o gabapentinoides.');
  }
  const tiene = (id) => sistemas.some((s) => s.id === id);
  if (tiene('ginecologico')) farmacologico.push('Tratamiento hormonal si predomina el componente ginecológico cíclico.');
  bloques.push({ titulo: 'Farmacológico', recomendaciones: farmacologico });

  bloques.push({
    titulo: 'Modelo de atención',
    recomendaciones: [
      'Atención interdisciplinaria: la sensibilización central hace improbable la resolución con una sola intervención. Coordinar a los especialistas que correspondan y dar seguimiento con una escala de intensidad para medir la respuesta.',
      ...(d.poblacion === 'adolescente'
        ? ['En la adolescente, considerar el impacto en la vida escolar y el desarrollo; preferir abordajes conservadores y reservar los estudios invasivos para cuando estén claramente indicados.']
        : []),
    ],
  });
  return bloques;
}

/** Evaluación completa. Punto de entrada del motor. */
export function evaluarDpc(paciente, datos) {
  const d = { ...datos };
  const dolor = caracterizarDolor(d);
  const sistemas = evaluarSistemas(d);
  const central = evaluarSensibilizacionCentral(d, sistemas);
  const banderas = evaluarBanderas(d);
  const estudio = orientacionEstudio(d, sistemas, banderas);
  const tratamiento = orientacionTratamiento(d, sistemas, central);
  const hojaPaciente = construirHojaPaciente(paciente, d, dolor);
  return { dolor, sistemas, central, banderas, estudio, tratamiento, hojaPaciente };
}

function construirHojaPaciente(p, d, dolor) {
  const filas = [];
  if (v(d.intensidadEVA)) filas.push({ parametro: 'Intensidad del dolor', valor: d.intensidadEVA, unidad: 'de 10', meta: 'Seguimiento para medir mejora', ok: d.intensidadEVA <= 3 });
  if (v(d.duracionMeses)) filas.push({ parametro: 'Tiempo con dolor', valor: d.duracionMeses, unidad: 'meses', meta: '', ok: true });

  return {
    identificacion: { nombre: p.demografia.nombre, edad: p.demografia.edad },
    titulo: 'Resumen de tu evaluación',
    intro: 'Este es el registro de tu dolor de hoy. Llévalo a tu seguimiento para ver tu evolución y ajustar el plan.',
    secciones: filas.length ? [{ titulo: 'Tu dolor', filas }] : [],
    recomendaciones: [
      'El dolor pélvico que dura suele tener más de una causa; por eso el tratamiento combina varias medidas y no una sola.',
      'Lleva un registro de tu dolor, del cero al diez, y de qué lo mejora o empeora, para afinar el manejo en cada consulta.',
      'Medidas como la fisioterapia de piso pélvico y el cuidado de tu bienestar emocional son parte del tratamiento, no algo aparte.',
      'Date el tiempo para mejorar; el manejo del dolor crónico es un proceso y los avances suelen ser graduales.',
    ],
    pie: 'Documento informativo para la paciente. Su interpretación corresponde a tu médico. Hoja emitida por el consultorio del Dr. Iván Jiménez Martínez.',
  };
}
