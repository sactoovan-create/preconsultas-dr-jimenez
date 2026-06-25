/**
 * Informe consolidado de valoración integral. A diferencia de la hoja de la
 * paciente, este es un documento clínico para el expediente: reúne el resultado
 * clave de cada instrumento aplicado y el fundamento de evidencia. Para el médico,
 * no para entregar a la paciente.
 *
 * Todo valor dinámico se escapa con escaparHtml antes de interpolarse.
 */

import { escaparHtml } from './htmlSeguro.js';

const COLOR = { ok: '#3A6B4C', aviso: '#A88B5C', alerta: '#B85042', neutro: 'rgba(31,58,46,.4)' };

function itemHtml(it) {
  const c = COLOR[it.estado] || COLOR.neutro;
  return `<tr>
    <td class="ins"><span class="pt" style="background:${c}"></span>${escaparHtml(it.titulo)}</td>
    <td class="res">${escaparHtml(it.titular || '—')}${it.detalle ? `<span class="det">${escaparHtml(it.detalle)}</span>` : ''}</td>
  </tr>`;
}

export function construirInforme(cfg) {
  const { paciente = {}, items = [], fundamento = {} } = cfg;
  const dem = paciente.demografia || {};
  const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

  const ident = [
    `<div><b>Paciente</b><span class="v">${escaparHtml(dem.nombre || '—')}</span></div>`,
    (dem.edad != null ? `<div><b>Edad</b><span class="v">${escaparHtml(dem.edad)} años</span></div>` : ''),
    `<div><b>Fecha</b><span class="v">${escaparHtml(fecha)}</span></div>`,
    `<div><b>Instrumentos</b><span class="v">${items.length} evaluados</span></div>`,
  ].join('');

  const filas = items.length
    ? `<table class="tabla">${items.map(itemHtml).join('')}</table>`
    : '<div class="vacio">Sin instrumentos evaluados en esta sesión.</div>';

  const fuentes = (fundamento.fuentes && fundamento.fuentes.length)
    ? `<div class="seccion">Fundamento de la evidencia</div>
       <ul class="fund">${fundamento.fuentes.map((f) => `<li>${escaparHtml(f)}</li>`).join('')}</ul>
       <div class="rev">Vigencia revisada en ${escaparHtml(fundamento.revisado || 'la fecha del documento')}.</div>`
    : '';

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Resumen de valoración</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;1,9..144,300&display=swap" rel="stylesheet">
<style>
  :root{--verde:#1F3A2E;--dorado:#A88B5C;--linea:rgba(31,58,46,.16);--linea2:rgba(31,58,46,.4);--hair-dorada:rgba(168,139,92,.55);}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Inter',system-ui,sans-serif;color:var(--verde);padding:14mm;line-height:1.5;background:#FFFFFF;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .cab{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;border-bottom:2px solid var(--verde);padding-bottom:16px;}
  .marca{font-family:'Inter',serif;font-size:22px;}
  .marca small{display:block;font-family:'Inter';font-style:normal;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--dorado);margin-top:4px;font-weight:700;}
  .mono{width:54px;height:54px;border:1.5px solid var(--verde);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Inter',serif;font-weight:600;font-size:21px;flex-shrink:0;}
  .ident{display:flex;gap:28px;flex-wrap:wrap;font-size:12px;margin:14px 0 6px;}
  .ident b{display:block;font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--dorado);margin-bottom:3px;}
  .ident .v{font-size:14px;font-weight:600;}
  .eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:9.5px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--dorado);margin:18px 0 9px;}
  .eyebrow::before{content:'';width:5px;height:5px;border-radius:50%;background:var(--dorado);flex-shrink:0;}
  .titulo{font-family:"Fraunces",serif;font-size:32px;font-weight:300;letter-spacing:-.02em;line-height:1.04;margin:0 0 4px;}
  .nota{font-size:11px;color:rgba(31,58,46,.6);margin-bottom:18px;}
  .seccion{position:relative;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--verde);padding-bottom:8px;margin:22px 0 10px;}
  .seccion::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,var(--hair-dorada),rgba(168,139,92,.18) 70%,transparent);}
  table{width:100%;border-collapse:collapse;font-size:13px;}
  td{padding:11px 6px;border-bottom:1px solid var(--linea);vertical-align:top;}
  .ins{font-weight:600;width:42%;}
  .ins .pt{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px;vertical-align:middle;}
  .res{font-weight:300;font-family:"Fraunces",serif;font-size:20px;letter-spacing:-.01em;line-height:1.15;}
  .res .det{display:block;font-family:'Inter';font-weight:500;font-size:11.5px;color:rgba(31,58,46,.6);margin-top:4px;}
  .fund{font-size:11.5px;line-height:1.55;list-style-position:inside;}
  .fund li{margin-bottom:5px;color:rgba(31,58,46,.82);}
  .rev{font-size:10.5px;color:rgba(31,58,46,.55);margin-top:8px;}
  .vacio{font-size:13px;color:rgba(31,58,46,.5);padding:20px 0;}
  .pie{margin-top:26px;padding-top:14px;border-top:1px solid var(--linea);font-size:10.5px;color:rgba(31,58,46,.6);line-height:1.5;}
  @page{size:letter;margin:14mm;}
</style></head>
<body>
  <div class="cab"><div class="marca">dr. iván jiménez martínez<small>Ginecología</small></div><div class="mono">IJ</div></div>
  <div class="ident">${ident}</div>
  <div class="eyebrow">Documento clínico</div>
  <div class="titulo">Resumen de valoración integral</div>
  <div class="nota">Documento clínico de apoyo a la decisión, para el expediente. No sustituye el juicio clínico ni se entrega a la paciente.</div>
  <div class="seccion">Hallazgos por instrumento</div>
  ${filas}
  ${fuentes}
  <div class="pie">Resumen generado a partir de los instrumentos clínicos del consultorio del Dr. Iván Jiménez Martínez. Las orientaciones son de apoyo y se individualizan al caso.</div>
</body></html>`;
}

export function imprimirInforme(cfg) {
  const html = construirInforme(cfg);
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}
