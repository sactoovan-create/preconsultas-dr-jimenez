import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PacienteProvider, usePaciente, useInstrumento } from '../core/PacienteContext.jsx';
import MarcoInstrumento from '../core/MarcoInstrumento.jsx';
import { INSTRUMENTOS } from '../registry.js';
import { reporteClinico } from './precarga-clinica-fixtures.mjs';
import PreConsulta from '../PreConsulta.jsx';
import '../core/designTokens.css';
import '../InstrumentosModule.css';
import '../Respuestas.css';

if (!import.meta.env.DEV || !['localhost', '127.0.0.1'].includes(location.hostname)) throw Error('Solo desarrollo local.');
const params = new URLSearchParams(location.search), form = params.has('form');
function Sonda({ id }) {
  const ctx = usePaciente(); window.__ctx = ctx;
  const [d, setD] = useInstrumento(id, () => ({})); window.__inst = { d, setD };
  return null;
}
function Vista() {
  const [id, setId] = useState('incontinencia'); window.__abrir = setId;
  const Componente = INSTRUMENTOS.find(i => i.id === id)?.Componente;
  return <div className="instrumentos-root resp" style={{maxWidth:1260,margin:'0 auto'}}>
    <p>Auditoría local · datos ficticios · sin conexión a pacientes</p>
    <Sonda id={id} />
    {form ? <PreConsulta onEnviar={async registro => {window.__envio = registro;}}
      borradorInicial={{...reporteClinico.autoReporte,demografia:reporteClinico.paciente,pasoId:params.get('form') || 'motivo'}}
      extraAntesDeEnviar={<div data-testid="buzon">Buzón sintético: no envía archivos</div>} />
      : <><label>Instrumento <select aria-label="Instrumento" style={{maxWidth:'100%'}} value={id} onChange={e=>setId(e.target.value)}>{INSTRUMENTOS.map(i=><option key={i.id} value={i.id}>{i.titulo}</option>)}</select></label>
        <MarcoInstrumento id={id}><Componente key={id} /></MarcoInstrumento></>}
  </div>;
}
window.__registro = reporteClinico;
createRoot(document.getElementById('root')).render(<StrictMode><PacienteProvider persistirTrabajo={!form}><Vista /></PacienteProvider></StrictMode>);
