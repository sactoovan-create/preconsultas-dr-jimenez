import React, { useState, useEffect } from 'react';
import { profundizacionesSugeridas } from '../core/profundos/index.js';
import './Profundizaciones.css';

/** Preguntas complementarias opcionales. `tamizaje` contiene lo ya reportado;
 * `valor` conserva las respuestas por módulo. No son pruebas diagnósticas. */
export default function Profundizaciones({ tamizaje, valor, onChange, soloId = null }) {
  const sugeridas = profundizacionesSugeridas(tamizaje || {})
    .filter((profundizacion) => !soloId || profundizacion.id === soloId);
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

/**
 * ¿Se muestra esta pregunta u opción con lo ya contestado dentro del módulo?
 * Hace el cuestionario adaptativo: no pregunta lo que no aplica (dolor menstrual a
 * quien ya no menstrúa, dolor en relaciones a quien no las tiene) ni ofrece como
 * "lo que más te molesta" un síntoma que la paciente no reportó.
 *   { campo, en: [valores] } | { campo, min } | { campo, igual }
 */
function cumple(cond, resp) {
  if (!cond) return true;
  const r = resp || {};
  // { campos: [...], min }: se cumple si cualquiera de esos campos llega al mínimo.
  if (cond.campos) return cond.campos.some((c) => r[c] != null && r[c] !== '' && typeof r[c] !== 'boolean' && Number.isFinite(Number(r[c])) && Number(r[c]) >= (cond.min == null ? 1 : cond.min));
  const v = r[cond.campo];
  if (v == null || v === '' || typeof v === 'boolean') return false;
  const n = Number(v);
  if (cond.en) return cond.en.includes(v) || cond.en.includes(n);
  if (cond.min != null) return Number.isFinite(n) && n >= cond.min;
  if (cond.igual !== undefined) return v === cond.igual;
  return true;
}

function Bloque({ def, respuestas, onRespuestas }) {
  const yaEmpezo = Object.keys(respuestas).length > 0;
  const [abierto, setAbierto] = useState(yaEmpezo);

  const set = (id, val) => onRespuestas({ ...respuestas, [id]: val });

  // Limpia las respuestas de preguntas que dejaron de aplicar (la paciente se
  // retractó de una compuerta). Así no queda un dato viejo colgado que reaparezca
  // como opción de "lo que más te molesta".
  useEffect(() => {
    const visibles = new Set(def.preguntas.filter((q) => cumple(q.mostrarSi, respuestas)).map((q) => q.id));
    const sobrantes = Object.keys(respuestas).filter((id) => {
      if (!visibles.has(id)) return true;
      const q = def.preguntas.find(p => p.id === id);
      return q.tipo === 'opcion' && !q.opciones.some(o => o.valor === respuestas[id] && cumple(o.mostrarSi, respuestas));
    });
    if (sobrantes.length) {
      const limpio = { ...respuestas };
      sobrantes.forEach((id) => delete limpio[id]);
      onRespuestas(limpio);
    }
  }, [respuestas, def]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!abierto) {
    return (
      <div className="pf-oferta">
        <div className="pf-oferta-t">{def.titulo}</div>
        <div className="pf-oferta-d">Preguntas opcionales sobre estas molestias.</div>
        <button type="button" className="pf-oferta-btn" onClick={() => setAbierto(true)}>Sí, contestar unas preguntas más</button>
      </div>
    );
  }

  return (
    <div className="pf-bloque">
      <div className="pc-seccion-t">{def.titulo}</div>
      <p className="pc-seccion-d">Entrevista complementaria, no diagnóstico.</p>
      <div className="pc-seccion-d">Contesta con calma. Nada de esto es un diagnóstico; le ayuda a tu doctor a entenderte mejor.</div>
      <div className="pf-preguntas">
        {def.preguntas.filter((q) => cumple(q.mostrarSi, respuestas)).map((q) => (
          <Pregunta key={q.id} q={q} respuestas={respuestas} valor={respuestas[q.id]} onChange={(v) => set(q.id, v)} />
        ))}
      </div>
    </div>
  );
}

function Pregunta({ q, respuestas, valor, onChange }) {
  const opciones = (q.opciones || []).filter((o) => cumple(o.mostrarSi, respuestas));
  return (
    <fieldset className="pf-pregunta">
      <legend className="pf-pregunta-t">{q.texto}</legend>
      {q.ayuda && <div className="pf-pregunta-ayuda">{q.ayuda}</div>}

      {q.tipo === 'opcion' && (
        <div className="pf-opciones">
          {opciones.map((o) => (
            <button
              type="button"
              key={o.valor}
              className={'pf-op' + (valor === o.valor ? ' on' : '')}
              aria-pressed={valor === o.valor}
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
                aria-label={`${q.texto}: ${n} de ${q.max}`}
                aria-pressed={valor === n}
                onClick={() => onChange(n)}
              >{n}</button>
            ))}
          </div>
          <span className="pf-escala-et">{q.etiquetaMax}</span>
        </div>
      )}

      {q.tipo === 'multiple' && (
        <div className="pf-multiple">
          {opciones.map((o) => {
            const marcadas = Array.isArray(valor) ? valor : [];
            const on = marcadas.includes(o.id);
            return (
              <button
                type="button"
                key={o.id}
                className={'pf-check' + (on ? ' on' : '')}
                aria-pressed={on}
                onClick={() => {
                  const esNinguna = /ninguna|ninguno/i.test(o.id);
                  if (esNinguna) {
                    onChange(on ? [] : [o.id]);
                    return;
                  }
                  const sinNinguna = marcadas.filter((x) => !/ninguna|ninguno/i.test(x));
                  onChange(on ? sinNinguna.filter((x) => x !== o.id) : [...sinNinguna, o.id]);
                }}
              >
                <span className="pf-check-caja" aria-hidden="true" />
                <span>{o.etiqueta}</span>
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
