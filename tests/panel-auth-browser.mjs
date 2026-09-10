/**
 * Auth UI regression against the REAL guard, keyed provider and panel.
 * Run with the blank-backend dev server already listening on 5197:
 * NODE_PATH=/Users/dr.jimenez/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node tests/panel-auth-browser.mjs
 * Optional: PANEL_QA_URL (loopback only), PANEL_QA_BROWSER (default chrome).
 * Synthetic accounts/records, isolated browser storage, intercepted transports.
 * Includes batched A -> signed out -> A and stale initial-scope rejection races.
 * No production, real credentials, external network, screenshots or output files.
 * Does not validate Supabase Auth, RLS, SDK event delivery or remote persistence.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const { chromium } = createRequire(import.meta.url)('playwright');
const base = new URL(process.env.PANEL_QA_URL || 'http://127.0.0.1:5197');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname), 'Loopback server required.');
assert.ok(['http:', 'https:'].includes(base.protocol) && !base.username && !base.password);
const origen = base.origin;
const passthrough = 'qa_auth_passthrough';
const fuenteGuard = await readFile(new URL('../Respuestas.jsx', import.meta.url), 'utf8');
const cuentas = { A: 'qa-auth-medico-A', B: 'qa-auth-medico-B' };
const registro = (cuenta, sufijo = '') => ({
  id: `qa-auth-respuesta-${cuenta}${sufijo}`, version: 3, creado: '2026-09-10T12:00:00Z',
  paciente: { nombre: `Persona ficticia auth ${cuenta}${sufijo}`, edad: 40 },
  autoReporte: { hc: { motivo: `Motivo sintetico ${cuenta}${sufijo}`, temasConsulta: ['control'],
    entrevistaVersion: '1.0.0' }, dolor: { tiene: false }, mrs: {} },
  ruteoClinico: { version: 4, instrumentosSugeridos: [], banderas: [] },
});
const respuestaA = registro('A'), respuestaB = registro('B'), respuestaTardia = registro('A', '-tardia');

const mockRespuestas = `
export * from '/tests/panel-mock-services.mjs';
const qa = () => window.__authQa;
export async function sesion() {
  const q = qa(); q.llamadas.sesion++;
  if (q.enCallback) q.authDentroCallback++;
  if (q.fallo === 'sesion') throw Error('QA initial session failure');
  return q.cuenta ? { user: { id: q.cuenta } } : null;
}
export async function iniciarSesion() { throw Error('Use synthetic external auth events, not credentials.'); }
export async function cerrarSesion() { qa().emitir(null, 'SIGNED_OUT'); }
export async function listarRespuestas() {
  const q = qa(), cuenta = q.cuenta;
  const llamada = { cuenta, terminada: false, espera: q.retencionSiguiente };
  const copia = structuredClone(q.respuestas[cuenta] || []);
  q.listados.push(llamada); q.retencionSiguiente = null;
  if (llamada.espera) await new Promise(resolve => q.retenidas.set(llamada.espera, resolve));
  llamada.terminada = true;
  return copia;
}
export async function guardarRespuesta() { throw Error('No response writes in auth regression.'); }
export async function eliminarRespuesta() { throw Error('No response deletes in auth regression.'); }
`;

const mockTrabajo = `
import * as real from '/core/trabajo.js?${passthrough}=1';
export * from '/core/trabajo.js?${passthrough}=1';
if (real.nubeActiva()) throw Error('Auth regression requires a BLANK backend. Refusing cloud access.');
const qa = () => window.__authQa;
const scope = cuenta => cuenta ? 'cuenta:qa-auth:' + cuenta : null;
export async function obtenerAmbitoTrabajo() {
  const q = qa(); q.llamadas.ambito++;
  if (q.enCallback) q.authDentroCallback++;
  if (q.fallo === 'ambito-tardio' && !q.lecturaInicial) {
    q.lecturaInicial = { cuenta: q.cuenta, finalizada: false };
    try {
      await new Promise((resolve, reject) => {
        q.rechazarLecturaInicial = () => reject(Error('QA stale initial scope failure'));
      });
    } finally { q.lecturaInicial.finalizada = true; }
  }
  if (q.fallo === 'ambito') throw Error('QA initial scope failure');
  return scope(q.cuenta);
}
export async function observarCuentaTrabajo(callback) {
  const q = qa(); q.llamadas.observar++;
  if (q.fallo === 'observador') throw Error('QA observer setup failure');
  q.observadores.add(callback);
  return () => { if (q.observadores.delete(callback)) q.llamadas.desuscribir++; };
}
export function claveTrabajoActiva(ambito) {
  qa().llamadas.leerActivo++;
  return real.claveTrabajoActiva(ambito);
}
export function leerTrabajoLocal(clave, ambito) {
  qa().llamadas.leerTrabajo++;
  return real.leerTrabajoLocal(clave, ambito);
}
// The real module's internal obtenerAmbitoTrabajo is lexical and remains 'local'.
// Adapt ONLY the index transport; provider/session/storage logic stays real.
export async function listarTrabajos() {
  const q = qa(), cuenta = q.cuenta, trabajos = {};
  q.llamadas.indice++;
  if (!cuenta) throw Error('No private index without a synthetic account.');
  for (const r of q.respuestas[cuenta] || []) {
    const t = real.leerTrabajoLocal(r.id, scope(cuenta));
    if (t) trabajos[r.id] = t;
  }
  return { trabajos, estado: 'local', error: null, errores: [] };
}
`;

const browser = await chromium.launch({ headless: true, channel: process.env.PANEL_QA_BROWSER || 'chrome' });
const comprobaciones = [], escenarios = [], errores = [];
let context, page, escenarioActual;
const check = (nombre, condicion = true) => {
  assert.ok(condicion, nombre);
  comprobaciones.push({ escenario: escenarioActual, nombre });
};
const nodosPrivados = () => page.locator('.jornada-panel, .consulta-head, .resp-record');
const nav = nombre => page.getByRole('navigation', { name: 'Consultorio', exact: true })
  .getByRole('button', { name: nombre, exact: true }).click();
const pintar = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function nuevo(fallo = null) {
  await context?.close();
  context = await browser.newContext({ viewport: { width: 1280, height: 900 },
    timezoneId: 'America/Mexico_City', serviceWorkers: 'block' });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origen) {
      // Empty local replies prevent font loading without any request to Google.
      if (url.hostname === 'fonts.googleapis.com' && route.request().resourceType() === 'stylesheet') {
        return route.fulfill({ contentType: 'text/css', body: '' });
      }
      errores.push({ escenario: escenarioActual, tipo: 'red-externa-bloqueada', destino: url.hostname });
      return route.abort();
    }
    if (url.pathname === '/core/respuestas.js') return route.fulfill({ contentType: 'text/javascript', body: mockRespuestas });
    if (url.pathname === '/core/trabajo.js' && !url.searchParams.has(passthrough)) {
      return route.fulfill({ contentType: 'text/javascript', body: mockTrabajo });
    }
    if (url.pathname === '/core/agenda.js' && !url.searchParams.has(passthrough)) {
      return route.fulfill({ contentType: 'text/javascript', body: `
        export * from '/core/agenda.js?${passthrough}=1';
        export async function agendaDeHoy() { window.__authQa.llamadas.agenda++; return []; }
      ` });
    }
    return route.continue();
  });
  await context.addInitScript(({ cuentas, respuestaA, respuestaB, fallo }) => {
    window.__panelQa = { respuestas: [], archivos: [] };
    const q = window.__authQa = {
      cuenta: cuentas.A, fallo, respuestas: { [cuentas.A]: [respuestaA], [cuentas.B]: [respuestaB] },
      observadores: new Set(), retenidas: new Map(), listados: [], retencionSiguiente: null,
      llamadas: { sesion: 0, ambito: 0, observar: 0, desuscribir: 0, leerActivo: 0, leerTrabajo: 0, indice: 0, agenda: 0 },
      enCallback: false, authDentroCallback: 0, eventos: [], fugas: [], prohibidos: [],
      emitir(cuenta, evento) {
        this.cuenta = cuenta; this.eventos.push({ cuenta, evento }); this.enCallback = true;
        try { for (const callback of [...this.observadores]) callback(cuenta ? 'cuenta:qa-auth:' + cuenta : null); }
        finally { this.enCallback = false; }
      },
      liberar(nombre) {
        const resolver = this.retenidas.get(nombre);
        if (!resolver) throw Error('Missing deterministic listing gate: ' + nombre);
        this.retenidas.delete(nombre); resolver();
      },
    };
    // Leave a synthetic previous case on disk: a failing guard must not mount a
    // provider or recover it. This storage belongs only to the fresh test context.
    const prefijo = 'drj_trabajo_v2:' + encodeURIComponent('cuenta:qa-auth:' + cuentas.A) + ':';
    localStorage.setItem(prefijo + 'activa', respuestaA.id);
    localStorage.setItem(prefijo + 'registro:' + respuestaA.id, JSON.stringify({
      paciente: { demografia: { nombre: respuestaA.paciente.nombre } },
      origen: { id: respuestaA.id }, guardadoEn: '2026-09-10T12:00:00Z',
      gestionConsulta: { seleccion: [], auditoria: [] },
    }));
    new MutationObserver(registros => {
      if (!q.prohibidos.length) return;
      const agregado = registros.flatMap(r => [...r.addedNodes].map(n => n.textContent || '')).join(' ');
      const texto = (document.querySelector('.instrumentos-contenido')?.textContent || '') + ' ' + agregado;
      for (const nombre of q.prohibidos) if (texto.includes(nombre)) q.fugas.push(nombre);
    }).observe(document, { subtree: true, childList: true, characterData: true });
  }, { cuentas, respuestaA, respuestaB, fallo });
  page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errores.push({ escenario: escenarioActual, tipo: 'pageerror', mensaje: error.message }));
  page.on('console', mensaje => {
    if (mensaje.type() === 'error') errores.push({ escenario: escenarioActual, tipo: 'console', mensaje: mensaje.text() });
  });
  await page.goto(origen + '/consultorio');
}

async function abrirCaso(r = respuestaA) {
  await page.getByRole('button', { name: 'Actualizar datos', exact: true }).waitFor();
  await nav('Por revisar');
  await page.locator('.jornada-nombre').filter({ hasText: r.paciente.nombre }).click();
  await page.getByRole('tab', { name: 'Resumen', exact: true }).waitFor();
  assert.equal(await page.locator('.consulta-head h1').innerText(), r.paciente.nombre);
}

async function seleccionarInstrumento() {
  await page.getByRole('tab', { name: 'Valoraci\u00f3n', exact: true }).click();
  await page.getByLabel('Agregar instrumento', { exact: true }).selectOption('hemorragia');
  await page.getByRole('button', { name: 'Agregar instrumento seleccionado', exact: true }).click();
  await page.getByRole('heading', { name: 'Selecci\u00f3n m\u00e9dica \u00b7 1', exact: true }).waitFor();
}

async function retenerListado(nombre) {
  await page.evaluate(({ nombre, cuenta, respuestaTardia }) => {
    const q = window.__authQa;
    q.respuestas[cuenta] = [...q.respuestas[cuenta], respuestaTardia];
    q.retencionSiguiente = nombre;
  }, { nombre, cuenta: cuentas.A, respuestaTardia });
  await page.getByRole('button', { name: 'Actualizar datos', exact: true }).click();
  await page.waitForFunction(nombre => window.__authQa.retenidas.has(nombre), nombre);
  check('Listado de A retenido antes del evento de cuenta', await page.evaluate(nombre =>
    window.__authQa.listados.some(l => l.espera === nombre && !l.terminada), nombre));
}

async function cambiarCuenta(cuenta, evento) {
  await page.evaluate(({ cuenta, evento, prohibidos }) => {
    window.__authQa.emitir(cuenta, evento);
    window.__authQa.prohibidos = prohibidos;
  }, { cuenta, evento, prohibidos: [respuestaA.paciente.nombre, respuestaTardia.paciente.nombre] });
}

async function liberarListado(nombre) {
  await page.evaluate(nombre => window.__authQa.liberar(nombre), nombre);
  await page.waitForFunction(nombre => window.__authQa.listados.some(l => l.espera === nombre && l.terminada), nombre);
  await pintar();
}

async function sinDatosA() {
  const texto = await page.locator('body').textContent();
  check('No quedan datos de A en el DOM, incluidos nodos ocultos',
    !texto.includes(respuestaA.paciente.nombre) && !texto.includes(respuestaTardia.paciente.nombre));
  check('El observador no detecto reinserciones transitorias de A', await page.evaluate(() => window.__authQa.fugas.length) === 0);
}

async function escenario(nombre, ejecutar) {
  escenarioActual = nombre;
  const antes = errores.length;
  try {
    await ejecutar();
    check('Sin llamadas Auth dentro del callback de autenticacion', await page.evaluate(() => window.__authQa.authDentroCallback) === 0);
    assert.equal(errores.length, antes, 'Unexpected browser errors: ' + JSON.stringify(errores.slice(antes)));
    escenarios.push({ nombre, estado: 'OK' });
  } catch (error) {
    escenarios.push({ nombre, estado: 'FALLO', error: error.message });
  } finally { await context?.close(); context = null; }
}

try {
  await escenario('Logout externo oculta caso e invalida listado pendiente', async () => {
    await nuevo(); await abrirCaso();
    await retenerListado('logout-A');
    await cambiarCuenta(null, 'SIGNED_OUT');
    await page.getByRole('heading', { name: 'Acceso del consultorio', exact: true }).waitFor();
    check('Guard desmonta panel y detalle al cerrar sesion', await nodosPrivados().count() === 0);
    check('Solo queda el observador del guard, no el del proveedor', await page.evaluate(() => window.__authQa.observadores.size) === 1);
    await liberarListado('logout-A');
    await sinDatosA();
    check('Respuesta tardia no vuelve a montar el panel', await nodosPrivados().count() === 0);
  });

  await escenario('Cambio A a B no hereda caso ni acepta listado tardio de A', async () => {
    await nuevo(); await abrirCaso(); await seleccionarInstrumento();
    await retenerListado('cambio-A-B');
    await cambiarCuenta(cuentas.B, 'SIGNED_IN');
    await page.locator('.jornada-nombre').filter({ hasText: respuestaB.paciente.nombre }).waitFor();
    check('Panel B comienza sin consulta A abierta', await page.locator('.consulta-head').count() === 0);
    await sinDatosA();
    await abrirCaso(respuestaB);
    await page.getByRole('tab', { name: 'Valoraci\u00f3n', exact: true }).click();
    await page.getByRole('heading', { name: 'Selecci\u00f3n m\u00e9dica \u00b7 0', exact: true }).waitFor();
    check('Proveedor de B no hereda seleccion medica de A');
    await liberarListado('cambio-A-B');
    await sinDatosA();
    check('B sigue abierta despues de completar el transporte A', await page.locator('.consulta-head h1').innerText() === respuestaB.paciente.nombre);
    await page.getByRole('button', { name: 'Volver a pendientes', exact: true }).click();
    check('Bandeja final contiene solo B', JSON.stringify(await page.locator('.jornada-nombre').allTextContents()) === JSON.stringify([respuestaB.paciente.nombre]));
  });

  await escenario('TOKEN_REFRESHED de la misma cuenta conserva caso y seleccion', async () => {
    await nuevo(); await abrirCaso(); await seleccionarInstrumento();
    const antes = await page.evaluate(() => {
      window.__authQa.nodoCaso = document.querySelector('.consulta-head');
      return { listados: window.__authQa.listados.length, observaciones: window.__authQa.llamadas.observar };
    });
    for (let i = 0; i < 3; i++) {
      await page.evaluate(cuenta => window.__authQa.emitir(cuenta, 'TOKEN_REFRESHED'), cuentas.A);
      await pintar();
    }
    check('Mismo nodo de consulta, sin desmontar/remontar', await page.evaluate(() =>
      window.__authQa.nodoCaso === document.querySelector('.consulta-head') && window.__authQa.nodoCaso.isConnected));
    check('Identidad del caso no cambio', await page.locator('.consulta-head h1').innerText() === respuestaA.paciente.nombre);
    check('Tab activo conservado', await page.getByRole('tab', { name: 'Valoraci\u00f3n', exact: true }).getAttribute('aria-selected') === 'true');
    check('Seleccion medica conservada', await page.getByRole('heading', { name: 'Selecci\u00f3n m\u00e9dica \u00b7 1', exact: true }).isVisible());
    check('No reinicia listados ni suscripciones por renovar token', await page.evaluate(antes =>
      window.__authQa.listados.length === antes.listados && window.__authQa.llamadas.observar === antes.observaciones, antes));
  });

  await escenario('P2: A a cierre a A en el mismo turno vuelve a verificar el acceso', async () => {
    await nuevo(); await abrirCaso();
    await retenerListado('misma-cuenta-nueva-generacion');
    const sesionesAntes = await page.evaluate(() => {
      window.__authQa.nodoCasoAnterior = document.querySelector('.consulta-head');
      return window.__authQa.llamadas.sesion;
    });
    // Both events must reach React in one task, without a paint between them.
    await page.evaluate(({ cuenta, respuesta }) => {
      const q = window.__authQa;
      q.respuestas[cuenta] = [respuesta];
      q.emitir(null, 'SIGNED_OUT');
      q.emitir(cuenta, 'SIGNED_IN');
    }, { cuenta: cuentas.A, respuesta: respuestaA });
    await page.waitForFunction(antes => window.__authQa.llamadas.sesion > antes, sesionesAntes);
    await page.locator('.jornada-nombre').filter({ hasText: respuestaA.paciente.nombre }).waitFor();
    check('Mismo ambito final no omite una nueva verificacion de sesion');
    check('La generacion anterior del caso fue desmontada', await page.evaluate(() =>
      !window.__authQa.nodoCasoAnterior.isConnected));
    check('Nuevo acceso vuelve a bandeja sin conservar el caso abierto', await page.locator('.consulta-head').count() === 0);
    check('No queda bloqueado comprobando sesion', await page.getByText('Comprobando sesi\u00f3n\u2026', { exact: true }).count() === 0);
    await liberarListado('misma-cuenta-nueva-generacion');
    check('Listado de la generacion anterior no repuebla el nuevo acceso',
      JSON.stringify(await page.locator('.jornada-nombre').allTextContents()) === JSON.stringify([respuestaA.paciente.nombre]));
    await abrirCaso();
    check('Se puede abrir el caso bajo la nueva generacion', await page.locator('.consulta-head h1').innerText() === respuestaA.paciente.nombre);
  });

  await escenario('P2: fallo inicial tardio de A no cierra la sesion B verificada', async () => {
    await nuevo('ambito-tardio');
    await page.waitForFunction(() => typeof window.__authQa.rechazarLecturaInicial === 'function');
    check('Primera comprobacion de A sigue pendiente antes de cambiar cuenta', await page.evaluate(cuenta =>
      window.__authQa.lecturaInicial.cuenta === cuenta && !window.__authQa.lecturaInicial.finalizada, cuentas.A));
    check('No hay panel ni listados mientras el acceso inicial esta pendiente',
      await nodosPrivados().count() === 0 && await page.evaluate(() => window.__authQa.listados.length) === 0);
    await cambiarCuenta(cuentas.B, 'SIGNED_IN');
    await abrirCaso(respuestaB);
    await page.evaluate(() => {
      window.__authQa.nodoCasoB = document.querySelector('.consulta-head');
      window.__authQa.rechazarLecturaInicial();
    });
    await page.waitForFunction(() => window.__authQa.lecturaInicial.finalizada);
    await pintar();
    check('Rechazo obsoleto no desmonta ni remonta el caso B', await page.evaluate(() =>
      window.__authQa.nodoCasoB.isConnected && window.__authQa.nodoCasoB === document.querySelector('.consulta-head')));
    check('B permanece autenticada y abierta', await page.locator('.consulta-head h1').innerText() === respuestaB.paciente.nombre);
    check('Rechazo tardio no devuelve al login', await page.getByRole('heading', { name: 'Acceso del consultorio', exact: true }).count() === 0);
    await sinDatosA();
  });

  for (const fallo of ['sesion', 'ambito', 'observador']) {
    await escenario('Fallo inicial cerrado: ' + fallo, async () => {
      await nuevo(fallo);
      await page.getByRole('heading', { name: 'Acceso del consultorio', exact: true }).waitFor();
      await pintar();
      check('No monta panel aunque exista un caso local anterior', await nodosPrivados().count() === 0);
      check('No inicia listados de respuestas, agenda ni trabajo', await page.evaluate(() => {
        const q = window.__authQa;
        return q.listados.length === 0 && q.llamadas.indice === 0 && q.llamadas.agenda === 0;
      }));
      check('Proveedor no lee/restaura el caso guardado', await page.evaluate(() => {
        const q = window.__authQa;
        return q.llamadas.leerActivo === 0 && q.llamadas.leerTrabajo === 0;
      }));
      await sinDatosA();
    });
  }

  assert.equal(await readFile(new URL('../Respuestas.jsx', import.meta.url), 'utf8'), fuenteGuard,
    'Guard changed during this run; rerun against one consistent version.');
  console.log(JSON.stringify({ escenarios, comprobaciones: comprobaciones.length, detalle: comprobaciones, errores,
    alcance: 'Guard/proveedor/panel reales; transportes Auth/listados simulados, backend vacio, sin archivos de salida.' }, null, 2));
  assert.ok(escenarios.every(e => e.estado === 'OK'), 'Auth regressions failed; see scenario results above.');
} finally { await browser.close(); }
