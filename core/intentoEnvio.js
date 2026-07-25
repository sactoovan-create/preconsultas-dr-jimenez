import { buzonActivo, nuevaCarpeta } from './estudios.js';
import { nuevaRespuestaId } from './respuestas.js';

export const CLAVE_INTENTO_ENVIO = 'drj_preconsulta_intento_envio_v2';
export const VIGENCIA_INTENTO_MS = 4 * 60 * 60 * 1000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CARPETA = /^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/;

function adjuntosValidos(adjuntos) {
  if (!Array.isArray(adjuntos)) return [];
  return adjuntos.slice(0, 10).flatMap((archivo) => {
    const path = String(archivo?.path || '');
    if (!/^[^/]+\/[^/]+$/.test(path)) return [];
    return [{
      path,
      nombre: String(archivo?.nombre || 'estudio').slice(0, 160),
      size: Number(archivo?.size || 0),
    }];
  });
}

export function cargarIntentoEnvio({
  storage = globalThis.sessionStorage,
  backendActivo = buzonActivo(),
  ahora = Date.now(),
  crearId = nuevaRespuestaId,
  crearCarpeta = nuevaCarpeta,
} = {}) {
  const crear = () => ({
    respuestaId: crearId(),
    estudiosFolder: backendActivo ? crearCarpeta() : null,
    adjuntos: [],
    creadoEn: ahora,
  });
  try {
    const guardado = JSON.parse(storage?.getItem(CLAVE_INTENTO_ENVIO) || 'null');
    const vigente = guardado
      && ahora - Number(guardado.creadoEn || 0) <= VIGENCIA_INTENTO_MS
      && UUID.test(String(guardado.respuestaId || ''));
    const intento = vigente
      ? {
        ...guardado,
        adjuntos: adjuntosValidos(guardado.adjuntos),
        estudiosFolder: backendActivo
          ? (CARPETA.test(String(guardado.estudiosFolder || ''))
            ? guardado.estudiosFolder
            : crearCarpeta())
          : null,
      }
      : crear();
    storage?.setItem(CLAVE_INTENTO_ENVIO, JSON.stringify(intento));
    return intento;
  } catch (_) {
    return crear();
  }
}

export function guardarAdjuntosIntento(adjuntos, storage = globalThis.sessionStorage) {
  try {
    const guardado = JSON.parse(storage?.getItem(CLAVE_INTENTO_ENVIO) || 'null');
    if (!guardado) return;
    storage?.setItem(CLAVE_INTENTO_ENVIO, JSON.stringify({
      ...guardado,
      adjuntos: adjuntosValidos(adjuntos),
    }));
  } catch (_) { /* sin almacenamiento */ }
}

export function borrarIntentoEnvio(storage = globalThis.sessionStorage) {
  try { storage?.removeItem(CLAVE_INTENTO_ENVIO); } catch (_) { /* sin almacenamiento */ }
}
