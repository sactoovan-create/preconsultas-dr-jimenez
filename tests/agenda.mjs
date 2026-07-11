/**
 * Pruebas del cruce agenda del día × cuestionarios (core/agenda.js) y de la
 * normalización de emparejamiento (core/emparejar.js). Funciones puras.
 */

import { cruzarAgenda, hoyLocal } from '../core/agenda.js';
import { normalizarTelefono, normalizarNombre } from '../core/emparejar.js';

let ok = 0, fail = 0;
function check(nombre, cond) {
  if (cond) { ok++; console.log(`  PASA  ${nombre}`); }
  else { fail++; console.log(`  FALLA ${nombre}`); }
}

console.log('\nNormalización para emparejar');
check('teléfono: quita lada de país y deja diez dígitos', normalizarTelefono('+52 1 55 3344 2211') === '5533442211');
check('teléfono: ya normalizado se conserva', normalizarTelefono('5533442211') === '5533442211');
check('teléfono nulo no truena', normalizarTelefono(null) === '');
check('nombre: sin acentos, minúsculas, espacios colapsados', normalizarNombre('  Verónica   SALAS  Ortega ') === 'veronica salas ortega');

console.log('\nCruce agenda × respuestas');
const agenda = [
  { cita_id: 'c1', inicio: '2026-07-11T09:00:00-06:00', nombre: 'Verónica Salas Ortega', telefono: '5533442211', estado: 'BOOKED' },
  { cita_id: 'c2', inicio: '2026-07-11T10:00:00-06:00', nombre: 'Carmen Rivas Duarte', telefono: '5544332211', estado: 'BOOKED' },
  { cita_id: 'c3', inicio: '2026-07-11T11:00:00-06:00', nombre: 'Ana López', telefono: '', estado: 'BOOKED' },
];
const respuestas = [
  // Empareja con c1 por teléfono aunque el teléfono venga con lada.
  { id: 'r1', paciente: { nombre: 'Veronica Salas', telefono: '+521 55 3344 2211' }, creado: '2026-07-11T08:00:00Z' },
  // Empareja con c3 por nombre (la cita no trae teléfono).
  { id: 'r3', paciente: { nombre: 'Ana López', telefono: '5599887766' }, creado: '2026-07-11T07:30:00Z' },
  // No está en la agenda de hoy.
  { id: 'r9', paciente: { nombre: 'Paciente Suelta', telefono: '5511002200' }, creado: '2026-07-11T06:00:00Z' },
];

const { agendadas, sinAgendar } = cruzarAgenda(agenda, respuestas);
check('las tres citas del día aparecen, en orden', agendadas.length === 3);
check('c1 empareja por teléfono con lada distinta', agendadas[0].contesto && agendadas[0].respuesta.id === 'r1');
check('c2 no tiene cuestionario', agendadas[1].contesto === false && agendadas[1].respuesta === null);
check('c3 empareja por nombre cuando no hay teléfono', agendadas[2].contesto && agendadas[2].respuesta.id === 'r3');
check('la respuesta no agendada queda aparte', sinAgendar.length === 1 && sinAgendar[0].id === 'r9');
check('ninguna respuesta se usa dos veces', new Set([agendadas[0].respuesta?.id, agendadas[2].respuesta?.id]).size === 2);

console.log('\nCasos límite');
const vacio = cruzarAgenda([], respuestas);
check('sin agenda: todas las respuestas quedan como sueltas', vacio.agendadas.length === 0 && vacio.sinAgendar.length === 3);
const sinResp = cruzarAgenda(agenda, []);
check('sin respuestas: las citas salen todas sin cuestionario', sinResp.agendadas.length === 3 && sinResp.agendadas.every((a) => !a.contesto));
check('cruce con nulos no truena', cruzarAgenda(null, null).agendadas.length === 0);

// Dos citas con el mismo nombre y una sola respuesta: la respuesta se asigna una vez.
const dobles = cruzarAgenda(
  [{ cita_id: 'd1', inicio: '2026-07-11T09:00:00Z', nombre: 'María Pérez', telefono: '' },
   { cita_id: 'd2', inicio: '2026-07-11T10:00:00Z', nombre: 'María Pérez', telefono: '' }],
  [{ id: 'u1', paciente: { nombre: 'María Pérez', telefono: '' }, creado: '2026-07-11T08:00:00Z' }],
);
check('nombre repetido: solo una cita recibe la única respuesta',
  dobles.agendadas.filter((a) => a.contesto).length === 1);

check('hoyLocal da formato AAAA-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(hoyLocal(new Date('2026-07-11T15:00:00Z'))));

console.log(`\nResultado agenda: ${ok} pasan, ${fail} fallan.`);
if (fail > 0) process.exit(1);
