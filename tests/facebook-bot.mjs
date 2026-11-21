/**
 * Pruebas del bot de comentarios de Facebook. Sin red: Meta, el redactor y el
 * correo se sustituyen por dobles. `node tests/facebook-bot.mjs`.
 */

import { createHmac } from 'node:crypto';
import { leerConfig, firmaValida, extraerEventos, motivoParaOmitir, problemasDeRespuesta } from '../facebook-bot/nucleo.js';
import { procesarEvento } from '../facebook-bot/procesar.js';
import { crearMeta } from '../facebook-bot/meta.js';
import { instrucciones, mensajeUsuario, crearRedactor } from '../facebook-bot/redactor.js';
import { GET, POST } from '../api/facebook-webhook.js';

let ok = 0, fail = 0;
function check(nombre, cond) {
  if (cond) { ok++; console.log(`  PASA  ${nombre}`); }
  else { fail++; console.log(`  FALLA ${nombre}`); }
}

const PAGINA = '111';
const AHORA = Date.parse('2026-11-21T18:00:00Z');
const env = { FB_BOT_MODO: 'activo', FB_PAGE_ID: PAGINA, FB_PAGE_ACCESS_TOKEN: 't', FB_APP_SECRET: 's3', FB_VERIFY_TOKEN: 'v' };
const config = leerConfig(env);

console.log('Configuración');
check('sin modo declarado queda apagado', leerConfig({}).modo === 'apagado');
check('un modo desconocido queda apagado', leerConfig({ FB_BOT_MODO: 'prendido' }).modo === 'apagado');
check('teléfono público por defecto', config.telefono === '55 3048 5448');

console.log('Firma de Meta');
const cuerpo = '{"object":"page"}';
const firma = 'sha256=' + createHmac('sha256', 's3').update(cuerpo).digest('hex');
check('firma correcta se acepta', firmaValida(cuerpo, firma, 's3'));
check('cuerpo alterado se rechaza', !firmaValida(cuerpo + ' ', firma, 's3'));
check('sin secreto se rechaza todo', !firmaValida(cuerpo, firma, ''));
check('sin cabecera se rechaza', !firmaValida(cuerpo, null, 's3'));

console.log('Lectura de la notificación');
const cambio = (value) => ({ object: 'page', entry: [{ id: PAGINA, changes: [{ field: 'feed', value }] }] });
const comentarioNuevo = { item: 'comment', verb: 'add', comment_id: '9_1', post_id: '111_9', parent_id: '111_9', from: { id: '555', name: 'X' }, message: '¿Cuánto cuesta la consulta?' };
check('comentario nuevo se extrae', extraerEventos(cambio(comentarioNuevo), PAGINA)[0]?.comentarioId === '9_1');
check('comentario de la propia página se descarta', extraerEventos(cambio({ ...comentarioNuevo, from: { id: PAGINA } }), PAGINA).length === 0);
check('edición no cuenta', extraerEventos(cambio({ ...comentarioNuevo, verb: 'edited' }), PAGINA).length === 0);
check('borrado no cuenta', extraerEventos(cambio({ ...comentarioNuevo, verb: 'remove' }), PAGINA).length === 0);
check('reacción se extrae como reacción', extraerEventos(cambio({ item: 'reaction', verb: 'add', reaction_type: 'love', post_id: '111_9', from: { id: '555' } }), PAGINA)[0]?.tipo === 'reaccion');
check('otra página se descarta', extraerEventos({ object: 'page', entry: [{ id: '999', changes: [{ field: 'feed', value: comentarioNuevo }] }] }, PAGINA).length === 0);
check('objeto que no es página se descarta', extraerEventos({ object: 'instagram', entry: [] }, PAGINA).length === 0);

console.log('Filtro previo');
const ctx = (extra = {}) => ({
  comentario: { id: '9_1', texto: '¿Cuánto cuesta la consulta?', autorId: '555', creado: '2026-11-21T17:59:00Z', enlace: 'https://facebook.com/x' },
  padre: null, paginaYaRespondio: false, publicacion: 'Menopausia', ...extra,
});
check('pregunta normal pasa', motivoParaOmitir(ctx(), config, AHORA) === null);
check('solo emojis se omite', motivoParaOmitir(ctx({ comentario: { ...ctx().comentario, texto: '❤️❤️ !!' } }), config, AHORA) !== null);
check('comentario borrado se omite', motivoParaOmitir({ comentario: null }, config, AHORA) !== null);
check('comentario de hace dos días se omite', motivoParaOmitir(ctx({ comentario: { ...ctx().comentario, creado: '2026-11-19T10:00:00Z' } }), config, AHORA) === 'comentario antiguo');
check('si la página ya respondió se omite', motivoParaOmitir(ctx({ paginaYaRespondio: true }), config, AHORA) === 'la página ya respondió');
check('respuesta entre terceros se omite', motivoParaOmitir(ctx({ padre: { id: '9_0', texto: 'x', autorId: '777' } }), config, AHORA) === 'conversación entre terceros');
check('respuesta a un comentario de la página pasa', motivoParaOmitir(ctx({ padre: { id: '9_0', texto: 'x', autorId: PAGINA } }), config, AHORA) === null);

console.log('Candado de la respuesta');
const buena = 'La consulta presencial cuesta $1,500 y dura 60 minutos. Puede agendar por WhatsApp al 55 3048 5448 o llenar antes el cuestionario: https://preconsultas-dr-jimenez.vercel.app/';
check('respuesta canónica pasa', problemasDeRespuesta(buena, config).length === 0);
check('precio inventado se rechaza', problemasDeRespuesta('La consulta cuesta $900.', config).some((p) => p.includes('precio')));
check('precio con punto de miles se reconoce', problemasDeRespuesta('Cuesta $1.500.', config).length === 0);
check('teléfono de campaña se rechaza', problemasDeRespuesta('Escriba al 56 6301 5642', config).some((p) => p.includes('teléfono')));
check('enlace ajeno se rechaza', problemasDeRespuesta('Vea https://bit.ly/abc', config).some((p) => p.includes('enlace')));
check('enlace de WhatsApp del número público pasa', problemasDeRespuesta('Escríbanos: https://wa.me/525530485448', config).length === 0);
check('emoji se rechaza', problemasDeRespuesta('Gracias 😊', config).some((p) => p.includes('emoji')));
check('«sin dolor» se rechaza', problemasDeRespuesta('Es un procedimiento sin dolor.', config).length > 0);
check('respuesta vacía se rechaza', problemasDeRespuesta('  ', config).length > 0);
check('horario no se confunde con teléfono', problemasDeRespuesta('Martes de 9:00 a 12:00 y sábado de 9:00 a 14:00, consultorio 915.', config).length === 0);

console.log('Instrucciones del redactor');
check('incluyen el teléfono configurado', instrucciones(config).includes('55 3048 5448') && !instrucciones(config).includes('{{TELEFONO}}'));
check('no incluyen el número de campañas', !instrucciones(config).includes('6301'));
check('el comentario viaja delimitado', mensajeUsuario(ctx()).includes('<comentario>'));
const clienteFalso = (respuesta) => ({ messages: { create: async (p) => { clienteFalso.ultimo = p; return respuesta; } } });
const dec = await crearRedactor(config, clienteFalso({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: '{"accion":"ignorar","categoria":"spam","respuesta":"","motivo":"x"}' }] }))(ctx());
check('redactor lee el JSON del bloque de texto', dec.accion === 'ignorar');
check('redactor pide salida con esquema', clienteFalso.ultimo.output_config.format.type === 'json_schema');
const neg = await crearRedactor(config, clienteFalso({ stop_reason: 'refusal', content: [] }))(ctx());
check('si el modelo declina, se deriva', neg.accion === 'derivar');

console.log('Flujo completo');
function dobles({ decision, contexto = ctx(), contextos } = {}) {
  const hechos = { publicas: [], privadas: [], avisos: [], redacciones: 0 };
  const cola = contextos ? [...contextos] : null;
  return {
    hechos,
    deps: (cfg = config) => ({
      config: cfg, ahora: AHORA,
      meta: {
        leerContexto: async () => (cola ? cola.shift() : contexto),
        responderEnPublico: async (id, m) => { hechos.publicas.push([id, m]); },
        responderEnPrivado: async (id, m) => { hechos.privadas.push([id, m]); },
      },
      redactar: async () => { hechos.redacciones++; if (decision instanceof Error) throw decision; return decision; },
      avisar: async (a) => { hechos.avisos.push(a); },
    }),
  };
}
const evento = { tipo: 'comentario', comentarioId: '9_1', publicacionId: '111_9', autorId: '555' };
const responder = { accion: 'responder', categoria: 'administrativa', respuesta: buena, motivo: 'pregunta de precio' };

let d = dobles({ decision: responder });
let r = await procesarEvento(evento, d.deps());
check('modo activo publica una vez', r.resultado === 'respondido' && d.hechos.publicas.length === 1 && d.hechos.publicas[0][1] === buena);
check('sin permiso no manda privado', d.hechos.privadas.length === 0);

d = dobles({ decision: responder });
r = await procesarEvento(evento, d.deps(leerConfig({ ...env, FB_BOT_MODO: 'simulacion' })));
check('simulación no publica y avisa', r.resultado === 'simulado' && d.hechos.publicas.length === 0 && d.hechos.avisos[0].tipo === 'simulacion');

d = dobles({ decision: responder });
r = await procesarEvento(evento, d.deps(leerConfig({ ...env, FB_BOT_MENSAJE_PRIVADO: '1' })));
check('con permiso manda un privado', d.hechos.privadas.length === 1 && r.privado === true);

d = dobles({ decision: { ...responder, respuesta: 'La consulta cuesta $800.' } });
r = await procesarEvento(evento, d.deps());
check('respuesta con precio inventado no se publica y se deriva', r.resultado === 'derivado' && d.hechos.publicas.length === 0 && d.hechos.avisos.length === 1);

d = dobles({ decision: { accion: 'derivar', categoria: 'queja', respuesta: '', motivo: 'queja' } });
r = await procesarEvento(evento, d.deps());
check('queja se deriva sin publicar', r.resultado === 'derivado' && d.hechos.publicas.length === 0 && d.hechos.avisos[0].tipo === 'derivado');

d = dobles({ decision: { accion: 'ignorar', categoria: 'spam', respuesta: '', motivo: 'spam' } });
r = await procesarEvento(evento, d.deps());
check('spam se ignora sin aviso', r.resultado === 'ignorado' && d.hechos.avisos.length === 0 && d.hechos.publicas.length === 0);

d = dobles({ decision: new Error('sin servicio') });
r = await procesarEvento(evento, d.deps());
check('si falla el redactor se deriva', r.resultado === 'derivado' && d.hechos.publicas.length === 0);

d = dobles({ decision: responder, contexto: ctx({ paginaYaRespondio: true }) });
r = await procesarEvento(evento, d.deps());
check('si ya había respuesta ni siquiera redacta', r.resultado === 'omitido' && d.hechos.redacciones === 0);

d = dobles({ decision: responder, contextos: [ctx(), ctx({ paginaYaRespondio: true })] });
r = await procesarEvento(evento, d.deps());
check('si alguien contesta mientras redacta, cede', r.resultado === 'omitido' && d.hechos.publicas.length === 0);

d = dobles({ decision: responder });
r = await procesarEvento({ tipo: 'reaccion', reaccion: 'love' }, d.deps());
check('una reacción solo se registra', r.resultado === 'reaccion_registrada' && d.hechos.redacciones === 0 && d.hechos.publicas.length === 0);

console.log('Cliente de Meta');
const llamadas = [];
const respuestas = {
  '9_1': { id: '9_1', message: 'hola', from: { id: '555' }, created_time: '2026-11-21T17:00:00+0000', parent: { id: '9_0', message: 'respuesta', from: { id: PAGINA } }, comments: { data: [] } },
  '9_0/comments': { data: [{ from: { id: PAGINA }, created_time: '2026-11-21T17:05:00+0000' }] },
  '111_9': { message: 'Publicación' },
};
const pedir = async (url, op) => {
  const ruta = url.pathname.replace(/^\/(v[\d.]+\/)?/, '');
  llamadas.push({ ruta, metodo: op.method, auth: op.headers.Authorization, cuerpo: op.body, enUrl: url.search });
  const cuerpo = respuestas[ruta];
  return { ok: !!cuerpo || op.method === 'POST', status: 200, json: async () => cuerpo || { id: 'nuevo' } };
};
const meta = crearMeta(leerConfig({ ...env, FB_GRAPH_VERSION: 'v99.0' }), pedir);
const leido = await meta.leerContexto(evento);
check('detecta la respuesta posterior de la página en el hilo', leido.paginaYaRespondio === true);
check('trae el texto de la publicación', leido.publicacion === 'Publicación');
await meta.responderEnPublico('9_1', 'Gracias');
const pub = llamadas.at(-1);
check('publica en el comentario correcto', pub.ruta === '9_1/comments' && pub.metodo === 'POST' && JSON.parse(pub.cuerpo).message === 'Gracias');
check('el token viaja en cabecera, no en la URL', pub.auth === 'Bearer t' && llamadas.every((l) => !l.enUrl.includes('access_token')));

console.log('Webhook');
Object.assign(process.env, { FB_VERIFY_TOKEN: 'v', FB_APP_SECRET: 's3', FB_BOT_MODO: 'apagado' });
let resp = GET(new Request('https://x/api/facebook-webhook?hub.mode=subscribe&hub.verify_token=v&hub.challenge=4242'));
check('verificación devuelve el reto', resp.status === 200 && await resp.text() === '4242');
resp = GET(new Request('https://x/api/facebook-webhook?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=1'));
check('token de verificación incorrecto se rechaza', resp.status === 403);
resp = await POST(new Request('https://x/api/facebook-webhook', { method: 'POST', body: cuerpo, headers: { 'x-hub-signature-256': 'sha256=00' } }));
check('POST sin firma válida se rechaza', resp.status === 401);
resp = await POST(new Request('https://x/api/facebook-webhook', { method: 'POST', body: cuerpo, headers: { 'x-hub-signature-256': firma } }));
check('POST firmado con el bot apagado contesta 200 sin hacer nada', resp.status === 200);

console.log(`\n${ok} pasan, ${fail} fallan`);
process.exit(fail ? 1 : 0);
