// Comparaciones de autorreporte dentro del mismo problema. No es una escala diagnóstica.
export const PREGUNTA_MOLESTIA = 'En los últimos 7 días, ¿cuánto te molestó este problema en promedio?';
export const PREGUNTA_TEMA = '¿Cuál es el tema principal que te gustaría comparar en tus próximas visitas?';
export const PREGUNTA_PRIORIDAD = '¿Qué molestia te gustaría revisar y comparar entre visitas?';
export const REPETIR_MRS = 'Volver a contestar la escala de menopausia para comparar mis síntomas con la visita anterior.';
export const PREGUNTA_PROBLEMA = '¿Qué problema de tu última consulta quieres revisar hoy?';
const opciones = pares => pares.map(([valor, etiqueta]) => ({ valor, etiqueta }));
export const PROBLEMAS = Object.fromEntries(Object.entries({
  climaterio: [['bochornos','Bochornos'], ['sueno','Dificultad para dormir'], ['sequedad','Resequedad vaginal']],
  intimidad: [['sequedad','Resequedad vaginal'], ['dolor_relaciones','Dolor en las relaciones'], ['deseo','Cambios en el deseo sexual']],
  urinario: [['escapes','Escapes de orina'], ['urgencia','Ganas repentinas de orinar'], ['vaciado','Dificultad para vaciar la vejiga']],
  sangrado: [['abundante','Reglas abundantes'], ['intermenstrual','Sangrado entre reglas']],
  dolor: [['dolor_menstrual','Dolor con la regla'], ['dolor_pelvico','Dolor en la pelvis']],
}).map(([k, v]) => [k, opciones([...v, ['otro','Otro problema de este tema']])]));
export const PREGUNTAS_SEGUIMIENTO = [
  {id:'evolucion', pregunta:'Desde la última consulta, ¿cómo ha cambiado este problema?', requerida:true,
    opciones:opciones([['resuelto','Ya se quitó'],['mejor','Estoy mejor'],['igual','Sigo igual'],['peor','Estoy peor'],['variable','Va y viene'],['no_se','No estoy segura']])},
  {id:'tratamiento', pregunta:'¿Qué tratamiento o cuidados probaste desde entonces?', ejemplo:'Escribe el nombre si lo recuerdas. Puedes decir que no usaste ninguno.'},
  {id:'adherencia', pregunta:'Si te indicaron un tratamiento, ¿cómo te fue al seguirlo?',
    opciones:opciones([['completo','Pude seguirlo como se indicó'],['parcial','Solo pude seguir una parte'],['no_iniciado','Todavía no lo empecé'],['sin_indicacion','No me indicaron tratamiento'],['prefiero_no','Prefiero comentarlo en consulta']])},
  {id:'persiste', pregunta:'¿Qué molestia sigue afectándote o qué se te ha hecho difícil?'},
  {id:'nuevosSintomas', pregunta:'¿Ha aparecido alguna molestia nueva?',requerida:true,
    opciones:opciones([['si','Sí'],['no','No'],['no_se','No estoy segura']])},
  {id:'detalleNuevo', pregunta:'¿Qué molestia apareció y desde cuándo?'},
  {id:'cambiosSalud', pregunta:'¿Hubo algún cambio en tus medicamentos, alergias o salud que debamos conocer?'},
];
export const esSeguimiento = hc => hc?.visitaSeguimiento === true;
export function temaPrincipal(hc = {}) {
  const temas = Array.isArray(hc.temasConsulta) ? hc.temasConsulta : [];
  return temas.length === 1 ? temas[0] : temas.includes(hc.seguimientoActual?.tema) ? hc.seguimientoActual.tema : '';
}
export function seguimientoBreve(hc = {}) {
  const senales = hc.senalesUrgencia;
  return esSeguimiento(hc)
    && hc.seguimientoActual?.ampliar !== true
    && hc.seguimientoActual?.nuevosSintomas !== 'si'
    && (!senales || (Array.isArray(senales) && senales.every(id => id === 'ninguna')));
}
export function preguntasDeSeguimiento(actual = {}) {
  return PREGUNTAS_SEGUIMIENTO.filter(q => q.id !== 'detalleNuevo' || actual.nuevosSintomas === 'si');
}
export function capturarSeguimiento(hc = {}) {
  const s = hc.seguimientoActual || {};
  const tema = temaPrincipal(hc);
  const problema = typeof hc.motivo === 'string' ? hc.motivo.trim() : '';
  const opcionesProblema = Object.hasOwn(PROBLEMAS, tema) ? PROBLEMAS[tema] : [];
  const elegido = opcionesProblema.find(o => o.valor === s.problemaClave && o.valor !== 'otro');
  const intensidad = s.molestiaUltimos7Dias;
  const tieneIntensidad = Number.isInteger(intensidad) && intensidad >= 0 && intensidad <= 10;
  const subsecuente = esSeguimiento(hc);
  if (!tema || !problema || (!subsecuente && !tieneIntensidad)) return null;
  const datos = { version:1, tema, problema, respuestas:[] };
  if (elegido) datos.problemaClave = elegido.valor;
  datos.respuestas.push({ id:'problema', pregunta:subsecuente ? PREGUNTA_PROBLEMA : '¿Qué te gustaría resolver en esta consulta?', respuesta:problema });
  if (elegido) datos.respuestas.push({ id:'problemaClave', pregunta:PREGUNTA_PRIORIDAD, respuesta:elegido.etiqueta });
  if (tieneIntensidad) {
    datos.molestiaUltimos7Dias = intensidad;
    datos.respuestas.push({id:'molestiaUltimos7Dias',pregunta:PREGUNTA_MOLESTIA,respuesta:intensidad+' de 10'});
  }
  if (subsecuente) for (const q of preguntasDeSeguimiento(s)) {
    const valor = typeof s[q.id] === 'string' ? s[q.id].trim().slice(0,3000) : '';
    if (!valor) continue;
    const etiqueta = q.opciones ? q.opciones.find(o => o.valor === valor)?.etiqueta : valor;
    if (!etiqueta) continue;
    datos[q.id] = valor;
    datos.respuestas.push({id:q.id,pregunta:q.pregunta,respuesta:etiqueta});
  }
  return datos;
}
export function validarSeguimiento(hc) {
  const s = hc?.seguimientoActual || {};
  if(!temaPrincipal(hc)) return {ok:false,campo:'seguimiento-tema',mensaje:'Elige el tema principal para este seguimiento.'};
  for (const q of PREGUNTAS_SEGUIMIENTO.filter(q => q.requerida)) {
    if (!q.opciones.some(o => o.valor === s[q.id])) return {ok:false,campo:'seguimiento-'+q.id,mensaje:'Elige una respuesta o indica que no estás segura.'};
  }
  return {ok:true};
}
export function intervaloYaReportado(hc = {}) {
  const dias = hc.sangradoIntervaloDias;
  return hc.temasConsulta?.includes('sangrado') && hc.temasConsulta.includes('ciclos')
    && ['menstrua_regular','menstrua_irregular'].includes(hc.etapaReproductiva)
    && Number.isInteger(dias) && dias >= 10 && dias <= 180;
}

// La prioridad y el selector de temas íntimos preguntan qué quiere revisar hoy.
// Una intensidad, una frecuencia o una puntuación de otro periodo nunca se copian.
export function aplicarPrioridadIntima(historia, cambios) {
  const nueva = {...historia, ...cambios};
  const tema = temaPrincipal(nueva);
  const clave = nueva.seguimientoActual?.problemaClave;
  const compatible = Array.isArray(nueva.temasConsulta) && nueva.temasConsulta.includes('intimidad')
    && Object.hasOwn(PROBLEMAS, tema) && PROBLEMAS[tema].some(o => o.valor === clave)
    && ['sequedad', 'deseo', 'dolor_relaciones'].includes(clave);
  const previas = Array.isArray(nueva.molestiasIntimas) ? nueva.molestiasIntimas : [];
  const elecciones = previas.filter(id => id !== historia.intimidadDesdePrioridad);
  delete nueva.intimidadDesdePrioridad;
  if (compatible && !elecciones.includes('prefiero_no') && !elecciones.includes(clave)) {
    nueva.intimidadDesdePrioridad = clave;
    elecciones.push(clave);
  }
  nueva.molestiasIntimas = elecciones;
  return nueva;
}
