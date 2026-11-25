/** Anamnesis complementaria, no escala validada. Fuentes y alcance en
 * docs/ENTREVISTA-2026-09.md. IDs compartidos por captura, resumen y lector. */
export const ENTREVISTA_VERSION = '2.1.0';
const opciones = (pares) => pares.map(([valor, etiqueta]) => ({ valor, etiqueta }));
const periodo = opciones([['dias', 'Hace días'], ['semanas', 'Hace semanas'], ['meses', 'Hace meses'], ['anios', 'Hace años'], ['no_se', 'No recuerdo']]);
const impacto = opciones([['ninguno', 'No cambia mis actividades'], ['molesta', 'Me molesta, pero puedo continuar'], ['limita', 'He reducido o evitado actividades'], ['impide', 'Me impide trabajar, dormir o hacer actividades'], ['prefiero_no', 'Prefiero comentarlo en consulta']]);
const texto = (id, etiqueta, placeholder) => ({ id, etiqueta, tipo: 'texto', placeholder });
const eleccion = (id, etiqueta, opciones, extra = {}) => ({ id, etiqueta, tipo: 'opcion', opciones, ...extra });
const multiple = (id, etiqueta, pares) => ({ id, etiqueta, tipo: 'multiple', opciones: pares.map(([id, etiqueta]) => ({ id, etiqueta })) });

export const ENTREVISTA = {
  motivo: {
    titulo: 'Prioridad de la consulta', fuente: 'MP-006 / Checklist 71',
    preguntas: [
      eleccion('consultaTipo', '¿Qué necesitas de esta visita?', opciones([['primera', 'Valorar una molestia por primera vez'], ['seguimiento', 'Revisar cómo voy con un tratamiento'], ['resultados', 'Entender mis estudios o resultados'], ['segunda_opinion', 'Una segunda opinión'], ['prevencion', 'Revisión preventiva']]), { mostrarSi: h => h.visitaSeguimiento !== true }),
      texto('consultaPrioridad', '¿Hay algo que te preocupe especialmente o que no quieras dejar pendiente?', 'Una preocupación concreta o una actividad que te gustaría recuperar'),
    ],
  },
  contexto: {
    titulo: 'Contexto menstrual', fuente: 'Libro maestro 12 y 20',
    preguntas: [
      eleccion('causaAusenciaRegla', 'Si no menstruas, ¿qué explicación te han dado?', opciones([['menopausia_confirmada', 'Mi médico confirmó menopausia'], ['hormonas', 'Uso de anticonceptivo u otro tratamiento hormonal'], ['cirugia', 'Cirugía'], ['en_estudio', 'Se está estudiando'], ['no_se', 'No sé'], ['no_aplica', 'Sí menstruo']]), { mostrarSi: (h) => ['sin_regla_menos_12m', 'sin_regla_12m', 'menopausia', 'histerectomia'].includes(h.etapaReproductiva) }),
    ],
  },
  sangrado: {
    titulo: 'Cómo te afecta el sangrado', fuente: 'MP-001 / Checklist 71 / NICE NG88, 1.2',
    preguntas: [
      multiple('sangradoCambios', 'En los días que sangras, ¿has notado alguno de estos cambios?', [['proteccion', 'Necesito cambiar mi toalla o tampón, o vaciar mi copa, mucho más seguido'], ['nocturno', 'Me levanto en la noche para cambiarme'], ['mancha', 'Llego a manchar la ropa o las sábanas'], ['coagulos', 'Salen coágulos'], ['ninguna', 'Ninguno de estos cambios']]),
      eleccion('sangradoImpacto', '¿Cuánto te dificulta el sangrado seguir con tu día o dormir por la noche?', impacto),
      texto('sangradoTratamientos', '¿Qué has probado para reducir el sangrado? ¿Te ayudó?', 'Puedes decir qué usaste y cuándo, o escribir «Todavía no he probado nada».'),
    ],
  },
  dolor: {
    titulo: 'Cómo es tu dolor', fuente: 'MP-002 / Anamnesis de endometriosis / NICE NG73, 1.3.1',
    preguntas: [
      eleccion('dolorFrecuencia', '¿Con qué frecuencia tienes dolor?', opciones([['diario', 'Todos o casi todos los días'], ['episodios', 'Por episodios, con días sin dolor'], ['ciclo', 'En momentos parecidos de cada ciclo'], ['primera', 'Es la primera vez'], ['no_se', 'No estoy segura']])),
      eleccion('dolorImpacto', 'Cuando te duele, ¿qué tanto puedes seguir con tus actividades?', impacto),
      texto('dolorTratamientos', '¿Qué has probado para aliviar el dolor? ¿Cuánto te ayudó?', 'Puede ser calor, algún medicamento, terapia física o cirugía. También puedes escribir «Nada todavía».'),
    ],
  },
  ciclos: {
    titulo: 'Historia de los cambios hormonales', fuente: 'Libro maestro 12 / PMOS 2026',
    preguntas: [
      eleccion('ciclosInicio', '¿Desde cuándo notas el cambio en tus ciclos, piel o vello?', periodo),
      texto('ciclosDiagnostico', '¿Ya te estudiaron estos cambios o te dieron un diagnóstico?', 'Qué te dijeron, cuándo y qué tratamiento recibiste; o no me han estudiado'),
    ],
  },
  climaterio: {
    titulo: 'Lo que necesitas mejorar', fuente: 'Libro maestro 20 y 71',
    preguntas: [
      texto('climaterioPrioridad', 'De estas molestias, ¿cuál te gustaría mejorar primero?', 'Lo que más interfiere con tu sueño, trabajo o bienestar'),
      texto('climaterioTratamientos', '¿Has usado algún tratamiento para estas molestias?', 'Nombre, tiempo de uso, beneficio o molestias; o ninguno'),
    ],
  },
  urinario: {
    titulo: 'Lo que notas al orinar', fuente: 'Walters-Karram capítulo 09 / MP-004 / NICE NG123, 1.3',
    preguntas: [
      eleccion('urinarioDesde', '¿Cuándo empezaste a notar estas molestias al orinar?', periodo),
      multiple('urinarioVaciado', 'Cuando vas al baño, o entre una ida y otra, ¿te pasa algo de esto?', [['vaciado', 'Termino de orinar y siento que todavía queda orina'], ['esfuerzo', 'Tengo que pujar para que salga la orina'], ['continuo', 'Se me sale la orina casi todo el tiempo'], ['noche', 'Me despierto varias veces en la noche para orinar'], ['ninguna', 'Ninguna de estas']]),
      texto('urinarioTratamientos', '¿Qué estudios o tratamientos has tenido por estas molestias?', 'Por ejemplo, un cultivo de orina, medicamentos, ejercicios o cirugía. Si es la primera vez, puedes decirlo.'),
    ],
  },
  intimidad: {
    titulo: 'Tu experiencia y preferencias', fuente: 'Libro maestro 22 y 71',
    preguntas: [
      eleccion('intimidadImpacto', '¿Cómo te sientes con estos cambios?', opciones([['preocupa', 'Me preocupan y quiero ayuda'], ['preguntas', 'Quiero saber si son esperables'], ['sin_malestar', 'No me generan malestar'], ['prefiero_no', 'Prefiero hablarlo en persona']])),
      texto('intimidadContexto', '¿Hay algo que ayude a entender cómo comenzaron?', 'Cambios de tratamiento, dolor, cansancio o cualquier contexto que quieras compartir'),
    ],
  },
  mama: {
    titulo: 'Estudios y evolución de mama', fuente: 'MP-007 / Checklist 71',
    preguntas: [
      texto('mamaEstudios', '¿Te han estudiado esta molestia o tomado una biopsia?', 'Qué estudio, cuándo y qué seguimiento te indicaron; o no'),
    ],
  },
  cervical: {
    titulo: 'VPH y resultados cervicales', fuente: 'MP-005 / Libro maestro 31',
    preguntas: [
      multiple('cervicalPruebas', '¿Qué estudios quieres revisar?', [['pap', 'Papanicolaou / citología'], ['vph', 'Prueba del virus del papiloma humano (VPH)'], ['colposcopia', 'Colposcopia'], ['biopsia', 'Biopsia / resultado de patología'], ['no_se', 'No sé qué tipo de estudio es']]),
      texto('cervicalFecha', '¿Cuándo se realizó el resultado que quieres revisar?', 'Mes y año aproximados; o no recuerdo'),
      texto('cervicalResultado', '¿Qué te dijeron del resultado?', 'Con tus palabras; no necesitas interpretar ni transcribir el reporte'),
      eleccion('cervicalTratamientoPrevio', '¿Te han tratado alguna lesión del cuello uterino?', opciones([['si', 'Sí'], ['no', 'No'], ['no_se', 'No estoy segura']])),
      texto('cervicalTratamientoDetalle', '¿Qué tratamiento y aproximadamente cuándo?', 'Por ejemplo: conización, LEEP u otro, si lo recuerdas'),
      texto('cervicalSeguimiento', '¿Qué siguiente paso te indicaron y está pendiente?', 'Repetir prueba, colposcopia, biopsia, tratamiento o no tengo un plan claro'),
    ],
  },
  vulvar: {
    titulo: 'Molestias vaginales y de la vulva', fuente: 'MP-003 / CDC: sintomas vaginales',
    preguntas: [
      multiple('vulvarSintomas', '¿Qué has notado?', [['flujo', 'Cambio de flujo'], ['olor', 'Olor diferente'], ['comezon', 'Comezón'], ['ardor', 'Ardor o irritación'], ['piel', 'Mancha, herida o cambio de la piel'], ['bulto', 'Bulto o verruga'], ['no_se', 'No sé cómo describirlo']]),
      eleccion('vulvarDesde', '¿Desde cuándo empezó este episodio?', periodo),
      eleccion('vulvarRepite', '¿Es la primera vez o ha regresado?', opciones([['primera', 'Es la primera vez'], ['recurrente', 'Se quita y vuelve'], ['persistente', 'No se ha quitado'], ['no_se', 'No estoy segura']])),
      texto('vulvarUbicacion', '¿Dónde lo notas y ha cambiado de aspecto?', 'Piel externa, entrada vaginal o dentro; cambios que hayas observado'),
      texto('vulvarExposicion', '¿Usaste algún producto o medicamento nuevo antes de que empezara?', 'Jabón, lubricante, óvulo, antibiótico u otro; o ninguno'),
      texto('vulvarTratamientos', '¿Qué usaste para tratarlo y cuánto duró la mejoría?', 'Incluye tratamientos sin receta y pruebas o cultivos previos, si los hubo'),
    ],
  },
  metabolico: {
    titulo: 'Peso y salud metabólica', fuente: 'MP-007 / Libro maestro 12',
    preguntas: [
      multiple('metabolicoObjetivos', '¿Qué quieres revisar?', [['peso', 'Cambio de peso'], ['glucosa', 'Glucosa, diabetes o resistencia a la insulina'], ['lipidos', 'Colesterol o triglicéridos'], ['presion', 'Presión arterial'], ['tratamiento', 'Seguimiento de un tratamiento'], ['fuerza', 'Fuerza, músculo o cansancio'], ['no_se', 'Necesito orientación']]),
      texto('metabolicoEvolucion', '¿Qué ha cambiado y desde cuándo?', 'Peso, apetito, fuerza o cómo te sientes; no necesitas cifras exactas'),
      texto('metabolicoTratamiento', '¿Qué tratamiento usas actualmente para peso, glucosa o presión?', 'Nombre, dosis si la sabes y desde cuándo; o ninguno'),
      texto('metabolicoTolerancia', '¿Cómo te ha ido con ese tratamiento?', 'Beneficios, molestias, cambios o interrupciones; o no aplica'),
    ],
  },
  'piso-pelvico': {
    titulo: 'Presión, bulto y vaciamiento', fuente: 'Walters-Karram capítulo 09',
    preguntas: [
      multiple('pisoSintomas', '¿Qué has notado?', [['bulto', 'Bulto o algo que baja por la vagina'], ['presion', 'Presión o pesadez vaginal'], ['orina', 'Dificultad para vaciar la vejiga'], ['evacuar', 'Dificultad para evacuar'], ['apoyo', 'Necesito presionar o acomodar la zona para vaciar'], ['no_se', 'No sé cómo describirlo']]),
      eleccion('pisoDesde', '¿Desde cuándo lo notas?', periodo),
      eleccion('pisoImpacto', '¿Cómo afecta tu vida diaria?', impacto),
      texto('pisoTratamientos', '¿Has usado pesario, fisioterapia o tenido cirugía por esto?', 'Cuál, cuándo y cómo te fue; o no'),
    ],
  },
};

ENTREVISTA.cervical.preguntas.find(q => q.id === 'cervicalTratamientoDetalle').mostrarSi = h => h.cervicalTratamientoPrevio === 'si';

const siNo = opciones([[true, 'Sí'], [false, 'No'], ['no_se', 'No lo sé'], ['prefiero_no', 'Prefiero comentarlo en consulta']]);
const binaria = (id, etiqueta, extra = {}) => eleccion(id, etiqueta, siNo, extra);
const numero = (id, etiqueta, min, max, extra = {}) => ({ id, etiqueta, tipo: 'numero', min, max, ...extra });
const tema = (h, id) => h.temasConsulta?.includes(id);
const menstrua = h => ['menstrua_regular', 'menstrua_irregular'].includes(h.etapaReproductiva);

ENTREVISTA.contexto.preguntas.push(
  binaria('histerectomiaConfirmada', '¿Te han retirado el útero en una cirugía?'),
  numero('edadMenopausiaReportada', '¿A qué edad te confirmaron la menopausia? (si lo recuerdas)', 10, 70,
    { mostrarSi: h => h.causaAusenciaRegla === 'menopausia_confirmada' }),
);
ENTREVISTA.sangrado.preguntas.push(
  numero('sangradoIntervaloDias', 'Del primer día de una regla al primer día de la siguiente, ¿cuántos días suelen pasar?', 10, 180, { mostrarSi: menstrua }),
  binaria('sangradoDesdeMenarca', '¿Tus reglas han sido muy abundantes desde la primera vez que te bajó?'),
  multiple('sangradoOtrosSitios', 'Aparte de la regla, ¿te ha pasado algo de esto?', [
    ['dental', 'Me costó parar el sangrado después de que me sacaron un diente'], ['cirugia', 'Costó parar el sangrado después de una cirugía'],
    ['nariz', 'Me sangra la nariz con frecuencia y cuesta parar el sangrado'], ['moretones', 'Me salen moretones seguido sin recordar un golpe'], ['ninguna', 'Ninguno de estos'],
  ]),
  binaria('sangradoFamiliar', '¿Hay alguien en tu familia de sangre a quien le cueste parar un sangrado, por ejemplo, después de una cirugía o de que le saquen un diente?',
    { mostrarSi: h => h.sangradoDesdeMenarca === true || h.sangradoTipos?.includes('muy_abundante') }),
);
ENTREVISTA.dolor.preguntas.push(
  eleccion('dolorRelacionCiclo', 'Pensando en los últimos 3 meses, ¿cuándo te duele en relación con tu regla?', opciones([
    ['solo_regla', 'Aparece solo con la regla'], ['empeora_regla', 'Existe otros días y empeora con la regla'],
    ['sin_relacion', 'No noto relación con la regla'], ['no_menstruo', 'No menstruo'], ['no_se', 'No estoy segura'],
  ])),
  binaria('dolorProfundoPenetracion', 'Durante una relación con penetración, ¿sientes dolor en el fondo, por dentro?',
    { opciones: [...siNo, { valor: 'no_aplica', etiqueta: 'No he tenido penetración recientemente' }] }),
  binaria('dolorEvacuarCiclico', 'En los días cercanos a tu regla, ¿aparece o aumenta el dolor al evacuar (hacer del baño)?',
    { mostrarSi: h => h.dolorRelacionCiclo !== 'no_menstruo' }),
  binaria('dolorOrinarCiclico', 'En los días cercanos a tu regla, ¿aparece o aumenta el dolor al orinar?',
    { mostrarSi: h => h.dolorRelacionCiclo !== 'no_menstruo' }),
  binaria('dolorMejoraVaciar', '¿Te duele más cuando tienes la vejiga llena y sientes alivio después de orinar?'),
  binaria('dolorMovimiento', '¿El dolor cambia al caminar, sentarte, hacer ejercicio o cambiar de postura?'),
);
ENTREVISTA.ciclos.preguntas.push(
  numero('reglasUltimoAnio', '¿Cuántas menstruaciones tuviste en los últimos 12 meses? (aproximadas)', 0, 30),
  binaria('cicloMayor90', 'En ese año, ¿pasaste más de 90 días seguidos sin menstruar?'),
  binaria('cambiosRapidosVozVello', '¿El vello aumentó rápidamente o tu voz cambió en pocos meses?'),
);
ENTREVISTA.urinario.preguntas.push(
  binaria('urinarioProteccion', '¿Usas una toalla o un protector porque a veces se te sale la orina?', { mostrarSi: h => h.sintomasUrinarios?.includes('escapes') }),
  numero('miccionesDia', 'En un día normal, ¿cuántas veces vas a orinar mientras estás despierta?', 0, 40),
  numero('miccionesNoche', 'Una vez que te duermes, ¿cuántas veces te despiertas para orinar?', 0, 15),
);
ENTREVISTA.mama.preguntas.push(
  binaria('mamaFamiliarPrimerGradoMenor50', '¿Tu madre, hermana o hija tuvo cáncer de mama antes de los 50 años?'),
  binaria('mamaDosFamiliares', '¿Dos o más familiares de tu familia biológica tuvieron cáncer de mama?'),
  binaria('mamaFamiliarOvario', '¿Algún familiar de tu familia biológica tuvo cáncer de ovario?'),
  binaria('mamaFamiliarHombre', '¿Algún hombre de tu familia biológica tuvo cáncer de mama?'),
  binaria('mamaVarianteConfirmada', '¿Un estudio genético tuyo confirmó una variante de riesgo para cáncer de mama, como BRCA1 o BRCA2?'),
  texto('mamaFamiliaDetalle', 'Si respondiste sí, ¿qué familiar y a qué edad? (si lo sabes)', 'Parentesco, tipo de cáncer, edad y de qué lado de la familia'),
);
ENTREVISTA.metabolico.preguntas.push(
  binaria('tomaAntihipertensivo', '¿Tomas actualmente algún medicamento indicado para bajar la presión?'),
  binaria('tomaEstatina', '¿Tomas una estatina para el colesterol (por ejemplo, atorvastatina o rosuvastatina)?'),
  binaria('eventoCardiovascularConfirmado', '¿Un médico te ha confirmado infarto del corazón, enfermedad de sus arterias o un evento vascular cerebral?'),
);
ENTREVISTA.historia = { titulo: 'Antecedentes para la valoración', fuente: 'Checklist 71 / U.S. MEC 2024', preguntas: [
  numero('cigarrillosDia', '¿Cuántos cigarrillos fumas en un día habitual?', 1, 100, { mostrarSi: h => h.tabacoEstado === 'actual' }),
] };
ENTREVISTA.osea = { titulo: 'Huesos, fracturas y caídas', fuente: 'FRAX / Menopausia AMOLCA 24', preguntas: [
  binaria('fracturaBajoImpacto', 'Después de los 40 años, ¿te fracturaste al caer desde tu propia altura o con un golpe leve?'),
  binaria('fracturaCaderaVertebra', '¿Esa fractura fue de cadera o de una vértebra?', { mostrarSi: h => h.fracturaBajoImpacto === true }),
  binaria('fracturaCaderaProgenitor', '¿Tu madre o padre tuvo una fractura de cadera?'),
  binaria('corticoidesTresMeses', '¿Has tomado cortisona por boca, como prednisona, durante 3 meses o más?'),
  binaria('artritisReumatoideConfirmada', '¿Un médico te ha diagnosticado artritis reumatoide?'),
  numero('caidasUltimoAnio', '¿Cuántas caídas tuviste en los últimos 12 meses?', 0, 100),
  texto('oseaEstudios', '¿Tienes densitometría o tratamiento para los huesos?', 'Fecha del estudio, medicamento y tiempo de uso, si lo recuerdas'),
] };
ENTREVISTA['plan-reproductivo'] = { titulo: 'Preferencias y experiencia anticonceptiva', fuente: 'U.S. MEC 2024 / Checklist 71', preguntas: [
  multiple('anticoncepcionPrioridades', '¿Qué es importante para ti al elegir un método?', [
    ['eficacia', 'Evitar un embarazo con alta eficacia'], ['sin_hormonas', 'No usar hormonas'],
    ['sangrado', 'Mejorar el sangrado o los cólicos'], ['olvidos', 'No tener que recordarlo todos los días'],
    ['reversible', 'Poder suspenderlo cuando lo decida'], ['no_se', 'Quiero conocer las opciones'],
  ]),
  texto('anticoncepcionExperiencia', '¿Qué métodos probaste y por qué los suspendiste?', 'Qué te funcionó, efectos molestos o dificultad para usarlos'),
] };
ENTREVISTA['plan-reproductivo'].preguntas.forEach(q => { q.mostrarSi = h => tema(h, 'anticoncepcion'); });

/** Solo valida respuestas presentes. Omitir una pregunta opcional no es un "no". */
export function validarEntrevista(paso, hc = {}) {
  for (const q of preguntasEntrevista(paso, hc)) {
    const v = hc[q.id];
    if (!tieneRespuesta(v)) continue;
    const invalida = q.tipo === 'numero'
      ? typeof v !== 'number' || !Number.isInteger(v) || v < q.min || v > q.max
      : q.tipo === 'opcion' ? !q.opciones.some(o => o.valor === v)
        : q.tipo === 'multiple' ? !Array.isArray(v) || v.some(x => !q.opciones.some(o => o.id === x)) || (v.length > 1 && v.some(x => ['ninguna', 'no_se', 'prefiero_no'].includes(x))) : typeof v !== 'string' || v.length > 3000;
    if (invalida) return { ok: false, campo: q.id, mensaje: q.tipo === 'numero' ? `Revisa el valor: debe estar entre ${q.min} y ${q.max}, o déjalo vacío si no lo sabes.` : 'Revisa esta respuesta o déjala vacía para comentarla en consulta.' };
  }
  return { ok: true };
}

export const CAMPOS_ENTREVISTA = Object.values(ENTREVISTA).flatMap(m => m.preguntas);
export function preguntasEntrevista(paso, hc = {}) {
  if (paso === 'intimidad' && hc.molestiasIntimas?.includes('prefiero_no')) return [];
  return (ENTREVISTA[paso]?.preguntas || []).filter(q => !q.mostrarSi || q.mostrarSi(hc));
}
export function tieneRespuesta(valor) {
  return valor != null && (Array.isArray(valor) ? valor.length > 0 : String(valor).trim() !== '');
}
export function valorEntrevista(q, valor) {
  const etiqueta = v => q.opciones?.find(o => (o.valor ?? o.id) === v)?.etiqueta || String(v);
  return Array.isArray(valor) ? valor.map(etiqueta).join(', ') : etiqueta(valor);
}
export function limpiarEntrevista(hc, pasosActivos) {
  const limpio = { ...hc };
  Object.entries(ENTREVISTA).forEach(([paso, modulo]) => {
    const visibles = new Set(pasosActivos.includes(paso) ? preguntasEntrevista(paso, hc).map(q => q.id) : []);
    modulo.preguntas.forEach(q => { if (!visibles.has(q.id)) delete limpio[q.id]; });
  });
  return limpio;
}
export function resumenEntrevista(hc = {}, contextoVisible = hc) {
  return Object.entries(ENTREVISTA).map(([id, m]) => ({
    id, titulo: m.titulo,
    respuestas: preguntasEntrevista(id, contextoVisible).filter(q => tieneRespuesta(hc[q.id])).map(q => ({ id: q.id, pregunta: q.etiqueta, respuesta: valorEntrevista(q, hc[q.id]) })),
  })).filter(m => m.respuestas.length);
}
