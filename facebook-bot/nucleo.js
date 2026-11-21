/**
 * Piezas puras del bot de comentarios de Facebook: sin red y sin reloj propio,
 * para poder probarlas con `node tests/facebook-bot.mjs`.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { PRECIOS_PERMITIDOS, ENLACES } from './conocimiento.js';

export const MODOS = ['apagado', 'simulacion', 'activo'];

/** Lee la configuración del entorno. Cualquier modo desconocido cuenta como apagado. */
export function leerConfig(env) {
  const modo = MODOS.includes(env.FB_BOT_MODO) ? env.FB_BOT_MODO : 'apagado';
  const telefono = (env.FB_BOT_TELEFONO || '').trim() || '55 3048 5448';
  return {
    modo,
    paginaId: (env.FB_PAGE_ID || '').trim(),
    tokenPagina: env.FB_PAGE_ACCESS_TOKEN || '',
    secretoApp: env.FB_APP_SECRET || '',
    tokenVerificacion: env.FB_VERIFY_TOKEN || '',
    versionGraph: (env.FB_GRAPH_VERSION || '').trim(),
    modelo: (env.FB_BOT_MODELO || '').trim() || 'claude-opus-5-5',
    telefono,
    mensajePrivado: env.FB_BOT_MENSAJE_PRIVADO === '1',
    horasMaximas: Number(env.FB_BOT_HORAS_MAXIMAS) || 24,
    aviso: {
      claveResend: env.RESEND_API_KEY || '',
      destino: env.FB_BOT_AVISO_CORREO || '',
      origen: env.FB_BOT_AVISO_ORIGEN || 'onboarding@resend.dev',
    },
  };
}

/** Comprueba la cabecera X-Hub-Signature-256 que Meta calcula con el secreto de la app. */
export function firmaValida(cuerpoCrudo, cabecera, secretoApp) {
  if (!secretoApp || typeof cabecera !== 'string' || !cabecera.startsWith('sha256=')) return false;
  const esperado = createHmac('sha256', secretoApp).update(cuerpoCrudo, 'utf8').digest();
  let recibido;
  try { recibido = Buffer.from(cabecera.slice(7), 'hex'); } catch { return false; }
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

/**
 * Convierte la notificación de Meta en una lista plana de eventos. Solo salen los
 * que le importan al bot; lo demás (ediciones, borrados, publicaciones propias) se descarta.
 */
export function extraerEventos(notificacion, paginaId) {
  const eventos = [];
  if (!notificacion || notificacion.object !== 'page') return eventos;
  for (const entrada of notificacion.entry || []) {
    if (paginaId && String(entrada.id) !== String(paginaId)) continue;
    for (const cambio of entrada.changes || []) {
      if (cambio.field !== 'feed') continue;
      const v = cambio.value || {};
      const autorId = v.from && v.from.id ? String(v.from.id) : '';
      if (autorId && autorId === String(paginaId)) continue; // la propia página
      if (v.item === 'comment' && v.verb === 'add' && v.comment_id) {
        eventos.push({
          tipo: 'comentario',
          comentarioId: String(v.comment_id),
          publicacionId: String(v.post_id || ''),
          padreId: String(v.parent_id || ''),
          autorId,
          texto: typeof v.message === 'string' ? v.message : '',
        });
      } else if (v.item === 'reaction' && v.verb === 'add') {
        eventos.push({
          tipo: 'reaccion',
          publicacionId: String(v.post_id || ''),
          reaccion: String(v.reaction_type || 'like'),
        });
      }
    }
  }
  return eventos;
}

const SOLO_SIMBOLOS = /^[\s\p{P}\p{S}\p{Extended_Pictographic}‍️]*$/u;

/**
 * Filtro previo, sin modelo: decide si vale la pena redactar. Devuelve null si sí,
 * o el motivo por el que el comentario se deja pasar.
 */
export function motivoParaOmitir(contexto, config, ahora) {
  const c = contexto.comentario;
  if (!c) return 'el comentario ya no existe';
  if (String(c.autorId) === String(config.paginaId)) return 'es de la propia página';
  const texto = (c.texto || '').trim();
  if (!texto || SOLO_SIMBOLOS.test(texto)) return 'sin texto que contestar';
  if (c.creado && ahora - Date.parse(c.creado) > config.horasMaximas * 3600 * 1000) return 'comentario antiguo';
  if (contexto.paginaYaRespondio) return 'la página ya respondió';
  if (contexto.padre && String(contexto.padre.autorId) !== String(config.paginaId)) {
    return 'conversación entre terceros';
  }
  return null;
}

export const ESQUEMA_DECISION = {
  type: 'object',
  properties: {
    accion: { type: 'string', enum: ['responder', 'derivar', 'ignorar'] },
    categoria: {
      type: 'string',
      enum: ['elogio', 'administrativa', 'duda_general', 'caso_personal', 'alarma',
        'queja', 'paciente_actual', 'desinformacion', 'spam', 'otro'],
    },
    respuesta: { type: 'string' },
    motivo: { type: 'string' },
  },
  required: ['accion', 'categoria', 'respuesta', 'motivo'],
  additionalProperties: false,
};

const digitos = (s) => s.replace(/\D/g, '');

/**
 * Candado determinista sobre lo que redactó el modelo. Devuelve la lista de
 * problemas; vacía significa que la respuesta puede publicarse.
 */
export function problemasDeRespuesta(respuesta, config) {
  const problemas = [];
  const texto = (respuesta || '').trim();
  if (!texto) return ['respuesta vacía'];
  if (texto.length > 900) problemas.push('demasiado larga');
  if (/\p{Extended_Pictographic}/u.test(texto)) problemas.push('contiene emojis');
  if (/sin dolor|garantiz|100\s?%|te vas? a curar|se cura\b/i.test(texto)) problemas.push('promesa no permitida');

  const telefonoOk = digitos(config.telefono);
  const enlacesOk = [ENLACES.preconsulta, ENLACES.sitio, `https://wa.me/52${telefonoOk}`];
  for (const url of texto.match(/https?:\/\/[^\s)]+/g) || []) {
    const limpia = url.replace(/[.,;:]+$/, '');
    if (!enlacesOk.some((ok) => limpia === ok || limpia + '/' === ok)) problemas.push(`enlace no canónico: ${limpia}`);
  }
  const sinEnlaces = texto.replace(/https?:\/\/[^\s)]+/g, ' ');
  for (const m of sinEnlaces.match(/\$\s?\d[\d,.]*/g) || []) {
    const n = Number(m.replace(/[^\d.]/g, '').replace(/\.(?=\d{3})/g, ''));
    if (!PRECIOS_PERMITIDOS.includes(n)) problemas.push(`precio no canónico: ${m.trim()}`);
  }
  for (const m of sinEnlaces.match(/(?:\+?\d[\s-]?){10,13}/g) || []) {
    const d = digitos(m);
    if (!d.endsWith(telefonoOk)) problemas.push(`teléfono no canónico: ${m.trim()}`);
  }
  return problemas;
}
