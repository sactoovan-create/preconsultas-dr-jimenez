import { backendConfigurado, clientePacienteSupabase } from './respuestas.js';

export const BORRADOR_REMOTO_VIGENCIA_HORAS = 48;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

function bytesAleatorios(cantidad = 32, cryptoApi = globalThis.crypto) {
  const bytes = new Uint8Array(cantidad);
  if (!cryptoApi?.getRandomValues) throw new Error('Este navegador no puede crear un enlace privado seguro.');
  cryptoApi.getRandomValues(bytes);
  return bytes;
}

export function nuevoTokenContinuacion(cryptoApi = globalThis.crypto) {
  const binario = Array.from(bytesAleatorios(32, cryptoApi), (byte) => String.fromCharCode(byte)).join('');
  return globalThis.btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function tokenContinuacionDesdeHash(hash = globalThis.location?.hash || '') {
  const parametros = new URLSearchParams(String(hash).replace(/^#/, ''));
  const token = parametros.get('continuar') || '';
  return TOKEN.test(token) ? token : '';
}

export function construirEnlaceContinuacion(token, ubicacion = globalThis.location) {
  if (!TOKEN.test(String(token || ''))) throw new Error('El enlace de continuación no es válido.');
  const origen = ubicacion?.origin || '';
  const ruta = ubicacion?.pathname || '/';
  return `${origen}${ruta}#continuar=${token}`;
}

function exigirBackend() {
  if (!backendConfigurado()) throw new Error('La continuación privada no está configurada.');
}

export async function guardarBorradorRemoto(token, contenido) {
  exigirBackend();
  if (!TOKEN.test(String(token || ''))) throw new Error('No se pudo crear un enlace privado válido.');
  const sb = await clientePacienteSupabase();
  const { data, error } = await sb.rpc('guardar_borrador_preconsulta', {
    p_token: token,
    p_contenido: contenido,
  });
  if (error) throw error;
  return data;
}

export async function leerBorradorRemoto(token) {
  exigirBackend();
  if (!TOKEN.test(String(token || ''))) return null;
  const sb = await clientePacienteSupabase();
  const { data, error } = await sb.rpc('leer_borrador_preconsulta', { p_token: token });
  if (error) throw error;
  return data || null;
}

export async function borrarBorradorRemoto(token) {
  if (!backendConfigurado() || !TOKEN.test(String(token || ''))) return;
  const sb = await clientePacienteSupabase();
  const { error } = await sb.rpc('borrar_borrador_preconsulta', { p_token: token });
  if (error) throw error;
}
