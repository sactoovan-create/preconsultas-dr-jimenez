import { CAMPOS_ENTREVISTA, resumenEntrevista } from './entrevista.js';

export const PRECARGA_VERSION = '2.0.0';
export const numeroClinico = (v, min = 0, max = Infinity) => {
  if (v == null || typeof v === 'boolean' || (typeof v === 'string' && !v.trim())) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};
const booleano = v => typeof v === 'boolean' ? v : null;
const incluye = (v, id) => Array.isArray(v) && v.includes(id);
const mrsIds = ['bochornos', 'cardiaco', 'sueno', 'musculo', 'animo', 'irritable', 'ansiedad', 'agotamiento', 'sexual', 'vejiga', 'sequedad'].map(id => 'mrs_' + id);
const grupos = {
  menopausia: ['contexto', 'climaterio', 'intimidad', 'historia'],
  cardiometabolico: ['metabolico', 'historia'], sop: ['ciclos', 'metabolico', 'plan-reproductivo'],
  hemorragia: ['contexto', 'sangrado'], 'dolor-pelvico': ['dolor', 'piso-pelvico'],
  endometriosis: ['dolor', 'plan-reproductivo'], incontinencia: ['urinario', 'piso-pelvico'],
  mama: ['mama'], osea: ['osea', 'contexto'], anticoncepcion: ['plan-reproductivo', 'historia', 'contexto'],
};
export const PENDIENTES_CLINICOS = {
  menopausia: 'Confirmar causa de amenorrea, antecedentes y elegibilidad hormonal.',
  cardiometabolico: 'Medir presión, peso y talla; verificar lípidos y función renal antes de PREVENT.',
  sop: 'Verificar hiperandrogenismo, tiempo posmenarca y exclusión de otras causas. No inferir criterios por acné aislado.',
  hemorragia: 'Valorar estabilidad, hemoglobina e imagen o patología según el caso. Sangrar hoy no define episodio agudo.',
  'dolor-pelvico': 'Completar exploración y diagnóstico diferencial. Síntomas reportados no confirman su causa.',
  endometriosis: 'Completar exploración, imagen y estadificación. No se deduce estadio de la intensidad del dolor.',
  incontinencia: 'Precisar patrón de escape, análisis de orina y exploración. No transformar situaciones en frecuencias QUID.',
  mama: 'Corroborar parentesco, edades y reportes. Esta herramienta no calcula Tyrer-Cuzick.',
  osea: 'Verificar mecanismo de fractura, dosis de corticoide y densitometría. No se inventa T-score ni FRAX.',
  anticoncepcion: 'Completar elegibilidad médica, presión y preferencias. No inferir control de hipertensión o tipo de cáncer.',
};

/** Mapeos literales o conversiones declaradas, nunca extracción de texto libre. */
export function precargaInstrumento(id, paciente = {}) {
  const ar = paciente.autoReporte || {}, h = ar.hc || {}, dolor = ar.dolor || {}, prof = ar.profundos || {};
  const valores = {}, campos = [];
  const add = (destino, valor, fuente, etiqueta, transformacion = null) => {
    if (valor == null) return;
    valores[destino] = valor;
    campos.push({ destino, valor, fuente, etiqueta, transformacion });
  };
  const bool = (destino, origen, etiqueta) => add(destino, booleano(h[origen]), 'autoReporte.hc.' + origen, etiqueta);
  const num = (destino, origen, etiqueta, min = 0, max = Infinity) => add(destino, numeroClinico(h[origen], min, max), 'autoReporte.hc.' + origen, etiqueta);
  const tabaquismo = ['actual', 'antes', 'nunca'].includes(h.tabacoEstado) ? h.tabacoEstado === 'actual' : h.fuma === true ? true : null;
  const menopausia = h.causaAusenciaRegla === 'menopausia_confirmada';

  if (id === 'menopausia') {
    for (const key of mrsIds) {
      const n = numeroClinico(ar.mrs?.[key], 0, 4);
      if (Number.isInteger(n)) add(key, n, 'autoReporte.mrs.' + key, 'Síntoma MRS: ' + key.slice(4));
    }
    add('tabaquismo', tabaquismo, (h.tabacoEstado ? 'autoReporte.hc.tabacoEstado' : 'autoReporte.hc.fuma'), 'Tabaco actual');
    if (h.enfHipertension === true) add('hipertension', true, 'autoReporte.hc.enfHipertension', 'Hipertensión reportada');
  }
  if (id === 'hemorragia') {
    // La edad por sí sola no establece menopausia.
    if (menopausia) add('contexto', 'posmenopausica', 'autoReporte.hc.causaAusenciaRegla', 'Menopausia confirmada según autorreporte');
    num('duracionDias', 'sangradoDuracionDias', 'Duración del sangrado (días)', 1, 60);
    const intervalo = numeroClinico(h.sangradoIntervaloDias, 10, 180) ?? numeroClinico(h.diasEntreReglas, 10, 180);
    add('frecuenciaDias', intervalo, 'autoReporte.hc.' + (numeroClinico(h.sangradoIntervaloDias, 10, 180) != null ? 'sangradoIntervaloDias' : 'diasEntreReglas'), 'Intervalo entre menstruaciones (días)');
    bool('regular', 'reglasRegulares', 'Regularidad reportada');
    if (incluye(h.sangradoTipos, 'entre_periodos')) add('intermenstrual', true, 'autoReporte.hc.sangradoTipos', 'Sangrado entre periodos');
    if (incluye(h.sangradoTipos, 'muy_abundante')) add('volumen', 'abundante', 'autoReporte.hc.sangradoTipos', 'Volumen aumentado referido');
    bool('coag_menarcaAbundante', 'sangradoDesdeMenarca', 'Sangrado abundante desde menarca');
    for (const [src, dest, label] of [['dental', 'coag_dental', 'Sangrado dental'], ['cirugia', 'coag_quirurgico', 'Sangrado quirúrgico'], ['nariz', 'coag_epistaxis', 'Sangrado nasal'], ['moretones', 'coag_equimosis', 'Moretones']]) {
      if (incluye(h.sangradoOtrosSitios, src)) add(dest, true, 'autoReporte.hc.sangradoOtrosSitios', label);
    }
  }
  if (id === 'sop') {
    num('longitudCiclo', 'diasEntreReglas', 'Longitud del ciclo (días)', 10, 180);
    const ciclos = numeroClinico(h.reglasUltimoAnio, 0, 30);
    if (Number.isInteger(ciclos)) add('menosDeOchoPorAnio', ciclos < 8, 'autoReporte.hc.reglasUltimoAnio', 'Menos de 8 reglas en un año', 'Conteo reportado < 8');
    bool('cualquierCicloMayor90', 'cicloMayor90', 'Intervalo mayor de 90 días');
    // No convertir edad de menarca en años completos ni cambios rápidos en virilización diagnosticada.
  }
  if (['dolor-pelvico', 'endometriosis'].includes(id)) {
    const p = prof['dolor-pelvico'] || {};
    if (id === 'dolor-pelvico') {
      add('duracionMeses', numeroClinico(dolor.meses, 0, 600), 'autoReporte.dolor.meses', 'Duración del dolor (meses)');
      add('intensidadEVA', numeroClinico(dolor.intensidad, 0, 10), 'autoReporte.dolor.intensidad', 'Intensidad reportada /10');
      // Dolor fuera de la regla no significa dolor constante o intermitente.
      if (h.dolorRelacionCiclo === 'solo_regla') add('patron', 'ciclico', 'autoReporte.hc.dolorRelacionCiclo', 'Dolor solo con la menstruación');
      if (['solo_regla', 'empeora_regla'].includes(h.dolorRelacionCiclo) || incluye(dolor.asociados, 'menstruacion')) add('gin_ciclico', true, 'autoReporte.hc.dolorRelacionCiclo / autoReporte.dolor.asociados', 'Dolor ligado a la regla');
      bool('gin_dispareunia', 'dolorProfundoPenetracion', 'Dolor profundo con penetración');
      bool('uro_dolorVesical', 'dolorMejoraVaciar', 'Dolor vesical que mejora al vaciar');
      bool('mus_posturaActividad', 'dolorMovimiento', 'Relación con movimiento o postura');
      if (h.sangrado === true) add('gin_sangradoAnormal', true, 'autoReporte.hc.sangrado', 'Sangrado asociado');
    } else {
      bool('dispareunia', 'dolorProfundoPenetracion', 'Dolor profundo con penetración');
      bool('dischezia', 'dolorEvacuarCiclico', 'Dolor al evacuar relacionado con el ciclo');
      bool('sintomasUrinarios', 'dolorOrinarCiclico', 'Dolor urinario relacionado con el ciclo');
      const noMenstrual = numeroClinico(p.no_menstrual_int, 0, 10);
      if (noMenstrual != null) add('dolorPelvicoCronico', noMenstrual > 0, 'autoReporte.profundos.dolor-pelvico.no_menstrual_int', 'Dolor pélvico no menstrual', 'Presencia reportada, no confirma cronicidad');
      if (p.dispareunia_aplica === 1 && numeroClinico(p.dispareunia_int, 0, 10) != null && valores.dispareunia === undefined) add('dispareunia', Number(p.dispareunia_int) > 0, 'autoReporte.profundos.dolor-pelvico.dispareunia_int', 'Dolor profundo con penetración');
      if (['buscar_ahora', 'evitar'].includes(h.objetivoReproductivo)) add('objetivoFertilidad', h.objetivoReproductivo === 'buscar_ahora', 'autoReporte.hc.objetivoReproductivo', 'Objetivo reproductivo');
    }
  }
  if (id === 'incontinencia') {
    const p = prof.incontinencia || {};
    const f = numeroClinico(p.frecuencia, 0, 5), c = numeroClinico(p.cantidad, 0, 6), a = numeroClinico(p.afectacion, 0, 10);
    if (Number.isInteger(f)) {
      add('frecuenciaPerdida', f, 'autoReporte.profundos.incontinencia.frecuencia', 'Frecuencia de escapes');
      add('tieneEscapes', f > 0, 'autoReporte.profundos.incontinencia.frecuencia', 'Escapes referidos');
    } else if (incluye(h.sintomasUrinarios, 'escapes') || h.escapesOrina === true) add('tieneEscapes', true, 'autoReporte.hc.sintomasUrinarios', 'Escapes referidos');
    if ([0, 2, 4, 6].includes(c)) add('cantidadPerdida', c / 2, 'autoReporte.profundos.incontinencia.cantidad', 'Cantidad de escape', 'Ponderación 0/2/4/6 a índice 0/1/2/3');
    if (Number.isInteger(a)) add('impactoVida', a, 'autoReporte.profundos.incontinencia.afectacion', 'Impacto /10');
    bool('usaProteccion', 'urinarioProteccion', 'Usa protección');
    num('frecuenciaDiurna', 'miccionesDia', 'Micciones durante el día', 0, 40);
    num('nicturia', 'miccionesNoche', 'Despertares para orinar', 0, 15);
    if (incluye(h.sintomasUrinarios, 'sangre')) add('hematuria', true, 'autoReporte.hc.sintomasUrinarios', 'Sangre visible en orina reportada');
    if (incluye(h.urinarioVaciado, 'vaciado')) add('vaciamientoIncompleto', true, 'autoReporte.hc.urinarioVaciado', 'Sensación de vaciamiento incompleto');
  }
  if (id === 'mama') {
    for (const [d, src, label] of [
      ['familiarMamaMenor50', 'mamaFamiliarPrimerGradoMenor50', 'Primer grado, cáncer de mama antes de 50 años'],
      ['familiarMama2oMas', 'mamaDosFamiliares', 'Dos o más familiares con cáncer de mama'],
      ['familiarOvario', 'mamaFamiliarOvario', 'Cáncer de ovario familiar'],
      ['familiarMamaHombre', 'mamaFamiliarHombre', 'Cáncer de mama en familiar hombre'],
      ['mutacionConocida', 'mamaVarianteConfirmada', 'Variante genética reportada'],
    ]) bool(d, src, label);
  }
  if (id === 'osea') {
    if (menopausia) add('posmenopausica', true, 'autoReporte.hc.causaAusenciaRegla', 'Menopausia confirmada según autorreporte');
    add('tabaquismo', tabaquismo, (h.tabacoEstado ? 'autoReporte.hc.tabacoEstado' : 'autoReporte.hc.fuma'), 'Tabaco actual');
    for (const [d, src, label] of [
      ['fracturaFragilidad', 'fracturaBajoImpacto', 'Fractura con golpe leve reportada'],
      ['fracturaParental', 'fracturaCaderaProgenitor', 'Fractura de cadera en progenitor'],
      ['artritisReumatoide', 'artritisReumatoideConfirmada', 'Artritis reumatoide reportada'],
    ]) bool(d, src, label);
    if (h.fracturaBajoImpacto === true) bool('fracturaCaderaVertebra', 'fracturaCaderaVertebra', 'Sitio cadera o vértebra reportado');
    // Corticoides: falta dosis; no se marca el criterio FRAX por duración aislada.
  }
  if (id === 'anticoncepcion') {
    add('fuma', tabaquismo, (h.tabacoEstado ? 'autoReporte.hc.tabacoEstado' : 'autoReporte.hc.fuma'), 'Tabaco actual');
    const cig = numeroClinico(h.cigarrillosDia, 1, 100);
    if (tabaquismo === true && cig != null) add('fumaIntenso', cig >= 15, 'autoReporte.hc.cigarrillosDia', '15 cigarrillos o más al día', 'Conteo reportado >= 15');
    const condiciones = {};
    if (h.migranaAura === true) condiciones.migranaAura = true;
    if (h.enfTrombosis === true) condiciones.tevAntecedente = true;
    if (Object.keys(condiciones).length) add('condiciones', condiciones, 'autoReporte.hc.migranaAura / enfTrombosis', 'Antecedentes para elegibilidad');
  }
  const contexto = resumenEntrevista(h).filter(g => grupos[id]?.includes(g.id));
  const compartidos = (paciente.procedencia?.campos || []).filter(c => c.destino.startsWith('demografia.') || (
    ['cardiometabolico', 'menopausia', 'sop', 'anticoncepcion'].includes(id) && c.destino.startsWith('antecedentes.')));
  return { version: PRECARGA_VERSION, valores, campos, compartidos, contexto, pendiente: PENDIENTES_CLINICOS[id] || 'Completar valoración médica.' };
}

/** Conserva incluso null/false/0 guardados por el médico; no los rellena otra vez. */
export function combinarPrecarga(base, importado, guardado) {
  const merge = (a, b) => {
    const r = { ...a };
    for (const [k, v] of Object.entries(b || {})) r[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(a?.[k], v) : v;
    return r;
  };
  return merge(merge(base, importado), guardado);
}

export function etiquetaDatoOrigen(fuente) {
  const id = fuente.split('.').at(-1);
  return CAMPOS_ENTREVISTA.find(q => q.id === id)?.etiqueta || fuente;
}
