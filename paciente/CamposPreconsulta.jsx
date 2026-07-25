import React from 'react';
import { alternarOpcion } from '../core/preconsultaFlow.js';

export function CampoTexto({
  etiqueta, valor, onChange, placeholder, area = false, tipo = 'text',
  requerido = false, ayuda, id,
}) {
  const inputId = id || undefined;
  return (
    <label className="pc-campo pc-full" htmlFor={inputId}>
      <span>{etiqueta}{requerido && <b className="pc-requerido"> *</b>}</span>
      {ayuda && <small>{ayuda}</small>}
      {area ? (
        <textarea
          id={inputId}
          rows={4}
          value={valor || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          id={inputId}
          type={tipo}
          value={valor ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}

export function CampoNumero({
  etiqueta, valor, onChange, min = 0, max, placeholder, requerido = false, id,
}) {
  return (
    <label className="pc-campo" htmlFor={id}>
      <span>{etiqueta}{requerido && <b className="pc-requerido"> *</b>}</span>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        value={valor ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        placeholder={placeholder}
      />
    </label>
  );
}

export function GrupoOpciones({
  etiqueta, ayuda, opciones, valor, onChange, requerido = false, compacto = false, id,
}) {
  return (
    <fieldset className={'pc-grupo' + (compacto ? ' compacto' : '')} id={id}>
      <legend>{etiqueta}{requerido && <b className="pc-requerido"> *</b>}</legend>
      {ayuda && <p className="pc-grupo-ayuda">{ayuda}</p>}
      <div className="pc-opciones-lista">
        {opciones.map((opcion) => (
          <button
            type="button"
            key={opcion.valor}
            className={'pc-eleccion' + (valor === opcion.valor ? ' on' : '')}
            aria-pressed={valor === opcion.valor}
            onClick={() => onChange(opcion.valor)}
          >
            <span className="pc-eleccion-marca" aria-hidden="true" />
            <span>
              <b>{opcion.etiqueta}</b>
              {opcion.ayuda && <small>{opcion.ayuda}</small>}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function GrupoMultiple({
  etiqueta, ayuda, opciones, valor, onChange, requerido = false,
  exclusiva = 'ninguna', id,
}) {
  const elegidas = Array.isArray(valor) ? valor : [];
  return (
    <fieldset className="pc-grupo" id={id}>
      <legend>{etiqueta}{requerido && <b className="pc-requerido"> *</b>}</legend>
      {ayuda && <p className="pc-grupo-ayuda">{ayuda}</p>}
      <div className="pc-multiple-lista">
        {opciones.map((opcion) => {
          const activa = elegidas.includes(opcion.id);
          return (
            <button
              type="button"
              key={opcion.id}
              className={'pc-eleccion multiple' + (activa ? ' on' : '')}
              aria-pressed={activa}
              onClick={() => onChange(alternarOpcion(elegidas, opcion.id, exclusiva))}
            >
              <span className="pc-check-marca" aria-hidden="true" />
              <span>
                <b>{opcion.etiqueta}</b>
                {opcion.ayuda && <small>{opcion.ayuda}</small>}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function EscalaNumerica({
  etiqueta, valor, onChange, min = 0, max = 10,
  etiquetaMin = 'Nada', etiquetaMax = 'Máximo', id,
}) {
  const numeros = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <fieldset className="pc-grupo pc-escala-num" id={id}>
      <legend>{etiqueta}</legend>
      <div className="pc-escala-extremos"><span>{etiquetaMin}</span><span>{etiquetaMax}</span></div>
      <select
        className="pc-escala-select"
        aria-label={etiqueta}
        value={valor ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      >
        <option value="">Selecciona una intensidad</option>
        {numeros.map((n) => (
          <option key={n} value={n}>{n} de {max}{n === min ? ` · ${etiquetaMin}` : ''}{n === max ? ` · ${etiquetaMax}` : ''}</option>
        ))}
      </select>
      <div className="pc-escala-numeros">
        {numeros.map((n) => (
          <button
            type="button"
            key={n}
            className={valor === n ? 'on' : ''}
            aria-label={`${n} de ${max}`}
            aria-pressed={valor === n}
            onClick={() => onChange(n)}
          >{n}</button>
        ))}
      </div>
    </fieldset>
  );
}
