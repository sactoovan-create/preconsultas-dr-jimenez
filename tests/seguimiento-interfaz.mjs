import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer as createHttpServer } from 'node:http';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { aplicarPrioridadIntima, PREGUNTA_MOLESTIA, REPETIR_MRS } from '../core/seguimiento.js';

test('los componentes reales muestran una sola elección por prioridad y permiten revisar MRS aparte', async () => {
  const vite = await createServer({server:{middlewareMode:true,hmr:{server:createHttpServer()},watch:null},appType:'custom', optimizeDeps:{noDiscovery:true,include:[]}});
  try {
    const {default: PreConsulta} = await vite.ssrLoadModule('/PreConsulta.jsx');
    const {PacienteProvider} = await vite.ssrLoadModule('/core/PacienteContext.jsx');
    const pantalla = (hc, pasoId, mrs={}) => renderToStaticMarkup(React.createElement(PacienteProvider,
      {persistirTrabajo:false}, React.createElement(PreConsulta, {
        onEnviar:()=>{}, borradorInicial:{hc,pasoId,mrs},
      })));
    const inicial={temasConsulta:['intimidad','climaterio'], motivo:'Molestia a revisar', senalesUrgencia:['ninguna']};
    for (const [problemaClave, texto] of [['sequedad','la resequedad vaginal'],['deseo','los cambios en el deseo'],['dolor_relaciones','el dolor durante las relaciones']]) {
      const hc=aplicarPrioridadIntima(inicial, {seguimientoActual:{tema:'intimidad',problemaClave}});
      const html=pantalla(hc,'intimidad');
      assert.ok(html.includes('Ya incluiste '+texto));
      const textoOpcion={sequedad:'Sequedad, ardor o irritación',deseo:'Cambios en el deseo o interés sexual',dolor_relaciones:'Dolor durante las relaciones'}[problemaClave];
      assert.ok(!html.includes('<b>'+textoOpcion+'</b>'));
      assert.ok(html.includes('¿Quieres revisar algo más sobre tu salud íntima?'));
      assert.ok(!html.includes(PREGUNTA_MOLESTIA));
    }
    const seguimiento={...inicial,temasConsulta:['climaterio'],visitaSeguimiento:true,seguimientoActual:{evolucion:'mejor',nuevosSintomas:'no'}};
    assert.ok(pantalla(seguimiento,'seguimiento').includes(REPETIR_MRS));
    assert.ok(pantalla(seguimiento,'envio').includes('No elegiste repetirla en esta visita'));
    const repetir={...seguimiento,seguimientoActual:{...seguimiento.seguimientoActual,repetirMrs:true}};
    const escala=pantalla(repetir,'climaterio');
    assert.equal((escala.match(/class="pc-mrs-fila"/g)||[]).length,11);
    assert.ok(!escala.includes('De estas molestias, ¿cuál te gustaría mejorar primero?'));
    assert.ok(pantalla(repetir,'envio',{mrs_bochornos:0}).includes('Elegiste repetirla'));
  } finally {
    await vite.close();
  }
});
