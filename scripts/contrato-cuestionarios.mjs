#!/usr/bin/env node
/**
 * Contrato de los cuestionarios validados con el ERP (19/10/2026).
 *
 * Genera `tests/fixtures/contrato-cuestionarios.json`: registros completos de la
 * preconsulta armados con la MISMA función del envío real (`construirRegistro`, en
 * core/registroPreconsulta.js) a partir de respuestas inventadas («Prueba QA»), más el
 * texto que vio la paciente (PHQ-9 «Spanish for Mexico» y CSI-Sp). El ERP guarda una
 * copia idéntica en `instrumentos/tests/fixtures/contrato_portal_cuestionarios.json` y
 * prueba con ella su lectura (llaves `item1…`, `a1…`, `"si"/"no"`), la alerta del ítem 9
 * y que sus textos del PHQ-9 sean los mismos. Antes de esto cada lado probaba con un
 * formato escrito a mano y el ERP leía todo PHQ-9 del portal como «sin dato».
 *
 *   node scripts/contrato-cuestionarios.mjs           # reescribe el archivo
 *   node scripts/contrato-cuestionarios.mjs --check   # falla si está desactualizado (npm test)
 *
 * Determinista: sin reloj ni red. Las dos marcas de tiempo del registro se fijan
 * (`submittedAtClient` por `consentimientoFecha`; `ruteoClinico.generadoEn` se reemplaza
 * aquí, y solo aquí, por una fecha fija).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { construirRegistro } from '../core/registroPreconsulta.js';
import { combinarAlertaSeguridad, cuestionariosParaEnviar } from '../core/cuestionarios/index.js';
import { alertaUrgente, FORMULARIO_VERSION } from '../core/preconsultaFlow.js';
import * as phq9 from '../core/cuestionarios/phq9.js';
import * as csi from '../core/cuestionarios/csi.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RUTA_FIXTURE = path.join(RAIZ, 'tests', 'fixtures', 'contrato-cuestionarios.json');
const FECHA = '2026-10-19T16:00:00.000Z';

const phqCon = (valores, item9, extra = {}) => ({
  ...Object.fromEntries(valores.map((v, i) => [`item${i + 1}`, v])),
  ...(item9 === null ? {} : { item9 }),
  ...extra,
});
const csiCon = (valor, extra = {}) => ({
  ...Object.fromEntries(csi.ITEMS_A.map((it) => [it.id, valor])),
  ...extra,
});

/**
 * Casos del contrato y lo que el ERP debe concluir de cada uno (`esperadoErp`):
 * `alerta` = tipo de AlertaSeguridad (null = ninguna), `item9`, `phq9Total`, `csiTotal`
 * y `prioridadMaxima` (ítem 9 >= 2 o total >= 20).
 */
const CASOS = [
  { id: 'item9_0', dolor: false, phq9: phqCon([0, 0, 0, 0, 0, 0, 0, 0], 0),
    esperadoErp: { alerta: null, item9: 0, phq9Total: 0, csiTotal: null, prioridadMaxima: false } },
  { id: 'item9_1', dolor: false, phq9: phqCon([1, 1, 1, 1, 1, 1, 1, 1], 1),
    esperadoErp: { alerta: 'ideacion', item9: 1, phq9Total: 9, csiTotal: null, prioridadMaxima: false } },
  { id: 'item9_2_csi', dolor: true, phq9: phqCon([1, 1, 1, 1, 1, 1, 1, 1], 2, { dificultad: 2 }),
    csi: csiCon(2, { b3: 'si', b3_anio: 2019, b10: 'no' }),
    esperadoErp: { alerta: 'ideacion', item9: 2, phq9Total: 10, csiTotal: 50, prioridadMaxima: true } },
  { id: 'item9_3', dolor: false, phq9: phqCon([3, 3, 3, 3, 3, 3, 3, 3], 3),
    esperadoErp: { alerta: 'ideacion', item9: 3, phq9Total: 27, csiTotal: null, prioridadMaxima: true } },
  { id: 'item9_falta', dolor: false, phq9: phqCon([0, 0, 0, 0, 0, 0, 0, 0], null),
    esperadoErp: { alerta: 'sin_dato', item9: null, phq9Total: null, csiTotal: null, prioridadMaxima: false } },
  { id: 'total_grave_item9_0', dolor: false, phq9: phqCon([3, 3, 3, 3, 3, 3, 3, 3], 0),
    esperadoErp: { alerta: 'total_grave', item9: 0, phq9Total: 24, csiTotal: null, prioridadMaxima: true } },
];

function datosDeCaso(caso) {
  const hc = {
    telefono: '5512345678',
    motivo: 'Prueba QA contrato',
    temasConsulta: caso.dolor ? ['dolor'] : ['control'],
    senalesUrgencia: ['ninguna'],
    etapaReproductiva: 'menstrua_regular',
    reglasRegulares: true,
    antecedentesSeleccionados: ['ninguna'],
    antecedentesRevisados: true,
    dom_colonia: 'Colonia QA', dom_cp: '01000', dom_municipio: 'Municipio QA', dom_estado: 'Jalisco',
    formularioVersion: FORMULARIO_VERSION,
  };
  const dolor = caso.dolor
    ? { tiene: true, intensidad: 6, inicio: 'recurrente', meses: 12 }
    : { tiene: false, intensidad: null, meses: null };
  // Igual que PreConsulta.jsx: solo los cuestionarios ofrecidos, con valores válidos.
  const cuestionarios = cuestionariosParaEnviar({ hc, dolor }, {
    phq9: { version: phq9.VERSION, respuestas: caso.phq9 },
    ...(caso.csi ? { csi: { version: csi.VERSION, respuestas: caso.csi } } : {}),
  });
  const reporte = { mrs: {}, dolor, hc, profundos: {}, ...cuestionarios };
  return {
    ...reporte,
    contacto: { telefono: hc.telefono, correo: null },
    demografia: { nombre: `Prueba QA ${caso.id}`, edad: 34 },
    consentimiento: true,
    consentimientoFecha: FECHA,
    formularioVersion: FORMULARIO_VERSION,
    atribucion: { version: 1, booking_channel: 'whatsapp', patient_reported_source: 'google_maps' },
    alertaSeguridad: combinarAlertaSeguridad(alertaUrgente(reporte), reporte),
  };
}

export function registroDeCaso(caso) {
  const registro = construirRegistro(datosDeCaso(caso), null, [], null, 'no');
  delete registro.id; // En Supabase el id y la fecha de servidor son columnas, no parte de `contenido`.
  registro.ruteoClinico.generadoEn = FECHA;
  return registro;
}

export function construirFixture() {
  return {
    descripcion: 'Contrato portal → ERP de los cuestionarios validados. Generado por scripts/contrato-cuestionarios.mjs '
      + 'con construirRegistro (core/registroPreconsulta.js); no editar a mano. El ERP guarda una copia idéntica en '
      + 'instrumentos/tests/fixtures/contrato_portal_cuestionarios.json. Datos inventados («Prueba QA»).',
    formularioVersion: FORMULARIO_VERSION,
    llaves: {
      phq9: 'item1..item9 (0..3), dificultad (0..3)',
      csi: 'a1..a25 (0..4), b1..b10 ("si"/"no"), bN_anio (año, solo con "si")',
    },
    casos: Object.fromEntries(CASOS.map((caso) => [caso.id, { esperadoErp: caso.esperadoErp, contenido: registroDeCaso(caso) }])),
    textos: {
      phq9: {
        instruccion: phq9.INSTRUCCION,
        opciones: phq9.OPCIONES.map((o) => o.etiqueta),
        items: phq9.ITEMS.map((it) => it.texto),
        dificultad: phq9.DIFICULTAD.texto,
        opcionesDificultad: phq9.DIFICULTAD.opciones.map((o) => o.etiqueta),
        credito: phq9.CREDITO,
      },
      csi: {
        opciones: csi.OPCIONES.map((o) => o.etiqueta),
        parteA: csi.ITEMS_A.map((it) => it.texto),
        parteB: csi.ITEMS_B.map((it) => it.texto),
      },
    },
  };
}

export function serializar(fixture) {
  return JSON.stringify(fixture, null, 1) + '\n';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const nuevo = serializar(construirFixture());
  if (process.argv.includes('--check')) {
    const actual = await readFile(RUTA_FIXTURE, 'utf8').catch(() => '');
    if (actual !== nuevo) {
      console.error(`${path.relative(RAIZ, RUTA_FIXTURE)} está desactualizado: corre «node scripts/contrato-cuestionarios.mjs» y copia el archivo al ERP (instrumentos/tests/fixtures/contrato_portal_cuestionarios.json).`);
      process.exit(1);
    }
    console.log('Contrato de cuestionarios al día.');
  } else {
    await mkdir(path.dirname(RUTA_FIXTURE), { recursive: true });
    await writeFile(RUTA_FIXTURE, nuevo);
    console.log(`Escrito ${path.relative(RAIZ, RUTA_FIXTURE)}`);
  }
}
