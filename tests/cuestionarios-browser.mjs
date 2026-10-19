// Prueba de navegador de los cuestionarios validados de la preconsulta (19/10/2026).
//
// Lo que ninguna prueba de Node puede ver: el aviso de crisis del PHQ-9 que se pinta a la
// paciente y el registro que de verdad sale del navegador.
// - Ítem 9 = 1, 2 o 3: el aviso aparece junto al reactivo 9, se repite en «Revisar y
//   enviar» y en la pantalla final, trae la Línea de la Vida «800 911 2000» con
//   `tel:8009112000` y el botón `tel:911`, y nunca bloquea el envío.
// - Ítem 9 = 0, sin respuesta o total grave con ítem 9 = 0: ningún aviso.
// - El registro guardado (modo local) trae en `autoReporte`, `alertaSeguridad.phq9` y las
//   banderas del PHQ-9 exactamente lo mismo que tests/fixtures/contrato-cuestionarios.json
//   (el archivo con el que el ERP prueba su lectura).
// - Sin desplazamiento horizontal a 390 y 1280 px.
//
// Uso (sin red: todo lo que no sea localhost se corta; sin Supabase, modo local):
//   npx vite --port 5199 --host 127.0.0.1   # en otra terminal, sin .env
//   npm run test:cuestionarios
// Variables: PORTAL_QA_URL (por omisión http://127.0.0.1:5199); PLAYWRIGHT_CORE, ruta a un
// paquete playwright-core si `playwright` no está instalado; QA_BROWSER_CHANNEL=chrome para
// usar Chrome en lugar del Chromium de Playwright. Datos inventados («Prueba QA»).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
function cargarPlaywright() {
  try { return require('playwright'); } catch (e) {
    if (process.env.PLAYWRIGHT_CORE) return require(process.env.PLAYWRIGHT_CORE);
    throw new Error('Falta playwright: instala «playwright» o define PLAYWRIGHT_CORE con la ruta a playwright-core.');
  }
}
const { chromium } = cargarPlaywright();
const base = process.env.PORTAL_QA_URL || 'http://127.0.0.1:5199';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Solo contra un servidor local');
const fixture = JSON.parse(readFileSync(new URL('./fixtures/contrato-cuestionarios.json', import.meta.url), 'utf8'));

const OPC = { 0: 'Para nada', 1: 'Varios días', 2: 'Más de la mitad de los días', 3: 'Casi todos los días' };
const DIF = { 0: 'Para nada difícil', 1: 'Un poco difícil', 2: 'Muy difícil', 3: 'Extremadamente difícil' };
const CSI = { 0: 'Nunca', 1: 'Pocas Veces', 2: 'Algunas veces', 3: 'Continuamente', 4: 'Siempre' };
const AVISO = '[data-prueba=aviso-crisis-phq9]';
const CASOS = [
  ['item9_2_csi', 1280], ['item9_0', 390], ['item9_1', 390], ['item9_3', 1280], ['item9_falta', 390], ['total_grave_item9_0', 390],
];

let ok = 0;
const fallas = [];
const check = (nombre, condicion, detalle = '') => {
  if (condicion) { ok++; console.log('  PASA  ' + nombre); } else { fallas.push(nombre); console.log('  FALLA ' + nombre + (detalle ? ' :: ' + detalle : '')); }
};

function borrador(caso, contenido) {
  const hc = contenido.autoReporte.hc;
  return {
    demografia: { nombre: contenido.paciente.nombre, edad: contenido.paciente.edad },
    hc: {
      telefono: hc.telefono, motivo: hc.motivo, temasConsulta: hc.temasConsulta, senalesUrgencia: ['ninguna'],
      dom_colonia: 'Colonia QA', dom_cp: '01000', dom_municipio: 'Municipio QA', dom_estado: 'Jalisco',
      etapaReproductiva: 'menstrua_regular', reglasRegulares: true, antecedentesSeleccionados: ['ninguna'], antecedentesRevisados: true,
    },
    dolor: contenido.autoReporte.dolor.tiene ? contenido.autoReporte.dolor : { tiene: false },
    mrs: {}, profundos: {}, pasoId: 'contexto',
    atribucion: { version: 1, booking_channel: 'whatsapp', patient_reported_source: 'google_maps' },
    formularioVersion: fixture.formularioVersion,
  };
}

const browser = await chromium.launch({ headless: true, ...(process.env.QA_BROWSER_CHANNEL ? { channel: process.env.QA_BROWSER_CHANNEL } : {}) });
const errores = [];
try {
  for (const [id, ancho] of CASOS) {
    const { contenido } = fixture.casos[id];
    const r9 = contenido.autoReporte.phq9.respuestas;
    const positivo = (r9.item9 ?? 0) > 0;
    const ctx = await browser.newContext({ viewport: { width: ancho, height: 860 }, locale: 'es-MX', isMobile: ancho < 768, hasTouch: ancho < 768 });
    await ctx.route('**/*', (r) => (['localhost', '127.0.0.1'].includes(new URL(r.request().url()).hostname) ? r.continue() : r.abort()));
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errores.push(`${id}: ${e.message}`));
    const titulo = () => page.locator('#pc-paso-titulo').innerText();
    const continuar = async () => { await page.locator('button.pc-siguiente').click(); await page.waitForTimeout(200); };
    const irA = async (nombre) => { for (let i = 0; i < 12 && (await titulo()) !== nombre; i++) await continuar(); return (await titulo()) === nombre; };
    const sinScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    const avisoCompleto = async (raiz) => {
      const aviso = raiz.locator(AVISO);
      if ((await aviso.count()) !== 1) return false;
      const texto = await aviso.innerText();
      return texto.includes('800 911 2000') && texto.includes('911')
        && (await aviso.locator("a[href='tel:8009112000']").count()) >= 1 && (await aviso.locator("a[href='tel:911']").count()) === 1;
    };

    await page.goto(base + '/');
    await page.evaluate((c) => { localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem('drj_preconsulta_borrador_v3', JSON.stringify({ ...c, guardadoEn: Date.now() })); }, borrador(id, contenido));
    await page.reload();
    await page.waitForSelector('#pc-paso-titulo');

    if (contenido.autoReporte.csi) {
      check(`[${id}] llega al CSI por el dolor`, await irA('Cuestionario de sensibilización'), await titulo());
      const rc = contenido.autoReporte.csi.respuestas;
      for (let n = 1; n <= 25; n++) await page.locator(`#cv-csi-a${n}`).getByRole('button', { name: `Pregunta ${n}: ${CSI[rc['a' + n]]}`, exact: true }).click();
      for (let n = 1; n <= 10; n++) {
        if (!rc['b' + n]) continue;
        await page.locator(`#cv-csi-b${n}`).getByRole('button', { name: `Pregunta ${n}: ${rc['b' + n] === 'si' ? 'SÍ' : 'NO'}`, exact: true }).click();
        if (rc[`b${n}_anio`]) await page.locator(`#cv-csi-b${n}`).locator('xpath=..').locator('input[type=number]').fill(String(rc[`b${n}_anio`]));
      }
      await continuar();
    }

    check(`[${id}] llega al PHQ-9`, await irA('Tu estado de ánimo'), await titulo());
    for (let n = 1; n <= 9; n++) {
      if (r9['item' + n] == null) continue;
      await page.locator(`#cv-phq9-item${n}`).getByRole('button', { name: `Pregunta ${n}: ${OPC[r9['item' + n]]}`, exact: true }).click();
    }
    if (r9.dificultad != null) await page.locator('#cv-phq9-dificultad').getByRole('button', { name: new RegExp(`: ${DIF[r9.dificultad]}$`) }).click();
    // El aviso va pegado al reactivo 9 (y solo ahí) en cuanto la paciente marca un valor > 0.
    check(`[${id}] aviso junto al reactivo 9 ${positivo ? 'visible y completo' : 'ausente'}`,
      positivo ? (await avisoCompleto(page)) && (await page.locator(`#cv-phq9-item9 + ${AVISO}`).isVisible()) : (await page.locator(AVISO).count()) === 0);
    check(`[${id}] sin desplazamiento horizontal a ${ancho} px (PHQ-9)`, await sinScroll());

    await continuar();
    if ((await titulo()) === 'Tu estado de ánimo') await continuar(); // recordatorio suave: el segundo «Continuar» avanza
    check(`[${id}] el PHQ-9 nunca bloquea: llega a «Revisar y enviar»`, await irA('Revisar y enviar'), await titulo());
    check(`[${id}] aviso en «Revisar y enviar» ${positivo ? 'repetido' : 'ausente'}`,
      positivo ? await avisoCompleto(page) : (await page.locator(AVISO).count()) === 0);

    await page.locator('#consentimiento input[type=checkbox]').check();
    const sinEstudios = page.getByText('No adjuntaré estudios en este envío.');
    if (await sinEstudios.count()) await sinEstudios.click();
    await page.waitForTimeout(2100);
    await page.getByRole('button', { name: 'Enviar cuestionario y estudios' }).click();
    const fin = page.locator('.portal-tarjeta-fin');
    await fin.waitFor({ timeout: 10000 });
    check(`[${id}] pantalla final ${positivo ? 'con el aviso (sin bloquear el envío)' : 'sin aviso'}`,
      positivo ? (await avisoCompleto(page)) && (await page.locator(AVISO).getAttribute('role')) === 'note' : (await page.locator(AVISO).count()) === 0);
    check(`[${id}] sin desplazamiento horizontal a ${ancho} px (final)`, await sinScroll());

    const guardados = await page.evaluate(() => JSON.parse(localStorage.getItem('drj_respuestas_v1') || '[]'));
    const reg = guardados.at(-1) || {};
    const banderas = (x) => ((x.ruteoClinico || {}).banderas || []).filter((b) => b.instrumentoRelacionado === 'phq9');
    const iguales = (a, b) => { try { assert.deepEqual(a, b); return true; } catch { return false; } };
    check(`[${id}] registro del navegador = contrato con el ERP (autoReporte, alertaSeguridad.phq9, banderas)`,
      iguales(reg.autoReporte?.phq9, contenido.autoReporte.phq9) && iguales(reg.autoReporte?.csi, contenido.autoReporte.csi)
        && iguales(reg.alertaSeguridad?.phq9, contenido.alertaSeguridad.phq9) && iguales(banderas(reg), banderas(contenido)),
      JSON.stringify({ phq9: reg.autoReporte?.phq9, alerta: reg.alertaSeguridad?.phq9 }).slice(0, 400));
    await ctx.close();
  }
  check('sin errores de JavaScript', errores.length === 0, errores.join('; ').slice(0, 400));
} finally {
  await browser.close();
}
console.log(`\nResultado cuestionarios en navegador: ${ok} pasan, ${fallas.length} fallan.`);
if (fallas.length) process.exit(1);
