import React, { useMemo, useState, useEffect } from 'react';
import { usePaciente } from '../../core/PacienteContext.jsx';
import { evaluarSeguimiento } from './engine.js';
import { imprimirHoja } from '../../core/printSheet.js';
import { imprimirHojaClinica } from '../../core/hojaClinica.js';
import { Seccion, CampoNumero, CampoTexto, ToggleSiNo } from '../../core/ui.jsx';
import '../../core/instrumentLayout.css';

const PANEL = [
  ['peso', 'Peso', 'kilogramos'],
  ['imc', 'Índice de masa corporal', ''],
  ['grasa', 'Grasa corporal', 'por ciento'],
  ['musculo', 'Músculo esquelético', 'por ciento'],
  ['visceral', 'Grasa visceral', 'nivel'],
  ['cintura', 'Cintura', 'centímetros'],
  ['metabolismo', 'Metabolismo en reposo', 'kilocalorías'],
  ['edadCorporal', 'Edad corporal', 'años'],
];

const FILAS = [
  ['peso', 'Peso (kg)'], ['imc', 'Índice de masa corporal'], ['grasa', 'Grasa corporal (%)'],
  ['musculoKg', 'Masa muscular (kg)'], ['visceral', 'Grasa visceral (nivel)'],
  ['cintura', 'Cintura (cm)'], ['metabolismo', 'Metabolismo (kcal)'], ['edadCorporal', 'Edad corporal'],
];

const SEV = { ok: 'ok', aviso: 'aviso', alerta: 'alerta', neutro: '' };

function flecha(delta, mejorAbajo = true) {
  if (delta == null || delta === 0) return '—';
  const baja = delta < 0;
  const bien = mejorAbajo ? baja : !baja;
  return `${baja ? '▼' : '▲'} ${Math.abs(delta)} ${bien ? '' : ''}`.trim();
}

export default function SeguimientoMetabolico() {
  const { paciente, actualizar, publicarResumen } = usePaciente();
  const dem = paciente.demografia;

  const [d, setD] = useState({ farmaco: '', semanas: null, anticonceptivoOral: false, buscaEmbarazo: false, basal: {}, actual: {} });
  const set = (k, val) => setD((p) => ({ ...p, [k]: val }));
  const setB = (k, val) => setD((p) => ({ ...p, basal: { ...p.basal, [k]: val } }));
  const setA = (k, val) => setD((p) => ({ ...p, actual: { ...p.actual, [k]: val } }));

  const r = useMemo(() => evaluarSeguimiento(paciente, d), [paciente, d]);

  useEffect(() => {
    publicarResumen('seguimiento-metabolico', {
      evaluado: r.pct != null,
      estado: r.perdida.estado === 'neutro' ? 'ok' : r.perdida.estado,
      titular: r.pct != null ? r.perdida.etiqueta : 'Seguimiento metabólico',
      detalle: r.musculo.bandera ? 'Vigilar masa muscular' : '',
      metrica: r.pct != null ? { clave: 'perdida', nombre: 'Pérdida de peso', valor: r.pct, unidad: 'por ciento', min: 0, max: 25, mejorAbajo: false } : null,
    });
  }, [r, publicarResumen]);

  // ¿Mejor abajo? peso/imc/grasa/visceral/cintura/edadCorporal bajan; músculo y metabolismo conviene que NO bajen.
  const mejorAbajo = { peso: true, imc: true, grasa: true, musculoKg: false, visceral: true, cintura: true, metabolismo: false, edadCorporal: true };

  return (
    <div className="inst">
      <header className="inst-cab">
        <div>
          <div className="inst-eyebrow">Instrumento de seguimiento · Control metabólico</div>
          <h1>Seguimiento metabólico<small>composición corporal y avances con tirzepatida o semaglutida</small></h1>
        </div>
        <div className="inst-mono">IJ</div>
      </header>

      <div className="inst-grid">
        <div className="inst-form">
          <Seccion indice="I" titulo="Tratamiento">
            <CampoTexto etiqueta="Nombre de la paciente" full valor={dem.nombre} onChange={(val) => actualizar('demografia', 'nombre', val)} placeholder="Para identificar la hoja" />
            <CampoNumero etiqueta="Edad" unidad="años" valor={dem.edad} onChange={(val) => actualizar('demografia', 'edad', val)} min={18} max={100} />
            <CampoTexto etiqueta="Medicamento" valor={d.farmaco} onChange={(val) => set('farmaco', val)} placeholder="tirzepatida, semaglutida…" />
            <CampoNumero etiqueta="Semanas de tratamiento" unidad="semanas" valor={d.semanas} onChange={(val) => set('semanas', val)} min={0} max={300} />
            <ToggleSiNo etiqueta="¿Usa anticonceptivo oral?" valor={d.anticonceptivoOral} onChange={(val) => set('anticonceptivoOral', val)} />
            <ToggleSiNo etiqueta="¿Busca embarazo?" valor={d.buscaEmbarazo} onChange={(val) => set('buscaEmbarazo', val)} />
          </Seccion>

          <Seccion indice="II" titulo="Medición inicial (basal)" nota="Los valores de la báscula de bioimpedancia al iniciar">
            {PANEL.map(([k, et, u]) => (
              <CampoNumero key={k} etiqueta={et} unidad={u} valor={d.basal[k]} onChange={(val) => setB(k, val)} step={0.1} />
            ))}
          </Seccion>

          <Seccion indice="III" titulo="Medición actual" nota="Los valores de esta visita">
            {PANEL.map(([k, et, u]) => (
              <CampoNumero key={k} etiqueta={et} unidad={u} valor={d.actual[k]} onChange={(val) => setA(k, val)} step={0.1} />
            ))}
          </Seccion>
        </div>

        <div className="inst-res">
          <button className="inst-btn imprimir" onClick={() => imprimirHoja(r.hojaPaciente)}>Imprimir hoja para la paciente</button>
          <button className="inst-btn imprimir" onClick={() => imprimirHojaClinica('seguimiento-metabolico', r, paciente)}>Imprimir hoja clínica</button>

          <div className="inst-bloque">
            <h3>Respuesta al tratamiento</h3>
            <div className={'inst-pill ' + (SEV[r.perdida.estado] || '')}>{r.perdida.etiqueta}</div>
            <p style={{ color: 'rgba(31,58,46,.7)', fontSize: '0.9rem', marginTop: 8 }}>{r.perdida.detalle}</p>
          </div>

          {r.pct != null && (
            <div className="inst-bloque">
              <h3>Avances</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead><tr style={{ textAlign: 'left', color: '#A88B5C' }}><th>Parámetro</th><th>Inicio</th><th>Actual</th><th>Cambio</th></tr></thead>
                <tbody>
                  {FILAS.map(([k, et]) => {
                    const t = r.tendencias[k]; if (!t || (t.basal == null && t.actual == null)) return null;
                    return (
                      <tr key={k} style={{ borderTop: '1px solid rgba(31,58,46,.1)' }}>
                        <td style={{ padding: '6px 0' }}>{et}</td>
                        <td>{t.basal ?? '—'}</td>
                        <td>{t.actual ?? '—'}</td>
                        <td style={{ fontWeight: 600 }}>{flecha(t.delta, mejorAbajo[k])}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="inst-bloque">
            <h3>Masa muscular</h3>
            <div className={'inst-pill ' + (SEV[r.musculo.estado] || '')}>{r.musculo.estado === 'alerta' ? 'Vigilar masa muscular' : (r.musculo.estado === 'aviso' ? 'Descenso leve' : 'Preservada')}</div>
            <p style={{ color: 'rgba(31,58,46,.7)', fontSize: '0.9rem', marginTop: 8 }}>{r.musculo.nota}</p>
          </div>

          <div className="inst-bloque">
            <h3>Recordatorios</h3>
            <ul style={{ fontSize: '0.9rem', lineHeight: 1.6, paddingLeft: 18 }}>{r.recordatorios.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>

          <div className="inst-disclaimer">
            La báscula de bioimpedancia es sensible a la hidratación y la hora; interpreta por tendencia, no por el valor de un solo día. Instrumento de apoyo a la decisión; la conducta y la prescripción se individualizan.
          </div>
        </div>
      </div>
    </div>
  );
}
