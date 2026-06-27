import React, { useMemo, useState, useEffect } from 'react';
import { usePaciente } from '../../core/PacienteContext.jsx';
import { evaluarIncontinencia, ITEMS_ESFUERZO, ITEMS_URGENCIA } from './engine.js';
import { imprimirHoja } from '../../core/printSheet.js';
import { imprimirHojaClinica } from '../../core/hojaClinica.js';
import { imprimirDiario } from '../../core/printDiario.js';
import { Seccion, CampoNumero, CampoTexto, ToggleSiNo, Casilla, BaseEvidencia } from '../../core/ui.jsx';
import { evidenciaDe } from '../../core/evidencia.js';
import '../../core/instrumentLayout.css';
import './Incontinencia.css';

function Escala({ texto, valor, onChange, niveles = 6, etiquetas }) {
  return (
    <div className="iu-item">
      <div className="iu-item-txt">{texto}</div>
      <div className="iu-item-btns">
        {Array.from({ length: niveles }).map((_, n) => (
          <button key={n} className={valor === n ? 'on' : ''} title={etiquetas ? etiquetas[n] : String(n)} onClick={() => onChange(n)}>{n}</button>
        ))}
      </div>
    </div>
  );
}

const SEV_PILL = { ok: 'ok', aviso: 'aviso', alerta: 'alerta' };
const FREC_ETQ = ['Nunca', 'Una vez por semana', 'Dos o tres por semana', 'Una vez al día', 'Varias al día', 'Continuo'];
const CANT_ETQ = ['Nada', 'Gotas', 'Poca', 'Moderada o mucha'];

export default function Incontinencia() {
  const { paciente, actualizar, publicarResumen } = usePaciente();
  const dem = paciente.demografia;

  const [d, setD] = useState({ tieneEscapes: false, usaProteccion: false, tieneDiario: false });
  const set = (k, val) => setD((p) => ({ ...p, [k]: val }));
  const setDem = (c, val) => actualizar('demografia', c, val);

  const r = useMemo(() => evaluarIncontinencia(paciente, d), [paciente, d]);

  useEffect(() => {
    const evaluado = r.presencia || !!r.severidad || d.tieneDiario;
    publicarResumen('incontinencia', {
      evaluado,
      estado: r.severidad ? r.severidad.estado : (r.banderas.length ? 'alerta' : (r.presencia ? 'aviso' : 'ok')),
      titular: r.clas.etiqueta,
      detalle: r.severidad ? `Severidad ${r.severidad.nivel}` : '',
      metrica: r.severidad ? { clave: 'iciq', nombre: 'Severidad urinaria', valor: r.severidad.puntaje, unidad: 'puntos', min: 0, max: 21, mejorAbajo: true } : null,
    });
  }, [r, d.tieneDiario, publicarResumen]);

  return (
    <div className="inst">
      <header className="inst-cab">
        <div>
          <div className="inst-eyebrow">Instrumento de evaluación · Continencia</div>
          <h1>Incontinencia urinaria<small>identificación, tipo, severidad y diario miccional</small></h1>
        </div>
        <div className="inst-mono">IJ</div>
      </header>

      <div className="inst-grid">
        {/* -------- FORMULARIO -------- */}
        <div className="inst-form">
          <Seccion indice="I" titulo="Paciente">
            <CampoTexto etiqueta="Nombre de la paciente" full valor={dem.nombre} onChange={(v) => setDem('nombre', v)} placeholder="Para identificar la hoja impresa" />
            <CampoNumero etiqueta="Edad" unidad="años" valor={dem.edad} onChange={(v) => setDem('edad', v)} min={18} max={95} />
          </Seccion>

          <Seccion indice="II" titulo="Identificación" nota="Preguntas para detectar la pérdida de orina">
            <ToggleSiNo etiqueta="¿Se le escapa la orina de manera involuntaria?" full valor={d.tieneEscapes} onChange={(v) => set('tieneEscapes', v)} />
            <ToggleSiNo etiqueta="¿Usa toalla o protección para los escapes?" full valor={d.usaProteccion} onChange={(v) => set('usaProteccion', v)} />
          </Seccion>

          <Seccion indice="III" titulo="Síntomas de esfuerzo" nota="Frecuencia de cada situación, de 0 (nunca) a 5 (siempre)">
            {ITEMS_ESFUERZO.map((i) => <Escala key={i.id} texto={i.texto} valor={d[i.id] ?? null} onChange={(n) => set(i.id, n)} />)}
          </Seccion>

          <Seccion indice="IV" titulo="Síntomas de urgencia" nota="Frecuencia de cada situación, de 0 (nunca) a 5 (siempre)">
            {ITEMS_URGENCIA.map((i) => <Escala key={i.id} texto={i.texto} valor={d[i.id] ?? null} onChange={(n) => set(i.id, n)} />)}
          </Seccion>

          <Seccion indice="V" titulo="Severidad e impacto">
            <Escala texto="¿Con qué frecuencia pierde orina?" valor={d.frecuenciaPerdida ?? null} onChange={(n) => set('frecuenciaPerdida', n)} etiquetas={FREC_ETQ} />
            <Escala texto="¿Qué cantidad pierde habitualmente?" valor={d.cantidadPerdida ?? null} onChange={(n) => set('cantidadPerdida', n)} niveles={4} etiquetas={CANT_ETQ} />
            <CampoNumero etiqueta="¿Cuánto interfiere en su vida diaria? (0 a 10)" full valor={d.impactoVida} onChange={(v) => set('impactoVida', v)} min={0} max={10} />
          </Seccion>

          <Seccion indice="VI" titulo="Hábitos de vejiga">
            <div className="iu-checks">
              <Casilla etiqueta="Consume café, té o refrescos de cola" valor={!!d.cafeina} onChange={(v) => set('cafeina', v)} />
              <Casilla etiqueta="Consume alcohol" valor={!!d.alcohol} onChange={(v) => set('alcohol', v)} />
              <Casilla etiqueta="Ingesta de líquidos muy alta o muy restringida" valor={!!d.liquidosAltos} onChange={(v) => set('liquidosAltos', v)} />
              <Casilla etiqueta="Orina por si acaso, sin tener ganas" valor={!!d.vaciaPorSiAcaso} onChange={(v) => set('vaciaPorSiAcaso', v)} />
            </div>
            <CampoNumero etiqueta="Veces que orina al día" valor={d.frecuenciaDiurna} onChange={(v) => set('frecuenciaDiurna', v)} min={0} max={30} />
            <CampoNumero etiqueta="Veces que se levanta a orinar de noche" valor={d.nicturia} onChange={(v) => set('nicturia', v)} min={0} max={15} />
          </Seccion>

          <Seccion indice="VII" titulo="Diario miccional" nota="Datos que la paciente trae de su registro">
            <ToggleSiNo etiqueta="¿Trae un diario miccional?" full valor={d.tieneDiario} onChange={(v) => set('tieneDiario', v)} />
            {d.tieneDiario && (
              <>
                <CampoNumero etiqueta="Micciones diurnas" valor={d.diarioFrecuenciaDiurna} onChange={(v) => set('diarioFrecuenciaDiurna', v)} min={0} max={30} />
                <CampoNumero etiqueta="Episodios nocturnos" valor={d.diarioNicturia} onChange={(v) => set('diarioNicturia', v)} min={0} max={15} />
                <CampoNumero etiqueta="Episodios de incontinencia" valor={d.diarioEpisodios} onChange={(v) => set('diarioEpisodios', v)} min={0} max={30} />
                <CampoNumero etiqueta="Volumen máximo" unidad="mililitros" valor={d.diarioVolumenMax} onChange={(v) => set('diarioVolumenMax', v)} min={0} max={1000} />
              </>
            )}
          </Seccion>

          <Seccion indice="VIII" titulo="Banderas de alarma">
            <div className="iu-checks">
              <Casilla etiqueta="Sangre en la orina" valor={!!d.hematuria} onChange={(v) => set('hematuria', v)} />
              <Casilla etiqueta="Dolor vesical o al orinar" valor={!!d.dolorVesical} onChange={(v) => set('dolorVesical', v)} />
              <Casilla etiqueta="Infecciones urinarias recurrentes" valor={!!d.infeccionesRecurrentes} onChange={(v) => set('infeccionesRecurrentes', v)} />
              <Casilla etiqueta="Sensación de vaciamiento incompleto" valor={!!d.vaciamientoIncompleto} onChange={(v) => set('vaciamientoIncompleto', v)} />
              <Casilla etiqueta="Prolapso de órganos pélvicos" valor={!!d.prolapso} onChange={(v) => set('prolapso', v)} />
            </div>
          </Seccion>
        </div>

        {/* -------- RESULTADOS -------- */}
        <div className="inst-res">
          <div className="iu-botones">
            <button className="inst-btn imprimir" onClick={() => imprimirHoja(r.hojaPaciente)}>Hoja para la paciente</button>
          <button className="inst-btn imprimir" onClick={() => imprimirHojaClinica('incontinencia', r, paciente)}>Imprimir hoja clínica</button>
            <button className="inst-btn diario" onClick={() => imprimirDiario(r.hojaDiario)}>Diario miccional en blanco</button>
          </div>

          <div className="inst-bloque">
            <h3>Tipo de incontinencia</h3>
            <div className={'inst-pill ' + (r.clas.tipo === 'ninguna' ? '' : 'aviso')}>{r.clas.etiqueta}</div>
            {r.clas.predominio && <p className="iu-detalle">Predominio de {r.clas.predominio}.</p>}
            {(r.clas.esfuerzo > 0 || r.clas.urgencia > 0) && <div className="iu-puntajes">Esfuerzo {r.clas.esfuerzo} de 15 · Urgencia {r.clas.urgencia} de 15</div>}
          </div>

          {r.severidad && (
            <div className="inst-bloque">
              <h3>Severidad e impacto</h3>
              <div className={'inst-pill ' + (SEV_PILL[r.severidad.estado] || '')}>{r.severidad.nivel}</div>
              <p className="iu-detalle">Puntaje de síntomas e impacto: {r.severidad.puntaje} de 21.</p>
            </div>
          )}

          {r.banderas.length > 0 && (
            <div className="inst-bloque">
              <h3>Banderas de alarma</h3>
              {r.banderas.map((b, i) => <div className="iu-alerta" key={i}>{b}</div>)}
            </div>
          )}

          {r.diario && (
            <div className="inst-bloque">
              <h3>Diario miccional</h3>
              <ul className="iu-lista">{r.diario.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}

          {r.habitos.length > 0 && (
            <div className="inst-bloque">
              <h3>Hábitos a corregir</h3>
              <ul className="iu-lista">{r.habitos.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}

          <div className="inst-bloque">
            <h3>Orientación de manejo</h3>
            {r.tratamiento.map((b, i) => (
              <div className="iu-tx" key={i}>
                <div className="iu-tx-t">{b.titulo}</div>
                <ul>{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
              </div>
            ))}
          </div>

          <BaseEvidencia evidencia={evidenciaDe('incontinencia')} />

          <div className="inst-disclaimer">
            Instrumento de apoyo a la decisión basado en la evaluación de la incontinencia urinaria y en cuestionarios validados. La clasificación orienta; el diario miccional aporta datos objetivos. La conducta se individualiza.
          </div>
        </div>
      </div>
    </div>
  );
}
