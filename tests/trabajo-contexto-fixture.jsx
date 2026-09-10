import React, { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { PacienteProvider, usePaciente, useInstrumento } from '../core/PacienteContext.jsx';
import * as trabajo from '../core/trabajo.js';

if (!import.meta.env.DEV || !['localhost', '127.0.0.1'].includes(location.hostname)) {
  throw new Error('Fixture disponible solo en desarrollo local.');
}

function Instrumento() {
  const ctx = usePaciente();
  const [d, setD] = useInstrumento('prueba', () => ({ valor: ctx.paciente.demografia.nombre || 'manual' }));
  useEffect(() => { ctx.publicarResumen('prueba', { valor: d.valor }); }, [d, ctx.publicarResumen]);
  window.__instrumento = { d, setD };
  return <output data-testid="instrumento">{d.valor}</output>;
}
function Sonda() {
  const ctx = usePaciente();
  window.__ctx = ctx;
  useEffect(() => {
    if (window.__abrirInicial) window.__cargaInicial = ctx.cargarRespuesta(window.__abrirInicial);
  }, [ctx.cargarRespuesta]);
  return <output data-testid="estado">{JSON.stringify({ clave: ctx.claveTrabajo, cargando: ctx.cargandoTrabajo,
    nombre: ctx.paciente.demografia.nombre, estado: ctx.estadoNube, error: ctx.errorTrabajo?.code })}</output>;
}
function Fixture() {
  const [opciones, setOpciones] = useState({ instrumento: false, persistir: true, inicial: undefined });
  window.__opciones = setOpciones;
  return <PacienteProvider persistirTrabajo={opciones.persistir} pacienteInicial={opciones.inicial}>
    <Sonda />{opciones.instrumento && <Instrumento />}
  </PacienteProvider>;
}
window.__trabajo = trabajo;
createRoot(document.getElementById('root')).render(<StrictMode><Fixture /></StrictMode>);
