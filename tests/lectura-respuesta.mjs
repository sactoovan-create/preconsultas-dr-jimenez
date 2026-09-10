// Evidencia local, sintetica: CONTRATO-PRECONSULTA.md; core/entrevista.js;
// core/preconsultaFlow.js; Respuestas.jsx; core/ruteoClinico.js.
// Ejecutar directamente, sin editar package.json: node tests/lectura-respuesta.mjs.
import assert from 'node:assert/strict';
import { CAMPOS_ENTREVISTA, resumenEntrevista } from '../core/entrevista.js';
import { MRS_IDS, filtrarHistoriaActiva } from '../core/preconsultaFlow.js';
import { etiquetaCampo, formatoRespuesta, gruposHistoria, resumenLectura, filtrarRespuestas } from '../core/lecturaRespuesta.js';

let pruebas = 0;
function prueba(nombre, fn) {
  fn();
  pruebas += 1;
  console.log(`OK ${nombre}`);
}
function congelar(valor) {
  if (valor && typeof valor === 'object') {
    Object.values(valor).forEach(congelar);
    Object.freeze(valor);
  }
  return valor;
}
const filas = hc => gruposHistoria(hc).flatMap(g => g.respuestas);
const mrsCon = valor => Object.fromEntries(MRS_IDS.map(id => [id, valor]));
const registro = (hc = {}, extra = {}) => ({ autoReporte: { hc }, ...extra });
const ids = lista => lista.map(r => r.id);

prueba('etiquetas conocidas, entrevista y fallback legible sin colisiones de prototipo', () => {
  assert.equal(etiquetaCampo('alergias'), 'Alergias');
  assert.equal(etiquetaCampo('datoAntiguo_extra'), 'Dato Antiguo extra');
  assert.equal(etiquetaCampo('resultadoVPHPrevio'), 'Resultado VPH Previo');
  assert.equal(etiquetaCampo('toString'), 'To String');
  assert.equal(formatoRespuesta('constructor'), 'constructor');
  for (const q of CAMPOS_ENTREVISTA) assert.equal(etiquetaCampo(q.id), q.etiqueta);
});

prueba('formato conserva false, 0, listas y objetos heredados; no inventa respuestas', () => {
  for (const vacio of [null, undefined, '', '  ', [], {}, [null, ''], { vacio: null }]) assert.equal(formatoRespuesta(vacio), '');
  assert.equal(formatoRespuesta(false), 'No');
  assert.equal(formatoRespuesta(true), 'S\u00ed');
  assert.equal(formatoRespuesta(0), '0');
  assert.equal(formatoRespuesta([false, 0, 'no_se', 'codigo_antiguo']), 'No, 0, no_se, codigo_antiguo');
  assert.equal(formatoRespuesta({ dosis: 0, usoPrevio: false, detalle: { hallazgo: 'Dato sint\u00e9tico' } }),
    'Detalle: Hallazgo: Dato sint\u00e9tico; Dosis: 0; Uso Previo: No');
  assert.equal(formatoRespuesta('2026-09-09'), '2026-09-09');
  assert.equal(formatoRespuesta('Sin cambios - informe_previo'), 'Sin cambios - informe_previo');
  assert.equal(formatoRespuesta('<b>dato sintetico</b>'), '<b>dato sintetico</b>', 'Devuelve texto, no HTML renderizado');
  assert.equal(formatoRespuesta('menopausia'), 'menopausia', 'Sin campo, el texto es literal');
  assert.match(filas({ etapaReproductiva: 'sin_regla_12m' })[0].respuesta, /causa por confirmar/);
});

prueba('opciones por campo: dolor mamario y cancer familiar no usan etiquetas de temas', () => {
  const hc = { sintomasMama: ['dolor'], cancerFamiliarTipos: ['mama'], sintomasUrinarios: ['ardor'], cambiosAndrogenicos: ['caidaCabello'] };
  const f = filas(hc);
  assert.equal(f.find(r => r.id === 'sintomasMama').respuesta, 'Dolor o sensibilidad persistente');
  assert.equal(f.find(r => r.id === 'cancerFamiliarTipos').respuesta, 'C\u00e1ncer de mama');
  assert.equal(f.find(r => r.id === 'sintomasUrinarios').respuesta, 'Ardor o dolor al orinar');
  assert.equal(f.find(r => r.id === 'cambiosAndrogenicos').respuesta, 'Ca\u00edda o adelgazamiento del cabello');
  assert.ok(!f.some(r => r.respuesta.includes('Dolor p\u00e9lvico')));
});

prueba('texto libre literal: motivo, alergias, medicamento, fechas y desconocidos', () => {
  for (const valor of ['no_se', 'dolor', 'mama', 'alergia_a_penicilina', '  texto_literal  ']) {
    assert.equal(formatoRespuesta(valor), valor);
    assert.equal(resumenLectura(registro({ motivo: valor })).motivo, valor);
    for (const campo of ['alergias', 'medicamentos', 'anticonceptivo', 'ultimoPapFecha', 'enfOtra', 'datoHistorico']) {
      assert.equal(filas({ [campo]: valor })[0].respuesta, valor, campo);
    }
  }
});

prueba('grupo dolor captura peor momento, inicio, meses cero, localizacion y asociados', () => {
  const dolor = congelar({ tiene: true, intensidad: 0, inicio: 'subito', meses: 0, localizacion: 'lado_derecho', asociados: ['menstruacion', 'nausea_vomito'], detalleAntiguo: 'texto_literal' });
  const grupo = gruposHistoria({}, dolor).find(g => g.id === 'dolor');
  assert.deepEqual(ids(grupo.respuestas), ['dolor.tiene', 'dolor.intensidad', 'dolor.inicio', 'dolor.meses', 'dolor.localizacion', 'dolor.asociados', 'dolor.detalleAntiguo']);
  assert.equal(grupo.respuestas.find(r => r.id === 'dolor.inicio').respuesta, 'De repente');
  assert.equal(grupo.respuestas.find(r => r.id === 'dolor.localizacion').respuesta, 'lado_derecho');
  assert.equal(grupo.respuestas.find(r => r.id === 'dolor.meses').respuesta, '0');
  assert.equal(grupo.respuestas.find(r => r.id === 'dolor.intensidad').respuesta, '0');
  assert.match(grupo.respuestas.find(r => r.id === 'dolor.intensidad').pregunta, /peor momento/);
  assert.equal(grupo.respuestas.find(r => r.id === 'dolor.asociados').respuesta, 'Durante la menstruaci\u00f3n, Con n\u00e1usea o v\u00f3mito');
  assert.match(resumenLectura({ autoReporte: { dolor } }).dolor.texto, /0\/10 en su peor momento/);
  assert.ok(gruposHistoria({}, { tiene: true, intensidad: null })[0].respuestas.some(r => r.respuesta === 'Intensidad no registrada'));
});

prueba('seis grupos semanticos y orden independiente de insercion', () => {
  const hc = congelar({
    datoAntiguo: { tratamiento: 'Ejemplo', dosis: 0 }, famDiabetes: false,
    ultimoPapFecha: 'septiembre 2020', embarazos: 0, enfDiabetes: false,
    alergias: 'Ninguna referida', medicamentos: 'Tratamiento sint\u00e9tico',
  });
  const grupos = gruposHistoria(hc);
  assert.deepEqual(ids(grupos), ['medicamentos-alergias', 'antecedentes', 'menstrual-reproductivo', 'tamizaje-mama', 'familiar', 'otros']);
  assert.deepEqual(ids(grupos[0].respuestas), ['medicamentos', 'alergias']);
  assert.deepEqual(grupos, gruposHistoria(Object.fromEntries(Object.entries(hc).reverse())));
  assert.equal(grupos[2].respuestas[0].respuesta, '0');
  assert.equal(grupos[4].respuestas[0].respuesta, 'No');
  assert.equal(grupos[5].respuestas[0].respuesta, 'Dosis: 0; Tratamiento: Ejemplo');
  for (const grupo of grupos) {
    assert.deepEqual(Object.keys(grupo), ['id', 'titulo', 'respuestas']);
    for (const fila of grupo.respuestas) assert.deepEqual(Object.keys(fila), ['id', 'pregunta', 'respuesta']);
  }
});

prueba('legado conserva datos obstetricos retirados, desconocidos y negativos', () => {
  const hc = congelar({
    etapaReproductiva: 'menopausia', semanasEmbarazo: 0, semanasPosparto: 8, lactancia: false,
    senalesMaternas: ['fiebre_materna'], marcaAntigua: false, cantidadAnterior: 0,
    archivoClinicoPrevio: [{ dato: 'Ejemplo', negativo: false }], acne: false, sangrado: false,
  });
  assert.equal(filas(hc).length, Object.keys(hc).length);
  assert.ok(filas(hc).some(f => f.id === 'marcaAntigua' && f.respuesta === 'No'));
  assert.ok(filas(hc).some(f => f.id === 'archivoClinicoPrevio' && f.respuesta.includes('Negativo: No')));
  assert.equal(hc.etapaReproductiva, 'menopausia', 'No migra etapas historicas');
});

prueba('no duplica motivo, contacto, metadatos ni respuestas visibles de entrevista', () => {
  const hc = {
    motivo: 'Ejemplo', telefono: '0000000000', correo: 'sintetica@example.invalid',
    nombre: 'Prueba', edad: 40, formularioVersion: '2026.09.3', entrevistaVersion: '1.0.0',
    temasConsulta: ['control'], antecedentesRevisados: true, version: 3, id: 'sintetico',
    creado: '2026-09-09', submittedAtClient: '2026-09-09', consentimiento: true, atribucion: {},
  };
  for (const q of CAMPOS_ENTREVISTA) hc[q.id] = q.tipo === 'multiple' ? [q.opciones[0].id]
    : q.tipo === 'texto' ? 'Respuesta sint\u00e9tica' : q.opciones[0].valor;
  hc.etapaReproductiva = 'sin_regla_12m';
  const mostradas = new Set(resumenEntrevista(hc).flatMap(g => ids(g.respuestas)));
  assert.equal(mostradas.size, CAMPOS_ENTREVISTA.length);
  assert.deepEqual(ids(filas(hc)), ['etapaReproductiva']);
});

prueba('respuesta condicional antigua no visible en entrevista se rescata en otros', () => {
  const hc = { cervicalTratamientoPrevio: 'no', cervicalTratamientoDetalle: 'Tratamiento hist\u00f3rico' };
  assert.ok(!resumenEntrevista(hc).flatMap(g => ids(g.respuestas)).includes('cervicalTratamientoDetalle'));
  assert.deepEqual(ids(filas(hc)), ['cervicalTratamientoDetalle']);
  assert.equal(gruposHistoria(hc)[0].id, 'otros');
  assert.equal(filas(hc)[0].respuesta, 'Tratamiento hist\u00f3rico');
});

prueba('excluye solo false comprobados de ramas limpiadas; mantiene cero y positivos', () => {
  const hc = filtrarHistoriaActiva({ entrevistaVersion: '1.0.0', temasConsulta: ['control'], senalesUrgencia: ['ninguna'], enfDiabetes: false, embarazos: 0 });
  const ocultos = ['acne', 'hirsutismo', 'caidaCabello', 'sangrado', 'escapesOrina'];
  assert.ok(ocultos.every(k => hc[k] === false));
  assert.ok(ocultos.every(k => !ids(filas(hc)).includes(k)));
  assert.ok(ids(filas(hc)).includes('enfDiabetes'));
  assert.ok(ids(filas(hc)).includes('embarazos'));
  for (const k of ocultos) {
    assert.ok(ids(filas({ ...hc, [k]: true })).includes(k));
    assert.ok(ids(filas({ ...hc, [k]: 0 })).includes(k));
    assert.ok(ids(filas({ ...hc, entrevistaVersion: undefined })).includes(k));
    assert.ok(ids(filas({ ...hc, entrevistaVersion: 'futura' })).includes(k));
    assert.ok(ids(filas({ ...hc, temasConsulta: null })).includes(k));
  }
  assert.ok(ocultos.every(k => ids(filas({ ...hc, temasConsulta: ['ciclos', 'sangrado', 'urinario'] })).includes(k)));
  assert.ok(ids(filas({ ...hc, senalesUrgencia: ['sangrado_abundante'] })).includes('sangrado'));
  assert.ok(ids(filas({ ...hc, senalesUrgencia: undefined })).includes('sangrado'));
});

prueba('MRS legacy sin reactivos no usa un resumen historico con total 0', () => {
  const resultado = resumenLectura({ version: 1, resumen: { menopausia: { total: 0, intensidad: 'leve' } } });
  assert.equal(resultado.mrs.completos, 0);
  assert.equal(resultado.mrs.total, 11);
  assert.equal(resultado.mrs.puntaje, null);
  assert.match(resultado.mrs.texto, /incompleta/);
  assert.ok(!resultado.mrs.texto.includes('sin s\u00edntomas'));
});

prueba('MRS requiere exactamente los 11 IDs con enteros numericos 0..4', () => {
  for (const invalido of [null, undefined, '', ' ', false, true, '0', '4', [], {}, -1, 5, 0.5, NaN, Infinity]) {
    const mrs = { ...mrsCon(0), mrs_sueno: invalido, reactivoDesconocido: 0 };
    const resultado = resumenLectura({ autoReporte: { mrs } }).mrs;
    assert.equal(resultado.completos, 10, `No convierte ${String(invalido)} a una respuesta`);
    assert.equal(resultado.puntaje, null);
    assert.match(resultado.texto, /incompleta \(10\/11\)/);
  }
  assert.equal(resumenLectura({ autoReporte: { mrs: { mrs_bochornos: 3 } } }).mrs.completos, 1);
  for (const valor of [0, 1, 2, 3, 4]) {
    const resultado = resumenLectura({ autoReporte: { mrs: mrsCon(valor) } }).mrs;
    assert.equal(resultado.completos, 11);
    assert.equal(resultado.total, 11);
    assert.equal(resultado.puntaje, valor * 11);
    assert.equal(resultado.texto.includes('sin s\u00edntomas'), valor === 0);
    assert.ok(!/leve|moderad|sever|diagn[o\u00f3]stico/i.test(resultado.texto), 'No agrega interpretacion de intensidad');
  }
});

prueba('dolor nulo o intensidad invalida queda pendiente; cero es valido', () => {
  for (const intensidad of [null, undefined, '', ' ', false, true, '0', -1, 11, NaN, Infinity]) {
    const resultado = resumenLectura({ autoReporte: { dolor: { tiene: true, intensidad } } });
    assert.match(resultado.dolor.texto, /intensidad no registrada/);
    assert.equal(resultado.dolor.pendiente, true);
    assert.ok(resultado.pendientes.includes(resultado.dolor.texto));
    assert.ok(!resultado.dolor.texto.includes('0/10'));
  }
  const cero = resumenLectura({ autoReporte: { dolor: { tiene: true, intensidad: 0, meses: 0 } } }).dolor;
  assert.match(cero.texto, /intensidad 0\/10/);
  assert.match(cero.texto, /0 meses/);
  assert.equal(cero.pendiente, false);
  assert.match(resumenLectura({ autoReporte: { dolor: null } }).dolor.texto, /intensidad no registrada/);
  assert.equal(resumenLectura({ autoReporte: { dolor: { tiene: false } } }).dolor.pendiente, false);
});

prueba('resumen de dolor legacy solo como fallback; autorreporte prevalece', () => {
  const r = { resumen: { dolor: { intensidad: 0, meses: 0 } } };
  assert.match(resumenLectura(r).dolor.texto, /intensidad 0\/10/);
  assert.equal(resumenLectura(r).dolor.pendiente, false);
  assert.match(resumenLectura({ ...r, autoReporte: { dolor: { tiene: true, intensidad: null } } }).dolor.texto, /intensidad no registrada/);
  assert.match(resumenLectura({ ...r, autoReporte: { dolor: { tiene: false } } }).dolor.texto, /no se\u00f1alado/);
});

prueba('alertas guardadas de urgencia, maternas, seguridad y ruteo con procedencia', () => {
  const r = congelar({
    autoReporte: { hc: { senalesUrgencia: ['ninguna', 'fiebre_dolor', 'fiebre_dolor', 'senal_antigua'], senalesMaternas: ['fiebre_materna'] } },
    alertaSeguridad: { urgente: true, embarazoConSintomas: true, saludMental: true, senales: ['desmayo_mareo'], senalesMaternas: ['cefalea_vision'] },
    ruteoClinico: { version: 1, banderas: [{ tipo: 'roja', mensaje: 'Texto_original guardado. No reinterpretar.' }, 'Bandera legacy'] },
  });
  const alertas = resumenLectura(r).alertas;
  assert.equal(alertas.length, 10);
  assert.deepEqual(alertas.find(a => a.mensaje.startsWith('Texto_original')), { mensaje: 'Texto_original guardado. No reinterpretar.', fuente: 'ruteoClinico.banderas' });
  assert.ok(alertas.some(a => a.mensaje === 'senal antigua'));
  assert.ok(!alertas.some(a => a.mensaje === 'Ninguna'));
  assert.equal(alertas.filter(a => a.fuente === 'autoReporte.hc.senalesUrgencia').length, 2);
  for (const a of alertas) assert.deepEqual(Object.keys(a), ['mensaje', 'fuente']);
});

prueba('no recalcula ruteo ni infiere alarmas por dolor 10, sangrado o menopausia', () => {
  const r = { autoReporte: { hc: { sangrado: true, etapaReproductiva: 'menopausia', senalesUrgencia: ['ninguna'] }, dolor: { tiene: true, intensidad: 10 } } };
  assert.deepEqual(resumenLectura(r).alertas, []);
  assert.deepEqual(filtrarRespuestas([r], { filtro: 'alertas' }), []);
  assert.deepEqual(resumenLectura({ alertaSeguridad: { urgente: false, saludMental: false }, ruteoClinico: { banderas: [] } }).alertas, []);
  assert.deepEqual(resumenLectura({ alertaSeguridad: { urgente: 'true' }, ruteoClinico: { instrumentosSugeridos: [{ prioridad: 'alta' }] } }).alertas, []);
});

prueba('banderas de dolor guardadas se leen aun sin intensidad y sin recalcular resumen', () => {
  for (const id of ['dolor-pelvico', 'dolorPelvico']) {
    const r = congelar({
      autoReporte: { dolor: { tiene: true, intensidad: null }, profundos: { [id]: { banderas: ['b_refractario', 'b_sangre_orina', 'b_ninguna', 'bandera_legacy'] } } },
      resumen: { profundizaciones: [{ id, resumen: 'Resumen_guardado literal', completo: false }] },
    });
    const antes = JSON.stringify(r);
    const lectura = resumenLectura(r);
    assert.equal(lectura.alertas.length, 3);
    assert.ok(lectura.alertas.some(a => a.mensaje === 'El dolor no se quita ni con pastillas para el dolor'));
    assert.ok(lectura.alertas.some(a => a.mensaje === 'Sangre en la orina cuando estoy en mi regla'));
    assert.ok(lectura.alertas.every(a => a.fuente === `autoReporte.profundos.${id}.banderas`));
    assert.equal(lectura.dolor.pendiente, true);
    assert.equal(filtrarRespuestas([r], { filtro: 'alertas' }).length, 1);
    assert.equal(JSON.stringify(r), antes, 'No modifica respuestas ni resumen congelado');
    assert.ok(!JSON.stringify(lectura).includes('sin dolor mapeable'));
    assert.deepEqual(resumenLectura({ autoReporte: { profundos: { [id]: { banderas: ['b_ninguna'] } } } }).alertas, []);
  }
  assert.equal(resumenLectura({ profundos: { dolorPelvico: { banderas: ['b_discapacita'] } } }).alertas[0].fuente, 'profundos.dolorPelvico.banderas');
});

prueba('seguridad 1: urgente congelada sin sintomas ni intensidad sigue siendo alerta', () => {
  const r = congelar({ alertaSeguridad: { urgente: true, senales: [], senalesMaternas: [] }, autoReporte: { dolor: { tiene: true, intensidad: null } } });
  const a = resumenLectura(r).alertas;
  assert.equal(a.length, 1);
  assert.equal(a[0].fuente, 'alertaSeguridad.urgente');
  assert.equal(filtrarRespuestas([r], { filtro: 'alertas' }).length, 1);
});

prueba('seguridad 2: senales/maternas congeladas sobreviven aunque hc no las contenga', () => {
  const r = congelar({ autoReporte: { hc: { senalesUrgencia: ['ninguna'], senalesMaternas: [] } }, alertaSeguridad: { urgente: false, senales: ['fiebre_dolor'], senalesMaternas: ['fiebre_materna'] } });
  const a = resumenLectura(r).alertas;
  assert.equal(a.length, 2);
  assert.ok(a.some(v => v.fuente === 'alertaSeguridad.senales'));
  assert.ok(a.some(v => v.fuente === 'alertaSeguridad.senalesMaternas'));
});

prueba('seguridad 3: deduplica sintomas identicos y combina procedencia sin mutar', () => {
  const r = congelar({
    autoReporte: { hc: { senalesUrgencia: ['fiebre_dolor', 'fiebre_dolor'], senalesMaternas: ['fiebre_materna'] } },
    alertaSeguridad: { senales: ['fiebre_dolor'], senalesMaternas: ['fiebre_materna'] },
    ruteoClinico: { banderas: [{ mensaje: 'Fiebre con dolor p\u00e9lvico intenso' }] },
  });
  const a = resumenLectura(r).alertas;
  assert.equal(a.length, 2);
  const fuentes = a.find(v => v.mensaje === 'Fiebre con dolor p\u00e9lvico intenso').fuente.split(' | ');
  assert.deepEqual(fuentes, ['autoReporte.hc.senalesUrgencia', 'alertaSeguridad.senales', 'ruteoClinico.banderas']);
  assert.equal(a.find(v => v.mensaje.includes('38')).fuente, 'autoReporte.hc.senalesMaternas | alertaSeguridad.senalesMaternas');
});

prueba('MRS omitida en ruta nueva: sin escala registrada, no incompleta ni cero clinico', () => {
  for (const contexto of [{ entrevistaVersion: '1.0.0' }, { formularioVersion: '2026.09.3' }]) {
    const r = { autoReporte: { hc: { ...contexto, temasConsulta: ['control'] }, mrs: {} } };
    const lectura = resumenLectura(r);
    assert.equal(lectura.mrs.texto, 'Sin escala registrada (0/11).');
    assert.equal(lectura.mrs.puntaje, null);
    assert.ok(!lectura.pendientes.some(p => p.includes('MRS')));
    r.autoReporte.mrs = { mrs_bochornos: null };
    assert.match(resumenLectura(r).mrs.texto, /incompleta/);
    r.autoReporte.mrs = {};
    r.autoReporte.hc.temasConsulta = ['climaterio'];
    assert.match(resumenLectura(r).mrs.texto, /incompleta/);
  }
  assert.match(resumenLectura(registro({ entrevistaVersion: '1.0.0' })).mrs.texto, /incompleta/, 'Sin seleccion explicita no se presume rama omitida');
  assert.match(resumenLectura(registro({ temasConsulta: ['control'] })).mrs.texto, /incompleta/, 'Legacy no se reinterpreta');
});

prueba('motivo literal, temas legibles y pendientes solo por datos incompletos', () => {
  const r = congelar({ autoReporte: { hc: { motivo: 'control', temasConsulta: ['control', 'tema_antiguo', 'control'] }, dolor: { tiene: true, intensidad: null }, mrs: { mrs_bochornos: 0 } }, resumen: { profundizaciones: [{ instrumento: 'ICIQ-SF', completo: false }] } });
  const lectura = resumenLectura(r);
  assert.equal(lectura.motivo, 'control', 'El motivo es prosa, no un codigo');
  assert.deepEqual(lectura.temas, ['Revisi\u00f3n ginecol\u00f3gica', 'tema antiguo']);
  assert.ok(lectura.pendientes.includes('ICIQ-SF: incompleto.'));
  assert.deepEqual(Object.keys(lectura), ['motivo', 'temas', 'dolor', 'mrs', 'alertas', 'pendientes']);
  const moderno = { autoReporte: { hc: { motivo: 'Ejemplo', entrevistaVersion: '1.0.0', temasConsulta: ['control'] }, dolor: { tiene: false }, mrs: {} } };
  assert.deepEqual(resumenLectura(moderno).pendientes, []);
  moderno.autoReporte.hc.temasConsulta = ['climaterio'];
  assert.ok(resumenLectura(moderno).pendientes.some(p => p.includes('MRS incompleta')));
});

const respuestas = congelar([
  { id: 'b', creado: '2026-09-09T10:00:00Z', paciente: { nombre: 'Prueba \u00c1lvarez', telefono: '+52 (000) 000-0001', correo: 'lectora@example.invalid' }, autoReporte: { hc: { motivo: 'Revisi\u00f3n de estudio sint\u00e9tico' } }, estudiosFolder: 'carpeta-sintetica', adjuntos: [] },
  { id: 'a', creado: '2026-09-09T10:00:00Z', paciente: { nombre: 'Prueba C\u00e1rdenas', telefono: '0000000002', correo: 'segunda@example.invalid' }, autoReporte: { hc: { motivo: 'Consulta de prueba', senalesUrgencia: ['sangrado_abundante'] } }, adjuntos: [{ nombre: 'sintetico.pdf', estado: 'pendiente' }] },
  { id: 'c', creado: '2026-09-08T10:00:00Z', autoReporte: { hc: { nombre: 'LEGADO SINTETICO', telefono: '0000000003', correo: 'legado@example.invalid', motivo: 'Dato hist\u00f3rico' } } },
  { id: 'z', creado: 'fecha-invalida', submittedAtClient: '2030-01-01', autoReporte: { hc: { motivo: 'Sin fecha' } }, estudiosDeclaracion: 'adjunto_estudios' },
]);

prueba('busqueda insensible a acentos/mayusculas por nombre, telefono, correo y motivo', () => {
  for (const busqueda of ['ALVAREZ', '\u00e1lvarez', '0000000001', '+52 000 000 0001', 'LECTORA@EXAMPLE.INVALID', 'revision', '  alvarez   sintetico  ']) {
    assert.deepEqual(ids(filtrarRespuestas(respuestas, { busqueda })), ['b']);
  }
  for (const busqueda of ['legado', '0000000003', 'LEGADO@example.invalid', 'historico']) assert.deepEqual(ids(filtrarRespuestas(respuestas, { busqueda })), ['c']);
  assert.deepEqual(filtrarRespuestas(respuestas, { busqueda: 'inexistente' }), []);
  assert.equal(filtrarRespuestas(respuestas, { busqueda: '   ' }).length, respuestas.length);
  assert.deepEqual(filtrarRespuestas([registro({ medicamentos: 'palabrareservada' })], { busqueda: 'palabrareservada' }), [], 'No busca datos ajenos a los campos solicitados');
});

prueba('filtros estudios por folder/manifest, nunca garantia ni declaracion de archivos', () => {
  assert.deepEqual(ids(filtrarRespuestas(respuestas, { filtro: 'estudios' })), ['a', 'b']);
  assert.deepEqual(ids(filtrarRespuestas(respuestas, { filtro: 'estudios', busqueda: 'alvarez' })), ['b']);
  assert.deepEqual(filtrarRespuestas([{ estudiosFolder: ' ', adjuntos: [] }], { filtro: 'estudios' }), []);
  assert.deepEqual(ids(filtrarRespuestas(respuestas, { filtro: 'alertas' })), ['a']);
  assert.deepEqual(filtrarRespuestas(respuestas, { filtro: 'alertas', busqueda: 'alvarez' }), []);
});

prueba('orden fecha/ID estable, invalidas al final, conserva entrada y referencias', () => {
  const antes = JSON.stringify(respuestas);
  assert.deepEqual(ids(filtrarRespuestas(respuestas)), ['a', 'b', 'c', 'z']);
  assert.deepEqual(ids(filtrarRespuestas(respuestas, { orden: 'antiguos' })), ['c', 'a', 'b', 'z']);
  assert.deepEqual(filtrarRespuestas(respuestas, { orden: 'antiguas' }), filtrarRespuestas(respuestas, { orden: 'antiguos' }));
  assert.deepEqual(filtrarRespuestas(respuestas, { filtro: 'desconocido', orden: 'desconocido' }), filtrarRespuestas(respuestas));
  assert.equal(JSON.stringify(respuestas), antes);
  assert.equal(filtrarRespuestas(respuestas)[0], respuestas[1]);
  assert.notEqual(filtrarRespuestas(respuestas), respuestas);
  const empates = congelar([{ id: 'a', creado: '2026-09-09T04:00:00-06:00', ordenOriginal: 1 }, { id: 'a', creado: '2026-09-09T10:00:00Z', ordenOriginal: 2 }]);
  for (const orden of ['antiguos', 'recientes']) assert.deepEqual(filtrarRespuestas(empates, { orden }).map(r => r.ordenOriginal), [1, 2]);
  assert.deepEqual(ids(filtrarRespuestas([{ id: 'b' }, { id: 'a', creado: null }])), ['a', 'b']);
});

prueba('orden nombre insensible a acentos, estable por fecha/ID y sin nombre al final', () => {
  const r = congelar([
    { id: 'z', paciente: { nombre: 'zoe' } },
    { id: 'b', creado: '2026-09-09T10:00:00Z', paciente: { nombre: '\u00c1NA' } },
    { id: 'a', creado: '2026-09-09T10:00:00Z', paciente: { nombre: 'ana' } },
    { id: 'c', creado: '2026-09-08T10:00:00Z', paciente: { nombre: 'An\u00e1' } },
    { id: 'd', autoReporte: { hc: { nombre: '\u00c9rica' } } },
    { id: 'sin-nombre', creado: '2026-09-10T10:00:00Z' },
  ]);
  assert.deepEqual(ids(filtrarRespuestas(r, { orden: 'nombre' })), ['a', 'b', 'c', 'd', 'z', 'sin-nombre']);
  assert.deepEqual(ids(r), ['z', 'b', 'a', 'c', 'd', 'sin-nombre']);
});

prueba('entradas vacias/incompletas no lanzan ni mutan; resultado determinista', () => {
  for (const vacio of [undefined, null, {}, [], '']) {
    assert.deepEqual(gruposHistoria(vacio), []);
    assert.deepEqual(filtrarRespuestas(vacio), []);
    assert.equal(resumenLectura(vacio).mrs.puntaje, null);
  }
  const r = congelar({ autoReporte: { hc: { medicamentos: [{ nombre: 'Ejemplo', dosis: 0 }], campoDesconocido: false }, mrs: mrsCon(0), dolor: { tiene: true, intensidad: 0 } }, ruteoClinico: { banderas: [{ mensaje: 'Bandera guardada' }] } });
  const antes = JSON.stringify(r);
  assert.deepEqual(resumenLectura(r), resumenLectura(r));
  gruposHistoria(r.autoReporte.hc);
  filtrarRespuestas(congelar([r]), { filtro: 'alertas' });
  assert.equal(JSON.stringify(r), antes);
});

console.log(`Lectura de respuestas: ${pruebas} pruebas sinteticas OK; 5 APIs, sin red ni datos reales.`);
