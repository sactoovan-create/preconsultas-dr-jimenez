/** Anamnesis complementaria, no escala validada. Fuentes y alcance en
 * docs/ENTREVISTA-2026-09.md. IDs compartidos por captura, resumen y lector. */
export const ENTREVISTA_VERSION = '1.0.0';
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
      eleccion('consultaTipo', '¿Qué necesitas de esta visita?', opciones([['primera', 'Valorar una molestia por primera vez'], ['seguimiento', 'Revisar cómo voy con un tratamiento'], ['resultados', 'Entender mis estudios o resultados'], ['segunda_opinion', 'Una segunda opinión'], ['prevencion', 'Revisión preventiva']])),
      texto('consultaPrioridad', '¿Qué es lo más importante que quieres resolver?', 'Una preocupación, una pregunta o algo que no quieres dejar pendiente'),
    ],
  },
  contexto: {
    titulo: 'Contexto menstrual', fuente: 'Libro maestro 12 y 20',
    preguntas: [
      eleccion('causaAusenciaRegla', 'Si no menstruas, ¿qué explicación te han dado?', opciones([['menopausia_confirmada', 'Mi médico confirmó menopausia'], ['hormonas', 'Uso de anticonceptivo u otro tratamiento hormonal'], ['cirugia', 'Cirugía'], ['en_estudio', 'Se está estudiando'], ['no_se', 'No sé'], ['no_aplica', 'Sí menstruo']]), { mostrarSi: (h) => ['sin_regla_menos_12m', 'sin_regla_12m', 'menopausia', 'histerectomia'].includes(h.etapaReproductiva) }),
    ],
  },
  sangrado: {
    titulo: 'Cómo te afecta el sangrado', fuente: 'MP-001 / Checklist 71',
    preguntas: [
      multiple('sangradoCambios', 'En un día de sangrado, ¿qué ha cambiado respecto a lo habitual?', [['proteccion', 'Necesito cambiar la protección mucho más seguido'], ['nocturno', 'Me levanto de noche a cambiarme'], ['mancha', 'Mancho ropa o sábanas'], ['coagulos', 'Expulso coágulos'], ['ninguna', 'Ninguna de estas']]),
      eleccion('sangradoImpacto', '¿Cómo afecta el sangrado a tus actividades?', impacto),
      texto('sangradoTratamientos', '¿Qué has usado para controlarlo y qué ocurrió?', 'Medicamento o tratamiento, cuándo lo usaste y si ayudó; o ninguno'),
    ],
  },
  dolor: {
    titulo: 'Evolución e impacto del dolor', fuente: 'MP-002 / Anamnesis de endometriosis',
    preguntas: [
      eleccion('dolorFrecuencia', '¿Con qué frecuencia tienes dolor?', opciones([['diario', 'Todos o casi todos los días'], ['episodios', 'Por episodios, con días sin dolor'], ['ciclo', 'En momentos parecidos de cada ciclo'], ['primera', 'Es la primera vez'], ['no_se', 'No estoy segura']])),
      eleccion('dolorImpacto', '¿Qué tanto ha cambiado tus actividades?', impacto),
      texto('dolorTratamientos', '¿Qué has intentado y cuánto te ayudó?', 'Medicamentos, calor, fisioterapia, cirugía u otro; o nada todavía'),
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
    titulo: 'Patrón de las molestias urinarias', fuente: 'Walters-Karram capítulo 09 / MP-004',
    preguntas: [
      eleccion('urinarioDesde', '¿Desde cuándo tienes estas molestias?', periodo),
      multiple('urinarioVaciado', 'Al orinar o después, ¿qué notas?', [['vaciado', 'Siento que no termino de vaciar la vejiga'], ['esfuerzo', 'Necesito hacer fuerza para orinar'], ['continuo', 'La pérdida es casi continua'], ['noche', 'Me despierto repetidamente para orinar'], ['ninguna', 'Ninguna de estas']]),
      texto('urinarioTratamientos', '¿Qué tratamientos o estudios has tenido por este problema?', 'Medicamentos, cultivos, ejercicios, fisioterapia o cirugía; o ninguno'),
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
export function resumenEntrevista(hc = {}) {
  return Object.entries(ENTREVISTA).map(([id, m]) => ({
    id, titulo: m.titulo,
    respuestas: preguntasEntrevista(id, hc).filter(q => tieneRespuesta(hc[q.id])).map(q => ({ id: q.id, pregunta: q.etiqueta, respuesta: valorEntrevista(q, hc[q.id]) })),
  })).filter(m => m.respuestas.length);
}
