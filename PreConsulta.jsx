import React, { useState } from 'react';
import { usePaciente } from './core/PacienteContext.jsx';
import './PreConsulta.css';

/**
 * Pre-consulta en modo paciente. Dos partes:
 *  - Esencial: síntomas que la paciente auto-reporta (menopausia y dolor). Prellenan
 *    los instrumentos del médico.
 *  - Opcional: historia clínica (motivo, antecedentes, medicamentos, familia). Ayuda
 *    a llegar con el expediente casi lleno, pero la paciente puede omitirla y enviar.
 *
 * Pensada para enviarse por enlace y llenarse desde casa antes de la consulta.
 */

const SINTOMAS = [
  { id: 'mrs_bochornos', texto: 'Bochornos o sudoraciones repentinas' },
  { id: 'mrs_cardiaco', texto: 'Sensación de que el corazón late fuerte o rápido' },
  { id: 'mrs_sueno', texto: 'Dificultad para dormir' },
  { id: 'mrs_musculo', texto: 'Dolores de músculos o articulaciones' },
  { id: 'mrs_animo', texto: 'Sentirte triste o desanimada' },
  { id: 'mrs_irritable', texto: 'Sentirte irritable o de mal humor' },
  { id: 'mrs_ansiedad', texto: 'Sentirte nerviosa o ansiosa' },
  { id: 'mrs_agotamiento', texto: 'Cansancio físico o mental' },
  { id: 'mrs_sexual', texto: 'Cambios o molestias en tu vida sexual' },
  { id: 'mrs_vejiga', texto: 'Molestias al orinar o para controlar la orina' },
  { id: 'mrs_sequedad', texto: 'Sequedad vaginal' },
];
const ESCALA = ['Nada', 'Leve', 'Moderado', 'Intenso', 'Muy intenso'];

function Fila({ texto, valor, onChange }) {
  return (
    <div className="pc-fila">
      <div className="pc-fila-txt">{texto}</div>
      <div className="pc-fila-ops">
        {ESCALA.map((et, n) => (
          <button key={n} className={'pc-op' + (valor === n ? ' on' : '')} onClick={() => onChange(n)}>
            <span className="pc-op-n">{n}</span>
            <span className="pc-op-e">{et}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Controles sencillos en el estilo cálido de la pre-consulta.
function Texto({ etiqueta, valor, onChange, area, placeholder }) {
  return (
    <label className="pc-campo pc-full">
      <span>{etiqueta}</span>
      {area
        ? <textarea rows={3} value={valor || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        : <input type="text" value={valor || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />}
    </label>
  );
}
function Numero({ etiqueta, valor, onChange, placeholder }) {
  return (
    <label className="pc-campo pc-campo-chico">
      <span>{etiqueta}</span>
      <input type="number" min="0" value={valor ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} placeholder={placeholder} />
    </label>
  );
}
function SiNo({ etiqueta, valor, onChange }) {
  return (
    <div className="pc-sino">
      <span>{etiqueta}</span>
      <div className="pc-sino-btns">
        <button className={valor === true ? 'on' : ''} onClick={() => onChange(true)}>Sí</button>
        <button className={valor === false ? 'on' : ''} onClick={() => onChange(false)}>No</button>
      </div>
    </div>
  );
}
function Casilla({ etiqueta, valor, onChange }) {
  return (
    <label className="pc-casilla">
      <input type="checkbox" checked={!!valor} onChange={(e) => onChange(e.target.checked)} />
      <span>{etiqueta}</span>
    </label>
  );
}

export default function PreConsulta() {
  const { paciente, actualizar, guardarAutoReporte } = usePaciente();
  const dem = paciente.demografia;
  const ar = paciente.autoReporte || {};

  const [mrs, setMrs] = useState(() => ({ ...(ar.mrs) }));
  const [dolor, setDolor] = useState(() => ar.dolor || { tiene: false, intensidad: null, meses: null });
  const [hc, setHc] = useState(() => ar.hc || {});
  const [guardado, setGuardado] = useState(false);

  const setSintoma = (id, n) => { setMrs((p) => ({ ...p, [id]: n })); setGuardado(false); };
  const setH = (k, val) => { setHc((p) => ({ ...p, [k]: val })); setGuardado(false); };

  const guardar = () => { guardarAutoReporte({ mrs, dolor, hc }); setGuardado(true); };

  return (
    <div className="pc">
      <header className="pc-cab">
        <div className="pc-marca">dr. iván jiménez martínez<small>Ginecología</small></div>
        <div className="pc-mono">IJ</div>
      </header>

      <div className="pc-cuerpo">
        <h1 className="pc-titulo">Antes de tu consulta</h1>
        <p className="pc-intro">Tómate un momento para responder estas preguntas. Tus respuestas le ayudan al doctor a conocer mejor cómo te sientes y a dedicar la consulta a lo que más te importa. No hay respuestas correctas o incorrectas.</p>

        <div className="pc-seccion">
          <div className="pc-seccion-t">Cuéntanos un poco de ti</div>
          <div className="pc-datos">
            <label className="pc-campo">
              <span>Tu nombre</span>
              <input type="text" value={dem.nombre || ''} onChange={(e) => actualizar('demografia', 'nombre', e.target.value)} placeholder="Nombre y apellido" />
            </label>
            <label className="pc-campo pc-campo-chico">
              <span>Tu edad</span>
              <input type="number" value={dem.edad ?? ''} onChange={(e) => actualizar('demografia', 'edad', e.target.value === '' ? null : Number(e.target.value))} placeholder="años" />
            </label>
          </div>
        </div>

        <div className="pc-seccion">
          <div className="pc-seccion-t">¿Has tenido alguna de estas molestias últimamente?</div>
          <div className="pc-seccion-d">Para cada una, marca qué tanto la has sentido.</div>
          <div className="pc-escala-cab"><span>0 Nada</span><span>4 Muy intenso</span></div>
          {SINTOMAS.map((s) => <Fila key={s.id} texto={s.texto} valor={mrs[s.id] ?? null} onChange={(n) => setSintoma(s.id, n)} />)}
        </div>

        <div className="pc-seccion">
          <div className="pc-seccion-t">Dolor en el vientre o la pelvis</div>
          <label className="pc-check">
            <input type="checkbox" checked={!!dolor.tiene} onChange={(e) => { setDolor((p) => ({ ...p, tiene: e.target.checked })); setGuardado(false); }} />
            <span>Tengo dolor en la parte baja del vientre o la pelvis</span>
          </label>
          {dolor.tiene && (
            <div className="pc-dolor">
              <label className="pc-campo">
                <span>¿Qué tan fuerte es, del 0 (nada) al 10 (lo peor)?</span>
                <input type="number" min="0" max="10" value={dolor.intensidad ?? ''} onChange={(e) => { setDolor((p) => ({ ...p, intensidad: e.target.value === '' ? null : Number(e.target.value) })); setGuardado(false); }} placeholder="0 a 10" />
              </label>
              <label className="pc-campo">
                <span>¿Desde hace cuántos meses?</span>
                <input type="number" min="0" value={dolor.meses ?? ''} onChange={(e) => { setDolor((p) => ({ ...p, meses: e.target.value === '' ? null : Number(e.target.value) })); setGuardado(false); }} placeholder="meses" />
              </label>
            </div>
          )}
        </div>

        {/* ---------------- PARTE OPCIONAL ---------------- */}
        <div className="pc-opcional-sep">
          <div className="pc-opcional-t">Lo siguiente es opcional</div>
          <div className="pc-opcional-d">Si tienes unos minutos más, completar esta parte hace que tu consulta rinda mucho mejor, porque tu doctor llega ya con tu historia. Pero si tienes prisa, puedes dejarla en blanco y enviar de una vez. Tú decides.</div>
        </div>

        <div className="pc-seccion pc-op">
          <div className="pc-seccion-t">Motivo de tu visita <em>opcional</em></div>
          <Texto etiqueta="¿Qué te gustaría revisar o resolver en esta consulta?" area valor={hc.motivo} onChange={(v) => setH('motivo', v)} placeholder="Cuéntanos con tus palabras" />
        </div>

        <div className="pc-seccion pc-op">
          <div className="pc-seccion-t">Tus antecedentes ginecológicos <em>opcional</em></div>
          <div className="pc-datos">
            <Numero etiqueta="Edad de tu primera regla" valor={hc.edadMenarca} onChange={(v) => setH('edadMenarca', v)} placeholder="años" />
            <Numero etiqueta="Embarazos" valor={hc.embarazos} onChange={(v) => setH('embarazos', v)} />
            <Numero etiqueta="Partos" valor={hc.partos} onChange={(v) => setH('partos', v)} />
            <Numero etiqueta="Cesáreas" valor={hc.cesareas} onChange={(v) => setH('cesareas', v)} />
            <Numero etiqueta="Pérdidas o abortos" valor={hc.abortos} onChange={(v) => setH('abortos', v)} />
          </div>
          <SiNo etiqueta="¿Tus reglas son regulares?" valor={hc.reglasRegulares} onChange={(v) => setH('reglasRegulares', v)} />
          <Texto etiqueta="¿Usas algún método anticonceptivo? ¿Cuál?" valor={hc.anticonceptivo} onChange={(v) => setH('anticonceptivo', v)} placeholder="Por ejemplo, pastillas, dispositivo, ninguno" />
          <Texto etiqueta="¿Cuándo fue tu último Papanicolaou y qué resultado tuvo?" valor={hc.ultimoPap} onChange={(v) => setH('ultimoPap', v)} placeholder="Fecha aproximada y resultado si lo recuerdas" />
          <Texto etiqueta="¿Te han operado de algo ginecológico?" valor={hc.cirugiasGineco} onChange={(v) => setH('cirugiasGineco', v)} placeholder="Por ejemplo, matriz, ovarios, quistes" />
        </div>

        <div className="pc-seccion pc-op">
          <div className="pc-seccion-t">Tu salud general <em>opcional</em></div>
          <div className="pc-seccion-d">¿Te han diagnosticado alguna de estas? Marca las que apliquen.</div>
          <div className="pc-casillas">
            <Casilla etiqueta="Diabetes" valor={hc.enfDiabetes} onChange={(v) => setH('enfDiabetes', v)} />
            <Casilla etiqueta="Presión alta" valor={hc.enfHipertension} onChange={(v) => setH('enfHipertension', v)} />
            <Casilla etiqueta="Problemas de tiroides" valor={hc.enfTiroides} onChange={(v) => setH('enfTiroides', v)} />
            <Casilla etiqueta="Problemas del corazón" valor={hc.enfCorazon} onChange={(v) => setH('enfCorazon', v)} />
            <Casilla etiqueta="Has tenido cáncer" valor={hc.enfCancer} onChange={(v) => setH('enfCancer', v)} />
          </div>
          <Texto etiqueta="¿Alguna otra enfermedad?" valor={hc.enfOtra} onChange={(v) => setH('enfOtra', v)} placeholder="Escríbela aquí" />
          <Texto etiqueta="¿Te han operado de algo más?" valor={hc.cirugias} onChange={(v) => setH('cirugias', v)} placeholder="Cirugías que hayas tenido" />
          <SiNo etiqueta="¿Fumas?" valor={hc.fuma} onChange={(v) => setH('fuma', v)} />
          <SiNo etiqueta="¿Tomas bebidas alcohólicas?" valor={hc.alcohol} onChange={(v) => setH('alcohol', v)} />
        </div>

        <div className="pc-seccion pc-op">
          <div className="pc-seccion-t">Medicamentos y alergias <em>opcional</em></div>
          <Texto etiqueta="¿Tomas algún medicamento de forma regular? ¿Cuáles?" area valor={hc.medicamentos} onChange={(v) => setH('medicamentos', v)} placeholder="Incluye vitaminas y suplementos" />
          <Texto etiqueta="¿Eres alérgica a algún medicamento?" valor={hc.alergias} onChange={(v) => setH('alergias', v)} placeholder="¿A cuál?" />
        </div>

        <div className="pc-seccion pc-op">
          <div className="pc-seccion-t">Antecedentes en tu familia <em>opcional</em></div>
          <div className="pc-seccion-d">¿En tu familia cercana hay casos de alguna de estas? Marca las que apliquen.</div>
          <div className="pc-casillas">
            <Casilla etiqueta="Cáncer de mama" valor={hc.famCancerMama} onChange={(v) => setH('famCancerMama', v)} />
            <Casilla etiqueta="Cáncer de ovario" valor={hc.famCancerOvario} onChange={(v) => setH('famCancerOvario', v)} />
            <Casilla etiqueta="Diabetes" valor={hc.famDiabetes} onChange={(v) => setH('famDiabetes', v)} />
            <Casilla etiqueta="Presión alta" valor={hc.famHipertension} onChange={(v) => setH('famHipertension', v)} />
            <Casilla etiqueta="Osteoporosis" valor={hc.famOsteoporosis} onChange={(v) => setH('famOsteoporosis', v)} />
          </div>
          <Texto etiqueta="¿Algún otro antecedente importante en tu familia?" valor={hc.famOtra} onChange={(v) => setH('famOtra', v)} placeholder="Escríbelo aquí" />
        </div>

        <div className="pc-acciones">
          <button className="pc-guardar" onClick={guardar}>Guardar mis respuestas</button>
          <div className="pc-acciones-nota">Puedes enviar aunque hayas dejado en blanco la parte opcional.</div>
          {guardado && <div className="pc-ok">Gracias. Tus respuestas quedaron guardadas para tu consulta.</div>}
        </div>
      </div>
    </div>
  );
}
