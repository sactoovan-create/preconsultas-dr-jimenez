/**
 * Lógica clínica del instrumento de Hemorragia Uterina Anormal. Funciones puras.
 *
 * Base:
 *  - Sistemas FIGO 1 (descriptores del sangrado) y 2 (clasificación PALM-COEIN),
 *    revisión de Munro y cols. 2018.
 *  - Manejo de la hemorragia aguda: Opinión del Comité de ACOG (estabilización,
 *    manejo médico de primera línea, quirúrgico si falla o hay inestabilidad).
 *  - Sangrado posmenopáusico: Actualización de la Práctica Clínica de ACOG de
 *    abril de 2026, que recomienda ecografía transvaginal junto con muestreo
 *    endometrial en la mayoría de las pacientes, y reserva la ecografía aislada
 *    para casos seleccionados que cumplan todas las condiciones.
 *
 * Cubre edad reproductiva, adolescencia y posmenopausia, con sangrado crónico y
 * agudo. Instrumento de apoyo a la decisión; no sustituye el juicio clínico.
 */

const v = (x) => x !== null && x !== undefined && !isNaN(x);

/** Sistema FIGO 1: descriptores anormales del patrón de sangrado. */
export function caracterizarSangrado(d) {
  const desc = [];
  if (v(d.frecuenciaDias)) {
    if (d.frecuenciaDias < 24) desc.push('frecuencia aumentada (ciclos menores de veinticuatro días)');
    else if (d.frecuenciaDias > 38) desc.push('frecuencia disminuida (ciclos mayores de treinta y ocho días)');
  }
  if (v(d.duracionDias) && d.duracionDias > 8) desc.push('duración prolongada (más de ocho días)');
  if (d.regular === false) desc.push('sangrado irregular');
  if (d.volumen === 'abundante') desc.push('volumen abundante');
  if (d.intermenstrual) desc.push('sangrado intermenstrual');
  return { anormal: desc.length > 0, descriptores: desc };
}

/** Estabilidad del episodio agudo y criterios de hospitalización. */
export function evaluarAgudo(d, hb) {
  if (!d.agudo) return null;
  const inestable = d.hipotension || d.ortostatismo || (d.taquicardia && d.saturacionAlta);
  const criteriosHosp = [];
  if (d.hipotension || d.ortostatismo) criteriosHosp.push('signos de hipovolemia o hipotensión ortostática');
  if (d.saturacionAlta) criteriosHosp.push('saturación de más de una toalla por hora o empapamiento en menos de dos horas');
  if (v(hb) && hb < 8) criteriosHosp.push('hemoglobina menor de ocho gramos por decilitro');
  return {
    inestable,
    requiereHospitalizacion: inestable || criteriosHosp.length > 0,
    criteriosHosp,
    nivel: inestable ? 'inestable' : 'estable',
  };
}

/** Tamizaje estructurado de coagulopatía (orientado a enfermedad de von Willebrand). */
export function tamizajeCoagulopatia(d) {
  const mayor = d.coag_menarcaAbundante || d.coag_posparto || d.coag_quirurgico;
  const menores = [d.coag_dental, d.coag_equimosis, d.coag_epistaxis, d.coag_familiar].filter(Boolean).length;
  const positivo = mayor || menores >= 2;
  return {
    positivo,
    detalle: positivo
      ? 'Tamizaje positivo: solicitar estudios de coagulación y valorar interconsulta con hematología.'
      : 'Tamizaje sin datos sugestivos de trastorno de la coagulación.',
  };
}

/** Clasificación PALM-COEIN: componentes presentes o sospechados. */
export function clasificarPalmCoein(d, sangrado, coag) {
  const presentes = [];
  if (d.polipo) presentes.push({ codigo: 'AUB-P', nombre: 'Pólipo' });
  if (d.adenomiosis) presentes.push({ codigo: 'AUB-A', nombre: 'Adenomiosis' });
  if (d.leiomioma) presentes.push({ codigo: d.leiomiomaSubmucoso ? 'AUB-L (submucoso)' : 'AUB-L (otro)', nombre: 'Leiomioma' });
  if (d.malignidadHiperplasia) presentes.push({ codigo: 'AUB-M', nombre: 'Malignidad o hiperplasia' });
  if (coag.positivo) presentes.push({ codigo: 'AUB-C', nombre: 'Coagulopatía' });
  if (d.ovulatoria || (sangrado && d.regular === false)) presentes.push({ codigo: 'AUB-O', nombre: 'Disfunción ovulatoria' });
  if (d.endometrial) presentes.push({ codigo: 'AUB-E', nombre: 'Endometrial' });
  if (d.iatrogenica) presentes.push({ codigo: 'AUB-I', nombre: 'Iatrogénica' });

  const estructural = d.polipo || d.adenomiosis || d.leiomioma || d.malignidadHiperplasia;
  return { presentes, estructural, hayClasificacion: presentes.length > 0 };
}

/** Vía diagnóstica del sangrado posmenopáusico (ACOG, abril 2026). */
export function viaPosmenopausica(d) {
  if (d.contexto !== 'posmenopausica') return null;
  const ecoSolaPermitida = d.episodioRecurrente === false
    && d.endometrioVisualizado === true
    && v(d.grosorEndometrial) && d.grosorEndometrial <= 4
    && d.factoresRiesgoCancer === false;

  if (ecoSolaPermitida) {
    return {
      via: 'eco_sola',
      texto: 'Cumple todas las condiciones para vigilancia con ecografía aislada: episodio único, endometrio completamente visualizado de cuatro milímetros o menos, sin factores de riesgo de cáncer. Aconsejar que cualquier sangrado que continúe o recurra obliga a reevaluación inmediata.',
    };
  }
  const motivos = [];
  if (d.episodioRecurrente) motivos.push('sangrado recurrente');
  if (d.factoresRiesgoCancer) motivos.push('factores de riesgo de cáncer endometrial');
  if (v(d.grosorEndometrial) && d.grosorEndometrial > 4) motivos.push('endometrio mayor de cuatro milímetros');
  if (d.endometrioVisualizado === false) motivos.push('endometrio no visualizado por completo');
  return {
    via: 'biopsia',
    texto: 'Indicado el muestreo endometrial junto con la ecografía' + (motivos.length ? ' (' + motivos.join(', ') + ')' : '') + '. Si la muestra es insuficiente o el endometrio no se delimita, complementar con histeroscopia o histerosonografía.',
  };
}

/** Anemia según hemoglobina capturada. */
export function evaluarAnemia(hb) {
  if (!v(hb)) return { estado: 'pendiente', texto: 'Hemoglobina no capturada.' };
  if (hb < 8) return { estado: 'severa', texto: `Anemia severa (${hb} gramos por decilitro).` };
  if (hb < 10) return { estado: 'moderada', texto: `Anemia moderada (${hb} gramos por decilitro).` };
  if (hb < 12) return { estado: 'leve', texto: `Anemia leve (${hb} gramos por decilitro).` };
  return { estado: 'normal', texto: `Hemoglobina normal (${hb} gramos por decilitro).` };
}

/** Orientación a estudio según contexto. */
export function orientacionEstudio(d, palm, coag) {
  const estudios = [];
  if (d.contexto === 'posmenopausica') {
    estudios.push('Ecografía transvaginal con medición del grosor endometrial y, en la mayoría de los casos, muestreo endometrial en la misma evaluación.');
  } else {
    estudios.push('Ecografía transvaginal como primera imagen; histerosonografía o histeroscopia si se sospecha causa intracavitaria (pólipo o leiomioma submucoso).');
    if (coag.positivo) estudios.push('Estudios de coagulación e interconsulta con hematología por tamizaje positivo.');
    if (d.contexto === 'adolescente') estudios.push('En la adolescente con sangrado abundante, considerar de entrada el tamizaje de coagulopatía: hasta una de cada cinco tiene un trastorno de la coagulación.');
    estudios.push('Biometría hemática y ferritina; prueba de embarazo según el caso; perfil hormonal si se sospecha disfunción ovulatoria.');
  }
  return estudios;
}

/** Orientación a tratamiento: agudo y crónico, ajustada por causa y deseo de fertilidad. */
export function orientacionTratamiento(d, palm, agudo) {
  const bloques = [];

  if (d.agudo && agudo) {
    if (agudo.inestable) {
      bloques.push({
        titulo: 'Episodio agudo, paciente inestable',
        recomendaciones: [
          'Estabilización inmediata: acceso intravenoso, reposición con líquidos y hemoderivados según la pérdida.',
          'Considerar manejo quirúrgico (legrado, taponamiento con balón intrauterino, y según la causa, histeroscopia o embolización de arteria uterina).',
          'Ácido tranexámico intravenoso diez miligramos por kilogramo cada ocho horas como coadyuvante.',
        ],
      });
    } else {
      bloques.push({
        titulo: 'Episodio agudo, paciente estable',
        recomendaciones: [
          'Manejo médico de primera línea, según historia y contraindicaciones: estrógeno conjugado intravenoso, anticonceptivos orales combinados en pauta múltiple, progestina oral en pauta múltiple, o ácido tranexámico.',
          'Si se inicia estrógeno solo, añadir luego progestina o pasar a anticonceptivo combinado; el estrógeno sin oposición no es tratamiento de mantenimiento.',
          'Manejo quirúrgico si no responde al tratamiento médico o si surge inestabilidad.',
        ],
      });
    }
  }

  if (d.contexto === 'posmenopausica') {
    bloques.push({
      titulo: 'Posmenopausia',
      recomendaciones: [
        'El tratamiento depende del resultado histológico. Completar primero el estudio endometrial antes de tratar.',
        'Ante hiperplasia o malignidad, manejo dirigido y derivación oncológica según corresponda.',
      ],
    });
    return bloques;
  }

  // Crónico (reproductiva o adolescente)
  const desea = d.deseoFertilidad === true;
  if (palm.estructural) {
    const rec = ['Tratamiento dirigido a la causa estructural: polipectomía o miomectomía histeroscópica para lesiones intracavitarias; valorar opciones según tamaño y localización.'];
    if (!desea) rec.push('En quien ya no desea fertilidad, la ablación endometrial o la histerectomía son opciones para casos seleccionados.');
    bloques.push({ titulo: 'Manejo crónico, causa estructural', recomendaciones: rec });
  }
  const recMed = [];
  if (desea) {
    recMed.push('Conservando fertilidad: ácido tranexámico y antiinflamatorios no esteroideos durante el sangrado; anticonceptivos combinados o progestina cíclica si no busca embarazo de inmediato.');
  } else {
    recMed.push('El sistema intrauterino de levonorgestrel es la opción médica de primera línea para el sangrado menstrual abundante.');
    recMed.push('Alternativas: anticonceptivos combinados, progestina oral continua, ácido tranexámico y antiinflamatorios no esteroideos.');
  }
  bloques.push({ titulo: 'Manejo crónico, médico', recomendaciones: recMed });
  return bloques;
}

/** Evaluación completa. Punto de entrada del motor. */
export function evaluarHua(paciente, datos) {
  const d = { ...datos };
  const hb = d.hb;
  const sangrado = caracterizarSangrado(d);
  const agudo = evaluarAgudo(d, hb);
  const coag = tamizajeCoagulopatia(d);
  const palm = clasificarPalmCoein(d, sangrado, coag);
  const posmeno = viaPosmenopausica(d);
  const anemia = evaluarAnemia(hb);
  const estudios = orientacionEstudio(d, palm, coag);
  const tratamiento = orientacionTratamiento(d, palm, agudo);
  const hojaPaciente = construirHojaPaciente(paciente, d, sangrado, anemia);
  return { sangrado, agudo, coag, palm, posmeno, anemia, estudios, tratamiento, hojaPaciente };
}

function construirHojaPaciente(p, d, sangrado, anemia) {
  const filas = [];
  const f = (parametro, valor, unidad, meta, ok) => ({ parametro, valor, unidad, meta, ok });
  if (v(d.frecuenciaDias)) filas.push(f('Frecuencia del ciclo', d.frecuenciaDias, 'días', 'Habitual: 24 a 38 días', d.frecuenciaDias >= 24 && d.frecuenciaDias <= 38));
  if (v(d.duracionDias)) filas.push(f('Duración del sangrado', d.duracionDias, 'días', 'Habitual: hasta 8 días', d.duracionDias <= 8));
  if (v(d.hb)) filas.push(f('Hemoglobina', d.hb, 'g/dL', 'Meta: mayor de 12', d.hb >= 12));

  const posmeno = d.contexto === 'posmenopausica';
  const intro = posmeno
    ? 'El sangrado después de la menopausia siempre debe estudiarse. Tu médico te indicará los estudios necesarios; acude a realizarlos pronto y no los pospongas.'
    : 'Este es el registro de tu evaluación de hoy. Llévalo a tu próxima consulta para dar seguimiento.';
  const recomendaciones = posmeno
    ? [
      'Realiza los estudios que se te indiquen sin demora; permiten encontrar la causa de forma temprana.',
      'Si el sangrado continúa o reaparece, busca atención de inmediato.',
      'Lleva el registro de cuándo sangras para comentarlo en tu consulta.',
    ]
    : [
      'Lleva un registro de tus sangrados: cuándo empiezan, cuántos días duran y qué tan abundantes son.',
      'Si el sangrado es muy abundante, empapas más de una toalla por hora, te sientes muy débil o mareada, busca atención de inmediato.',
      'Realiza los estudios que se te indiquen y acude a tus citas de seguimiento.',
      'Una alimentación con suficiente hierro ayuda; tu médico te indicará si necesitas suplemento.',
    ];

  return {
    identificacion: { nombre: p.demografia.nombre, edad: p.demografia.edad },
    titulo: 'Resumen de tu evaluación',
    intro,
    secciones: [{ titulo: 'Tu evaluación', filas }],
    recomendaciones,
    pie: 'Documento informativo para la paciente. Su interpretación corresponde a tu médico. Hoja emitida por el consultorio del Dr. Iván Jiménez Martínez.',
  };
}
