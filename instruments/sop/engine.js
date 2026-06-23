/**
 * Lógica clínica del instrumento de Síndrome Poliendocrino Metabólico Ovárico
 * (antes síndrome de ovario poliquístico). Funciones puras.
 *
 * Base: Guía internacional basada en evidencia 2023 (Teede y cols.; criterios de
 * Rotterdam actualizados a evidencia). El renombramiento de 2026 no modificó los
 * criterios. Cubre adultas y adolescentes, con sus reglas diferenciadas, e incluye
 * cribado de complicaciones y orientación a tratamiento por objetivo.
 *
 * Diagnóstico de exclusión: requiere descartar tiroides, prolactina e hiperplasia
 * suprarrenal congénita no clásica antes de confirmarlo.
 */

const v = (x) => x !== null && x !== undefined && !isNaN(x);
const TESTO_NG_ML_A_NMOL_L = 3.467; // testosterona total

/**
 * Clasifica el patrón menstrual como disfunción ovulatoria según años posmenarca.
 * Reglas 2023:
 *  - Primer año posmenarca: la irregularidad es transición puberal (no criterio).
 *  - 1 a <3 años: ciclos <21 o >45 días.
 *  - >3 años hasta perimenopausia (y adultas): ciclos <21 o >35 días, o <8 por año.
 *  - >1 año posmenarca: cualquier ciclo >90 días.
 *  - Amenorrea primaria a los 15 años o >3 años tras la telarca.
 */
export function clasificarCiclo(d) {
  const { longitudCiclo, aniosPosmenarca, menosDeOchoPorAnio, amenorrea, amenorreaPrimaria, cualquierCicloMayor90 } = d;
  const adolescente = d.poblacion === 'adolescente';
  const apm = aniosPosmenarca;

  if (amenorreaPrimaria) return { irregular: true, detalle: 'Amenorrea primaria.' };
  if (amenorrea) return { irregular: true, detalle: 'Amenorrea (ausencia de ciclos).' };

  // Tramo de transición puberal
  if (adolescente && v(apm) && apm < 1) {
    return { irregular: false, detalle: 'Primer año posmenarca: la irregularidad corresponde a la transición puberal, no es criterio.' };
  }
  if (cualquierCicloMayor90 && (!adolescente || (v(apm) && apm > 1))) {
    return { irregular: true, detalle: 'Al menos un ciclo mayor de noventa días.' };
  }

  // Tramo 1 a <3 años posmenarca
  if (adolescente && v(apm) && apm >= 1 && apm < 3) {
    const irr = v(longitudCiclo) && (longitudCiclo < 21 || longitudCiclo > 45);
    return { irregular: irr, detalle: irr ? 'Ciclos fuera de veintiuno a cuarenta y cinco días (uno a tres años posmenarca).' : 'Ciclos dentro de rango para el tramo de uno a tres años posmenarca.' };
  }

  // Más de 3 años posmenarca o adulta establecida
  const irr = (v(longitudCiclo) && (longitudCiclo < 21 || longitudCiclo > 35)) || menosDeOchoPorAnio;
  return { irregular: irr, detalle: irr ? 'Ciclos fuera de veintiuno a treinta y cinco días o menos de ocho por año.' : 'Ciclos regulares con los datos capturados.' };
}

/** Índice de andrógenos libres a partir de testosterona total (ng/mL) y SHBG (nmol/L). */
export function indiceAndrogenosLibres(testosteronaTotalNgMl, shbgNmolL) {
  if (!v(testosteronaTotalNgMl) || !v(shbgNmolL) || shbgNmolL === 0) return null;
  return (testosteronaTotalNgMl * TESTO_NG_ML_A_NMOL_L / shbgNmolL) * 100;
}

/**
 * Hiperandrogenismo clínico y bioquímico.
 * Clínico adultas: hirsutismo (Ferriman-Gallwey modificada, umbral configurable),
 * acné o alopecia androgénica. Clínico adolescentes: hirsutismo o acné moderado a
 * severo (no se usa alopecia). Bioquímico: lo confirma el médico según su ensayo;
 * el índice de andrógenos libres se calcula como apoyo (umbral ensayo-dependiente).
 */
export function evaluarHiperandrogenismo(d, umbralFG = 5) {
  const adolescente = d.poblacion === 'adolescente';
  const hirsutismo = v(d.hirsutismoFG) && d.hirsutismoFG >= umbralFG;
  const clinico = hirsutismo || !!d.acne || (!adolescente && !!d.alopecia);

  const ial = indiceAndrogenosLibres(d.testosteronaTotal, d.shbg);
  const bioquimico = d.hiperandrogenismoBioquimicoConfirmado === true;

  const partes = [];
  if (hirsutismo) partes.push('hirsutismo');
  if (d.acne) partes.push(adolescente ? 'acné moderado a severo' : 'acné');
  if (!adolescente && d.alopecia) partes.push('alopecia androgénica');
  if (bioquimico) partes.push('hiperandrogenemia bioquímica');

  return {
    clinico, bioquimico, presente: clinico || bioquimico, ial,
    detalle: partes.length ? partes.join(', ') + '.' : 'Sin datos de hiperandrogenismo con la información capturada.',
  };
}

/**
 * Morfología ovárica. Solo aplica en adultas con ocho o más años posmenarca.
 * Ecografía: veinte o más folículos en algún ovario o volumen ovárico de diez
 * mililitros o más. Alternativa en adultas: hormona antimülleriana elevada.
 */
export function evaluarMorfologia(d) {
  const adolescente = d.poblacion === 'adolescente';
  const dentro8 = v(d.aniosPosmenarca) && d.aniosPosmenarca < 8;
  if (adolescente || dentro8) {
    return { aplica: false, presente: false, detalle: 'No aplica: la morfología ovárica y la hormona antimülleriana no se usan dentro de los ocho años posmenarca.' };
  }
  const porEco = !!d.foliculos20 || !!d.volumenOvarico10;
  const porAmh = d.amhElevada === true;
  const presente = porEco || porAmh;
  const partes = [];
  if (porEco) partes.push('morfología poliquística por ecografía');
  if (porAmh) partes.push('hormona antimülleriana elevada');
  return { aplica: true, presente, detalle: partes.length ? partes.join(' y ') + '.' : 'Sin morfología poliquística documentada.' };
}

/** Exclusión de diagnósticos diferenciales y banderas de alarma. */
export function evaluarExclusiones(d) {
  const pendientes = [], alteradas = [], banderas = [];
  const revisar = (valor, nombre, alterado) => {
    if (valor === null || valor === undefined) pendientes.push(nombre);
    else if (alterado) alteradas.push(nombre);
  };
  revisar(d.tshNormal, 'función tiroidea', d.tshNormal === false);
  revisar(d.prolactinaNormal, 'prolactina', d.prolactinaNormal === false);
  revisar(d.hidroxiprogesteronaNormal, 'diecisiete hidroxiprogesterona (hiperplasia suprarrenal no clásica)', d.hidroxiprogesteronaNormal === false);

  if (d.inicioRapidoVirilizacion) banderas.push('Inicio rápido o virilización: descartar tumor secretor de andrógenos.');
  const ial = indiceAndrogenosLibres(d.testosteronaTotal, d.shbg);
  if (v(d.testosteronaTotal) && d.testosteronaTotal > 1.5) banderas.push('Testosterona total marcadamente elevada: descartar causa tumoral.');

  return { completas: pendientes.length === 0, pendientes, alteradas, banderas, ial };
}

/** Aplica los criterios diagnósticos según población. */
export function diagnosticar(d, hiper, ciclo, morfo, exclu) {
  const adolescente = d.poblacion === 'adolescente';
  const ha = hiper.presente, od = ciclo.irregular, pcom = morfo.presente;
  const criterios = { hiperandrogenismo: ha, disfuncionOvulatoria: od, morfologia: pcom };

  if (adolescente) {
    // Requiere ambos: irregularidad menstrual e hiperandrogenismo.
    if (ha && od) {
      if (exclu.alteradas.length) return { estado: 'diferencial', etiqueta: 'Revisar diagnóstico diferencial', criterios, detalle: 'Cumpliría criterios, pero hay un estudio de exclusión alterado: ' + exclu.alteradas.join(', ') + '.' };
      if (!exclu.completas) return { estado: 'requiere_exclusion', etiqueta: 'Cumple criterios, faltan exclusiones', criterios, detalle: 'Presenta irregularidad menstrual e hiperandrogenismo. Completar exclusiones: ' + exclu.pendientes.join(', ') + '.' };
      return { estado: 'cumple', etiqueta: 'Cumple criterios en la adolescencia', criterios, detalle: 'Irregularidad menstrual e hiperandrogenismo, con exclusiones completas.' };
    }
    if (ha || od) return { estado: 'en_riesgo', etiqueta: 'En riesgo, reevaluar', criterios, detalle: 'Presenta solo ' + (ha ? 'hiperandrogenismo' : 'irregularidad menstrual') + '. En la adolescencia se requieren ambos; etiquetar como en riesgo, tratar síntomas y reevaluar (ecografía posible solo después de ocho años posmenarca).' };
    return { estado: 'no_cumple', etiqueta: 'No cumple criterios', criterios, detalle: 'No reúne irregularidad menstrual ni hiperandrogenismo con los datos capturados.' };
  }

  // Adultas: dos de tres.
  const n = (ha ? 1 : 0) + (od ? 1 : 0) + (pcom ? 1 : 0);
  const cumpleCriterios = n >= 2;
  if (cumpleCriterios) {
    if (exclu.alteradas.length) return { estado: 'diferencial', etiqueta: 'Revisar diagnóstico diferencial', criterios, detalle: 'Cumpliría dos de tres criterios, pero hay un estudio de exclusión alterado: ' + exclu.alteradas.join(', ') + '.' };
    if (!exclu.completas) return { estado: 'requiere_exclusion', etiqueta: 'Cumple criterios, faltan exclusiones', criterios, detalle: 'Reúne dos de tres criterios. Completar exclusiones: ' + exclu.pendientes.join(', ') + '.' };
    const simplificado = (ha && od) ? ' El diagnóstico se simplifica: con irregularidad menstrual e hiperandrogenismo no se requiere ecografía ni hormona antimülleriana.' : '';
    return { estado: 'cumple', etiqueta: 'Cumple criterios', criterios, detalle: 'Reúne dos de tres criterios con exclusiones completas.' + simplificado };
  }
  return { estado: 'no_cumple', etiqueta: 'No cumple criterios', criterios, detalle: `Reúne ${n} de los tres criterios; se requieren dos.` };
}

/** Fenotipo de Rotterdam (solo si hay diagnóstico en adultas). */
export function determinarFenotipo(criterios) {
  const { hiperandrogenismo: ha, disfuncionOvulatoria: od, morfologia: pcom } = criterios;
  if (ha && od && pcom) return { letra: 'A', descripcion: 'Completo: hiperandrogenismo, disfunción ovulatoria y morfología poliquística.', riesgoMetabolico: 'alto' };
  if (ha && od) return { letra: 'B', descripcion: 'Hiperandrogenismo y disfunción ovulatoria.', riesgoMetabolico: 'alto' };
  if (ha && pcom) return { letra: 'C', descripcion: 'Hiperandrogenismo y morfología poliquística (ovulatorio).', riesgoMetabolico: 'intermedio' };
  if (od && pcom) return { letra: 'D', descripcion: 'Disfunción ovulatoria y morfología poliquística (sin hiperandrogenismo).', riesgoMetabolico: 'menor' };
  return null;
}

/** Cribado de complicaciones, leyendo el paciente compartido. */
export function evaluarCribado(p, d) {
  const items = [];
  const peso = p.signos.peso, talla = p.signos.talla;
  const imc = (v(peso) && v(talla)) ? peso / Math.pow(talla / 100, 2) : null;
  const estado = (hecho, alterado) => hecho ? (alterado ? 'alterado' : 'normal') : 'pendiente';

  const glu = p.labs.glu, hba1c = p.labs.hba1c;
  const disglucemia = (v(glu) && glu >= 100) || (v(hba1c) && hba1c >= 5.7);
  items.push({ nombre: 'Glucémico (curva de tolerancia oral a la glucosa preferida; glucosa u hemoglobina glucosilada como alternativa)', estado: estado(v(glu) || v(hba1c), disglucemia), hallazgo: disglucemia ? 'Disglucemia: glucosa o hemoglobina glucosilada en rango de alteración.' : '' });

  const dislip = (v(p.labs.tg) && p.labs.tg >= 150) || (v(p.labs.hdl) && p.labs.hdl < 50) || (v(p.labs.ct) && p.labs.ct >= 200);
  items.push({ nombre: 'Perfil lipídico', estado: estado(v(p.labs.tg) || v(p.labs.hdl) || v(p.labs.ct), dislip), hallazgo: dislip ? 'Dislipidemia con los valores capturados.' : '' });

  const hta = (v(p.signos.sistolica) && p.signos.sistolica >= 130) || (v(p.signos.diastolica) && p.signos.diastolica >= 85);
  items.push({ nombre: 'Presión arterial', estado: estado(v(p.signos.sistolica), hta), hallazgo: hta ? 'Presión elevada.' : '' });

  items.push({ nombre: 'Índice de masa corporal y circunferencia abdominal', estado: estado(v(imc), v(imc) && imc >= 25), hallazgo: (v(imc) && imc >= 25) ? `Índice de masa corporal ${imc.toFixed(1)}.` : '' });

  items.push({ nombre: 'Apnea obstructiva del sueño (cribar si hay síntomas)', estado: d.sintomasApnea ? 'alterado' : 'pendiente', hallazgo: d.sintomasApnea ? 'Síntomas sugestivos: considerar estudio del sueño.' : '' });
  items.push({ nombre: 'Ansiedad y depresión (cribado en toda paciente)', estado: d.tamizajeAnimoPositivo ? 'alterado' : 'pendiente', hallazgo: d.tamizajeAnimoPositivo ? 'Tamizaje positivo: valorar manejo o derivación.' : '' });

  return { items, imc, riesgoCardiometabolico: disglucemia || dislip || hta || (v(imc) && imc >= 25) };
}

/** Orientación a tratamiento por objetivo. */
export function orientacionTratamiento(d, fenotipo) {
  const adolescente = d.poblacion === 'adolescente';
  const lineas = [];
  lineas.push({
    objetivo: 'Base para toda paciente',
    recomendaciones: [
      'Estilo de vida como primera línea: actividad física regular y alimentación equilibrada, con manejo del peso cuando corresponda y atención al estigma de peso.',
      'Cribado y manejo de salud mental; abordar imagen corporal.',
    ],
  });
  const o = d.objetivos || {};
  if (o.regularizacion || o.hiperandrogenismo) {
    const rec = ['Anticonceptivos hormonales combinados como primera línea farmacológica para la irregularidad menstrual y el hiperandrogenismo.'];
    if (o.hiperandrogenismo) rec.push('Para hirsutismo que persiste tras seis meses, considerar antiandrógenos siempre con anticoncepción concomitante; medidas cosméticas como complemento.');
    lineas.push({ objetivo: 'Regularización menstrual e hiperandrogenismo', recomendaciones: rec });
  }
  if (o.metabolico) {
    const dosis = adolescente ? 'hasta dos gramos al día' : 'hasta dos y medio gramos al día';
    lineas.push({
      objetivo: 'Metabólico y peso',
      recomendaciones: [
        `Metformina como coadyuvante para indicaciones metabólicas, sola o sobre anticonceptivos (dosis máxima sugerida ${dosis}).`,
        'Para obesidad, considerar agonistas del receptor del péptido similar al glucagón tipo 1 junto con estilo de vida.',
      ],
    });
  }
  if (o.fertilidad) {
    lineas.push({
      objetivo: 'Fertilidad',
      recomendaciones: [
        adolescente
          ? 'El objetivo reproductivo no suele aplicar en la adolescencia; priorizar diagnóstico, estilo de vida y manejo de síntomas.'
          : 'Letrozol como primera línea para inducción de la ovulación. Alternativas según el caso: metformina coadyuvante, gonadotropinas o técnicas de reproducción asistida. Valorar derivación a biología de la reproducción.',
      ],
    });
  }
  return lineas;
}

/** Evaluación completa. Punto de entrada del motor. */
export function evaluarSop(paciente, datos) {
  const d = { ...datos };
  const ciclo = clasificarCiclo(d);
  const hiper = evaluarHiperandrogenismo(d);
  const morfo = evaluarMorfologia(d);
  const exclu = evaluarExclusiones(d);
  const diagnostico = diagnosticar(d, hiper, ciclo, morfo, exclu);
  const fenotipo = (diagnostico.estado === 'cumple' && d.poblacion !== 'adolescente')
    ? determinarFenotipo(diagnostico.criterios) : null;
  const cribado = evaluarCribado(paciente, d);
  const tratamiento = orientacionTratamiento(d, fenotipo);

  const hojaPaciente = construirHojaPaciente(paciente, cribado, diagnostico);

  return { ciclo, hiper, morfo, exclu, diagnostico, fenotipo, cribado, tratamiento, hojaPaciente };
}

function construirHojaPaciente(p, cribado, diagnostico) {
  const med = [], lab = [];
  const f = (parametro, valor, unidad, meta, ok) => ({ parametro, valor, unidad, meta, ok });
  const { sistolica, diastolica, circunferencia } = p.signos;
  const imc = cribado.imc;
  const { glu, hba1c, ct, hdl, tg } = p.labs;

  if (v(sistolica) && v(diastolica)) med.push(f('Presión arterial', `${sistolica}/${diastolica}`, 'mmHg', 'Meta: menor de 130/80', sistolica < 130 && diastolica < 80));
  if (v(imc)) med.push(f('Índice de masa corporal', imc.toFixed(1), 'kg/m²', 'Meta: 18.5 a 24.9', imc >= 18.5 && imc < 25));
  if (v(circunferencia)) med.push(f('Circunferencia abdominal', circunferencia, 'cm', 'Meta: menor de 80', circunferencia < 80));
  if (v(glu)) lab.push(f('Glucosa en ayuno', glu, 'mg/dL', 'Meta: menor de 100', glu < 100));
  if (v(hba1c)) lab.push(f('Hemoglobina glucosilada', hba1c, '%', 'Meta: menor de 5.7', hba1c < 5.7));
  if (v(ct)) lab.push(f('Colesterol total', ct, 'mg/dL', 'Meta: menor de 200', ct < 200));
  if (v(hdl)) lab.push(f('Colesterol de alta densidad', hdl, 'mg/dL', 'Meta: mayor de 50', hdl >= 50));
  if (v(tg)) lab.push(f('Triglicéridos', tg, 'mg/dL', 'Meta: menor de 150', tg < 150));

  return {
    identificacion: { nombre: p.demografia.nombre, edad: p.demografia.edad },
    titulo: 'Resumen de tu evaluación',
    intro: 'Este es el registro de tus mediciones y análisis de hoy. Llévalo a tu próxima consulta para dar seguimiento.',
    secciones: [
      { titulo: 'Tus mediciones', filas: med },
      { titulo: 'Tus análisis de laboratorio', filas: lab },
    ],
    recomendaciones: [
      'La actividad física regular y una alimentación equilibrada son la base del manejo y mejoran tanto los síntomas como la salud a largo plazo.',
      'Mantén un seguimiento periódico de tu peso, tu presión, tu glucosa y tus grasas en sangre.',
      'Si tienes dudas sobre menstruación, piel, peso o planes de embarazo, coméntalas en tu consulta para ajustar el plan a tus objetivos.',
      'Cuida tu bienestar emocional; pide apoyo si lo necesitas.',
    ],
    pie: 'Documento informativo para la paciente. Un valor fuera de meta no representa por sí solo un diagnóstico; su interpretación corresponde a tu médico. Hoja emitida por el consultorio del Dr. Iván Jiménez Martínez.',
  };
}
