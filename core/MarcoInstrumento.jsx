import React from 'react';
import { CheckCheck } from 'lucide-react';
import { usePaciente } from './PacienteContext.jsx';
import { precargaInstrumento } from './precargaClinica.js';
import { estiloArea } from './areasClinicas.js';
import AreaClinica from './AreaClinica.jsx';

const mostrar = (v, destino) => destino === 'cantidadPerdida' ? ['Nada', 'Poca', 'Moderada', 'Mucha'][v]
  : v == null ? 'No registrado' : typeof v === 'boolean' ? v ? 'Sí' : 'No' : typeof v === 'object' ? Object.entries(v).map(([k, valor]) => `${k}: ${valor ? 'Sí' : 'No'}`).join(', ') : String(v);

export default function MarcoInstrumento({ id, children }) {
  const ctx = usePaciente(), datos = precargaInstrumento(id, ctx.paciente);
  const guardados = ctx.datosInstrumentos[id] || {};
  const filas = [...datos.compartidos.map(f => ({ ...f, actual: f.destino.split('.').reduce((v, k) => v?.[k], ctx.paciente) })),
    ...datos.campos.map(f => ({ ...f, actual: Object.hasOwn(guardados, f.destino) ? guardados[f.destino] : f.valor }))];
  const huella = JSON.stringify({ origen: ctx.origen?.id, campos: filas.map(f => [f.destino, f.valor, f.actual]) });
  const revisado = guardados.__revisionPrecarga?.huella === huella;
  const confirmar = () => ctx.setDatosInstrumento(id, anterior => ({ ...anterior,
    __revisionPrecarga: { huella, fecha: new Date().toISOString(), version: datos.version } }));
  return <div className="area-instrumento" style={estiloArea(id)}>
    <section className="precarga-panel" aria-label="Datos de preconsulta">
      <div className="precarga-cab"><div><AreaClinica id={id} /><h2>{filas.length ? `${filas.length} datos disponibles de la preconsulta` : 'Sin datos equivalentes para precargar'}</h2><span className="precarga-estado">{revisado ? 'Autorreporte revisado en esta valoración' : 'Autorreporte · por confirmar en consulta'}</span></div>
        {filas.length > 0 && <button className="resp-button" onClick={confirmar} disabled={revisado || ctx.cargandoTrabajo}><CheckCheck size={17} />{revisado ? 'Revisado' : 'Marcar datos como revisados'}</button>}
      </div>
      <p className="precarga-pendiente">{datos.pendiente}</p>
      {filas.length > 0 && <details><summary>Datos precargados y cambios del médico</summary><table className="precarga-tabla"><thead><tr><th>Dato / origen</th><th>Reportado</th><th>En valoración</th></tr></thead><tbody>{filas.map(f => <tr key={f.destino}><td>{f.etiqueta}<small>{f.fuente}</small>{f.transformacion && <small>{f.transformacion}</small>}</td><td>{mostrar(f.valor, f.destino)}</td><td>{mostrar(f.actual, f.destino)}<small>{JSON.stringify(f.valor) === JSON.stringify(f.actual) ? 'Coincide con autorreporte' : 'Valor médico conservado'}</small></td></tr>)}</tbody></table></details>}
      {datos.contexto.length > 0 && <details><summary>Contexto que ya contó la paciente</summary>{datos.contexto.map(g => <div key={g.id}><h3>{g.titulo}</h3><ul className="precarga-lista">{g.respuestas.map(f => <li key={f.id}><strong>{f.pregunta}</strong><div>{f.respuesta}</div></li>)}</ul></div>)}</details>}
    </section>
    {children}
  </div>;
}
