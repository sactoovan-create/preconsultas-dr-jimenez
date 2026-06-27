import React, { useMemo, useState, useEffect } from 'react';
import { usePaciente } from '../../core/PacienteContext.jsx';
import { evaluarMenopausia, MRS_ITEMS } from './engine.js';
import { imprimirHoja } from '../../core/printSheet.js';
import { imprimirHojaClinica } from '../../core/hojaClinica.js';
import { Seccion, CampoNumero, CampoTexto, Selector, ToggleSiNo, Casilla , Puente, BaseEvidencia } from '../../core/ui.jsx';
import { evidenciaDe } from '../../core/evidencia.js';
import '../../core/instrumentLayout.css';
import './Menopausia.css';

const SEV_PILL = { mínima: 'ok', leve: 'ok', moderada: 'aviso', severa: 'alerta' };
const DOMINIOS = { somatico: 'Síntomas físicos', psicologico: 'Síntomas psicológicos', urogenital: 'Síntomas urogenitales' };
const ESCALA = ['Ninguno', 'Leve', 'Moderado', 'Severo', 'Muy severo'];

function EscalaItem({ texto, valor, onChange }) {
  return (
    <div className="men-item">
      <div className="men-item-txt">{texto}</div>
      <div className="men-item-btns">
        {ESCALA.map((et, n) => (
          <button key={n} title={et} className={valor === n ? 'on' : ''} onClick={() => onChange(n)}>{n}</button>
        ))}
      </div>
    </div>
  );
}

export default function Menopausia() {
  const { paciente, actualizar, publicarResumen, irA } = usePaciente();
  const dem = paciente.demografia, sig = paciente.signos;

  const [d, setD] = useState(() => ({
    tipo: '',
    tabaquismo: false, hipertension: false, sindromeMetabolico: false, riesgoTev: false,
    gsmSintomas: false, prefiereNoHormonal: false,
    ...((paciente.autoReporte && paciente.autoReporte.mrs) || {}),
  }));
  const set = (k, val) => setD((p) => ({ ...p, [k]: val }));
  // Las contraindicaciones se guardan en el paciente compartido, no en el estado local.
  const ant = paciente.antecedentes;
  const setAnt = (k, val) => actualizar('antecedentes', k, val);

  const r = useMemo(() => evaluarMenopausia(paciente, d), [paciente, d]);

  useEffect(() => {
    const evaluado = r.mrs.total > 0 || !!d.tipo || r.candidatura.tipo === 'contraindicada';
    const mapa = { mínima: 'ok', leve: 'ok', moderada: 'aviso', severa: 'alerta' };
    publicarResumen('menopausia', {
      evaluado,
      estado: mapa[r.mrs.sevTotal] || 'neutro',
      titular: `Síntomas: intensidad ${r.mrs.sevTotal}`,
      detalle: r.candidatura.recomienda ? 'Candidata a terapia hormonal' : r.candidatura.titulo,
      metrica: r.mrs.total > 0 ? { clave: 'mrs', nombre: 'Síntomas de menopausia', valor: r.mrs.total, unidad: 'de 44', min: 0, max: 44, mejorAbajo: true } : null,
    });
  }, [r, d.tipo, publicarResumen]);
  const setDem = (c, val) => actualizar('demografia', c, val);
  const setSig = (c, val) => actualizar('signos', c, val);

  const dominios = ['somatico', 'psicologico', 'urogenital'];
  const sevPorDom = { somatico: r.mrs.sevSomatico, psicologico: r.mrs.sevPsicologico, urogenital: r.mrs.sevUrogenital };
  const valPorDom = { somatico: r.mrs.somatico, psicologico: r.mrs.psicologico, urogenital: r.mrs.urogenital };
  const maxPorDom = { somatico: 16, psicologico: 16, urogenital: 12 };

  return (
    <div className="inst">
      <header className="inst-cab">
        <div>
          <div className="inst-eyebrow">Instrumento de evaluación · Menopause Rating Scale</div>
          <h1>Menopausia y terapia hormonal<small>escala de síntomas y candidatura a tratamiento</small></h1>
        </div>
        <div className="inst-mono">IJ</div>
      </header>

      <div className="inst-grid">
        {/* -------- FORMULARIO -------- */}
        <div className="inst-form">
          <Seccion indice="I" titulo="Paciente">
            <CampoTexto etiqueta="Nombre de la paciente" full valor={dem.nombre} onChange={(v) => setDem('nombre', v)} placeholder="Para identificar la hoja impresa" />
            <CampoNumero etiqueta="Edad" unidad="años" valor={dem.edad} onChange={(v) => setDem('edad', v)} min={25} max={75} />
            <CampoNumero etiqueta="Edad de la menopausia" unidad="años" valor={dem.edadMenopausia} onChange={(v) => setDem('edadMenopausia', v)} min={20} max={60} />
            <Selector etiqueta="Tipo" valor={d.tipo} onChange={(v) => set('tipo', v)}
              opciones={[{ valor: '', etiqueta: 'Según edad de menopausia' }, { valor: 'habitual', etiqueta: 'Habitual' }, { valor: 'precoz', etiqueta: 'Precoz (40 a 44)' }, { valor: 'insuficiencia', etiqueta: 'Insuficiencia ovárica (menor de 40)' }]} />
            <ToggleSiNo etiqueta="Histerectomía" full valor={dem.histerectomia} onChange={(v) => setDem('histerectomia', v)} />
          </Seccion>

          <Seccion indice="II" titulo="Escala de síntomas" nota="Cada síntoma de 0 (ninguno) a 4 (muy severo)">
            {dominios.map((dom) => (
              <div className="men-dominio" key={dom}>
                <div className="men-dom-cab"><span>{DOMINIOS[dom]}</span><span className="men-dom-pt">{valPorDom[dom]} / {maxPorDom[dom]}</span></div>
                {MRS_ITEMS.filter((i) => i.dominio === dom).map((i) => (
                  <EscalaItem key={i.id} texto={i.texto} valor={d[i.id] ?? null} onChange={(n) => set(i.id, n)} />
                ))}
              </div>
            ))}
          </Seccion>

          <Seccion indice="III" titulo="Antropometría" nota="Para decidir la vía de la terapia">
            <CampoNumero etiqueta="Peso" unidad="kilogramos" valor={sig.peso} onChange={(v) => setSig('peso', v)} />
            <CampoNumero etiqueta="Talla" unidad="centímetros" valor={sig.talla} onChange={(v) => setSig('talla', v)} />
          </Seccion>

          <Seccion indice="IV" titulo="Factores para la vía" nota="Inclinan hacia la vía transdérmica">
            <div className="men-checks">
              <Casilla etiqueta="Tabaquismo" valor={d.tabaquismo} onChange={(v) => set('tabaquismo', v)} />
              <Casilla etiqueta="Hipertensión" valor={d.hipertension} onChange={(v) => set('hipertension', v)} />
              <Casilla etiqueta="Síndrome metabólico" valor={d.sindromeMetabolico} onChange={(v) => set('sindromeMetabolico', v)} />
              <Casilla etiqueta="Riesgo de tromboembolismo" valor={d.riesgoTev} onChange={(v) => set('riesgoTev', v)} />
            </div>
          </Seccion>

          <Seccion indice="V" titulo="Contraindicaciones de la terapia sistémica" nota="Se comparten con el resto de los instrumentos de la paciente">
            <div className="men-checks">
              <Casilla etiqueta="Cáncer de mama" valor={ant.cancerMama} onChange={(v) => setAnt('cancerMama', v)} />
              <Casilla etiqueta="Enfermedad cardiovascular establecida" valor={ant.ecvEstablecida} onChange={(v) => setAnt('ecvEstablecida', v)} />
              <Casilla etiqueta="Tromboembolismo venoso o trombofilia" valor={ant.tromboembolismo} onChange={(v) => setAnt('tromboembolismo', v)} />
              <Casilla etiqueta="Enfermedad hepática activa" valor={ant.hepatica} onChange={(v) => setAnt('hepatica', v)} />
              <Casilla etiqueta="Sangrado vaginal no diagnosticado" valor={ant.sangradoNoDx} onChange={(v) => setAnt('sangradoNoDx', v)} />
            </div>
          </Seccion>

          <Seccion indice="VI" titulo="Preferencia y síntomas locales">
            <div className="men-checks">
              <Casilla etiqueta="Síntomas genitourinarios (sequedad, molestias urinarias o sexuales)" valor={d.gsmSintomas} onChange={(v) => set('gsmSintomas', v)} />
              <Casilla etiqueta="Prefiere evitar las hormonas" valor={d.prefiereNoHormonal} onChange={(v) => set('prefiereNoHormonal', v)} />
            </div>
          </Seccion>
        </div>

        {/* -------- RESULTADOS -------- */}
        <div className="inst-res">
          <button className="inst-btn imprimir" onClick={() => imprimirHoja(r.hojaPaciente)}>Imprimir hoja para la paciente</button>
          <button className="inst-btn imprimir" onClick={() => imprimirHojaClinica('menopausia', r, paciente)}>Imprimir hoja clínica</button>

          <div className="inst-bloque">
            <h3>Escala de síntomas</h3>
            <div className="men-total">
              <div className="men-total-n">{r.mrs.total}<span>/44</span></div>
              <div className={'inst-pill ' + (SEV_PILL[r.mrs.sevTotal] || '')}>Intensidad {r.mrs.sevTotal}</div>
            </div>
            <div className="men-dominios-res">
              {dominios.map((dom) => (
                <div className="men-dom-res" key={dom}>
                  <div className="men-dom-res-cab"><span>{DOMINIOS[dom]}</span><span>{valPorDom[dom]} / {maxPorDom[dom]} · {sevPorDom[dom]}</span></div>
                  <div className="men-barra"><div className={'men-barra-r ' + sevPorDom[dom]} style={{ width: (valPorDom[dom] / maxPorDom[dom] * 100) + '%' }} /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="inst-bloque">
            <h3>Tipo</h3>
            <div className="inst-pill aviso">{r.tipo.etiqueta}</div>
            {r.tipo.nota && <p className="men-detalle">{r.tipo.nota}</p>}
          </div>

          <div className="inst-bloque">
            <h3>Candidatura a terapia hormonal</h3>
            <div className={'men-card ' + (r.candidatura.recomienda ? 'favorable' : 'cautela')}>
              <div className="men-card-t">{r.candidatura.titulo}</div>
              <div className="men-card-d">{r.candidatura.detalle}</div>
              {r.candidatura.progestageno && <div className="men-card-d">Útero presente: añadir progestágeno para protección endometrial. Preferir uno metabólicamente neutro, la progesterona micronizada o el norgestimato. Existe también una combinación sin progestágeno para mujeres con útero: estrógeno conjugado con bazedoxifeno.</div>}
            </div>
            {r.via && (
              <div className="men-via">
                <b>Vía sugerida:</b> {r.via.via}. {r.via.nota}
              </div>
            )}
            {r.candidatura.recomienda && (
              <div className="men-compuestas">
                Evitar las hormonas compuestas, es decir, los preparados magistrales presentados como bioidénticos: no se recomiendan por preocupaciones de seguridad y falta de control de calidad y de dosis. Usar productos con aprobación regulatoria.
              </div>
            )}
          </div>

          {r.genitourinario.presente && (
            <div className="inst-bloque">
              <h3>Síndrome genitourinario</h3>
              <p className="men-detalle">{r.genitourinario.detalle}</p>
            </div>
          )}

          {r.noHormonales && (
            <div className="inst-bloque">
              <h3>Alternativas no hormonales</h3>
              <ul className="men-lista">{r.noHormonales.detalle.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}

          {r.recomendaciones && r.recomendaciones.length > 0 && (
            <div className="inst-bloque">
              <h3>Recomendaciones personalizadas para la paciente</h3>
              <div className="men-recos">
                {r.recomendaciones.map((rec, i) => (
                  <div className="men-reco" key={i}>
                    <div className="men-reco-t">{rec.tema}</div>
                    <div className="men-reco-x">{rec.texto}</div>
                  </div>
                ))}
              </div>
              <div className="men-recos-pie">Estas recomendaciones se arman solas a partir de lo que la paciente respondió y se incluyen en la hoja que se le entrega.</div>
            </div>
          )}

          {r.candidatura.recomienda && (
            <Puente texto="La vía de la terapia hormonal depende del riesgo cardiovascular; conviene calcularlo." etiqueta="Calcular riesgo cardiovascular" onIr={() => irA('cardiometabolico')} />
          )}
          <BaseEvidencia evidencia={evidenciaDe('menopausia')} />
          <div className="inst-disclaimer">
            Instrumento de apoyo a la decisión basado en la Menopause Rating Scale y en las posiciones vigentes sobre terapia hormonal. La escala mide síntomas, no diagnostica; la decisión terapéutica es compartida e individualizada. La terapia hormonal no se usa para prevención cardiovascular ni de demencia.
          </div>
        </div>
      </div>
    </div>
  );
}
