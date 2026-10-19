/**
 * Registro de la preconsulta tal como se guarda en Supabase (tabla «respuestas»,
 * columna `contenido`). Contrato: CONTRATO-PRECONSULTA.md.
 *
 * Vive en un módulo puro (sin React, CSS ni red) desde el 19/10/2026: el envío real
 * (paciente/PortalPaciente.jsx), las pruebas de Node (tests/cuestionarios.mjs) y el
 * generador del contrato con el ERP (scripts/contrato-cuestionarios.mjs) llaman a la
 * misma función. Así el ERP se prueba con registros que salen de este código y no con
 * un formato escrito a mano.
 */
import { construirResumen } from './resumenPaciente.js';
import { instrumentosPara } from './ruteoClinico.js';
import { combinarAlertaSeguridad } from './cuestionarios/index.js';
import { FORMULARIO_VERSION } from './preconsultaFlow.js';
import { normalizarAtribucion } from './atribucion.js';
import { normalizarDomicilio } from './domicilio.js';

export function construirRegistro(datos, estudiosFolder, archivos = [], respuestaId = null, estudiosDecision = null) {
  const submittedAtClient = datos.consentimientoFecha || new Date().toISOString();
  const domicilio = normalizarDomicilio(datos.domicilio || datos.hc || datos.paciente || {});
  const hcNormalizada = datos.hc ? { ...datos.hc, ...domicilio } : { ...domicilio };
  const registro = {
    // v2 conserva los campos canónicos de v1 para una migración gradual, pero
    // distingue respuesta parcial, consentimiento, reloj del cliente y adjuntos.
    version: 3,
    id: respuestaId,
    formularioVersion: datos.formularioVersion || FORMULARIO_VERSION,
    submittedAtClient,
    atribucion: normalizarAtribucion(datos.atribucion),
    paciente: {
      nombre: datos.demografia?.nombre || null,
      edad: datos.demografia?.edad ?? null,
      telefono: datos.contacto?.telefono || null,
      correo: datos.contacto?.correo || null,
      domicilio,
    },
    autoReporte: {
      mrs: datos.mrs,
      dolor: datos.dolor,
      hc: hcNormalizada,
      profundos: datos.profundos || {},
      // Cuestionarios validados (2026.10.1): solo los que se ofrecieron.
      ...(datos.phq9 ? { phq9: datos.phq9 } : {}),
      ...(datos.csi ? { csi: datos.csi } : {}),
    },
    resumen: construirResumen(datos),
    consentimiento: {
      aceptado: true,
      aceptadoEnCliente: submittedAtClient,
      avisoVersion: '2026-07',
      finalidades: ['atencion-clinica'],
    },
    // La regla del reactivo 9 del PHQ-9 se recalcula aquí para que ningún envío
    // quede sin su bandera aunque el llamador no la haya calculado.
    alertaSeguridad: combinarAlertaSeguridad(datos.alertaSeguridad || {
      urgente: false,
      embarazoConSintomas: false,
      saludMental: false,
      senales: [],
      senalesMaternas: [],
    }, { phq9: datos.phq9 }),
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
