import React, { useMemo, useState, useEffect } from 'react';
import { usePaciente } from '../../core/PacienteContext.jsx';
import { evaluarEndometriosis } from './engine.js';
import { imprimirHoja } from '../../core/printSheet.js';
import { imprimirHojaClinica } from '../../core/hojaClinica.js';
import { Seccion, CampoNumero, CampoTexto, Selector, ToggleSiNo, Casilla , Puente, BaseEvidencia } from '../../core/ui.jsx';
import { evidenciaDe } from '../../core/evidencia.js';
import '../../core/instrumentLayout.css';
import './Endometriosis.css';

const NIVEL_PILL = { confirmado_imagen: 'ok', alta: 'alerta', intermedia: 'aviso', baja: '' };
const NIVEL_TXT = { confirmado_imagen: 'Compatible por imagen', alta: 'Alta sospecha clínica', intermedia: 'Sospecha intermedia', baja: 'Sin síntomas cardinales' };
const gradoEnzian = [{ valor: '0', etiqueta: 'Sin afectación' }, { valor: '1', etiqueta: 'Grado 1' }, { valor: '2', etiqueta: 'Grado 2' }, { valor: '3', etiqueta: 'Grado 3' }];

export default function Endometriosis() {
  const { paciente, actualizar, publicarResumen, irA } = usePaciente();
  const dem = paciente.demografia;

  const [d, setD] = useState(() => ({
    poblacion: (dem.edad && dem.edad < 18) ? 'adolescente' : 'adulta',
    dismenorreaSevera: false, dispareunia: false, dolorPelvicoCronico: false, dischezia: false, sintomasUrinarios: false, infertilidad: false,
    nodularidad: false, masaAnexial: false, uteroFijo: false,
    endometriomaImagen: false, endometriosisProfundaImagen: false,
    objetivoFertilidad: false,
    rasrmTotal: null, rasrmLesion: null,
    enzianA: '0', enzianB: '0', enzianC: '0', enzianFA: false, enzianFB: false, enzianFI: false, enzianFU: false, enzianFO: false,
    efiEdad: dem.edad || null, efiAniosInfertilidad: null, efiGestacionPrevia: null, lfTotal: null,
  }));
  const set = (k, val) => setD((p) => ({ ...p, [k]: val }));

  const r = useMemo(() => evaluarEndometriosis(paciente, d), [paciente, d]);
  const adolescente = d.poblacion === 'adolescente';
  const fertilidad = d.objetivoFertilidad;
  const setDem = (c, val) => actualizar('demografia', c, val);
  const hayHoja = r.clinico.sintomas.length > 0;

  useEffect(() => {
    const evaluado = r.clinico.nSintomas > 0 || r.clinico.imagenPositiva || !!r.rasrm || r.enzian.hay;
    publicarResumen('endometriosis', {
      evaluado,
      estado: r.clinico.nivel === 'baja' ? 'ok' : 'aviso',
      titular: NIVEL_TXT[r.clinico.nivel],
      detalle: r.rasrm ? `Estadio ${r.rasrm.estadio}, ${r.rasrm.nombre}` : (r.efi ? `Índice de fertilidad ${r.efi.total} de 10` : ''),
    });
  }, [r, publicarResumen]);

  return (
    <div className="inst">
      <header className="inst-cab">
        <div>
          <div className="inst-eyebrow">Instrumento diagnóstico · Guía ESHRE 2022</div>
          <h1>Endometriosis<small>diagnóstico clínico, estadificación y orientación a tratamiento</small></h1>
        </div>
        <div className="inst-mono">IJ</div>
      </header>

      <div className="inst-grid">
        {/* -------- FORMULARIO -------- */}
        <div className="inst-form">
          <Seccion indice="I" titulo="Paciente y eje de manejo">
            <CampoTexto etiqueta="Nombre de la paciente" full valor={dem.nombre} onChange={(v) => setDem('nombre', v)} placeholder="Para identificar la hoja impresa" />
            <CampoNumero etiqueta="Edad" unidad="años" valor={dem.edad} onChange={(v) => setDem('edad', v)} min={10} max={60} />
            <Selector etiqueta="Población" valor={d.poblacion} onChange={(v) => set('poblacion', v)}
              opciones={[{ valor: 'adulta', etiqueta: 'Adulta' }, { valor: 'adolescente', etiqueta: 'Adolescente' }]} />
            <Selector etiqueta="Eje principal de manejo" valor={fertilidad ? 'fertilidad' : 'dolor'} onChange={(v) => set('objetivoFertilidad', v === 'fertilidad')}
              opciones={[{ valor: 'dolor', etiqueta: 'Dolor' }, { valor: 'fertilidad', etiqueta: 'Fertilidad' }]} />
          </Seccion>

          <Seccion indice="II" titulo="Síntomas cardinales">
            <div className="end-checks">
              <Casilla etiqueta="Dismenorrea intensa o progresiva" valor={d.dismenorreaSevera} onChange={(v) => set('dismenorreaSevera', v)} />
              <Casilla etiqueta="Dispareunia profunda" valor={d.dispareunia} onChange={(v) => set('dispareunia', v)} />
              <Casilla etiqueta="Dolor pélvico no menstrual" valor={d.dolorPelvicoCronico} onChange={(v) => set('dolorPelvicoCronico', v)} />
              <Casilla etiqueta="Dischezia o síntomas intestinales cíclicos" valor={d.dischezia} onChange={(v) => set('dischezia', v)} />
              <Casilla etiqueta="Síntomas urinarios cíclicos (disuria o hematuria)" valor={d.sintomasUrinarios} onChange={(v) => set('sintomasUrinarios', v)} />
              <Casilla etiqueta="Infertilidad" valor={d.infertilidad} onChange={(v) => set('infertilidad', v)} />
            </div>
          </Seccion>

          <Seccion indice="III" titulo="Exploración">
            <div className="end-checks">
              <Casilla etiqueta="Nodularidad o dolor en ligamentos uterosacros o fondo de saco" valor={d.nodularidad} onChange={(v) => set('nodularidad', v)} />
              <Casilla etiqueta="Masa anexial sugestiva de endometrioma" valor={d.masaAnexial} onChange={(v) => set('masaAnexial', v)} />
              <Casilla etiqueta="Útero en retroversión fija o movilidad reducida" valor={d.uteroFijo} onChange={(v) => set('uteroFijo', v)} />
            </div>
          </Seccion>

          <Seccion indice="IV" titulo="Imagen" nota="Un hallazgo positivo permite el diagnóstico sin laparoscopia">
            <div className="end-checks">
              <Casilla etiqueta="Endometrioma en ecografía o resonancia" valor={d.endometriomaImagen} onChange={(v) => set('endometriomaImagen', v)} />
              <Casilla etiqueta="Endometriosis profunda en ecografía o resonancia" valor={d.endometriosisProfundaImagen} onChange={(v) => set('endometriosisProfundaImagen', v)} />
            </div>
          </Seccion>

          <Seccion indice="V" titulo="Estadificación revisada" nota="Para cuando hay hallazgos quirúrgicos o de imagen avanzada">
            <CampoNumero etiqueta="Puntaje total" unidad="puntos" valor={d.rasrmTotal} onChange={(v) => set('rasrmTotal', v)} nota={r.rasrm ? `Estadio ${r.rasrm.estadio}, ${r.rasrm.nombre}` : ''} />
            <CampoNumero etiqueta="Puntaje de lesión" unidad="puntos, para el índice de fertilidad" valor={d.rasrmLesion} onChange={(v) => set('rasrmLesion', v)} />
          </Seccion>

          <Seccion indice="VI" titulo="Clasificación Enzian" nota="Enfermedad profunda; por imagen o cirugía">
            <Selector etiqueta="A · tabique rectovaginal y vagina" valor={d.enzianA} onChange={(v) => set('enzianA', v)} opciones={gradoEnzian} />
            <Selector etiqueta="B · ligamentos uterosacros y pared pélvica" valor={d.enzianB} onChange={(v) => set('enzianB', v)} opciones={gradoEnzian} />
            <Selector etiqueta="C · recto y sigmoides" valor={d.enzianC} onChange={(v) => set('enzianC', v)} opciones={gradoEnzian} />
            <div className="end-checks">
              <Casilla etiqueta="FA · adenomiosis" valor={d.enzianFA} onChange={(v) => set('enzianFA', v)} />
              <Casilla etiqueta="FB · vejiga" valor={d.enzianFB} onChange={(v) => set('enzianFB', v)} />
              <Casilla etiqueta="FI · intestino" valor={d.enzianFI} onChange={(v) => set('enzianFI', v)} />
              <Casilla etiqueta="FU · uréter" valor={d.enzianFU} onChange={(v) => set('enzianFU', v)} />
              <Casilla etiqueta="FO · otra localización" valor={d.enzianFO} onChange={(v) => set('enzianFO', v)} />
            </div>
          </Seccion>

          {fertilidad && (
            <Seccion indice="VII" titulo="Índice de fertilidad" nota="Requiere hallazgos quirúrgicos para ser válido">
              <CampoNumero etiqueta="Edad" unidad="años" valor={d.efiEdad} onChange={(v) => set('efiEdad', v)} min={18} max={50} />
              <CampoNumero etiqueta="Años de infertilidad" unidad="años" valor={d.efiAniosInfertilidad} onChange={(v) => set('efiAniosInfertilidad', v)} min={0} max={25} />
              <CampoNumero etiqueta="Puntaje de función mínima" unidad="0 a 8 (trompa, fimbria, ovario por lado)" valor={d.lfTotal} onChange={(v) => set('lfTotal', v)} min={0} max={8} />
              <ToggleSiNo etiqueta="Gestación previa" valor={d.efiGestacionPrevia} onChange={(v) => set('efiGestacionPrevia', v)} />
            </Seccion>
          )}
        </div>

        {/* -------- RESULTADOS -------- */}
        <div className="inst-res">
          <button className="inst-btn imprimir" disabled={!hayHoja} onClick={() => imprimirHoja(r.hojaPaciente)}>Imprimir hoja para la paciente</button>
          <button className="inst-btn imprimir" onClick={() => imprimirHojaClinica('endometriosis', r, paciente)}>Imprimir hoja clínica</button>

          <div className="inst-bloque">
            <h3>Probabilidad clínica</h3>
            <div className={'inst-pill ' + (NIVEL_PILL[r.clinico.nivel] || '')}>{NIVEL_TXT[r.clinico.nivel]}</div>
            <p className="end-detalle">{r.clinico.mensaje}</p>
            {r.clinico.sintomas.length > 0 && <div className="end-eval"><b>Síntomas:</b> {r.clinico.sintomas.join('; ')}.</div>}
            {r.clinico.signos.length > 0 && <div className="end-eval"><b>Exploración:</b> {r.clinico.signos.join('; ')}.</div>}
          </div>

          {(r.rasrm || r.enzian.hay || r.efi) && (
            <div className="inst-bloque">
              <h3>Estadificación</h3>
              {r.rasrm && (
                <div className="end-estadio">
                  <div className="end-est-num">{r.rasrm.estadio}</div>
                  <div><div className="end-est-t">Estadio {r.rasrm.estadio}, {r.rasrm.nombre}</div><div className="end-est-s">Clasificación revisada · {r.rasrm.puntaje} puntos</div></div>
                </div>
              )}
              {r.efi && (
                <div className="end-efi">
                  <div className="end-efi-barra">
                    <div className="end-efi-relleno" style={{ width: (r.efi.total * 10) + '%' }} />
                  </div>
                  <div className="end-efi-txt">Índice de fertilidad <b>{r.efi.total} de 10</b> · pronóstico {r.efi.pronostico}</div>
                </div>
              )}
              {r.enzian.hay && (
                <div className="end-eval">
                  <b>Enzian:</b> {[...r.enzian.compartimentos, ...r.enzian.focales].join('; ')}.
                </div>
              )}
            </div>
          )}

          <div className="inst-bloque">
            <h3>Orientación a estudio</h3>
            <ul className="end-lista">{r.estudio.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>

          <div className="inst-bloque">
            <h3>Orientación a tratamiento</h3>
            {r.tratamiento.map((b, i) => (
              <div className="end-tx" key={i}>
                <div className="end-tx-eje">{b.eje}</div>
                <ul>{b.recomendaciones.map((rec, j) => <li key={j}>{rec}</li>)}</ul>
              </div>
            ))}
          </div>

          {r.clinico.nivel === 'baja' && r.clinico.nSintomas > 0 && (
            <Puente texto="Dolor sin datos cardinales de endometriosis; conviene un abordaje multisistémico del dolor pélvico." etiqueta="Evaluar dolor pélvico crónico" onIr={() => irA('dolor-pelvico')} />
          )}
          <BaseEvidencia evidencia={evidenciaDe('endometriosis')} />
          <div className="inst-disclaimer">
            Instrumento de apoyo a la decisión basado en la guía de endometriosis de la European Society of Human Reproduction and Embryology, 2022. La probabilidad clínica es orientativa y no sustituye el juicio del especialista. El índice de fertilidad solo es válido con hallazgos quirúrgicos.
          </div>
        </div>
      </div>
    </div>
  );
}
