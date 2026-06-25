/**
 * Hoja imprimible para la paciente. Patrón común a todos los instrumentos.
 *
 * Cada instrumento construye sus secciones (mediciones, resultados, lo que
 * corresponda) y llama a imprimirHoja(). La hoja se abre en una ventana propia
 * con sus estilos embebidos y se manda a imprimir; así la impresión queda aislada
 * del resto de la aplicación, sin depender de reglas @media print globales.
 *
 * Importante: esta hoja es para la paciente. No debe contener estadiaje técnico,
 * derivaciones entre especialistas, fármacos ni notas dirigidas al médico. Solo
 * los datos de la paciente, su interpretación neutra (en meta / por revisar) y
 * recomendaciones generales.
 *
 * Todo valor dinámico se escapa con escaparHtml antes de interpolarse, porque
 * puede provenir de captura manual o de extracción automática del laboratorio.
 */

import { escaparHtml } from './htmlSeguro.js';

function filaHtml(f) {
  const cls = f.ok ? 'ok' : 'rev';
  const etiqueta = f.ok ? 'En meta' : 'Por revisar';
  const valor = f.unidad ? `${escaparHtml(f.valor)} ${escaparHtml(f.unidad)}` : `${escaparHtml(f.valor)}`;
  return `<tr>
    <td class="par">${escaparHtml(f.parametro)}</td>
    <td class="val">${valor}</td>
    <td class="ref">${escaparHtml(f.meta || '')}</td>
    <td class="est ${cls}"><span class="pt"></span>${etiqueta}</td>
  </tr>`;
}

function seccionHtml(s) {
  if (!s.filas || !s.filas.length) return '';
  return `<div class="seccion">${escaparHtml(s.titulo)}</div>
    <table class="tabla">${s.filas.map(filaHtml).join('')}</table>`;
}

/**
 * @param {object} cfg
 * @param {object} cfg.identificacion { nombre, edad, fecha }
 * @param {string} cfg.titulo
 * @param {string} cfg.intro
 * @param {Array}  cfg.secciones [{ titulo, filas: [{ parametro, valor, unidad, meta, ok }] }]
 * @param {Array}  cfg.recomendaciones [string]
 * @param {string} cfg.pie
 * @returns {string} documento HTML completo
 */
export function construirHojaPaciente(cfg) {
  const { identificacion = {}, titulo = '', intro = '', secciones = [], listas = [], recomendaciones = [], pie = '' } = cfg;
  const fecha = identificacion.fecha
    || new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

  const ident = [
    `<div><b>Paciente</b><span class="v">${escaparHtml(identificacion.nombre || '—')}</span></div>`,
    (identificacion.edad != null ? `<div><b>Edad</b><span class="v">${escaparHtml(identificacion.edad)} años</span></div>` : ''),
    `<div><b>Fecha</b><span class="v">${escaparHtml(fecha)}</span></div>`,
  ].join('');

  const reco = recomendaciones.length
    ? `<div class="seccion">Recomendaciones generales</div><ul class="reco">${recomendaciones.map((r) => `<li>${escaparHtml(r)}</li>`).join('')}</ul>`
    : '';

  const listasHtml = listas.map((l) =>
    (l.items && l.items.length)
      ? `<div class="seccion">${escaparHtml(l.titulo)}</div><ul class="reco">${l.items.map((it) => `<li>${escaparHtml(it)}</li>`).join('')}</ul>`
      : '').join('');

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${escaparHtml(titulo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;1,9..144,300&display=swap" rel="stylesheet">
<style>
  :root{--verde:#1F3A2E;--crema:#F6F1E6;--dorado:#A88B5C;--terracota:#B85042;--ok:#3A6B4C;--linea:rgba(31,58,46,.16);--linea2:rgba(31,58,46,.4);--hair-dorada:rgba(168,139,92,.55);}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Inter',system-ui,sans-serif;color:var(--verde);padding:14mm;line-height:1.5;background:#FFFFFF;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .cab{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;border-bottom:2px solid var(--verde);padding-bottom:16px;}
  .marca{font-family:'Inter',serif;font-size:22px;}
  .marca small{display:block;font-family:'Inter';font-style:normal;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--dorado);margin-top:4px;font-weight:700;}
  .mono{width:54px;height:54px;border:1.5px solid var(--verde);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Inter',serif;font-weight:600;font-size:21px;flex-shrink:0;}
  .ident{display:flex;gap:28px;flex-wrap:wrap;font-size:12px;margin:14px 0 22px;}
  .ident b{display:block;font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--dorado);margin-bottom:3px;}
  .ident .v{font-size:14px;font-weight:600;}
  .eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:9.5px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--dorado);margin-bottom:9px;}
  .eyebrow::before{content:'';width:5px;height:5px;border-radius:50%;background:var(--dorado);flex-shrink:0;}
  .titulo{font-family:"Fraunces",serif;font-size:34px;font-weight:300;letter-spacing:-.02em;line-height:1.04;margin-bottom:4px;}
  .intro{font-size:12px;color:rgba(31,58,46,.7);margin-bottom:22px;}
  .seccion{position:relative;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--verde);padding-bottom:8px;margin:22px 0 10px;}
  .seccion::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,var(--hair-dorada),rgba(168,139,92,.18) 70%,transparent);}
  table{width:100%;border-collapse:collapse;font-size:12.5px;}
  td{padding:8px 6px;border-bottom:1px solid var(--linea);}
  .par{font-weight:600;width:42%;}
  .val{font-family:"Fraunces",serif;font-weight:300;font-size:17px;width:22%;}
  .ref{font-size:11px;color:rgba(31,58,46,.6);width:24%;}
  .est{width:12%;text-align:right;font-size:11px;font-weight:700;}
  .est .pt{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;vertical-align:middle;}
  .est.ok{color:var(--ok);} .est.ok .pt{background:var(--ok);}
  .est.rev{color:var(--terracota);} .est.rev .pt{background:var(--terracota);}
  .reco{font-size:12px;line-height:1.6;list-style-position:inside;}
  .reco li{margin-bottom:6px;}
  .pie{margin-top:26px;padding-top:14px;border-top:1px solid var(--linea);font-size:10.5px;color:rgba(31,58,46,.6);line-height:1.5;}
  @page{size:letter;margin:14mm;}
</style></head>
<body>
  <div class="cab"><div class="marca">dr. iván jiménez martínez<small>Ginecología</small></div><div class="mono">IJ</div></div>
  <div class="ident">${ident}</div>
  <div class="eyebrow">Hoja para la paciente</div>
  <div class="titulo">${escaparHtml(titulo)}</div>
  ${intro ? `<div class="intro">${escaparHtml(intro)}</div>` : ''}
  ${secciones.map(seccionHtml).join('')}
  ${listasHtml}
  ${reco}
  ${pie ? `<div class="pie">${escaparHtml(pie)}</div>` : ''}
</body></html>`;
}

/** Abre la hoja en una ventana nueva y dispara la impresión. */
export function imprimirHoja(cfg) {
  const html = construirHojaPaciente(cfg);
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  // Pequeña espera para que carguen las fuentes antes de imprimir.
  setTimeout(() => w.print(), 400);
}
