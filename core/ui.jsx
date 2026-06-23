import React from 'react';
import './ui.css';

/** Sección con título numerado, contenedor de campos. */
export function Seccion({ indice, titulo, nota, children }) {
  return (
    <fieldset className="ui-fieldset">
      <legend className="ui-legend">
        {indice && <span className="ui-ix">{indice}</span>}
        {titulo}
        {nota && <span className="ui-legend-nota">{nota}</span>}
      </legend>
      <div className="ui-campos">{children}</div>
    </fieldset>
  );
}

/** Campo numérico controlado. valor null = vacío. */
export function CampoNumero({ etiqueta, unidad, valor, onChange, min, max, step, full, nota }) {
  return (
    <div className={'ui-campo' + (full ? ' full' : '')}>
      <label>{etiqueta} {unidad && <span className="u">({unidad})</span>}</label>
      <input
        type="number" min={min} max={max} step={step}
        value={valor ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
      />
      {nota && <div className="ui-mini">{nota}</div>}
    </div>
  );
}

/** Campo de texto controlado. */
export function CampoTexto({ etiqueta, valor, onChange, placeholder, full }) {
  return (
    <div className={'ui-campo' + (full ? ' full' : '')}>
      <label>{etiqueta}</label>
      <input type="text" value={valor ?? ''} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** Selector controlado. opciones: [{ valor, etiqueta }] */
export function Selector({ etiqueta, valor, onChange, opciones, full }) {
  return (
    <div className={'ui-campo' + (full ? ' full' : '')}>
      <label>{etiqueta}</label>
      <select value={valor} onChange={(e) => onChange(e.target.value)}>
        {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
      </select>
    </div>
  );
}

/** Interruptor No / Sí (tres estados: null, false, true). alerta resalta el "Sí". */
export function ToggleSiNo({ etiqueta, unidad, valor, onChange, full, alerta }) {
  return (
    <div className={'ui-campo' + (full ? ' full' : '')}>
      <label>{etiqueta} {unidad && <span className="u">({unidad})</span>}</label>
      <div className="ui-seg">
        <button className={valor === false ? 'on' : ''} onClick={() => onChange(false)}>No</button>
        <button className={(valor === true ? 'on' : '') + (alerta ? ' alerta' : '')} onClick={() => onChange(true)}>Sí</button>
      </div>
    </div>
  );
}

/** Casilla de verificación con etiqueta. */
export function Casilla({ etiqueta, valor, onChange }) {
  return (
    <label className="ui-check">
      <input type="checkbox" checked={!!valor} onChange={(e) => onChange(e.target.checked)} />
      {etiqueta}
    </label>
  );
}

/** Aviso de apartado en construcción, para instrumentos aún no implementados. */
export function EnConstruccion({ titulo, descripcion, contenido }) {
  return (
    <div className="ui-construccion">
      <div className="ui-construccion-card">
        <div className="ui-construccion-badge">En construcción</div>
        <h2>{titulo}</h2>
        <p>{descripcion}</p>
        {contenido}
      </div>
    </div>
  );
}

/**
 * Puente clínico: sugerencia contextual para continuar en otro instrumento
 * cuando el resultado lo justifica. Lleva el mismo paciente al destino.
 */
export function Puente({ texto, etiqueta, onIr }) {
  return (
    <div className="inst-puente">
      <div className="inst-puente-cuerpo">
        <span className="inst-puente-flecha" aria-hidden="true">↳</span>
        <span className="inst-puente-txt">{texto}</span>
      </div>
      <button className="inst-puente-btn" onClick={onIr}>{etiqueta}</button>
    </div>
  );
}

/**
 * Base de evidencia: bloque plegable con las guías que sustentan el instrumento
 * y la fecha en que se revisó su vigencia. Recibe la entrada de evidencia.js.
 */
export function BaseEvidencia({ evidencia }) {
  const [abierto, setAbierto] = React.useState(false);
  if (!evidencia) return null;
  return (
    <div className="inst-evidencia">
      <button className="inst-evidencia-cab" onClick={() => setAbierto((a) => !a)}>
        <span>Fundamento y vigencia de la evidencia</span>
        <span className="inst-evidencia-icono">{abierto ? '−' : '+'}</span>
      </button>
      {abierto && (
        <div className="inst-evidencia-cuerpo">
          <ul>{evidencia.fuentes.map((f, i) => <li key={i}>{f}</li>)}</ul>
          <div className="inst-evidencia-rev">Vigencia revisada en {evidencia.revisado}. Las recomendaciones se actualizan cuando cambian las guías.</div>
        </div>
      )}
    </div>
  );
}
