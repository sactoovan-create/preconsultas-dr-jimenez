import React, { useState } from 'react';
import { CalendarDays, ClipboardList, Users, ArrowLeft } from 'lucide-react';
import { PacienteProvider, usePaciente } from './core/PacienteContext.jsx';
import { INSTRUMENTOS } from './registry.js';
import Respuestas from './Respuestas.jsx';
import ResumenPaciente from './ResumenPaciente.jsx';
import PreConsulta from './PreConsulta.jsx';
import MarcoInstrumento from './core/MarcoInstrumento.jsx';
import './core/designTokens.css';
import './InstrumentosModule.css';

export default function InstrumentosModule({ pacienteInicial, onGuardarResultado, apartadoInicial }) {
  const [seccion, setSeccion] = useState('jornada');
  const [navegacion, setNavegacion] = useState(0);
  const [instrumentoId, setInstrumentoId] = useState(apartadoInicial || null);
  const navegar = id => setInstrumentoId(id === 'respuestas' ? null : id);
  return <div className="instrumentos-root consultorio-shell">
      <header className="consultorio-chrome">
        <img className="consultorio-logo" src="/marca/logo_maestro_web.svg" alt="dr. jiménez, ginecología" />
        <nav aria-label="Consultorio" className="consultorio-nav">
          {pacienteInicial ? <button onClick={() => navegar('resumen')}><ClipboardList size={17} />Valoración de la paciente</button> : [['jornada', 'Jornada', CalendarDays], ['pendientes', 'Por revisar', ClipboardList], ['pacientes', 'Pacientes', Users]].map(([id, nombre, Icono]) => <button key={id} aria-current={seccion === id ? 'page' : undefined} onClick={() => { setSeccion(id); setInstrumentoId(null); setNavegacion(n => n + 1); }}><Icono size={17} aria-hidden="true" />{nombre}</button>)}
        </nav>
      </header>
      <main className="instrumentos-contenido">
        {pacienteInicial ? <PacienteProvider pacienteInicial={pacienteInicial} onGuardarResultado={onGuardarResultado} irA={navegar}><PacienteIntegrado instrumentoId={instrumentoId} onVolver={() => navegar('resumen')} /></PacienteProvider> : <Respuestas irA={navegar} seccion={seccion} navegacion={navegacion} instrumentoId={instrumentoId} onCerrarInstrumento={() => setInstrumentoId(null)} />}
      </main>
    </div>;
}

function PacienteIntegrado({ instrumentoId, onVolver }) {
  const { paciente } = usePaciente();
  const Instrumento = INSTRUMENTOS.find(i => i.id === instrumentoId)?.Componente;
  return <div className="resp consulta-integrada">
    <header className="resp-record-head"><h1>{paciente.demografia?.nombre || 'Paciente del expediente'}</h1><p className="resp-muted">Contexto recibido del expediente</p></header>
    {Instrumento || instrumentoId === 'preconsulta' ? <><button className="resp-button" onClick={onVolver}><ArrowLeft size={17} />Volver a la valoración</button><div className="consulta-instrumento">{Instrumento ? <MarcoInstrumento id={instrumentoId}><Instrumento /></MarcoInstrumento> : <PreConsulta />}</div></> : <ResumenPaciente />}
  </div>;
}
