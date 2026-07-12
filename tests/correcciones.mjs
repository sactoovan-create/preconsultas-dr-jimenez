/**
 * Pruebas de regresión de las correcciones de la revisión integral. Cada una fija
 * el comportamiento correcto de un defecto ya arreglado, para que no reaparezca.
 */

import { imcSeguro } from '../core/antropometria.js';
import { calcularDerivados } from '../instruments/cardiometabolico/engine.js';
import { evaluarOsea } from '../instruments/osea/engine.js';
import { condicionesAutomaticas } from '../instruments/anticoncepcion/engine.js';
import { clasificarCiclo } from '../instruments/sop/engine.js';
import { evaluarVia } from '../instruments/menopausia/engine.js';
import { extraerLabsPorVision } from '../core/labReaderVision.js';

let ok = 0, fail = 0;
function check(nombre, cond) {
  if (cond) { ok++; console.log(`  PASA  ${nombre}`); }
  else { fail++; console.log(`  FALLA ${nombre}`); }
}

console.log('\nÍndice de masa corporal seguro (antropometría)');
check('talla en cero no calcula (nada de infinito)', imcSeguro(70, 0) === null);
check('peso en cero no calcula', imcSeguro(0, 160) === null);
check('talla capturada en metros (1.6) se rechaza', imcSeguro(70, 1.6) === null);
check('nulos no calculan', imcSeguro(null, null) === null && imcSeguro(70, null) === null);
check('valores plausibles sí calculan', Math.round(imcSeguro(70, 170) * 10) / 10 === 24.2);

console.log('\nCardiometabólico: talla en cero deja el índice nulo');
check('el índice queda nulo con talla cero', calcularDerivados({ demografia: { edad: 55 }, signos: { peso: 70, talla: 0 }, labs: {}, antecedentes: {} }).imc == null);
check('con talla válida sí hay índice', calcularDerivados({ demografia: { edad: 55 }, signos: { peso: 70, talla: 170 }, labs: {}, antecedentes: {} }).imc != null);

console.log('\nÓsea: peso en cero no fabrica "bajo peso"');
const oseaCero = evaluarOsea({ demografia: { edad: 55, edadMenopausia: 50 }, signos: { peso: 0, talla: 160 } }, {});
check('no aparece "Bajo peso corporal" con peso cero', !JSON.stringify(oseaCero).includes('Bajo peso corporal'));

console.log('\nAnticoncepción: edad ausente no se toma como "menor de 35"');
const autoSinEdad = condicionesAutomaticas({ demografia: { edad: null }, signos: {}, antecedentes: {} }, { fuma: true, fumaIntenso: true });
check('no se afirma "menor de 35" sin edad', !autoSinEdad.tabacoMenor35);
check('se marca la edad como no capturada', autoSinEdad.tabacoEdadDesconocida === true);
const auto35 = condicionesAutomaticas({ demografia: { edad: 38 }, signos: {}, antecedentes: {} }, { fuma: true, fumaIntenso: true });
check('con 38 años sí clasifica como treinta y cinco o más', auto35.tabaco35mas === true);
check('talla cero no marca obesidad', !condicionesAutomaticas({ demografia: { edad: 30 }, signos: { peso: 70, talla: 0 }, antecedentes: {} }, {}).obesidad);

console.log('\nSíndrome poliendocrino: adolescente sin años posmenarca no se clasifica por regla adulta');
const cicloAdol = clasificarCiclo({ poblacion: 'adolescente', longitudCiclo: 40, aniosPosmenarca: null });
check('no se marca irregular sin años posmenarca', cicloAdol.irregular === false && cicloAdol.indeterminado === true);
const cicloAdolDato = clasificarCiclo({ poblacion: 'adolescente', longitudCiclo: 40, aniosPosmenarca: 2 });
check('con años posmenarca sí clasifica (40 días normal en el tramo uno a tres años)', cicloAdolDato.irregular === false && !cicloAdolDato.indeterminado);

console.log('\nMenopausia: la vía no marca obesidad falsa con talla en metros');
const viaMetros = evaluarVia({ signos: { peso: 70, talla: 1.7 } }, {});
check('talla capturada en metros no marca "índice de treinta o más"', !viaMetros.factores.includes('índice de masa corporal de treinta o más'));
const viaObesa = evaluarVia({ signos: { peso: 95, talla: 160 } }, {});
check('obesidad real (índice ~37) sí se marca', viaObesa.factores.includes('índice de masa corporal de treinta o más'));

console.log('\nLector por visión: vacío y falso no se vuelven cero');
const respuestaFalsa = JSON.stringify({ colesterolTotal: 180, colesterolHdl: '', glucosa: false });
const labs = await extraerLabsPorVision('imagen', 'image/jpeg', async () => respuestaFalsa);
check('el valor real sí se conserva', labs.colesterolTotal === 180);
check('cadena vacía no se vuelve cero', labs.colesterolHdl === undefined);
check('booleano no se vuelve cero', labs.glucosa === undefined);

console.log(`\nResultado correcciones: ${ok} pasan, ${fail} fallan.`);
if (fail > 0) process.exit(1);
