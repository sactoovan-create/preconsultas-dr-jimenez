import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePaciente } from './core/PacienteContext.jsx';
import {
  alertaUrgente,
  contextoMaterno,
  filtrarHistoriaActiva,
  FORMULARIO_VERSION,
  normalizarTelefonoMexicano,
  pasosPara,
  porcentajePaso,
  reconciliarPosibleEmbarazo,
  senalFuerzaDolor,
  senalFuerzaSangrado,
  TEMAS_CONSULTA,
  validarPaso,
} from './core/preconsultaFlow.js';
import { filtrarProfundizacionesActivas } from './core/profundos/index.js';
import Profundizaciones from './paciente/Profundizaciones.jsx';
import {
  CampoNumero,
  CampoTexto,
  EscalaNumerica,
  GrupoMultiple,
  GrupoOpciones,
} from './paciente/CamposPreconsulta.jsx';
import './PreConsulta.css';

const MRS = [
  ['mrs_bochornos', 'Bochornos o sudoraciones repentinas'],
  ['mrs_cardiaco', 'Palpitaciones o sensación de latidos fuertes'],
  ['mrs_sueno', 'Dificultad para dormir'],
  ['mrs_musculo', 'Dolores de músculos o articulaciones'],
  ['mrs_animo', 'Sentirte triste o desanimada'],
  ['mrs_irritable', 'Irritabilidad o cambios de humor'],
  ['mrs_ansiedad', 'Nerviosismo o ansiedad'],
  ['mrs_agotamiento', 'Cansancio físico o mental'],
  ['mrs_sexual', 'Cambios o molestias en tu vida sexual'],
  ['mrs_vejiga', 'Molestias al orinar o para controlar la orina'],
  ['mrs_sequedad', 'Sequedad vaginal'],
];
const ESCALA_MRS = ['Nada', 'Leve', 'Moderado', 'Intenso', 'Muy intenso'];

const ETAPAS = [
  { valor: 'menstrua_regular', etiqueta: 'Tengo menstruaciones regulares' },
  { valor: 'menstrua_irregular', etiqueta: 'Mis menstruaciones son irregulares' },
  { valor: 'sin_regla_menos_12m', etiqueta: 'No menstruo desde hace menos de 12 meses' },
  { valor: 'menopausia', etiqueta: 'No menstruo desde hace 12 meses o más' },
  { valor: 'embarazada', etiqueta: 'Estoy embarazada' },
  { valor: 'posparto', etiqueta: 'Estoy en posparto o lactancia' },
  { valor: 'histerectomia', etiqueta: 'Me retiraron la matriz (histerectomía)' },
  { valor: 'no_se', etiqueta: 'No estoy segura' },
];

const POSIBLE_EMBARAZO = [
  { valor: 'no', etiqueta: 'No' },
  { valor: 'posible', etiqueta: 'Sí, es posible' },
  { valor: 'confirmado', etiqueta: 'Tengo una prueba positiva o embarazo confirmado' },
  { valor: 'no_se', etiqueta: 'No estoy segura' },
  { valor: 'no_aplica', etiqueta: 'No aplica en mi caso' },
];

const SENALES_URGENCIA = [
  { id: 'dolor_subito_intenso', etiqueta: 'Dolor súbito o muy intenso en abdomen o pelvis' },
  { id: 'sangrado_abundante', etiqueta: 'Sangrado que empapa una toalla o tampón cada hora durante 2 horas o más' },
  { id: 'desmayo_mareo', etiqueta: 'Desmayo, mareo intenso o debilidad marcada' },
  { id: 'dolor_hombro', etiqueta: 'Dolor en el hombro junto con dolor abdominal o sangrado' },
  { id: 'dificultad_respirar', etiqueta: 'Dificultad para respirar o dolor en el pecho' },
  { id: 'fiebre_dolor', etiqueta: 'Fiebre junto con dolor pélvico intenso' },
  { id: 'ninguna', etiqueta: 'Ninguna de estas' },
];

const SENALES_MATERNAS = [
  { id: 'sangrado_embarazo', etiqueta: 'Durante el embarazo: sangrado vaginal mayor que un manchado leve' },
  { id: 'hemorragia_posparto', etiqueta: 'Después del parto: sangrado que empapa una toalla o más en una hora, o coágulos grandes' },
  { id: 'fiebre_materna', etiqueta: 'Durante el embarazo o posparto: fiebre de 38 °C o más' },
  { id: 'cefalea_vision', etiqueta: 'Dolor de cabeza intenso que no cede, visión borrosa, luces o manchas' },
  { id: 'movimiento_fetal_menos', etiqueta: 'El bebé se mueve mucho menos o dejó de moverse' },
  { id: 'salida_liquido', etiqueta: 'Salida de líquido por vagina durante el embarazo' },
  { id: 'hinchazon_extrema', etiqueta: 'Hinchazón marcada de cara o manos' },
  { id: 'pierna_unilateral', etiqueta: 'Dolor, enrojecimiento o hinchazón importante en una sola pierna' },
  { id: 'ideas_dano', etiqueta: 'Pensamientos de hacerte daño o hacerle daño al bebé' },
  { id: 'ninguna', etiqueta: 'Ninguna de estas' },
];

const ANTECEDENTES = [
  ['diabetes', 'Diabetes'],
  ['hipertension', 'Presión alta'],
  ['tiroides', 'Problemas de tiroides'],
  ['corazon', 'Enfermedad del corazón o evento vascular cerebral'],
  ['trombosis', 'Trombosis o embolia'],
  ['migraña_aura', 'Migraña con aura'],
  ['hepatica', 'Enfermedad del hígado'],
  ['renal', 'Enfermedad del riñón'],
  ['cancer_mama', 'Cáncer de mama'],
  ['cancer_ginecologico', 'Cáncer de útero, cuello uterino u ovario'],
  ['osteoporosis', 'Osteoporosis o fractura por fragilidad'],
  ['ninguna', 'Ninguna de estas'],
];

const ANTECEDENTE_CAMPO = {
  diabetes: 'enfDiabetes',
  hipertension: 'enfHipertension',
  tiroides: 'enfTiroides',
  corazon: 'enfCorazon',
  trombosis: 'enfTrombosis',
  migraña_aura: 'migranaAura',
  hepatica: 'enfHepatica',
  renal: 'enfRenal',
  cancer_mama: 'cancerMamaPersonal',
  cancer_ginecologico: 'cancerGinecologicoPersonal',
  osteoporosis: 'enfOsteoporosis',
};

const BORRADOR = 'drj_preconsulta_borrador_v2';
const BORRADOR_VIGENCIA_MS = 4 * 60 * 60 * 1000;
function leerBorrador() {
  try {
    const valor = JSON.parse(sessionStorage.getItem(BORRADOR) || 'null');
    if (!valor || Date.now() - Number(valor.guardadoEn || 0) > BORRADOR_VIGENCIA_MS) {
      sessionStorage.removeItem(BORRADOR);
      return null;
    }
    return valor;
  } catch (_) { return null; }
}
function guardarBorrador(valor) {
  try { sessionStorage.setItem(BORRADOR, JSON.stringify({ ...valor, guardadoEn: Date.now() })); } catch (_) { /* sin almacenamiento de sesión */ }
}
function borrarBorrador() {
  try { sessionStorage.removeItem(BORRADOR); } catch (_) { /* sin almacenamiento de sesión */ }
}

function avisoUrgenteTexto(alerta) {
  if (!alerta.urgente) return null;
  return (
    <div className="pc-urgente" role="alert">
      <b>Busca atención médica de urgencia ahora.</b>
      <p>Este formulario no se revisa continuamente y no sustituye una valoración urgente. No esperes una respuesta del consultorio para acudir a un servicio de urgencias.</p>
    </div>
  );
}

function EscalaMrs({ mrs, onChange }) {
  return (
    <div className="pc-mrs" id="mrs">
      {MRS.map(([id, texto]) => (
        <fieldset className="pc-mrs-fila" key={id}>
          <legend>{texto}</legend>
          <select
            className="pc-mrs-select"
            aria-label={texto}
            value={mrs[id] ?? ''}
            onChange={(e) => onChange(id, e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="">Selecciona una opción</option>
            {ESCALA_MRS.map((etiqueta, n) => (
              <option key={n} value={n}>{n} · {etiqueta}</option>
            ))}
          </select>
          <div className="pc-mrs-opciones">
            {ESCALA_MRS.map((etiqueta, n) => (
              <button
                type="button"
                key={n}
                className={mrs[id] === n ? 'on' : ''}
                aria-pressed={mrs[id] === n}
                aria-label={`${texto}: ${n}, ${etiqueta}`}
                onClick={() => onChange(id, n)}
              >
                <b>{n}</b><span>{etiqueta}</span>
              </button>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function ResumenEnvio({ dem, hc, pasos, irPaso, estudiosEstado }) {
  const etiquetas = new Map(TEMAS_CONSULTA.map((t) => [t.id, t.etiqueta]));
  const temas = (hc.temasConsulta || []).map((id) => etiquetas.get(id) || id);
  return (
    <div className="pc-revision">
      <div>
        <span>Paciente</span>
        <b>{dem.nombre || '—'}{dem.edad != null ? ` · ${dem.edad} años` : ''}</b>
        <button type="button" onClick={() => irPaso('inicio')}>Editar</button>
      </div>
      <div>
        <span>Lo que quieres revisar</span>
        <b>{temas.join(', ') || '—'}</b>
        <small>{hc.motivo || ''}</small>
        <button type="button" onClick={() => irPaso('motivo')}>Editar</button>
      </div>
      <div>
        <span>Etapa actual</span>
        <b>{ETAPAS.find((e) => e.valor === hc.etapaReproductiva)?.etiqueta || '—'}</b>
        <button type="button" onClick={() => irPaso('contexto')}>Editar</button>
      </div>
      <div>
        <span>Secciones contestadas</span>
        <b>{Math.max(0, pasos.length - 1)} apartados revisados</b>
      </div>
      <div>
        <span>Estudios</span>
        <b>{estudiosEstado?.listos ? `${estudiosEstado.listos} archivo(s) listos` : 'Ningún archivo; es opcional'}</b>
      </div>
    </div>
  );
}

export default function PreConsulta({
  onEnviar,
  extraAntesDeEnviar = null,
  envioBloqueado = false,
  envioBloqueadoMensaje = 'Espera a que terminen de subir tus estudios para enviar.',
  estudiosEstado = null,
}) {
  const { paciente, actualizar, guardarAutoReporte } = usePaciente();
  const dem = paciente.demografia;
  const ar = paciente.autoReporte || {};
  const borradorRef = useRef(onEnviar ? leerBorrador() : null);
  const borrador = borradorRef.current;
  const [mrs, setMrs] = useState(() => ({ ...(ar.mrs || {}), ...(borrador?.mrs || {}) }));
  const [dolor, setDolor] = useState(() => ({
    ...(ar.dolor || {}),
    ...(borrador?.dolor || {}),
    tiene: borrador?.dolor?.tiene ?? ar.dolor?.tiene ?? null,
  }));
  const [hc, setHc] = useState(() => ({ ...(ar.hc || {}), ...(borrador?.hc || {}) }));
  const [profundos, setProfundos] = useState(() => borrador?.profundos || ar.profundos || {});
  const [pasoId, setPasoId] = useState(() => borrador?.pasoId || 'inicio');
  const [acepto, setAcepto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [bloqueo, setBloqueo] = useState('');
  const [campoError, setCampoError] = useState('');
  const trampaRef = useRef(null);
  const inicioRef = useRef(Date.now());
  const pasoRef = useRef(null);
  const alertaRef = useRef(null);

  const pasos = useMemo(() => pasosPara({ hc, mrs, dolor }), [hc, mrs, dolor]);
  const indice = Math.max(0, pasos.findIndex((p) => p.id === pasoId));
  const paso = pasos[indice] || pasos[0];
  const alerta = useMemo(() => alertaUrgente({ hc, dolor }), [hc, dolor]);
  const progreso = useMemo(() => porcentajePaso(paso.id, pasos), [paso.id, pasos]);
  const profundosSeguros = useMemo(
    () => filtrarProfundizacionesActivas({ mrs, dolor, hc }, profundos),
    [dolor, hc, mrs, profundos],
  );

  useEffect(() => {
    if (!borrador?.demografia) return;
    if (borrador.demografia.nombre) actualizar('demografia', 'nombre', borrador.demografia.nombre);
    if (borrador.demografia.edad != null) actualizar('demografia', 'edad', borrador.demografia.edad);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    guardarAutoReporte({ mrs, dolor, hc, profundos: profundosSeguros });
  }, [mrs, dolor, hc, profundosSeguros, guardarAutoReporte]);

  useEffect(() => {
    const actuales = Object.keys(profundos).sort().join('|');
    const vigentes = Object.keys(profundosSeguros).sort().join('|');
    if (actuales !== vigentes) setProfundos(profundosSeguros);
  }, [profundos, profundosSeguros]);

  useEffect(() => {
    if (!onEnviar) return;
    const hayDatos = dem.nombre || hc.telefono || hc.motivo || (hc.temasConsulta || []).length;
    if (!hayDatos) return;
    guardarBorrador({
      demografia: { nombre: dem.nombre || '', edad: dem.edad ?? null },
      mrs, dolor, hc, profundos: profundosSeguros, pasoId,
    });
  }, [dem.edad, dem.nombre, dolor, hc, mrs, onEnviar, pasoId, profundosSeguros]);

  useEffect(() => {
    if (!pasos.some((p) => p.id === pasoId)) setPasoId(pasos[Math.min(indice, pasos.length - 1)].id);
  }, [indice, pasoId, pasos]);

  useEffect(() => {
    const raiz = pasoRef.current;
    if (!raiz) return;
    raiz.querySelectorAll('[aria-invalid="true"]').forEach((n) => {
      n.removeAttribute('aria-invalid');
      n.removeAttribute('aria-describedby');
    });
    if (!campoError) return;
    const campo = document.getElementById(campoError);
    const control = campo?.matches('input, textarea, select, button')
      ? campo
      : campo?.querySelector('input, textarea, select, button');
    if (control) {
      control.setAttribute('aria-invalid', 'true');
      control.setAttribute('aria-describedby', 'pc-error');
    }
  }, [campoError, pasoId]);

  const limpiarError = () => { setBloqueo(''); setCampoError(''); };
  const setDem = (k, valor) => { actualizar('demografia', k, valor); limpiarError(); };
  const setH = (k, valor) => { setHc((p) => ({ ...p, [k]: valor })); setGuardado(false); limpiarError(); };
  const setD = (k, valor) => { setDolor((p) => ({ ...p, [k]: valor })); setGuardado(false); limpiarError(); };
  const setSintoma = (id, valor) => { setMrs((p) => ({ ...p, [id]: valor })); setGuardado(false); limpiarError(); };

  const moverVista = () => {
    requestAnimationFrame(() => {
      pasoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      pasoRef.current?.focus({ preventScroll: true });
    });
  };

  const mostrarError = (resultado) => {
    setBloqueo(resultado.mensaje);
    setCampoError(resultado.campo || '');
    requestAnimationFrame(() => {
      const campo = resultado.campo && document.getElementById(resultado.campo);
      campo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const control = campo?.matches('input, textarea, select, button')
        ? campo
        : campo?.querySelector('input, textarea, select, button');
      control?.focus({ preventScroll: true });
    });
  };

  const irPaso = (id) => {
    if (!pasos.some((p) => p.id === id)) return;
    setPasoId(id); limpiarError(); moverVista();
  };

  const siguiente = () => {
    const resultado = validarPaso(paso.id, { demografia: dem, hc, mrs, dolor });
    if (!resultado.ok) { mostrarError(resultado); return; }
    const siguientePaso = pasos[indice + 1];
    if (siguientePaso) { setPasoId(siguientePaso.id); limpiarError(); moverVista(); }
  };

  const anterior = () => {
    const anteriorPaso = pasos[indice - 1];
    if (anteriorPaso) { setPasoId(anteriorPaso.id); limpiarError(); moverVista(); }
  };

  const setEtapa = (valor) => {
    const cambio = {
      etapaReproductiva: valor,
      reglasRegulares: null,
      semanasEmbarazo: null,
      semanasPosparto: null,
      lactancia: null,
    };
    if (valor === 'menstrua_regular') cambio.reglasRegulares = true;
    if (valor === 'menstrua_irregular') cambio.reglasRegulares = false;
    if (valor === 'embarazada') cambio.posibleEmbarazo = 'confirmado';
    if (['menopausia', 'histerectomia'].includes(valor)) cambio.posibleEmbarazo = 'no_aplica';
    setHc((p) => {
      if (valor !== 'embarazada' && p.posibleEmbarazo === 'confirmado') {
        cambio.posibleEmbarazo = null;
      }
      if (
        ['menstrua_regular', 'menstrua_irregular', 'sin_regla_menos_12m', 'posparto'].includes(valor)
        && p.posibleEmbarazo === 'no_aplica'
      ) {
        cambio.posibleEmbarazo = null;
      }
      const siguiente = { ...p, ...cambio };
      if (!contextoMaterno(siguiente)) siguiente.senalesMaternas = [];
      return siguiente;
    });
    setGuardado(false);
    limpiarError();
  };

  const setPosibleEmbarazo = (valor) => {
    setHc((p) => reconciliarPosibleEmbarazo(p, valor));
    setGuardado(false);
    limpiarError();
  };

  const setAntecedentes = (seleccion) => {
    const ninguna = seleccion.includes('ninguna');
    const cambios = {
      antecedentesSeleccionados: seleccion,
      antecedentesRevisados: true,
      enfCancer: ninguna ? false : seleccion.some((x) => ['cancer_mama', 'cancer_ginecologico'].includes(x)),
    };
    Object.entries(ANTECEDENTE_CAMPO).forEach(([id, campo]) => {
      cambios[campo] = ninguna ? false : seleccion.includes(id);
    });
    setHc((p) => ({ ...p, ...cambios }));
    limpiarError();
  };

  const reporteParaEnviar = () => {
    const historia = filtrarHistoriaActiva({
      ...hc,
      telefono: normalizarTelefonoMexicano(hc.telefono),
    });
    const temas = Array.isArray(historia.temasConsulta) ? historia.temasConsulta : [];
    const reportaDolor = temas.includes('dolor') || senalFuerzaDolor(historia);
    const reportaSangrado = temas.includes('sangrado') || senalFuerzaSangrado(historia);
    const mrsActiva = temas.includes('climaterio') ? mrs : {};
    const dolorActivo = reportaDolor
      ? { ...dolor, tiene: true }
      : { tiene: false, intensidad: null, meses: null };
    const hcActiva = {
      ...historia,
      sangrado: reportaSangrado,
      formularioVersion: FORMULARIO_VERSION,
    };
    return {
      mrs: mrsActiva,
      dolor: dolorActivo,
      hc: hcActiva,
      profundos: filtrarProfundizacionesActivas(
        { mrs: mrsActiva, dolor: dolorActivo, hc: hcActiva },
        profundos,
      ),
    };
  };

  const enviar = async () => {
    if (trampaRef.current?.value) return;
    if (Date.now() - inicioRef.current < 2000) {
      setBloqueo('Espera un momento antes de enviar e inténtalo de nuevo.');
      return;
    }
    for (const p of pasos) {
      if (['profundizaciones', 'prevencion', 'envio'].includes(p.id)) continue;
      const resultado = validarPaso(p.id, { demografia: dem, hc, mrs, dolor });
      if (!resultado.ok) { setPasoId(p.id); mostrarError(resultado); return; }
    }
    if (onEnviar && !acepto) {
      mostrarError({
        mensaje: 'Marca la autorización para poder enviar tus respuestas y estudios.',
        campo: 'consentimiento',
      });
      return;
    }
    if (onEnviar && envioBloqueado) {
      mostrarError({ mensaje: envioBloqueadoMensaje, campo: 'estudios' });
      return;
    }
    const reporte = reporteParaEnviar();
    setBloqueo('');
    guardarAutoReporte(reporte);
    if (!onEnviar) { setGuardado(true); return; }

    setEnviando(true);
    try {
      await onEnviar({
        ...reporte,
        contacto: {
          telefono: reporte.hc.telefono || null,
          correo: reporte.hc.correo || null,
        },
        demografia: { nombre: dem.nombre, edad: dem.edad },
        consentimiento: true,
        consentimientoFecha: new Date().toISOString(),
        formularioVersion: FORMULARIO_VERSION,
        alertaSeguridad: alerta,
      });
      borrarBorrador();
    } catch (e) {
      setBloqueo((e && e.message) || 'No se pudieron enviar tus respuestas. Inténtalo de nuevo.');
      alertaRef.current?.focus();
    } finally {
      setEnviando(false);
    }
  };

  const contenidoPaso = () => {
    if (paso.id === 'inicio') return (
      <>
        <p className="pc-paso-intro">Estos datos permiten identificar tu cuestionario y asociarlo de forma segura con tu cita.</p>
        <div className="pc-datos">
          <CampoTexto id="nombre" etiqueta="Nombre y apellidos" requerido valor={dem.nombre} onChange={(v) => setDem('nombre', v)} placeholder="Como aparece en tu cita" />
          <CampoNumero id="edad" etiqueta="Edad" requerido min={1} max={110} valor={dem.edad} onChange={(v) => setDem('edad', v)} placeholder="años" />
          <CampoTexto id="telefono" etiqueta="Teléfono o WhatsApp de México" requerido tipo="tel" valor={hc.telefono} onChange={(v) => setH('telefono', v)} placeholder="10 dígitos; puedes incluir +52" />
          <CampoTexto id="correo" etiqueta="Correo (opcional)" tipo="email" valor={hc.correo} onChange={(v) => setH('correo', v)} placeholder="tu@correo.com" />
        </div>
      </>
    );

    if (paso.id === 'motivo') return (
      <>
        <p className="pc-paso-intro">Cuéntanos qué necesitas. Solo abriremos las preguntas relacionadas con los temas que elijas.</p>
        <CampoTexto id="motivo" etiqueta="¿Qué te gustaría resolver en esta consulta?" requerido area valor={hc.motivo} onChange={(v) => setH('motivo', v)} placeholder="Cuéntalo con tus palabras; esto será lo primero que vea el doctor." />
        <GrupoMultiple
          id="temasConsulta"
          etiqueta="¿Qué temas quieres revisar?"
          requerido
          ayuda="Puedes elegir varios. Solo abriremos las preguntas relacionadas."
          opciones={TEMAS_CONSULTA}
          valor={hc.temasConsulta}
          onChange={(v) => {
            setHc((p) => {
              const siguiente = { ...p, temasConsulta: v };
              if (!contextoMaterno(siguiente)) siguiente.senalesMaternas = [];
              if (!v.includes('intimidad')) siguiente.molestiasIntimas = [];
              if (!v.includes('sangrado') && !senalFuerzaSangrado(siguiente)) {
                siguiente.sangrado = false;
                siguiente.sangradoTipos = [];
                siguiente.sangradoAhora = null;
                siguiente.sangradoDuracionDias = null;
                siguiente.sangradoDesde = '';
              }
              if (!v.includes('urinario')) {
                siguiente.sintomasUrinarios = [];
                siguiente.urinarioDetalle = '';
                siguiente.escapesOrina = false;
              }
              if (!v.includes('mama')) {
                siguiente.sintomasMama = [];
                siguiente.mamaDetalle = '';
              }
              if (!v.includes('ciclos')) {
                siguiente.cambiosAndrogenicos = [];
                siguiente.acne = false;
                siguiente.hirsutismo = false;
                siguiente.caidaCabello = false;
                siguiente.diasEntreReglas = null;
                if (!['menstrua_regular', 'menstrua_irregular'].includes(siguiente.etapaReproductiva)) {
                  siguiente.reglasRegulares = null;
                }
              }
              if (!v.some((t) => ['anticoncepcion', 'fertilidad', 'embarazo'].includes(t))) {
                siguiente.objetivoReproductivo = null;
                siguiente.mesesBuscandoEmbarazo = null;
              }
              return siguiente;
            });
            if (!v.includes('climaterio')) setMrs({});
            setGuardado(false);
            limpiarError();
            setDolor((p) => ({
              ...p,
              tiene: v.includes('dolor'),
              ...(!v.includes('dolor') ? { intensidad: null, meses: null, inicio: null, asociados: [] } : {}),
            }));
          }}
          exclusiva="__sin_exclusiva__"
        />
      </>
    );

    if (paso.id === 'seguridad') return (
      <>
        <p className="pc-paso-intro">Estas preguntas no diagnostican. Sirven para avisarte si no conviene esperar a que el consultorio revise el formulario.</p>
        <GrupoOpciones id="posibleEmbarazo" etiqueta="¿Hay posibilidad de embarazo ahora?" requerido opciones={POSIBLE_EMBARAZO} valor={hc.posibleEmbarazo} onChange={setPosibleEmbarazo} />
        <GrupoMultiple id="senalesUrgencia" etiqueta="¿Tienes hoy alguna de estas señales?" requerido opciones={SENALES_URGENCIA} valor={hc.senalesUrgencia} onChange={(v) => setH('senalesUrgencia', v)} />
        {contextoMaterno(hc) && (
          <GrupoMultiple
            id="senalesMaternas"
            etiqueta="Si estás embarazada o en posparto, ¿tienes hoy alguna de estas señales?"
            ayuda="Incluye las primeras semanas después del parto, aunque el embarazo haya terminado."
            requerido
            opciones={SENALES_MATERNAS}
            valor={hc.senalesMaternas}
            onChange={(v) => setH('senalesMaternas', v)}
          />
        )}
        {avisoUrgenteTexto(alerta)}
      </>
    );

    if (paso.id === 'contexto') {
      const muestraFecha = ['menstrua_regular', 'menstrua_irregular', 'sin_regla_menos_12m'].includes(hc.etapaReproductiva)
        || ['posible', 'confirmado', 'no_se'].includes(hc.posibleEmbarazo);
      return (
        <>
          <GrupoOpciones id="etapaReproductiva" etiqueta="¿Cuál opción describe mejor tu situación actual?" requerido opciones={ETAPAS} valor={hc.etapaReproductiva} onChange={setEtapa} />
          {muestraFecha && <CampoTexto etiqueta="Primer día de tu última menstruación (si lo recuerdas)" tipo="date" valor={hc.ultimaMenstruacion} onChange={(v) => setH('ultimaMenstruacion', v)} />}
          {hc.etapaReproductiva === 'embarazada' && (
            <CampoNumero etiqueta="¿De cuántas semanas estás? (si lo sabes)" min={1} max={45} valor={hc.semanasEmbarazo} onChange={(v) => setH('semanasEmbarazo', v)} placeholder="semanas" />
          )}
          {hc.etapaReproductiva === 'posparto' && (
            <>
              <CampoNumero etiqueta="¿Hace cuántas semanas fue el parto? (si lo sabes)" min={0} max={104} valor={hc.semanasPosparto} onChange={(v) => setH('semanasPosparto', v)} placeholder="semanas" />
              <GrupoOpciones etiqueta="¿Estás amamantando?" opciones={[{ valor: true, etiqueta: 'Sí' }, { valor: false, etiqueta: 'No' }]} valor={hc.lactancia} onChange={(v) => setH('lactancia', v)} />
            </>
          )}
          <CampoTexto etiqueta="Método anticonceptivo u hormonas que usas (opcional)" valor={hc.anticonceptivo} onChange={(v) => setH('anticonceptivo', v)} placeholder="Pastillas, DIU, implante, terapia hormonal, ninguno..." />
        </>
      );
    }

    if (paso.id === 'sangrado') return (
      <>
        <GrupoMultiple
          id="sangradoTipos"
          etiqueta="¿Qué cambio de sangrado has notado?"
          requerido
          exclusiva="__sin_exclusiva__"
          opciones={[
            { id: 'entre_periodos', etiqueta: 'Sangrado entre menstruaciones' },
            { id: 'despues_relaciones', etiqueta: 'Sangrado después de relaciones sexuales' },
            { id: 'muy_abundante', etiqueta: 'Más abundante de lo habitual' },
            { id: 'mas_7_dias', etiqueta: 'Dura más de 7 días' },
            { id: 'ciclos_cortos_largos', etiqueta: 'Ciclos muy cortos, largos o impredecibles' },
            { id: 'despues_menopausia', etiqueta: 'Sangrado después de 12 meses sin menstruar' },
          ]}
          valor={hc.sangradoTipos}
          onChange={(v) => setH('sangradoTipos', v)}
        />
        <GrupoOpciones etiqueta="¿Estás sangrando hoy?" opciones={[{ valor: true, etiqueta: 'Sí' }, { valor: false, etiqueta: 'No' }, { valor: 'no_se', etiqueta: 'No estoy segura' }]} valor={hc.sangradoAhora} onChange={(v) => setH('sangradoAhora', v)} />
        <div className="pc-datos">
          <CampoNumero etiqueta="¿Cuántos días suele durar?" valor={hc.sangradoDuracionDias} onChange={(v) => setH('sangradoDuracionDias', v)} max={60} placeholder="días" />
          <CampoTexto etiqueta="¿Desde cuándo cambió?" valor={hc.sangradoDesde} onChange={(v) => setH('sangradoDesde', v)} placeholder="Fecha o tiempo aproximado" />
        </div>
        {avisoUrgenteTexto(alerta)}
      </>
    );

    if (paso.id === 'dolor') return (
      <>
        <EscalaNumerica id="dolorIntensidad" etiqueta="¿Qué tan fuerte ha sido el dolor en su peor momento?" valor={dolor.intensidad} onChange={(v) => setD('intensidad', v)} />
        <GrupoOpciones id="dolorInicio" etiqueta="¿Cómo comenzó?" requerido opciones={[
          { valor: 'subito', etiqueta: 'De repente' },
          { valor: 'gradual', etiqueta: 'Poco a poco' },
          { valor: 'recurrente', etiqueta: 'Va y viene desde hace tiempo' },
          { valor: 'no_se', etiqueta: 'No estoy segura' },
        ]} valor={dolor.inicio} onChange={(v) => setD('inicio', v)} />
        <div className="pc-datos">
          <CampoNumero etiqueta="¿Desde hace cuántos meses?" valor={dolor.meses} onChange={(v) => setD('meses', v)} max={600} placeholder="meses" />
          <CampoTexto etiqueta="¿En qué parte lo sientes?" valor={dolor.localizacion} onChange={(v) => setD('localizacion', v)} placeholder="Centro, lado derecho, lado izquierdo..." />
        </div>
        <GrupoMultiple etiqueta="¿Cuándo aparece o qué lo acompaña?" opciones={[
          { id: 'menstruacion', etiqueta: 'Durante la menstruación' },
          { id: 'relaciones', etiqueta: 'Durante o después de relaciones' },
          { id: 'orinar', etiqueta: 'Al orinar' },
          { id: 'evacuar', etiqueta: 'Al evacuar' },
          { id: 'nausea_vomito', etiqueta: 'Con náusea o vómito' },
          { id: 'ninguna', etiqueta: 'Ninguna de estas' },
        ]} valor={dolor.asociados} onChange={(v) => setD('asociados', v)} />
        {avisoUrgenteTexto(alerta)}
      </>
    );

    if (paso.id === 'climaterio') return (
      <>
        <p className="pc-paso-intro">Piensa en las últimas 4 semanas. Para obtener una escala útil necesitamos una respuesta en cada renglón.</p>
        <EscalaMrs mrs={mrs} onChange={setSintoma} />
      </>
    );

    if (paso.id === 'ciclos') return (
      <>
        <GrupoOpciones id="reglasRegulares" etiqueta="En los últimos 12 meses, ¿tus ciclos han sido regulares?" requerido opciones={[
          { valor: true, etiqueta: 'Sí, suelen llegar de forma predecible' },
          { valor: false, etiqueta: 'No, son irregulares o pasan meses sin llegar' },
          { valor: 'no_se', etiqueta: 'No estoy segura' },
          { valor: 'no_aplica', etiqueta: 'No menstruo actualmente' },
        ]} valor={hc.reglasRegulares} onChange={(v) => setH('reglasRegulares', v)} />
        <div className="pc-datos">
          <CampoNumero etiqueta="Edad de tu primera menstruación" valor={hc.edadMenarca} onChange={(v) => setH('edadMenarca', v)} max={30} placeholder="años" />
          <CampoNumero etiqueta="Días entre una menstruación y otra" valor={hc.diasEntreReglas} onChange={(v) => setH('diasEntreReglas', v)} max={180} placeholder="aprox." />
        </div>
        <GrupoMultiple etiqueta="¿Has notado alguno de estos cambios?" opciones={[
          { id: 'acne', etiqueta: 'Acné o piel más grasa' },
          { id: 'hirsutismo', etiqueta: 'Aumento de vello en cara, pecho o abdomen' },
          { id: 'caidaCabello', etiqueta: 'Caída o adelgazamiento del cabello' },
          { id: 'ninguna', etiqueta: 'Ninguno de estos' },
        ]} valor={hc.cambiosAndrogenicos} onChange={(v) => {
          setHc((p) => ({
            ...p,
            cambiosAndrogenicos: v,
            acne: v.includes('acne'),
            hirsutismo: v.includes('hirsutismo'),
            caidaCabello: v.includes('caidaCabello'),
          }));
        }} />
      </>
    );

    if (paso.id === 'urinario') return (
      <>
        <GrupoMultiple id="sintomasUrinarios" etiqueta="¿Qué has notado en las últimas 4 semanas?" requerido opciones={[
          { id: 'escapes', etiqueta: 'Escapes de orina' },
          { id: 'urgencia', etiqueta: 'Ganas súbitas o muy frecuentes de orinar' },
          { id: 'ardor', etiqueta: 'Ardor o dolor al orinar' },
          { id: 'sangre', etiqueta: 'Sangre visible en la orina' },
          { id: 'infecciones', etiqueta: 'Infecciones urinarias repetidas' },
          { id: 'ninguna', etiqueta: 'Ninguna actualmente' },
        ]} valor={hc.sintomasUrinarios} onChange={(v) => setHc((p) => ({ ...p, sintomasUrinarios: v, escapesOrina: v.includes('escapes') }))} />
        <CampoTexto etiqueta="Algo más que quieras contar sobre estas molestias (opcional)" area valor={hc.urinarioDetalle} onChange={(v) => setH('urinarioDetalle', v)} />
      </>
    );

    if (paso.id === 'intimidad') return (
      <>
        <p className="pc-paso-intro">Este tema es privado. Puedes responder solo lo que te haga sentir cómoda.</p>
        <GrupoMultiple id="molestiasIntimas" etiqueta="¿Qué te gustaría revisar?" requerido exclusiva="prefiero_no" opciones={[
          { id: 'sequedad', etiqueta: 'Sequedad, ardor o irritación' },
          { id: 'dolor_relaciones', etiqueta: 'Dolor durante las relaciones' },
          { id: 'deseo', etiqueta: 'Cambios en el deseo o interés sexual' },
          { id: 'satisfaccion', etiqueta: 'Dificultad con excitación, orgasmo o satisfacción' },
          { id: 'prefiero_no', etiqueta: 'Prefiero no responder aquí; lo hablaré en consulta' },
        ]} valor={hc.molestiasIntimas} onChange={(v) => setH('molestiasIntimas', v)} />
      </>
    );

    if (paso.id === 'mama') return (
      <>
        <GrupoMultiple id="sintomasMama" etiqueta="¿Qué has notado recientemente?" requerido opciones={[
          { id: 'bolita', etiqueta: 'Bolita o zona endurecida nueva' },
          { id: 'secrecion', etiqueta: 'Salida de líquido o sangre por el pezón' },
          { id: 'piel_pezon', etiqueta: 'Cambio en la piel o en el pezón' },
          { id: 'dolor', etiqueta: 'Dolor o sensibilidad persistente' },
          { id: 'ninguna', etiqueta: 'Ninguna molestia actual; es revisión preventiva' },
        ]} valor={hc.sintomasMama} onChange={(v) => setH('sintomasMama', v)} />
        <CampoTexto etiqueta="¿De qué lado y desde cuándo? (opcional)" valor={hc.mamaDetalle} onChange={(v) => setH('mamaDetalle', v)} />
      </>
    );

    if (paso.id === 'plan-reproductivo') return (
      <>
        <GrupoOpciones id="objetivoReproductivo" etiqueta="Respecto a un embarazo, ¿qué te gustaría en este momento?" requerido opciones={[
          { valor: 'buscar_ahora', etiqueta: 'Estoy buscando embarazo ahora' },
          { valor: 'buscar_despues', etiqueta: 'Quiero un embarazo más adelante' },
          { valor: 'evitar', etiqueta: 'Quiero evitar un embarazo' },
          { valor: 'embarazada', etiqueta: 'Ya estoy embarazada' },
          { valor: 'no_aplica', etiqueta: 'No aplica o no deseo embarazo' },
          { valor: 'prefiero_no', etiqueta: 'Prefiero hablarlo en consulta' },
        ]} valor={hc.objetivoReproductivo} onChange={(v) => setH('objetivoReproductivo', v)} />
        {hc.objetivoReproductivo === 'buscar_ahora' && (
          <CampoNumero etiqueta="¿Desde hace cuántos meses lo intentas?" valor={hc.mesesBuscandoEmbarazo} onChange={(v) => setH('mesesBuscandoEmbarazo', v)} max={240} placeholder="meses" />
        )}
        <CampoTexto etiqueta="Método anticonceptivo actual (si usas alguno)" valor={hc.anticonceptivo} onChange={(v) => setH('anticonceptivo', v)} />
      </>
    );

    if (paso.id === 'profundizaciones') return (
      <>
        <p className="pc-paso-intro">Según lo que contaste, puedes responder una escala breve adicional. Es opcional y puedes continuar sin abrirla.</p>
        <Profundizaciones tamizaje={{ mrs, dolor, hc }} valor={profundos} onChange={(p) => setProfundos(p)} />
      </>
    );

    if (paso.id === 'antecedentes') return (
      <>
        <GrupoMultiple
          id="antecedentes"
          etiqueta="¿Te han diagnosticado alguna de estas condiciones?"
          requerido
          opciones={ANTECEDENTES.map(([id, etiqueta]) => ({ id, etiqueta }))}
          valor={hc.antecedentesSeleccionados}
          onChange={setAntecedentes}
        />
      </>
    );

    if (paso.id === 'historia') return (
      <>
        <p className="pc-paso-intro">Completa solo lo que recuerdes. Los campos de esta sección son opcionales y el doctor los verificará contigo.</p>
        <div className="pc-datos pc-datos-obstetricos">
          <CampoNumero etiqueta="Embarazos" valor={hc.embarazos} onChange={(v) => setH('embarazos', v)} max={30} />
          <CampoNumero etiqueta="Partos" valor={hc.partos} onChange={(v) => setH('partos', v)} max={30} />
          <CampoNumero etiqueta="Cesáreas" valor={hc.cesareas} onChange={(v) => setH('cesareas', v)} max={30} />
          <CampoNumero etiqueta="Pérdidas o abortos" valor={hc.abortos} onChange={(v) => setH('abortos', v)} max={30} />
        </div>
        <CampoTexto etiqueta="Cirugías que has tenido (opcional)" area valor={hc.cirugias} onChange={(v) => setH('cirugias', v)} placeholder="Incluye cirugías ginecológicas" />
        <CampoTexto etiqueta="Medicamentos, vitaminas o suplementos (opcional)" area valor={hc.medicamentos} onChange={(v) => setH('medicamentos', v)} />
        <CampoTexto etiqueta="Alergias a medicamentos (opcional)" valor={hc.alergias} onChange={(v) => setH('alergias', v)} />
        <GrupoOpciones etiqueta="Tabaco" opciones={[
          { valor: 'nunca', etiqueta: 'Nunca he fumado' },
          { valor: 'antes', etiqueta: 'Fumaba antes' },
          { valor: 'actual', etiqueta: 'Fumo actualmente' },
          { valor: 'prefiero_no', etiqueta: 'Prefiero no responder' },
        ]} valor={hc.tabacoEstado} onChange={(v) => setHc((p) => ({ ...p, tabacoEstado: v, fuma: v === 'actual' }))} />
      </>
    );

    if (paso.id === 'prevencion') {
      const muestraMama = Number(dem.edad) >= 40 || (hc.temasConsulta || []).includes('mama');
      return (
        <>
          <p className="pc-paso-intro">Si no recuerdas una fecha o resultado, puedes dejarlo en blanco. El doctor lo verificará contigo.</p>
          <GrupoOpciones id="tieneCuelloUterino" etiqueta="¿Conservas el cuello de la matriz (cuello uterino)?" ayuda="Si te hicieron una histerectomía y no sabes, elige “No sé”." opciones={[
            { valor: 'si', etiqueta: 'Sí' },
            { valor: 'no', etiqueta: 'No' },
            { valor: 'no_se', etiqueta: 'No sé' },
          ]} valor={hc.tieneCuelloUterino} onChange={(v) => setH('tieneCuelloUterino', v)} />
          {['si', 'no_se'].includes(hc.tieneCuelloUterino) && (
            <>
              <CampoTexto etiqueta="Fecha aproximada de tu última prueba cervical" tipo="date" valor={hc.ultimoPapFecha} onChange={(v) => setH('ultimoPapFecha', v)} />
              <GrupoOpciones etiqueta="¿Qué resultado tuvo?" opciones={[
                { valor: 'normal', etiqueta: 'Normal' },
                { valor: 'alterado', etiqueta: 'Alterado o requirió seguimiento' },
                { valor: 'no_se', etiqueta: 'No lo recuerdo' },
                { valor: 'nunca', etiqueta: 'Nunca me la han realizado' },
              ]} valor={hc.ultimoPapResultado} onChange={(v) => setH('ultimoPapResultado', v)} />
            </>
          )}
          {muestraMama && (
            <>
              <CampoTexto etiqueta="Fecha aproximada de tu última mastografía" tipo="date" valor={hc.ultimaMastografiaFecha} onChange={(v) => setH('ultimaMastografiaFecha', v)} />
              <GrupoOpciones etiqueta="¿Qué resultado tuvo?" opciones={[
                { valor: 'normal', etiqueta: 'Normal' },
                { valor: 'seguimiento', etiqueta: 'Pidieron seguimiento u otro estudio' },
                { valor: 'no_se', etiqueta: 'No lo recuerdo' },
                { valor: 'nunca', etiqueta: 'Nunca me la han realizado' },
              ]} valor={hc.ultimaMastografiaResultado} onChange={(v) => setH('ultimaMastografiaResultado', v)} />
            </>
          )}
          <GrupoMultiple etiqueta="Antecedentes de cáncer en familiares de sangre" opciones={[
            { id: 'mama', etiqueta: 'Cáncer de mama' },
            { id: 'ovario', etiqueta: 'Cáncer de ovario' },
            { id: 'pancreas', etiqueta: 'Cáncer de páncreas' },
            { id: 'prostata', etiqueta: 'Cáncer de próstata' },
            { id: 'ninguna', etiqueta: 'Ninguno que yo sepa' },
          ]} valor={hc.cancerFamiliarTipos} onChange={(v) => setHc((p) => ({
            ...p,
            cancerFamiliarTipos: v,
            famCancerMama: v.includes('mama'),
            famCancerOvario: v.includes('ovario'),
          }))} />
          {(hc.cancerFamiliarTipos || []).some((x) => x !== 'ninguna') && (
            <CampoTexto etiqueta="¿Quién lo tuvo y a qué edad? (si lo sabes)" area valor={hc.cancerFamiliarDetalle} onChange={(v) => setH('cancerFamiliarDetalle', v)} placeholder="Por ejemplo: mamá, cáncer de mama a los 42 años" />
          )}
        </>
      );
    }

    return (
      <>
        {avisoUrgenteTexto(alerta)}
        <ResumenEnvio dem={dem} hc={hc} pasos={pasos} irPaso={irPaso} estudiosEstado={estudiosEstado} />
        {onEnviar && (
          <>
            <label className="pc-consent" id="consentimiento">
              <input
                type="checkbox"
                checked={acepto}
                onChange={(e) => { setAcepto(e.target.checked); limpiarError(); }}
              />
              <span>Autorizo que mis respuestas y los estudios que adjunte se compartan con el consultorio del Dr. Iván Jiménez Martínez para mi atención médica.</span>
            </label>
            <a className="pc-aviso-link" href="/privacidad" target="_blank" rel="noopener noreferrer">Consulta el aviso de privacidad</a>
          </>
        )}
        <div id="estudios">
          {typeof extraAntesDeEnviar === 'function'
            ? extraAntesDeEnviar({ consentimientoAceptado: acepto, enviando })
            : extraAntesDeEnviar}
        </div>
        <button type="button" className="pc-guardar pc-enviar" onClick={enviar} disabled={enviando} aria-busy={enviando}>
          {onEnviar ? (enviando ? 'Enviando…' : 'Enviar cuestionario y estudios') : 'Guardar respuestas'}
        </button>
        <div className="pc-acciones-nota">Al enviar, recibirás una confirmación clara en esta misma pantalla.</div>
        {guardado && !onEnviar && <div className="pc-ok">Tus respuestas quedaron guardadas.</div>}
      </>
    );
  };

  return (
    <div className="pc">
      <div className="pc-cuerpo">
        <input ref={trampaRef} type="text" name="pc_no_rellenar" tabIndex={-1} autoComplete="off" aria-hidden="true" className="pc-trampa" />

        <div
          className="pc-progreso"
          role="progressbar"
          aria-label="Avance del cuestionario"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={progreso}
        >
          <div className="pc-progreso-meta"><span>{progreso}% completado</span><b>{paso.titulo}</b></div>
          <div className="pc-progreso-pista"><span style={{ width: `${progreso}%` }} /></div>
        </div>

        <section className="pc-paso" ref={pasoRef} tabIndex={-1} aria-labelledby="pc-paso-titulo">
          <header className="pc-paso-cab">
            <span>{String(indice + 1).padStart(2, '0')}</span>
            <h1 id="pc-paso-titulo">{paso.titulo}</h1>
          </header>

          {bloqueo && <div id="pc-error" ref={alertaRef} tabIndex={-1} className="pc-bloqueo" role="alert">{bloqueo}</div>}
          {contenidoPaso()}

          {paso.id !== 'envio' && (
            <nav className="pc-navegacion" aria-label="Navegación del cuestionario">
              <button type="button" className="pc-anterior" onClick={anterior} disabled={indice === 0}>Anterior</button>
              <button type="button" className="pc-siguiente" onClick={siguiente}>Continuar</button>
            </nav>
          )}
        </section>

        <p className="pc-privacidad-breve">Tus respuestas son privadas. El cuestionario orienta la consulta, pero no sustituye una valoración médica ni emite diagnósticos.</p>
      </div>
    </div>
  );
}
