import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const localMode = process.env.TRABAJO_QA_LOCAL === '1';
const cacheDir = await mkdtemp(path.join(tmpdir(), 'trabajo-contexto-'));
const server = await createServer({ root, cacheDir, configFile: false, envFile: false,
  optimizeDeps: { entries: ['tests/trabajo-contexto-fixture.html'] },
  plugins: [{ name: 'trabajo-qa-aislado', enforce: 'pre', resolveId(source, importer) {
    if (source === './respuestas.js' && importer?.endsWith('/core/trabajo.js')) {
      return path.join(root, 'tests/trabajo-contexto-servicios.mjs');
    }
  } }, react()],
  define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(localMode ? '' : 'https://sintetico.invalid'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(localMode ? '' : 'no-credential-qa') },
  server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ headless: true, channel: process.env.PANEL_QA_BROWSER || 'chrome' });
const pruebas = [], errores = [];
let context, page;
const check = (nombre, condicion = true) => { assert.ok(condicion, nombre); pruebas.push(nombre); };
async function nuevo({ legacy = false, abrirInicial = false, falloStorageInicial = false,
  restauracionLenta = false } = {}) {
  await context?.close();
  context = await browser.newContext();
  await context.route('**/*', r => ['127.0.0.1', 'localhost'].includes(new URL(r.request().url()).hostname) ? r.continue() : r.abort());
  await context.addInitScript(({ legacy, abrirInicial, falloStorageInicial, restauracionLenta }) => {
    if (legacy) {
      localStorage.setItem('drj_trabajo_activa', 'A');
      localStorage.setItem('drj_trabajo_A', JSON.stringify({ paciente: { demografia: { nombre: 'Legacy sintetica A' } }, origen: { id: 'A' },
        guardadoEn: '2026-09-09T12:00:00Z', datosInstrumentos: { prueba: { valor: 'Legacy captura' } },
        gestionConsulta: { revision: { estado: 'revisada', versionHuella: 'legacy-A' }, seleccion: ['mama'], auditoria: [] } }));
    }
    if (abrirInicial) window.__abrirInicial = { id: 'B', paciente: { nombre: 'Apertura explicita B' }, autoReporte: {} };
    if (restauracionLenta) {
      const prefijo = 'drj_trabajo_v2:' + encodeURIComponent('cuenta:https://sintetico.invalid:medico-sintetico-A') + ':';
      localStorage.setItem(prefijo + 'activa', 'A');
      localStorage.setItem(prefijo + 'registro:A', JSON.stringify({ paciente: { demografia: { nombre: 'Restauracion sintetica A' } },
        origen: { id: 'A' }, guardadoEn: '2026-09-09T12:00:00Z', gestionConsulta: { seleccion: ['mama'] } }));
      window.__qaConfig = { lecturas: { A: 700 } };
    }
    if (falloStorageInicial) {
      const original = Storage.prototype.getItem;
      Storage.prototype.getItem = function (clave) {
        if (clave.startsWith('drj_trabajo_')) throw Error('Lectura local denegada al montar');
        return original.call(this, clave);
      };
      window.__restaurarStorage = () => { Storage.prototype.getItem = original; };
    }
  }, { legacy, abrirInicial, falloStorageInicial, restauracionLenta });
  page = await context.newPage();
  page.on('pageerror', e => errores.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  await page.goto(base + '/tests/trabajo-contexto-fixture.html');
  if (restauracionLenta) await page.waitForFunction(() => window.__qa?.llamadas.some(x => x.tipo === 'read' && x.clave === 'A'));
  else await page.waitForFunction(() => window.__ctx && !window.__ctx.cargandoTrabajo);
  await page.evaluate(() => {
    window.registro = id => ({ id, creado: '2026-09-09T12:00:00Z', paciente: { nombre: `Sintetica ${id}`, edad: 40 }, autoReporte: {} });
    window.sembrar = (id, nombre, version = '2026-09-09T13:00:00.000Z') => {
      const usuario = window.__qa.usuario;
      window.__qa.filas[usuario] ||= {};
      window.__qa.filas[usuario][id] = { paciente_clave: id, actualizado: version,
        contenido: { paciente: { demografia: { nombre } }, origen: { id }, gestionConsulta: {
          revision: { estado: 'pendiente' }, seleccion: [], auditoria: [] } } };
    };
  });
}
async function abrir(id) { return page.evaluate(id => window.__ctx.cargarRespuesta(window.registro(id)), id); }
const leer = () => page.evaluate(() => ({ clave: __ctx.claveTrabajo, nombre: __ctx.paciente.demografia.nombre,
  gestion: __ctx.gestionConsulta, estado: __ctx.estadoNube, guardando: __ctx.guardando,
  cargando: __ctx.cargandoTrabajo, guardadoEn: __ctx.guardadoEn,
  error: __ctx.errorTrabajo?.code, errorGuardado: __ctx.errorGuardado?.code }));

try {
  if (localMode) {
    await nuevo({ legacy: true });
    check('Modo local restaura namespace legacy al montar', (await leer()).clave === 'A'
      && (await leer()).gestion.revision.versionHuella === 'legacy-A' && !(await leer()).cargando);
    check('Indice local contiene gestion legacy', (await page.evaluate(() => __trabajo.listarTrabajos())).trabajos.A.gestionConsulta.seleccion[0] === 'mama');
    await page.evaluate(() => __opciones(p => ({ ...p, instrumento: true })));
    await page.waitForFunction(() => __instrumento?.d.valor === 'Legacy captura');
    check('Abrir instrumento legacy conserva captura sin autosave', (await leer()).guardadoEn === '2026-09-09T12:00:00Z');
    await nuevo({ legacy: true, abrirInicial: true });
    await page.evaluate(() => __cargaInicial);
    check('Apertura explicita del hijo gana a restauracion automatica', (await leer()).clave === 'B'
      && (await leer()).nombre === 'Apertura explicita B' && (await leer()).gestion.seleccion.length === 0);
    await abrir('A');
    await page.evaluate(() => __ctx.actualizarGestion({ seleccion: ['osea'] }, { autorId: 'autor-qa' }));
    check('Gestion local usa autor explicito del mock', (await leer()).gestion.auditoria.at(-1).autorId === 'autor-qa');
    check('Cero llamadas cloud con entorno vacio', await page.evaluate(() => __qa.llamadas.length) === 0);
    await nuevo();
    await page.evaluate(() => __ctx.actualizar('demografia', 'nombre', 'Manual sintetica'));
    check('Captura manual conserva marcador activo', await page.evaluate(() => __trabajo.claveTrabajoActiva('local')) === 'manual');
    await page.reload();
    await page.waitForFunction(() => window.__ctx && !__ctx.cargandoTrabajo && __ctx.paciente.demografia.nombre === 'Manual sintetica');
    check('Recarga restaura captura manual sin mezclar respuesta');
  } else {
  await nuevo({ falloStorageInicial: true });
  check('Fallo inicial de localStorage queda visible', (await leer()).error === 'ALMACENAMIENTO_LOCAL');
  check('Observador auth activo pese a fallo inicial de storage', await page.evaluate(() => __qa.observadores) === 1);
  await page.evaluate(() => __restaurarStorage());
  await abrir('A');
  await page.evaluate(() => __ctx.actualizarGestion({ seleccion: ['mama'] }));
  await page.evaluate(() => __qa.cuenta('medico-sintetico-B'));
  await page.waitForFunction(() => __ctx.origen === null);
  check('Auth A a B limpia caso tras inicializacion fallida', (await leer()).nombre === ''
    && (await leer()).gestion.seleccion.length === 0 && (await leer()).error === 'CAMBIO_CUENTA');
  await abrir('A');
  check('Cuenta B no hereda gestion ni autor A', (await leer()).gestion.seleccion.length === 0);
  await page.evaluate(() => __ctx.actualizarGestion({ seleccion: ['osea'] }));
  check('Autor de nueva gestion corresponde a B', (await leer()).gestion.auditoria.at(-1).autorId === 'medico-sintetico-B');
  await page.evaluate(() => __qa.cuenta('medico-sintetico-B'));
  check('Evento de misma cuenta no reinicia el caso', (await leer()).clave === 'A' && (await leer()).gestion.seleccion[0] === 'osea');

  await nuevo({ restauracionLenta: true });
  check('Observador instalado antes de terminar restauracion cloud', (await leer()).cargando
    && await page.evaluate(() => __qa.observadores) === 1);
  await page.evaluate(() => __qa.cuenta('medico-sintetico-B'));
  await page.waitForFunction(() => __ctx.origen === null);
  check('Cambio de cuenta limpia restauracion pendiente de inmediato', (await leer()).nombre === '' && !(await leer()).cargando);
  await abrir('B');
  await page.waitForTimeout(800);
  check('Restauracion inicial tardia no repuebla otra cuenta', (await leer()).clave === 'B'
    && (await leer()).nombre === 'Sintetica B' && (await leer()).gestion.seleccion.length === 0);

  await nuevo();
  await abrir('A');
  await page.evaluate(() => __ctx.actualizarGestion({ seleccion: ['mama'] }, { tipo: 'seleccion' }));
  check('Descartar sugerencia mantiene API sincrona', await page.evaluate(() => !(__ctx.descartarSugerencia('mama') instanceof Promise)));
  let sugerencia = (await leer()).gestion.auditoria.at(-1);
  check('Descarte registra actor fecha respuesta e instrumento', sugerencia.tipo === 'sugerencia_descartada'
    && sugerencia.autorId === 'medico-sintetico-A' && Number.isFinite(Date.parse(sugerencia.fecha))
    && sugerencia.respuestaId === 'A' && sugerencia.instrumentoId === 'mama');
  check('Descarte audita estados sin retirar seleccion', sugerencia.anterior.descartados.length === 0
    && sugerencia.nuevo.descartados.join(',') === 'mama' && (await leer()).gestion.seleccion.join(',') === 'mama');
  await page.evaluate(() => __ctx.descartarSugerencia('mama'));
  check('Descarte repetido no duplica auditoria', (await leer()).gestion.auditoria.length === 2);
  check('Restaurar sugerencia mantiene API sincrona', await page.evaluate(() => !(__ctx.restaurarSugerencia('mama') instanceof Promise)));
  sugerencia = (await leer()).gestion.auditoria.at(-1);
  check('Restauracion audita estados y mantiene seleccion', sugerencia.tipo === 'sugerencia_restaurada'
    && sugerencia.anterior.descartados.join(',') === 'mama' && sugerencia.nuevo.descartados.length === 0
    && (await leer()).gestion.seleccion.join(',') === 'mama');
  await page.evaluate(() => { __ctx.restaurarSugerencia('mama'); window.descartarA = __ctx.descartarSugerencia; });
  check('Restauracion repetida no duplica auditoria', (await leer()).gestion.auditoria.length === 3);
  await abrir('B');
  await page.evaluate(() => descartarA('osea'));
  check('Descarte obsoleto A no audita B', (await leer()).gestion.auditoria.length === 0);
  await abrir('A');
  check('Persisten ambos eventos de sugerencias', (await leer()).gestion.auditoria.slice(-2).map(e => e.tipo).join(',')
    === 'sugerencia_descartada,sugerencia_restaurada');

  await nuevo();
  check('Carga devuelve boolean true', await abrir('A') === true);
  await page.evaluate(() => __ctx.actualizarGestion({ revision: { estado: 'revisada', fecha: '2026-09-09T14:00:00Z', autorId: 'qa', versionHuella: 'huella-A' },
    seleccion: ['mama', 'osea'], vinculo: { estado: 'confirmado', citaId: 'portal:qa', pacienteId: 'portal:paciente', nombre: 'Sintetica',
      fecha: '2026-09-09', inicio: '09:00', confirmadoEn: '2026-09-09T14:00:00Z', autorId: 'qa' } }, { tipo: 'revision', autorId: 'qa' }));
  check('Gestion persistida en nube existente', (await leer()).estado === 'nube');
  let indice = await page.evaluate(() => __trabajo.listarTrabajos());
  check('Indice inmediato incluye revision y seleccion', indice.trabajos.A.gestionConsulta.revision.versionHuella === 'huella-A'
    && indice.trabajos.A.gestionConsulta.seleccion.length === 2 && indice.estado === 'nube');
  await abrir('B');
  check('Gestion B no hereda A', (await leer()).gestion.seleccion.length === 0 && (await leer()).gestion.revision.estado === 'pendiente');
  await abrir('A');
  let actual = await leer();
  check('Restaura revision/seleccion/vinculo/auditoria', actual.gestion.revision.estado === 'revisada'
    && actual.gestion.seleccion.join(',') === 'mama,osea' && actual.gestion.vinculo.citaId === 'portal:qa' && actual.gestion.auditoria.length === 1);
  await page.evaluate(() => __ctx.actualizarGestion({ vinculo: { citaId: 'portal:nueva' }, seleccion: ['mama'] }, { tipo: 'vinculo' }));
  actual = await leer();
  const evento = actual.gestion.auditoria.at(-1);
  check('Autor fallback autenticado y cambios auditados', evento.autorId === 'medico-sintetico-A'
    && evento.anterior.vinculo.citaId === 'portal:qa' && evento.nuevo.vinculo.citaId === 'portal:nueva'
    && evento.anterior.seleccion.length === 2 && evento.nuevo.seleccion.length === 1);
  await page.reload();
  await page.waitForFunction(() => window.__ctx?.origen?.id === 'A' && !__ctx.cargandoTrabajo);
  check('Recarga restaura gestion local por cuenta', (await leer()).gestion.revision.versionHuella === 'huella-A');

  await nuevo();
  await page.evaluate(() => { sembrar('A', 'Nube A'); sembrar('B', 'Nube B'); __qa.lecturas.A = 400;
    window.cargaA = __ctx.cargarRespuesta(registro('A')); });
  await page.waitForFunction(() => __qa.llamadas.some(x => x.tipo === 'read' && x.clave === 'A'));
  await abrir('B');
  check('Carga A obsoleta devuelve false', await page.evaluate(() => cargaA) === false);
  check('Nube tardia A no aplica a B', (await leer()).nombre === 'Nube B' && (await leer()).clave === 'B');

  await nuevo();
  await page.evaluate(() => { sembrar('A', 'Remoto anterior'); __qa.lecturas.A = 300;
    window.carga = __ctx.cargarRespuesta(registro('A')); });
  await page.waitForFunction(() => __qa.llamadas.some(x => x.clave === 'A'));
  await page.evaluate(() => __ctx.actualizar('demografia', 'nombre', 'Edicion nueva'));
  await page.evaluate(() => carga);
  actual = await leer();
  check('Lectura no pisa edicion durante carga', actual.nombre === 'Edicion nueva' && actual.estado === 'conflicto');
  const conflicto = await page.evaluate(() => __ctx.guardar());
  check('Conflicto conserva local sin false nube', conflicto.ok && conflicto.local && !conflicto.nube && conflicto.conflicto);
  check('No sobrescribe nube desconocida', await page.evaluate(() => __qa.filas[__qa.usuario].A.contenido.paciente.demografia.nombre) === 'Remoto anterior');

  await nuevo();
  await abrir('A');
  await page.evaluate(() => { __qa.escrituras.A = 350; window.guardarA = __ctx.actualizarGestion({ seleccion: ['mama'] }, { tipo: 'seleccion' }); });
  await page.waitForFunction(() => __qa.llamadas.some(x => x.tipo === 'insert'));
  await abrir('B');
  await page.evaluate(() => guardarA);
  actual = await leer();
  check('Escritura A no marca B guardada', actual.clave === 'B' && actual.estado === null && actual.guardadoEn === null && !actual.guardando);
  check('Escritura A no cambia marcador activo B', await page.evaluate(async () => __trabajo.claveTrabajoActiva(await __trabajo.obtenerAmbitoTrabajo())) === 'B');
  await abrir('A');
  check('Flush conserva seleccion al volver', (await leer()).gestion.seleccion[0] === 'mama');

  await nuevo();
  await abrir('A');
  await page.evaluate(() => __opciones(p => ({ ...p, instrumento: true })));
  await page.waitForFunction(() => window.__instrumento?.d.valor === 'Sintetica A');
  check('Abrir instrumento no guarda valores ni resumen vacios', await page.evaluate(() =>
    !Object.keys(__ctx.datosInstrumentos).length && !Object.keys(__ctx.resumenes).length && !__ctx.guardadoEn));
  await page.evaluate(() => __instrumento.setD({ valor: 'Captura A' }));
  await abrir('B');
  await page.waitForFunction(() => __instrumento.d.valor === 'Sintetica B');
  check('Instrumento montado no conserva estado A en B');
  await page.evaluate(() => { window.setterB = __instrumento.setD; });
  await abrir('A');
  check('Instrumento restaura captura A', await page.evaluate(() => __instrumento.d.valor) === 'Captura A');
  check('Restaura resumen clinico sin recaptura', await page.evaluate(() => __ctx.resumenes.prueba.valor) === 'Captura A');
  await page.evaluate(() => setterB({ valor: 'Callback obsoleto B' }));
  check('Callback obsoleto no edita A', await page.evaluate(() => __instrumento.d.valor) === 'Captura A');
  check('Reset manual confirmado', await page.evaluate(() => __ctx.reiniciar()) === true);
  await page.waitForFunction(() => __ctx.claveTrabajo === 'manual' && __instrumento.d.valor === 'manual');
  check('Reset no mezcla instrumentos/gestion/origen', (await leer()).gestion.seleccion.length === 0 && (await leer()).nombre === '');

  await nuevo();
  await abrir('A');
  await page.evaluate(() => { Storage.prototype.setItem = function () { throw Error('quota'); }; __qa.fallos.insert = true; });
  const fallo = await page.evaluate(async () => {
    try { await __ctx.actualizarGestion({ seleccion: ['mama'] }); return 'incorrecto'; }
    catch (e) { return e.code; }
  });
  check('Fallo total rechaza gestion', fallo === 'ALMACENAMIENTO_LOCAL');
  actual = await leer();
  check('Fallo local no finge guardado', actual.estado === 'error' && actual.guardadoEn === null && actual.errorGuardado === 'ALMACENAMIENTO_LOCAL');
  check('Impide salir sin respaldo', await abrir('B') === false && (await leer()).clave === 'A');
  await page.evaluate(() => { __qa.fallos.insert = false; });
  check('Nube permite guardar aun si falla local', (await page.evaluate(() => __ctx.guardar())).nube === true);

  await nuevo();
  await abrir('A');
  await page.evaluate(() => __ctx.actualizarGestion({ seleccion: ['mama'] }));
  await page.evaluate(() => { const fila = __qa.filas[__qa.usuario].A; fila.actualizado = '2099-01-01T00:00:00Z'; fila.contenido.gestionConsulta.seleccion = ['osea']; });
  await page.evaluate(() => __ctx.actualizarGestion({ seleccion: ['sop'] }));
  actual = await leer();
  check('CAS detecta actualizacion concurrente sin migracion', actual.estado === 'conflicto' && actual.gestion.seleccion[0] === 'sop');
  check('Reintento no fuerza sobrescritura de conflicto', await page.evaluate(() => __ctx.reintentarTrabajo()) === false
    && (await leer()).gestion.seleccion[0] === 'sop');
  indice = await page.evaluate(() => __trabajo.listarTrabajos());
  check('Indice conserva ambas versiones con conflicto', indice.porClave.A.estado === 'conflicto'
    && indice.trabajos.A.gestionConsulta.seleccion[0] === 'sop' && indice.porClave.A.contenidoNube.gestionConsulta.seleccion[0] === 'osea');
  check('Reset no borra version concurrente', await page.evaluate(() => __ctx.reiniciar()) === false);

  await nuevo();
  await page.evaluate(() => { __qa.fallos.read = true; });
  check('Fallo nube conserva respuesta abierta', await abrir('A') === true);
  check('Fallo nube visible, no fila vacia exitosa', (await leer()).error === 'LECTURA_NUBE');
  indice = await page.evaluate(() => __trabajo.listarTrabajos());
  check('Indice de nube fallido no informa exito', indice.estado === 'error' && indice.error != null);
  await page.evaluate(() => { __qa.fallos.read = false; });
  check('Relectura puede recuperarse sin cambiar respuesta', await page.evaluate(() => __ctx.reintentarTrabajo()) === true && !(await leer()).error);

  await nuevo();
  await abrir('A');
  await page.evaluate(() => { __qa.fallos.insert = true; });
  await page.evaluate(() => __ctx.actualizarGestion({ seleccion: ['mama'] }));
  check('Guardado local informa error de nube', (await leer()).estado === 'local' && (await leer()).errorGuardado === 'GUARDADO_NUBE');
  await page.evaluate(() => { __qa.fallos.insert = false; });
  check('Reintento sube trabajo local pendiente', await page.evaluate(() => __ctx.reintentarTrabajo()) === true && (await leer()).estado === 'nube');

  await nuevo();
  await page.evaluate(() => __opciones(p => ({ ...p, instrumento: true, inicial: { demografia: { nombre: 'Inyectada A' } } })));
  await page.waitForFunction(() => __instrumento?.d.valor === 'Inyectada A');
  await page.evaluate(() => __instrumento.setD({ valor: 'Instrumento inyectada A' }));
  await page.evaluate(() => __opciones(p => ({ ...p, inicial: { demografia: { nombre: 'Inyectada B' } } })));
  await page.waitForFunction(() => __instrumento.d.valor === 'Inyectada B');
  check('PacienteInicial cambia sin heredar instrumentos', await page.evaluate(() => __ctx.claveTrabajo === null && Object.keys(__ctx.datosInstrumentos).length === 0));

  await nuevo();
  await abrir('A');
  await page.evaluate(() => __ctx.actualizarGestion({ seleccion: ['mama'] }));
  await page.evaluate(() => __qa.cuenta(null));
  await page.waitForFunction(() => __ctx.origen === null);
  check('Logout limpia contexto visible', (await leer()).gestion.seleccion.length === 0 && (await leer()).nombre === '');
  indice = await page.evaluate(() => __trabajo.listarTrabajos());
  check('Logout no expone cache por indice', indice.estado === 'error' && Object.keys(indice.trabajos).length === 0);
  await page.evaluate(() => __qa.cuenta('medico-sintetico-B'));
  await abrir('A');
  check('Otra cuenta no restaura trabajo A', (await leer()).gestion.seleccion.length === 0);
  await page.evaluate(() => { sembrar('C', 'Privado C'); __qa.lecturas.C = 300; window.cargaC = __ctx.cargarRespuesta(registro('C')); });
  await page.waitForFunction(() => __qa.llamadas.some(x => x.clave === 'C'));
  await page.evaluate(() => __qa.cuenta(null));
  await page.evaluate(() => cargaC);
  check('Lectura tardia tras logout no reaparece', (await leer()).nombre === '' && (await leer()).clave === 'manual');
  }

  check('Cero errores React/JavaScript', errores.length === 0);
  console.log(JSON.stringify({ comprobaciones: pruebas.length, pruebas, errores,
    alcance: 'React StrictMode, cliente sintetico, red externa bloqueada; no prueba RLS ni produccion.' }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ pruebas, errores, actual: page && await leer().catch(() => null) }, null, 2));
  throw error;
} finally { await browser.close(); await server.close(); await rm(cacheDir, { recursive: true, force: true }); }
