/** Fixtures ficticios, sin red ni almacenamiento. Ejecutar: node tests/jornada.mjs. */
import assert from 'node:assert/strict';
import { construirJornada, huellaRespuesta, revisionRespuesta, revisionVigente } from '../core/jornada.js';

let pruebas = 0;
function prueba(nombre, fn) {
  try { fn(); pruebas++; console.log(`  PASA ${nombre}`); }
  catch (error) { console.error(`  FALLA ${nombre}`); throw error; }
}
const ids = lista => lista.map(r => r.id);
const cita = (id, hora = '09', extra = {}) => ({
  cita_id: id, fecha: '2026-09-09', inicio: `2026-09-09T${hora}:00:00-06:00`,
  nombre: 'Nombre transcrito de agenda', telefono: '0000000001', ...extra,
});
const respuesta = (id, creado = '2026-09-08T12:00:00Z', extra = {}) => ({
  id, creado, paciente: { nombre: 'Persona ficticia A', telefono: '0000000001' }, ...extra,
});
const vinculo = (citaId, pacienteId = 'portal:identidad-ficticia', extra = {}) => ({
  citaId, pacienteId, nombre: 'Identidad confirmada ficticia', fecha: '2026-09-09',
  inicio: '2026-09-09T09:00:00-06:00', estado: 'confirmado',
  confirmadoEn: '2026-09-09T08:00:00-06:00', autorId: 'medico-ficticio', ...extra,
});
const trabajo = v => ({ gestionConsulta: { vinculo: v } });
const revisada = (r, extra = {}) => ({ gestionConsulta: { revision: {
  estado: 'revisada', fecha: '2026-09-09T08:00:00-06:00', autorId: 'medico-ficticio',
  versionHuella: huellaRespuesta(r), ...extra,
} } });
function congelar(v) {
  if (v && typeof v === 'object') { Object.values(v).forEach(congelar); Object.freeze(v); }
  return v;
}

prueba('API vacia: cero citas no se sustituye por todas las respuestas', () => {
  assert.deepEqual(construirJornada([], []), { citas: [], grupos: [], sinVincular: [] });
  for (const vacio of [undefined, null, '', {}]) {
    assert.deepEqual(construirJornada(vacio, vacio, vacio), { citas: [], grupos: [], sinVincular: [] });
  }
  const r = respuesta('r1');
  const j = construirJornada([], [r]);
  assert.equal(j.citas.length, 0);
  assert.deepEqual(j.sinVincular, [r]);
  assert.deepEqual(j.grupos[0], {
    id: 'r:r1', nombre: r.paciente.nombre, pacienteId: null, respuestas: [r], ultima: r,
    confirmado: false, etiquetaIdentidad: 'Por identificar', citas: [],
  });
});

prueba('una fila por cita en horario real, no por envio ni reloj del cliente', () => {
  const manana = cita('c1', '09'), tarde = cita('c2', '14');
  const r1 = respuesta('r1', '2026-09-09T17:00:00Z', { submittedAtClient: '2040-01-01' });
  const r2 = respuesta('r2', '2026-09-01T17:00:00Z', { submittedAtClient: '2000-01-01' });
  const j = construirJornada([tarde, manana], [r2, r1], {
    r1: trabajo(vinculo('c1')), r2: trabajo(vinculo('c2')),
  });
  assert.deepEqual(j.citas.map(f => f.cita.cita_id), ['c1', 'c2']);
  assert.deepEqual(j.citas.map(f => f.principal.id), ['r1', 'r2']);
  assert.ok(j.citas.every(f => f.confirmada));
  assert.equal(j.grupos.length, 1);
  assert.deepEqual(j.grupos[0].citas.map(c => c.cita_id), ['c2', 'c1']);
  assert.strictEqual(j.citas[0].cita, manana);
});

prueba('varios envios confirmados de una cita: ultima primero, originales intactos', () => {
  const antiguos = respuesta('a', '2026-09-01T00:00:00Z');
  const recientes = respuesta('b', '2026-09-08T00:00:00Z');
  const j = construirJornada([cita('c')], [antiguos, recientes], {
    a: trabajo(vinculo('c')), b: { contenido: trabajo(vinculo('c')) },
  });
  assert.deepEqual(j.citas[0].respuestas, [recientes, antiguos]);
  assert.strictEqual(j.citas[0].principal, recientes);
  assert.strictEqual(j.grupos[0].ultima, recientes);
  assert.deepEqual(j.grupos[0].respuestas, [recientes, antiguos]);
  assert.deepEqual(j.sinVincular, []);
  assert.deepEqual(j.citas[0].candidatos, []);
  assert.deepEqual(Object.keys(j.citas[0]), ['cita', 'respuestas', 'principal', 'candidatos', 'confirmada']);
});

prueba('telefono y nombre iguales solo son candidatos; no fusionan desconocidas', () => {
  const r1 = respuesta('r1'), r2 = respuesta('r2');
  const c = cita('c', '09', { nombre: r1.paciente.nombre });
  const j = construirJornada([c], [r2, r1]);
  assert.equal(j.citas[0].confirmada, false);
  assert.equal(j.citas[0].principal, null);
  assert.deepEqual(j.citas[0].respuestas, []);
  assert.equal('contesto' in j.citas[0], false);
  assert.deepEqual(j.grupos.map(g => g.id), ['r:r1', 'r:r2']);
  assert.deepEqual(ids(j.sinVincular), ['r1', 'r2']);
  assert.equal(j.citas[0].candidatos.length, 2);
  for (const c of j.citas[0].candidatos) {
    assert.equal(c.criterio, 'tel\u00e9fono y nombre');
    assert.match(c.advertencia, /sugerida.*varias respuestas/);
  }
});

prueba('telefono compartido y nombres diferentes conservan identidades individuales', () => {
  const r1 = respuesta('r1');
  const r2 = respuesta('r2', undefined, { paciente: { nombre: 'Persona ficticia B', telefono: '0000000001' } });
  const j = construirJornada([cita('c')], [r1, r2]);
  assert.equal(j.grupos.length, 2);
  assert.deepEqual(j.grupos.map(g => g.nombre), [r1.paciente.nombre, r2.paciente.nombre]);
  assert.ok(j.citas[0].candidatos.every(c => /Telefono compartido/.test(c.advertencia)));
  assert.ok(j.citas[0].candidatos.every(c => /nombre es distinto/.test(c.advertencia)));
  assert.ok(j.grupos.every(g => !g.confirmado && g.pacienteId === null));
});

prueba('nombre igual con telefono distinto advierte; nombre/telefono vacios no coinciden', () => {
  const r = respuesta('r');
  const j = construirJornada([cita('c', '09', { nombre: r.paciente.nombre, telefono: '0000000002' })], [r]);
  assert.match(j.citas[0].candidatos[0].advertencia, /telefono diferente/);
  assert.equal(j.citas[0].candidatos[0].criterio, 'nombre');
  assert.deepEqual(construirJornada([{ cita_id: 'vacia' }], [{ id: 'sin-contacto' }]).citas[0].candidatos, []);
  assert.deepEqual(construirJornada([{ cita_id: 'parcial', telefono: '1' }], [{ id: 'r', paciente: { telefono: '1' } }]).citas[0].candidatos, []);
});

prueba('normalizacion de candidato no altera el nombre propio de la respuesta', () => {
  const r = respuesta('r', undefined, { paciente: { nombre: '  Persona Ficticia \u00c1  ', telefono: '+52 (000) 000-0001' } });
  const j = construirJornada([cita('c', '09', { nombre: 'persona ficticia a' })], [r]);
  assert.equal(j.citas[0].candidatos[0].criterio, 'tel\u00e9fono y nombre');
  assert.equal(j.grupos[0].nombre, 'Persona Ficticia \u00c1');
  assert.equal(r.paciente.nombre, '  Persona Ficticia \u00c1  ');
});

prueba('una respuesta se confirma en solo una de dos citas de la misma identidad', () => {
  const r = respuesta('r');
  const j = construirJornada([cita('c1'), cita('c2', '10')], [r], { r: trabajo(vinculo('c2')) });
  assert.deepEqual(j.citas.map(c => ids(c.respuestas)), [[], ['r']]);
  assert.ok(j.citas.every(c => c.candidatos.length === 0));
  assert.equal(j.grupos[0].id, 'p:portal:identidad-ficticia');
  assert.equal(j.grupos[0].confirmado, true);
  assert.match(j.grupos[0].etiquetaIdentidad, /panel/);
});

prueba('candidatos pueden señalar dos citas ambiguas sin asignar a ninguna', () => {
  const j = construirJornada([cita('c1'), cita('c2', '10')], [respuesta('r')]);
  assert.ok(j.citas.every(c => c.respuestas.length === 0 && c.candidatos.length === 1));
  assert.equal(j.sinVincular.length, 1);
  assert.match(j.citas[0].candidatos[0].advertencia, /varias citas/);
});

prueba('IDs enviados por paciente no acreditan contrato ERP ni vinculo medico', () => {
  const r = respuesta('r', undefined, {
    patient_id: 'erp-1', appointment_id: 'c', cita_id: 'c', source_response_id: 'otra',
    gestionConsulta: { vinculo: vinculo('c'), revision: { estado: 'revisada' } },
    paciente: { nombre: 'Persona ficticia', patient_id: 'erp-1', id: 'erp-1' },
  });
  const j = construirJornada([cita('c', '09', { patient_id: 'erp-1' })], [r], { otra: trabajo(vinculo('c')) });
  assert.equal(j.citas[0].confirmada, false);
  assert.equal(j.grupos[0].pacienteId, null);
  assert.equal(revisionRespuesta(r).estado, 'pendiente');
});

prueba('retirado e incompleto nunca confirman; solo sello medico completo', () => {
  for (const cambio of [
    { estado: 'retirado' }, { estado: 'sugerido' }, { confirmadoEn: null },
    { confirmadoEn: 'ayer' }, { autorId: '' }, { pacienteId: '' }, { citaId: null },
    { pacienteId: {} }, { citaId: false },
  ]) {
    const j = construirJornada([cita('c')], [respuesta('r')], { r: trabajo(vinculo('c', undefined, cambio)) });
    assert.equal(j.citas[0].confirmada, false);
    assert.equal(j.grupos[0].confirmado, false);
    assert.equal(j.sinVincular.length, 1);
  }
  const j = construirJornada([cita('c')], [respuesta('r')], { r: trabajo(vinculo('c', undefined, { estado: 'retirado' })) });
  assert.match(j.citas[0].candidatos[0].advertencia, /retirado/);
});

prueba('dos pacienteId diferentes para la misma cita requieren conciliacion', () => {
  const j = construirJornada([cita('c')], [respuesta('r1'), respuesta('r2')], {
    r1: trabajo(vinculo('c', 'portal:uno')), r2: trabajo(vinculo('c', 'portal:dos')),
  });
  assert.equal(j.citas[0].confirmada, false);
  assert.equal(j.sinVincular.length, 2);
  assert.ok(j.grupos.every(g => !g.confirmado));
  assert.ok(j.citas[0].candidatos.every(c => /contradictorios/.test(c.advertencia)));
});

prueba('cita duplicada no duplica filas ni asigna una respuesta dos veces', () => {
  const j = construirJornada([cita('c'), cita('c', '10')], [respuesta('r')], { r: trabajo(vinculo('c')) });
  assert.equal(j.citas.length, 1);
  assert.equal(j.citas[0].confirmada, false);
  assert.equal(j.sinVincular.length, 1);
  assert.match(j.citas[0].candidatos[0].advertencia, /duplicada/);
});

prueba('historicos fuera de agenda se agrupan por vinculo, aun con cero citas', () => {
  const r1 = respuesta('r1', '2026-07-01T00:00:00Z'), r2 = respuesta('r2');
  const trabajos = {
    r1: trabajo(vinculo('pasada', undefined, { fecha: '2026-07-02', inicio: '2026-07-02T09:00:00-06:00' })),
    r2: trabajo(vinculo('actual')),
  };
  for (const agenda of [[], [cita('actual')]]) {
    const j = construirJornada(agenda, [r1, r2], trabajos);
    assert.equal(j.citas.length, agenda.length);
    assert.deepEqual(j.sinVincular, []);
    assert.equal(j.grupos.length, 1);
    assert.deepEqual(ids(j.grupos[0].respuestas), ['r2', 'r1']);
    assert.deepEqual(j.grupos[0].citas.map(c => c.cita_id), ['actual', 'pasada']);
    assert.equal(j.grupos[0].citas[1].origen, 'vinculo-guardado');
    assert.equal(j.grupos[0].citas[1].fecha, '2026-07-02');
  }
});

prueba('historico confirmado no es candidato para otra cita del mismo telefono', () => {
  const j = construirJornada([cita('nueva')], [respuesta('r')], { r: trabajo(vinculo('historica')) });
  assert.equal(j.grupos[0].confirmado, true);
  assert.equal(j.citas[0].confirmada, false);
  assert.deepEqual(j.citas[0].candidatos, []);
  assert.deepEqual(j.sinVincular, []);
});

prueba('snapshot historico usa ultima confirmacion; agenda presente sigue autoritativa', () => {
  const trabajos = {
    r1: trabajo(vinculo('c', undefined, { inicio: '2026-09-09T10:00:00-06:00', confirmadoEn: '2026-09-09T12:00:00Z' })),
    r2: trabajo(vinculo('c', undefined, { inicio: '2026-09-09T11:00:00-06:00', confirmadoEn: '2026-09-09T13:00:00Z' })),
  };
  const rs = [respuesta('r1', '2026-09-09T11:00:00Z'), respuesta('r2')];
  assert.equal(construirJornada([], rs, trabajos).grupos[0].citas[0].inicio, trabajos.r2.gestionConsulta.vinculo.inicio);
  const c = cita('c', '14');
  assert.strictEqual(construirJornada([c], rs, trabajos).grupos[0].citas[0], c);
});

prueba('no fusiona personas confirmadas distintas que comparten nombre y telefono', () => {
  const j = construirJornada([], [respuesta('r1'), respuesta('r2')], {
    r1: trabajo(vinculo('c1', 'portal:uno')), r2: trabajo(vinculo('c2', 'portal:dos')),
  });
  assert.equal(j.grupos.length, 2);
  assert.deepEqual(j.grupos.map(g => g.pacienteId), ['portal:uno', 'portal:dos']);
  assert.ok(j.grupos.every(g => g.confirmado));
});

prueba('orden por instante con zonas, empates por ID, invalidas al final', () => {
  const rs = [respuesta('z', 'invalida'), respuesta('b', '2026-09-09T08:00:00-06:00'), respuesta('a', '2026-09-09T14:00:00Z')];
  const j = construirJornada([
    cita('z', '09', { inicio: 'invalido' }), cita('b', '09'),
    cita('a', '09', { inicio: '2026-09-09T14:00:00Z' }),
  ], rs);
  assert.deepEqual(j.citas.map(f => f.cita.cita_id), ['a', 'b', 'z']);
  assert.deepEqual(ids(j.sinVincular), ['a', 'b', 'z']);
  assert.deepEqual(j.grupos.map(g => g.ultima.id), ['a', 'b', 'z']);
  assert.deepEqual(construirJornada([], [respuesta('b', 'sin-fecha'), respuesta('a', 'sin-fecha')]).grupos.map(g => g.ultima.id), ['a', 'b']);
});

prueba('huella canonica: orden de claves no importa; no muta y conserva tipos', () => {
  const a = congelar({ id: 'r', contenido: { b: [0, false, null, ''], a: { z: 'literal', x: 1 } } });
  const b = { contenido: { a: { x: 1, z: 'literal' }, b: [0, false, null, ''] }, id: 'r' };
  assert.equal(huellaRespuesta(a), huellaRespuesta(b));
  assert.notEqual(huellaRespuesta({ a: 0 }), huellaRespuesta({ a: '0' }));
  assert.notEqual(huellaRespuesta({ a: false }), huellaRespuesta({ a: null }));
  assert.notEqual(huellaRespuesta({ a: -0 }), huellaRespuesta({ a: 0 }));
  assert.notEqual(huellaRespuesta({ a: [] }), huellaRespuesta({ a: {} }));
  assert.notEqual(huellaRespuesta({ a: [1, 2] }), huellaRespuesta({ a: [2, 1] }));
  assert.notEqual(huellaRespuesta({ a: ' prueba ' }), huellaRespuesta({ a: 'prueba' }));
  assert.notEqual(huellaRespuesta({}), huellaRespuesta({ a: null }));
  assert.notEqual(huellaRespuesta({ a: '\u00e1' }), huellaRespuesta({ a: 'a\u0301' }));
});

prueba('huella incluye contenido desconocido y metadatos recibidos, sin resumen clinico', () => {
  const r = respuesta('r', undefined, { autoReporte: { campoFuturo: [0, false] }, adjuntos: [{ nombre: 'ficticio.pdf' }] });
  for (const cambio of [
    { id: 'otro' }, { creado: '2026-09-09T01:00:00Z' }, { nuevo: false },
    { autoReporte: { campoFuturo: [0, true] } }, { adjuntos: [] }, { submittedAtClient: '2020-01-01' },
  ]) assert.notEqual(huellaRespuesta(r), huellaRespuesta({ ...r, ...cambio }));
});

prueba('valores fuera de JSON no colisionan silenciosamente con contenido recibido', () => {
  const circular = {}; circular.circular = circular;
  for (const r of [undefined, { a: undefined }, [undefined], Array(1), { a: NaN },
    { a: Infinity }, { a: () => {} }, { a: 1n }, new Date('2026-01-01'), circular,
    { [Symbol('ficticio')]: 1 }]) assert.throws(() => huellaRespuesta(r), TypeError);
  assert.doesNotThrow(() => huellaRespuesta(Object.assign(Object.create(null), { a: 1 })));
  const compartido = { a: 1 };
  assert.equal(huellaRespuesta([compartido, compartido]), huellaRespuesta([{ a: 1 }, { a: 1 }]));
});

prueba('huella rechaza getters y propiedades ocultas sin ejecutarlos u omitirlas', () => {
  let llamadas = 0;
  const accesor = { get valor() { llamadas++; return 1; } };
  const oculto = Object.defineProperty({}, 'oculto', { value: 1 });
  const arrayConExtras = Object.assign([1], { extra: 2 });
  const huecoConExtra = Object.assign(Array(1), { extra: 2 });
  for (const r of [accesor, oculto, arrayConExtras, huecoConExtra]) assert.throws(() => huellaRespuesta(r), TypeError);
  assert.equal(llamadas, 0);
});

prueba('sin revision, guardado previo y abrir no implican revisada', () => {
  const r = respuesta('r');
  for (const t of [{}, null, { guardadoEn: '2026-09-09' }, { gestionConsulta: { abierto: true } }, trabajo(vinculo('c'))]) {
    const revision = revisionRespuesta(r, t);
    assert.equal(revision.estado, 'pendiente');
    assert.equal(revision.vigente, false);
    assert.equal(revision.motivo, 'sin-revision');
  }
});

prueba('revision explicita con huella exacta y auditoria aplica en ambas formas de trabajo', () => {
  const r = respuesta('r');
  for (const t of [revisada(r), { contenido: revisada(r) }]) {
    assert.deepEqual(revisionRespuesta(r, t), {
      estado: 'revisada', fecha: '2026-09-09T08:00:00-06:00', autorId: 'medico-ficticio',
      versionHuella: huellaRespuesta(r), vigente: true, motivo: 'revision-explicita',
    });
  }
  assert.equal(revisionRespuesta(r, { contenido: null, ...revisada(r) }).estado, 'pendiente');
});

prueba('otra huella reabre revision y conserva el sello historico sin sobrescribir', () => {
  const r = respuesta('r', undefined, { campoFuturo: 0 });
  const t = congelar(revisada(r));
  const actual = { ...r, campoFuturo: false };
  const revision = revisionRespuesta(actual, t);
  assert.equal(revision.estado, 'pendiente');
  assert.equal(revision.vigente, false);
  assert.equal(revision.motivo, 'version-distinta');
  assert.equal(revision.versionHuella, t.gestionConsulta.revision.versionHuella);
  assert.equal(revisionRespuesta(r, t).estado, 'revisada');
});

prueba('pendiente explicita prevalece aun con huella correcta', () => {
  const r = respuesta('r');
  const revision = revisionRespuesta(r, revisada(r, { estado: 'pendiente' }));
  assert.equal(revision.estado, 'pendiente');
  assert.equal(revision.vigente, true);
  assert.equal(revision.motivo, 'revision-explicita');
});

prueba('revisionVigente devuelve booleano estricto solo para revisada vigente', () => {
  const r = respuesta('r');
  assert.strictEqual(revisionVigente(r), false);
  assert.strictEqual(revisionVigente(r, revisada(r)), true);
  assert.strictEqual(revisionVigente(r, { contenido: revisada(r) }), true);
  assert.strictEqual(revisionVigente(r, revisada(r, { estado: 'pendiente' })), false);
  assert.strictEqual(revisionVigente(r, revisada(r, { autorId: null })), false);
  assert.strictEqual(revisionVigente({ ...r, version: 2 }, revisada(r)), false);
});

prueba('sello incompleto o contenido no comparable no autoriza revisada', () => {
  const r = respuesta('r');
  for (const cambio of [{ autorId: '' }, { fecha: null }, { fecha: 'ayer' }, { versionHuella: '' }, { estado: 'abierta' }]) {
    assert.equal(revisionRespuesta(r, revisada(r, cambio)).estado, 'pendiente');
    assert.equal(revisionRespuesta(r, revisada(r, cambio)).motivo, 'revision-incompleta');
  }
  assert.equal(revisionRespuesta({ ...r, noJson: undefined }, revisada(r)).motivo, 'contenido-no-comparable');
});

prueba('fecha imposible o sin zona no valida sellos; dia ISO y ano bisiesto si', () => {
  const r = respuesta('r');
  for (const fecha of ['2026-02-30T10:00:00Z', '2026-02-29T10:00:00Z', '2026-09-09T24:00:00Z', '2026-09-09T09:00:00']) {
    assert.strictEqual(revisionVigente(r, revisada(r, { fecha })), false);
    const j = construirJornada([cita('c')], [r], { r: trabajo(vinculo('c', undefined, { confirmadoEn: fecha })) });
    assert.equal(j.citas[0].confirmada, false);
  }
  assert.strictEqual(revisionVigente(r, revisada(r, { fecha: '2024-02-29T10:00:00Z' })), true);
  assert.strictEqual(revisionVigente(r, revisada(r, { fecha: '2026-09-09' })), true);
});

prueba('identidad confirmada no arrastra una respuesta desconocida de igual contacto', () => {
  const j = construirJornada([cita('c')], [respuesta('r1'), respuesta('r2')], { r1: trabajo(vinculo('c')) });
  assert.deepEqual(ids(j.citas[0].respuestas), ['r1']);
  assert.deepEqual(ids(j.sinVincular), ['r2']);
  assert.equal(j.grupos.length, 2);
  assert.equal(j.grupos.find(g => g.id === 'r:r2').confirmado, false);
});

prueba('no hay mutacion de agenda, respuestas ni trabajo; resultados repetibles', () => {
  const entradas = congelar({ agenda: [cita('c2', '10'), cita('c1')],
    respuestas: [respuesta('r2'), respuesta('r1')], trabajos: { r1: trabajo(vinculo('c1')) } });
  const antes = JSON.stringify(entradas);
  const a = construirJornada(entradas.agenda, entradas.respuestas, entradas.trabajos);
  const b = construirJornada(entradas.agenda, entradas.respuestas, entradas.trabajos);
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(entradas), antes);
  assert.strictEqual(a.citas[0].principal, entradas.respuestas[1]);
  assert.notStrictEqual(a.citas, b.citas);
});

prueba('trabajos heredados del prototipo y entradas malformadas no confirman', () => {
  const indice = Object.create({ r: trabajo(vinculo('c')) });
  const j = construirJornada([null, cita('c'), false], [false, respuesta('r'), null], indice);
  assert.equal(j.citas[0].confirmada, false);
  assert.equal(j.sinVincular.length, 1);
  const especiales = JSON.parse('{"__proto__":{"gestionConsulta":{"vinculo":null}}}');
  assert.equal(construirJornada([], [respuesta('__proto__')], especiales).grupos[0].id, 'r:__proto__');
});

prueba('IDs numericos se leen como claves; respuestas sin ID quedan separadas', () => {
  assert.equal(construirJornada([cita(0)], [respuesta(0)], { 0: trabajo(vinculo('0', 'portal:cero')) }).citas[0].confirmada, true);
  const rs = [{ paciente: { nombre: 'Ficticia' } }, { paciente: { nombre: 'Ficticia' } }, { id: 'sin-id:0' }];
  const j = construirJornada([], rs);
  assert.equal(j.grupos.length, 3);
  assert.equal(new Set(j.grupos.map(g => g.id)).size, 3);
  assert.ok(j.grupos.every(g => !g.confirmado));
});

console.log(`Jornada: ${pruebas} pruebas sinteticas OK; 4 APIs puras, sin red ni datos reales.`);
