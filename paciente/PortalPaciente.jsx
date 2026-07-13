import React, { useCallback, useState } from 'react';
import { PacienteProvider } from '../core/PacienteContext.jsx';
import PreConsulta from '../PreConsulta.jsx';
import { guardarRespuesta } from '../core/respuestas.js';
import { construirResumen } from '../core/resumenPaciente.js';
import { buzonActivo, nuevaCarpeta } from '../core/estudios.js';
import { instrumentosPara } from '../core/ruteoClinico.js';
import { MEDICO } from '../core/marca.js';
import SubirEstudios from './SubirEstudios.jsx';
import './PortalPaciente.css';

/**
 * Portal público de la paciente: un "dossier" editorial. Se comparte por enlace;
 * la paciente responde desde casa y, al enviar, sus respuestas llegan al consultorio.
 *
 * Reutiliza el cuestionario de la pre-consulta (síntomas e historia) y le añade
 * el contacto, el consentimiento, el envío y la confirmación.
 */

/** Textura de grano fino sobre todo el lienzo (sensación de papel premium). */
function Grano() {
  return <div className="portal-grano" aria-hidden="true" />;
}

/** Rama de laurel a trazo dorado que se dibuja sola al cargar. Motivo botánico. */
function RamaBotanica() {
  return (
    <svg className="portal-rama" viewBox="0 0 240 260" fill="none" aria-hidden="true">
      <g stroke="#A88B5C" strokeWidth="1.25" fill="none" strokeLinecap="round">
        <path className="rama-p t" pathLength="100" d="M52 248 C 84 200 92 172 110 134 C 126 100 140 70 174 40" />
        <path className="rama-p h1" pathLength="100" d="M110 134 C 128 124 148 128 160 144 C 140 146 120 142 110 134 Z" />
        <path className="rama-p h2" pathLength="100" d="M101 156 C 82 150 68 156 60 172 C 81 172 93 166 101 156 Z" />
        <path className="rama-p h3" pathLength="100" d="M124 104 C 142 95 162 99 174 115 C 154 117 134 113 124 104 Z" />
        <path className="rama-p h4" pathLength="100" d="M116 80 C 98 73 84 79 76 95 C 97 95 109 89 116 80 Z" />
        <path className="rama-p h5" pathLength="100" d="M150 60 C 168 51 188 55 200 71 C 180 73 160 69 150 60 Z" />
      </g>
      <circle className="rama-semilla" cx="174" cy="40" r="3.4" fill="#A88B5C" />
    </svg>
  );
}

function construirRegistro(datos, estudiosFolder) {
  const registro = {
    // Versión del contrato de datos. Lo consume el ERP; no cambiar sin
    // actualizar CONTRATO-PRECONSULTA.md y subir el número.
    version: 1,
    paciente: {
      nombre: datos.demografia?.nombre || null,
      edad: datos.demografia?.edad ?? null,
      telefono: datos.contacto?.telefono || null,
      correo: datos.contacto?.correo || null,
    },
    autoReporte: { mrs: datos.mrs, dolor: datos.dolor, hc: datos.hc, profundos: datos.profundos || {} },
    resumen: construirResumen(datos),
    consentimiento: true,
    // Carpeta de estudios adjuntos (opcional; campo aditivo del contrato).
    estudiosFolder: estudiosFolder || null,
  };
  registro.ruteoClinico = { ...instrumentosPara(registro), generadoEn: new Date().toISOString() };
  return registro;
}

export default function PortalPaciente() {
  return (
    <PacienteProvider>
      <PortalInterno />
    </PacienteProvider>
  );
}

function PortalInterno() {
  const [enviado, setEnviado] = useState(null);
  const [error, setError] = useState('');
  const [estudiosFolder] = useState(() => (buzonActivo() ? nuevaCarpeta() : null));
  const [estudiosEstado, setEstudiosEstado] = useState({ total: 0, subiendo: false, listos: 0, errores: 0 });

  const onEstudiosEstado = useCallback((estado) => {
    setEstudiosEstado(estado);
  }, []);

  const onEnviar = async (datos) => {
    setError('');
    try {
      const guardado = await guardarRespuesta(construirRegistro(datos, estudiosFolder));
      setEnviado(guardado);
    } catch (e) {
      // Un problema de configuración del consultorio no se resuelve reintentando:
      // se distingue del fallo de red para no mandar a la paciente a reintentar en
      // vano. El error se lanza con un mensaje claro que PreConsulta muestra junto
      // al botón (no se relanza el error crudo, que quedaba sin capturar).
      const config = e && e.message && /no est[aá] configurada|not configured/i.test(e.message);
      const msg = config
        ? 'No pudimos enviar tus respuestas por un problema del consultorio, no por tu conexión. Por favor avísale a la clínica.'
        : 'No se pudieron enviar tus respuestas. Revisa tu conexión e inténtalo de nuevo.';
      setError(msg);
      throw new Error(msg);
    }
  };

  if (enviado) {
    const primerNombre = enviado.paciente?.nombre ? enviado.paciente.nombre.trim().split(/\s+/)[0] : '';
    const partesEstudios = [];
    if (estudiosEstado.listos > 0) partesEstudios.push(`También recibimos ${estudiosEstado.listos === 1 ? 'el estudio que subiste' : `los ${estudiosEstado.listos} estudios que subiste`}.`);
    // No callar los estudios que fallaron: la paciente podría creer que llegaron.
    if (estudiosEstado.errores > 0) partesEstudios.push(`No pudimos recibir ${estudiosEstado.errores === 1 ? 'uno de tus estudios' : `${estudiosEstado.errores} de tus estudios`}; si quieres, llévalos impresos a tu consulta.`);
    const estudiosTexto = partesEstudios.length ? ' ' + partesEstudios.join(' ') : '';
    return (
      <div className="portal portal-centro">
        <Grano />
        <div className="portal-tarjeta-fin">
          <img className="portal-logo" src="/marca/logo_maestro_verde.svg" alt="dr. jiménez, ginecología" />
          <div className="portal-sello" aria-hidden="true" />
          <h1>Gracias{primerNombre ? `, ${primerNombre}` : ''}.</h1>
          <p>Tus respuestas llegaron al consultorio del Dr. Iván Jiménez Martínez.{estudiosTexto} Las revisará antes de tu consulta para dedicarle el tiempo a lo que más te importa.</p>
          <p className="portal-fin-nota">Ya puedes cerrar esta ventana.</p>
          <div className="portal-credito">{MEDICO.nombre} · {MEDICO.especialidad} · Cédula profesional {MEDICO.cedulaProfesional} · Cédula de especialidad {MEDICO.cedulaEspecialidad}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal">
      <Grano />
      <header className="portal-hero">
        <RamaBotanica />
        <img className="portal-hero-logo" src="/marca/logo_invertido_transparente.svg" alt="dr. jiménez, ginecología" />
        <div className="portal-hero-eyebrow"><span className="portal-punto-dorado" />Tu espacio privado</div>
        <h1 className="portal-hero-titulo">Antes de tu <em>consulta</em></h1>
        <p className="portal-hero-sub">Responde con calma desde donde estés. Tus respuestas le ayudan al doctor a conocer cómo te sientes y a dedicar la consulta a lo que más te importa.</p>
      </header>
      {error && <div className="portal-error">{error}</div>}
      <div className="portal-form">
        <PreConsulta
          onEnviar={onEnviar}
          extraAntesDeEnviar={estudiosFolder ? <SubirEstudios folder={estudiosFolder} onEstadoCambio={onEstudiosEstado} /> : null}
          envioBloqueado={estudiosEstado.subiendo}
          envioBloqueadoMensaje="Espera a que terminen de subir tus estudios para enviar tus respuestas."
        />
        <footer className="portal-colofon">
          <div className="portal-sello" aria-hidden="true" />
          <div className="portal-firma">dr. jiménez · ginecología</div>
          <div className="portal-credito">{MEDICO.nombre} · {MEDICO.especialidad} · Cédula profesional {MEDICO.cedulaProfesional} · Cédula de especialidad {MEDICO.cedulaEspecialidad}</div>
        </footer>
      </div>
    </div>
  );
}
