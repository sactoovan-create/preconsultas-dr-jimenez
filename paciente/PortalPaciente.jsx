import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock3, FileUp, LockKeyhole } from 'lucide-react';
import { PacienteProvider } from '../core/PacienteContext.jsx';
import PreConsulta from '../PreConsulta.jsx';
import { guardarRespuesta } from '../core/respuestas.js';
import { construirResumen } from '../core/resumenPaciente.js';
import { bloqueoEnvioEstudios, eliminarEstudioPaciente } from '../core/estudios.js';
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

export function construirRegistro(datos, estudiosFolder, archivos = [], respuestaId = null, estudiosDecision = null) {
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
    estudiosDeclaracion: estudiosDecision === 'si' ? 'adjunto_estudios' : 'no_los_tengo_ahora',
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
    total: 0, subiendo: false, listos: 0, pendientes: 0, errores: 0, decision: null, archivos: [],
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
        estudiosEstado.decision,
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
          <img className="portal-logo" src="/marca/logo_maestro_web.svg" alt="dr. jiménez, ginecología" />
          <CheckCircle2 className="portal-fin-check" aria-hidden="true" />
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
        <div className="portal-hero-inner">
          <div className="portal-masthead">
            <img className="portal-hero-logo" src="/marca/logo_invertido_web.svg" alt="dr. jiménez, ginecología" />
            <span>Preconsulta</span>
          </div>
          <div className="portal-hero-copy">
            <div className="portal-hero-eyebrow"><span className="portal-punto-dorado" />Tu espacio privado</div>
            <h1 className="portal-hero-titulo">Antes de tu <em>consulta</em></h1>
            <p className="portal-hero-sub">Responde con calma desde donde estés. Tus respuestas le ayudan al doctor a conocer cómo te sientes y a dedicar la consulta a lo que más te importa.</p>
            <div className="portal-hero-datos" aria-label="Información del cuestionario">
              <span><Clock3 aria-hidden="true" />8 a 12 minutos</span>
              <span><LockKeyhole aria-hidden="true" />Información privada</span>
              <span><FileUp aria-hidden="true" />Estudios al final</span>
            </div>
          </div>
        </div>
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
          envioBloqueado={!!bloqueoEnvioEstudios(estudiosEstado)}
          envioBloqueadoMensaje={bloqueoEnvioEstudios(estudiosEstado)}
          estudiosEstado={estudiosEstado}
        />
        <footer className="portal-colofon">
          <img className="portal-footer-logo" src="/marca/logo_maestro_web.svg" alt="dr. jiménez, ginecología" />
          <div className="portal-credito">{CREDITO}</div>
        </footer>
      </div>
    </div>
  );
}
