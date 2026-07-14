import React, { useMemo, useState, useEffect } from 'react';
import { usePaciente, useInstrumento } from '../../core/PacienteContext.jsx';
import { evaluarHua } from './engine.js';
import { imprimirHoja } from '../../core/printSheet.js';
import { imprimirHojaClinica } from '../../core/hojaClinica.js';
import { Seccion, CampoNumero, CampoTexto, Selector, ToggleSiNo, Casilla , Puente, BaseEvidencia } from '../../core/ui.jsx';
import { evidenciaDe } from '../../core/evidencia.js';
import '../../core/instrumentLayout.css';
import './Hemorragia.css';

export default function Hemorragia() {
  const { paciente, actualizar, publicarResumen, irA } = usePaciente();
  const dem = paciente.demografia;

  const [d, setD] = useInstrumento('hemorragia', () => ({
    contexto: (dem.edad && dem.edad >= 52) ? 'posmenopausica' : (dem.edad && dem.edad < 18 ? 'adolescente' : 'reproductiva'),
    agudo: false,
    taquicardia: false, ortostatismo: false, hipotension: false, saturacionAlta: false,
    frecuenciaDias: null, duracionDias: null, regular: null, volumen: 'normal', intermenstrual: false,
    polipo: false, adenomiosis: false, leiomioma: false, leiomiomaSubmucoso: false, malignidadHiperplasia: false,
    coag_menarcaAbundante: false, coag_posparto: false, coag_quirurgico: false, coag_dental: false, coag_epistaxis: false, coag_equimosis: false, coag_familiar: false,
    ovulatoria: false, endometrial: false, iatrogenica: false,
    grosorEndometrial: null, factoresRiesgoCancer: false, episodioRecurrente: false, endometrioVisualizado: null,
    deseoFertilidad: null, hb: null,
  }));
  const set = (k, val) => setD((p) => ({ ...p, [k]: val }));

  const r = useMemo(() => evaluarHua(paciente, d), [paciente, d]);
  const posmeno = d.contexto === 'posmenopausica';
  const adolescente = d.contexto === 'adolescente';
  const setDem = (c, val) => actualizar('demografia', c, val);
  const hayHoja = r.hojaPaciente.secciones.some((s) => s.filas.length > 0);

  useEffect(() => {
    const evaluado = r.palm.hayClasificacion || r.sangrado.anormal || !!r.agudo || !!r.posmeno || d.hb != null;
    let titular = 'Hemorragia uterina anormal';
    if (r.agudo) titular = r.agudo.inestable ? 'Hemorragia aguda inestable' : 'Hemorragia aguda estable';
    else if (r.palm.hayClasificacion) titular = r.palm.presentes.map((x) => x.nombre).join(', ');
    let estado = 'ok';
    if ((r.agudo && r.agudo.inestable) || r.anemia.estado === 'severa') estado = 'alerta';
    else if (r.palm.hayClasificacion || r.agudo || r.posmeno || r.anemia.estado === 'moderada' || r.anemia.estado === 'leve') estado = 'aviso';
    const detalle = (r.anemia.estado && r.anemia.estado !== 'pendiente' && r.anemia.estado !== 'normal')
      ? r.anemia.texto : (r.posmeno ? 'Vía posmenopáusica' : '');
    publicarResumen('hemorragia', { evaluado, estado, titular, detalle });
  }, [r, d.hb, publicarResumen]);

  return (
    <div className="inst">
      <header className="inst-cab">
        <div>
          <div className="inst-eyebrow">Instrumento diagnóstico · Sistemas FIGO 1 y 2</div>
          <h1>Hemorragia uterina anormal<small>clasificación PALM-COEIN, severidad y orientación</small></h1>
        </div>
        <div className="inst-mono">IJ</div>
      </header>

      <div className="inst-grid">
        {/* -------- FORMULARIO -------- */}
        <div className="inst-form">
          <Seccion indice="I" titulo="Paciente y contexto">
            <CampoTexto etiqueta="Nombre de la paciente" full valor={dem.nombre} onChange={(v) => setDem('nombre', v)} placeholder="Para identificar la hoja impresa" />
            <CampoNumero etiqueta="Edad" unidad="años" valor={dem.edad} onChange={(v) => setDem('edad', v)} min={9} max={90} />
            <Selector etiqueta="Contexto" valor={d.contexto} onChange={(v) => set('contexto', v)}
              opciones={[{ valor: 'reproductiva', etiqueta: 'Edad reproductiva' }, { valor: 'adolescente', etiqueta: 'Adolescente' }, { valor: 'posmenopausica', etiqueta: 'Posmenopáusica' }]} />
            <CampoNumero etiqueta="Hemoglobina" unidad="gramos por decilitro" valor={d.hb} onChange={(v) => set('hb', v)} step={0.1} nota={r.anemia.estado !== 'pendiente' && r.anemia.estado !== 'normal' ? r.anemia.texto : ''} />
          </Seccion>

          <Seccion indice="II" titulo="Episodio agudo" nota="Sangrado que requiere intervención inmediata">
            <ToggleSiNo etiqueta="¿Es un episodio agudo?" full alerta valor={d.agudo} onChange={(v) => set('agudo', v)} />
            {d.agudo && (
              <div className="hua-checks">
                <Casilla etiqueta="Hipotensión" valor={d.hipotension} onChange={(v) => set('hipotension', v)} />
                <Casilla etiqueta="Cambios ortostáticos (presión o pulso)" valor={d.ortostatismo} onChange={(v) => set('ortostatismo', v)} />
                <Casilla etiqueta="Taquicardia" valor={d.taquicardia} onChange={(v) => set('taquicardia', v)} />
                <Casilla etiqueta="Satura más de una toalla por hora o empapa en menos de dos horas" valor={d.saturacionAlta} onChange={(v) => set('saturacionAlta', v)} />
              </div>
            )}
          </Seccion>

          {!posmeno && (
            <Seccion indice="III" titulo="Patrón del sangrado (FIGO 1)" nota="Frecuencia normal 24 a 38 días; duración hasta 8 días">
              <CampoNumero etiqueta="Frecuencia (longitud del ciclo)" unidad="días" valor={d.frecuenciaDias} onChange={(v) => set('frecuenciaDias', v)} min={10} max={120} />
              <CampoNumero etiqueta="Duración del sangrado" unidad="días" valor={d.duracionDias} onChange={(v) => set('duracionDias', v)} min={1} max={40} />
              <Selector etiqueta="Volumen" valor={d.volumen} onChange={(v) => set('volumen', v)}
                opciones={[{ valor: 'ligero', etiqueta: 'Ligero' }, { valor: 'normal', etiqueta: 'Normal' }, { valor: 'abundante', etiqueta: 'Abundante' }]} />
              <Selector etiqueta="Regularidad" valor={d.regular === null ? '' : (d.regular ? 'si' : 'no')} onChange={(v) => set('regular', v === 'si')}
                opciones={[{ valor: '', etiqueta: 'Sin definir' }, { valor: 'si', etiqueta: 'Regular' }, { valor: 'no', etiqueta: 'Irregular' }]} />
              <div className="hua-checks">
                <Casilla etiqueta="Sangrado intermenstrual (entre reglas)" valor={d.intermenstrual} onChange={(v) => set('intermenstrual', v)} />
              </div>
              {r.sangrado.anormal && <div className="hua-eval"><b>Descriptores anormales:</b> {r.sangrado.descriptores.join('; ')}.</div>}
            </Seccion>
          )}

          {posmeno && (
            <Seccion indice="III" titulo="Sangrado posmenopáusico" nota="Colegio Americano de Obstetras y Ginecólogos, actualización de abril de 2026">
              <CampoNumero etiqueta="Grosor endometrial" unidad="milímetros" valor={d.grosorEndometrial} onChange={(v) => set('grosorEndometrial', v)} step={0.1} />
              <ToggleSiNo etiqueta="Endometrio completamente visualizado" valor={d.endometrioVisualizado} onChange={(v) => set('endometrioVisualizado', v)} />
              <div className="hua-checks">
                <Casilla etiqueta="Sangrado recurrente (no es un episodio único)" valor={d.episodioRecurrente} onChange={(v) => set('episodioRecurrente', v)} />
                <Casilla etiqueta="Factores de riesgo de cáncer endometrial (obesidad, diabetes, tamoxifeno, exposición a estrógenos sin oposición)" valor={d.factoresRiesgoCancer} onChange={(v) => set('factoresRiesgoCancer', v)} />
              </div>
            </Seccion>
          )}

          <Seccion indice="IV" titulo="Causas estructurales (PALM)" nota="Por imagen o histología">
            <div className="hua-checks">
              <Casilla etiqueta="Pólipo" valor={d.polipo} onChange={(v) => set('polipo', v)} />
              <Casilla etiqueta="Adenomiosis" valor={d.adenomiosis} onChange={(v) => set('adenomiosis', v)} />
              <Casilla etiqueta="Leiomioma" valor={d.leiomioma} onChange={(v) => set('leiomioma', v)} />
              {d.leiomioma && <Casilla etiqueta="El leiomioma es submucoso" valor={d.leiomiomaSubmucoso} onChange={(v) => set('leiomiomaSubmucoso', v)} />}
              <Casilla etiqueta="Malignidad o hiperplasia" valor={d.malignidadHiperplasia} onChange={(v) => set('malignidadHiperplasia', v)} />
            </div>
          </Seccion>

          {!posmeno && (
            <>
              <Seccion indice="V" titulo="Tamizaje de coagulopatía" nota={adolescente ? 'En la adolescente con sangrado abundante es prioritario' : 'Orientado a enfermedad de von Willebrand'}>
                <div className="hua-checks">
                  <Casilla etiqueta="Sangrado menstrual abundante desde la menarca" valor={d.coag_menarcaAbundante} onChange={(v) => set('coag_menarcaAbundante', v)} />
                  <Casilla etiqueta="Hemorragia posparto" valor={d.coag_posparto} onChange={(v) => set('coag_posparto', v)} />
                  <Casilla etiqueta="Sangrado relacionado con cirugía" valor={d.coag_quirurgico} onChange={(v) => set('coag_quirurgico', v)} />
                  <Casilla etiqueta="Sangrado con extracción dental" valor={d.coag_dental} onChange={(v) => set('coag_dental', v)} />
                  <Casilla etiqueta="Epistaxis frecuente" valor={d.coag_epistaxis} onChange={(v) => set('coag_epistaxis', v)} />
                  <Casilla etiqueta="Equimosis frecuentes" valor={d.coag_equimosis} onChange={(v) => set('coag_equimosis', v)} />
                  <Casilla etiqueta="Antecedente familiar de trastorno de la coagulación" valor={d.coag_familiar} onChange={(v) => set('coag_familiar', v)} />
                </div>
                <div className="hua-eval">{r.coag.detalle}</div>
              </Seccion>

              <Seccion indice="VI" titulo="Otras causas no estructurales (COEI)">
                <div className="hua-checks">
                  <Casilla etiqueta="Disfunción ovulatoria (sospecha clínica)" valor={d.ovulatoria} onChange={(v) => set('ovulatoria', v)} />
                  <Casilla etiqueta="Causa endometrial primaria (sangrado abundante con ciclos ovulatorios, sin otra causa)" valor={d.endometrial} onChange={(v) => set('endometrial', v)} />
                  <Casilla etiqueta="Iatrogénica (anticoagulantes, hormonales, dispositivo)" valor={d.iatrogenica} onChange={(v) => set('iatrogenica', v)} />
                </div>
              </Seccion>

              <Seccion indice="VII" titulo="Deseo reproductivo" nota="Orienta el tratamiento">
                <ToggleSiNo etiqueta="¿Desea preservar la fertilidad?" full valor={d.deseoFertilidad} onChange={(v) => set('deseoFertilidad', v)} />
              </Seccion>
            </>
          )}
        </div>

        {/* -------- RESULTADOS -------- */}
        <div className="inst-res">
          <button className="inst-btn imprimir" disabled={!hayHoja} onClick={() => imprimirHoja(r.hojaPaciente)}>Imprimir hoja para la paciente</button>
          <button className="inst-btn imprimir" onClick={() => imprimirHojaClinica('hemorragia', r, paciente)}>Imprimir hoja clínica</button>

          {r.agudo && (
            <div className="inst-bloque">
              <h3>Episodio agudo</h3>
              <div className={'inst-pill ' + (r.agudo.inestable ? 'alerta' : 'aviso')}>{r.agudo.inestable ? 'Inestable' : 'Estable'}</div>
              {r.agudo.requiereHospitalizacion && (
                <div className="hua-aviso alerta">Criterios de hospitalización presentes{r.agudo.criteriosHosp.length ? ': ' + r.agudo.criteriosHosp.join('; ') : ''}.</div>
              )}
            </div>
          )}

          {(r.anemia.estado === 'leve' || r.anemia.estado === 'moderada' || r.anemia.estado === 'severa') && (
            <div className="inst-bloque">
              <h3>Anemia</h3>
              <div className={'inst-pill ' + (r.anemia.estado === 'severa' ? 'alerta' : 'aviso')}>{r.anemia.texto}</div>
            </div>
          )}

          {!posmeno && (
            <div className="inst-bloque">
              <h3>Clasificación PALM-COEIN</h3>
              {r.palm.hayClasificacion ? (
                <div className="hua-palm">
                  {r.palm.presentes.map((c, i) => (
                    <div className="hua-palm-item" key={i}><span className="hua-codigo">{c.codigo}</span><span>{c.nombre}</span></div>
                  ))}
                </div>
              ) : <p className="hua-dx-detalle">Sin componentes marcados todavía. Completa los hallazgos estructurales y el tamizaje.</p>}
            </div>
          )}

          {r.posmeno && (
            <div className="inst-bloque">
              <h3>Vía diagnóstica</h3>
              <div className={'inst-pill ' + (r.posmeno.via === 'biopsia' ? 'alerta' : 'aviso')}>{r.posmeno.via === 'biopsia' ? 'Muestreo endometrial con ecografía' : 'Vigilancia con ecografía'}</div>
              <p className="hua-dx-detalle">{r.posmeno.texto}</p>
            </div>
          )}

          <div className="inst-bloque">
            <h3>Orientación a estudio</h3>
            <ul className="hua-lista">{r.estudios.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>

          <div className="inst-bloque">
            <h3>Orientación a tratamiento</h3>
            {r.tratamiento.map((b, i) => (
              <div className="hua-tx" key={i}>
                <div className="hua-tx-obj">{b.titulo}</div>
                <ul>{b.recomendaciones.map((rec, j) => <li key={j}>{rec}</li>)}</ul>
              </div>
            ))}
          </div>

          {r.palm.presentes.some((x) => x.codigo === 'AUB-O') && (
            <Puente texto="La disfunción ovulatoria sugiere evaluar un síndrome poliendocrino subyacente." etiqueta="Evaluar síndrome poliendocrino" onIr={() => irA('sop')} />
          )}
          <BaseEvidencia evidencia={evidenciaDe('hemorragia')} />
          <div className="inst-disclaimer">
            Instrumento de apoyo a la decisión basado en los sistemas FIGO y en las recomendaciones vigentes del Colegio Americano de Obstetras y Ginecólogos, incluida la actualización de abril de 2026 para el sangrado posmenopáusico. El diagnóstico y el tratamiento corresponden al juicio clínico.
          </div>
        </div>
      </div>
    </div>
  );
}
