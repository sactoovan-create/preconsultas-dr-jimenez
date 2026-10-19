import React from 'react';
import { Phone } from 'lucide-react';
import * as phq9 from '../core/cuestionarios/phq9.js';
import * as csi from '../core/cuestionarios/csi.js';
import './CuestionariosValidados.css';

/**
 * Cuestionarios validados de la preconsulta (PHQ-9 y CSI-Sp). El texto de reactivos y
 * opciones se muestra exactamente como en la versión validada (ver core/cuestionarios).
 * La paciente nunca ve puntajes ni etiquetas de severidad.
 */

/** Recursos de crisis verificados el 19/10/2026: 911 y Línea de la Vida (CONASAMA). */
export const LINEA_DE_LA_VIDA = { numero: '800 911 2000', tel: 'tel:8009112000' };

export function AvisoCrisisPhq9({ final = false }) {
  return (
    <div className="cv-crisis" role={final ? 'note' : 'alert'} data-prueba="aviso-crisis-phq9">
      <b>Gracias por contarnos cómo te sientes. Tu seguridad es lo primero.</b>
      <p>Si estás en peligro o piensas hacerte daño ahora, llama al 911 o acude al servicio de urgencias más cercano.</p>
      <p>Si quieres hablar con alguien ya, la Línea de la Vida te atiende gratis las 24 horas, los 365 días del año: <a href={LINEA_DE_LA_VIDA.tel}>{LINEA_DE_LA_VIDA.numero}</a>.</p>
      <div className="cv-crisis-botones">
        <a className="cv-crisis-boton" href="tel:911"><Phone aria-hidden="true" />Llamar al 911</a>
        <a className="cv-crisis-boton" href={LINEA_DE_LA_VIDA.tel}><Phone aria-hidden="true" />Llamar a la Línea de la Vida</a>
      </div>
      <p>
        {final
          ? 'Tu médico será avisado: tu respuesta quedó marcada como prioritaria.'
          : 'Tu médico será avisado: al enviar, tu respuesta llegará marcada como prioritaria.'}
        {' '}Este cuestionario no se revisa en tiempo real; si necesitas ayuda ahora, no esperes a que el consultorio lo lea.
      </p>
      <p>No te quedes sola: busca a alguien de confianza y aleja medicamentos u objetos con los que pudieras lastimarte.</p>
      {!final && <p>Puedes seguir contestando y enviar tu cuestionario.</p>}
    </div>
  );
}

function Opciones({ id, legend, numero, opciones, valor, onChange }) {
  return (
    <fieldset className="cv-item" id={id}>
      <legend>{numero != null && <span className="cv-num">{numero}.</span>}{legend}</legend>
      <div className="cv-opciones" style={{ '--cv-columnas': opciones.length }}>
        {opciones.map((o) => (
          <button
            type="button"
            key={String(o.valor)}
            className={valor === o.valor ? 'on' : ''}
            aria-pressed={valor === o.valor}
            aria-label={`${numero != null ? `Pregunta ${numero}` : legend}: ${o.etiqueta}`}
            onClick={() => onChange(o.valor)}
          >{o.etiqueta}</button>
        ))}
      </div>
    </fieldset>
  );
}

function Phq9({ respuestas, onRespuesta }) {
  const positivo = phq9.valorItem(respuestas.item9) > 0;
  return (
    <>
      <p className="pc-paso-intro">Estas preguntas sobre tu estado de ánimo se hacen a todas las pacientes. Están escritas tal como aparecen en el cuestionario oficial, por eso te hablan de usted.</p>
      <div className="cv-cuestionario" aria-labelledby="cv-phq9-titulo">
        <p className="cv-encabezado" id="cv-phq9-titulo">{phq9.ENCABEZADO}</p>
        <p className="cv-instruccion">{phq9.INSTRUCCION}</p>
        <p className="cv-instruccion-formato">{phq9.INSTRUCCION_FORMATO}</p>
        {phq9.ITEMS.map((it) => (
          <React.Fragment key={it.id}>
            <Opciones
              id={`cv-phq9-${it.id}`}
              numero={it.numero}
              legend={it.texto}
              opciones={phq9.OPCIONES}
              valor={respuestas[it.id]}
              onChange={(v) => onRespuesta(it.id, v)}
            />
            {it.id === 'item9' && positivo && <AvisoCrisisPhq9 />}
          </React.Fragment>
        ))}
        <Opciones
          id="cv-phq9-dificultad"
          legend={phq9.DIFICULTAD.texto}
          opciones={phq9.DIFICULTAD.opciones}
          valor={respuestas.dificultad}
          onChange={(v) => onRespuesta('dificultad', v)}
        />
        <p className="cv-credito">{phq9.CREDITO}</p>
      </div>
    </>
  );
}

function Csi({ respuestas, onRespuesta }) {
  const anioActual = new Date().getFullYear();
  return (
    <>
      <p className="pc-paso-intro">Como nos contaste que tienes dolor, te pedimos este cuestionario validado. Está escrito tal como aparece en la versión publicada en español, por eso te habla de usted.</p>
      <div className="cv-cuestionario" aria-labelledby="cv-csi-titulo">
        <p className="cv-encabezado" id="cv-csi-titulo">{csi.ENCABEZADO}</p>
        <h2 className="cv-parte">{csi.PARTE_A_TITULO}</h2>
        <p className="cv-instruccion">{csi.PARTE_A_INSTRUCCION}</p>
        {csi.ITEMS_A.map((it) => (
          <Opciones
            key={it.id}
            id={`cv-csi-${it.id}`}
            numero={it.numero}
            legend={it.texto}
            opciones={csi.OPCIONES}
            valor={respuestas[it.id]}
            onChange={(v) => onRespuesta(it.id, v)}
          />
        ))}
        <h2 className="cv-parte">{csi.PARTE_B_TITULO}</h2>
        <p className="cv-instruccion">{csi.PARTE_B_PREGUNTA}</p>
        <p className="cv-instruccion-formato">{csi.PARTE_B_INSTRUCCION}</p>
        {csi.ITEMS_B.map((it) => (
          <div className="cv-item-b" key={it.id}>
            <Opciones
              id={`cv-csi-${it.id}`}
              numero={it.numero}
              legend={it.texto}
              opciones={csi.OPCIONES_B}
              valor={respuestas[it.id]}
              onChange={(v) => onRespuesta(it.id, v, v === 'no' ? { [it.anioId]: undefined } : null)}
            />
            {respuestas[it.id] === 'si' && (
              <label className="cv-anio">
                <span>{csi.ETIQUETA_ANIO}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1900}
                  max={anioActual}
                  value={respuestas[it.anioId] ?? ''}
                  aria-label={`${csi.ETIQUETA_ANIO}: ${it.texto}`}
                  onChange={(e) => {
                    const n = e.target.value === '' ? undefined : Number(e.target.value);
                    onRespuesta(it.anioId, Number.isInteger(n) ? n : undefined);
                  }}
                />
              </label>
            )}
          </div>
        ))}
        <p className="cv-credito">
          {csi.ATRIBUCION} <a href={csi.LICENCIA_URL} target="_blank" rel="noopener noreferrer">{csi.LICENCIA_URL}</a>. {csi.CAMBIOS}
        </p>
      </div>
    </>
  );
}

/**
 * `valor` = { version, respuestas }. `onChange(nuevoValor)` recibe el objeto completo.
 */
export default function CuestionarioValidado({ clave, valor, onChange }) {
  const respuestas = (valor && valor.respuestas) || {};
  const version = clave === 'phq9' ? phq9.VERSION : csi.VERSION;
  const onRespuesta = (id, v, extra = null) => {
    const siguiente = { ...respuestas, [id]: v, ...(extra || {}) };
    Object.keys(siguiente).forEach((k) => { if (siguiente[k] === undefined) delete siguiente[k]; });
    onChange({ version, respuestas: siguiente });
  };
  if (clave === 'phq9') return <Phq9 respuestas={respuestas} onRespuesta={onRespuesta} />;
  if (clave === 'csi') return <Csi respuestas={respuestas} onRespuesta={onRespuesta} />;
  return null;
}
