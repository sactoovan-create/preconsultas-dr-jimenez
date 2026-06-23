import React, { useMemo, useState, useEffect } from 'react';
import { usePaciente } from '../../core/PacienteContext.jsx';
import { evaluarAnticoncepcion, CONDICIONES, condicionesAutomaticas } from './engine.js';
import { imprimirHoja } from '../../core/printSheet.js';
import { Seccion, CampoNumero, CampoTexto, ToggleSiNo, Casilla, Puente, BaseEvidencia } from '../../core/ui.jsx';
import { evidenciaDe } from '../../core/evidencia.js';
import '../../core/instrumentLayout.css';
import './Anticoncepcion.css';

const AUTO_IDS = ['edad40', 'tabaco35menos', 'tabaco35mas', 'tabacoMenor35', 'htaModerada', 'htaSevera', 'obesidad'];
const MANUALES = CONDICIONES.filter((c) => !AUTO_IDS.includes(c.id));
const GRUPOS = [...new Set(MANUALES.map((c) => c.grupo))];
const NOMBRE_AUTO = Object.fromEntries(CONDICIONES.map((c) => [c.id, c.nombre]));

export default function Anticoncepcion() {
  const { paciente, actualizar, publicarResumen, irA } = usePaciente();
  const dem = paciente.demografia, sig = paciente.signos;

  const [d, setD] = useState({ fuma: false, fumaIntenso: false, condiciones: {} });
  const setCond = (id, val) => setD((p) => ({ ...p, condiciones: { ...p.condiciones, [id]: val } }));
  const setDem = (c, val) => actualizar('demografia', c, val);
  const setSig = (c, val) => actualizar('signos', c, val);

  const r = useMemo(() => evaluarAnticoncepcion(paciente, d), [paciente, d]);
  const auto = condicionesAutomaticas(paciente, d);
  const autoLista = Object.keys(auto);

  useEffect(() => {
    const evaluado = r.elegibilidad.nCondiciones > 0;
    const contra = r.elegibilidad.contraindicados.length;
    publicarResumen('anticoncepcion', {
      evaluado,
      estado: contra > 0 ? 'aviso' : 'ok',
      titular: `${r.elegibilidad.preferibles.length} de 6 métodos apropiados`,
      detalle: contra > 0 ? `Evitar: ${r.elegibilidad.contraindicados.map((m) => m.nombre).join(', ')}` : '',
    });
  }, [r, publicarResumen]);

  const catClase = (c) => 'antic-cat cat' + c;

  return (
    <div className="inst">
      <header className="inst-cab">
        <div>
          <div className="inst-eyebrow">Instrumento de evaluación · Criterios de elegibilidad</div>
          <h1>Anticoncepción<small>elegibilidad por método según el perfil de la paciente</small></h1>
        </div>
        <div className="inst-mono">IJ</div>
      </header>

      <div className="inst-grid">
        {/* -------- FORMULARIO -------- */}
        <div className="inst-form">
          <Seccion indice="I" titulo="Paciente" nota="La edad, la presión y el peso ajustan la elegibilidad de forma automática">
            <CampoTexto etiqueta="Nombre de la paciente" full valor={dem.nombre} onChange={(v) => setDem('nombre', v)} placeholder="Para identificar la hoja impresa" />
            <CampoNumero etiqueta="Edad" unidad="años" valor={dem.edad} onChange={(v) => setDem('edad', v)} min={10} max={60} />
            <CampoNumero etiqueta="Presión sistólica" unidad="milímetros de mercurio" valor={sig.sistolica} onChange={(v) => setSig('sistolica', v)} />
            <CampoNumero etiqueta="Presión diastólica" unidad="milímetros de mercurio" valor={sig.diastolica} onChange={(v) => setSig('diastolica', v)} />
            <CampoNumero etiqueta="Peso" unidad="kilogramos" valor={sig.peso} onChange={(v) => setSig('peso', v)} />
            <CampoNumero etiqueta="Talla" unidad="centímetros" valor={sig.talla} onChange={(v) => setSig('talla', v)} />
          </Seccion>

          <Seccion indice="II" titulo="Tabaquismo">
            <ToggleSiNo etiqueta="¿Fuma?" valor={d.fuma} onChange={(v) => setD((p) => ({ ...p, fuma: v }))} />
            {d.fuma && <ToggleSiNo etiqueta="¿Quince cigarrillos o más al día?" valor={d.fumaIntenso} onChange={(v) => setD((p) => ({ ...p, fumaIntenso: v }))} alerta />}
          </Seccion>

          {GRUPOS.map((g, gi) => (
            <Seccion key={g} indice={['III', 'IV', 'V', 'VI', 'VII'][gi]} titulo={g}>
              <div className="antic-checks">
                {MANUALES.filter((c) => c.grupo === g).map((c) => (
                  <Casilla key={c.id} etiqueta={c.nombre} valor={!!d.condiciones[c.id]} onChange={(v) => setCond(c.id, v)} />
                ))}
              </div>
            </Seccion>
          ))}
        </div>

        {/* -------- RESULTADOS -------- */}
        <div className="inst-res">
          <button className="inst-btn imprimir" disabled={r.elegibilidad.nCondiciones === 0 && autoLista.length === 0} onClick={() => imprimirHoja(r.hojaPaciente)}>Imprimir hoja para la paciente</button>

          {autoLista.length > 0 && (
            <div className="inst-bloque">
              <h3>Detectado de los datos</h3>
              <div className="antic-chips">
                {autoLista.map((id) => <span className="antic-chip" key={id}>{NOMBRE_AUTO[id]}</span>)}
              </div>
            </div>
          )}

          <div className="inst-bloque">
            <h3>Elegibilidad por método</h3>
            <div className="antic-tabla">
              {r.elegibilidad.metodos.map((m) => (
                <div className="antic-fila" key={m.id}>
                  <div className="antic-metodo">
                    <span className="antic-metodo-n">{m.nombre}</span>
                    {m.detalle && <span className="antic-metodo-d">{m.detalle}</span>}
                    {m.causas.length > 0 && <span className="antic-causa">{m.causas.join('; ')}</span>}
                  </div>
                  <div className={catClase(m.categoria)} title={m.recomendacion}>
                    <span className="antic-cat-n">{m.categoria}</span>
                    <span className="antic-cat-r">{m.recomendacion}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="antic-leyenda">
              Categorías: 1 sin restricción · 2 generalmente apropiado · 3 generalmente no recomendado · 4 no usar. Se muestran las categorías de inicio del método.
            </div>
          </div>

          {(r.presentes.multiplesRcv || r.presentes.htaSevera) && (
            <Puente texto="Perfil de riesgo cardiovascular relevante; conviene calcular el riesgo global de la paciente." etiqueta="Evaluar riesgo cardiometabólico" onIr={() => irA('cardiometabolico')} />
          )}

          <BaseEvidencia evidencia={evidenciaDe('anticoncepcion')} />

          <div className="inst-disclaimer">
            Instrumento de apoyo a la decisión basado en los criterios médicos de elegibilidad de la Organización Mundial de la Salud, sexta edición. Las categorías corresponden al inicio del método; algunas condiciones cambian en la continuación. La elección es compartida con la paciente.
          </div>
        </div>
      </div>
    </div>
  );
}
