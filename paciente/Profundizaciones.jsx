import React, { useState } from 'react';
import { profundizacionesSugeridas } from '../core/profundos/index.js';
import './Profundizaciones.css';

/**
 * Profundizaciones adaptativas de la pre-consulta. A partir de lo que la paciente
 * ya contestó en el tamizaje, ofrece —de forma OPCIONAL— unas preguntas más
 * específicas y validadas para la rama que salió positiva (por ejemplo, escapes de
 * orina si reportó molestias de vejiga). Se ofrece, no se impone; la paciente
 * decide si las contesta. Sube mucho la certeza que llega al médico.
 *
 * `tamizaje` = { mrs, dolor, hc } (lo ya contestado). `valor` = respuestas por id.
 */
export default function Profundizaciones({ tamizaje, valor, onChange }) {
  const sugeridas = profundizacionesSugeridas(tamizaje || {});
  if (!sugeridas.length) return null;

  return (
    <>
      {sugeridas.map((p) => (
        <Bloque
          key={p.id}
          def={p}
          respuestas={(valor && valor[p.id]) || {}}
          onRespuestas={(r) => onChange({ ...(valor || {}), [p.id]: r })}
        />
      ))}
    </>
  );
}

function Bloque({ def, respuestas, onRespuestas }) {
  const yaEmpezo = Object.keys(respuestas).length > 0;
  const [abierto, setAbierto] = useState(yaEmpezo);

  const set = (id, val) => onRespuestas({ ...respuestas, [id]: val });

  if (!abierto) {
    return (
      <div className="pc-seccion pf-oferta">
        <div className="pf-oferta-t">Notamos que mencionaste molestias en esta área.</div>
        <div className="pf-oferta-d">¿Nos cuentas un poco más? Son {def.preguntas.length} preguntas rápidas y le dan a tu doctor un panorama mucho más claro. Es opcional.</div>
        <button type="button" className="pf-oferta-btn" onClick={() => setAbierto(true)}>Sí, contestar unas preguntas más</button>
      </div>
    );
  }

  return (
    <div className="pc-seccion pf-bloque">
      <div className="pc-seccion-t">{def.titulo}</div>
      <div className="pc-seccion-d">Contesta con calma. Nada de esto es un diagnóstico; le ayuda a tu doctor a entenderte mejor.</div>
      <div className="pf-preguntas">
        {def.preguntas.map((q) => (
          <Pregunta key={q.id} q={q} valor={respuestas[q.id]} onChange={(v) => set(q.id, v)} />
        ))}
      </div>
    </div>
  );
}

function Pregunta({ q, valor, onChange }) {
  return (
    <div className="pf-pregunta">
      <div className="pf-pregunta-t">{q.texto}</div>
      {q.ayuda && <div className="pf-pregunta-ayuda">{q.ayuda}</div>}

      {q.tipo === 'opcion' && (
        <div className="pf-opciones">
          {q.opciones.map((o) => (
            <button
              type="button"
              key={o.valor}
              className={'pf-op' + (valor === o.valor ? ' on' : '')}
              onClick={() => onChange(o.valor)}
            >{o.etiqueta}</button>
          ))}
        </div>
      )}

      {q.tipo === 'escala' && (
        <div className="pf-escala">
          <span className="pf-escala-et">{q.etiquetaMin}</span>
          <div className="pf-escala-nums">
            {Array.from({ length: q.max - q.min + 1 }, (_, i) => q.min + i).map((n) => (
              <button
                type="button"
                key={n}
                className={'pf-num' + (valor === n ? ' on' : '')}
                onClick={() => onChange(n)}
              >{n}</button>
            ))}
          </div>
          <span className="pf-escala-et">{q.etiquetaMax}</span>
        </div>
      )}

      {q.tipo === 'multiple' && (
        <div className="pf-multiple">
          {q.opciones.map((o) => {
            const marcadas = Array.isArray(valor) ? valor : [];
            const on = marcadas.includes(o.id);
            return (
              <button
                type="button"
                key={o.id}
                className={'pf-check' + (on ? ' on' : '')}
                onClick={() => onChange(on ? marcadas.filter((x) => x !== o.id) : [...marcadas, o.id])}
              >
                <span className="pf-check-caja" aria-hidden="true" />
                <span>{o.etiqueta}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
