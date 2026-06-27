import React, { useMemo, useState, useEffect } from 'react';
import { usePaciente } from '../../core/PacienteContext.jsx';
import { evaluarOsea } from './engine.js';
import { imprimirHoja } from '../../core/printSheet.js';
import { imprimirHojaClinica } from '../../core/hojaClinica.js';
import { Seccion, CampoNumero, CampoTexto, ToggleSiNo, Casilla, Puente, BaseEvidencia } from '../../core/ui.jsx';
import { evidenciaDe } from '../../core/evidencia.js';
import '../../core/instrumentLayout.css';
import './Osea.css';

const FACTORES = [
  ['fracturaCaderaVertebra', 'Fractura por fragilidad de cadera o vértebra'],
  ['fracturaFragilidad', 'Otra fractura por fragilidad previa'],
  ['fracturaParental', 'Fractura de cadera en un progenitor'],
  ['tabaquismo', 'Tabaquismo activo'],
  ['glucocorticoides', 'Glucocorticoides por tres meses o más'],
  ['artritisReumatoide', 'Artritis reumatoide'],
  ['osteoporosisSecundaria', 'Causa de osteoporosis secundaria'],
  ['alcohol', 'Alcohol, tres unidades o más al día'],
];

const SEV_PILL = { ok: 'ok', aviso: 'aviso', alerta: 'alerta' };

export default function Osea() {
  const { paciente, actualizar, publicarResumen, irA } = usePaciente();
  const dem = paciente.demografia, sig = paciente.signos;

  const [d, setD] = useState({ tieneDensitometria: false, tScore: null, posmenopausica: false });
  const set = (k, val) => setD((p) => ({ ...p, [k]: val }));
  const setDem = (c, val) => actualizar('demografia', c, val);
  const setSig = (c, val) => actualizar('signos', c, val);

  const r = useMemo(() => evaluarOsea(paciente, d), [paciente, d]);

  useEffect(() => {
    const evaluado = d.tieneDensitometria || r.factores.length > 0 || r.cribado.indica;
    let detalle = '';
    if (r.tratamiento.indica === true) detalle = 'Tratamiento indicado';
    else if (r.tratamiento.indica === 'condicional') detalle = 'Calcular FRAX';
    publicarResumen('osea', {
      evaluado,
      estado: r.dx ? r.dx.estado : (r.cribado.indica ? 'aviso' : 'ok'),
      titular: r.dx ? r.dx.etiqueta : (r.cribado.indica ? 'Densitometría indicada' : 'Salud ósea'),
      detalle,
      metrica: (d.tieneDensitometria && d.tScore !== null && d.tScore !== undefined) ? { clave: 'tscore', nombre: 'Puntaje T', valor: d.tScore, unidad: 'desviaciones estándar', min: -4, max: 0, mejorAbajo: false } : null,
    });
  }, [r, d.tieneDensitometria, publicarResumen]);

  return (
    <div className="inst">
      <header className="inst-cab">
        <div>
          <div className="inst-eyebrow">Instrumento de evaluación · Salud ósea</div>
          <h1>Salud ósea<small>cribado, diagnóstico densitométrico e indicación de tratamiento</small></h1>
        </div>
        <div className="inst-mono">IJ</div>
      </header>

      <div className="inst-grid">
        {/* -------- FORMULARIO -------- */}
        <div className="inst-form">
          <Seccion indice="I" titulo="Paciente" nota="El peso y la talla calculan el índice de masa corporal">
            <CampoTexto etiqueta="Nombre de la paciente" full valor={dem.nombre} onChange={(v) => setDem('nombre', v)} placeholder="Para identificar la hoja impresa" />
            <CampoNumero etiqueta="Edad" unidad="años" valor={dem.edad} onChange={(v) => setDem('edad', v)} min={18} max={100} />
            <CampoNumero etiqueta="Peso" unidad="kilogramos" valor={sig.peso} onChange={(v) => setSig('peso', v)} />
            <CampoNumero etiqueta="Talla" unidad="centímetros" valor={sig.talla} onChange={(v) => setSig('talla', v)} />
            <CampoNumero etiqueta="Edad de la menopausia" unidad="años" valor={dem.edadMenopausia} onChange={(v) => setDem('edadMenopausia', v)} min={20} max={60} />
            <ToggleSiNo etiqueta="Posmenopáusica" valor={d.posmenopausica} onChange={(v) => set('posmenopausica', v)} />
          </Seccion>

          <Seccion indice="II" titulo="Densitometría" nota="Puntaje T del cuello femoral, cadera total o columna">
            <ToggleSiNo etiqueta="¿Cuenta con densitometría?" valor={d.tieneDensitometria} onChange={(v) => set('tieneDensitometria', v)} />
            {d.tieneDensitometria && (
              <CampoNumero etiqueta="Puntaje T más bajo" unidad="desviaciones estándar" valor={d.tScore} onChange={(v) => set('tScore', v)} min={-5} max={2} step={0.1} />
            )}
          </Seccion>

          <Seccion indice="III" titulo="Factores de riesgo">
            <div className="osea-checks">
              {FACTORES.map(([k, etq]) => <Casilla key={k} etiqueta={etq} valor={!!d[k]} onChange={(val) => set(k, val)} />)}
            </div>
          </Seccion>
        </div>

        {/* -------- RESULTADOS -------- */}
        <div className="inst-res">
          <button className="inst-btn imprimir" onClick={() => imprimirHoja(r.hojaPaciente)}>Imprimir hoja para la paciente</button>
          <button className="inst-btn imprimir" onClick={() => imprimirHojaClinica('osea', r, paciente)}>Imprimir hoja clínica</button>

          {r.dx && (
            <div className="inst-bloque">
              <h3>Diagnóstico densitométrico</h3>
              <div className={'inst-pill ' + (SEV_PILL[r.dx.estado] || '')}>{r.dx.etiqueta}</div>
            </div>
          )}

          {!d.tieneDensitometria && (
            <div className="inst-bloque">
              <h3>Cribado</h3>
              <div className={'inst-pill ' + (r.cribado.indica ? 'aviso' : 'ok')}>{r.cribado.indica ? 'Densitometría indicada' : 'Densitometría no prioritaria'}</div>
              <p className="osea-detalle">{r.cribado.motivo}</p>
            </div>
          )}

          <div className="inst-bloque">
            <h3>Indicación de tratamiento</h3>
            <div className={'inst-pill ' + (r.tratamiento.indica === true ? 'alerta' : (r.tratamiento.indica === 'condicional' ? 'aviso' : 'ok'))}>
              {r.tratamiento.indica === true ? 'Indicado' : (r.tratamiento.indica === 'condicional' ? 'Según FRAX' : 'No indicado')}
            </div>
            <p className="osea-detalle">{r.tratamiento.base}</p>
          </div>

          {r.factores.length > 0 && (
            <div className="inst-bloque">
              <h3>Factores de riesgo presentes</h3>
              <div className="osea-chips">{r.factores.map((f, i) => <span className="osea-chip" key={i}>{f}</span>)}</div>
            </div>
          )}

          <div className="inst-bloque">
            <h3>Medidas de salud ósea</h3>
            <ul className="osea-lista">{r.orientacion.map((o, i) => <li key={i}>{o}</li>)}</ul>
          </div>

          {(d.posmenopausica || r.factores.some((f) => /precoz/.test(f))) && (
            <Puente texto="En la transición y la menopausia precoz, la salud ósea es parte del manejo; conviene valorar síntomas y terapia." etiqueta="Evaluar menopausia" onIr={() => irA('menopausia')} />
          )}

          <BaseEvidencia evidencia={evidenciaDe('osea')} />

          <div className="inst-disclaimer">
            Instrumento de apoyo a la decisión por criterios de guía. No reproduce el porcentaje del Fracture Risk Assessment Tool, que se calibra por país; en la zona de osteopenia, remite a calcularlo. La conducta se individualiza.
          </div>
        </div>
      </div>
    </div>
  );
}
