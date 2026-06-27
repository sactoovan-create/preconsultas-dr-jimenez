/**
 * Hoja clínica para el MÉDICO (distinta de la hoja de la paciente). Reúne en una
 * cuartilla lo que cada motor ya calcula y que la hoja de paciente omite a propósito:
 * estadio/diagnóstico, scores interpretados, conducta, derivación, fármacos, vía y
 * banderas de alarma. Para el expediente, no para entregar a la paciente.
 *
 * Cada instrumento aporta un "constructor" que devuelve { titulo, bloques } usando los
 * campos reales del objeto que devuelve su motor. El render es uniforme y escapa todo
 * valor dinámico con escaparHtml.
 */
import { escaparHtml } from './htmlSeguro.js';

const TONO = { ok: '#3A6B4C', aviso: '#A88B5C', alerta: '#B85042', neutro: 'rgba(31,58,46,.45)' };

const ANTECEDENTES = {
  cancerMama: 'Cáncer de mama', ecvEstablecida: 'Enfermedad cardiovascular establecida',
  tromboembolismo: 'Tromboembolismo / trombofilia', hepatica: 'Enfermedad hepática activa',
  sangradoNoDx: 'Sangrado vaginal no diagnosticado',
};

// ---------------------------------------------------------------- constructores

function bMenopausia(r, p) {
  const a = (p && p.antecedentes) || {};
  const mrs = r.mrs || {}, cand = r.candidatura || {}, via = r.via, gu = r.genitourinario || {};
  const nh = r.noHormonales, tipo = r.tipo || {};
  const bloques = [];

  if (tipo.etiqueta) bloques.push({ tipo: 'conclusion', encabezado: 'Diagnóstico', titular: tipo.etiqueta, detalle: tipo.nota || null, tono: (tipo.tipo === 'insuficiencia' || tipo.tipo === 'precoz') ? 'alerta' : 'neutro' });

  if (mrs.total != null) bloques.push({ tipo: 'tabla', encabezado: 'Escala de síntomas (Menopause Rating Scale)', columnas: ['Dominio', 'Puntaje', 'Severidad'], filas: [
    { celdas: ['Total', `${mrs.total} / 44`, mrs.sevTotal || '—'] },
    { celdas: ['Somático', `${mrs.somatico} / 16`, mrs.sevSomatico || '—'] },
    { celdas: ['Psicológico', `${mrs.psicologico} / 16`, mrs.sevPsicologico || '—'] },
    { celdas: ['Urogenital', `${mrs.urogenital} / 12`, mrs.sevUrogenital || '—'] },
  ] });

  if (cand.titulo) bloques.push({ tipo: 'conclusion', encabezado: 'Candidatura a terapia hormonal', titular: cand.titulo, detalle: cand.detalle || null, tono: cand.recomienda ? 'ok' : (cand.tipo === 'contraindicada' ? 'alerta' : 'aviso') });
  if (cand.progestageno) bloques.push({ tipo: 'parrafo', encabezado: 'Progestágeno (útero presente)', texto: 'Añadir progestágeno: progesterona micronizada o norgestimato (metabólicamente neutro), o la combinación estrógeno conjugado + bazedoxifeno.' });

  if (via && via.via) bloques.push({ tipo: 'lineas', encabezado: 'Vía de administración sugerida', lineas: [
    { etiqueta: 'Vía', valor: via.via },
    ...(via.factores && via.factores.length ? [{ etiqueta: 'Factores', valor: via.factores.join(', ') }] : []),
    ...(via.nota ? [{ etiqueta: 'Nota', valor: via.nota }] : []),
  ] });

  if (gu.presente && gu.detalle) bloques.push({ tipo: 'parrafo', encabezado: 'Síndrome genitourinario de la menopausia', texto: gu.detalle });
  if (nh && nh.detalle && nh.detalle.length) bloques.push({ tipo: 'lista', encabezado: 'Alternativas no hormonales (síntomas vasomotores)', items: nh.detalle });

  const banderas = [];
  Object.keys(ANTECEDENTES).forEach((k) => { if (a[k]) banderas.push(`${ANTECEDENTES[k]}: contraindica o exige precaución para terapia hormonal sistémica.`); });
  if (tipo.tipo === 'insuficiencia' || tipo.tipo === 'precoz') banderas.push('Insuficiencia ovárica primaria / menopausia precoz: terapia hasta la edad natural de la menopausia, aun sin síntomas.');
  if (banderas.length) bloques.push({ tipo: 'banderas', items: banderas });

  if (cand.recomienda) bloques.push({ tipo: 'parrafo', encabezado: 'Interconsulta', texto: 'La elección de vía depende del riesgo cardiovascular; conviene calcular el riesgo cardiometabólico antes de definirla.' });
  return { titulo: 'Climaterio y terapia hormonal de la menopausia', bloques };
}

function bCardiometabolico(r) {
  const est = r.estadio || {}, pv = r.prevent || {}, cond = r.conducta || {}, th = r.terapiaHormonal || {};
  const flags = est.flags || {};
  const pct = (x) => (x == null ? '—' : `${(x * 100).toFixed(1)} %`);
  const bloques = [];

  if (est.numero != null) bloques.push({ tipo: 'conclusion', encabezado: 'Estadio del síndrome cardiovascular-renal-metabólico', titular: `Estadio ${est.numero}`, detalle: est.justificacion || null, tono: est.numero >= 3 ? 'alerta' : (est.numero >= 1 ? 'aviso' : 'ok') });

  if (pv.total10 != null || pv.total30 != null) bloques.push({ tipo: 'tabla', encabezado: 'Riesgo a 10 y 30 años (PREVENT)', columnas: ['Desenlace', '10 años', '30 años'], filas: [
    { celdas: ['Cardiovascular total', pct(pv.total10), pct(pv.total30)] },
    { celdas: ['Ateroesclerótico', pct(pv.ateroesclerotica10), pct(pv.ateroesclerotica30)] },
    { celdas: ['Insuficiencia cardiaca', pct(pv.insuficienciaCardiaca10), pct(pv.insuficienciaCardiaca30)] },
  ] });

  if (cond.texto || cond.etiqueta) bloques.push({ tipo: 'conclusion', encabezado: 'Conducta y derivación', titular: cond.etiqueta || 'Conducta', detalle: cond.texto || null, tono: cond.nivel === 'alerta' ? 'alerta' : (cond.nivel === 'aviso' ? 'aviso' : 'ok') });
  if (th.titulo) bloques.push({ tipo: 'conclusion', encabezado: 'Terapia hormonal de la menopausia', titular: th.titulo, detalle: th.detalle || null, tono: th.tipo === 'contraindicada' ? 'alerta' : 'neutro' });

  const banderas = [];
  if (flags.ercMuyAlto) banderas.push('Enfermedad renal de muy alto riesgo (filtración baja o albuminuria elevada).');
  if (flags.diabetes) banderas.push('Diabetes.');
  if (flags.ecvEstablecida) banderas.push('Enfermedad cardiovascular establecida.');
  if (banderas.length) bloques.push({ tipo: 'banderas', items: banderas });
  return { titulo: 'Síndrome cardiovascular-renal-metabólico de la mujer', bloques };
}

const BUILDERS = { menopausia: bMenopausia, cardiometabolico: bCardiometabolico };
export function instrumentoSoportado(id) { return !!BUILDERS[id]; }

// ---------------------------------------------------------------- render

function renderBloque(b) {
  if (!b) return '';
  const enc = b.encabezado ? `<div class="hc-enc">${escaparHtml(b.encabezado)}</div>` : '';
  if (b.tipo === 'conclusion') {
    const c = TONO[b.tono] || TONO.neutro;
    return `<div class="hc-b">${enc}<div class="hc-concl" style="border-left:3px solid ${c}"><div class="hc-titular">${escaparHtml(b.titular || '')}</div>${b.detalle ? `<div class="hc-det">${escaparHtml(b.detalle)}</div>` : ''}</div></div>`;
  }
  if (b.tipo === 'tabla') {
    const head = `<tr>${(b.columnas || []).map((c) => `<th>${escaparHtml(c)}</th>`).join('')}</tr>`;
    const rows = (b.filas || []).map((f) => `<tr>${(f.celdas || []).map((x, i) => `<td${i === 0 ? ' class="par"' : ''}>${escaparHtml(x)}</td>`).join('')}</tr>`).join('');
    return `<div class="hc-b">${enc}<table class="hc-t">${head}${rows}</table></div>`;
  }
  if (b.tipo === 'lineas') {
    return `<div class="hc-b">${enc}${(b.lineas || []).map((l) => `<div class="hc-l"><span class="hc-le">${escaparHtml(l.etiqueta)}</span><span class="hc-lv">${escaparHtml(l.valor)}</span></div>`).join('')}</div>`;
  }
  if (b.tipo === 'lista') return `<div class="hc-b">${enc}<ul class="hc-ul">${(b.items || []).map((i) => `<li>${escaparHtml(i)}</li>`).join('')}</ul></div>`;
  if (b.tipo === 'parrafo') return `<div class="hc-b">${enc}<div class="hc-p">${escaparHtml(b.texto || '')}</div></div>`;
  if (b.tipo === 'banderas') return `<div class="hc-flags"><div class="hc-flags-t">Banderas de alarma</div><ul>${(b.items || []).map((i) => `<li>${escaparHtml(i)}</li>`).join('')}</ul></div>`;
  return '';
}

function contextoHtml(p) {
  const dem = (p && p.demografia) || {}, a = (p && p.antecedentes) || {};
  const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const ident = [
    `<div><b>Paciente</b><span class="v">${escaparHtml(dem.nombre || '—')}</span></div>`,
    (dem.edad != null ? `<div><b>Edad</b><span class="v">${escaparHtml(dem.edad)} años</span></div>` : ''),
    `<div><b>Fecha</b><span class="v">${escaparHtml(fecha)}</span></div>`,
  ].join('');
  const marcados = Object.keys(ANTECEDENTES).filter((k) => a[k]);
  const ant = marcados.length
    ? `<div class="hc-ant"><b>Antecedentes / contraindicaciones:</b> ${marcados.map((k) => escaparHtml(ANTECEDENTES[k])).join(' · ')}</div>`
    : '';
  return `<div class="ident">${ident}</div>${ant}`;
}

export function construirHojaClinica(id, r, paciente) {
  const builder = BUILDERS[id];
  const data = builder && r ? builder(r, paciente || {}) : null;
  const cuerpo = data
    ? data.bloques.map(renderBloque).join('')
    : '<div class="hc-p">No hay datos suficientes para generar la hoja clínica de este instrumento.</div>';
  const titulo = data ? data.titulo : 'Hoja clínica';
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${escaparHtml(titulo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;1,9..144,300&display=swap" rel="stylesheet">
<style>
  :root{--verde:#1F3A2E;--dorado:#A88B5C;--terracota:#B85042;--linea:rgba(31,58,46,.14);--hair:rgba(168,139,92,.55);}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Inter',system-ui,sans-serif;color:var(--verde);padding:14mm;line-height:1.5;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .cab{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;border-bottom:2px solid var(--verde);padding-bottom:16px;}
  .marca{font-size:22px;}.marca small{display:block;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--dorado);margin-top:4px;font-weight:700;}
  .mono{width:54px;height:54px;border:1.5px solid var(--verde);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:21px;flex-shrink:0;}
  .ident{display:flex;gap:28px;flex-wrap:wrap;font-size:12px;margin:14px 0 8px;}
  .ident b{display:block;font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--dorado);margin-bottom:3px;}
  .ident .v{font-size:14px;font-weight:600;}
  .hc-ant{font-size:11.5px;color:var(--terracota);font-weight:600;background:rgba(184,80,66,.07);border-radius:8px;padding:8px 12px;margin:6px 0 4px;}
  .eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:9.5px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--dorado);margin:18px 0 8px;}
  .eyebrow::before{content:'';width:5px;height:5px;border-radius:50%;background:var(--dorado);}
  .titulo{font-family:"Fraunces",serif;font-size:30px;font-weight:300;letter-spacing:-.02em;line-height:1.05;margin-bottom:4px;}
  .nota{font-size:10.5px;color:rgba(31,58,46,.55);margin-bottom:6px;}
  .hc-b{margin-top:16px;}
  .hc-enc{font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--verde);padding-bottom:6px;margin-bottom:8px;position:relative;}
  .hc-enc::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,var(--hair),rgba(168,139,92,.15) 70%,transparent);}
  .hc-concl{padding:2px 0 2px 14px;}
  .hc-titular{font-family:"Fraunces",serif;font-size:19px;font-weight:300;line-height:1.18;}
  .hc-det{font-size:11.5px;color:rgba(31,58,46,.72);margin-top:5px;line-height:1.5;}
  .hc-t{width:100%;border-collapse:collapse;font-size:12.5px;}
  .hc-t th{text-align:left;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--dorado);padding:0 6px 6px;border-bottom:1px solid var(--linea);}
  .hc-t td{padding:8px 6px;border-bottom:1px solid var(--linea);}
  .hc-t .par{font-weight:600;}
  .hc-l{display:flex;justify-content:space-between;gap:16px;padding:6px 0;border-bottom:1px solid var(--linea);font-size:12.5px;}
  .hc-le{color:rgba(31,58,46,.6);} .hc-lv{font-weight:600;text-align:right;}
  .hc-ul{font-size:12px;line-height:1.6;list-style-position:inside;} .hc-ul li{margin-bottom:5px;}
  .hc-p{font-size:12px;line-height:1.6;color:rgba(31,58,46,.85);}
  .hc-flags{margin-top:18px;background:rgba(184,80,66,.08);border-left:3px solid var(--terracota);border-radius:8px;padding:12px 14px;}
  .hc-flags-t{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--terracota);margin-bottom:7px;}
  .hc-flags ul{list-style-position:inside;font-size:12px;line-height:1.55;color:#7d2f24;} .hc-flags li{margin-bottom:4px;}
  .pie{margin-top:26px;padding-top:14px;border-top:1px solid var(--linea);font-size:10px;color:rgba(31,58,46,.55);line-height:1.5;}
  @page{size:letter;margin:14mm;}
</style></head>
<body>
  <div class="cab"><div class="marca">dr. iván jiménez martínez<small>Ginecología</small></div><div class="mono">IJ</div></div>
  ${contextoHtml(paciente)}
  <div class="eyebrow">Hoja clínica · para el expediente</div>
  <div class="titulo">${escaparHtml(titulo)}</div>
  <div class="nota">Documento de apoyo a la decisión para el médico. No sustituye el juicio clínico ni se entrega a la paciente.</div>
  ${cuerpo}
  <div class="pie">Generado a partir de los instrumentos clínicos del consultorio del Dr. Iván Jiménez Martínez. Las orientaciones se individualizan al caso.</div>
</body></html>`;
}

export function imprimirHojaClinica(id, r, paciente) {
  const html = construirHojaClinica(id, r, paciente);
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html); w.document.close(); w.focus();
  setTimeout(() => w.print(), 400);
}
