/**
 * Hoja clínica para el MÉDICO (distinta de la hoja de la paciente). Reúne en una
 * cuartilla lo que cada motor ya calcula y que la hoja de paciente omite a propósito:
 * estadio/diagnóstico, scores interpretados, conducta, derivación, fármacos, vía y
 * banderas de alarma. Para el expediente, no para entregar a la paciente.
 *
 * Cada instrumento aporta un "constructor" que devuelve { titulo, bloques } usando los
 * campos reales del objeto que devuelve su motor. El render es uniforme y escapa todo
 * valor dinámico con escaparHtml.
 */
import { escaparHtml } from './htmlSeguro.js';

const TONO = { ok: '#3A6B4C', aviso: '#C16A3A', alerta: '#B85042', neutro: 'rgba(31,58,46,.45)' };

const ANTECEDENTES = {
  cancerMama: 'Cáncer de mama', ecvEstablecida: 'Enfermedad cardiovascular establecida',
  tromboembolismo: 'Tromboembolismo / trombofilia', hepatica: 'Enfermedad hepática activa',
  sangradoNoDx: 'Sangrado vaginal no diagnosticado',
};

// ---------------------------------------------------------------- constructores

function bMenopausia(r, p) {
  const a = (p && p.antecedentes) || {};
  const mrs = r.mrs || {}, cand = r.candidatura || {}, via = r.via, gu = r.genitourinario || {};
  const nh = r.noHormonales, tipo = r.tipo || {};
  const bloques = [];

  if (tipo.etiqueta && tipo.determinado) bloques.push({ tipo: 'conclusion', encabezado: 'Diagnóstico', titular: tipo.etiqueta, detalle: tipo.nota || null, tono: (tipo.tipo === 'insuficiencia' || tipo.tipo === 'precoz') ? 'alerta' : 'neutro' });

  if (mrs.total != null && mrs.respondidos > 0) bloques.push({ tipo: 'tabla', encabezado: 'Escala de síntomas (Menopause Rating Scale)', columnas: ['Dominio', 'Puntaje', 'Severidad'], filas: [
    { celdas: ['Total', `${mrs.total} / 44`, mrs.sevTotal || '—'] },
    { celdas: ['Somático', `${mrs.somatico} / 16`, mrs.sevSomatico || '—'] },
    { celdas: ['Psicológico', `${mrs.psicologico} / 16`, mrs.sevPsicologico || '—'] },
    { celdas: ['Urogenital', `${mrs.urogenital} / 12`, mrs.sevUrogenital || '—'] },
  ] });

  if (cand.titulo && p && p.demografia && p.demografia.edad != null) bloques.push({ tipo: 'conclusion', encabezado: 'Candidatura a terapia hormonal', titular: cand.titulo, detalle: cand.detalle || null, tono: cand.recomienda ? 'ok' : (cand.tipo === 'contraindicada' ? 'alerta' : 'aviso') });
  if (cand.progestageno) bloques.push({ tipo: 'parrafo', encabezado: 'Progestágeno (útero presente)', texto: 'Añadir progestágeno: progesterona micronizada o norgestimato (metabólicamente neutro), o la combinación estrógeno conjugado + bazedoxifeno.' });

  if (via && via.via) bloques.push({ tipo: 'lineas', encabezado: 'Vía de administración sugerida', lineas: [
    { etiqueta: 'Vía', valor: via.via },
    ...(via.factores && via.factores.length ? [{ etiqueta: 'Factores', valor: via.factores.join(', ') }] : []),
    ...(via.nota ? [{ etiqueta: 'Nota', valor: via.nota }] : []),
  ] });

  if (gu.presente && gu.detalle) bloques.push({ tipo: 'parrafo', encabezado: 'Síndrome genitourinario de la menopausia', texto: gu.detalle });
  if (nh && nh.detalle && nh.detalle.length) bloques.push({ tipo: 'lista', encabezado: 'Alternativas no hormonales (síntomas vasomotores)', items: nh.detalle });

  const banderas = [];
  Object.keys(ANTECEDENTES).forEach((k) => { if (a[k]) banderas.push(`${ANTECEDENTES[k]}: contraindica o exige precaución para terapia hormonal sistémica.`); });
  if (tipo.tipo === 'insuficiencia' || tipo.tipo === 'precoz') banderas.push('Insuficiencia ovárica primaria / menopausia precoz: terapia hasta la edad natural de la menopausia, aun sin síntomas.');
  if (banderas.length) bloques.push({ tipo: 'banderas', items: banderas });

  if (cand.recomienda) bloques.push({ tipo: 'parrafo', encabezado: 'Interconsulta', texto: 'La elección de vía depende del riesgo cardiovascular; conviene calcular el riesgo cardiometabólico antes de definirla.' });
  return { titulo: 'Climaterio y terapia hormonal de la menopausia', bloques };
}

function bCardiometabolico(r) {
  const est = r.estadio || {}, pv = r.prevent || {}, cond = r.conducta || {}, th = r.terapiaHormonal || {};
  const flags = est.flags || {};
  const pct = (x) => (x == null ? '—' : `${(x * 100).toFixed(1)} %`);
  const bloques = [];

  if (est.numero != null) bloques.push({ tipo: 'conclusion', encabezado: 'Estadio del síndrome cardiovascular-renal-metabólico', titular: `Estadio ${est.numero}`, detalle: est.justificacion || null, tono: est.numero >= 3 ? 'alerta' : (est.numero >= 1 ? 'aviso' : 'ok') });

  if (pv.total10 != null || pv.total30 != null) bloques.push({ tipo: 'tabla', encabezado: 'Riesgo a 10 y 30 años (PREVENT)', columnas: ['Desenlace', '10 años', '30 años'], filas: [
    { celdas: ['Cardiovascular total', pct(pv.total10), pct(pv.total30)] },
    { celdas: ['Ateroesclerótico', pct(pv.ateroesclerotica10), pct(pv.ateroesclerotica30)] },
    { celdas: ['Insuficiencia cardiaca', pct(pv.insuficienciaCardiaca10), pct(pv.insuficienciaCardiaca30)] },
  ] });

  if (cond.texto || cond.etiqueta) bloques.push({ tipo: 'conclusion', encabezado: 'Conducta y derivación', titular: cond.etiqueta || 'Conducta', detalle: cond.texto || null, tono: est.numero >= 3 ? 'alerta' : (est.numero >= 2 ? 'aviso' : 'ok') });
  if (th.titulo) bloques.push({ tipo: 'conclusion', encabezado: 'Terapia hormonal de la menopausia', titular: th.titulo, detalle: th.detalle || null, tono: th.tipo === 'contra' ? 'alerta' : 'neutro' });

  const banderas = [];
  if (flags.ercMuyAlto) banderas.push('Enfermedad renal de muy alto riesgo (filtración baja o albuminuria elevada).');
  if (flags.diabetes) banderas.push('Diabetes.');
  if (flags.ecvEstablecida) banderas.push('Enfermedad cardiovascular establecida.');
  if (banderas.length) bloques.push({ tipo: 'banderas', items: banderas });
  return { titulo: 'Síndrome cardiovascular-renal-metabólico de la mujer', bloques };
}


// ----- sop -----
function bSop(r, p) {
  const dx = r.diagnostico || {}, crit = dx.criterios || {};
  const ciclo = r.ciclo || {}, hiper = r.hiper || {}, morfo = r.morfo || {};
  const fen = r.fenotipo, exclu = r.exclu || {}, cribado = r.cribado || {};
  const tx = r.tratamiento || [];
  const bloques = [];

  // 1. Conclusión / diagnóstico (primero)
  if (dx.etiqueta) {
    const tono = dx.estado === 'diferencial'
      ? 'alerta'
      : (dx.estado === 'cumple'
        ? 'aviso'
        : ((dx.estado === 'en_riesgo' || dx.estado === 'requiere_exclusion') ? 'aviso' : 'ok'));
    bloques.push({ tipo: 'conclusion', encabezado: 'Diagnóstico', titular: dx.etiqueta, detalle: dx.detalle || null, tono });
  }

  // 2. Criterios diagnósticos interpretados (score: cuáles se cumplen y por qué)
  const filasCrit = [];
  const si = (b) => (b ? 'Sí' : 'No');
  filasCrit.push({ celdas: ['Hiperandrogenismo', si(crit.hiperandrogenismo), hiper.detalle || '—'] });
  filasCrit.push({ celdas: ['Disfunción ovulatoria', si(crit.disfuncionOvulatoria), ciclo.detalle || '—'] });
  if (morfo.aplica) {
    filasCrit.push({ celdas: ['Morfología ovárica', si(crit.morfologia), morfo.detalle || '—'] });
  } else if (morfo.detalle) {
    filasCrit.push({ celdas: ['Morfología ovárica', 'No aplica', morfo.detalle] });
  }
  bloques.push({ tipo: 'tabla', encabezado: 'Criterios diagnósticos', columnas: ['Criterio', 'Presente', 'Sustento'], filas: filasCrit });

  // Índice de andrógenos libres (apoyo bioquímico) si se calculó
  if (hiper.ial != null) {
    bloques.push({ tipo: 'lineas', encabezado: 'Apoyo bioquímico', lineas: [
      { etiqueta: 'Índice de andrógenos libres', valor: hiper.ial.toFixed(2) + ' (umbral ensayo-dependiente)' },
    ] });
  }

  // 3. Fenotipo de Rotterdam (categoría interpretada / riesgo)
  if (fen && fen.letra) {
    const tonoFen = fen.riesgoMetabolico === 'alto' ? 'alerta' : (fen.riesgoMetabolico === 'intermedio' ? 'aviso' : 'neutro');
    bloques.push({ tipo: 'conclusion', encabezado: 'Fenotipo de Rotterdam', titular: `Fenotipo ${fen.letra} · riesgo metabólico ${fen.riesgoMetabolico}`, detalle: fen.descripcion || null, tono: tonoFen });
  }

  // 4. Exclusiones de diagnósticos diferenciales (conducta de estudio)
  if ((exclu.alteradas && exclu.alteradas.length) || (exclu.pendientes && exclu.pendientes.length)) {
    const lineasEx = [];
    if (exclu.alteradas && exclu.alteradas.length) lineasEx.push({ etiqueta: 'Alterado, revisar como causa', valor: exclu.alteradas.join(', ') + '.' });
    if (exclu.pendientes && exclu.pendientes.length) lineasEx.push({ etiqueta: 'Pendiente por completar', valor: exclu.pendientes.join(', ') + '.' });
    bloques.push({ tipo: 'lineas', encabezado: 'Exclusión de diagnósticos diferenciales', lineas: lineasEx });
  }

  // 5. Cribado de complicaciones (tamizaje cardiometabólico y de bienestar)
  if (cribado.items && cribado.items.length) {
    const etiquetaEstado = (e) => (e === 'normal' ? 'Normal' : (e === 'alterado' ? 'Atender' : 'Pendiente'));
    bloques.push({ tipo: 'tabla', encabezado: 'Cribado de complicaciones', columnas: ['Dominio', 'Estado', 'Hallazgo'], filas: cribado.items.map((it) => ({ celdas: [it.nombre, etiquetaEstado(it.estado), it.hallazgo || '—'] })) });
  }
  if (cribado.riesgoCardiometabolico) {
    bloques.push({ tipo: 'parrafo', encabezado: 'Riesgo cardiometabólico', texto: 'Cribado con al menos un hallazgo alterado. El síndrome aumenta el riesgo cardiometabólico; conviene evaluarlo de forma dirigida (instrumento cardiometabólico).' });
  }

  // 6. Orientación a tratamiento por objetivo (conducta y fármacos)
  if (tx.length) {
    tx.forEach((linea) => {
      if (linea && linea.objetivo && linea.recomendaciones && linea.recomendaciones.length) {
        bloques.push({ tipo: 'lista', encabezado: 'Tratamiento · ' + linea.objetivo, items: linea.recomendaciones });
      }
    });
  }

  // 7. Banderas rojas
  const banderas = [];
  if (exclu.banderas && exclu.banderas.length) exclu.banderas.forEach((b) => banderas.push(b));
  if (exclu.alteradas && exclu.alteradas.length) banderas.push('Estudio de exclusión alterado (' + exclu.alteradas.join(', ') + '): no etiquetar como síndrome hasta resolver la causa diferencial.');
  if (banderas.length) bloques.push({ tipo: 'banderas', items: banderas });

  return { titulo: 'Síndrome poliendocrino metabólico ovárico', bloques };
}

// ----- hemorragia -----
function bHemorragia(r, p) {
  const dem = (p && p.demografia) || {};
  const sangrado = r.sangrado || {}, agudo = r.agudo, coag = r.coag || {};
  const palm = r.palm || {}, posmeno = r.posmeno, anemia = r.anemia || {};
  const estudios = r.estudios || [], tratamiento = r.tratamiento || [];
  const bloques = [];

  // 1. Conclusión / diagnóstico: clasificación PALM-COEIN (va primero)
  if (palm.hayClasificacion && palm.presentes && palm.presentes.length) {
    const titular = palm.presentes.map((c) => c.codigo).join(' · ');
    const detalle = palm.presentes.map((c) => `${c.codigo}: ${c.nombre}`).join('; ')
      + (palm.estructural ? '. Componente estructural presente (PALM).' : '. Sin componente estructural confirmado (COEIN).');
    bloques.push({ tipo: 'conclusion', encabezado: 'Clasificación PALM-COEIN', titular, detalle, tono: palm.estructural ? 'aviso' : 'neutro' });
  } else {
    bloques.push({ tipo: 'conclusion', encabezado: 'Clasificación PALM-COEIN', titular: 'Sin componente PALM-COEIN identificado', detalle: 'No se marcaron componentes; completar el estudio para clasificar la causa.', tono: 'neutro' });
  }

  // 2. Caracterización del sangrado (FIGO 1)
  if (sangrado.anormal && sangrado.descriptores && sangrado.descriptores.length) {
    bloques.push({ tipo: 'lista', encabezado: 'Descriptores anormales del sangrado (FIGO 1)', items: sangrado.descriptores });
  } else {
    bloques.push({ tipo: 'parrafo', encabezado: 'Caracterización del sangrado (FIGO 1)', texto: 'Sin descriptores anormales en el patrón de sangrado capturado.' });
  }

  // 3. Episodio agudo: estabilidad y criterios de hospitalización
  if (agudo) {
    const lineas = [{ etiqueta: 'Nivel', valor: agudo.nivel === 'inestable' ? 'Inestable' : 'Estable' }];
    lineas.push({ etiqueta: 'Requiere hospitalización', valor: agudo.requiereHospitalizacion ? 'Sí' : 'No' });
    bloques.push({ tipo: 'conclusion', encabezado: 'Episodio agudo', titular: agudo.inestable ? 'Paciente inestable' : 'Paciente estable', detalle: agudo.requiereHospitalizacion ? 'Cumple criterios de hospitalización (ver banderas).' : 'No cumple criterios de hospitalización por los datos capturados.', tono: agudo.inestable ? 'alerta' : (agudo.requiereHospitalizacion ? 'aviso' : 'ok') });
    bloques.push({ tipo: 'lineas', encabezado: 'Estabilidad del episodio', lineas });
  }

  // 4. Anemia (según hemoglobina)
  if (anemia.estado && anemia.estado !== 'pendiente') {
    const tono = anemia.estado === 'severa' ? 'alerta' : (anemia.estado === 'moderada' || anemia.estado === 'leve') ? 'aviso' : 'ok';
    bloques.push({ tipo: 'conclusion', encabezado: 'Anemia', titular: anemia.texto, detalle: null, tono });
  } else if (anemia.texto) {
    bloques.push({ tipo: 'parrafo', encabezado: 'Anemia', texto: anemia.texto });
  }

  // 5. Tamizaje de coagulopatía (von Willebrand)
  if (coag.detalle) {
    bloques.push({ tipo: 'conclusion', encabezado: 'Tamizaje de coagulopatía', titular: coag.positivo ? 'Tamizaje positivo' : 'Tamizaje negativo', detalle: coag.detalle, tono: coag.positivo ? 'aviso' : 'ok' });
  }

  // 6. Vía diagnóstica posmenopáusica (ACOG 2026)
  if (posmeno && posmeno.texto) {
    bloques.push({ tipo: 'conclusion', encabezado: 'Vía del sangrado posmenopáusico', titular: posmeno.via === 'eco_sola' ? 'Vigilancia con ecografía aislada' : 'Muestreo endometrial indicado', detalle: posmeno.texto, tono: posmeno.via === 'biopsia' ? 'aviso' : 'neutro' });
  }

  // 7. Orientación a estudio
  if (estudios.length) {
    bloques.push({ tipo: 'lista', encabezado: 'Orientación a estudio', items: estudios });
  }

  // 8. Orientación a tratamiento (agudo y crónico)
  if (tratamiento.length) {
    tratamiento.forEach((t) => {
      if (t && t.titulo && t.recomendaciones && t.recomendaciones.length) {
        bloques.push({ tipo: 'lista', encabezado: t.titulo, items: t.recomendaciones });
      }
    });
  }

  // 9. Banderas rojas
  const banderas = [];
  if (agudo && agudo.inestable) banderas.push('Episodio agudo con inestabilidad hemodinámica: estabilización inmediata y valoración quirúrgica.');
  if (agudo && agudo.criteriosHosp && agudo.criteriosHosp.length) {
    agudo.criteriosHosp.forEach((c) => banderas.push('Criterio de hospitalización: ' + c + '.'));
  }
  if (anemia.estado === 'severa') banderas.push(anemia.texto + ' Valorar transfusión y manejo intrahospitalario.');
  if (coag.positivo) banderas.push('Tamizaje de coagulopatía positivo: estudios de coagulación e interconsulta con hematología.');
  if (posmeno && posmeno.via === 'biopsia') banderas.push('Sangrado posmenopáusico: el muestreo endometrial no debe diferirse.');
  if (palm.presentes && palm.presentes.some((c) => c.codigo === 'AUB-M')) banderas.push('Sospecha de malignidad o hiperplasia (AUB-M): manejo dirigido y derivación oncológica.');
  if (banderas.length) bloques.push({ tipo: 'banderas', items: banderas });

  return { titulo: 'Sangrado uterino anormal', bloques };
}

// ----- dolor-pelvico -----
function bDolorPelvico(r, p) {
  const dolor = r.dolor || {};
  const sistemas = r.sistemas || [];
  const central = r.central || {};
  const banderas = r.banderas || [];
  const estudio = r.estudio || [];
  const tratamiento = r.tratamiento || [];
  const bloques = [];

  // 1) Conclusión / diagnóstico: caracterización del dolor primero.
  if (dolor.nota || dolor.cronico != null) {
    const partes = [];
    if (dolor.intensidad != null && !isNaN(dolor.intensidad)) partes.push(`Intensidad ${dolor.intensidad} de 10`);
    if (dolor.duracionMeses != null && !isNaN(dolor.duracionMeses)) partes.push(`${dolor.duracionMeses} meses de evolución`);
    if (dolor.patron) partes.push(`patrón ${dolor.patron}`);
    const detalle = [partes.join(', ') + (partes.length ? '.' : ''), dolor.nota].filter(Boolean).join(' ').trim() || null;
    bloques.push({
      tipo: 'conclusion',
      encabezado: 'Caracterización del dolor',
      titular: (dolor.duracionMeses == null || isNaN(dolor.duracionMeses))
        ? 'Duración no capturada'
        : (dolor.cronico ? 'Dolor pélvico crónico' : 'Dolor pélvico aún no crónico'),
      detalle,
      tono: dolor.cronico ? 'aviso' : 'neutro',
    });
  }

  // 2) Diagnóstico diferencial por sistemas (categoría interpretada por número de pistas).
  if (sistemas.length) {
    bloques.push({
      tipo: 'tabla',
      encabezado: 'Diagnóstico diferencial por sistemas',
      columnas: ['Sistema', 'Pistas', 'Hallazgos'],
      filas: sistemas.map((s) => ({ celdas: [s.nombre, String(s.n), (s.pistas || []).join('; ')] })),
    });
  }

  // 3) Sensibilización central (mecanismo amplificador interpretado).
  if (central.presente || central.sospechada) {
    const detalle = [
      central.datos && central.datos.length ? `Datos: ${central.datos.join('; ')}.` : '',
      central.nota || '',
    ].filter(Boolean).join(' ').trim() || null;
    bloques.push({
      tipo: 'conclusion',
      encabezado: 'Sensibilización central',
      titular: central.presente ? 'Presente' : 'Posible',
      detalle,
      tono: central.presente ? 'alerta' : 'aviso',
    });
  }

  // 4) Orientación a estudio / tamizaje dirigido.
  if (estudio.length) {
    bloques.push({ tipo: 'lista', encabezado: 'Orientación a estudio y derivación', items: estudio });
  }

  // 5) Orientación a tratamiento multimodal: un bloque de lista por pilar.
  tratamiento.forEach((b) => {
    if (b && b.recomendaciones && b.recomendaciones.length) {
      bloques.push({ tipo: 'lista', encabezado: `Tratamiento · ${b.titulo}`, items: b.recomendaciones });
    }
  });

  // 6) Banderas rojas al final.
  if (banderas.length) {
    bloques.push({ tipo: 'banderas', items: banderas });
  }

  return { titulo: 'Dolor pélvico', bloques };
}

// ----- endometriosis -----
function bEndometriosis(r, p) {
  const c = r.clinico || {}, est = r.estudio || [], rasrm = r.rasrm, efi = r.efi;
  const enz = r.enzian || {}, tx = r.tratamiento || [];
  const bloques = [];

  // 1) Conclusión / diagnóstico primero
  const NIVEL_TXT = {
    confirmado_imagen: 'Compatible por imagen',
    alta: 'Alta sospecha clínica',
    intermedia: 'Sospecha intermedia',
    baja: 'Sin síntomas cardinales',
  };
  const NIVEL_TONO = {
    confirmado_imagen: 'alerta', alta: 'alerta', intermedia: 'aviso', baja: 'neutro',
  };
  if (c.nivel) bloques.push({
    tipo: 'conclusion',
    encabezado: 'Probabilidad clínica',
    titular: NIVEL_TXT[c.nivel] || c.nivel,
    detalle: c.mensaje || null,
    tono: NIVEL_TONO[c.nivel] || 'neutro',
  });

  // Síntomas y exploración que sostienen la sospecha
  if (c.sintomas && c.sintomas.length) bloques.push({
    tipo: 'lista', encabezado: 'Síntomas cardinales', items: c.sintomas,
  });
  if (c.signos && c.signos.length) bloques.push({
    tipo: 'lista', encabezado: 'Hallazgos a la exploración', items: c.signos,
  });

  // 2) Estadificación / scores interpretados
  if (rasrm) bloques.push({
    tipo: 'conclusion',
    encabezado: 'Estadificación revisada (American Society for Reproductive Medicine)',
    titular: `Estadio ${rasrm.estadio}, ${rasrm.nombre}`,
    detalle: `${rasrm.puntaje} puntos.`,
    tono: (rasrm.estadio === 'III' || rasrm.estadio === 'IV') ? 'alerta' : 'aviso',
  });

  if (efi) bloques.push({
    tipo: 'lineas',
    encabezado: 'Índice de fertilidad de endometriosis',
    lineas: [
      { etiqueta: 'Total', valor: `${efi.total} de 10` },
      { etiqueta: 'Pronóstico', valor: efi.pronostico },
      { etiqueta: 'Factores históricos', valor: `${efi.historico}` },
      { etiqueta: 'Factores quirúrgicos', valor: `${efi.quirurgico}` },
    ],
  });

  if (enz.hay) {
    const itemsEnz = [...(enz.compartimentos || []), ...(enz.focales || [])];
    if (itemsEnz.length) bloques.push({
      tipo: 'lista',
      encabezado: 'Clasificación Enzian (enfermedad profunda)',
      items: itemsEnz,
    });
  }

  // 3) Conducta: estudio y tratamiento
  if (est.length) bloques.push({
    tipo: 'lista', encabezado: 'Orientación a estudio', items: est,
  });

  (tx || []).forEach((b) => {
    if (b && b.recomendaciones && b.recomendaciones.length) bloques.push({
      tipo: 'lista',
      encabezado: `Tratamiento · ${b.eje}`,
      items: b.recomendaciones,
    });
  });

  // 4) Banderas rojas
  const banderas = [];
  if (rasrm && (rasrm.estadio === 'III' || rasrm.estadio === 'IV')) banderas.push(`Enfermedad ${rasrm.nombre} (estadio ${rasrm.estadio}): valorar derivación a centro experto y manejo quirúrgico especializado.`);
  if (enz.hay) banderas.push('Endometriosis profunda por clasificación Enzian: mapeo por resonancia y derivación a equipo multidisciplinario (recto, vejiga o uréteres).');
  if (efi && (efi.pronostico === 'muy bajo' || efi.pronostico === 'bajo')) banderas.push(`Pronóstico reproductivo ${efi.pronostico} (índice de fertilidad ${efi.total} de 10): no demorar la valoración por reproducción asistida.`);
  if (c.nivel === 'confirmado_imagen') banderas.push('Diagnóstico compatible por imagen: caracterizar extensión antes de definir el manejo.');
  if (banderas.length) bloques.push({ tipo: 'banderas', items: banderas });

  return { titulo: 'Endometriosis', bloques };
}

// ----- anticoncepcion -----
function bAnticoncepcion(r, p) {
  const el = r.elegibilidad || {};
  const metodos = el.metodos || [];
  const preferibles = el.preferibles || [];
  const restringidos = el.restringidos || [];
  const contraindicados = el.contraindicados || [];
  const presentes = r.presentes || {};
  const auto = r.condicionesAuto || {};
  const bloques = [];

  // --- Conclusión / diagnóstico de elegibilidad (primero) ---
  if (metodos.length) {
    const nPref = preferibles.length;
    const titular = `${nPref} de ${metodos.length} métodos apropiados`;
    let detalle;
    if (contraindicados.length) {
      detalle = `Evitar: ${contraindicados.map((m) => m.nombre).join(', ')}.`;
    } else if (restringidos.length) {
      detalle = `Usar con precaución (categoría 3): ${restringidos.map((m) => m.nombre).join(', ')}.`;
    } else {
      detalle = 'Sin métodos contraindicados según las condiciones presentes.';
    }
    const tono = contraindicados.length ? 'alerta' : (restringidos.length ? 'aviso' : 'ok');
    bloques.push({ tipo: 'conclusion', encabezado: 'Elegibilidad anticonceptiva', titular, detalle, tono });
  }

  // --- Condiciones detectadas automáticamente de los datos ---
  const nAuto = Object.keys(auto).length;
  if (nAuto) {
    bloques.push({ tipo: 'lineas', encabezado: 'Detectado de los datos de la paciente', lineas: [
      { etiqueta: 'Condiciones automáticas', valor: String(nAuto) },
      ...(el.nCondiciones != null ? [{ etiqueta: 'Condiciones evaluadas en total', valor: String(el.nCondiciones) }] : []),
    ] });
  }

  // --- Tabla de elegibilidad por método (categoría OMS interpretada) ---
  if (metodos.length) {
    bloques.push({ tipo: 'tabla', encabezado: 'Elegibilidad por método (categorías de inicio, Organización Mundial de la Salud)', columnas: ['Método', 'Categoría', 'Recomendación'], filas: metodos.map((m) => ({
      celdas: [m.detalle ? `${m.nombre} (${m.detalle})` : m.nombre, String(m.categoria), m.recomendacion || '—'],
    })) });
  }

  // --- Conducta: métodos preferibles a ofrecer ---
  if (preferibles.length) {
    bloques.push({ tipo: 'lista', encabezado: 'Métodos a ofrecer (categoría 1 o 2)', items: preferibles.map((m) => m.detalle ? `${m.nombre} — ${m.detalle}` : m.nombre) });
  }

  // --- Métodos restringidos con su causa (categoría 3) ---
  if (restringidos.length) {
    bloques.push({ tipo: 'lineas', encabezado: 'Generalmente no recomendados (categoría 3)', lineas: restringidos.map((m) => ({
      etiqueta: m.nombre,
      valor: (m.causas && m.causas.length) ? m.causas.join('; ') : 'Riesgo supera la ventaja',
    })) });
  }

  // --- Derivación / tamizaje cardiometabólico ---
  if (presentes.multiplesRcv || presentes.htaSevera) {
    bloques.push({ tipo: 'parrafo', encabezado: 'Derivación sugerida', texto: 'Perfil de riesgo cardiovascular relevante; conviene calcular el riesgo cardiometabólico global de la paciente antes de elegir un método hormonal combinado.' });
  }

  // --- Banderas rojas: métodos contraindicados con su causa ---
  const banderas = [];
  contraindicados.forEach((m) => {
    const causa = (m.causas && m.causas.length) ? ` por ${m.causas.join('; ')}` : '';
    banderas.push(`${m.nombre}: no usar (categoría 4)${causa}.`);
  });
  if (presentes.cancerMamaActual) banderas.push('Cáncer de mama actual: contraindica todos los métodos hormonales; solo dispositivo intrauterino de cobre.');
  if (presentes.sangradoNoExpl) banderas.push('Sangrado vaginal no explicado: evaluar antes de colocar un dispositivo intrauterino.');
  if (banderas.length) bloques.push({ tipo: 'banderas', items: banderas });

  return { titulo: 'Anticoncepción', bloques };
}

// ----- incontinencia -----
function bIncontinencia(r, p) {
  const clas = r.clas || {};
  const sev = r.severidad;
  const bloques = [];

  // Conclusión / diagnóstico primero
  if (clas.etiqueta) {
    const detalle = [
      clas.predominio ? `Predominio de ${clas.predominio}.` : null,
      r.presencia ? null : 'No se capturaron escapes ni síntomas en esta evaluación.',
    ].filter(Boolean).join(' ') || null;
    bloques.push({
      tipo: 'conclusion',
      encabezado: 'Diagnóstico',
      titular: clas.etiqueta,
      detalle,
      tono: (clas.tipo === 'mixta' || clas.tipo === 'esfuerzo' || clas.tipo === 'urgencia')
        ? 'aviso'
        : (clas.tipo === 'ninguna' ? 'ok' : 'neutro'),
    });
  }

  // Puntajes de tipo (esfuerzo / urgencia)
  if (clas.esfuerzo != null || clas.urgencia != null) {
    bloques.push({
      tipo: 'tabla',
      encabezado: 'Puntajes por tipo (umbral: esfuerzo ≥ 4, urgencia ≥ 6)',
      columnas: ['Dominio', 'Puntaje', 'Lectura'],
      filas: [
        { celdas: ['Esfuerzo', `${clas.esfuerzo} / 15`, clas.esfuerzo >= 4 ? 'Positivo' : 'No significativo'] },
        { celdas: ['Urgencia', `${clas.urgencia} / 15`, clas.urgencia >= 6 ? 'Positivo' : 'No significativo'] },
      ],
    });
  }

  // Severidad e impacto interpretada
  if (sev) {
    bloques.push({
      tipo: 'conclusion',
      encabezado: 'Severidad e impacto',
      titular: `Severidad ${sev.nivel}`,
      detalle: `Puntaje de síntomas e impacto: ${sev.puntaje} de 21.`,
      tono: sev.estado === 'alerta' ? 'alerta' : (sev.estado === 'aviso' ? 'aviso' : 'ok'),
    });
  }

  // Diario miccional (si la paciente lo trajo)
  if (r.diario && r.diario.length) {
    bloques.push({ tipo: 'lista', encabezado: 'Diario miccional', items: r.diario });
  }

  // Hábitos de vejiga a corregir
  if (r.habitos && r.habitos.length) {
    bloques.push({ tipo: 'lista', encabezado: 'Hábitos a corregir', items: r.habitos });
  }

  // Conducta / tratamiento / tamizaje / derivación
  if (r.tratamiento && r.tratamiento.length) {
    r.tratamiento.forEach((b) => {
      if (b && b.items && b.items.length) {
        bloques.push({ tipo: 'lista', encabezado: b.titulo, items: b.items });
      }
    });
  }

  // Banderas de alarma en rojo
  if (r.banderas && r.banderas.length) {
    bloques.push({ tipo: 'banderas', items: r.banderas });
  }

  return { titulo: 'Incontinencia urinaria', bloques };
}

// ----- mama -----
function bMama(r, p) {
  const bloques = [];

  // CONCLUSIÓN / diagnóstico primero: categoría de riesgo interpretada
  if (r.etiqueta) {
    const interpreta = {
      alto: 'Cumple criterios categóricos de alto riesgo, independientes del porcentaje. Amerita tamizaje intensificado y valorar reducción de riesgo.',
      estimar: 'La historia familiar amerita estimar el riesgo de por vida con un modelo validado (Tyrer-Cuzick) para definir la conducta.',
      intermedio: 'Riesgo por encima del promedio por acumulación de factores moduladores; individualizar el tamizaje.',
      promedio: 'Riesgo promedio; tamizaje según la edad.',
    };
    bloques.push({
      tipo: 'conclusion',
      encabezado: 'Estratificación de riesgo',
      titular: r.etiqueta,
      detalle: interpreta[r.categoria] || null,
      tono: r.estado === 'alerta' ? 'alerta' : (r.estado === 'aviso' ? 'aviso' : (r.estado === 'ok' ? 'ok' : 'neutro')),
    });
  }

  // Historia familiar a cuantificar con modelo
  if (r.histFamiliar && r.histFamiliar.length) {
    bloques.push({ tipo: 'lista', encabezado: 'Historia familiar a cuantificar (correr modelo)', items: r.histFamiliar });
  }

  // Factores que elevan el riesgo basal
  if (r.moduladores && r.moduladores.length) {
    bloques.push({ tipo: 'lista', encabezado: 'Factores que elevan el riesgo basal', items: r.moduladores });
  }

  // Conducta de tamizaje
  if (r.tamizaje && r.tamizaje.length) {
    bloques.push({ tipo: 'lista', encabezado: 'Conducta de tamizaje', items: r.tamizaje });
  }

  // Derivación a consejo genético
  if (r.genetica && r.genetica.length) {
    bloques.push({ tipo: 'lista', encabezado: 'Derivación a consejo genético (cumple criterios)', items: r.genetica });
  }

  // Prevención / reducción de riesgo (fármacos y estilo de vida)
  if (r.prevencion && r.prevencion.length) {
    bloques.push({ tipo: 'lista', encabezado: 'Prevención y reducción de riesgo', items: r.prevencion });
  }

  // Banderas de alarma: criterios categóricos de alto riesgo
  if (r.altoRiesgo && r.altoRiesgo.length) {
    bloques.push({ tipo: 'banderas', items: r.altoRiesgo });
  }

  return { titulo: 'Salud y riesgo mamario', bloques };
}

// ----- osea -----
function bOsea(r, p) {
  const dx = r.dx, crib = r.cribado || {}, tx = r.tratamiento || {};
  const factores = r.factores || [], orientacion = r.orientacion || [];
  const bloques = [];

  // 1) Conclusión / diagnóstico densitométrico primero
  if (dx && dx.etiqueta) {
    bloques.push({ tipo: 'conclusion', encabezado: 'Diagnóstico densitométrico', titular: dx.etiqueta, detalle: null, tono: dx.estado || 'neutro' });
  } else {
    bloques.push({ tipo: 'conclusion', encabezado: 'Diagnóstico densitométrico', titular: 'Sin densitometría disponible', detalle: 'El diagnóstico se define tras el estudio de densidad ósea.', tono: 'neutro' });
  }

  // 2) Cribado densitométrico (cuando no hay estudio aún)
  if (!dx && crib.motivo) {
    bloques.push({ tipo: 'conclusion', encabezado: 'Cribado densitométrico', titular: crib.indica ? 'Densitometría indicada' : 'Densitometría no prioritaria', detalle: crib.motivo, tono: crib.indica ? 'aviso' : 'ok' });
  }

  // 3) Indicación de tratamiento / conducta
  if (tx.base || tx.indica !== undefined) {
    const titular = tx.indica === true ? 'Tratamiento farmacológico indicado'
      : tx.indica === 'condicional' ? 'Tratamiento según cálculo del FRAX'
      : 'Tratamiento farmacológico no indicado';
    const tono = tx.indica === true ? 'alerta' : tx.indica === 'condicional' ? 'aviso' : 'ok';
    bloques.push({ tipo: 'conclusion', encabezado: 'Indicación de tratamiento', titular, detalle: tx.base || null, tono });
  }

  // 4) Factores de riesgo presentes
  if (factores.length) {
    bloques.push({ tipo: 'lista', encabezado: 'Factores de riesgo presentes', items: factores });
  }

  // 5) Medidas de salud ósea / conducta general
  if (orientacion.length) {
    bloques.push({ tipo: 'lista', encabezado: 'Medidas de salud ósea', items: orientacion });
  }

  // 6) Banderas de alarma para el médico
  const banderas = [];
  if (dx && dx.categoria === 'osteoporosis') banderas.push('Osteoporosis densitométrica (puntaje T de menos dos punto cinco o menor): tratamiento indicado e investigar causas secundarias.');
  if (tx.indica === true) banderas.push('Indicación firme de tratamiento farmacológico antifractura.');
  if (factores.some((f) => /Fractura por fragilidad previa/.test(f))) banderas.push('Fractura por fragilidad previa: riesgo elevado de nueva fractura.');
  if (factores.some((f) => /progenitor/.test(f))) banderas.push('Antecedente de fractura de cadera parental.');
  if (factores.some((f) => /Glucocorticoides/.test(f))) banderas.push('Glucocorticoides prolongados: riesgo óseo inducido por fármaco.');
  if (factores.some((f) => /precoz|insuficiencia ovárica/i.test(f))) banderas.push('Menopausia precoz / insuficiencia ovárica: pérdida ósea acelerada; valorar terapia hasta la edad natural de la menopausia.');
  if (banderas.length) bloques.push({ tipo: 'banderas', items: banderas });

  return { titulo: 'Salud ósea / osteoporosis', bloques };
}

const BUILDERS = {
  menopausia: bMenopausia, cardiometabolico: bCardiometabolico,
  sop: bSop, hemorragia: bHemorragia, 'dolor-pelvico': bDolorPelvico,
  endometriosis: bEndometriosis, anticoncepcion: bAnticoncepcion,
  incontinencia: bIncontinencia, mama: bMama, osea: bOsea,
};
export function instrumentoSoportado(id) { return !!BUILDERS[id]; }

// ---------------------------------------------------------------- render

function renderBloque(b) {
  if (!b) return '';
  const enc = b.encabezado ? `<div class="hc-enc">${escaparHtml(b.encabezado)}</div>` : '';
  if (b.tipo === 'conclusion') {
    const c = TONO[b.tono] || TONO.neutro;
    return `<div class="hc-b">${enc}<div class="hc-concl" style="border-left:3px solid ${c}"><div class="hc-titular">${escaparHtml(b.titular || '')}</div>${b.detalle ? `<div class="hc-det">${escaparHtml(b.detalle)}</div>` : ''}</div></div>`;
  }
  if (b.tipo === 'tabla') {
    const head = `<tr>${(b.columnas || []).map((c) => `<th>${escaparHtml(c)}</th>`).join('')}</tr>`;
    const rows = (b.filas || []).map((f) => `<tr>${(f.celdas || []).map((x, i) => `<td${i === 0 ? ' class="par"' : ''}>${escaparHtml(x)}</td>`).join('')}</tr>`).join('');
    return `<div class="hc-b">${enc}<table class="hc-t">${head}${rows}</table></div>`;
  }
  if (b.tipo === 'lineas') {
    return `<div class="hc-b">${enc}${(b.lineas || []).map((l) => `<div class="hc-l"><span class="hc-le">${escaparHtml(l.etiqueta)}</span><span class="hc-lv">${escaparHtml(l.valor)}</span></div>`).join('')}</div>`;
  }
  if (b.tipo === 'lista') return `<div class="hc-b">${enc}<ul class="hc-ul">${(b.items || []).map((i) => `<li>${escaparHtml(i)}</li>`).join('')}</ul></div>`;
  if (b.tipo === 'parrafo') return `<div class="hc-b">${enc}<div class="hc-p">${escaparHtml(b.texto || '')}</div></div>`;
  if (b.tipo === 'banderas') return `<div class="hc-flags"><div class="hc-flags-t">Banderas de alarma</div><ul>${(b.items || []).map((i) => `<li>${escaparHtml(i)}</li>`).join('')}</ul></div>`;
  return '';
}

function contextoHtml(p) {
  const dem = (p && p.demografia) || {}, a = (p && p.antecedentes) || {};
  const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const ident = [
    `<div><b>Paciente</b><span class="v">${escaparHtml(dem.nombre || '—')}</span></div>`,
    (dem.edad != null ? `<div><b>Edad</b><span class="v">${escaparHtml(dem.edad)} años</span></div>` : ''),
    `<div><b>Fecha</b><span class="v">${escaparHtml(fecha)}</span></div>`,
  ].join('');
  const marcados = Object.keys(ANTECEDENTES).filter((k) => a[k]);
  const ant = marcados.length
    ? `<div class="hc-ant"><b>Antecedentes / contraindicaciones:</b> ${marcados.map((k) => escaparHtml(ANTECEDENTES[k])).join(' · ')}</div>`
    : '';
  return `<div class="ident">${ident}</div>${ant}`;
}

export function construirHojaClinica(id, r, paciente) {
  const builder = BUILDERS[id];
  const data = builder && r ? builder(r, paciente || {}) : null;
  const cuerpo = data
    ? data.bloques.map(renderBloque).join('')
    : '<div class="hc-p">No hay datos suficientes para generar la hoja clínica de este instrumento.</div>';
  const titulo = data ? data.titulo : 'Hoja clínica';
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${escaparHtml(titulo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;1,9..144,300&display=swap" rel="stylesheet">
<style>
  :root{--verde:#1F3A2E;--dorado:#A88B5C;--terracota:#B85042;--linea:rgba(31,58,46,.14);--hair:rgba(168,139,92,.55);}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Inter',system-ui,sans-serif;color:var(--verde);padding:0;line-height:1.5;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .cab{background:#F6F1E6;padding:16px 18px;border-radius:11px;display:flex;align-items:flex-start;justify-content:space-between;gap:24px;border-bottom:2px solid var(--verde);padding-bottom:16px;}
  .marca{font-size:22px;}.marca small{display:block;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--dorado);margin-top:4px;font-weight:700;}
  .mono{width:54px;height:54px;border:1.5px solid var(--verde);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:21px;flex-shrink:0;}
  .ident{display:flex;gap:28px;flex-wrap:wrap;font-size:12px;margin:14px 0 8px;}
  .ident b{display:block;font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--dorado);margin-bottom:3px;}
  .ident .v{font-size:14px;font-weight:600;}
  .hc-ant{font-size:11.5px;color:var(--terracota);font-weight:600;background:rgba(184,80,66,.07);border-radius:8px;padding:8px 12px;margin:6px 0 4px;}
  .eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:9.5px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--dorado);margin:18px 0 8px;}
  .eyebrow::before{content:'';width:5px;height:5px;border-radius:50%;background:var(--dorado);}
  .titulo{font-family:"Fraunces",serif;font-size:30px;font-weight:300;letter-spacing:-.02em;line-height:1.05;margin-bottom:4px;}
  .nota{font-size:10.5px;color:rgba(31,58,46,.55);margin-bottom:6px;}
  .hc-b{margin-top:16px;}
  .hc-enc{font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--verde);padding-bottom:6px;margin-bottom:8px;position:relative;}
  .hc-enc::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,var(--hair),rgba(168,139,92,.15) 70%,transparent);}
  .hc-concl{padding:2px 0 2px 14px;}
  .hc-titular{font-family:"Fraunces",serif;font-size:19px;font-weight:300;line-height:1.18;}
  .hc-det{font-size:11.5px;color:rgba(31,58,46,.72);margin-top:5px;line-height:1.5;}
  .hc-t{width:100%;border-collapse:collapse;font-size:12.5px;}
  .hc-t th{text-align:left;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--dorado);padding:0 6px 6px;border-bottom:1px solid var(--linea);}
  .hc-t td{padding:8px 6px;border-bottom:1px solid var(--linea);}
  .hc-t .par{font-weight:600;}
  .hc-l{display:flex;justify-content:space-between;gap:16px;padding:6px 0;border-bottom:1px solid var(--linea);font-size:12.5px;}
  .hc-le{color:rgba(31,58,46,.6);} .hc-lv{font-weight:600;text-align:right;}
  .hc-ul{font-size:12px;line-height:1.6;list-style-position:inside;} .hc-ul li{margin-bottom:5px;}
  .hc-p{font-size:12px;line-height:1.6;color:rgba(31,58,46,.85);}
  .hc-flags{margin-top:18px;background:rgba(184,80,66,.08);border-left:3px solid var(--terracota);border-radius:8px;padding:12px 14px;}
  .hc-flags-t{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--terracota);margin-bottom:7px;}
  .hc-flags ul{list-style-position:inside;font-size:12px;line-height:1.55;color:#7d2f24;} .hc-flags li{margin-bottom:4px;}
  .pie{background:#F6F1E6;padding:13px 18px;border-radius:9px;margin-top:26px;padding-top:14px;border-top:1px solid var(--linea);font-size:10px;color:rgba(31,58,46,.55);line-height:1.5;}
  @page{size:letter;margin:14mm;}
</style></head>
<body>
  <div class="cab"><div class="marca">dr. iván jiménez martínez<small>Ginecología</small></div><div class="mono">IJ</div></div>
  ${contextoHtml(paciente)}
  <div class="eyebrow">Hoja clínica · para el expediente</div>
  <div class="titulo">${escaparHtml(titulo)}</div>
  <div class="nota">Documento de apoyo a la decisión para el médico. No sustituye el juicio clínico ni se entrega a la paciente.</div>
  ${cuerpo}
  <div class="pie">Generado a partir de los instrumentos clínicos del consultorio del Dr. Iván Jiménez Martínez. Las orientaciones se individualizan al caso.</div>
</body></html>`;
}

export function imprimirHojaClinica(id, r, paciente) {
  const html = construirHojaClinica(id, r, paciente);
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html); w.document.close(); w.focus();
  setTimeout(() => w.print(), 400);
}
