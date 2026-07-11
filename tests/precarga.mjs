/**
 * Pruebas del puente respuesta → instrumentos (core/precarga.js).
 * Verifican que lo que la paciente contestó se traduce fielmente a la forma del
 * paciente compartido, que nada se inventa, y que el ruteo guardado se respeta
 * (con recálculo solo para respuestas anteriores al contrato).
 */

import { pacienteDesdeRespuesta, ruteoDesdeRespuesta } from '../core/precarga.js';
import { RUTEO_VERSION, instrumentosPara } from '../core/ruteoClinico.js';

let ok = 0, fail = 0;
function check(nombre, cond) {
  if (cond) { ok++; console.log(`  PASA  ${nombre}`); }
  else { fail++; console.log(`  FALLA ${nombre}`); }
}

const registro = {
  id: 'r1',
  version: 1,
  creado: '2026-07-08T15:00:00.000Z',
  paciente: { nombre: 'Laura Méndez', edad: 47, telefono: '5512345678', correo: 'x@y.z' },
  autoReporte: {
    mrs: { mrs_bochornos: 3, mrs_vejiga: 2 },
    dolor: { tiene: true, intensidad: 7, meses: 8 },
    hc: { enfDiabetes: true, fuma: true, sangrado: true, acne: true, caidaCabello: false, reglasRegulares: false },
  },
  ruteoClinico: {
    version: RUTEO_VERSION,
    generadoEn: '2026-07-08T15:00:00.000Z',
    instrumentosSugeridos: [{ instrumento: 'menopausia', nombre: 'Climaterio', prioridad: 'alta', motivo: 'x', fuente: ['mrs'], precarga: {}, accionSugerida: 'revisar_en_consulta' }],
    banderas: [],
  },
};

console.log('\nPrecarga: respuesta → paciente compartido');
const p = pacienteDesdeRespuesta(registro);
check('nombre y edad llegan a demografía', p.demografia.nombre === 'Laura Méndez' && p.demografia.edad === 47);
check('diabetes afirmada precarga antecedente', p.antecedentes.diabetes === true);
check('tabaquismo afirmado precarga antecedente', p.antecedentes.tabaquismo === true);
check('sangrado reportado precarga sangrado sin diagnóstico', p.antecedentes.sangradoNoDx === true);
check('auto-reporte viaja completo (escala, dolor, historia)',
  p.autoReporte.mrs.mrs_bochornos === 3 && p.autoReporte.dolor.intensidad === 7 && p.autoReporte.hc.acne === true);

const negada = pacienteDesdeRespuesta({ paciente: { nombre: 'B' }, autoReporte: { hc: { enfDiabetes: false, fuma: false } } });
check('lo negado NO se precarga como antecedente (queda para el médico)',
  !('diabetes' in negada.antecedentes) && !('tabaquismo' in negada.antecedentes));

const vacia = pacienteDesdeRespuesta(null);
check('registro nulo no truena y da forma vacía', vacia.demografia.nombre === '' && vacia.demografia.edad === null);

const edadTexto = pacienteDesdeRespuesta({ paciente: { edad: '47' } });
check('edad en texto se convierte a número', edadTexto.demografia.edad === 47);
const edadBasura = pacienteDesdeRespuesta({ paciente: { edad: 'abc' } });
check('edad no numérica queda en null', edadBasura.demografia.edad === null);
// El portal guarda edad null cuando la paciente no la escribe (no es obligatoria).
// Number(null) es 0: sin la guarda, se inventaban 0 años.
const edadNula = pacienteDesdeRespuesta({ paciente: { edad: null } });
check('edad omitida (null) queda en null, no en 0', edadNula.demografia.edad === null);
const edadVacia = pacienteDesdeRespuesta({ paciente: { edad: '' } });
check('edad vacía queda en null, no en 0', edadVacia.demografia.edad === null);

console.log('\nRuteo con edad desconocida (no inventa motivos por edad)');
const rSinEdad = instrumentosPara({
  paciente: { nombre: 'X', edad: null },
  autoReporte: { mrs: {}, dolor: { tiene: true, intensidad: 5 }, hc: {} },
});
check('edad desconocida: NO sugiere endometriosis por edad reproductiva',
  !rSinEdad.instrumentosSugeridos.some((s) => s.instrumento === 'endometriosis'));
check('edad desconocida: el dolor sí se sugiere por sí mismo',
  rSinEdad.instrumentosSugeridos.some((s) => s.instrumento === 'dolor-pelvico'));

console.log('\nPrecarga: ruteo de la respuesta');
const rt = ruteoDesdeRespuesta(registro);
check('respeta el ruteo guardado en el registro (no recalcula)',
  rt === registro.ruteoClinico && rt.instrumentosSugeridos.length === 1);

const viejaSinRuteo = { ...registro, ruteoClinico: undefined };
const rt2 = ruteoDesdeRespuesta(viejaSinRuteo);
check('respuesta vieja sin ruteo: lo calcula con el mismo motor',
  rt2.version === RUTEO_VERSION && Array.isArray(rt2.instrumentosSugeridos) && rt2.instrumentosSugeridos.length > 0);
check('respuesta vieja: hereda la fecha de creación como generadoEn', rt2.generadoEn === registro.creado);
check('respuesta vieja con factores: sugiere cardiometabólico en prioridad alta',
  rt2.instrumentosSugeridos.some((s) => s.instrumento === 'cardiometabolico' && s.prioridad === 'alta'));

console.log(`\nResultado precarga: ${ok} pasan, ${fail} fallan.`);
if (fail > 0) process.exit(1);
