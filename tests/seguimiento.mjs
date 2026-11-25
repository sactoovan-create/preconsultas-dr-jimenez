import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { capturarSeguimiento, aplicarPrioridadIntima, PREGUNTA_MOLESTIA, intervaloYaReportado } from '../core/seguimiento.js';
import { MRS_IDS, pasosPara, validarPaso, alertaUrgente } from '../core/preconsultaFlow.js';
import { cuestionariosSugeridos, insertarPasosCuestionarios } from '../core/cuestionarios/index.js';
import { profundizacionesSugeridas, filtrarProfundizacionesActivas } from '../core/profundos/index.js';
import { invitacionCitaDesdeHash, invitacionDelBorrador } from '../core/invitacionCita.js';
import { cargarIntentoEnvio, guardarAdjuntosIntento, trasladarIntentoAContinuacion, borrarIntentoEnvio } from '../core/intentoEnvio.js';
import { construirRegistro } from '../core/registroPreconsulta.js';
import { resumenLectura } from '../core/lecturaRespuesta.js';

const base = {
  visitaSeguimiento: true, motivo: 'Quiero revisar los bochornos',
  temasConsulta: ['climaterio'], senalesUrgencia: ['ninguna'], etapaReproductiva: 'sin_regla_12m',
  seguimientoActual: { problemaClave: 'bochornos', molestiaUltimos7Dias: 0, evolucion: 'mejor', nuevosSintomas: 'no' },
};
const ruta = hc => insertarPasosCuestionarios(pasosPara({ hc }), cuestionariosSugeridos({ hc })).map(p=>p.id);
const medir = (hc, s={}) => capturarSeguimiento({...hc, seguimientoActual: {...hc.seguimientoActual, ...s}});
const enviar = (hc, extras={}) => construirRegistro({hc, dolor:{}, mrs:{}, ...extras}, null);

test('primera visita y seguimiento sólo comparan una respuesta explícita del mismo periodo de siete días', () => {
  const primera = enviar({...base, visitaSeguimiento:false});
  const segunda = enviar(base);
  const basal = primera.autoReporte.lineaBaseSeguimiento;
  const control = segunda.autoReporte.seguimiento;
  assert.equal(primera.autoReporte.seguimiento, undefined);
  assert.deepEqual([basal.version, basal.tema, basal.problemaClave], [control.version, control.tema, control.problemaClave]);
  assert.deepEqual(basal.respuestas.find(r=>r.id==='molestiaUltimos7Dias'), {id:'molestiaUltimos7Dias', pregunta:PREGUNTA_MOLESTIA, respuesta:'0 de 10'});
  assert.equal(basal.evolucion, undefined);
  assert.equal(control.evolucion, 'mejor');
  assert.equal(control.molestiaUltimos7Dias, 0);
  assert.equal(control.respuestas.find(r=>r.id==='evolucion').respuesta, 'Estoy mejor');
  assert.equal(segunda.autoReporte.hc.seguimientoActual, undefined);
  assert.equal(medir(base, {molestiaUltimos7Dias:null}).molestiaUltimos7Dias, undefined);
  assert.equal(medir({...base,visitaSeguimiento:false},{molestiaUltimos7Dias:15}), null);
  assert.equal(medir(base,{problemaClave:'otro'}).problemaClave, undefined);
  assert.equal(medir(base,{detalleNuevo:'valor oculto'}).detalleNuevo, undefined);
});

test('seguimiento estable conserva seguridad y PHQ, sin obligar a repetir antecedentes o MRS', () => {
  const pasos = ruta(base);
  assert.ok(pasos.includes('seguridad') && pasos.includes('seguimiento') && pasos.includes('cuestionario:phq9'));
  assert.ok(!pasos.includes('antecedentes') && !pasos.includes('climaterio'));
  const r = enviar(base);
  assert.equal(r.autoReporte.seguimiento.escalaMenopausia, 'omitida');
  assert.equal(r.resumen.menopausia.total, null);
  assert.ok(!resumenLectura(r).pendientes.some(p=>p.includes('MRS')));
  assert.ok(validarPaso('seguimiento',{hc:base}).ok);
  assert.ok(!validarPaso('seguimiento',{hc:{...base,seguimientoActual:{}}}).ok);
  assert.ok(!validarPaso('seguimiento',{hc:{...base,temasConsulta:['dolor','control']}}).ok);
  assert.ok(ruta({...base,temasConsulta:['dolor']}).includes('cuestionario:csi'));
});

test('repetir voluntariamente MRS activa exactamente sus once reactivos originales sin desplegar primera visita', () => {
  const hc = {...base, seguimientoActual:{...base.seguimientoActual,repetirMrs:true}};
  assert.ok(ruta(hc).includes('climaterio') && !ruta(hc).includes('historia'));
  assert.equal(validarPaso('climaterio',{hc,mrs:{mrs_bochornos:0}}).ok, false);
  const mrs = Object.fromEntries(MRS_IDS.map((id, i)=>[id,i%5]));
  assert.equal(validarPaso('climaterio',{hc,mrs}).ok, true);
  const r = enviar(hc, {mrs});
  assert.deepEqual(r.autoReporte.mrs, mrs);
  assert.equal(r.resumen.menopausia.respondidos, 11);
  assert.equal(r.autoReporte.seguimiento.escalaMenopausia, undefined);
});

test('síntoma nuevo, alarma y petición voluntaria amplían la entrevista; una alarma conserva la valoración inmediata', () => {
  const nuevos = {...base, seguimientoActual:{...base.seguimientoActual,nuevosSintomas:'si',detalleNuevo:'Nueva molestia'}};
  const urgente = {...base,senalesUrgencia:['dolor_subito_intenso']};
  for(const hc of [nuevos, urgente, {...base, seguimientoActual:{...base.seguimientoActual,ampliar:true}}]) {
    assert.ok(ruta(hc).includes('historia') && ruta(hc).includes('climaterio'));
  }
  assert.ok(alertaUrgente({hc:urgente}).urgente && ruta(urgente).includes('dolor'));
  assert.equal(medir(nuevos).detalleNuevo,'Nueva molestia');
  assert.ok(ruta({...base,visitaSeguimiento:false}).includes('antecedentes'));
});

test('la selección íntima se reutiliza una sola vez, se puede cambiar y no imputa escalas ni deseo/actividad', () => {
  const inicial = {temasConsulta:['climaterio','intimidad'], molestiasIntimas:['satisfaccion']};
  const conPrioridad = aplicarPrioridadIntima(inicial, {seguimientoActual:{tema:'climaterio',problemaClave:'sequedad'}});
  assert.deepEqual(conPrioridad.molestiasIntimas, ['satisfaccion','sequedad']);
  const ajustada = aplicarPrioridadIntima(conPrioridad, {seguimientoActual:{tema:'intimidad',problemaClave:'deseo'}});
  assert.deepEqual(ajustada.molestiasIntimas,['satisfaccion','deseo']);
  assert.equal(ajustada.intimidadDesdePrioridad,'deseo');
  assert.deepEqual(filtrarProfundizacionesActivas({hc:ajustada},{}), {});
  assert.deepEqual(enviar(ajustada).autoReporte.mrs,{});
  const privada = aplicarPrioridadIntima(ajustada,{molestiasIntimas:['prefiero_no']});
  assert.deepEqual(privada.molestiasIntimas,['prefiero_no']);
  assert.deepEqual(profundizacionesSugeridas({hc:privada,mrs:{mrs_sequedad:4,mrs_sexual:4}}),[]);
  const ciclos = {temasConsulta:['sangrado','ciclos'],etapaReproductiva:'menstrua_regular',sangradoIntervaloDias:28};
  assert.ok(intervaloYaReportado(ciclos));
  assert.ok(!intervaloYaReportado({...ciclos,sangradoIntervaloDias:181}));
});

test('invitaciones y continuaciones aíslan folios, estudios y escrituras tardías del intento anterior', () => {
  const inv='a'.repeat(64);
  assert.equal(invitacionCitaDesdeHash('#cita='+inv),inv);
  assert.equal(invitacionCitaDesdeHash('#continuar=otra'), '');
  assert.equal(invitacionCitaDesdeHash('#cita='+inv+'&cita='+inv), 'invalida');
  assert.equal(invitacionDelBorrador({invitacionCita:'abc'}), 'invalida');
  assert.equal(enviar(base).invitacionCita, undefined);
  assert.equal(enviar(base,{invitacionCita:inv}).invitacionCita, inv);
  assert.equal(enviar(base,{invitacionCita:'texto cualquiera'}).invitacionCita, 'invalida');
  const mapa=new Map();
  const storage={getItem:k=>mapa.get(k),setItem:(k,v)=>mapa.set(k,v),removeItem:k=>mapa.delete(k)};
  const cargar=ambito=>cargarIntentoEnvio({ambito,storage,backendActivo:true,crearId:randomUUID,crearCarpeta:randomUUID});
  const primero=cargar('');
  guardarAdjuntosIntento([{nombre:'previo',path:primero.estudiosFolder+'/ejemplo'}],storage,primero.respuestaId);
  const porCita=cargar('cita:'+inv);
  assert.notEqual(porCita.respuestaId,primero.respuestaId);
  assert.deepEqual(porCita.adjuntos, []);
  guardarAdjuntosIntento([{nombre:'tarde',path:'folder/a'}],storage,primero.respuestaId);
  borrarIntentoEnvio(storage,primero.respuestaId);
  const reintento=cargar('cita:'+inv);
  assert.equal(reintento.respuestaId,porCita.respuestaId);
  assert.deepEqual(reintento.adjuntos, []);
  trasladarIntentoAContinuacion(porCita.respuestaId,'privada',storage);
  assert.equal(cargar('continuar:privada').respuestaId,porCita.respuestaId);
  assert.notEqual(cargar('').respuestaId,porCita.respuestaId);
});
