import React from 'react';
import { CampoSelect, CampoTexto, EscalaNumerica, GrupoOpciones } from './CamposPreconsulta.jsx';
import { TEMAS_CONSULTA } from '../core/preconsultaFlow.js';
import { PROBLEMAS, PREGUNTA_MOLESTIA, PREGUNTA_TEMA, PREGUNTA_PRIORIDAD, REPETIR_MRS, seguimientoBreve, preguntasDeSeguimiento, temaPrincipal } from '../core/seguimiento.js';

export function MedidaSeguimiento({hc, cambiar, subsecuente=false}) {
  const actual = hc.seguimientoActual || {};
  const temas = TEMAS_CONSULTA.filter(t => hc.temasConsulta?.includes(t.id));
  const tema = temaPrincipal(hc);
  if (!temas.length) return null;
  return <>
    {temas.length > 1 && <CampoSelect id="seguimiento-tema" requerido={subsecuente}
      etiqueta={PREGUNTA_TEMA}
      valor={tema} opciones={temas.map(t=>({valor:t.id,etiqueta:t.etiqueta}))} onChange={v=>cambiar({tema:v,problemaClave:'',molestiaUltimos7Dias:null})}/>}
    {Object.hasOwn(PROBLEMAS, tema) && <CampoSelect id="seguimiento-problema" etiqueta={PREGUNTA_PRIORIDAD}
      valor={actual.problemaClave} opciones={PROBLEMAS[tema]} onChange={v=>cambiar({problemaClave:v,molestiaUltimos7Dias:null})}/>}
    {tema && <EscalaNumerica id="seguimiento-intensidad" etiqueta={PREGUNTA_MOLESTIA}
      etiquetaMin="Nada" etiquetaMax="Lo máximo imaginable" valor={actual.molestiaUltimos7Dias}
      onChange={n=>cambiar({molestiaUltimos7Dias:n})}/>}
  </>;
}
export default function Seguimiento({hc,cambiar,irAMotivos}) {
  const s=hc.seguimientoActual || {};
  return <>
    <p className="pc-paso-intro">Hoy revisaremos cómo sigues con el problema que escribiste: <strong>{hc.motivo}</strong>.</p>
    <MedidaSeguimiento hc={hc} cambiar={cambiar} subsecuente/>
    {preguntasDeSeguimiento(s).map(q=>q.opciones
      ? <GrupoOpciones key={q.id} id={'seguimiento-'+q.id} etiqueta={q.pregunta} requerido={!!q.requerida}
          opciones={q.opciones} valor={s[q.id]} onChange={v=>cambiar(q.id==='nuevosSintomas' && v!=='si' ? {nuevosSintomas:v,detalleNuevo:''} : {[q.id]:v})}/>
      : <CampoTexto key={q.id} id={'seguimiento-'+q.id} etiqueta={q.pregunta} placeholder={q.ejemplo} area maxLength={3000}
          valor={s[q.id]} onChange={v=>cambiar({[q.id]:v})}/>)}
    {hc.temasConsulta?.includes('climaterio') && seguimientoBreve(hc) &&
      <label className="pc-consent"><input type="checkbox" checked={s.repetirMrs===true}
        onChange={e=>cambiar({repetirMrs:e.target.checked})}/><span>{REPETIR_MRS}</span></label>}
    {s.nuevosSintomas==='si' ? <button type="button" className="pc-anterior" onClick={irAMotivos}>Agregar el tema de la molestia nueva</button>
      : <label className="pc-consent"><input type="checkbox" checked={s.ampliar===true}
          onChange={e=>cambiar({ampliar:e.target.checked})}/><span>Quiero volver a contestar las preguntas completas de mis temas.</span></label>}
  </>;
}
