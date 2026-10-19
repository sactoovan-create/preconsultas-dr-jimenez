// Cuestionarios validados (PHQ-9, CSI-Sp) y motores pendientes de licencia.
// Solo datos inventados («Prueba QA»); sin red ni datos reales.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as phq9 from '../core/cuestionarios/phq9.js';
import * as csi from '../core/cuestionarios/csi.js';
import { PCS, BPI_SF, GSRS, ICIQ_UI_SF, PENDIENTES } from '../core/cuestionarios/pendientes.js';
import {
  ACTIVOS,
  alertaPhq9,
  banderasCuestionarios,
  combinarAlertaSeguridad,
  cuestionariosParaEnviar,
  cuestionariosSugeridos,
  insertarPasosCuestionarios,
  normalizarRespuestas,
  recordatorioCuestionario,
  resumenCuestionarios,
} from '../core/cuestionarios/index.js';
import { construirResumen } from '../core/resumenPaciente.js';
import { instrumentosPara, RUTEO_VERSION } from '../core/ruteoClinico.js';
import { pasosPara, validarPaso, FORMULARIO_VERSION } from '../core/preconsultaFlow.js';
import { resumenLectura } from '../core/lecturaRespuesta.js';

let ok = 0, fail = 0;
const check = (nombre, fn) => {
  try { if (fn() instanceof Promise) throw new Error('las comprobaciones deben ser síncronas'); ok++; console.log('  PASA  ' + nombre); }
  catch (e) { fail++; console.log('  FALLA ' + nombre + ' :: ' + e.message); }
};
const phqCon = (valores, extra = {}) => ({ ...Object.fromEntries(valores.map((v, i) => [`item${i + 1}`, v])), ...extra });
const csiCon = (valores, extra = {}) => ({ ...Object.fromEntries(valores.map((v, i) => [`a${i + 1}`, v])), ...extra });

console.log('\nPHQ-9 (Spanish for Mexico)');
check('texto oficial: 9 reactivos, 4 opciones, reactivo 9 literal', () => {
  assert.equal(phq9.ITEMS.length, 9);
  assert.deepEqual(phq9.OPCIONES.map((o) => o.etiqueta), ['Para nada', 'Varios días', 'Más de la mitad de los días', 'Casi todos los días']);
  assert.equal(phq9.ITEMS[8].texto, 'Ha pensado que estaría mejor muerto(a) o se le ha ocurrido lastimarse de alguna manera');
  assert.equal(phq9.INSTRUCCION, 'Durante las últimas 2 semanas, ¿qué tan seguido le han afectado cualquiera de los siguientes problemas?');
  assert.match(phq9.CREDITO, /No se requiere permiso para reproducir, traducir, mostrar o distribuir\.$/);
});
check('total = suma de 9 reactivos; dificultad no puntúa', () => {
  const r = phq9.evaluar(phqCon([1, 1, 1, 1, 1, 1, 1, 1, 0], { dificultad: 3 }));
  assert.equal(r.total, 8); assert.equal(r.completo, true); assert.equal(r.severidad, 'leve'); assert.equal(r.dificultad, 3);
});
check('cortes de Kroenke 2001 en sus bordes', () => {
  const sev = (t) => phq9.severidadPhq9(t).id;
  assert.deepEqual([0, 4, 5, 9, 10, 14, 15, 19, 20, 27].map(sev),
    ['minima', 'minima', 'leve', 'leve', 'moderada', 'moderada', 'moderadamente_grave', 'moderadamente_grave', 'grave', 'grave']);
  assert.equal(phq9.severidadPhq9(null), null);
});
check('escala incompleta: sin total y sin severidad (no es cero)', () => {
  const r = phq9.evaluar(phqCon([0, 0, 0, 0, 0, 0, 0, 0]));
  assert.equal(r.total, null); assert.equal(r.completo, false); assert.equal(r.respondidos, 8); assert.match(r.resumen, /incompleto/);
});
check('valores inválidos no cuentan (4, -1, booleano, vacío, fracción)', () => {
  const r = phq9.evaluar(phqCon([4, -1, true, '', 1.5, 0, 0, 0, 0]));
  assert.equal(r.respondidos, 4); assert.equal(r.total, null);
});
check('ítem 9 = 1 activa alerta (prioridad alta) aunque el total sea bajo', () => {
  const r = phq9.evaluar(phqCon([0, 0, 0, 0, 0, 0, 0, 0, 1]));
  assert.equal(r.total, 1); assert.equal(r.severidad, 'minima');
  assert.equal(r.seguridad.positivo, true); assert.equal(r.seguridad.prioridad, 'alta');
  assert.match(r.resumen, /^ALERTA DE SEGURIDAD: ítem 9 = 1\./);
});
check('ítem 9 = 2 o 3: prioridad máxima', () => {
  assert.equal(phq9.evaluar(phqCon([0, 0, 0, 0, 0, 0, 0, 0, 2])).seguridad.prioridad, 'maxima');
  assert.equal(phq9.evaluar(phqCon([0, 0, 0, 0, 0, 0, 0, 0, 3])).seguridad.prioridad, 'maxima');
});
check('total ≥ 20 con ítem 9 = 0: alerta de prioridad máxima sin «ítem 9 positivo»', () => {
  const r = phq9.evaluar(phqCon([3, 3, 3, 3, 3, 3, 2, 0, 0]));
  assert.equal(r.total, 20); assert.equal(r.seguridad.positivo, false); assert.equal(r.seguridad.alerta, true);
  assert.deepEqual(r.seguridad.motivos, ['total_grave']); assert.equal(r.seguridad.prioridad, 'maxima');
});
check('ítem 9 sin respuesta: «sin dato de seguridad, revisar»', () => {
  const r = phq9.evaluar(phqCon([1, 1, 1, 1, 1, 1, 1, 1]));
  assert.equal(r.seguridad.sinDatoItem9, true); assert.equal(r.seguridad.alerta, false); assert.equal(r.seguridad.prioridad, 'revisar');
  assert.match(phq9.mensajeAlertaPhq9(r.seguridad), /sin dato de seguridad/);
});
check('recordatorio suave: primero el ítem 9, luego lo que falte; null si completo', () => {
  assert.equal(phq9.recordatorio({}).campo, 'cv-phq9-item9');
  assert.equal(phq9.recordatorio(phqCon([null, 0, 0, 0, 0, 0, 0, 0, 0])).campo, 'cv-phq9-item1');
  assert.equal(phq9.recordatorio(phqCon([0, 0, 0, 0, 0, 0, 0, 0, 0])), null);
});

console.log('\nCSI-Sp (Cuesta-Vargas 2016, CC BY 4.0)');
check('texto: 25 enunciados, 5 opciones, Parte B de 10; enunciado 6 corregido y declarado', () => {
  assert.equal(csi.ITEMS_A.length, 25); assert.equal(csi.ITEMS_B.length, 10);
  assert.deepEqual(csi.OPCIONES.map((o) => [o.etiqueta, o.valor]), [['Nunca', 0], ['Pocas Veces', 1], ['Algunas veces', 2], ['Continuamente', 3], ['Siempre', 4]]);
  assert.equal(csi.ITEMS_A[5].texto, 'Necesito ayuda para realizar mis actividades diarias.');
  assert.equal(csi.ITEMS_A[24].texto, 'Tengo dolor en mi zona pélvica');
  assert.match(csi.CAMBIOS, /«pare» → «para»/);
  assert.match(csi.ATRIBUCION, /SpringerPlus\. 2016;5\(1\):1837/);
  assert.equal(csi.LICENCIA_URL, 'https://creativecommons.org/licenses/by/4.0/');
});
check('total = suma de 25 (0-100) y niveles de Neblett 2017 en sus bordes', () => {
  assert.equal(csi.evaluar(csiCon(Array(25).fill(4))).total, 100);
  assert.equal(csi.evaluar(csiCon(Array(25).fill(0))).nivel, 'subclinico');
  const nivel = (t) => csi.nivelCsi(t).id;
  assert.deepEqual([29, 30, 39, 40, 49, 50, 59, 60, 100].map(nivel), ['subclinico', 'leve', 'leve', 'moderado', 'moderado', 'grave', 'grave', 'extremo', 'extremo']);
});
check('corte 40 (Neblett 2013) rotulado como derivado de la versión en inglés', () => {
  const v = Array(25).fill(1); v[0] = 4; v[1] = 4; v[2] = 4; v[3] = 4; v[4] = 4; // 20 + 20 = 40
  const r = csi.evaluar(csiCon(v));
  assert.equal(r.total, 40); assert.equal(r.sobreCorte40, true); assert.equal(r.nivel, 'moderado');
  assert.match(r.resumen, /versión original en inglés/); assert.match(r.resumen, /24\.6 ± 12\.0/);
  assert.equal(csi.evaluar(csiCon(Array(25).fill(1))).sobreCorte40, false);
});
check('sin los 25 enunciados no hay total (decisión de diseño documentada)', () => {
  const r = csi.evaluar(csiCon(Array(24).fill(4)));
  assert.equal(r.total, null); assert.equal(r.completo, false); assert.equal(r.sobreCorte40, null); assert.match(r.resumen, /incompleto \(24\/25\)/);
});
check('Parte B se registra (sí/no y año) y no puntúa', () => {
  const r = csi.evaluar(csiCon(Array(25).fill(0), { b3: 'si', b3_anio: 2019, b10: 'si', b10_anio: 1800, b1: 'no' }), { anioActual: 2026 });
  assert.equal(r.total, 0);
  assert.deepEqual(r.parteB, [{ id: 'b3', diagnostico: 'Fibromialgia', anio: 2019 }, { id: 'b10', diagnostico: 'Depresión', anio: null }]);
  assert.equal(r.parteBRespondidos, 3); assert.match(r.resumen, /Fibromialgia \(2019\); Depresión\./);
});

console.log('\nRegistro, flujo y contrato');
check('PHQ-9 siempre; CSI solo con dolor pélvico (tema o dolor reportado)', () => {
  assert.deepEqual(cuestionariosSugeridos({ hc: { temasConsulta: ['control'] }, dolor: {} }).map((c) => c.id), ['phq9']);
  assert.deepEqual(cuestionariosSugeridos({ hc: { temasConsulta: ['dolor'] }, dolor: {} }).map((c) => c.id), ['csi', 'phq9']);
  assert.deepEqual(cuestionariosSugeridos({ hc: {}, dolor: { tiene: true } }).map((c) => c.id), ['csi', 'phq9']);
  assert.deepEqual(cuestionariosSugeridos({}).map((c) => c.id), ['phq9']);
});
check('pasos: antes de «Tu salud general», sin duplicar al recalcular', () => {
  const base = pasosPara({ hc: { temasConsulta: ['dolor'] }, mrs: {}, dolor: { tiene: true } });
  const sug = cuestionariosSugeridos({ hc: { temasConsulta: ['dolor'] }, dolor: { tiene: true } });
  const pasos = insertarPasosCuestionarios(insertarPasosCuestionarios(base, sug), sug);
  const ids = pasos.map((p) => p.id);
  assert.equal(ids.filter((id) => id === 'cuestionario:phq9').length, 1);
  assert.equal(ids.indexOf('cuestionario:csi') + 1, ids.indexOf('cuestionario:phq9'));
  assert.equal(ids.indexOf('cuestionario:phq9') + 1, ids.indexOf('antecedentes'));
  assert.equal(pasos.find((p) => p.id === 'cuestionario:csi').cuestionarioId, 'csi');
});
check('el paso de cuestionario nunca bloquea la validación', () => {
  assert.equal(validarPaso('cuestionario:phq9', { hc: {}, demografia: {}, mrs: {}, dolor: {} }).ok, true);
  assert.equal(validarPaso('cuestionario:csi', { hc: {}, demografia: {}, mrs: {}, dolor: {} }).ok, true);
  assert.ok(recordatorioCuestionario('phq9', {})); assert.equal(recordatorioCuestionario('desconocido', {}), null);
});
check('normalización: solo reactivos conocidos; año solo con «sí»; sin ceros inventados', () => {
  assert.deepEqual(normalizarRespuestas('phq9', { item1: 2, item9: 1, item10: 3, dificultad: 9, x: 'y' }), { item1: 2, item9: 1 });
  assert.deepEqual(normalizarRespuestas('csi', { a1: 4, a26: 2, b2: 'no', b2_anio: 2010, b4: 'si', b4_anio: 2015, b5: 'quizá' }), { a1: 4, b2: 'no', b4: 'si', b4_anio: 2015 });
});
check('autoReporte: PHQ-9 ofrecido viaja aunque esté vacío; CSI se descarta sin dolor', () => {
  const sin = cuestionariosParaEnviar({ hc: { temasConsulta: ['control'] }, dolor: {} }, { csi: { respuestas: { a1: 3 } } });
  assert.deepEqual(sin, { phq9: { version: 1, respuestas: {} } });
  const con = cuestionariosParaEnviar({ hc: { temasConsulta: ['dolor'] }, dolor: { tiene: true } }, { csi: { respuestas: { a1: 3 } }, phq9: { respuestas: { item9: 0 } } });
  assert.deepEqual(con, { csi: { version: 1, respuestas: { a1: 3 } }, phq9: { version: 1, respuestas: { item9: 0 } } });
});
check('alertaSeguridad: ítem 9 > 0 marca saludMental y conserva la orientación urgente', () => {
  const a = combinarAlertaSeguridad({ urgente: true, embarazoConSintomas: false, saludMental: false, senales: ['desmayo_mareo'], senalesMaternas: [] },
    { phq9: { version: 1, respuestas: phqCon([0, 0, 0, 0, 0, 0, 0, 0, 2]) } });
  assert.equal(a.urgente, true); assert.deepEqual(a.senales, ['desmayo_mareo']);
  assert.equal(a.saludMental, true); assert.equal(a.phq9.positivo, true); assert.equal(a.phq9.item9, 2); assert.equal(a.phq9.prioridad, 'maxima');
  assert.match(a.phq9.mensaje, /ítem 9 = 2/);
});
check('alertaSeguridad sin PHQ-9 (registro anterior): sin cambios y sin clave phq9', () => {
  const base = { urgente: false, embarazoConSintomas: false, saludMental: false, senales: [], senalesMaternas: [] };
  assert.deepEqual(combinarAlertaSeguridad(base, {}), base);
  assert.equal(alertaPhq9({}), null);
});
check('ruteo v6: bandera roja del ítem 9 primero; aviso si falta el ítem 9', () => {
  assert.equal(RUTEO_VERSION, 6); assert.equal(FORMULARIO_VERSION, '2026.10.1');
  const reg = { paciente: { edad: 33 }, autoReporte: { mrs: {}, dolor: { tiene: true, intensidad: 9 }, hc: { temasConsulta: ['dolor'] }, phq9: { version: 1, respuestas: phqCon([0, 0, 0, 0, 0, 0, 0, 0, 1]) } } };
  const rt = instrumentosPara(reg);
  assert.equal(rt.banderas[0].tipo, 'roja'); assert.equal(rt.banderas[0].codigo, 'phq9_item9_positivo'); assert.equal(rt.banderas[0].instrumentoRelacionado, 'phq9');
  assert.ok(rt.banderas.length >= 2, 'conserva las demás banderas');
  const sinDato = instrumentosPara({ ...reg, autoReporte: { ...reg.autoReporte, phq9: { version: 1, respuestas: {} } } });
  assert.equal(sinDato.banderas[0].tipo, 'aviso'); assert.equal(sinDato.banderas[0].codigo, 'phq9_sin_dato_item9');
  assert.equal(instrumentosPara({ autoReporte: { hc: {}, dolor: {}, mrs: {} } }).banderas.length, 0);
  assert.equal(banderasCuestionarios({ phq9: { respuestas: phqCon([0, 0, 0, 0, 0, 0, 0, 0, 0]) } }).length, 0);
});
check('resumen: phq9 y csi solo cuando se ofrecieron; registros previos sin cambios', () => {
  const previo = construirResumen({ mrs: {}, dolor: { tiene: false }, profundos: {} });
  assert.equal('phq9' in previo, false); assert.equal('csi' in previo, false);
  const nuevo = construirResumen({ mrs: {}, dolor: { tiene: true, intensidad: 5, meses: 8 }, profundos: {},
    phq9: { version: 1, respuestas: phqCon([1, 2, 1, 2, 1, 0, 1, 0, 0], { dificultad: 1 }) }, csi: { version: 1, respuestas: csiCon(Array(25).fill(2)) } });
  assert.equal(nuevo.phq9.total, 8); assert.equal(nuevo.phq9.dificultadEtiqueta, 'Un poco difícil');
  assert.equal(nuevo.csi.total, 50); assert.equal(nuevo.csi.nivel, 'grave');
  assert.deepEqual(Object.keys(resumenCuestionarios({ phq9: { respuestas: {} } })), ['phq9']);
});
check('panel del portal: una sola alerta PHQ-9 con ambas fuentes, sin la genérica', () => {
  const autoReporte = { hc: { motivo: 'Prueba QA' }, dolor: {}, mrs: {}, phq9: { version: 1, respuestas: phqCon([0, 0, 0, 0, 0, 0, 0, 0, 3]) } };
  const registro = {
    autoReporte,
    alertaSeguridad: combinarAlertaSeguridad({}, autoReporte),
    ruteoClinico: instrumentosPara({ autoReporte }),
    resumen: construirResumen(autoReporte),
  };
  const alertas = resumenLectura(registro).alertas;
  const phq = alertas.filter((a) => /PHQ-9/.test(a.mensaje));
  assert.equal(phq.length, 1); assert.match(phq[0].fuente, /alertaSeguridad\.phq9/); assert.match(phq[0].fuente, /ruteoClinico\.banderas/);
  assert.equal(alertas.some((a) => /salud mental guardada/.test(a.mensaje)), false);
});
check('panel del portal: PHQ-9 incompleto aparece en datos por precisar', () => {
  const autoReporte = { hc: { motivo: 'Prueba QA' }, dolor: {}, mrs: {}, phq9: { version: 1, respuestas: { item9: 0 } } };
  const p = resumenLectura({ autoReporte, resumen: construirResumen(autoReporte) }).pendientes;
  assert.ok(p.some((x) => /PHQ-9: incompleto \(1 respuestas\)/.test(x)), JSON.stringify(p));
});

console.log('\nPendientes de licencia o registro (sin texto)');
check('ninguno está activo ni trae texto de reactivos', () => {
  assert.deepEqual(ACTIVOS.map((m) => m.CLAVE), ['csi', 'phq9']);
  assert.deepEqual(PENDIENTES.map((m) => m.ESTADO), ['pendiente_licencia', 'pendiente_licencia', 'pendiente_licencia', 'pendiente_registro']);
  for (const m of PENDIENTES) {
    for (const it of [...(m.ITEMS || []), ...(m.INTENSIDAD || []), ...(m.INTERFERENCIA || [])]) assert.equal('texto' in it, false, m.CLAVE);
    assert.ok(m.INSTRUCCIONES_DR.length >= 3); assert.ok(m.LICENCIA.length > 40);
  }
});
check('PCS: total 0-52 y subescalas de Sullivan 1995; sin interpretación', () => {
  const r = PCS.evaluar(Object.fromEntries(PCS.ITEMS.map((it) => [it.id, it.numero <= 5 ? 4 : 1])));
  assert.equal(r.total, 20 + 8); assert.deepEqual(r.subescalas, { rumiacion: 4, magnificacion: 3, desesperanza: 21 });
  assert.equal(r.interpretacion, null); assert.equal(PCS.evaluar({ item1: 2 }).total, null);
});
check('BPI-SF: severidad media de 4 reactivos; interferencia con ≥ 4 de 7', () => {
  const r = BPI_SF.evaluar({ q3: 8, q4: 2, q5: 5, q6: 4, q8: 30, q9a: 6, q9b: 4, q9c: 5, q9d: 7 });
  assert.equal(r.peor, 8); assert.equal(r.categoriaPeor, 'grave'); assert.equal(r.severidadMedia, 4.75);
  assert.equal(r.interferenciaMedia, 5.5); assert.equal(r.alivio, 30);
  assert.equal(BPI_SF.evaluar({ q9a: 6, q9b: 4, q9c: 5 }).interferenciaMedia, null);
  assert.equal(BPI_SF.evaluar({ q8: 35 }).alivio, null);
});
check('GSRS: media por dominio si se contestó más de la mitad; total con los 15', () => {
  const r = GSRS.evaluar({ item2: 3, item3: 5, item1: 2, item4: 4, item11: 7 });
  assert.equal(r.dominios.reflujo, 4); assert.equal(r.dominios.dolorAbdominal, 3); assert.equal(r.dominios.diarrea, null); assert.equal(r.total, null);
  assert.equal(GSRS.evaluar(Object.fromEntries(GSRS.ITEMS.map((it) => [it.id, 2]))).total, 2);
});
check('ICIQ-UI SF: puntaje 3 + 4 + 5 (0-21); P4 solo 0/2/4/6', () => {
  const r = ICIQ_UI_SF.evaluar({ q3: 3, q4: 4, q5: 7, q6_2: true });
  assert.equal(r.total, 14); assert.equal(r.severidad, 'grave'); assert.deepEqual(r.p6, ['q6_2']);
  assert.equal(ICIQ_UI_SF.evaluar({ q3: 3, q4: 3, q5: 7 }).total, null);
  assert.equal(ICIQ_UI_SF.evaluar({ q3: 0, q4: 0, q5: 0 }).severidad, 'sin pérdida');
});
const fuentePendientes = await readFile(new URL('../core/cuestionarios/pendientes.js', import.meta.url), 'utf8');
check('derechos de autor: pendientes.js no declara texto ni etiquetas de reactivos', () => {
  // Solo estructura y reglas: ninguna propiedad «texto», «etiqueta» u «opciones».
  assert.equal(/(^|[{,])\s*(texto|etiqueta|opciones)\s*:/m.test(fuentePendientes), false);
});

console.log(`\nResultado cuestionarios: ${ok} pasan, ${fail} fallan.`);
if (fail > 0) process.exit(1);
