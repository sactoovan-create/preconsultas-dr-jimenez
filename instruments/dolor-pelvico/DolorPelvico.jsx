import React, { useMemo, useState, useEffect } from 'react';
import { usePaciente, useInstrumento } from '../../core/PacienteContext.jsx';
import { evaluarDpc } from './engine.js';
import { imprimirHoja } from '../../core/printSheet.js';
import { imprimirHojaClinica } from '../../core/hojaClinica.js';
import { Seccion, CampoNumero, CampoTexto, Selector, Casilla , Puente, BaseEvidencia } from '../../core/ui.jsx';
import { evidenciaDe } from '../../core/evidencia.js';
import '../../core/instrumentLayout.css';
import './DolorPelvico.css';

// Pistas por sistema, para construir la captura de forma compacta.
const GRUPOS = [
  { nombre: 'Ginecológico', campos: [
    ['gin_ciclico', 'Dolor ligado a la menstruación'],
    ['gin_dispareunia', 'Dispareunia profunda'],
    ['gin_sangradoAnormal', 'Sangrado uterino anormal asociado'],
  ] },
  { nombre: 'Urológico', campos: [
    ['uro_dolorVesical', 'Dolor vesical que mejora al vaciar'],
    ['uro_urgenciaDisuria', 'Urgencia o disuria sin infección'],
    ['uro_polaquiuria', 'Polaquiuria'],
  ] },
  { nombre: 'Gastrointestinal', campos: [
    ['gi_cambiaDefecacion', 'Dolor que cambia con la defecación'],
    ['gi_distension', 'Distensión abdominal'],
    ['gi_habitoAlterado', 'Cambio del hábito intestinal'],
  ] },
  { nombre: 'Musculoesquelético', campos: [
    ['mus_sensibilidadPiso', 'Sensibilidad del piso pélvico a la exploración'],
    ['mus_posturaActividad', 'Dolor que cambia con la postura o la actividad'],
    ['mus_puntosGatillo', 'Puntos gatillo miofasciales'],
  ] },
  { nombre: 'Neurológico', campos: [
    ['neu_ardorElectrico', 'Dolor ardoroso, eléctrico o en choque'],
    ['neu_dermatomica', 'Distribución por un territorio nervioso'],
    ['neu_alodinia', 'Alodinia (dolor al tacto leve)'],
  ] },
  { nombre: 'Vascular', campos: [
    ['vas_empeoraDePie', 'Dolor que empeora al estar de pie y al final del día'],
    ['vas_varices', 'Várices pélvicas o vulvares'],
  ] },
];

export default function DolorPelvico() {
  const { paciente, actualizar, publicarResumen, irA } = usePaciente();
  const dem = paciente.demografia;

  const [d, setD] = useInstrumento('dolor-pelvico', () => ({
    poblacion: (dem.edad && dem.edad < 18) ? 'adolescente' : 'adulta',
    duracionMeses: (paciente.autoReporte && paciente.autoReporte.dolor && paciente.autoReporte.dolor.meses) ?? null,
    intensidadEVA: (paciente.autoReporte && paciente.autoReporte.dolor && paciente.autoReporte.dolor.intensidad) ?? null, patron: 'ciclico',
    gin_ciclico: false, gin_dispareunia: false, gin_sangradoAnormal: false,
    uro_dolorVesical: false, uro_urgenciaDisuria: false, uro_polaquiuria: false,
    gi_cambiaDefecacion: false, gi_distension: false, gi_habitoAlterado: false,
    mus_sensibilidadPiso: false, mus_posturaActividad: false, mus_puntosGatillo: false,
    neu_ardorElectrico: false, neu_dermatomica: false, neu_alodinia: false,
    vas_empeoraDePie: false, vas_varices: false,
    sc_desproporcionado: false, sc_multiplesSindromes: false, sc_generalizado: false,
    ba_sangradoPosmenopausico: false, ba_sangradoPoscoital: false, ba_perdidaPeso: false,
    ba_sangradoRectal: false, ba_hematuria: false, ba_masa: false, ba_fiebre: false,
  }));
  const set = (k, val) => setD((p) => ({ ...p, [k]: val }));

  const r = useMemo(() => evaluarDpc(paciente, d), [paciente, d]);

  useEffect(() => {
    const evaluado = r.sistemas.length > 0 || d.duracionMeses != null || r.banderas.length > 0;
    const estado = r.banderas.length ? 'alerta' : ((r.central.presente || r.sistemas.length) ? 'aviso' : 'ok');
    const detalle = r.sistemas.length
      ? `${r.sistemas.length} sistema${r.sistemas.length > 1 ? 's' : ''}: ${r.sistemas.slice(0, 2).map((x) => x.nombre).join(', ')}${r.sistemas.length > 2 ? ' y mas' : ''}`
      : '';
    publicarResumen('dolor-pelvico', {
      evaluado,
      estado,
      titular: r.dolor.cronico ? 'Dolor pélvico crónico' : 'En evaluación',
      detalle,
      metrica: (d.intensidadEVA !== null && d.intensidadEVA !== undefined) ? { clave: 'dolor', nombre: 'Intensidad del dolor', valor: d.intensidadEVA, unidad: 'de 10', min: 0, max: 10, mejorAbajo: true } : null,
    });
  }, [r, publicarResumen]);
  const setDem = (c, val) => actualizar('demografia', c, val);
  const hayHoja = r.hojaPaciente.secciones.some((s) => s.filas.length > 0);

  return (
    <div className="inst">
      <header className="inst-cab">
        <div>
          <div className="inst-eyebrow">Instrumento de evaluación · Abordaje por sistemas</div>
          <h1>Dolor pélvico crónico<small>diagnóstico diferencial multisistémico y tratamiento multimodal</small></h1>
        </div>
        <div className="inst-mono">IJ</div>
      </header>

      <div className="inst-grid">
        {/* -------- FORMULARIO -------- */}
        <div className="inst-form">
          <Seccion indice="I" titulo="Paciente">
            <CampoTexto etiqueta="Nombre de la paciente" full valor={dem.nombre} onChange={(v) => setDem('nombre', v)} placeholder="Para identificar la hoja impresa" />
            <CampoNumero etiqueta="Edad" unidad="años" valor={dem.edad} onChange={(v) => setDem('edad', v)} min={10} max={80} />
            <Selector etiqueta="Población" valor={d.poblacion} onChange={(v) => set('poblacion', v)}
              opciones={[{ valor: 'adulta', etiqueta: 'Adulta' }, { valor: 'adolescente', etiqueta: 'Adolescente' }]} />
          </Seccion>

          <Seccion indice="II" titulo="Caracterización del dolor" nota="Crónico: seis meses o más">
            <CampoNumero etiqueta="Duración" unidad="meses" valor={d.duracionMeses} onChange={(v) => set('duracionMeses', v)} min={0} max={240} />
            <CampoNumero etiqueta="Intensidad (escala visual analógica)" unidad="0 a 10" valor={d.intensidadEVA} onChange={(v) => set('intensidadEVA', v)} min={0} max={10} />
            <Selector etiqueta="Patrón temporal" valor={d.patron} onChange={(v) => set('patron', v)} full
              opciones={[{ valor: 'ciclico', etiqueta: 'Cíclico' }, { valor: 'constante', etiqueta: 'Constante' }, { valor: 'intermitente', etiqueta: 'Intermitente' }]} />
          </Seccion>

          <Seccion indice="III" titulo="Diagnóstico diferencial por sistemas" nota="Marca lo presente; el dolor suele tener más de una causa">
            {GRUPOS.map((g) => (
              <div className="dpc-grupo" key={g.nombre}>
                <div className="dpc-subt">{g.nombre}</div>
                {g.campos.map(([k, etq]) => <Casilla key={k} etiqueta={etq} valor={d[k]} onChange={(val) => set(k, val)} />)}
              </div>
            ))}
          </Seccion>

          <Seccion indice="IV" titulo="Sensibilización central" nota="Amplificación del dolor por el sistema nervioso">
            <div className="dpc-checks">
              <Casilla etiqueta="Dolor desproporcionado a los hallazgos" valor={d.sc_desproporcionado} onChange={(v) => set('sc_desproporcionado', v)} />
              <Casilla etiqueta="Coexistencia de varios síndromes de dolor" valor={d.sc_multiplesSindromes} onChange={(v) => set('sc_multiplesSindromes', v)} />
              <Casilla etiqueta="Dolor generalizado más allá de la pelvis" valor={d.sc_generalizado} onChange={(v) => set('sc_generalizado', v)} />
            </div>
          </Seccion>

          <Seccion indice="V" titulo="Banderas de alarma">
            <div className="dpc-checks">
              <Casilla etiqueta="Sangrado posmenopáusico" valor={d.ba_sangradoPosmenopausico} onChange={(v) => set('ba_sangradoPosmenopausico', v)} />
              <Casilla etiqueta="Sangrado poscoital" valor={d.ba_sangradoPoscoital} onChange={(v) => set('ba_sangradoPoscoital', v)} />
              <Casilla etiqueta="Pérdida de peso no intencional" valor={d.ba_perdidaPeso} onChange={(v) => set('ba_perdidaPeso', v)} />
              <Casilla etiqueta="Sangrado rectal" valor={d.ba_sangradoRectal} onChange={(v) => set('ba_sangradoRectal', v)} />
              <Casilla etiqueta="Hematuria" valor={d.ba_hematuria} onChange={(v) => set('ba_hematuria', v)} />
              <Casilla etiqueta="Masa pélvica palpable" valor={d.ba_masa} onChange={(v) => set('ba_masa', v)} />
              <Casilla etiqueta="Fiebre" valor={d.ba_fiebre} onChange={(v) => set('ba_fiebre', v)} />
            </div>
          </Seccion>
        </div>

        {/* -------- RESULTADOS -------- */}
        <div className="inst-res">
          <button className="inst-btn imprimir" disabled={!hayHoja} onClick={() => imprimirHoja(r.hojaPaciente)}>Imprimir hoja para la paciente</button>
          <button className="inst-btn imprimir" onClick={() => imprimirHojaClinica('dolor-pelvico', r, paciente)}>Imprimir hoja clínica</button>

          <div className="inst-bloque">
            <h3>Caracterización</h3>
            <div className={'inst-pill ' + (r.dolor.cronico ? 'aviso' : '')}>{r.dolor.cronico ? 'Dolor pélvico crónico' : 'Aún no crónico'}</div>
            <p className="dpc-detalle">
              {v(r.dolor.intensidad) ? `Intensidad ${r.dolor.intensidad} de 10. ` : ''}
              {r.dolor.patron ? `Patrón ${r.dolor.patron}. ` : ''}
              {r.dolor.nota}
            </p>
          </div>

          {r.banderas.length > 0 && (
            <div className="inst-bloque">
              <h3>Banderas de alarma</h3>
              {r.banderas.map((b, i) => <div className="dpc-aviso alerta" key={i}>{b}</div>)}
            </div>
          )}

          <div className="inst-bloque">
            <h3>Sistemas implicados</h3>
            {r.sistemas.length > 0 ? (
              <div className="dpc-sistemas">
                {r.sistemas.map((s, i) => (
                  <div className="dpc-sist" key={i}>
                    <div className="dpc-sist-cab"><span className="dpc-sist-n">{s.nombre}</span><span className="dpc-sist-c">{s.n}</span></div>
                    <ul>{s.pistas.map((p, j) => <li key={j}>{p}</li>)}</ul>
                  </div>
                ))}
              </div>
            ) : <p className="dpc-detalle">Marca las pistas presentes para orientar el diagnóstico diferencial.</p>}
          </div>

          {(r.central.presente || r.central.sospechada) && (
            <div className="inst-bloque">
              <h3>Sensibilización central</h3>
              <div className={'inst-pill ' + (r.central.presente ? 'alerta' : 'aviso')}>{r.central.presente ? 'Presente' : 'Posible'}</div>
              {r.central.datos.length > 0 && <div className="dpc-eval">{r.central.datos.join('; ')}.</div>}
              <p className="dpc-detalle">{r.central.nota}</p>
            </div>
          )}

          <div className="inst-bloque">
            <h3>Orientación a estudio</h3>
            <ul className="dpc-lista">{r.estudio.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>

          <div className="inst-bloque">
            <h3>Orientación a tratamiento</h3>
            {r.tratamiento.map((b, i) => (
              <div className="dpc-tx" key={i}>
                <div className="dpc-tx-t">{b.titulo}</div>
                <ul>{b.recomendaciones.map((rec, j) => <li key={j}>{rec}</li>)}</ul>
              </div>
            ))}
          </div>

          {r.sistemas.some((s) => s.id === 'ginecologico') && (
            <Puente texto="El eje ginecológico está implicado; la endometriosis es la causa principal a descartar." etiqueta="Evaluar endometriosis" onIr={() => irA('endometriosis')} />
          )}
          <BaseEvidencia evidencia={evidenciaDe('dolor-pelvico')} />
          <div className="inst-disclaimer">
            Instrumento de apoyo a la decisión basado en la evidencia vigente para el dolor pélvico crónico, incluido el artículo de Obstetrics and Gynecology de 2026. El dolor crónico suele ser multifactorial; el plan debe individualizarse al mecanismo predominante.
          </div>
        </div>
      </div>
    </div>
  );
}

function v(x) { return x !== null && x !== undefined && !isNaN(x); }
