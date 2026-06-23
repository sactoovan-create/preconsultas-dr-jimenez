import React, { useState } from 'react';
import { PacienteProvider } from './core/PacienteContext.jsx';
import { INSTRUMENTOS } from './registry.js';
import ResumenPaciente from './ResumenPaciente.jsx';
import PreConsulta from './PreConsulta.jsx';
import Seguimiento from './Seguimiento.jsx';
import './core/designTokens.css';
import './InstrumentosModule.css';

/**
 * Módulo de instrumentos clínicos.
 *
 * Uso dentro de GineOS:
 *   <InstrumentosModule
 *      pacienteInicial={mapearExpediente(expedienteAbierto)}
 *      onGuardarResultado={({ instrumentoId, resultado, paciente }) => guardarEnExpediente(...)}
 *   />
 *
 * `pacienteInicial` y `onGuardarResultado` son opcionales: sin ellos, el módulo
 * funciona de forma autónoma con captura manual, útil para probarlo aislado.
 */
export default function InstrumentosModule({ pacienteInicial, onGuardarResultado, apartadoInicial }) {
  const [activoId, setActivoId] = useState(apartadoInicial || 'resumen');
  const esResumen = activoId === 'resumen';
  const esPreConsulta = activoId === 'preconsulta';
  const esSeguimiento = activoId === 'seguimiento';
  const activo = INSTRUMENTOS.find((i) => i.id === activoId) || INSTRUMENTOS[0];
  const Componente = esResumen ? ResumenPaciente : (esPreConsulta ? PreConsulta : (esSeguimiento ? Seguimiento : activo.Componente));

  return (
    <PacienteProvider pacienteInicial={pacienteInicial} onGuardarResultado={onGuardarResultado} irA={setActivoId}>
      <div className="instrumentos-root">
        <div className="instrumentos-layout">
          <nav className="instrumentos-nav" aria-label="Instrumentos clínicos">
            <div className="nav-cab">
              <div className="nav-mono">IJ</div>
              <div>
                <div className="nav-eyebrow">Consultorio</div>
                <div className="nav-titulo">Instrumentos clínicos</div>
              </div>
            </div>
            <button className={'nav-resumen' + (esResumen ? ' activo' : '')} onClick={() => setActivoId('resumen')}>
              Resumen del paciente
            </button>
            <button className={'nav-seguimiento' + (esSeguimiento ? ' activo' : '')} onClick={() => setActivoId('seguimiento')}>
              Seguimiento
            </button>
            <button className={'nav-preconsulta' + (esPreConsulta ? ' activo' : '')} onClick={() => setActivoId('preconsulta')}>
              Pre-consulta de la paciente
            </button>
            <ul className="nav-lista">
              {INSTRUMENTOS.map((i) => (
                <li key={i.id}>
                  <button
                    className={'nav-item' + (i.id === activoId ? ' activo' : '') + (i.estado === 'construccion' ? ' pendiente' : '')}
                    onClick={() => setActivoId(i.id)}
                  >
                    <span className="nav-item-titulo">{i.titulo}</span>
                    <span className="nav-item-desc">{i.descripcion}</span>
                    {i.estado === 'construccion' && <span className="nav-badge">En construcción</span>}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <main className="instrumentos-contenido">
            <Componente />
          </main>
        </div>
      </div>
    </PacienteProvider>
  );
}
