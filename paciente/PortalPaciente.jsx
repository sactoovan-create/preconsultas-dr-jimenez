import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PacienteProvider } from '../core/PacienteContext.jsx';
import PreConsulta from '../PreConsulta.jsx';
import { guardarRespuesta } from '../core/respuestas.js';
import { construirResumen } from '../core/resumenPaciente.js';
import { eliminarEstudioPaciente } from '../core/estudios.js';
import { instrumentosPara } from '../core/ruteoClinico.js';
import { CREDITO } from '../core/marca.js';
import SubirEstudios from './SubirEstudios.jsx';
import { FORMULARIO_VERSION } from '../core/preconsultaFlow.js';
import {
  borrarIntentoEnvio,
  cargarIntentoEnvio,
  guardarAdjuntosIntento,
} from '../core/intentoEnvio.js';
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

export function construirRegistro(datos, estudiosFolder, archivos = [], respuestaId = null) {
  const submittedAtClient = datos.consentimientoFecha || new Date().toISOString();
  const registro = {
    // v2 conserva los campos canónicos de v1 para una migración gradual, pero
    // distingue respuesta parcial, consentimiento, reloj del cliente y adjuntos.
    version: 2,
    id: respuestaId,
    formularioVersion: datos.formularioVersion || FORMULARIO_VERSION,
    submittedAtClient,
    paciente: {
      nombre: datos.demografia?.nombre || null,
      edad: datos.demografia?.edad ?? null,
      telefono: datos.contacto?.telefono || null,
      correo: datos.contacto?.correo || null,
    },
    autoReporte: { mrs: datos.mrs, dolor: datos.dolor, hc: datos.hc, profundos: datos.profundos || {} },
    resumen: construirResumen(datos),
    consentimiento: {
      aceptado: true,
      aceptadoEnCliente: submittedAtClient,
      avisoVersion: '2026-07',
      finalidades: ['atencion-clinica'],
    },
    alertaSeguridad: datos.alertaSeguridad || {
      urgente: false,
      embarazoConSintomas: false,
      saludMental: false,
      senales: [],
      senalesMaternas: [],
    },
    // La carpeta solo viaja cuando existe por lo menos un archivo confirmado.
    estudiosFolder: archivos.length ? (estudiosFolder || null) : null,
    adjuntos: archivos.map((a) => ({
      nombre: a.nombre,
      ruta: a.path,
      bytes: a.size,
      estado: 'recibido',
    })),
  };
  registro.ruteoClinico = { ...instrumentosPara(registro), generadoEn: new Date().toISOString() };
  return registro;
}

export default function PortalPaciente() {
  return (
    <PacienteProvider persistirTrabajo={false}>
      <PortalInterno />
    </PacienteProvider>
  );
}

function PortalInterno() {
  const [intentoEnvio] = useState(cargarIntentoEnvio);
  const [enviado, setEnviado] = useState(null);
  const [error, setError] = useState('');
  const estudiosFolder = intentoEnvio.estudiosFolder;
  const respuestaId = intentoEnvio.respuestaId;
  const [estudiosEstado, setEstudiosEstado] = useState({
    total: 0, subiendo: false, listos: 0, errores: 0, archivos: [],
  });
  const estudiosRef = useRef(null);
  const confirmacionRef = useRef(null);

  useEffect(() => {
    if (!enviado) return;
    requestAnimationFrame(() => confirmacionRef.current?.focus());
  }, [enviado]);

  const onEstudiosEstado = useCallback((estado) => {
    setEstudiosEstado(estado);
    guardarAdjuntosIntento(estado.archivos);
  }, []);

  const onEnviar = async (datos) => {
    setError('');
    let archivos = [];
    try {
      archivos = estudiosFolder && estudiosRef.current
        ? await estudiosRef.current.subirPendientes()
        : [];
      guardarAdjuntosIntento(archivos);
      const guardado = await guardarRespuesta(construirRegistro(
        datos,
        estudiosFolder,
        archivos,
        respuestaId,
      ));
      borrarIntentoEnvio();
      setEnviado(guardado);
    } catch (e) {
      // Un error estructurado de Supabase confirma que el INSERT fue rechazado y
      // permite retirar los objetos. Un fallo puro de red es ambiguo: se conservan
      // los mismos archivos y UUID para que el reintento sea idempotente.
      const insercionRechazada = e?.code && e.code !== 'estudios';
      if (archivos.length && insercionRechazada) {
        await Promise.allSettled(
          archivos.map((archivo) => eliminarEstudioPaciente(archivo.path)),
        );
        guardarAdjuntosIntento([]);
        estudiosRef.current?.restablecerPendientes();
      }
      // Un problema de configuración del consultorio no se resuelve reintentando:
      // se distingue del fallo de red para no mandar a la paciente a reintentar en
      // vano. El error se lanza con un mensaje claro que PreConsulta muestra junto
      // al botón (no se relanza el error crudo, que quedaba sin capturar).
      const config = e && e.message && /no est[aá] configurada|not configured/i.test(e.message);
      const msg = e?.code === 'estudios'
        ? `No pudimos enviar uno de tus estudios. ${e.message || 'Quítalo o inténtalo de nuevo.'}`
        : archivos.length && !e?.code
        ? 'No pudimos confirmar el envío por un corte de conexión. Tus estudios siguen listos: presiona Enviar nuevamente.'
        : config
        ? 'No pudimos enviar tus respuestas por un problema del consultorio, no por tu conexión. Por favor avísale a la clínica.'
        : 'No se pudieron enviar tus respuestas. Revisa tu conexión e inténtalo de nuevo.';
      setError(msg);
      throw new Error(msg);
    }
  };

  if (enviado) {
    const primerNombre = enviado.paciente?.nombre ? enviado.paciente.nombre.trim().split(/\s+/)[0] : '';
    const partesEstudios = [];
    const estudiosRecibidos = enviado.adjuntos?.length || 0;
    if (estudiosRecibidos > 0) partesEstudios.push(`También recibimos ${estudiosRecibidos === 1 ? 'el estudio que subiste' : `los ${estudiosRecibidos} estudios que subiste`}.`);
    // No callar los estudios que fallaron: la paciente podría creer que llegaron.
    if (estudiosEstado.errores > 0) partesEstudios.push(`No pudimos recibir ${estudiosEstado.errores === 1 ? 'uno de tus estudios' : `${estudiosEstado.errores} de tus estudios`}; si quieres, llévalos impresos a tu consulta.`);
    const estudiosTexto = partesEstudios.length ? ' ' + partesEstudios.join(' ') : '';
    const urgente = enviado.alertaSeguridad?.urgente === true;
    return (
      <div className="portal portal-centro">
        <Grano />
        <div className="portal-tarjeta-fin" ref={confirmacionRef} tabIndex={-1} role="status" aria-live="polite">
          <img className="portal-logo" src="/marca/logo_maestro_verde.svg" alt="dr. jiménez, ginecología" />
          <div className="portal-sello" aria-hidden="true" />
          <h1>Gracias{primerNombre ? `, ${primerNombre}` : ''}.</h1>
          <p>Tus respuestas llegaron al consultorio del Dr. Iván Jiménez Martínez.{estudiosTexto} Las revisará antes de tu consulta para dedicarle el tiempo a lo que más te importa.</p>
          {urgente ? (
            <div className="portal-fin-urgente" role="alert">
              <b>El envío no sustituye atención urgente.</b>
              <p>No esperes a que el consultorio revise el cuestionario. Busca atención médica de urgencia ahora.</p>
            </div>
          ) : (
            <p className="portal-fin-nota">Ya puedes cerrar esta ventana.</p>
          )}
          <div className="portal-credito">{CREDITO}</div>
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
          extraAntesDeEnviar={({ consentimientoAceptado, enviando }) => (
            estudiosFolder
              ? (
                <SubirEstudios
                  ref={estudiosRef}
                  folder={estudiosFolder}
                  habilitado={consentimientoAceptado}
                  bloqueado={enviando}
                  archivosIniciales={intentoEnvio.adjuntos}
                  onEstadoCambio={onEstudiosEstado}
                />
              )
              : null
          )}
          envioBloqueado={estudiosEstado.subiendo}
          envioBloqueadoMensaje="Espera a que terminen de subir tus estudios para enviar tus respuestas."
          estudiosEstado={estudiosEstado}
        />
        <footer className="portal-colofon">
          <div className="portal-sello" aria-hidden="true" />
          <div className="portal-firma">dr. jiménez · ginecología</div>
          <div className="portal-credito">{CREDITO}</div>
        </footer>
      </div>
    </div>
  );
}
