/** Llamadas a la Graph API de Meta. Es lo único del bot que toca Facebook. */

export function crearMeta(config, pedir = fetch) {
  const base = `https://graph.facebook.com/${config.versionGraph ? config.versionGraph + '/' : ''}`;

  async function llamar(metodo, ruta, parametros = {}) {
    const url = new URL(base + ruta);
    const opciones = { method: metodo, headers: { Authorization: `Bearer ${config.tokenPagina}` } };
    if (metodo === 'GET') {
      for (const [k, v] of Object.entries(parametros)) url.searchParams.set(k, v);
    } else {
      opciones.headers['Content-Type'] = 'application/json';
      opciones.body = JSON.stringify(parametros);
    }
    const r = await pedir(url, opciones);
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok || cuerpo.error) {
      const e = new Error(`Graph ${metodo} ${ruta}: ${r.status} ${cuerpo.error ? cuerpo.error.message : ''}`);
      e.codigo = cuerpo.error ? cuerpo.error.code : r.status;
      throw e;
    }
    return cuerpo;
  }

  const autor = (x) => (x && x.from && x.from.id ? String(x.from.id) : '');

  return {
    /** Lee el comentario en vivo, su hilo y la publicación, para decidir con el estado real. */
    async leerContexto(evento) {
      let c;
      try {
        c = await llamar('GET', evento.comentarioId, {
          fields: 'id,message,from,created_time,permalink_url,parent{id,message,from},comments.limit(50){from,created_time}',
        });
      } catch (e) {
        if (e.codigo === 100 || e.codigo === 404) return { comentario: null };
        throw e;
      }
      const contexto = {
        comentario: { id: c.id, texto: c.message || '', autorId: autor(c) || evento.autorId, creado: c.created_time, enlace: c.permalink_url || '' },
        padre: c.parent ? { id: c.parent.id, texto: c.parent.message || '', autorId: autor(c.parent) } : null,
        paginaYaRespondio: ((c.comments && c.comments.data) || []).some((x) => autor(x) === config.paginaId),
        publicacion: '',
      };
      if (contexto.padre && !contexto.paginaYaRespondio) {
        // En un hilo, la respuesta de la página queda como hermana, no como hija.
        const hilo = await llamar('GET', `${contexto.padre.id}/comments`, { fields: 'from,created_time', limit: '100' });
        contexto.paginaYaRespondio = (hilo.data || []).some(
          (x) => autor(x) === config.paginaId && Date.parse(x.created_time) > Date.parse(c.created_time),
        );
      }
      if (evento.publicacionId) {
        try {
          const p = await llamar('GET', evento.publicacionId, { fields: 'message' });
          contexto.publicacion = p.message || '';
        } catch { /* sin el texto de la publicación se puede contestar igual */ }
      }
      return contexto;
    },

    responderEnPublico(comentarioId, mensaje) {
      return llamar('POST', `${comentarioId}/comments`, { message: mensaje });
    },

    /** Un único mensaje privado a quien comentó; Meta lo permite dentro de los 7 días. */
    responderEnPrivado(comentarioId, mensaje) {
      return llamar('POST', `${config.paginaId}/messages`, {
        recipient: { comment_id: comentarioId },
        message: { text: mensaje },
        messaging_type: 'RESPONSE',
      });
    },
  };
}
