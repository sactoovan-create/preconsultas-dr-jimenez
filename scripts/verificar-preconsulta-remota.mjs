// Opt-in release QA. Only synthetic IDs generated here may be written/deleted.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { reporteClinico } from '../tests/precarga-clinica-fixtures.mjs';

assert.equal(process.env.PRECONSULTA_QA_REMOTO, '1', 'Remote QA requires explicit opt-in');
const env = parseEnv(await readFile(process.env.PANEL_SECRETS_FILE, 'utf8'));
const base = process.env.PRECONSULTA_QA_URL || 'http://127.0.0.1:5200';
assert.ok(['127.0.0.1', 'localhost', 'preconsultas-dr-jimenez.vercel.app'].includes(new URL(base).hostname));
const sb = new URL(env.SUPABASE_URL).origin;
assert.ok(sb.endsWith('.supabase.co') && sb.startsWith('https://'));
for (const k of ['SUPABASE_ANON_KEY', 'SUPABASE_DOCTOR_EMAIL', 'SUPABASE_DOCTOR_PASSWORD', 'SUPABASE_SERVICE_KEY']) assert.ok(env[k], `Missing ${k}`);
const out = path.resolve(process.env.PRECONSULTA_QA_OUTPUT || '../output/publicacion-entrevista-20260910');
await mkdir(out, { recursive: true });
const id = randomUUID(), folder = 'qa-entrevista-' + randomUUID();
const nombre = 'PRUEBA TECNICA FICTICIA ' + id.slice(0, 8);
const checks = [], usuarios = new Set(), capturas = new Map(), trabajoClaves = new Set([id]);
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
let token, etapa = 'inicio', enviado, errores = 0, fallo = null, panelPrueba;
let bloquearUpload = true, bloquearInsert = true, falloUpload = false, falloInsert = false;
const hash = b => createHash('sha256').update(b).digest('hex');
const check = (texto, valor = true) => { assert.ok(valor, texto); checks.push(texto); };
async function pedir(ruta, { method = 'GET', body, anon = false, admin = false } = {}) {
  const r = await fetch(sb + ruta, { method, signal: AbortSignal.timeout(25000),
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + (admin ? env.SUPABASE_SERVICE_KEY : anon ? env.SUPABASE_ANON_KEY : token), 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let data = null; try { data = await r.json(); } catch { /* empty body */ }
  return { ok: r.ok, status: r.status, data };
}
const filtro = '?id=eq.' + id;
const listar = () => pedir('/storage/v1/object/list/estudios', { method: 'POST', body: { prefix: folder, limit: 100 } });
async function vigilar(ctx) {
  await ctx.route('**/*', async route => {
    const req = route.request(), u = new URL(req.url());
    if (![base, sb, 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(u.origin)) return route.abort();
    if (u.origin === sb && req.method() === 'POST' && u.pathname.startsWith('/storage/v1/object/estudios/' + folder + '/')) {
      if (bloquearUpload) { bloquearUpload = false; falloUpload = true; return route.abort('internetdisconnected'); }
      const form = await new Response(req.postDataBuffer(), { headers: { 'content-type': req.headers()['content-type'] } }).formData();
      const file = form.get('');
      assert.ok(file && typeof file.arrayBuffer === 'function', 'Uploaded form must contain a file');
      const b = Buffer.from(await file.arrayBuffer());
      capturas.set(decodeURIComponent(u.pathname.split('/estudios/')[1]), { bytes: b.length, sha256: hash(b) });
    }
    if (u.origin === sb && req.method() === 'POST' && u.pathname === '/rest/v1/respuestas') {
      const row = req.postDataJSON(); assert.equal(row.id, id, 'Only the synthetic response may be sent');
      enviado = row;
      if (bloquearInsert) { bloquearInsert = false; falloInsert = true; return route.abort('internetdisconnected'); }
    }
    if (u.origin === sb && ['POST', 'PATCH'].includes(req.method()) && u.pathname === '/rest/v1/trabajo_clinico') {
      const row = req.postDataJSON();
      assert.equal(row.contenido?.origen?.id, id, 'Only synthetic medical work may be saved');
      if (row.paciente_clave) trabajoClaves.add(row.paciente_clave);
    }
    return route.continue();
  });
  ctx.on('page', p => {
    p.on('pageerror', () => errores++);
    p.on('response', async r => {
      if (r.url().startsWith(sb + '/auth/v1/signup') && r.ok()) {
        const s = await r.json().catch(() => null);
        if (s?.user?.is_anonymous === true) usuarios.add(s.user.id);
      }
    });
  });
}
async function abrirPrueba(page) {
  await page.getByRole('navigation', { name: 'Consultorio', exact: true }).getByRole('button', { name: 'Por revisar', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Buscar paciente, teléfono o motivo' }).fill(nombre);
  await page.locator('.jornada-nombre').filter({ hasText: nombre }).click();
  await page.getByRole('tab', { name: 'Estudios', exact: true }).waitFor();
  check('Panel abre solamente la respuesta ficticia', await page.locator('.consulta-head h1').innerText() === nombre);
}
async function elegirUrinario(page, agregar = false) {
  await page.getByRole('tab', { name: 'Valoración', exact: true }).click();
  if (agregar) {
    await page.getByLabel('Agregar instrumento', { exact: true }).selectOption('incontinencia');
    await page.getByRole('button', { name: 'Agregar instrumento seleccionado' }).click();
  }
  const fila = page.locator('.valoracion-lista li').filter({ has: page.getByRole('button', { name: 'Retirar Incontinencia urinaria', exact: true }) });
  await fila.getByRole('button', { name: /^(Evaluar|Revisar)$/ }).click();
  await page.locator('.precarga-panel').waitFor();
}
await writeFile(path.join(out, 'identificadores-prueba.json'), JSON.stringify({ id, folder, base, usuarios: [], estado: 'iniciado' }, null, 2));
try {
  etapa = 'autenticacion medica';
  const login = await pedir('/auth/v1/token?grant_type=password', { method: 'POST', anon: true,
    body: { email: env.SUPABASE_DOCTOR_EMAIL, password: env.SUPABASE_DOCTOR_PASSWORD } });
  check('Sesion medica real', login.ok && !!login.data?.access_token); token = login.data.access_token;
  const rol = await pedir('/rest/v1/rpc/es_medico_principal', { method: 'POST', body: {} });
  check('Rol medico autorizado', rol.ok && rol.data === true);
  const version = await (await fetch(base + '/version-preconsulta.json')).json();
  check('Version del formulario correcta', version.formulario === '2026.09.4' && version.precarga === '2.0.0');

  etapa = 'archivos ficticios';
  const artefacto = await browser.newPage();
  await artefacto.setContent('<html><body style="font:24px sans-serif;padding:40px"><h1>PRUEBA TECNICA FICTICIA</h1><p>Archivo de prueba. Sin datos de pacientes.</p></body></html>');
  const pdf = await artefacto.pdf({ format: 'A4' });
  const png = await artefacto.screenshot({ type: 'png' });
  await artefacto.close();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); await vigilar(ctx);
  const page = await ctx.newPage();
  await page.goto(base + '/');
  await page.evaluate(({ r, nombre, id, folder }) => {
    sessionStorage.clear();
    sessionStorage.setItem('drj_preconsulta_intento_envio_v2', JSON.stringify({ respuestaId: id, estudiosFolder: folder, adjuntos: [], creadoEn: Date.now() }));
    sessionStorage.setItem('drj_preconsulta_borrador_v3', JSON.stringify({ guardadoEn: Date.now(), pasoId: 'envio', demografia: { ...r.paciente, nombre },
      hc: { ...r.autoReporte.hc, telefono: '0005550197', correo: 'qa@example.invalid', antecedentesRevisados: true, senalesUrgencia: ['ninguna'], sintomasMama: ['ninguna'] },
      mrs: {}, dolor: { ...r.autoReporte.dolor, inicio: 'gradual' }, profundos: r.autoReporte.profundos,
      atribucion: { booking_channel: 'consultorio', patient_reported_source: 'no_recuerdo_prefiero_no_responder' } }));
  }, { r: reporteClinico, nombre, id, folder });
  await page.reload(); await page.locator('#consentimiento input').check();
  await page.getByRole('button', { name: 'Sí, los agregaré', exact: true }).click();
  const archivos = [{ name: 'qa-documento.pdf', mimeType: 'application/pdf', buffer: pdf }, { name: 'qa-imagen.png', mimeType: 'image/png', buffer: png }];
  etapa = 'subida con corte de red';
  await page.locator('.pc-estudios-input').setInputFiles(archivos);
  await page.getByLabel('Reintentar qa-documento.pdf', { exact: true }).waitFor({ timeout: 45000 });
  check('Fallo de red no se presenta como recibido', falloUpload && await page.locator('.pc-estudios-estado.is-error').count() === 1);
  await page.waitForTimeout(2100);
  await page.getByRole('button', { name: 'Enviar cuestionario y estudios', exact: true }).click();
  await page.getByText('Reintenta o quita los estudios que dicen “No se pudo” antes de enviar.', { exact: true }).waitFor();
  check('No permite enviar mientras hay un estudio fallido', enviado === undefined);
  await page.getByLabel('Reintentar qa-documento.pdf', { exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.pc-estudios-estado.is-listo').length === 2, { timeout: 45000 });
  check('PDF e imagen recibidos tras reintento real');
  const intento = await page.evaluate(() => JSON.parse(sessionStorage.getItem('drj_preconsulta_intento_envio_v2')));
  check('Manifiesto local conserva dos rutas y bytes', intento.adjuntos.length === 2 && intento.adjuntos.every(a => a.path.startsWith(folder + '/') && a.size > 0));
  await page.reload(); await page.locator('#consentimiento input').check();
  await page.waitForFunction(() => document.querySelectorAll('.pc-estudios-estado.is-listo').length === 2, { timeout: 45000 });
  check('Recargar recupera y verifica ambos archivos');
  check('Envio movil sin desbordamiento', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: path.join(out, 'estudios-antes-de-enviar.png'), fullPage: true });

  etapa = 'envio y reintento';
  await page.waitForTimeout(2100);
  await page.getByRole('button', { name: 'Enviar cuestionario y estudios', exact: true }).click();
  await page.getByText('No pudimos confirmar el envío por un corte de conexión.', { exact: false }).first().waitFor();
  check('Error de envio visible sin confirmacion falsa', falloInsert && await page.locator('.portal-tarjeta-fin').count() === 0);
  await page.getByRole('button', { name: 'Enviar cuestionario y estudios', exact: true }).click();
  await page.getByText('Tus respuestas llegaron al consultorio', { exact: false }).waitFor({ timeout: 45000 });
  check('Confirmacion remota incluye los dos estudios', await page.locator('.portal-recibo li').count() === 2);
  await page.screenshot({ path: path.join(out, 'confirmacion-remota.png'), fullPage: true });
  const guardada = await pedir('/rest/v1/respuestas' + filtro + '&select=id,contenido,nombre');
  check('Servidor contiene solo una respuesta con ese UUID', guardada.ok && guardada.data?.length === 1);
  assert.deepEqual(guardada.data[0], enviado); check('Contenido y manifiesto coinciden exactamente con el envio');
  check('Campos nuevos y contrato sobreviven al envio', enviado.contenido.autoReporte.hc.fracturaBajoImpacto === true && enviado.contenido.autoReporte.hc.sangradoDuracionDias === 9 && enviado.contenido.ruteoClinico.version === 5);
  await writeFile(path.join(out, 'respuesta-ficticia.json'), JSON.stringify(guardada.data[0], null, 2));
  const anon = await pedir('/rest/v1/respuestas' + filtro + '&select=id', { anon: true });
  check('Anon no puede leer respuesta existente', [401, 403].includes(anon.status) || (anon.ok && Array.isArray(anon.data) && anon.data.length === 0));
  const listado = await listar(); check('Medico encuentra dos objetos', listado.ok && listado.data?.length === 2);
  for (const a of enviado.contenido.adjuntos) {
    const u = '/storage/v1/object/estudios/' + a.ruta;
    const r = await fetch(sb + u, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token } });
    const b = Buffer.from(await r.arrayBuffer()), evidencia = capturas.get(a.ruta);
    check('Bytes y SHA256 recuperados coinciden: ' + a.nombre, r.ok && b.length === a.bytes && hash(b) === evidencia?.sha256);
    const publico = await fetch(sb + '/storage/v1/object/public/estudios/' + a.ruta);
    check('No existe URL publica para ' + a.nombre, !publico.ok);
    const ajeno = await fetch(sb + u, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + env.SUPABASE_ANON_KEY } });
    check('Clave anon no descarga ' + a.nombre, !ajeno.ok);
  }
  await ctx.close();

  etapa = 'panel medico real';
  const medico = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); await vigilar(medico);
  const panel = await medico.newPage(); panelPrueba = panel;
  panel.on('dialog', d => d.accept());
  await panel.goto(base + '/consultorio');
  await panel.getByLabel('Correo', { exact: true }).fill(env.SUPABASE_DOCTOR_EMAIL);
  await panel.getByLabel('Contraseña', { exact: true }).fill(env.SUPABASE_DOCTOR_PASSWORD);
  await panel.getByRole('button', { name: 'Entrar', exact: true }).click();
  await panel.getByRole('heading', { name: 'Jornada de consulta', exact: true }).waitFor({ timeout: 45000 });
  await abrirPrueba(panel);
  await panel.getByRole('tab', { name: 'Estudios', exact: true }).click();
  await panel.getByRole('button', { name: 'Abrir', exact: true }).first().waitFor();
  check('Dos archivos disponibles en la respuesta correcta', await panel.getByRole('button', { name: 'Abrir', exact: true }).count() === 2);
  const firma = panel.waitForResponse(r => r.url().startsWith(sb + '/storage/v1/object/sign/estudios/') && r.ok());
  await panel.getByRole('button', { name: 'Abrir', exact: true }).first().click();
  const firmada = await (await firma).json();
  const link = new URL('/storage/v1' + firmada.signedURL, sb);
  const abierta = await fetch(link); check('Enlace firmado del medico abre el archivo', abierta.ok && (await abierta.arrayBuffer()).byteLength > 0);
  etapa = 'precarga y guardado medico remoto';
  await elegirUrinario(panel, true);
  const impacto = panel.getByLabel('¿Cuánto interfiere en su vida diaria? (0 a 10)', { exact: true });
  check('Calculadora recibe impacto desde el cuestionario real', await impacto.inputValue() === '6');
  check('Precarga muestra origen de autorreporte', await panel.locator('.precarga-panel').innerText().then(t => t.includes('por confirmar')));
  await impacto.fill('0');
  await panel.getByRole('button', { name: 'Marcar datos como revisados', exact: true }).click();
  await panel.getByText('Guardado en el panel · nube', { exact: true }).waitFor({ timeout: 30000 });
  await panel.reload();
  await panel.getByRole('heading', { name: 'Jornada de consulta', exact: true }).waitFor({ timeout: 45000 });
  await abrirPrueba(panel); await elegirUrinario(panel);
  check('Correccion medica cero persiste al recargar', await panel.getByLabel('¿Cuánto interfiere en su vida diaria? (0 a 10)', { exact: true }).inputValue() === '0');
  check('Revision explicita persiste en nube', await panel.getByRole('button', { name: 'Revisado', exact: true }).isDisabled());
  etapa = 'retirada medica del archivo ficticio';
  await panel.getByRole('tab', { name: 'Estudios', exact: true }).click();
  await panel.getByRole('button', { name: 'Eliminar qa-documento.pdf', exact: true }).click();
  await panel.getByText('Se comprobó que el archivo ya no aparece en la carpeta.', { exact: true }).waitFor();
  const despues = await listar(); check('El medico retira el PDF sin borrar la imagen ni la respuesta', despues.ok && despues.data?.length === 1 && !(despues.data[0].name.endsWith('.pdf')));
  check('Cero excepciones JS', errores === 0);
  await medico.close();
} catch (e) {
  const contextoSeguro = panelPrueba && await panelPrueba.locator('.consulta-head h1').innerText().catch(() => '') === nombre;
  const controles = contextoSeguro ? await panelPrueba.locator('.consulta-detail button, .consulta-instrumento button, .rp button, .consulta-guardado').allTextContents() : [];
  fallo = { etapa, tipo: e.name, mensaje: e instanceof assert.AssertionError ? e.message : String(e.message).split('\n').slice(0, 3).join(' ').slice(0, 600), controles };
  process.exitCode = 1;
} finally {
  await browser.close();
  const limpieza = [];
  if (token) {
    try {
      const list = await listar(); assert.ok(list.ok && Array.isArray(list.data));
      const rutas = list.data.filter(a => a.name && !a.name.startsWith('.')).map(a => folder + '/' + a.name);
      if (rutas.length) assert.ok((await pedir('/storage/v1/object/estudios', { method: 'DELETE', body: { prefixes: rutas } })).ok);
      assert.equal((await listar()).data?.length, 0); limpieza.push('Objetos ficticios retirados y ausencia verificada');
      for (const clave of trabajoClaves) {
        const filtroTrabajo = '?paciente_clave=eq.' + encodeURIComponent(clave);
        assert.ok((await pedir('/rest/v1/trabajo_clinico' + filtroTrabajo, { method: 'DELETE' })).ok);
        assert.equal((await pedir('/rest/v1/trabajo_clinico' + filtroTrabajo + '&select=paciente_clave')).data?.length, 0);
      }
      limpieza.push('Trabajo medico ficticio retirado y ausencia verificada');
      assert.ok((await pedir('/rest/v1/respuestas' + filtro, { method: 'DELETE' })).ok);
      assert.equal((await pedir('/rest/v1/respuestas' + filtro + '&select=id')).data?.length, 0);
      limpieza.push('Respuesta ficticia retirada y ausencia verificada');
      for (const uid of usuarios) {
        const u = await pedir('/auth/v1/admin/users/' + uid, { admin: true });
        assert.ok(u.ok && u.data?.is_anonymous === true);
        assert.ok((await pedir('/auth/v1/admin/users/' + uid, { method: 'DELETE', admin: true })).ok);
      }
      limpieza.push('Cuentas anonimas creadas por QA retiradas');
    } catch { limpieza.push('ERROR: limpieza pendiente, revisar identificadores-prueba.json'); process.exitCode = 1; }
  }
  await writeFile(path.join(out, 'identificadores-prueba.json'), JSON.stringify({ id, folder, base, usuarios: [...usuarios], estado: fallo ? 'fallo' : 'completado', limpieza }, null, 2));
  const resultado = { base, checks, total: checks.length, errores, fallo, limpieza,
    alcance: 'PDF/PNG ficticios; envio, lectura, precarga y guardado reales en Supabase. Fallos de red inducidos antes de enviar. No prueba perdida de respuesta tras INSERT ni HEIC ni Huli.' };
  await writeFile(path.join(out, 'qa-remoto.json'), JSON.stringify(resultado, null, 2));
  console.log(JSON.stringify(resultado));
}
