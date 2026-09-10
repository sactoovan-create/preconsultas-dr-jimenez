import assert from 'node:assert/strict';
import { ENTREVISTA, CAMPOS_ENTREVISTA, limpiarEntrevista, preguntasEntrevista, resumenEntrevista, valorEntrevista } from '../core/entrevista.js';
import { pasosPara, porcentajePaso, validarPaso, filtrarHistoriaActiva, MRS_IDS, FORMULARIO_VERSION } from '../core/preconsultaFlow.js';
import { instrumentosPara } from '../core/ruteoClinico.js';
import { pacienteDesdeRespuesta } from '../core/precarga.js';
import { evaluarMenopausia } from '../instruments/menopausia/engine.js';

const ids = CAMPOS_ENTREVISTA.map(q => q.id);
assert.equal(new Set(ids).size, ids.length, 'IDs de preguntas únicos');
assert.equal(FORMULARIO_VERSION, '2026.09.4');
for (const tema of ['cervical', 'vulvar', 'metabolico', 'piso-pelvico']) {
  assert.ok(pasosPara({hc:{temasConsulta:[tema]}}).some(p=>p.id===tema));
  assert.ok(!pasosPara({hc:{temasConsulta:['control']}}).some(p=>p.id===tema));
  const hc = {temasConsulta:[tema]};
  for (const q of ENTREVISTA[tema].preguntas) hc[q.id] = q.tipo === 'texto' ? 'Dato sintético' : q.tipo === 'multiple' ? [q.opciones[0].id] : q.opciones[0].valor;
  assert.ok(resumenEntrevista(limpiarEntrevista(hc,[tema])).some(m=>m.id===tema), 'La respuesta llega al lector');
  assert.ok(ENTREVISTA[tema].preguntas.every(q=>!Object.hasOwn(limpiarEntrevista(hc,[]),q.id)), 'No se envían respuestas ocultas');
}
assert.equal(preguntasEntrevista('intimidad',{molestiasIntimas:['prefiero_no']}).length,0);
assert.ok(!preguntasEntrevista('cervical',{cervicalTratamientoPrevio:'no'}).some(q=>q.id==='cervicalTratamientoDetalle'));
assert.ok(!Object.hasOwn(limpiarEntrevista({cervicalTratamientoPrevio:'no',cervicalTratamientoDetalle:'Anterior'},['cervical']),'cervicalTratamientoDetalle'));
assert.equal(valorEntrevista(ENTREVISTA.metabolico.preguntas[0],['glucosa']), 'Glucosa, diabetes o resistencia a la insulina');
assert.ok(instrumentosPara({paciente:{edad:30},autoReporte:{hc:{temasConsulta:['metabolico']}}}).instrumentosSugeridos.some(s=>s.instrumento==='cardiometabolico'));
assert.equal(instrumentosPara({paciente:{edad:30},autoReporte:{hc:{metabolicoTratamiento:'Tirzepatida'}}}).instrumentosSugeridos.find(s=>s.instrumento==='cardiometabolico')?.prioridad,'alta');
assert.equal(instrumentosPara({}).version,5);
const legado = {etapaReproductiva:'menopausia'};
assert.equal(filtrarHistoriaActiva(legado).etapaReproductiva,'sin_regla_12m');
assert.equal(legado.etapaReproductiva,'menopausia', 'No muta el registro historico');
assert.ok(!instrumentosPara({paciente:{edad:32},autoReporte:{hc:{etapaReproductiva:'sin_regla_12m',causaAusenciaRegla:'hormonas',sangrado:true}}}).banderas.some(b=>/posmenop/i.test(b.mensaje)));
const mrs = Object.fromEntries(MRS_IDS.map(k=>[k,0]));
for(const ausente of [null,'',undefined]) assert.ok(!validarPaso('climaterio',{mrs:{...mrs,mrs_sueno:ausente}}).ok);
assert.ok(validarPaso('climaterio',{mrs}).ok);
assert.ok(!validarPaso('dolor',{dolor:{intensidad:null,inicio:'subito'}}).ok);
const pasos = pasosPara({hc:{temasConsulta:Object.keys(ENTREVISTA)}});
assert.equal(porcentajePaso('envio',pasos),95);
for (let i=1;i<pasos.length;i++) assert.ok(porcentajePaso(pasos[i].id,pasos) >= porcentajePaso(pasos[i-1].id,pasos));
for(const campo of ['cancerMamaPersonal','enfTrombosis']) {
  const p = pacienteDesdeRespuesta({paciente:{edad:50},autoReporte:{hc:{[campo]:true}}});
  assert.equal(evaluarMenopausia({...p,signos:{}},{}).candidatura.tipo,'contraindicada');
}
assert.equal(pacienteDesdeRespuesta({autoReporte:{hc:{enfCorazon:true}}}).antecedentes.ecvEstablecida,undefined);
const incompleto = evaluarMenopausia({demografia:{edad:50},antecedentes:{},signos:{}},{});
assert.equal(incompleto.candidatura.tipo,'incompleta');
assert.equal(incompleto.noHormonales,null);
console.log(`Entrevista: ${ids.length} campos únicos, rutas, limpieza, lectura, completitud y antecedentes verificados.`);
