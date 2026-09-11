import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { EstadoCarga, ProteccionCarga } from './core/EstadoCarga.jsx';

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
const AvisoPrivacidad = lazy(() => import('./paciente/AvisoPrivacidad.jsx'));

export default function App() {
  return (
    <ProteccionCarga><BrowserRouter>
      <Suspense fallback={<EstadoCarga />}>
        <Routes>
          <Route path="/" element={<PortalPaciente />} />
          <Route path="/privacidad" element={<AvisoPrivacidad />} />
          <Route path="/consultorio" element={<InstrumentosModule />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter></ProteccionCarga>
  );
}
