import React, { useMemo, useState, useEffect } from 'react';
import { usePaciente, useInstrumento } from '../../core/PacienteContext.jsx';
import { evaluarMama } from './engine.js';
import { imprimirHoja } from '../../core/printSheet.js';
import { imprimirHojaClinica } from '../../core/hojaClinica.js';
import { Seccion, CampoNumero, CampoTexto, Casilla, BaseEvidencia } from '../../core/ui.jsx';
import { evidenciaDe } from '../../core/evidencia.js';
import '../../core/instrumentLayout.css';
import './Mama.css';

const PERSONALES = [
  ['hiperplasiaAtipica', 'Hiperplasia atípica (ductal o lobulillar) en biopsia'],
  ['carcinomaLobulillarInSitu', 'Carcinoma lobulillar in situ'],
  ['radiacionTorax', 'Radioterapia torácica entre los diez y los treinta años'],
  ['densidadAlta', 'Mama densa en la mastografía'],
  ['biopsiaPreviaSinAtipia', 'Biopsia previa sin atipia'],
];
const GENETICO = [
  ['mutacionConocida', 'Portadora de variante patogénica (BRCA1, BRCA2 u otra)'],
  ['familiarPortador', 'Familiar de primer grado portador, sin estudio propio'],
  ['ascendenciaAskenazi', 'Ascendencia judía askenazí'],
];
const FAMILIAR = [
  ['familiarMama2oMas', 'Dos o más familiares con cáncer de mama'],
  ['familiarMamaMenor50', 'Familiar de primer grado con cáncer de mama antes de los cincuenta'],
  ['familiarOvario', 'Familiar con cáncer de ovario'],
  ['familiarMamaHombre', 'Cáncer de mama en un familiar hombre'],
  ['familiarTripleNegativo', 'Familiar con cáncer de mama triple negativo antes de los sesenta'],
  ['multiplesCanceres', 'Tres o más familiares con cánceres asociados'],
];
const REPRODUCTIVO = [
  ['menarcaTemprana', 'Menarca antes de los doce años'],
  ['nuliparaTardia', 'Nuliparidad o primer parto después de los treinta'],
  ['menopausiaTardia', 'Menopausia después de los cincuenta y cinco'],
];

const SEV_PILL = { ok: 'ok', aviso: 'aviso', alerta: 'alerta' };

export default function Mama() {
  const { paciente, actualizar, publicarResumen } = usePaciente();
  const dem = paciente.demografia;

  const [d, setD] = useInstrumento('mama', () => ({}));
  const set = (k, val) => setD((p) => ({ ...p, [k]: val }));
  const setDem = (c, val) => actualizar('demografia', c, val);

  const r = useMemo(() => evaluarMama(paciente, d), [paciente, d]);

  useEffect(() => {
    const evaluado = Object.values(d).some((x) => x === true);
    publicarResumen('mama', {
      evaluado,
      estado: r.estado,
      titular: r.etiqueta,
      detalle: r.genetica.length > 0 ? 'Derivar a consejo genético' : (r.categoria === 'alto' ? 'Resonancia añadida a la mastografía' : ''),
    });
  }, [r, publicarResumen]);

  const grupo = (titulo, indice, campos) => (
    <Seccion indice={indice} titulo={titulo}>
      <div className="mama-checks">
        {campos.map(([k, etq]) => <Casilla key={k} etiqueta={etq} valor={!!d[k]} onChange={(val) => set(k, val)} />)}
      </div>
    </Seccion>
  );

  return (
    <div className="inst">
      <header className="inst-cab">
        <div>
          <div className="inst-eyebrow">Instrumento de evaluación · Estratificación de riesgo</div>
          <h1>Riesgo de cáncer de mama<small>estratificación, tamizaje y derivación</small></h1>
        </div>
        <div className="inst-mono">IJ</div>
      </header>

      <div className="inst-grid">
        {/* -------- FORMULARIO -------- */}
        <div className="inst-form">
          <Seccion indice="I" titulo="Paciente">
            <CampoTexto etiqueta="Nombre de la paciente" full valor={dem.nombre} onChange={(v) => setDem('nombre', v)} placeholder="Para identificar la hoja impresa" />
            <CampoNumero etiqueta="Edad" unidad="años" valor={dem.edad} onChange={(v) => setDem('edad', v)} min={18} max={90} />
          </Seccion>
          {grupo('Antecedentes personales', 'II', PERSONALES)}
          {grupo('Genético', 'III', GENETICO)}
          {grupo('Historia familiar', 'IV', FAMILIAR)}
          {grupo('Factores reproductivos', 'V', REPRODUCTIVO)}
        </div>

        {/* -------- RESULTADOS -------- */}
        <div className="inst-res">
          <button className="inst-btn imprimir" onClick={() => imprimirHoja(r.hojaPaciente)}>Imprimir hoja para la paciente</button>
          <button className="inst-btn imprimir" onClick={() => imprimirHojaClinica('mama', r, paciente)}>Imprimir hoja clínica</button>

          <div className="inst-bloque">
            <h3>Estratificación</h3>
            <div className={'inst-pill ' + (SEV_PILL[r.estado] || '')}>{r.etiqueta}</div>
          </div>

          {r.altoRiesgo.length > 0 && (
            <div className="inst-bloque">
              <h3>Criterios de alto riesgo</h3>
              {r.altoRiesgo.map((x, i) => <div className="mama-alerta" key={i}>{x}</div>)}
            </div>
          )}

          {r.histFamiliar.length > 0 && (
            <div className="inst-bloque">
              <h3>Historia familiar a cuantificar</h3>
              <ul className="mama-lista">{r.histFamiliar.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}

          <div className="inst-bloque">
            <h3>Conducta de tamizaje</h3>
            <ul className="mama-lista">{r.tamizaje.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>

          {r.genetica.length > 0 && (
            <div className="inst-bloque">
              <h3>Derivación a consejo genético</h3>
              <div className="mama-genetica">Cumple criterios de derivación:</div>
              <ul className="mama-lista">{r.genetica.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}

          <div className="inst-bloque">
            <h3>Prevención</h3>
            <ul className="mama-lista">{r.prevencion.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>

          {r.moduladores.length > 0 && (
            <div className="inst-bloque">
              <h3>Factores que elevan el riesgo basal</h3>
              <ul className="mama-lista tenue">{r.moduladores.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}

          <BaseEvidencia evidencia={evidenciaDe('mama')} />

          <div className="inst-disclaimer">
            Instrumento de apoyo a la decisión por criterios de guía. No calcula el porcentaje de riesgo: la decisión de resonancia magnética de tamizaje, con umbral habitual de riesgo de por vida del veinte por ciento, o de quimioprevención, exige correr un modelo cuantitativo, el de Tyrer y Cuzick para el riesgo de por vida o, en su caso, el de Gail. Este instrumento identifica a quién enviar a estimarlo; no lo reemplaza. La conducta se individualiza.
          </div>
        </div>
      </div>
    </div>
  );
}
