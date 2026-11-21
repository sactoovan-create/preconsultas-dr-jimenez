/**
 * Punto de entrada que Meta llama cada vez que alguien comenta o reacciona en la
 * página. GET es la verificación inicial del webhook; POST son las notificaciones.
 * Se contesta 200 de inmediato y el trabajo sigue en segundo plano, porque Meta
 * reintenta (y duplica) si la respuesta tarda.
 */

import { waitUntil } from '@vercel/functions';
import { leerConfig, firmaValida, extraerEventos } from '../facebook-bot/nucleo.js';
import { crearMeta } from '../facebook-bot/meta.js';
import { crearRedactor } from '../facebook-bot/redactor.js';
import { crearAvisador } from '../facebook-bot/avisos.js';
import { procesarEvento } from '../facebook-bot/procesar.js';

export function GET(request) {
  const config = leerConfig(process.env);
  const q = new URL(request.url).searchParams;
  const ok = config.tokenVerificacion
    && q.get('hub.mode') === 'subscribe'
    && q.get('hub.verify_token') === config.tokenVerificacion;
  return ok ? new Response(q.get('hub.challenge') || '', { status: 200 }) : new Response('No autorizado', { status: 403 });
}

export async function POST(request) {
  const config = leerConfig(process.env);
  const crudo = await request.text();
  if (!firmaValida(crudo, request.headers.get('x-hub-signature-256'), config.secretoApp)) {
    return new Response('Firma inválida', { status: 401 });
  }
  if (config.modo === 'apagado' || !config.paginaId || !config.tokenPagina) {
    return new Response('ok', { status: 200 });
  }
  let notificacion;
  try { notificacion = JSON.parse(crudo); } catch { return new Response('ok', { status: 200 }); }

  const eventos = extraerEventos(notificacion, config.paginaId);
  if (eventos.length) {
    const deps = { config, meta: crearMeta(config), redactar: crearRedactor(config), avisar: crearAvisador(config) };
    waitUntil(Promise.all(eventos.map(async (evento) => {
      try {
        const r = await procesarEvento(evento, deps);
        // Bitácora sin nombres ni texto del comentario.
        console.log(JSON.stringify({ bot: 'facebook', modo: config.modo, tipo: evento.tipo, resultado: r.resultado, categoria: r.categoria, motivo: r.motivo }));
      } catch (e) {
        console.error('Fallo al procesar un evento de Facebook:', e.message);
      }
    })));
  }
  return new Response('ok', { status: 200 });
}
