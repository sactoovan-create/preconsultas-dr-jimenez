import assert from 'node:assert/strict';
import {
  escribirTrabajoLocal, leerTrabajoLocal, activarTrabajoLocal, claveTrabajoActiva,
  borrarTrabajoLocal, listarTrabajos, guardarTrabajoNube,
} from '../core/trabajo.js';

const valores = new Map();
globalThis.localStorage = {
  get length() { return valores.size; }, key: i => [...valores.keys()][i],
  getItem: k => valores.get(k) ?? null, setItem: (k, v) => valores.set(k, v), removeItem: k => valores.delete(k),
};
const t = { paciente: { demografia: { nombre: 'Sintetica' } }, origen: { id: 'qa-A' },
  gestionConsulta: { revision: { estado: 'revisada', versionHuella: 'qa-v1' }, seleccion: ['mama'], auditoria: [] } };
escribirTrabajoLocal('qa-A', t, 'local');
assert.deepEqual(leerTrabajoLocal('qa-A', 'local'), t);
activarTrabajoLocal('qa-A', 'local');
escribirTrabajoLocal('qa-B', { ...t, origen: { id: 'qa-B' } }, 'local');
assert.equal(claveTrabajoActiva('local'), 'qa-A', 'Guardar B no cambia la respuesta activa');
escribirTrabajoLocal('qa-A', t, 'cuenta-ficticia');
assert.equal(leerTrabajoLocal('qa-A', 'otra-cuenta'), null);
assert.throws(() => leerTrabajoLocal('qa-A', null), { code: 'SIN_SESION' });
assert.throws(() => escribirTrabajoLocal('qa-B', t, 'local'), { code: 'TRABAJO_INVALIDO' });
localStorage.setItem('drj_trabajo_legacy', JSON.stringify({ ...t, origen: { id: 'legacy' } }));
assert.ok(leerTrabajoLocal('legacy', 'local'));
assert.equal(leerTrabajoLocal('legacy', 'cuenta-ficticia'), null, 'No importar legacy sin cuenta');
let indice = await listarTrabajos();
assert.equal(indice.estado, 'local');
assert.deepEqual(Object.keys(indice.trabajos).sort(), ['legacy', 'qa-A', 'qa-B']);
assert.equal(indice.trabajos['qa-A'].gestionConsulta.revision.versionHuella, 'qa-v1');
assert.deepEqual(indice.porClave['qa-A'].contenido.gestionConsulta.seleccion, ['mama']);
localStorage.setItem('drj_trabajo_corrupto', '{');
indice = await listarTrabajos();
assert.equal(indice.estado, 'error');
assert.ok(indice.error);
assert.ok(indice.trabajos['qa-A'], 'Conserva indice parcial');
borrarTrabajoLocal('qa-A', 'local');
assert.equal(claveTrabajoActiva('local'), null);
assert.ok(leerTrabajoLocal('qa-A', 'cuenta-ficticia'));
await assert.rejects(guardarTrabajoNube('qa-B', t), { code: 'VERSION_DESCONOCIDA' });
globalThis.localStorage = { setItem() { throw Error('quota'); }, getItem() { throw Error('denied'); } };
assert.throws(() => escribirTrabajoLocal('qa-A', t, 'local'), { code: 'ALMACENAMIENTO_LOCAL' });
assert.throws(() => leerTrabajoLocal('qa-A', 'local'), { code: 'ALMACENAMIENTO_LOCAL' });
console.log('trabajo-contexto: 19 comprobaciones locales aprobadas; sin red ni datos reales.');
