import React, { useState } from 'react';
import { ArrowRight, Plus, X, RotateCcw, Printer, AlertTriangle } from 'lucide-react';
import { usePaciente } from './core/PacienteContext.jsx';
import { INSTRUMENTOS } from './registry.js';
import { imprimirInforme } from './core/printReport.js';
import { evidenciaDe } from './core/evidencia.js';
import './ResumenPaciente.css';

export default function ResumenPaciente() {
  const ctx = usePaciente();
  const { paciente, resumenes, irA, ruteo, descartados = [], gestionConsulta = {} } = ctx;
  const [manual, setManual] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const activos = INSTRUMENTOS.filter(i => i.estado === 'activo');
  const evaluados = activos.filter(i => resumenes[i.id]?.evaluado);
  const ids = Array.isArray(gestionConsulta.seleccion) ? gestionConsulta.seleccion : evaluados.map(i => i.id);
  const seleccion = activos.filter(i => ids.includes(i.id));
  const sugerencias = (ruteo?.instrumentosSugeridos || []).filter(s => activos.some(i => i.id === s.instrumento));
  const cambiar = async (id, agregar) => {
    setOcupado(true); setError('');
    try {
      await ctx.actualizarGestion({ seleccion: agregar ? [...new Set([...ids, id])] : ids.filter(x => x !== id) }, { tipo: agregar ? 'instrumento_agregado' : 'instrumento_retirado', instrumentoId: id });
      if (agregar) setManual('');
    } catch (_) { setError('No se pudo guardar la selección. Reintenta antes de salir.'); }
    finally { setOcupado(false); }
  };
  const generarInforme = () => {
    const incluidos = evaluados.filter(i => ids.includes(i.id));
    const fuentes = [...new Set(incluidos.flatMap(i => evidenciaDe(i.id)?.fuentes || []))];
    imprimirInforme({ paciente, items: incluidos.map(i => ({ titulo: i.titulo, titular: resumenes[i.id].titular, detalle: resumenes[i.id].detalle, estado: resumenes[i.id].estado })), fundamento: { fuentes, revisado: 'junio de 2026' } });
  };
  return <div className="valoracion">
    {error && <p className="resp-notice error" role="alert">{error}</p>}
    <section className="resp-sec">
      <div className="resp-section-heading"><h3>Selección médica · {seleccion.length}</h3><span className="resp-muted">{seleccion.filter(i => resumenes[i.id]?.evaluado).length} evaluados de los seleccionados</span></div>
      {!seleccion.length && <p className="resp-muted">Sin instrumentos seleccionados para esta consulta.</p>}
      <ul className="valoracion-lista">{seleccion.map(i => <li key={i.id}>
        <div><strong>{i.titulo}</strong><span>{resumenes[i.id]?.evaluado ? 'Resultado guardado' : 'Pendiente de evaluar'}</span></div>
        <button className="resp-button" onClick={() => irA(i.id)} disabled={ocupado || ctx.cargandoTrabajo}><ArrowRight size={16} />{resumenes[i.id]?.evaluado ? 'Revisar' : 'Evaluar'}</button>
        <button className="resp-icon" title={'Retirar ' + i.titulo} aria-label={'Retirar ' + i.titulo} disabled={ocupado || ctx.cargandoTrabajo} onClick={() => cambiar(i.id, false)}><X size={17} /></button>
      </li>)}</ul>
      <div className="valoracion-agregar"><label htmlFor="instrumento-manual">Agregar instrumento</label><div><select id="instrumento-manual" value={manual} onChange={e => setManual(e.target.value)} disabled={ocupado || ctx.cargandoTrabajo}><option value="">Seleccionar…</option>{activos.filter(i => !ids.includes(i.id)).map(i => <option key={i.id} value={i.id}>{i.titulo}</option>)}</select><button className="resp-icon" disabled={!manual || ocupado || ctx.cargandoTrabajo} onClick={() => cambiar(manual, true)} aria-label="Agregar instrumento seleccionado" title="Agregar instrumento seleccionado"><Plus size={18} /></button></div></div>
    </section>
    {sugerencias.length > 0 && <section className="resp-sec">
      <h3>Sugerencias del autorreporte</h3><p className="resp-muted">Orientación del motor · no diagnóstico</p>
      <ul className="valoracion-lista">{sugerencias.map(s => <li key={s.instrumento}>
        <label className="valoracion-sugerida"><input type="checkbox" checked={ids.includes(s.instrumento)} disabled={ocupado || ctx.cargandoTrabajo || descartados.includes(s.instrumento)} onChange={e => cambiar(s.instrumento, e.target.checked)} /><span><strong>{s.nombre}</strong><span>{s.motivo}</span>{descartados.includes(s.instrumento) && <small>Sugerencia retirada por el médico</small>}</span></label>
        <button className="resp-icon" disabled={ocupado || ctx.cargandoTrabajo} title={descartados.includes(s.instrumento) ? 'Restaurar sugerencia' : 'Retirar sugerencia'} aria-label={(descartados.includes(s.instrumento) ? 'Restaurar sugerencia de ' : 'Retirar sugerencia de ') + s.nombre} onClick={() => descartados.includes(s.instrumento) ? ctx.restaurarSugerencia(s.instrumento) : ctx.descartarSugerencia(s.instrumento)}>{descartados.includes(s.instrumento) ? <RotateCcw size={16} /> : <X size={16} />}</button>
      </li>)}</ul>
    </section>}
    {(ruteo?.banderas || []).length > 0 && <section className="resp-alerts"><h3><AlertTriangle size={17} />Banderas conservadas del autorreporte</h3><ul>{ruteo.banderas.map((b, i) => <li key={i}>{b.mensaje}</li>)}</ul></section>}
    <section className="resp-sec"><div className="resp-section-heading"><h3>Resultados de la valoración</h3>{evaluados.some(i => ids.includes(i.id)) && <button className="resp-button" onClick={generarInforme}><Printer size={16} />Imprimir resultados seleccionados</button>}</div>
      {!evaluados.length && <p className="resp-muted">Sin resultados guardados.</p>}
      {evaluados.map(i => <div className="valoracion-resultado" key={i.id}><div className="resp-section-heading"><h4>{i.titulo}</h4>{!ids.includes(i.id) && <span className="resp-tag">Fuera de la selección actual</span>}</div><p>{resumenes[i.id].titular}</p>{resumenes[i.id].detalle && <p className="resp-muted">{resumenes[i.id].detalle}</p>}<button className="resp-text-button" onClick={() => irA(i.id)}>Revisar datos <ArrowRight size={16} /></button></div>)}
    </section>
  </div>;
}
