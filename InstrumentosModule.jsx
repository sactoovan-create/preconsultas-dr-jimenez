import React, { useState } from 'react';
import { PacienteProvider, usePaciente } from './core/PacienteContext.jsx';
import { INSTRUMENTOS } from './registry.js';

/**
 * Indicador de guardado. El trabajo se guarda solo en este navegador; esto lo hace
 * visible y ofrece un botón para forzar el guardado (tranquilidad del médico).
 */
function IndicadorGuardado() {
  const { guardar, guardadoEn } = usePaciente();
  const hace = (() => {
    if (!guardadoEn) return null;
    try {
      const seg = Math.round((Date.now() - new Date(guardadoEn).getTime()) / 1000);
      if (seg < 60) return 'hace un momento';
      const min = Math.round(seg / 60);
      if (min < 60) return `hace ${min} ${min === 1 ? 'minuto' : 'minutos'}`;
      return new Date(guardadoEn).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (_) { return null; }
  })();
  return (
    <div className="nav-guardado">
      <div className="nav-guardado-estado">
        <span className="nav-guardado-punto" aria-hidden="true" />
        {guardadoEn ? `Guardado ${hace}` : 'Se guarda solo en este equipo'}
      </div>
      <button className="nav-guardar" onClick={guardar}>Guardar ahora</button>
    </div>
  );
}
import ResumenPaciente from './ResumenPaciente.jsx';
import PreConsulta from './PreConsulta.jsx';
import Respuestas from './Respuestas.jsx';
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
  const esRespuestas = activoId === 'respuestas';
  const esPreConsulta = activoId === 'preconsulta';
  const activo = INSTRUMENTOS.find((i) => i.id === activoId) || INSTRUMENTOS[0];
  const Componente = esResumen ? ResumenPaciente
    : (esRespuestas ? Respuestas
      : (esPreConsulta ? PreConsulta : activo.Componente));

  return (
    <PacienteProvider pacienteInicial={pacienteInicial} onGuardarResultado={onGuardarResultado} irA={setActivoId}>
      <div className="instrumentos-root">
        <div className="instrumentos-layout">
          <nav className="instrumentos-nav" aria-label="Instrumentos clínicos">
            <div className="nav-marca">
              <img className="nav-logo" src="/marca/logo_invertido_transparente.svg" alt="dr. jiménez, ginecología" />
              <div className="nav-eyebrow">Instrumentos clínicos</div>
            </div>
            <IndicadorGuardado />
            <button className={'nav-resumen' + (esResumen ? ' activo' : '')} onClick={() => setActivoId('resumen')}>
              Resumen del paciente
            </button>
            <button className={'nav-resumen' + (esRespuestas ? ' activo' : '')} onClick={() => setActivoId('respuestas')}>
              Respuestas de pacientes
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
