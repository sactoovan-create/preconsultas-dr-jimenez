import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { reporteClinico } from './precarga-clinica-fixtures.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.PANEL_QA_URL || 'http://127.0.0.1:5199';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const out = path.resolve('../output/entrevista-evidencia-20260910'); await fs.mkdir(out,{recursive:true});
const browser = await chromium.launch({headless:true, channel:'chrome'});
const ctx = await browser.newContext({viewport:{width:1440,height:1000}});
await ctx.route('**/*', r => {
  const host = new URL(r.request().url()).hostname;
  if (['localhost','127.0.0.1'].includes(host)) return r.continue();
  // Keep QA offline without turning the known font stylesheet into a console error.
  if (host === 'fonts.googleapis.com' && r.request().resourceType() === 'stylesheet') {
    return r.fulfill({status:200,contentType:'text/css',body:''});
  }
  return r.abort();
});
const page = await ctx.newPage(), errors = [], checks = [];
page.on('pageerror', e=>errors.push(e.message));
page.on('console', m=>{if(m.type()==='error') errors.push(m.text());});
const check = (name,c) => {assert.ok(c,name); checks.push(name);};
const ready = () => page.waitForFunction(()=>window.__ctx && !__ctx.cargandoTrabajo);
const open = async id => {await page.getByLabel('Instrumento',{exact:true}).selectOption(id); await page.locator('.area-instrumento .inst, .area-instrumento .cm').waitFor();};
try {
  await page.goto(base+'/tests/precarga-clinica-fixture.html'); await ready();
  await page.evaluate(r=>__ctx.cargarRespuesta(r),reporteClinico);
  await page.waitForFunction(()=>__inst.d.frecuenciaPerdida === 3);
  check('Incontinencia ya llena frecuencia/cantidad/impacto',await page.evaluate(()=>__inst.d.cantidadPerdida===2 && __inst.d.impactoVida===6 && __inst.d.nicturia===0));
  await page.getByText('Datos precargados y cambios del médico',{exact:true}).click();
  check('Origen y dato médico visibles', (await page.locator('.precarga-tabla').innerText()).includes('autoReporte.profundos.incontinencia'));
  await page.getByRole('button',{name:'Marcar datos como revisados'}).click();
  check('Revisión requiere acción explícita',await page.getByRole('button',{name:'Revisado',exact:true}).isDisabled());
  await page.evaluate(()=>__inst.setD(p=>({...p,impactoVida:0,usaProteccion:false,nicturia:null})));
  await page.getByRole('button',{name:'Marcar datos como revisados'}).waitFor();
  check('Cambiar dato invalida sello de revisión',true);
  for (const [id,k,v] of [['sop','longitudCiclo',40],['hemorragia','duracionDias',9],['dolor-pelvico','intensidadEVA',6],['endometriosis','dischezia',true],['mama','familiarMamaMenor50',true],['osea','fracturaParental',true],['anticoncepcion','fumaIntenso',true],['menopausia','mrs_bochornos',0]]) {
    await open(id); check(id+' precarga valor equivalente',await page.evaluate(([k,v])=>__inst.d[k]===v,[k,v]));
    check(id+' muestra marca clínica y origen',await page.locator('.precarga-panel .area-identidad').isVisible());
  }
  await open('cardiometabolico');
  check('Cardio recibe antecedentes, no inventa labs',await page.evaluate(()=>__ctx.paciente.antecedentes.antihipertensivo===true && __ctx.paciente.labs.colesterolTotal==null));
  await open('incontinencia');
  check('Regresar conserva 0/false/null médicos',await page.evaluate(()=>__inst.d.impactoVida===0 && __inst.d.usaProteccion===false && __inst.d.nicturia===null));
  await page.evaluate(()=>__ctx.guardar()); await page.reload(); await ready();
  check('Recargar conserva corrección del médico',await page.evaluate(()=>__inst.d.impactoVida===0 && __inst.d.nicturia===null));
  await page.evaluate(()=>__ctx.cargarRespuesta({id:'qa-precarga-B',paciente:{nombre:'Sintética B',edad:30},autoReporte:{}}));
  check('Paciente B no hereda datos de A',await page.evaluate(()=>__inst.d.impactoVida===undefined && __ctx.paciente.demografia.nombre==='Sintética B'));
  await page.evaluate(r=>__ctx.cargarRespuesta(r),reporteClinico);
  await page.getByText('Datos precargados y cambios del médico',{exact:true}).click();
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:1000});
    for(const id of ['incontinencia','menopausia','hemorragia','mama','osea','sop','dolor-pelvico','endometriosis','cardiometabolico','anticoncepcion']) {
      await open(id);
      check(id+' sin desbordamiento '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    }
    await open('incontinencia');
    await page.screenshot({path:path.join(out,`precarga-${width}.png`),fullPage:true});
  }
  for(const paso of ['motivo','osea','sangrado','ciclos','mama','envio']) {
    await page.goto(base+'/tests/precarga-clinica-fixture.html?form='+paso); await ready();
    await page.locator('.pc-paso').waitFor();
    if(paso !== 'envio') check('Sin envío prematuro en '+paso,await page.getByTestId('buzon').count()===0 && await page.getByRole('button',{name:/Enviar cuestionario/}).count()===0);
    if(paso==='osea') {
      check('Se muestra entrevista ósea',await page.locator('#fracturaBajoImpacto').isVisible());
      await page.locator('#fracturaBajoImpacto').getByRole('button',{name:'No',exact:true}).click();
      check('Se oculta sitio de fractura si niega fractura',await page.locator('#fracturaCaderaVertebra').count()===0);
    }
    if(paso==='envio') check('Buzón visible ANTES del envío',await page.getByTestId('buzon').isVisible() && await page.getByRole('button',{name:/Enviar/}).count()>0);
    for(const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:1000});
      check('Entrevista '+paso+' sin desbordamiento '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    }
    await page.screenshot({path:path.join(out,`entrevista-${paso}.png`),fullPage:true});
  }
  await page.evaluate(r => {
    sessionStorage.clear();
    sessionStorage.setItem('drj_preconsulta_borrador_v3', JSON.stringify({
      guardadoEn:Date.now(),pasoId:'envio',demografia:r.paciente,
      hc:{...r.autoReporte.hc,temasConsulta:['osea','metabolico'],telefono:'5555555555',correo:'qa@example.invalid',antecedentesRevisados:true,senalesUrgencia:['ninguna']},
      dolor:{tiene:false},mrs:{},profundos:{},
      atribucion:{booking_channel:'consultorio',patient_reported_source:'no_recuerdo_prefiero_no_responder'},
    }));
  }, reporteClinico);
  await page.goto(base+'/');
  await page.locator('#consentimiento input').check();
  await page.getByLabel('No adjuntaré estudios en este envío.').check();
  await page.waitForTimeout(2100);
  await page.getByRole('button',{name:'Enviar cuestionario y estudios'}).click();
  await page.getByText('Prueba guardada solo en este navegador.',{exact:false}).waitFor();
  check('Portal real confirma guardado local sin fingir envío remoto',true);
  const enviada = await page.evaluate(()=>JSON.parse(localStorage.getItem('drj_respuestas_v1'))[0]);
  check('Sobre guarda campos nuevos y ruteo versionado',enviada.formularioVersion==='2026.09.4' && enviada.autoReporte.hc.entrevistaVersion==='2.0.0' && enviada.ruteoClinico.version===5 && enviada.autoReporte.hc.fracturaBajoImpacto===true);
  check('No inventa archivos ni conserva respuestas de ramas retiradas',enviada.adjuntos.length===0 && enviada.estudiosFolder===null && enviada.autoReporte.hc.mamaFamiliarPrimerGradoMenor50===undefined);
  await page.screenshot({path:path.join(out,'envio-local-confirmado.png'),fullPage:true});
  check('Cero errores React/JS',errors.length===0);
  await fs.writeFile(path.join(out,'precarga-browser.json'),JSON.stringify({checks,errors,scope:'Solo entorno local, datos sintéticos, servicios externos bloqueados'},null,2));
  console.log(JSON.stringify({comprobaciones:checks.length,errors}));
} catch(e) {
  await page.screenshot({path:path.join(out,'fallo.png'),fullPage:true}); console.error(JSON.stringify({checks,errors})); throw e;
} finally {await browser.close();}
