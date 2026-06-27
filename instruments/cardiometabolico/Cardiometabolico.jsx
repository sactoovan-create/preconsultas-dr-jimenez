import React, { useMemo, useState, useEffect } from 'react';
import { usePaciente } from '../../core/PacienteContext.jsx';
import { evaluarCardiometabolico } from './engine.js';
import { imprimirHoja } from '../../core/printSheet.js';
import { imprimirHojaClinica } from '../../core/hojaClinica.js';
import { textoDeArchivo } from '../../core/labReaderBrowser.js';
import { parseLabs, parseIdent, ETIQUETAS_LAB } from '../../core/labParser.js';
import { Seccion, CampoNumero, CampoTexto, Selector, ToggleSiNo, Casilla , Puente, BaseEvidencia } from '../../core/ui.jsx';
import { evidenciaDe } from '../../core/evidencia.js';
import './Cardiometabolico.css';

const pct = (x) => (x * 100).toFixed(1);

export default function Cardiometabolico() {
  const { paciente, actualizar, mezclar, publicarResumen, irA } = usePaciente();
  const r = useMemo(() => evaluarCardiometabolico(paciente), [paciente]);

  useEffect(() => {
    const e = r.estadio.numero;
    const evaluado = !!r.prevent || e > 0 || r.hojaPaciente.secciones.some((s) => s.filas.length > 0);
    publicarResumen('cardiometabolico', {
      evaluado,
      estado: e <= 1 ? 'ok' : (e === 2 ? 'aviso' : 'alerta'),
      titular: `Estadio ${e}`,
      detalle: r.prevent ? `Riesgo cardiovascular a diez años ${(r.prevent.total10 * 100).toFixed(1)} por ciento` : 'Síndrome cardiovascular-renal-metabólico',
      metrica: r.prevent ? { clave: 'riesgo10', nombre: 'Riesgo cardiovascular a diez años', valor: +(r.prevent.total10 * 100).toFixed(1), unidad: 'por ciento', min: 0, max: 30, mejorAbajo: true } : null,
    });
  }, [r, publicarResumen]);

  // --- Lector de laboratorios ---
  const [estatus, setEstatus] = useState('');
  const [detectados, setDetectados] = useState(null);

  async function onArchivo(e) {
    const file = e.target.files[0];
    if (!file) return;
    setDetectados(null);
    try {
      setEstatus('Leyendo reporte…');
      const txt = await textoDeArchivo(file);
      if (txt.replace(/[^a-zA-Z]/g, '').length < 20) {
        setEstatus('El documento parece escaneado. Súbelo como imagen para reconocerlo.');
        return;
      }
      const labs = parseLabs(txt);
      const ident = parseIdent(txt);
      const n = Object.values(labs).filter((x) => x !== null).length;
      setDetectados({ labs, ident });
      setEstatus(`${n} de 7 valores detectados. Revisa y aplica.`);
    } catch (err) {
      setEstatus('No se pudo procesar el archivo.');
    }
  }

  function aplicarDetectados() {
    if (!detectados) return;
    mezclar('labs', detectados.labs);
    const d = {};
    if (detectados.ident.nombre && !paciente.demografia.nombre) d.nombre = detectados.ident.nombre;
    if (detectados.ident.edad && !paciente.demografia.edad) d.edad = detectados.ident.edad;
    if (Object.keys(d).length) mezclar('demografia', d);
    setDetectados(null);
    setEstatus('Valores aplicados. Verifica y corrige si hace falta.');
  }

  const dem = paciente.demografia, sig = paciente.signos, lab = paciente.labs, ant = paciente.antecedentes;
  const setDem = (c, v) => actualizar('demografia', c, v);
  const setSig = (c, v) => actualizar('signos', c, v);
  const setLab = (c, v) => actualizar('labs', c, v);
  const setAnt = (c, v) => actualizar('antecedentes', c, v);

  const hayDatosHoja = r.hojaPaciente.secciones.some((s) => s.filas.length > 0);

  return (
    <div className="cm">
      <header className="cm-cab">
        <div>
          <div className="cm-eyebrow">Instrumento de punto de atención</div>
          <h1>Riesgo cardiometabólico de la mujer</h1>
        </div>
        <div className="cm-mono">IJ</div>
      </header>

      <div className="cm-grid">
        {/* -------- FORMULARIO -------- */}
        <div className="cm-form">
          <div className="cm-importador">
            <div className="cm-imp-titulo">Importar laboratorios</div>
            <p className="cm-imp-sub">Sube el reporte en documento o imagen. Se leen y rellenan los campos de laboratorio. Todo es local.</p>
            <label className="cm-btn">
              Subir documento o imagen
              <input type="file" accept=".pdf,image/*" hidden onChange={onArchivo} />
            </label>
            {estatus && <div className="cm-estatus">{estatus}</div>}
            {detectados && (
              <div className="cm-detectados">
                {detectados.ident.nombre && <div className="cm-dt"><span>Paciente</span><b>{detectados.ident.nombre}</b></div>}
                {detectados.ident.edad && <div className="cm-dt"><span>Edad</span><b>{detectados.ident.edad} años</b></div>}
                {Object.keys(ETIQUETAS_LAB).map((k) => (
                  <div className="cm-dt" key={k}>
                    <span>{ETIQUETAS_LAB[k]}</span>
                    {detectados.labs[k] !== null ? <b>{detectados.labs[k]}</b> : <i>no encontrado</i>}
                  </div>
                ))}
                <button className="cm-btn pequeno" onClick={aplicarDetectados}>Aplicar a los campos</button>
              </div>
            )}
          </div>

          <Seccion indice="I" titulo="Antropometría y signos">
            <CampoTexto etiqueta="Nombre de la paciente" full valor={dem.nombre} onChange={(v) => setDem('nombre', v)} placeholder="Para identificar la hoja impresa" />
            <CampoNumero etiqueta="Edad" unidad="años" valor={dem.edad} onChange={(v) => setDem('edad', v)} min={18} max={90} />
            <CampoNumero etiqueta="Circunferencia abdominal" unidad="centímetros" valor={sig.circunferencia} onChange={(v) => setSig('circunferencia', v)} />
            <CampoNumero etiqueta="Peso" unidad="kilogramos" valor={sig.peso} onChange={(v) => setSig('peso', v)} />
            <CampoNumero etiqueta="Talla" unidad="centímetros" valor={sig.talla} onChange={(v) => setSig('talla', v)} nota={r.derivados.imc ? `Índice de masa corporal ${r.derivados.imc.toFixed(1)}` : ''} />
            <CampoNumero etiqueta="Presión sistólica" unidad="milímetros de mercurio" valor={sig.sistolica} onChange={(v) => setSig('sistolica', v)} />
            <CampoNumero etiqueta="Presión diastólica" unidad="milímetros de mercurio" valor={sig.diastolica} onChange={(v) => setSig('diastolica', v)} />
          </Seccion>

          <Seccion indice="II" titulo="Laboratorio">
            <CampoNumero etiqueta="Colesterol total" unidad="miligramos por decilitro" valor={lab.ct} onChange={(v) => setLab('ct', v)} />
            <CampoNumero etiqueta="Colesterol de alta densidad" unidad="miligramos por decilitro" valor={lab.hdl} onChange={(v) => setLab('hdl', v)} />
            <CampoNumero etiqueta="Triglicéridos" unidad="miligramos por decilitro" valor={lab.tg} onChange={(v) => setLab('tg', v)} />
            <CampoNumero etiqueta="Glucosa en ayuno" unidad="miligramos por decilitro" valor={lab.glu} onChange={(v) => setLab('glu', v)} />
            <CampoNumero etiqueta="Hemoglobina glucosilada" unidad="por ciento" valor={lab.hba1c} onChange={(v) => setLab('hba1c', v)} step={0.1} />
            <CampoNumero etiqueta="Creatinina sérica" unidad="miligramos por decilitro" valor={lab.creat} onChange={(v) => setLab('creat', v)} step={0.01} nota={r.derivados.filtracion ? `Filtración estimada ${r.derivados.filtracion} mililitros por minuto` : ''} />
            <CampoNumero etiqueta="Cociente albúmina-creatinina" unidad="miligramos por gramo · opcional" valor={lab.uacr} onChange={(v) => setLab('uacr', v)} full />
          </Seccion>

          <Seccion indice="III" titulo="Condiciones y tratamientos">
            <ToggleSiNo etiqueta="Diabetes tipo 2" valor={ant.diabetes} onChange={(v) => setAnt('diabetes', v)} />
            <ToggleSiNo etiqueta="Tabaquismo actual" valor={ant.tabaquismo} onChange={(v) => setAnt('tabaquismo', v)} />
            <ToggleSiNo etiqueta="Tratamiento antihipertensivo" valor={ant.antihipertensivo} onChange={(v) => setAnt('antihipertensivo', v)} />
            <ToggleSiNo etiqueta="Tratamiento con estatina" valor={ant.estatina} onChange={(v) => setAnt('estatina', v)} />
            <ToggleSiNo etiqueta="Enfermedad cardiovascular clínica establecida" full alerta valor={ant.ecvEstablecida} onChange={(v) => setAnt('ecvEstablecida', v)} />
            <ToggleSiNo etiqueta="Enfermedad cardiovascular subclínica documentada" full valor={ant.ecvSubclinica} onChange={(v) => setAnt('ecvSubclinica', v)} />
          </Seccion>

          <Seccion indice="IV" titulo="Etapa reproductiva y potenciadores">
            <Selector etiqueta="Etapa" valor={dem.etapaReproductiva} onChange={(v) => setDem('etapaReproductiva', v)}
              opciones={[{ valor: 'pre', etiqueta: 'Premenopausia' }, { valor: 'peri', etiqueta: 'Perimenopausia' }, { valor: 'post', etiqueta: 'Posmenopausia' }]} />
            <CampoNumero etiqueta="Edad de la menopausia" unidad="años, si aplica" valor={dem.edadMenopausia} onChange={(v) => setDem('edadMenopausia', v)} />
            <div className="cm-checks">
              <Casilla etiqueta="Preeclampsia o hipertensión gestacional" valor={ant.preeclampsia} onChange={(v) => setAnt('preeclampsia', v)} />
              <Casilla etiqueta="Diabetes gestacional" valor={ant.diabetesGestacional} onChange={(v) => setAnt('diabetesGestacional', v)} />
              <Casilla etiqueta="Síndrome poliendocrino ovárico" valor={ant.sindromePoliendocrino} onChange={(v) => setAnt('sindromePoliendocrino', v)} />
            </div>
          </Seccion>

          {(dem.etapaReproductiva === 'peri' || dem.etapaReproductiva === 'post') && (
            <Seccion indice="V" titulo="Contraindicaciones de terapia hormonal sistémica" nota="Definen si la terapia hormonal está contraindicada. Se comparten con el instrumento de menopausia">
              <ToggleSiNo etiqueta="Cáncer de mama" full alerta valor={ant.cancerMama} onChange={(v) => setAnt('cancerMama', v)} />
              <ToggleSiNo etiqueta="Tromboembolismo venoso o trombofilia" full alerta valor={ant.tromboembolismo} onChange={(v) => setAnt('tromboembolismo', v)} />
              <ToggleSiNo etiqueta="Enfermedad hepática activa" full alerta valor={ant.hepatica} onChange={(v) => setAnt('hepatica', v)} />
              <ToggleSiNo etiqueta="Sangrado vaginal no diagnosticado" full alerta valor={ant.sangradoNoDx} onChange={(v) => setAnt('sangradoNoDx', v)} />
            </Seccion>
          )}
        </div>

        {/* -------- RESULTADOS -------- */}
        <div className="cm-res">
          <button className="cm-btn imprimir" disabled={!hayDatosHoja} onClick={() => imprimirHoja(r.hojaPaciente)}>
            Imprimir hoja para la paciente
          </button>
          <button className="inst-btn imprimir" onClick={() => imprimirHojaClinica('cardiometabolico', r, paciente)}>Imprimir hoja clínica</button>

          {r.prevent && (
            <div className="cm-bloque">
              <h3>Riesgo cardiovascular · PREVENT</h3>
              <div className="cm-prevent">
                <Celda et="Cardiovascular total" v10={r.prevent.total10} v30={r.prevent.total30} />
                <Celda et="Ateroesclerótica" v10={r.prevent.ateroesclerotica10} v30={r.prevent.ateroesclerotica30} />
                <Celda et="Insuficiencia cardiaca" v10={r.prevent.insuficienciaCardiaca10} v30={r.prevent.insuficienciaCardiaca30} />
              </div>
              <div className="cm-nota">
                {r.prevent.total10 >= 0.20
                  ? 'Riesgo total a diez años igual o mayor al veinte por ciento: cumple un criterio de estadio 3.'
                  : (r.prevent.ateroesclerotica10 >= 0.075
                    ? 'Riesgo ateroesclerótico igual o mayor al siete punto cinco por ciento: umbral que prioriza farmacoterapia.'
                    : 'Riesgo por debajo del umbral de siete punto cinco por ciento para farmacoterapia.')}
                {' '}La cifra a treinta años comunica el riesgo real en una mujer joven.
              </div>
              <div className="cm-aviso-mujer">
                Atención: este modelo tiende a subestimar el riesgo en mujeres. Lee la cifra como un piso, no como el valor exacto, y pondérala con el cuadro clínico.
              </div>
            </div>
          )}

          <div className="cm-bloque">
            <h3>Estadio del síndrome</h3>
            <div className="cm-banda">
              {[0, 1, 2, 3, 4].map((n) => (
                <div key={n} className={`cm-est e${n}` + (n === r.estadio.numero ? ' activo' : '')}>
                  <div className="n">{n}</div>
                </div>
              ))}
            </div>
            <div className="cm-est-detalle"><b>Estadio {r.estadio.numero}.</b> {r.estadio.justificacion}</div>
          </div>

          <div className="cm-bloque">
            <h3>Conducta y derivación</h3>
            <div className={`cm-pill ${r.conducta.nivel}`}>{r.conducta.etiqueta}</div>
            <p className="cm-conducta">{r.conducta.texto}</p>
          </div>

          {r.terapiaHormonal && (
            <div className="cm-bloque">
              <h3>Terapia hormonal de la menopausia</h3>
              <div className={`cm-th ${r.terapiaHormonal.tipo}`}>
                <div className="cm-th-titulo">{r.terapiaHormonal.titulo}</div>
                <div className="cm-th-detalle">{r.terapiaHormonal.detalle}</div>
                {r.terapiaHormonal.progestageno && <div className="cm-th-detalle">Útero presente: añadir progestágeno para protección endometrial.</div>}
              </div>
            </div>
          )}

          {paciente.antecedentes.sindromePoliendocrino && (
            <Puente texto="Antecedente de síndrome poliendocrino; conviene su evaluación específica." etiqueta="Evaluar síndrome poliendocrino" onIr={() => irA('sop')} />
          )}
          {(paciente.demografia.etapaReproductiva === 'peri' || paciente.demografia.etapaReproductiva === 'post') && (
            <Puente texto="Paciente en transición o posmenopausia; valorar síntomas y terapia hormonal." etiqueta="Evaluar menopausia" onIr={() => irA('menopausia')} />
          )}
          <BaseEvidencia evidencia={evidenciaDe('cardiometabolico')} />
          <div className="cm-disclaimer">
            Resultado orientativo de apoyo a la decisión. El estadiaje aplica umbrales convencionales y debe confirmarse con juicio clínico. Las ecuaciones PREVENT se derivaron en población estadounidense, no superan al modelo europeo fuera de los Estados Unidos y tienden a subestimar el riesgo en mujeres y en personas menores de setenta años; interpreta el resultado como orientativo para población mexicana, no como una probabilidad calibrada.
          </div>
        </div>
      </div>
    </div>
  );
}

function Celda({ et, v10, v30 }) {
  if (v10 === null || v10 === undefined) {
    return <div className="cm-celda"><div className="et">{et}</div><div className="cm-celda-na">Requiere peso y talla</div></div>;
  }
  return (
    <div className="cm-celda">
      <div className="et">{et}</div>
      <div className="v10">{pct(v10)}<span>%</span></div>
      <div className="l">10 años</div>
      <div className="v30">{(v30 * 100).toFixed(0)}<span>%</span></div>
      <div className="l">30 años</div>
    </div>
  );
}
