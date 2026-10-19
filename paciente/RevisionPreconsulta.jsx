import React from 'react';
import { Pencil } from 'lucide-react';
import { preguntasEntrevista, tieneRespuesta, valorEntrevista } from '../core/entrevista.js';
import { TEMAS_CONSULTA, validarPaso } from '../core/preconsultaFlow.js';
import { formatearDomicilio } from '../core/domicilio.js';
import { MODULOS } from '../core/profundos/index.js';
import { MRS_ITEMS } from '../instruments/menopausia/engine.js';
import * as phq9 from '../core/cuestionarios/phq9.js';
import * as csi from '../core/cuestionarios/csi.js';

/** Filas de revisión de un cuestionario validado: solo lo contestado, sin puntajes. */
function filasCuestionario(clave, respuestas = {}) {
  const etiqueta = (opciones, v) => opciones.find(o => o.valor === v)?.etiqueta;
  if (clave === 'phq9') {
    return [...phq9.ITEMS, phq9.DIFICULTAD]
      .filter(q => respuestas[q.id] != null)
      .map(q => [q.numero ? `${q.numero}. ${q.texto}` : q.texto, etiqueta(q.opciones || phq9.OPCIONES, respuestas[q.id])]);
  }
  if (clave === 'csi') {
    const a = csi.ITEMS_A.filter(q => respuestas[q.id] != null).map(q => [`${q.numero}. ${q.texto}`, etiqueta(csi.OPCIONES, respuestas[q.id])]);
    const b = csi.ITEMS_B.filter(q => respuestas[q.id] != null).map(q => [`Parte B ${q.numero}. ${q.texto}`, etiqueta(csi.OPCIONES_B, respuestas[q.id]) + (respuestas[q.anioId] ? ` (${respuestas[q.anioId]})` : '')]);
    return [...a, ...b];
  }
  return [];
}
const TOTAL_REACTIVOS = { phq9: phq9.ITEMS.length, csi: csi.ITEMS_A.length };

const campos = {
  contexto: [['etapaReproductiva', 'Situación menstrual'], ['ultimaMenstruacion', 'Última menstruación'], ['anticonceptivo', 'Anticonceptivo o tratamiento hormonal']],
  seguridad: [['senalesUrgencia', 'Señales actuales']],
  sangrado: [['sangradoTipos', 'Tipo de sangrado'], ['sangradoAhora', 'Sangrado hoy'], ['sangradoDesde', 'Desde cuándo'], ['sangradoDuracionDias', 'Duración en días']],
  ciclos: [['reglasRegulares', 'Regularidad'], ['diasEntreReglas', 'Días entre menstruaciones'], ['cambiosAndrogenicos', 'Cambios observados']],
  urinario: [['sintomasUrinarios', 'Síntomas'], ['urinarioDetalle', 'Detalle']],
  intimidad: [['molestiasIntimas', 'Motivo']],
  mama: [['sintomasMama', 'Síntomas'], ['mamaDetalle', 'Lado y evolución']],
  'plan-reproductivo': [['objetivoReproductivo', 'Objetivo'], ['mesesBuscandoEmbarazo', 'Meses de búsqueda']],
  antecedentes: [['antecedentesSeleccionados', 'Antecedentes declarados']],
  historia: [['embarazos', 'Embarazos previos'], ['partos', 'Partos'], ['cesareas', 'Cesáreas'], ['abortos', 'Pérdidas'], ['cirugias', 'Cirugías'], ['medicamentos', 'Medicamentos'], ['alergias', 'Alergias'], ['tabacoEstado', 'Tabaco']],
  prevencion: [['tieneCuelloUterino', 'Conservas el cuello uterino'], ['ultimoPapFecha', 'Última prueba cervical'], ['ultimoPapResultado', 'Resultado cervical'], ['ultimaMastografiaFecha', 'Mastografía'], ['ultimaMastografiaResultado', 'Resultado de mama'], ['cancerFamiliarTipos', 'Cáncer en familiares'], ['cancerFamiliarDetalle', 'Detalle familiar']],
};
const etiquetas = { sin_regla_12m: '12 meses o más sin menstruación; causa por confirmar', menopausia: '12 meses o más sin menstruación', no_se: 'No sé', ninguna: 'Ninguna', prefiero_no: 'Prefiero comentarlo en consulta', menstrua_regular: 'Menstruaciones regulares', menstrua_irregular: 'Menstruaciones irregulares', sin_regla_menos_12m: 'Menos de 12 meses sin menstruar', histerectomia: 'Histerectomía' };
function formato(v) {
  if (Array.isArray(v)) return v.map(formato).join(', ');
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  return etiquetas[v] || String(v).replaceAll('_', ' ');
}

export default function RevisionPreconsulta({ dem, hc, mrs, dolor, profundos, cuestionarios = {}, pasos, irPaso }) {
  return <div className="pc-revision" aria-label="Revisión de respuestas">
    {pasos.filter(p => p.id !== 'envio').map(p => {
      let filas = (campos[p.id] || []).filter(([k]) => tieneRespuesta(hc[k])).map(([k, label]) => [label, formato(hc[k])]);
      if (p.id === 'inicio') filas = [['Nombre', dem.nombre], ['Edad', dem.edad], ['Teléfono', hc.telefono], ['Correo', hc.correo], ['Domicilio (INE)', formatearDomicilio(hc)]].filter(([,v]) => tieneRespuesta(v));
      if (p.id === 'motivo') filas = [['Motivo', hc.motivo], ['Temas', (hc.temasConsulta || []).map(id => TEMAS_CONSULTA.find(t => t.id === id)?.etiqueta || id).join(', ')]];
      if (p.id === 'dolor') filas = Object.entries(dolor).filter(([,v]) => tieneRespuesta(v)).map(([k,v]) => [formato(k), formato(v)]);
      if (p.id === 'climaterio') filas = MRS_ITEMS.filter(q => mrs[q.id] != null).map(q => [q.texto, `${mrs[q.id]} de 4`]);
      if (p.profundoId) filas = (MODULOS.find(m => m.ID === p.profundoId)?.PREGUNTAS || []).filter(q => tieneRespuesta(profundos[p.profundoId]?.[q.id])).map(q => {
        const v = profundos[p.profundoId][q.id];
        const label = x => q.opciones?.find(o => o.id === x || o.valor === x)?.etiqueta || formato(x);
        return [q.texto, Array.isArray(v) ? v.map(label).join(', ') : label(v)];
      });
      if (p.cuestionarioId) filas = filasCuestionario(p.cuestionarioId, cuestionarios[p.cuestionarioId]?.respuestas);
      filas.push(...preguntasEntrevista(p.id, hc).filter(q => tieneRespuesta(hc[q.id])).map(q => [q.etiqueta, valorEntrevista(q, hc[q.id])]));
      const valido = validarPaso(p.id, { demografia: dem, hc, mrs, dolor }).ok;
      const respuestasCuestionario = p.cuestionarioId ? (cuestionarios[p.cuestionarioId]?.respuestas || {}) : null;
      const faltanCuestionario = p.cuestionarioId
        ? (p.cuestionarioId === 'phq9' ? phq9.ITEMS : csi.ITEMS_A).filter(q => respuestasCuestionario[q.id] == null).length
        : 0;
      return <details key={p.id} className="pc-revision-seccion">
        <summary><span>{p.titulo}</span><small>{!valido ? 'Falta completar' : faltanCuestionario ? `${TOTAL_REACTIVOS[p.cuestionarioId] - faltanCuestionario} de ${TOTAL_REACTIVOS[p.cuestionarioId]} contestadas` : filas.length ? `${filas.length} ${filas.length === 1 ? 'dato' : 'datos'} para revisar` : 'Sin respuesta opcional'}</small></summary>
        <div className="pc-revision-contenido">
          {filas.length ? <dl>{filas.map(([k,v], i) => <div key={`${k}-${i}`}><dt>{k}</dt><dd>{v}</dd></div>)}</dl> : <p>No agregaste información en esta sección.</p>}
          <button type="button" className="pc-editar" onClick={() => irPaso(p.id)}><Pencil size={16} aria-hidden="true" />Editar {p.titulo.toLowerCase()}</button>
        </div>
      </details>;
    })}
  </div>;
}
