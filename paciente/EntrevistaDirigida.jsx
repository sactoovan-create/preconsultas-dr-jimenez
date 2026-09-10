import React from 'react';
import { preguntasEntrevista } from '../core/entrevista.js';
import { CampoTexto, CampoNumero, GrupoMultiple, GrupoOpciones } from './CamposPreconsulta.jsx';

export default function EntrevistaDirigida({ paso, hc, onChange }) {
  return preguntasEntrevista(paso, hc).map(q => {
    const props = { id: q.id, etiqueta: q.etiqueta, valor: hc[q.id], onChange: v => onChange(q.id, v) };
    if (q.tipo === 'numero') return <CampoNumero key={q.id} {...props} min={q.min} max={q.max} placeholder="Si lo recuerdas" />;
    if (q.tipo === 'multiple') return <GrupoMultiple key={q.id} {...props} opciones={q.opciones} exclusiva={q.opciones.some(o => o.id === 'ninguna') ? 'ninguna' : 'no_se'} />;
    if (q.tipo === 'opcion') return <GrupoOpciones key={q.id} {...props} opciones={q.opciones} />;
    return <CampoTexto key={q.id} {...props} area={q.id !== 'cervicalFecha'} placeholder={q.placeholder} />;
  });
}
