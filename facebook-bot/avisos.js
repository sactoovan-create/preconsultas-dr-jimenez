/** Aviso por correo al doctor (mismo servicio Resend que ya usa la preconsulta). */

export function crearAvisador(config, pedir = fetch) {
  return async function avisar({ tipo, contexto, decision }) {
    const { claveResend, destino, origen } = config.aviso;
    if (!claveResend || !destino) return false;
    const titulo = tipo === 'derivado'
      ? 'Comentario de Facebook que necesita su respuesta'
      : 'Simulación: así habría contestado el bot';
    const cuerpo = [
      `Comentario: ${contexto.comentario.texto}`,
      contexto.comentario.enlace ? `Enlace: ${contexto.comentario.enlace}` : '',
      `Clasificación: ${decision.categoria}`,
      decision.respuesta ? `Respuesta propuesta: ${decision.respuesta}` : '',
      `Motivo: ${decision.motivo}`,
    ].filter(Boolean).join('\n\n');
    try {
      const r = await pedir('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${claveResend}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: origen, to: destino, subject: titulo, text: cuerpo }),
      });
      if (!r.ok) console.error('Resend respondió error:', r.status);
      return r.ok;
    } catch (e) {
      console.error('No se pudo enviar el aviso:', e.message);
      return false;
    }
  };
}
