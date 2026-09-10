/**
 * Lectura pura del sobre de CONTRATO-PRECONSULTA.md, versiones 1-3.
 * Catalogos: Respuestas.jsx (HC_LABEL / CODIGO_LABEL).
 * Entrevista: core/entrevista.js (resumenEntrevista / valorEntrevista).
 * Ramas y MRS: core/preconsultaFlow.js (filtrarHistoriaActiva / MRS_IDS).
 * Alertas: ruteoClinico.banderas y alertaSeguridad GUARDADAS por
 * paciente/PortalPaciente.jsx (construirRegistro); no invoca motores clinicos.
 * API: etiquetaCampo, formatoRespuesta, gruposHistoria, resumenLectura,
 * filtrarRespuestas. Prueba local: node tests/lectura-respuesta.mjs.
 */
import { CAMPOS_ENTREVISTA, resumenEntrevista, valorEntrevista } from './entrevista.js';
import { MRS_IDS } from './preconsultaFlow.js';
import { PREGUNTAS as PREGUNTAS_DOLOR } from './profundos/dolorPelvico.js';

const HC_LABEL = {
  motivo: 'Motivo de la visita', edadMenarca: 'Edad de la primera regla', embarazos: 'Embarazos',
  temasConsulta: 'Temas elegidos', formularioVersion: 'Versi\u00f3n del formulario',
  etapaReproductiva: 'Etapa reproductiva', ultimaMenstruacion: '\u00daltima menstruaci\u00f3n',
  posibleEmbarazo: 'Posibilidad de embarazo', senalesUrgencia: 'Se\u00f1ales de alarma reportadas',
  senalesMaternas: 'Se\u00f1ales de alarma de embarazo o posparto',
  semanasEmbarazo: 'Semanas de embarazo', semanasPosparto: 'Semanas desde el parto',
  lactancia: 'Lactancia actual',
  sangradoTipos: 'Caracter\u00edsticas del sangrado', sangradoAhora: 'Sangrado actual',
  sangradoDuracionDias: 'Duraci\u00f3n habitual del sangrado (d\u00edas)', sangradoDesde: 'Cambio de sangrado desde',
  diasEntreReglas: 'D\u00edas entre menstruaciones', cambiosAndrogenicos: 'Cambios de piel, vello o cabello',
  sintomasUrinarios: 'S\u00edntomas urinarios', urinarioDetalle: 'Detalle urinario', escapesOrina: 'Escapes de orina',
  molestiasIntimas: 'Temas de salud \u00edntima', sintomasMama: 'S\u00edntomas o cambios de mama',
  mamaDetalle: 'Detalle de mama', objetivoReproductivo: 'Objetivo reproductivo',
  mesesBuscandoEmbarazo: 'Meses buscando embarazo', antecedentesSeleccionados: 'Antecedentes declarados por la paciente',
  enfTrombosis: 'Trombosis o embolia', migranaAura: 'Migra\u00f1a con aura',
  enfHepatica: 'Enfermedad hep\u00e1tica', enfRenal: 'Enfermedad renal',
  cancerMamaPersonal: 'Antecedente personal de c\u00e1ncer de mama',
  cancerGinecologicoPersonal: 'Antecedente personal de c\u00e1ncer ginecol\u00f3gico',
  enfOsteoporosis: 'Osteoporosis o fractura por fragilidad', tabacoEstado: 'Tabaco',
  tieneCuelloUterino: 'Conserva cuello uterino', ultimoPapFecha: '\u00daltima prueba cervical',
  ultimoPapResultado: 'Resultado de prueba cervical', ultimaMastografiaFecha: '\u00daltima mastograf\u00eda',
  ultimaMastografiaResultado: 'Resultado de mastograf\u00eda', cancerFamiliarTipos: 'C\u00e1ncer familiar',
  cancerFamiliarDetalle: 'Detalle de c\u00e1ncer familiar',
  partos: 'Partos', cesareas: 'Ces\u00e1reas', abortos: 'P\u00e9rdidas o abortos', reglasRegulares: 'Reglas regulares',
  sangrado: 'Sangrado vaginal fuera de lo normal', anticonceptivo: 'M\u00e9todo anticonceptivo',
  ultimoPap: '\u00daltimo Papanicolaou', cirugiasGineco: 'Cirug\u00edas ginecol\u00f3gicas',
  acne: 'Acn\u00e9', hirsutismo: 'Aumento de vello', caidaCabello: 'Ca\u00edda de cabello',
  enfDiabetes: 'Diabetes', enfHipertension: 'Presi\u00f3n alta', enfTiroides: 'Problemas de tiroides',
  enfCorazon: 'Problemas del coraz\u00f3n', enfCancer: 'Antecedente de c\u00e1ncer', enfOtra: 'Otra enfermedad',
  cirugias: 'Otras cirug\u00edas', fuma: 'Fuma', alcohol: 'Bebe alcohol', medicamentos: 'Medicamentos', alergias: 'Alergias',
  famCancerMama: 'Familiar con c\u00e1ncer de mama', famCancerOvario: 'Familiar con c\u00e1ncer de ovario',
  famDiabetes: 'Familiar con diabetes', famHipertension: 'Familiar con presi\u00f3n alta',
  famOsteoporosis: 'Familiar con osteoporosis', famOtra: 'Otro antecedente familiar',
};

const CODIGO_LABEL = {
  control: 'Revisi\u00f3n ginecol\u00f3gica', sangrado: 'Sangrado', dolor: 'Dolor p\u00e9lvico',
  ciclos: 'Ciclos irregulares / andr\u00f3genos', climaterio: 'Climaterio',
  anticoncepcion: 'Anticoncepci\u00f3n', fertilidad: 'Fertilidad', embarazo: 'Embarazo / posparto',
  urinario: 'Salud urinaria', intimidad: 'Salud \u00edntima', mama: 'Salud mamaria',
  metabolico: 'Metabolismo', otro: 'Otro', menstrua_regular: 'Menstruaciones regulares',
  cervical: 'VPH y resultados cervicales', vulvar: 'Molestias vaginales y vulvares',
  'piso-pelvico': 'Piso p\u00e9lvico', sin_regla_12m: '12 meses o m\u00e1s sin regla; causa por confirmar',
  menstrua_irregular: 'Menstruaciones irregulares', sin_regla_menos_12m: 'Sin regla por menos de 12 meses',
  menopausia: 'Sin regla por 12 meses o m\u00e1s', posparto: 'Posparto / lactancia',
  histerectomia: 'Histerectom\u00eda', no_se: 'No sabe', no_aplica: 'No aplica',
  posible: 'Posible', confirmado: 'Confirmado', ninguna: 'Ninguna',
  prefiero_no: 'Prefiere no responder', actual: 'Actualmente', antes: 'Anteriormente',
  nunca: 'Nunca', normal: 'Normal', alterado: 'Alterado / seguimiento',
  seguimiento: 'Requiri\u00f3 seguimiento', evitar: 'Desea evitar embarazo',
  buscar_ahora: 'Busca embarazo ahora', buscar_despues: 'Desea embarazo despu\u00e9s',
  embarazada: 'Embarazada', no: 'No', si: 'S\u00ed',
  dolor_subito_intenso: 'Dolor s\u00fabito o muy intenso',
  sangrado_abundante: 'Sangrado abundante',
  desmayo_mareo: 'Desmayo, mareo intenso o debilidad',
  dolor_hombro: 'Dolor de hombro con dolor abdominal o sangrado',
  dificultad_respirar: 'Dificultad respiratoria o dolor tor\u00e1cico',
  fiebre_dolor: 'Fiebre con dolor p\u00e9lvico intenso',
  sangrado_embarazo: 'Sangrado mayor que manchado durante el embarazo',
  hemorragia_posparto: 'Hemorragia posparto',
  fiebre_materna: 'Fiebre de 38 \u00b0C o m\u00e1s en embarazo o posparto',
  cefalea_vision: 'Cefalea intensa o alteraciones visuales',
  movimiento_fetal_menos: 'Disminuci\u00f3n de movimientos fetales',
  salida_liquido: 'Salida de l\u00edquido durante el embarazo',
  hinchazon_extrema: 'Hinchaz\u00f3n marcada de cara o manos',
  pierna_unilateral: 'Dolor o hinchaz\u00f3n unilateral de pierna',
  ideas_dano: 'Pensamientos de da\u00f1o a s\u00ed misma o al beb\u00e9',
};

// Los mismos IDs significan cosas distintas segun la pregunta (p. ej. dolor/mama).
// Nunca se aplica este catalogo a texto libre. Opciones tomadas de PreConsulta.jsx.
const codigos = ids => Object.fromEntries(ids.map(id => [id, CODIGO_LABEL[id]]));
const OPCIONES_CAMPO = {
  temasConsulta: codigos(['control', 'sangrado', 'dolor', 'ciclos', 'climaterio', 'anticoncepcion', 'fertilidad', 'embarazo', 'urinario', 'intimidad', 'mama', 'metabolico', 'cervical', 'vulvar', 'piso-pelvico', 'otro']),
  etapaReproductiva: codigos(['menstrua_regular', 'menstrua_irregular', 'sin_regla_menos_12m', 'sin_regla_12m', 'menopausia', 'histerectomia', 'embarazada', 'posparto', 'no_se']),
  posibleEmbarazo: codigos(['no', 'posible', 'confirmado', 'no_se']),
  objetivoReproductivo: codigos(['evitar', 'buscar_ahora', 'buscar_despues', 'embarazada', 'no_aplica', 'prefiero_no']),
  reglasRegulares: codigos(['no_se', 'no_aplica']),
  sangradoAhora: codigos(['no_se']),
  tabacoEstado: codigos(['actual', 'antes', 'nunca', 'prefiero_no']),
  tieneCuelloUterino: codigos(['si', 'no', 'no_se']),
  ultimoPapResultado: codigos(['normal', 'alterado', 'no_se', 'nunca']),
  ultimaMastografiaResultado: codigos(['normal', 'seguimiento', 'no_se', 'nunca']),
  senalesUrgencia: codigos(['dolor_subito_intenso', 'sangrado_abundante', 'desmayo_mareo', 'dolor_hombro', 'dificultad_respirar', 'fiebre_dolor', 'ninguna']),
  senalesMaternas: codigos(['sangrado_embarazo', 'hemorragia_posparto', 'fiebre_materna', 'cefalea_vision', 'movimiento_fetal_menos', 'salida_liquido', 'hinchazon_extrema', 'pierna_unilateral', 'ideas_dano', 'ninguna']),
  sangradoTipos: {
    entre_periodos: 'Sangrado entre menstruaciones', despues_relaciones: 'Sangrado despu\u00e9s de relaciones sexuales',
    muy_abundante: 'M\u00e1s abundante de lo habitual', mas_7_dias: 'Dura m\u00e1s de 7 d\u00edas',
    ciclos_cortos_largos: 'Ciclos muy cortos, largos o impredecibles', despues_menopausia: 'Sangrado despu\u00e9s de 12 meses sin menstruar',
  },
  cambiosAndrogenicos: {
    acne: 'Acn\u00e9 o piel m\u00e1s grasa', hirsutismo: 'Aumento de vello en cara, pecho o abdomen',
    caidaCabello: 'Ca\u00edda o adelgazamiento del cabello', ninguna: 'Ninguno de estos',
  },
  sintomasUrinarios: {
    escapes: 'Escapes de orina', urgencia: 'Ganas s\u00fabitas o muy frecuentes de orinar',
    ardor: 'Ardor o dolor al orinar', sangre: 'Sangre visible en la orina',
    infecciones: 'Infecciones urinarias repetidas', ninguna: 'Ninguna actualmente',
  },
  molestiasIntimas: {
    sequedad: 'Sequedad, ardor o irritaci\u00f3n', dolor_relaciones: 'Dolor durante las relaciones',
    deseo: 'Cambios en el deseo o inter\u00e9s sexual', satisfaccion: 'Dificultad con excitaci\u00f3n, orgasmo o satisfacci\u00f3n',
    prefiero_no: 'Prefiero no responder aqu\u00ed; lo hablar\u00e9 en consulta',
  },
  sintomasMama: {
    bolita: 'Bolita o zona endurecida nueva', secrecion: 'Salida de l\u00edquido o sangre por el pez\u00f3n',
    piel_pezon: 'Cambio en la piel o en el pez\u00f3n', dolor: 'Dolor o sensibilidad persistente',
    ninguna: 'Ninguna molestia actual; es revisi\u00f3n preventiva',
  },
  antecedentesSeleccionados: {
    diabetes: 'Diabetes', hipertension: 'Presi\u00f3n alta', tiroides: 'Problemas de tiroides',
    corazon: 'Enfermedad del coraz\u00f3n o evento vascular cerebral', trombosis: 'Trombosis o embolia',
    'migra\u00f1a_aura': 'Migra\u00f1a con aura', hepatica: 'Enfermedad del h\u00edgado', renal: 'Enfermedad del ri\u00f1\u00f3n',
    cancer_mama: 'C\u00e1ncer de mama', cancer_ginecologico: 'C\u00e1ncer de \u00fatero, cuello uterino u ovario',
    osteoporosis: 'Osteoporosis o fractura por fragilidad', ninguna: 'Ninguna de estas',
  },
  cancerFamiliarTipos: {
    mama: 'C\u00e1ncer de mama', ovario: 'C\u00e1ncer de ovario', pancreas: 'C\u00e1ncer de p\u00e1ncreas',
    prostata: 'C\u00e1ncer de pr\u00f3stata', ninguna: 'Ninguno que yo sepa',
  },
  dolorInicio: { subito: 'De repente', gradual: 'Poco a poco', recurrente: 'Va y viene desde hace tiempo', no_se: 'No estoy segura' },
  dolorAsociados: {
    menstruacion: 'Durante la menstruaci\u00f3n', relaciones: 'Durante o despu\u00e9s de relaciones',
    orinar: 'Al orinar', evacuar: 'Al evacuar', nausea_vomito: 'Con n\u00e1usea o v\u00f3mito', ninguna: 'Ninguna de estas',
  },
  banderasDolor: Object.fromEntries(PREGUNTAS_DOLOR.find(q => q.id === 'banderas').opciones.map(o => [o.id, o.etiqueta])),
};

const GRUPOS = [
  { id: 'medicamentos-alergias', titulo: 'Medicamentos y alergias', campos: ['medicamentos', 'alergias'] },
  { id: 'antecedentes', titulo: 'Antecedentes personales', campos: [
    'antecedentesSeleccionados', 'enfDiabetes', 'enfHipertension', 'enfTiroides', 'enfCorazon',
    'enfTrombosis', 'migranaAura', 'enfHepatica', 'enfRenal', 'enfCancer', 'cancerMamaPersonal',
    'cancerGinecologicoPersonal', 'enfOsteoporosis', 'enfOtra', 'cirugiasGineco', 'cirugias',
    'tabacoEstado', 'fuma', 'alcohol',
  ] },
  { id: 'menstrual-reproductivo', titulo: 'Historia menstrual y reproductiva', campos: [
    'etapaReproductiva', 'edadMenarca', 'ultimaMenstruacion', 'reglasRegulares', 'diasEntreReglas',
    'sangrado', 'sangradoTipos', 'sangradoAhora', 'sangradoDuracionDias', 'sangradoDesde',
    'cambiosAndrogenicos', 'acne', 'hirsutismo', 'caidaCabello', 'embarazos', 'partos', 'cesareas',
    'abortos', 'anticonceptivo', 'objetivoReproductivo', 'mesesBuscandoEmbarazo', 'posibleEmbarazo',
    'semanasEmbarazo', 'semanasPosparto', 'lactancia',
  ] },
  { id: 'dolor', titulo: 'Dolor p\u00e9lvico', campos: [] },
  { id: 'tamizaje-mama', titulo: 'Tamizaje y mama', campos: [
    'tieneCuelloUterino', 'ultimoPap', 'ultimoPapFecha', 'ultimoPapResultado',
    'ultimaMastografiaFecha', 'ultimaMastografiaResultado', 'sintomasMama', 'mamaDetalle',
  ] },
  { id: 'familiar', titulo: 'Antecedentes familiares', campos: [
    'cancerFamiliarTipos', 'cancerFamiliarDetalle', 'famCancerMama', 'famCancerOvario',
    'famDiabetes', 'famHipertension', 'famOsteoporosis', 'famOtra',
  ] },
  { id: 'otros', titulo: 'Otros datos reportados', campos: [
    'senalesUrgencia', 'senalesMaternas', 'sintomasUrinarios', 'urinarioDetalle', 'escapesOrina', 'molestiasIntimas',
  ] },
];
const CAMPOS_AGRUPADOS = new Set(GRUPOS.flatMap(g => g.campos));
const OMITIDOS = new Set([
  'motivo', 'temasConsulta', 'telefono', 'correo', 'nombre', 'edad',
  'formularioVersion', 'entrevistaVersion', 'antecedentesRevisados',
  'version', 'id', 'creado', 'submittedAtClient', 'consentimiento', 'atribucion',
]);

const lista = v => Array.isArray(v) ? v : [];
const objeto = v => v !== null && typeof v === 'object' && !Array.isArray(v) ? v : {};
const comparar = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const legible = v => String(v ?? '').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();

export function etiquetaCampo(k) {
  if (Object.hasOwn(HC_LABEL, k)) return HC_LABEL[k];
  const pregunta = CAMPOS_ENTREVISTA.find(q => q.id === k);
  if (pregunta) return pregunta.etiqueta;
  const texto = legible(k);
  return texto ? texto[0].toUpperCase() + texto.slice(1) : 'Dato sin etiqueta';
}

/** Devuelve texto, nunca HTML. Vacio no equivale a No; objetos conservan sus datos. */
export function formatoRespuesta(v) {
  if (v == null) return '';
  if (v === true) return 'S\u00ed';
  if (v === false) return 'No';
  if (Array.isArray(v)) return v.map(formatoRespuesta).filter(s => s !== '').join(', ');
  if (typeof v === 'object') return Object.keys(v).sort(comparar).map(k => {
    const respuesta = formatoRespuesta(v[k]);
    return respuesta === '' ? '' : `${etiquetaCampo(k)}: ${respuesta}`;
  }).filter(s => s !== '').join('; ');
  const texto = String(v);
  return texto.trim() ? texto : '';
}

function formatoCampo(k, v) {
  const texto = formatoRespuesta(v);
  if (!texto) return '';
  const pregunta = CAMPOS_ENTREVISTA.find(q => q.id === k);
  if (pregunta && pregunta.tipo !== 'texto' && (typeof v === 'string' || Array.isArray(v))) return valorEntrevista(pregunta, v);
  const opciones = Object.hasOwn(OPCIONES_CAMPO, k) ? OPCIONES_CAMPO[k] : null;
  if (!opciones) return texto;
  const opcion = valor => {
    if (typeof valor !== 'string') return formatoRespuesta(valor);
    if (Object.hasOwn(opciones, valor)) return opciones[valor];
    return /^[a-zA-Z][a-zA-Z0-9]*(?:[_-][a-zA-Z0-9]+)+$/.test(valor) ? legible(valor) : valor;
  };
  return Array.isArray(v) ? v.map(opcion).filter(s => s !== '').join(', ') : opcion(v);
}

function falsoDeRamaOculta(k, v, hc) {
  // Evidencia: filtrarHistoriaActiva, version de entrevista actualmente guardada.
  // Sin version conocida o seleccion explicita, se conserva el negativo historico.
  if (v !== false || hc.entrevistaVersion !== '1.0.0' || !Array.isArray(hc.temasConsulta)) return false;
  if (['acne', 'hirsutismo', 'caidaCabello'].includes(k)) return !hc.temasConsulta.includes('ciclos');
  if (k === 'escapesOrina') return !hc.temasConsulta.includes('urinario');
  return k === 'sangrado' && !hc.temasConsulta.includes('sangrado')
    && Array.isArray(hc.senalesUrgencia) && !hc.senalesUrgencia.includes('sangrado_abundante');
}

/** Orden fijo. Segundo argumento opcional: autoReporte.dolor, para el grupo dolor. */
export function gruposHistoria(hc = {}, dolor = {}) {
  const historia = objeto(hc);
  const yaMostrados = new Set(resumenEntrevista(historia).flatMap(g => g.respuestas.map(r => r.id)));
  const desconocidos = Object.keys(historia).filter(k => !CAMPOS_AGRUPADOS.has(k)).sort(comparar);
  return GRUPOS.map(({ id, titulo, campos }) => {
    if (id === 'dolor') return { id, titulo, respuestas: respuestasDolor(dolor) };
    const claves = id === 'otros' ? [...campos, ...desconocidos] : campos;
    const respuestas = claves.filter(k => Object.hasOwn(historia, k) && !OMITIDOS.has(k)
      && !yaMostrados.has(k) && !falsoDeRamaOculta(k, historia[k], historia)).map(k => {
      // Una respuesta condicional historica no mostrada por la entrevista sigue visible.
      return { id: k, pregunta: etiquetaCampo(k), respuesta: formatoCampo(k, historia[k]) };
    }).filter(r => r.respuesta !== '');
    return { id, titulo, respuestas };
  }).filter(g => g.respuestas.length);
}

function respuestasDolor(valor) {
  const d = objeto(valor);
  const etiquetas = {
    tiene: 'Dolor reportado', intensidad: 'Intensidad en su peor momento (0 a 10)', inicio: '\u00bfC\u00f3mo comenz\u00f3?',
    meses: 'Tiempo con dolor (meses)', localizacion: '\u00bfEn qu\u00e9 parte lo sientes?', asociados: '\u00bfCu\u00e1ndo aparece o qu\u00e9 lo acompa\u00f1a?',
  };
  const campos = [...Object.keys(etiquetas), ...Object.keys(d).filter(k => !Object.hasOwn(etiquetas, k)).sort(comparar)];
  return campos.map(k => ({
    id: `dolor.${k}`, pregunta: Object.hasOwn(etiquetas, k) ? etiquetas[k] : etiquetaCampo(k),
    respuesta: k === 'intensidad' && d.tiene === true && !formatoRespuesta(d[k]) ? 'Intensidad no registrada'
      : formatoCampo(k === 'inicio' ? 'dolorInicio' : k === 'asociados' ? 'dolorAsociados' : k, d[k]),
  })).filter(r => r.respuesta !== '');
}

function lecturaDolor(r) {
  const ar = objeto(r.autoReporte);
  const guardado = objeto(r.resumen?.dolor);
  const d = ar.dolor == null && Object.keys(guardado).length
    ? { ...guardado, tiene: true } : objeto(ar.dolor);
  const intensidadValida = typeof d.intensidad === 'number' && Number.isFinite(d.intensidad)
    && d.intensidad >= 0 && d.intensidad <= 10;
  const meses = d.meses == null || d.meses === '' ? '' : ` Tiempo reportado: ${formatoRespuesta(d.meses)} meses.`;
  if (d.tiene === false && !intensidadValida) return { texto: `Dolor no se\u00f1alado en este formulario.${meses}`, pendiente: false };
  const presencia = d.tiene === true ? 'Dolor presente' : d.tiene === false
    ? 'Dolor no se\u00f1alado en este formulario' : 'Dolor no registrado';
  const intensidad = intensidadValida ? `intensidad ${d.intensidad}/10 en su peor momento` : 'intensidad no registrada';
  return { texto: `${presencia}; ${intensidad}.${meses}`, pendiente: !intensidadValida || d.tiene == null };
}

function lecturaMrs(datos) {
  const mrs = objeto(datos);
  const completos = MRS_IDS.filter(id => Number.isInteger(mrs[id]) && mrs[id] >= 0 && mrs[id] <= 4).length;
  const total = MRS_IDS.length;
  const puntaje = completos === total ? MRS_IDS.reduce((suma, id) => suma + mrs[id], 0) : null;
  const texto = puntaje == null
    ? `Escala MRS incompleta (${completos}/${total}); no equivale a ausencia de s\u00edntomas.`
    : puntaje === 0 ? 'MRS 0/44: sin s\u00edntomas en la escala contestada (11/11).'
      : `MRS ${puntaje}/44 (${completos}/${total} respuestas).`;
  return { completos, total, puntaje, texto };
}

function alertasGuardadas(r) {
  const hc = objeto(r.autoReporte?.hc);
  const seguridad = objeto(r.alertaSeguridad);
  const alertas = [];
  const agregar = (mensaje, fuente) => {
    if (!mensaje) return;
    const existente = alertas.find(a => a.mensaje === mensaje);
    if (!existente) alertas.push({ mensaje, fuente });
    else if (!existente.fuente.split(' | ').includes(fuente)) existente.fuente += ` | ${fuente}`;
  };
  for (const [valores, fuente, campo] of [
    [hc.senalesUrgencia, 'autoReporte.hc.senalesUrgencia', 'senalesUrgencia'],
    [hc.senalesMaternas, 'autoReporte.hc.senalesMaternas', 'senalesMaternas'],
    [seguridad.senales, 'alertaSeguridad.senales', 'senalesUrgencia'],
    [seguridad.senalesMaternas, 'alertaSeguridad.senalesMaternas', 'senalesMaternas'],
  ]) {
    for (const valor of lista(valores)) {
      if (typeof valor === 'string' && valor.trim() !== 'ninguna') agregar(formatoCampo(campo, valor), fuente);
    }
  }
  // Solo las opciones reportadas; no evaluar() ni depender de intensidades/dimensiones.
  for (const [profundos, prefijo] of [[r.autoReporte?.profundos, 'autoReporte.profundos'], [r.profundos, 'profundos']]) {
    for (const id of ['dolor-pelvico', 'dolorPelvico']) {
      for (const bandera of lista(profundos?.[id]?.banderas)) {
        if (typeof bandera === 'string' && !['b_ninguna', 'ninguna'].includes(bandera.trim())) {
          agregar(formatoCampo('banderasDolor', bandera), `${prefijo}.${id}.banderas`);
        }
      }
    }
  }
  for (const [campo, mensaje] of [
    ['urgente', 'Alerta de urgencia guardada en el env\u00edo.'],
    ['embarazoConSintomas', 'Alerta de embarazo con s\u00edntomas guardada en el env\u00edo.'],
    ['saludMental', 'Alerta de salud mental guardada en el env\u00edo.'],
  ]) {
    if (seguridad[campo] === true) agregar(mensaje, `alertaSeguridad.${campo}`);
  }
  for (const bandera of lista(r.ruteoClinico?.banderas)) {
    const mensaje = typeof bandera === 'string' ? bandera : bandera?.mensaje;
    if (typeof mensaje === 'string' && mensaje.trim()) agregar(mensaje, 'ruteoClinico.banderas');
  }
  return alertas;
}

/** MRS.total es el numero de reactivos (11); puntaje solo existe si los 11 son validos. */
export function resumenLectura(r = {}) {
  const registro = objeto(r);
  const hc = objeto(registro.autoReporte?.hc);
  const motivo = formatoRespuesta(hc.motivo);
  const temas = [...new Set(lista(hc.temasConsulta).map(v => formatoCampo('temasConsulta', v)).filter(Boolean))];
  const dolor = lecturaDolor(registro);
  const mrs = lecturaMrs(registro.autoReporte?.mrs);
  const rutaNueva = hc.entrevistaVersion === '1.0.0'
    || (hc.formularioVersion ?? registro.formularioVersion) === '2026.09.3';
  const escalaOmitida = rutaNueva && Array.isArray(hc.temasConsulta) && !hc.temasConsulta.includes('climaterio')
    && Object.keys(objeto(registro.autoReporte?.mrs)).length === 0;
  if (escalaOmitida) mrs.texto = 'Sin escala registrada (0/11).';
  const pendientes = [];
  if (!motivo) pendientes.push('Motivo no registrado.');
  if (dolor.pendiente) pendientes.push(dolor.texto);
  // Una MRS omitida por el recorrido adaptativo no es una tarea clinica pendiente.
  if (mrs.puntaje == null && !escalaOmitida) pendientes.push(mrs.texto);
  for (const p of lista(registro.resumen?.profundizaciones)) {
    if (p?.completo === false) pendientes.push(`${p.instrumento || p.id || 'Valoraci\u00f3n dirigida'}: incompleto.`);
  }
  return { motivo: motivo || 'No registrado', temas, dolor, mrs, alertas: alertasGuardadas(registro), pendientes: [...new Set(pendientes)] };
}

const normalizar = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
function coincide(r, busqueda) {
  const hc = objeto(r.autoReporte?.hc);
  const p = objeto(r.paciente);
  const campos = [p.nombre ?? hc.nombre, p.telefono ?? hc.telefono, p.correo ?? hc.correo, hc.motivo].map(normalizar);
  if (/^[+\d\s().-]+$/.test(busqueda)) {
    const digitos = busqueda.replace(/\D/g, '');
    if (digitos && campos[1].replace(/\D/g, '').includes(digitos)) return true;
  }
  return busqueda.split(/\s+/).every(palabra => campos.some(c => c.includes(palabra)));
}

/**
 * Filtros: todas, estudios, alertas. Orden: recientes, antiguos/antiguas, nombre.
 * Estudios solo detecta carpeta/manifest adjuntos, NO acredita existencia de archivos.
 * Fecha autoritativa creado; invalidas al final, empate por ID ascendente y posicion.
 * Opciones desconocidas equivalen a todas/recientes. Nunca ordena la lista recibida.
 */
export function filtrarRespuestas(respuestas, { busqueda = '', filtro = 'todas', orden = 'recientes' } = {}) {
  const consulta = normalizar(busqueda);
  const direccion = ['antiguos', 'antiguas'].includes(orden) ? 1 : -1;
  return lista(respuestas).filter(r => r && typeof r === 'object' && !Array.isArray(r)).map((r, indice) => ({
    r, indice, fecha: typeof r.creado === 'string' && r.creado.trim() ? Date.parse(r.creado) : NaN,
  })).filter(({ r }) => {
    if (consulta && !coincide(r, consulta)) return false;
    if (filtro === 'estudios') return (typeof r.estudiosFolder === 'string' && r.estudiosFolder.trim() !== '') || lista(r.adjuntos).length > 0;
    return filtro !== 'alertas' || alertasGuardadas(r).length > 0;
  }).sort((a, b) => {
    if (orden === 'nombre') {
      const nombreA = normalizar(a.r.paciente?.nombre ?? a.r.autoReporte?.hc?.nombre);
      const nombreB = normalizar(b.r.paciente?.nombre ?? b.r.autoReporte?.hc?.nombre);
      if (Boolean(nombreA) !== Boolean(nombreB)) return nombreA ? -1 : 1;
      const porNombre = comparar(nombreA, nombreB);
      if (porNombre) return porNombre;
    }
    const validaA = Number.isFinite(a.fecha);
    const validaB = Number.isFinite(b.fecha);
    if (validaA !== validaB) return validaA ? -1 : 1;
    if (validaA && a.fecha !== b.fecha) return direccion * (a.fecha - b.fecha);
    return comparar(String(a.r.id ?? ''), String(b.r.id ?? '')) || a.indice - b.indice;
  }).map(({ r }) => r);
}
