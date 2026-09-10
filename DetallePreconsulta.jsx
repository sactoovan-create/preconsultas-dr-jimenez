import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ClipboardList, Inbox, Search, Paperclip, AlertTriangle, Stethoscope, Trash2, History } from 'lucide-react';
import { ruteoDesdeRespuesta } from './core/precarga.js';
import { MODULOS as PROFUNDOS } from './core/profundos/index.js';
import { usePaciente } from './core/PacienteContext.jsx';
import { INSTRUMENTOS } from './registry.js';
import { MRS_ITEMS } from './instruments/menopausia/engine.js';
import { resumenEntrevista, tieneRespuesta } from './core/entrevista.js';
import { resumenLectura, gruposHistoria, formatoRespuesta } from './core/lecturaRespuesta.js';
import { descripcionEstudios } from './core/lecturaEstudios.js';
import EstudiosRespuesta from './EstudiosRespuesta.jsx';
import ResumenPaciente from './ResumenPaciente.jsx';
import { CANALES_RESERVA, FUENTES_DECLARADAS, etiquetaAtribucion } from './core/atribucion.js';

function fecha(iso) {
  const d = new Date(iso);
  return iso && !Number.isNaN(d.getTime()) ? d.toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Fecha no registrada';
}
const TABS = [
  { id: 'resumen', nombre: 'Resumen', Icono: ClipboardList },
  { id: 'respuestas', nombre: 'Respuestas', Icono: Inbox },
  { id: 'estudios', nombre: 'Estudios', Icono: Paperclip },
  { id: 'instrumentos', nombre: 'Valoración', Icono: Stethoscope },
  { id: 'historial', nombre: 'Historial', Icono: History },
];
const EVENTOS = { preconsulta_revisada: 'Preconsulta marcada como revisada', revision_reabierta: 'Revisión reabierta', vinculo_confirmado: 'Asociación confirmada', vinculo_retirado: 'Asociación retirada', instrumento_agregado: 'Instrumento agregado', instrumento_retirado: 'Instrumento retirado', sugerencia_descartada: 'Sugerencia retirada', sugerencia_restaurada: 'Sugerencia restaurada' };
function fuenteLegible(fuente) {
  return [...new Set(String(fuente || '').split(' | ').map(f => f.startsWith('alertaSeguridad') ? 'Orientación registrada al enviar'
    : f.startsWith('ruteoClinico') ? 'Ruteo guardado' : f.includes('profundos') ? 'Cuestionario complementario' : 'Formulario de la paciente'))].join(' · ');
}

export default function DetallePreconsulta({ r, onEliminar, eliminando, tab, setTab, instrumentoId, onCerrarInstrumento, historial = [], onAbrirHistoria, onEstadoArchivos }) {
  const ctx = usePaciente();
  const [filtroRespuesta, setFiltroRespuesta] = useState('');
  const lectura = resumenLectura(r);
  const hc = r.autoReporte?.hc || {};
  const historia = gruposHistoria(hc, r.autoReporte?.dolor);
  const entrevista = resumenEntrevista(hc);
  const ruteo = useMemo(() => { try { return ruteoDesdeRespuesta(r); } catch (_) { return null; } }, [r]);
  const sugeridos = (ruteo?.instrumentosSugeridos || []).filter(s => INSTRUMENTOS.some(i => i.id === s.instrumento && i.estado === 'activo'));
  const abrir = (destino = 'resumen') => { setTab('instrumentos'); ctx.irA(destino); };
  const Instrumento = INSTRUMENTOS.find(i => i.id === instrumentoId)?.Componente;
  const tecladoTab = (e, indice) => {
    const destino = e.key === 'ArrowRight' ? (indice + 1) % TABS.length : e.key === 'ArrowLeft' ? (indice + TABS.length - 1) % TABS.length : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1;
    if (destino < 0) return;
    e.preventDefault(); setTab(TABS[destino].id);
    document.getElementById('resp-tab-' + TABS[destino].id)?.focus();
  };
  const medicamentos = [...historia, ...entrevista].flatMap(g => g.respuestas).filter(f => ['medicamentos', 'alergias', 'metabolicoTratamiento'].includes(f.id));
  const antecedentes = historia.flatMap(g => g.respuestas).filter(f =>
    f.id === 'antecedentesSeleccionados' || (['enfDiabetes', 'enfHipertension', 'enfTiroides', 'enfTrombosis', 'enfCorazon', 'enfHepatica', 'enfRenal', 'cancerMamaPersonal', 'cancerGinecologicoPersonal'].includes(f.id) && hc[f.id] === true));
  const grupos = [...entrevista, ...historia].map(g => ({ ...g, respuestas: g.respuestas.filter(f => (f.pregunta + ' ' + f.respuesta).toLocaleLowerCase('es').includes(filtroRespuesta.toLocaleLowerCase('es'))) })).filter(g => g.respuestas.length);
  const consentimiento = typeof r.consentimiento === 'object' ? r.consentimiento?.aceptado : r.consentimiento;
  return <article className="resp-record">
    <div className="resp-tabs" role="tablist" aria-label="Información de la preconsulta">
      {TABS.map(({ id, nombre, Icono }, i) => <button key={id} id={'resp-tab-' + id} role="tab" aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} aria-controls={'resp-view-' + id} onClick={() => setTab(id)} onKeyDown={e => tecladoTab(e, i)}><Icono size={16} aria-hidden="true" /><span>{nombre}</span></button>)}
    </div>
    <div className="resp-summary" id="resp-view-resumen" role="tabpanel" aria-labelledby="resp-tab-resumen" hidden={tab !== 'resumen'} tabIndex={0}>
      <div className="consulta-clinica">
      {lectura.alertas.length > 0 && <section className="resp-alerts"><h3><AlertTriangle size={17} />Alertas reportadas · por revisar</h3><ul>{lectura.alertas.map((a, i) => <li key={i}>{a.mensaje}<small title={a.fuente}>{fuenteLegible(a.fuente)}</small></li>)}</ul></section>}
      <section className="resp-sec resp-motive"><h3>Motivo de consulta</h3><p>{lectura.motivo}</p>{lectura.temas.length > 0 && <div className="resp-tags">{lectura.temas.map(t => <span className="resp-tag" key={t}>{t}</span>)}</div>}</section>
      {entrevista.filter(g => g.id === 'motivo').map(g => <BloqueRespuestas key={g.id} grupo={{ ...g, titulo: 'Prioridad de la paciente' }} />)}
      <section className="resp-sec"><h3>Medicamentos y alergias</h3><dl className="resp-facts">{['medicamentos', 'alergias', ...(medicamentos.some(f => f.id === 'metabolicoTratamiento') ? ['metabolicoTratamiento'] : [])].map(id => <div key={id}><dt>{id === 'medicamentos' ? 'Medicamentos' : id === 'alergias' ? 'Alergias' : 'Tratamiento metabólico reportado'}</dt><dd>{medicamentos.find(f => f.id === id)?.respuesta || 'No registrado'}</dd></div>)}</dl></section>
      {antecedentes.length > 0 && <BloqueRespuestas grupo={{ titulo: 'Antecedentes destacados del autorreporte', respuestas: antecedentes }} />}
      <div className="resp-summary-pair">
        <section className="resp-sec"><h3>Dolor pélvico</h3><p>{lectura.dolor.texto}</p></section>
        <section className="resp-sec"><h3>Síntomas MRS</h3><p>{lectura.mrs.texto}</p></section>
      </div>
      </div>
      <aside className="consulta-pendientes" aria-label="Preparación de la consulta">
      {lectura.pendientes.length > 0 && <section className="resp-sec"><h3>Datos por precisar</h3><ul className="resp-pending">{lectura.pendientes.map((x, i) => <li key={i}>{x}</li>)}</ul></section>}
      <section className="resp-sec"><div className="resp-section-heading"><h3>Estudios</h3><button className="resp-text-button" onClick={() => setTab('estudios')}>Revisar archivos <ArrowRight size={15} /></button></div><p>{descripcionEstudios(r)}</p></section>
      <section className="resp-sec"><div className="resp-section-heading"><h3>Instrumentos sugeridos</h3><button className="resp-text-button" onClick={() => setTab('instrumentos')}>Ver sugerencias <ArrowRight size={15} /></button></div><p>{sugeridos.length ? sugeridos.map(s => s.nombre).join(' · ') : 'Sin sugerencias disponibles. Puedes elegir instrumentos manualmente.'}</p></section>
      <div className="resp-primary-action"><button className="resp-button primary" onClick={() => abrir()}>Seleccionar instrumentos <ArrowRight size={17} /></button><span>Autorreporte, no valoración médica.</span></div>
      </aside>
    </div>
    <div id="resp-view-respuestas" role="tabpanel" aria-labelledby="resp-tab-respuestas" hidden={tab !== 'respuestas'} tabIndex={0}>
      <div className="resp-search resp-find-answer"><Search size={17} /><input aria-label="Buscar dentro de las respuestas" placeholder="Buscar en entrevista y antecedentes" type="search" value={filtroRespuesta} onChange={e => setFiltroRespuesta(e.target.value)} /></div>
      {grupos.map((grupo, i) => <BloqueRespuestas key={grupo.id + i} grupo={grupo} />)}
      {!grupos.length && <p className="resp-muted">No hay respuestas coincidentes en entrevista y antecedentes.</p>}
      <SintomasMRS r={r} lectura={lectura} />
      <Profundos r={r} />
      <details className="resp-source"><summary>Datos del envío y procedencia</summary><dl className="resp-facts">
        <div><dt>Formulario</dt><dd>{hc.formularioVersion || 'Versión no registrada'}</dd></div>
        <div><dt>Contrato de datos</dt><dd>{r.version ?? 'No registrado'}</dd></div>
        <div><dt>Consentimiento registrado</dt><dd>{consentimiento === true ? 'Sí' : consentimiento === false ? 'No' : 'No consta'}</dd></div>
        <div><dt>Ruteo</dt><dd>{r.ruteoClinico ? 'Guardado con el envío' : 'Sin ruteo guardado; vista previa con motor actual'}</dd></div>
      </dl>{r.atribucion && <dl className="resp-facts">
        <div><dt>Canal de reserva</dt><dd>{etiquetaAtribucion(r.atribucion.booking_channel, CANALES_RESERVA)}</dd></div>
        <div><dt>Fuente declarada</dt><dd>{etiquetaAtribucion(r.atribucion.patient_reported_source, FUENTES_DECLARADAS)}</dd></div>
      </dl>}
      {onEliminar && <button className="resp-button danger" disabled={eliminando} onClick={onEliminar}><Trash2 size={16} />{eliminando ? 'Comprobando eliminación…' : 'Eliminar respuesta y archivos'}</button>}
      </details>
    </div>
    <div id="resp-view-estudios" role="tabpanel" aria-labelledby="resp-tab-estudios" hidden={tab !== 'estudios'} tabIndex={0}>
      {tab === 'estudios' && <EstudiosRespuesta key={r.id} respuesta={r} onEstado={onEstadoArchivos} />}
    </div>
    <div id="resp-view-instrumentos" role="tabpanel" aria-labelledby="resp-tab-instrumentos" hidden={tab !== 'instrumentos'} tabIndex={0}>
      {tab === 'instrumentos' && (Instrumento ? <>
        <button className="resp-button" onClick={onCerrarInstrumento}><ArrowLeft size={17} />Volver a la selección y resultados</button>
        <div className="consulta-instrumento"><Instrumento /></div>
      </> : <ResumenPaciente />)}
    </div>
    <div id="resp-view-historial" role="tabpanel" aria-labelledby="resp-tab-historial" hidden={tab !== 'historial'} tabIndex={0}>
      <section className="resp-sec"><h3>Cuestionarios de esta paciente</h3>
        {historial.length <= 1 && <p className="resp-muted">No hay otros envíos asociados a esta identidad confirmada.</p>}
        <ol className="consulta-history">{historial.map(item => <li key={item.id}><div><strong>{fecha(item.creado)}</strong><p>{resumenLectura(item).motivo}</p><small>Respuesta {String(item.id).slice(0, 8)}</small></div>{item.id === r.id ? <span className="resp-tag">Abierta</span> : <button className="resp-button" onClick={() => onAbrirHistoria(item)}><ArrowRight size={16} />Abrir</button>}</li>)}</ol>
      </section>
      <section className="resp-sec"><h3>Decisiones sobre este envío</h3>
        {!(ctx.gestionConsulta?.auditoria || []).length ? <p className="resp-muted">Sin decisiones registradas.</p> : <ol className="consulta-history consulta-decisiones">{[...ctx.gestionConsulta.auditoria].reverse().map((evento, i) => <li key={evento.fecha + ':' + i}><div><strong>{EVENTOS[evento.tipo] || 'Decisión médica registrada'}</strong>{evento.instrumentoId && <p>{INSTRUMENTOS.find(x => x.id === evento.instrumentoId)?.titulo || evento.instrumentoId}</p>}<small>{fecha(evento.fecha)} · {evento.autorId === 'local' ? 'Prueba local' : evento.autorId ? 'Usuario ' + String(evento.autorId).slice(-8) : 'Autor no registrado'}</small></div></li>)}</ol>}
      </section>
    </div>
    <footer className="resp-record-footer">Autorreporte original conservado. Las decisiones del panel no acreditan sincronización con el expediente.</footer>
  </article>;
}

function BloqueRespuestas({ grupo }) {
  return <section className="resp-sec"><h3>{grupo.titulo}</h3><dl className="resp-facts">{grupo.respuestas.map(f => <div key={f.id}><dt>{f.pregunta}</dt><dd>{f.respuesta}</dd></div>)}</dl></section>;
}
function SintomasMRS({ r, lectura }) {
  const mrs = r.autoReporte?.mrs || {};
  const etiquetas = ['Ninguno', 'Leve', 'Moderado', 'Intenso', 'Muy intenso'];
  return <section className="resp-sec"><h3>Escala de síntomas MRS</h3><p className="resp-muted">{lectura.mrs.texto}</p>
    {Object.keys(mrs).length > 0 && <dl className="resp-facts resp-mrs">{MRS_ITEMS.map(i => {
      const valor = mrs[i.id];
      const n = typeof valor === 'number' || (typeof valor === 'string' && valor.trim()) ? Number(valor) : null;
      return <div key={i.id}><dt>{i.texto}</dt><dd>{Number.isInteger(n) && n >= 0 && n <= 4 ? etiquetas[n] + ' (' + n + '/4)' : 'No registrado'}</dd></div>;
    })}</dl>}
  </section>;
}
function Profundos({ r }) {
  return Object.entries(r.autoReporte?.profundos || {}).map(([id, valores]) => {
    const modulo = PROFUNDOS.find(m => m.ID === id);
    if (!valores || typeof valores !== 'object') return null;
    const filas = Object.entries(valores).filter(([,v]) => tieneRespuesta(v)).map(([k,v]) => {
      const q = modulo?.PREGUNTAS.find(q => q.id === k);
      const etiqueta = x => q?.opciones?.find(o => String(o.valor ?? o.id) === String(x))?.etiqueta || formatoRespuesta(x);
      return { id: k, pregunta: q?.texto || k.replaceAll('_', ' '), respuesta: Array.isArray(v) ? v.map(etiqueta).join(', ') : etiqueta(v) };
    });
    if (!filas.length) return null;
    const guardado = r.resumen?.profundizaciones?.find(x => x.id === id);
    return <section className="resp-sec" key={id}><h3>{modulo?.TITULO || id}</h3><p className="resp-muted">Respuestas del módulo complementario</p><dl className="resp-facts">{filas.map(f => <div key={f.id}><dt>{f.pregunta}</dt><dd>{f.respuesta}</dd></div>)}</dl>
      {guardado && <details className="resp-source"><summary>Resumen automático guardado · requiere revisión</summary><p>{guardado.resumen}</p><p className="resp-muted">Conservado del envío, sin recalcular. No equivale a validación clínica de la escala o de su interpretación.</p></details>}
    </section>;
  });
}
