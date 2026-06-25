/**
 * Batería de pruebas de los motores puros. Se ejecuta con `node tests/suite.mjs`
 * o `npm test`. No usa framework: cada prueba es una aserción que cuenta éxitos y
 * fracasos, y el proceso termina con código distinto de cero si algo falla.
 *
 * Cubre, por ahora, lo tocado en la Fase 1 de la reparación:
 *  - Congela el caso canónico de PREVENT (regresión).
 *  - Fija los cuatro tramos de la Menopause Rating Scale con el corte corregido.
 *  - Verifica que las dos evaluaciones de terapia hormonal leen las
 *    contraindicaciones del paciente compartido (fuente única).
 *  - Verifica que la impresión escapa el marcado de los valores dinámicos.
 */

import { calcularPrevent } from '../core/prevent.js';
import { evaluarMrs, evaluarMenopausia } from '../instruments/menopausia/engine.js';
import { evaluarTerapiaHormonal } from '../instruments/cardiometabolico/engine.js';
import { construirHojaPaciente } from '../core/printSheet.js';
import { construirInforme } from '../core/printReport.js';
import { construirHojaDiario } from '../core/printDiario.js';
import { construirResumen } from '../core/resumenPaciente.js';
import { guardarRespuesta, listarRespuestas, eliminarRespuesta } from '../core/respuestas.js';

let ok = 0, fail = 0;
function check(nombre, cond) {
  if (cond) { ok++; console.log(`  PASA  ${nombre}`); }
  else { fail++; console.log(`  FALLA ${nombre}`); }
}
function aprox(a, b, tol = 0.0005) { return Math.abs(a - b) <= tol; }

// localStorage simulado para probar la capa de almacenamiento en node.
globalThis.localStorage = (() => {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();

// Paciente base reutilizable.
function pacienteBase(extra = {}) {
  return {
    demografia: { nombre: 'Prueba', edad: 52, edadMenopausia: 50, histerectomia: false, etapaReproductiva: 'post' },
    signos: { peso: 70, talla: 160, sistolica: 120, diastolica: 78, circunferencia: 82 },
    labs: {},
    antecedentes: {
      diabetes: false, tabaquismo: false, antihipertensivo: false, estatina: false,
      ecvEstablecida: null, ecvSubclinica: null,
      cancerMama: null, tromboembolismo: null, hepatica: null, sangradoNoDx: null,
    },
    ...extra,
  };
}

console.log('PREVENT · caso canónico');
{
  const r = calcularPrevent({
    edad: 50, colesterolTotal: 200, colesterolHdl: 45, sistolica: 160,
    filtracion: 90, imc: 35, diabetes: true, tabaquismo: false,
    antihipertensivo: true, estatina: false,
  });
  check('riesgo total a diez años ≈ 0.147', aprox(r.total10, 0.147, 0.0006));
  check('riesgo total a treinta años ≈ 0.530', aprox(r.total30, 0.530, 0.0006));
  check('edad fuera de rango devuelve null',
    calcularPrevent({ edad: 29, colesterolTotal: 200, colesterolHdl: 45, sistolica: 120, filtracion: 90, diabetes: false, tabaquismo: false }) === null);
}

console.log('Menopause Rating Scale · tramos del total (corte [4, 8, 16])');
{
  const sev = (items) => evaluarMrs(items).sevTotal;
  check('total 4 es mínima', sev({ mrs_bochornos: 4 }) === 'mínima');
  check('total 8 es leve', sev({ mrs_bochornos: 4, mrs_cardiaco: 4 }) === 'leve');
  check('total 9 es moderada', sev({ mrs_bochornos: 4, mrs_cardiaco: 4, mrs_animo: 1 }) === 'moderada');
  check('total 16 es moderada (no severa)', sev({ mrs_bochornos: 4, mrs_cardiaco: 4, mrs_sueno: 4, mrs_musculo: 4 }) === 'moderada');
  check('total 17 es severa', sev({ mrs_bochornos: 4, mrs_cardiaco: 4, mrs_sueno: 4, mrs_musculo: 4, mrs_animo: 1 }) === 'severa');
}

console.log('Terapia hormonal · contraindicaciones leídas del paciente compartido');
{
  // Cardiometabólico: el motor lee p.antecedentes.
  const conContra = evaluarTerapiaHormonal(pacienteBase({
    antecedentes: { ...pacienteBase().antecedentes, cancerMama: true },
  }), null);
  check('cardiometabólico bloquea con cáncer de mama', conContra && conContra.tipo === 'contra');
  const sinContra = evaluarTerapiaHormonal(pacienteBase(), null);
  check('cardiometabólico sin contraindicación no bloquea', sinContra && sinContra.tipo !== 'contra');
  // Regresión: el expediente externo puede inyectar la condición como valor
  // verdadero no booleano (1, 'sí'); debe bloquear igual que el booleano true.
  const importado = evaluarTerapiaHormonal(pacienteBase({
    antecedentes: { ...pacienteBase().antecedentes, ecvEstablecida: 1 },
  }), null);
  check('cardiometabólico bloquea con cardiopatía importada como valor no booleano', importado && importado.tipo === 'contra');

  // Menopausia: ruta completa, contraindicación en el paciente compartido.
  const menoContra = evaluarMenopausia(pacienteBase({
    antecedentes: { ...pacienteBase().antecedentes, tromboembolismo: true },
  }), {});
  check('menopausia marca contraindicada con tromboembolismo', menoContra.candidatura.tipo === 'contraindicada');
  const menoOk = evaluarMenopausia(pacienteBase(), {});
  check('menopausia recomienda en ventana sin contraindicación', menoOk.candidatura.recomienda === true);
}

console.log('Impresión · escape de marcado en valores dinámicos');
{
  const malicioso = '<script>alert(1)</script>';
  const hoja = construirHojaPaciente({ identificacion: { nombre: malicioso, edad: 50 }, titulo: 'Hoja', secciones: [], recomendaciones: ['<b>texto</b>'] });
  check('hoja de paciente no inyecta etiqueta script', !hoja.includes('<script>alert(1)'));
  check('hoja de paciente escapa el nombre', hoja.includes('&lt;script&gt;'));
  check('hoja de paciente escapa la recomendación', hoja.includes('&lt;b&gt;texto&lt;/b&gt;'));

  const informe = construirInforme({ paciente: { demografia: { nombre: '<img src=x>', edad: 40 } }, items: [{ titulo: '<i>t</i>', titular: 'Pólipo', estado: 'ok' }], fundamento: { fuentes: ['<x>'], revisado: 'junio' } });
  check('informe escapa el nombre', informe.includes('&lt;img src=x&gt;') && !informe.includes('<img src=x>'));

  const diario = construirHojaDiario({ identificacion: { nombre: '<svg onload=1>', edad: 30 }, columnas: ['<th>'], renglones: 2 });
  check('diario escapa el nombre y las columnas', diario.includes('&lt;svg onload=1&gt;') && diario.includes('&lt;th&gt;'));
}

console.log('Resumen de la paciente · contrato portal hacia panel');
{
  const r1 = construirResumen({ mrs: { mrs_bochornos: 4, mrs_cardiaco: 4 }, dolor: { tiene: true, intensidad: 7, meses: 5 } });
  check('calcula total e intensidad de menopausia', r1.menopausia.total === 8 && r1.menopausia.intensidad === 'leve');
  check('incluye el dolor cuando lo hay', !!r1.dolor && r1.dolor.intensidad === 7 && r1.dolor.meses === 5);
  const r2 = construirResumen({ mrs: {}, dolor: { tiene: false } });
  check('sin dolor el campo es null', r2.dolor === null);
  const r3 = construirResumen({});
  check('tolera datos vacíos', r3.menopausia.total === 0 && r3.dolor === null);
}

console.log('Almacenamiento de respuestas · modo local');
{
  globalThis.localStorage.clear();
  const guardado = await guardarRespuesta({ paciente: { nombre: 'Prueba Uno' }, resumen: { menopausia: { total: 3, intensidad: 'mínima' } } });
  check('guardar devuelve id y fecha', !!guardado.id && !!guardado.creado);
  const lista1 = await listarRespuestas();
  check('listar incluye la respuesta guardada', lista1.length === 1 && lista1[0].paciente.nombre === 'Prueba Uno');
  await guardarRespuesta({ paciente: { nombre: 'Prueba Dos' } });
  const lista2 = await listarRespuestas();
  check('la respuesta más reciente va primero', lista2.length === 2 && lista2[0].paciente.nombre === 'Prueba Dos');
  await eliminarRespuesta(guardado.id);
  const lista3 = await listarRespuestas();
  check('eliminar quita la respuesta', lista3.length === 1 && !lista3.find((r) => r.id === guardado.id));
}

console.log(`\nResultado: ${ok} pasan, ${fail} fallan.`);
if (fail > 0) process.exitCode = 1;
