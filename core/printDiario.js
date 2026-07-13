import { CREDITO } from './marca.js';
/**
 * Hoja de diario miccional en blanco, para imprimir y entregar a la paciente.
 * Genera una tabla vacía por día (tres días), con las columnas indicadas, para
 * que la paciente la complete en casa y la traiga a la consulta.
 *
 * Todo valor dinámico se escapa con escaparHtml antes de interpolarse.
 */

import { escaparHtml } from './htmlSeguro.js';

function tablaDia(dia, columnas, renglones) {
  const cabeza = columnas.map((c) => `<th>${escaparHtml(c)}</th>`).join('');
  const celda = `<td></td>`;
  const fila = `<tr>${columnas.map(() => celda).join('')}</tr>`;
  const filas = Array.from({ length: renglones }).map(() => fila).join('');
  return `<div class="dia">Día ${escaparHtml(dia)}</div>
    <table class="tabla"><thead><tr>${cabeza}</tr></thead><tbody>${filas}</tbody></table>`;
}

export function construirHojaDiario(cfg) {
  const { identificacion = {}, titulo = 'Diario miccional', intro = '', columnas = [], renglones = 14, pie = '' } = cfg;
  const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const ident = [
    `<div><b>Paciente</b><span class="v">${escaparHtml(identificacion.nombre || '—')}</span></div>`,
    (identificacion.edad != null ? `<div><b>Edad</b><span class="v">${escaparHtml(identificacion.edad)} años</span></div>` : ''),
    `<div><b>Entregado</b><span class="v">${escaparHtml(fecha)}</span></div>`,
  ].join('');

  const dias = [1, 2, 3].map((dia) => tablaDia(dia, columnas, renglones)).join('');

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${escaparHtml(titulo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;1,9..144,300&display=swap" rel="stylesheet">
<style>
  :root{--verde:#1F3A2E;--dorado:#A88B5C;--linea:rgba(31,58,46,.22);--linea2:rgba(31,58,46,.45);--hair-dorada:rgba(168,139,92,.55);}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Inter',system-ui,sans-serif;color:var(--verde);padding:0;line-height:1.5;background:#FFFFFF;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .cab{background:#F6F1E6;padding:16px 18px;border-radius:11px;display:flex;align-items:flex-start;justify-content:space-between;gap:24px;border-bottom:2px solid var(--verde);padding-bottom:14px;}
  .marca{font-family:'Inter',serif;font-size:21px;}
  .marca small{display:block;font-family:'Inter';font-style:normal;font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--dorado);margin-top:3px;font-weight:700;}
  .mono{width:50px;height:50px;border:1.5px solid var(--verde);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Inter',serif;font-weight:600;font-size:20px;flex-shrink:0;}
  .ident{display:flex;gap:26px;flex-wrap:wrap;font-size:12px;margin:12px 0 8px;}
  .ident b{display:block;font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--dorado);margin-bottom:3px;}
  .ident .v{font-size:13px;font-weight:600;}
  .eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:9.5px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--dorado);margin:12px 0 9px;}
  .eyebrow::before{content:'';width:5px;height:5px;border-radius:50%;background:var(--dorado);flex-shrink:0;}
  .titulo{font-family:"Fraunces",serif;font-size:30px;font-weight:300;letter-spacing:-.02em;line-height:1.04;margin:0 0 4px;}
  .intro{font-size:11.5px;color:rgba(31,58,46,.72);margin-bottom:10px;line-height:1.5;}
  .dia{position:relative;display:inline-block;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--dorado);margin:16px 0 6px;padding-bottom:6px;}
  .dia::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,var(--hair-dorada),rgba(168,139,92,.18) 80%,transparent);}
  table{width:100%;border-collapse:collapse;font-size:11px;}
  th{background:rgba(31,58,46,.06);text-align:left;font-size:9.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--verde);padding:7px 6px;border:1px solid var(--linea2);}
  td{border:1px solid var(--linea);height:26px;}
  .credito{margin-top:14px;text-align:center;font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:#6D5730;}
  .pie{background:#F6F1E6;padding:13px 18px;border-radius:9px;margin-top:18px;padding-top:12px;border-top:1px solid var(--linea);font-size:10px;color:rgba(31,58,46,.6);}
  .dia, table{page-break-inside:avoid;}
  @page{size:letter;margin:13mm;}
</style></head>
<body>
  <div class="cab"><div class="marca">dr. iván jiménez martínez<small>Ginecología</small></div><div class="mono">IJ</div></div>
  <div class="ident">${ident}</div>
  <div class="eyebrow">Para completar en casa</div>
  <div class="titulo">${escaparHtml(titulo)}</div>
  ${intro ? `<div class="intro">${escaparHtml(intro)}</div>` : ''}
  ${dias}
  ${pie ? `<div class="pie">${escaparHtml(pie)}</div>` : ''}
<div class="credito">${CREDITO}</div>
</body></html>`;
}

export function imprimirDiario(cfg) {
  const html = construirHojaDiario(cfg);
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}
