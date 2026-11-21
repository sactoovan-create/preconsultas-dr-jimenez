/**
 * Orquesta un evento: leer el estado real, filtrar, redactar, validar y, solo en
 * modo activo, publicar. Recibe sus dependencias para poder probarse sin red.
 */

import { motivoParaOmitir, problemasDeRespuesta } from './nucleo.js';

export async function procesarEvento(evento, { config, meta, redactar, avisar, ahora = Date.now() }) {
  if (evento.tipo === 'reaccion') {
    // Meta no ofrece forma de contestar una reacción; solo se cuenta.
    return { resultado: 'reaccion_registrada', reaccion: evento.reaccion };
  }

  const contexto = await meta.leerContexto(evento);
  const omitir = motivoParaOmitir(contexto, config, ahora);
  if (omitir) return { resultado: 'omitido', motivo: omitir };

  let decision;
  try {
    decision = await redactar(contexto);
  } catch (e) {
    decision = { accion: 'derivar', categoria: 'otro', respuesta: '', motivo: `falló la redacción: ${e.message}` };
  }

  if (decision.accion === 'responder') {
    const problemas = problemasDeRespuesta(decision.respuesta, config);
    if (problemas.length) {
      decision = { ...decision, accion: 'derivar', motivo: `respuesta rechazada por el candado: ${problemas.join('; ')}` };
    }
  }

  if (decision.accion === 'ignorar') return { resultado: 'ignorado', categoria: decision.categoria };

  if (decision.accion === 'derivar') {
    await avisar({ tipo: 'derivado', contexto, decision });
    return { resultado: 'derivado', categoria: decision.categoria, motivo: decision.motivo };
  }

  if (config.modo !== 'activo') {
    await avisar({ tipo: 'simulacion', contexto, decision });
    return { resultado: 'simulado', categoria: decision.categoria, respuesta: decision.respuesta };
  }

  // Segunda lectura justo antes de publicar: si alguien contestó mientras se redactaba, se cede.
  const fresco = await meta.leerContexto(evento);
  if (!fresco.comentario || fresco.paginaYaRespondio) return { resultado: 'omitido', motivo: 'la página ya respondió' };

  await meta.responderEnPublico(contexto.comentario.id, decision.respuesta);
  let privado = false;
  if (config.mensajePrivado && ['administrativa', 'caso_personal'].includes(decision.categoria)) {
    try {
      await meta.responderEnPrivado(contexto.comentario.id,
        `Hola, le escribimos del consultorio del Dr. Iván Jiménez Martínez por su comentario. Por aquí podemos orientarle con más privacidad, o si lo prefiere por WhatsApp al ${config.telefono}.`);
      privado = true;
    } catch (e) {
      console.error('No se pudo enviar el mensaje privado:', e.message);
    }
  }
  return { resultado: 'respondido', categoria: decision.categoria, privado };
}
