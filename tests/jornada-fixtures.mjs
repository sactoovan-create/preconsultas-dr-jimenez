import { respuestasPrueba } from './panel-fixtures.mjs';
import { huellaRespuesta } from '../core/jornada.js';

export function datosJornada(dia) {
  const sello = dia + 'T12:00:00Z';
  const respuestas = structuredClone(respuestasPrueba);
  const anterior = { ...structuredClone(respuestas[0]), id: 'qa-panel-historica', creado: '2026-08-12T12:00:00Z' };
  respuestas.push(anterior);
  const agenda = [0, 1, 2, 3, 4, 5].map(i => ({ cita_id: 'qa-cita-' + i, fecha: dia,
    inicio: dia + 'T' + String(8 + Math.floor(i / 2)).padStart(2, '0') + ':' + (i % 2 ? '30' : '00') + ':00-06:00',
    nombre: respuestas[i].paciente.nombre, telefono: respuestas[i].paciente.telefono || '', estado: 'Confirmada' }));
  const trabajos = {};
  for (const i of [0, 3, 4]) {
    const r = respuestas[i];
    trabajos[r.id] = { origen: { id: r.id, nombre: r.paciente.nombre, fecha: r.creado }, paciente: { demografia: { nombre: r.paciente.nombre, edad: r.paciente.edad } },
      guardadoEn: sello, gestionConsulta: { vinculo: { citaId: agenda[i].cita_id, pacienteId: 'portal:demo-' + i,
        nombre: r.paciente.nombre, fecha: dia, inicio: agenda[i].inicio, estado: 'confirmado', confirmadoEn: sello, autorId: 'local' },
        seleccion: [], auditoria: [], revision: i === 3 ? { estado: 'revisada', fecha: sello, autorId: 'local', versionHuella: huellaRespuesta(r) } : null } };
  }
  trabajos[anterior.id] = { paciente: { demografia: { nombre: anterior.paciente.nombre, edad: anterior.paciente.edad } }, origen: { id: anterior.id, nombre: anterior.paciente.nombre, fecha: anterior.creado }, guardadoEn: sello,
    gestionConsulta: { vinculo: { citaId: 'qa-cita-historica', pacienteId: 'portal:demo-0', nombre: anterior.paciente.nombre,
      fecha: '2026-08-12', inicio: '2026-08-12T09:00:00-06:00', estado: 'confirmado', confirmadoEn: sello, autorId: 'local' },
      revision: { estado: 'revisada', fecha: sello, autorId: 'local', versionHuella: huellaRespuesta(anterior) }, seleccion: [], auditoria: [] } };
  return { respuestas, agenda, trabajos };
}
