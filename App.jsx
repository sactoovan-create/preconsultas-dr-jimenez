import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

/**
 * Aplicación autónoma del consultorio del Dr. Iván Jiménez Martínez.
 *
 * Dos accesos, cada uno en su propio fragmento (carga diferida) para que la
 * paciente descargue solo su cuestionario y no el código del área del médico:
 *  - "/"            Portal de la paciente. Enlace público que se le comparte para
 *                   que responda desde casa. Sus respuestas llegan al consultorio.
 *  - "/consultorio" Área del médico: los instrumentos clínicos y el panel de
 *                   respuestas de las pacientes.
 */
const PortalPaciente = lazy(() => import('./paciente/PortalPaciente.jsx'));
const InstrumentosModule = lazy(() => import('./InstrumentosModule.jsx'));

function Cargando() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1F3A2E', fontFamily: 'Inter, system-ui, sans-serif', background: '#F1EADB' }}>
      Cargando…
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Cargando />}>
        <Routes>
          <Route path="/" element={<PortalPaciente />} />
          <Route path="/consultorio" element={<InstrumentosModule />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
