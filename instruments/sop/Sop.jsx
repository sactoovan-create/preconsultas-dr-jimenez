import React, { useMemo, useState, useEffect } from 'react';
import { usePaciente } from '../../core/PacienteContext.jsx';
import { evaluarSop, indiceAndrogenosLibres } from './engine.js';
import { imprimirHoja } from '../../core/printSheet.js';
import { textoDeArchivo } from '../../core/labReaderBrowser.js';
import { parseLabs, parseIdent, ETIQUETAS_LAB } from '../../core/labParser.js';
import { Seccion, CampoNumero, CampoTexto, Selector, ToggleSiNo, Casilla , Puente, BaseEvidencia } from '../../core/ui.jsx';
import { evidenciaDe } from '../../core/evidencia.js';
import '../../core/instrumentLayout.css';
import './Sop.css';

const ESTADO_PILL = { cumple: 'ok', en_riesgo: 'aviso', requiere_exclusion: 'aviso', diferencial: 'alerta', no_cumple: '' };

export default function Sop() {
  const { paciente, actualizar, mezclar, publicarResumen, irA } = usePaciente();
  const dem = paciente.demografia, sig = paciente.signos, lab = paciente.labs;

  const [d, setD] = useState(() => ({
    poblacion: (dem.edad && dem.edad < 20) ? 'adolescente' : 'adulta',
    aniosPosmenarca: null, longitudCiclo: null, menosDeOchoPorAnio: false,
    amenorrea: false, amenorreaPrimaria: false, cualquierCicloMayor90: false,
    hirsutismoFG: null, acne: false, alopecia: false,
    testosteronaTotal: null, shbg: null, hiperandrogenismoBioquimicoConfirmado: null,
    foliculos20: false, volumenOvarico10: false, amhElevada: null,
    tshNormal: null, prolactinaNormal: null, hidroxiprogesteronaNormal: null, inicioRapidoVirilizacion: false,
    sintomasApnea: false, tamizajeAnimoPositivo: false,
    objetivos: { regularizacion: false, hiperandrogenismo: false, fertilidad: false, metabolico: false },
  }));
  const set = (k, val) => setD((p) => ({ ...p, [k]: val }));
  const setObj = (k, val) => setD((p) => ({ ...p, objetivos: { ...p.objetivos, [k]: val } }));

  const r = useMemo(() => evaluarSop(paciente, d), [paciente, d]);
  const ial = indiceAndrogenosLibres(d.testosteronaTotal, d.shbg);
  const adolescente = d.poblacion === 'adolescente';

  useEffect(() => {
    const c = r.diagnostico.criterios;
    const evaluado = c.hiperandrogenismo || c.disfuncionOvulatoria || c.morfologia;
    const mapa = { cumple: 'aviso', en_riesgo: 'aviso', requiere_exclusion: 'aviso', diferencial: 'alerta', no_cumple: 'ok' };
    publicarResumen('sop', {
      evaluado,
      estado: mapa[r.diagnostico.estado] || 'neutro',
      titular: r.diagnostico.etiqueta,
      detalle: r.fenotipo ? `Fenotipo ${r.fenotipo.letra}, riesgo metabólico ${r.fenotipo.riesgoMetabolico}` : '',
    });
  }, [r, publicarResumen]);

  // --- Lector de laboratorios (llena los metabólicos compartidos) ---
  const [estatus, setEstatus] = useState('');
  const [detectados, setDetectados] = useState(null);
  async function onArchivo(e) {
    const file = e.target.files[0]; if (!file) return;
    setDetectados(null);
    try {
      setEstatus('Leyendo reporte…');
      const txt = await textoDeArchivo(file);
      if (txt.replace(/[^a-zA-Z]/g, '').length < 20) { setEstatus('El documento parece escaneado. Súbelo como imagen.'); return; }
      const labs = parseLabs(txt); const ident = parseIdent(txt);
      setDetectados({ labs, ident });
      setEstatus(`${Object.values(labs).filter((x) => x !== null).length} valores metabólicos detectados.`);
    } catch (err) { setEstatus('No se pudo procesar el archivo.'); }
  }
  function aplicarDetectados() {
    if (!detectados) return;
    mezclar('labs', detectados.labs);
    const dd = {};
    if (detectados.ident.nombre && !dem.nombre) dd.nombre = detectados.ident.nombre;
    if (detectados.ident.edad && !dem.edad) dd.edad = detectados.ident.edad;
    if (Object.keys(dd).length) mezclar('demografia', dd);
    setDetectados(null); setEstatus('Valores aplicados.');
  }

  const setDem = (c, val) => actualizar('demografia', c, val);
  const setSig = (c, val) => actualizar('signos', c, val);
  const setLab = (c, val) => actualizar('labs', c, val);
  const hayHoja = r.hojaPaciente.secciones.some((s) => s.filas.length > 0);
  const crit = r.diagnostico.criterios;

  return (
    <div className="inst">
      <header className="inst-cab">
        <div>
          <div className="inst-eyebrow">Instrumento diagnóstico · Guía internacional 2023</div>
          <h1>Síndrome Poliendocrino Metabólico Ovárico<small>antes síndrome de ovario poliquístico</small></h1>
        </div>
        <div className="inst-mono">IJ</div>
      </header>

      <div className="inst-grid">
        {/* -------- FORMULARIO -------- */}
        <div className="inst-form">
          <div className="inst-importador">
            <div className="inst-imp-titulo">Importar laboratorios</div>
            <p className="inst-imp-sub">Llena los valores metabólicos del cribado. Los andrógenos y las hormonas de exclusión se capturan abajo. Todo es local.</p>
            <label className="inst-btn">Subir documento o imagen<input type="file" accept=".pdf,image/*" hidden onChange={onArchivo} /></label>
            {estatus && <div className="inst-estatus">{estatus}</div>}
            {detectados && (
              <div className="inst-detectados">
                {Object.keys(ETIQUETAS_LAB).filter((k) => detectados.labs[k] !== null).map((k) => (
                  <div className="inst-dt" key={k}><span>{ETIQUETAS_LAB[k]}</span><b>{detectados.labs[k]}</b></div>
                ))}
                <button className="inst-btn pequeno" onClick={aplicarDetectados}>Aplicar a los campos</button>
              </div>
            )}
          </div>

          <Seccion indice="I" titulo="Paciente">
            <CampoTexto etiqueta="Nombre de la paciente" full valor={dem.nombre} onChange={(v) => setDem('nombre', v)} placeholder="Para identificar la hoja impresa" />
            <CampoNumero etiqueta="Edad" unidad="años" valor={dem.edad} onChange={(v) => setDem('edad', v)} min={10} max={60} />
            <Selector etiqueta="Población diagnóstica" valor={d.poblacion} onChange={(v) => set('poblacion', v)}
              opciones={[{ valor: 'adulta', etiqueta: 'Adulta' }, { valor: 'adolescente', etiqueta: 'Adolescente' }]} />
            {adolescente && <CampoNumero etiqueta="Años posmenarca" unidad="años desde la primera regla" valor={d.aniosPosmenarca} onChange={(v) => set('aniosPosmenarca', v)} min={0} max={15} full />}
          </Seccion>

          <Seccion indice="II" titulo="Patrón menstrual" nota={adolescente ? 'Los umbrales cambian según los años posmenarca' : 'Irregular: menor de 21 o mayor de 35 días, o menos de 8 ciclos por año'}>
            <CampoNumero etiqueta="Longitud habitual del ciclo" unidad="días" valor={d.longitudCiclo} onChange={(v) => set('longitudCiclo', v)} min={15} max={120} />
            <div className="sop-checks">
              <Casilla etiqueta="Menos de ocho ciclos por año" valor={d.menosDeOchoPorAnio} onChange={(v) => set('menosDeOchoPorAnio', v)} />
              <Casilla etiqueta="Algún ciclo mayor de noventa días" valor={d.cualquierCicloMayor90} onChange={(v) => set('cualquierCicloMayor90', v)} />
              <Casilla etiqueta="Amenorrea (ausencia de menstruación)" valor={d.amenorrea} onChange={(v) => set('amenorrea', v)} />
              {adolescente && <Casilla etiqueta="Amenorrea primaria (sin regla a los quince años o tres años tras desarrollo mamario)" valor={d.amenorreaPrimaria} onChange={(v) => set('amenorreaPrimaria', v)} />}
            </div>
            <div className="sop-eval"><b>Disfunción ovulatoria:</b> {r.ciclo.irregular ? 'sí' : 'no'}. {r.ciclo.detalle}</div>
          </Seccion>

          <Seccion indice="III" titulo="Hiperandrogenismo clínico">
            <CampoNumero etiqueta="Hirsutismo, escala de Ferriman-Gallwey modificada" unidad="puntos" valor={d.hirsutismoFG} onChange={(v) => set('hirsutismoFG', v)} min={0} max={36} nota="Hirsutismo desde 4 a 6 según población" />
            <div className="sop-checks">
              <Casilla etiqueta={adolescente ? 'Acné moderado a severo' : 'Acné'} valor={d.acne} onChange={(v) => set('acne', v)} />
              {!adolescente && <Casilla etiqueta="Alopecia androgénica (patrón femenino)" valor={d.alopecia} onChange={(v) => set('alopecia', v)} />}
            </div>
          </Seccion>

          <Seccion indice="IV" titulo="Hiperandrogenismo bioquímico" nota="El índice de andrógenos libres es orientativo; el umbral depende de tu laboratorio">
            <CampoNumero etiqueta="Testosterona total" unidad="nanogramos por mililitro" valor={d.testosteronaTotal} onChange={(v) => set('testosteronaTotal', v)} step={0.01} />
            <CampoNumero etiqueta="Globulina fijadora de hormonas sexuales" unidad="nanomoles por litro" valor={d.shbg} onChange={(v) => set('shbg', v)} step={0.1} nota={ial != null ? `Índice de andrógenos libres ${ial.toFixed(2)}` : ''} />
            <ToggleSiNo etiqueta="¿Hiperandrogenemia bioquímica según tu laboratorio?" full valor={d.hiperandrogenismoBioquimicoConfirmado} onChange={(v) => set('hiperandrogenismoBioquimicoConfirmado', v)} />
          </Seccion>

          {!adolescente && (
            <Seccion indice="V" titulo="Morfología ovárica" nota="No aplica dentro de los ocho años posmenarca">
              <div className="sop-checks">
                <Casilla etiqueta="Veinte o más folículos en algún ovario" valor={d.foliculos20} onChange={(v) => set('foliculos20', v)} />
                <Casilla etiqueta="Volumen ovárico de diez mililitros o más" valor={d.volumenOvarico10} onChange={(v) => set('volumenOvarico10', v)} />
              </div>
              <ToggleSiNo etiqueta="Hormona antimülleriana elevada (alternativa a la ecografía en adultas)" full valor={d.amhElevada} onChange={(v) => set('amhElevada', v)} />
            </Seccion>
          )}

          <Seccion indice={adolescente ? 'V' : 'VI'} titulo="Exclusión de diagnósticos diferenciales" nota="El diagnóstico requiere descartar estas causas">
            <ToggleSiNo etiqueta="Función tiroidea normal" valor={d.tshNormal} onChange={(v) => set('tshNormal', v)} />
            <ToggleSiNo etiqueta="Prolactina normal" valor={d.prolactinaNormal} onChange={(v) => set('prolactinaNormal', v)} />
            <ToggleSiNo etiqueta="Diecisiete hidroxiprogesterona normal" valor={d.hidroxiprogesteronaNormal} onChange={(v) => set('hidroxiprogesteronaNormal', v)} />
            <div className="sop-checks">
              <Casilla etiqueta="Inicio rápido o signos de virilización" valor={d.inicioRapidoVirilizacion} onChange={(v) => set('inicioRapidoVirilizacion', v)} />
            </div>
          </Seccion>

          <Seccion indice={adolescente ? 'VI' : 'VII'} titulo="Cribado metabólico y de bienestar">
            <CampoNumero etiqueta="Peso" unidad="kilogramos" valor={sig.peso} onChange={(v) => setSig('peso', v)} />
            <CampoNumero etiqueta="Talla" unidad="centímetros" valor={sig.talla} onChange={(v) => setSig('talla', v)} nota={r.cribado.imc ? `Índice de masa corporal ${r.cribado.imc.toFixed(1)}` : ''} />
            <CampoNumero etiqueta="Presión sistólica" unidad="milímetros de mercurio" valor={sig.sistolica} onChange={(v) => setSig('sistolica', v)} />
            <CampoNumero etiqueta="Presión diastólica" unidad="milímetros de mercurio" valor={sig.diastolica} onChange={(v) => setSig('diastolica', v)} />
            <CampoNumero etiqueta="Glucosa en ayuno" unidad="miligramos por decilitro" valor={lab.glu} onChange={(v) => setLab('glu', v)} />
            <CampoNumero etiqueta="Hemoglobina glucosilada" unidad="por ciento" valor={lab.hba1c} onChange={(v) => setLab('hba1c', v)} step={0.1} />
            <CampoNumero etiqueta="Triglicéridos" unidad="miligramos por decilitro" valor={lab.tg} onChange={(v) => setLab('tg', v)} />
            <CampoNumero etiqueta="Colesterol de alta densidad" unidad="miligramos por decilitro" valor={lab.hdl} onChange={(v) => setLab('hdl', v)} />
            <div className="sop-checks">
              <Casilla etiqueta="Síntomas de apnea del sueño (ronquido, somnolencia diurna)" valor={d.sintomasApnea} onChange={(v) => set('sintomasApnea', v)} />
              <Casilla etiqueta="Tamizaje de ansiedad o depresión positivo" valor={d.tamizajeAnimoPositivo} onChange={(v) => set('tamizajeAnimoPositivo', v)} />
            </div>
          </Seccion>

          <Seccion indice={adolescente ? 'VII' : 'VIII'} titulo="Objetivos de la paciente" nota="Orientan el tratamiento">
            <div className="sop-checks">
              <Casilla etiqueta="Regularización menstrual" valor={d.objetivos.regularizacion} onChange={(v) => setObj('regularizacion', v)} />
              <Casilla etiqueta="Manejo del hiperandrogenismo (hirsutismo, acné)" valor={d.objetivos.hiperandrogenismo} onChange={(v) => setObj('hiperandrogenismo', v)} />
              <Casilla etiqueta="Metabólico y peso" valor={d.objetivos.metabolico} onChange={(v) => setObj('metabolico', v)} />
              {!adolescente && <Casilla etiqueta="Fertilidad" valor={d.objetivos.fertilidad} onChange={(v) => setObj('fertilidad', v)} />}
            </div>
          </Seccion>
        </div>

        {/* -------- RESULTADOS -------- */}
        <div className="inst-res">
          <button className="inst-btn imprimir" disabled={!hayHoja} onClick={() => imprimirHoja(r.hojaPaciente)}>Imprimir hoja para la paciente</button>

          <div className="inst-bloque">
            <h3>Diagnóstico</h3>
            <div className={'inst-pill ' + (ESTADO_PILL[r.diagnostico.estado] || '')}>{r.diagnostico.etiqueta}</div>
            <p className="sop-dx-detalle">{r.diagnostico.detalle}</p>
            <div className="sop-criterios">
              <Criterio activo={crit.hiperandrogenismo} texto="Hiperandrogenismo" sub={r.hiper.detalle} />
              <Criterio activo={crit.disfuncionOvulatoria} texto="Disfunción ovulatoria" sub={r.ciclo.detalle} />
              {!adolescente && <Criterio activo={crit.morfologia} texto="Morfología ovárica" sub={r.morfo.aplica ? r.morfo.detalle : 'No aplica'} />}
            </div>
          </div>

          {r.fenotipo && (
            <div className="inst-bloque">
              <h3>Fenotipo</h3>
              <div className="sop-fenotipo">
                <div className="sop-fen-letra">{r.fenotipo.letra}</div>
                <div>
                  <div className="sop-fen-desc">{r.fenotipo.descripcion}</div>
                  <div className={'sop-fen-riesgo ' + r.fenotipo.riesgoMetabolico}>Riesgo metabólico {r.fenotipo.riesgoMetabolico}</div>
                </div>
              </div>
            </div>
          )}

          {(r.exclu.pendientes.length > 0 || r.exclu.alteradas.length > 0 || r.exclu.banderas.length > 0) && (
            <div className="inst-bloque">
              <h3>Exclusiones</h3>
              {r.exclu.alteradas.length > 0 && <div className="sop-aviso alerta">Alterado, revisar como causa: {r.exclu.alteradas.join(', ')}.</div>}
              {r.exclu.pendientes.length > 0 && <div className="sop-aviso">Pendiente por completar: {r.exclu.pendientes.join(', ')}.</div>}
              {r.exclu.banderas.map((b, i) => <div className="sop-aviso alerta" key={i}>{b}</div>)}
            </div>
          )}

          <div className="inst-bloque">
            <h3>Cribado de complicaciones</h3>
            <div className="sop-cribado">
              {r.cribado.items.map((it, i) => (
                <div className={'sop-crib-item ' + it.estado} key={i}>
                  <span className="sop-crib-pt" />
                  <div>
                    <div className="sop-crib-n">{it.nombre}</div>
                    {it.hallazgo && <div className="sop-crib-h">{it.hallazgo}</div>}
                  </div>
                  <span className="sop-crib-e">{it.estado === 'normal' ? 'Normal' : it.estado === 'alterado' ? 'Atender' : 'Pendiente'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="inst-bloque">
            <h3>Orientación a tratamiento</h3>
            {r.tratamiento.map((linea, i) => (
              <div className="sop-tx" key={i}>
                <div className="sop-tx-obj">{linea.objetivo}</div>
                <ul>{linea.recomendaciones.map((rec, j) => <li key={j}>{rec}</li>)}</ul>
              </div>
            ))}
          </div>

          {(r.diagnostico.estado === 'cumple' || r.diagnostico.estado === 'en_riesgo') && (
            <Puente texto="El síndrome poliendocrino aumenta el riesgo cardiometabólico; la guía recomienda tamizarlo." etiqueta="Evaluar riesgo cardiometabólico" onIr={() => irA('cardiometabolico')} />
          )}
          <BaseEvidencia evidencia={evidenciaDe('sop')} />
          <div className="inst-disclaimer">
            Instrumento de apoyo a la decisión basado en la guía internacional 2023. El diagnóstico de exclusión y la elección de tratamiento corresponden al juicio clínico y a la decisión compartida. La mayoría de los tratamientos farmacológicos se usan fuera de indicación aprobada.
          </div>
        </div>
      </div>
    </div>
  );
}

function Criterio({ activo, texto, sub }) {
  return (
    <div className={'sop-crit ' + (activo ? 'si' : 'no')}>
      <span className={'sop-crit-marca ' + (activo ? 'si' : 'no')} aria-hidden="true" />
      <div>
        <div className="sop-crit-t">{texto}</div>
        {sub && <div className="sop-crit-s">{sub}</div>}
      </div>
    </div>
  );
}
