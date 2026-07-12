import React, { useEffect, useMemo, useState } from 'react';
import { listarRespuestas, eliminarRespuesta, modoAlmacenamiento, sesion, iniciarSesion, cerrarSesion } from './core/respuestas.js';
import { listarEstudios, firmarEstudio, eliminarCarpeta } from './core/estudios.js';
import { ruteoDesdeRespuesta } from './core/precarga.js';
import { agendaDeHoy, cruzarAgenda } from './core/agenda.js';
import { usePaciente } from './core/PacienteContext.jsx';
import { INSTRUMENTOS } from './registry.js';
import { MRS_ITEMS } from './instruments/menopausia/engine.js';
import './Respuestas.css';

/**
 * Panel del médico con las respuestas que las pacientes enviaron desde el portal.
 * Lee del almacenamiento (local en pruebas, base de datos del consultorio en
 * producción). Lista las respuestas y muestra el detalle de cada una.
 */

const HC_LABEL = {
  motivo: 'Motivo de la visita', edadMenarca: 'Edad de la primera regla', embarazos: 'Embarazos',
  partos: 'Partos', cesareas: 'Cesáreas', abortos: 'Pérdidas o abortos', reglasRegulares: 'Reglas regulares',
  sangrado: 'Sangrado vaginal fuera de lo normal', anticonceptivo: 'Método anticonceptivo',
  ultimoPap: 'Último Papanicolaou', cirugiasGineco: 'Cirugías ginecológicas',
  acne: 'Acné', hirsutismo: 'Aumento de vello', caidaCabello: 'Caída de cabello',
  enfDiabetes: 'Diabetes', enfHipertension: 'Presión alta', enfTiroides: 'Problemas de tiroides',
  enfCorazon: 'Problemas del corazón', enfCancer: 'Antecedente de cáncer', enfOtra: 'Otra enfermedad',
  cirugias: 'Otras cirugías', fuma: 'Fuma', alcohol: 'Bebe alcohol', medicamentos: 'Medicamentos', alergias: 'Alergias',
  famCancerMama: 'Familiar con cáncer de mama', famCancerOvario: 'Familiar con cáncer de ovario',
  famDiabetes: 'Familiar con diabetes', famHipertension: 'Familiar con presión alta',
  famOsteoporosis: 'Familiar con osteoporosis', famOtra: 'Otro antecedente familiar',
};
const ESCALA = ['Nada', 'Leve', 'Moderado', 'Intenso', 'Muy intenso'];
const OCULTAR = new Set(['telefono', 'correo']);

function fmtFecha(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  // Una cadena corrupta no lanza excepción: da una fecha inválida.
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtValor(v) { if (v === true) return 'Sí'; if (v === false) return 'No'; return String(v); }

function fmtHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

// Chips de síntomas para la lista, reutilizados por agenda y por respuestas sueltas.
function Chips({ r }) {
  return (
    <>
      {r.resumen?.menopausia?.total > 0 && <span className="resp-chip">Síntomas: intensidad {r.resumen.menopausia.intensidad}</span>}
      {r.resumen?.dolor && <span className="resp-chip alerta">{r.resumen.dolor.intensidad != null ? `Dolor ${r.resumen.dolor.intensidad}/10` : 'Dolor presente'}</span>}
    </>
  );
}

function Panel() {
  const [lista, setLista] = useState(null);
  const [agenda, setAgenda] = useState([]);
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'error' | 'listo'
  const [selId, setSelId] = useState(null);
  const [enlace, setEnlace] = useState('');

  const recargar = () => {
    setEstado('cargando');
    // La agenda es opcional: si falla o no está configurada, el panel sigue con las
    // respuestas. Las respuestas sí son esenciales; su fallo es un error real.
    Promise.all([listarRespuestas(), agendaDeHoy().catch(() => [])])
      .then(([r, ag]) => {
        setLista(r); setAgenda(ag || []);
        if (r.length) setSelId((s) => s || r[0].id);
        setEstado('listo');
      })
      .catch(() => setEstado('error'));
  };

  useEffect(() => {
    recargar();
    try { setEnlace(window.location.origin + '/'); } catch (_) { /* sin window */ }
  }, []);

  const modo = modoAlmacenamiento();
  // Cruce agenda del día × cuestionarios recibidos.
  const { agendadas, sinAgendar } = useMemo(
    () => cruzarAgenda(agenda, lista || []),
    [agenda, lista],
  );
  const contestadas = agendadas.filter((a) => a.contesto).length;

  if (estado === 'cargando') return <div className="resp"><div className="resp-cargando">Cargando…</div></div>;

  const sel = (lista || []).find((r) => r.id === selId) || null;

  const eliminar = async (id, estudiosFolder) => {
    const aviso = estudiosFolder
      ? '¿Eliminar esta respuesta y los estudios que subió la paciente de forma permanente? No se puede deshacer.'
      : '¿Eliminar esta respuesta de forma permanente? No se puede deshacer.';
    if (!window.confirm(aviso)) return;
    try {
      // Primero los estudios: si la fila se borra antes, se pierde el identificador
      // de la carpeta y los archivos quedarían huérfanos e irrecuperables.
      if (estudiosFolder) await eliminarCarpeta(estudiosFolder);
      await eliminarRespuesta(id);
      setLista((l) => l.filter((r) => r.id !== id));
      setSelId((s) => (s === id ? null : s));
    } catch (_) {
      window.alert('No se pudo eliminar la respuesta.');
    }
  };

  const cab = (
    <>
      <header className="resp-cab">
        <div>
          <div className="resp-eyebrow">Respuestas de pacientes</div>
          <h1>Lo que respondieron tus pacientes<small>{(lista || []).length} {(lista || []).length === 1 ? 'respuesta recibida' : 'respuestas recibidas'}</small></h1>
        </div>
        <div className="inst-mono" aria-hidden="true" />
      </header>
      <div className="resp-barra">
        <div className="resp-enlace">
          <span className="resp-enlace-et">Enlace para tus pacientes</span>
          <code>{enlace || '—'}</code>
          <button onClick={() => { if (enlace && navigator.clipboard) navigator.clipboard.writeText(enlace); }}>Copiar</button>
        </div>
        {modo === 'local' && (
          <div className="resp-modo">Modo local de prueba: las respuestas se guardan solo en este navegador. Al conectar la base de datos del consultorio, llegarán desde cualquier dispositivo y recibirás aviso por correo.</div>
        )}
        {modo === 'consultorio' && (
          <button className="resp-salir" onClick={async () => { await cerrarSesion(); window.location.reload(); }}>Cerrar sesión</button>
        )}
      </div>
    </>
  );

  // Error real al traer las respuestas: no confundirlo con "no hay respuestas".
  if (estado === 'error') {
    return (
      <div className="resp">
        {cab}
        <div className="resp-error">
          No se pudieron cargar las respuestas. Puede ser un problema de conexión o del consultorio.
          <button onClick={recargar}>Reintentar</button>
        </div>
      </div>
    );
  }

  const hayAgenda = agendadas.length > 0;
  const totalVacio = (lista || []).length === 0 && !hayAgenda;

  return (
    <div className="resp">
      {cab}

      {totalVacio ? (
        <div className="resp-vacio">Aún no hay respuestas. Comparte el enlace con tus pacientes; cuando una responda, aparecerá aquí.</div>
      ) : (
        <div className="resp-grid">
          <div className="resp-lista">
            {hayAgenda && (
              <section className="resp-grupo">
                <div className="resp-grupo-cab">
                  <h2>Hoy en agenda</h2>
                  <span>{contestadas} de {agendadas.length} con cuestionario</span>
                </div>
                <ul>
                  {agendadas.map(({ cita, respuesta, contesto }) => (
                    <li key={cita.cita_id}>
                      <button
                        className={'resp-item cita' + (contesto ? '' : ' pendiente') + (respuesta && respuesta.id === selId ? ' activo' : '')}
                        onClick={() => { if (respuesta) setSelId(respuesta.id); }}
                        disabled={!respuesta}
                      >
                        <span className="resp-item-fila">
                          <span className="resp-hora">{fmtHora(cita.inicio) || '—'}</span>
                          <span className="resp-item-n">{cita.nombre || (respuesta && respuesta.paciente?.nombre) || 'Sin nombre'}</span>
                          <span className={'resp-estado ' + (contesto ? 'ok' : 'falta')}>{contesto ? 'Contestó' : 'Sin cuestionario'}</span>
                        </span>
                        {respuesta && <span className="resp-item-chips"><Chips r={respuesta} /></span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {sinAgendar.length > 0 && (
              <section className="resp-grupo">
                <div className="resp-grupo-cab">
                  <h2>{hayAgenda ? 'Otras respuestas' : 'Respuestas recibidas'}</h2>
                  <span>{sinAgendar.length}</span>
                </div>
                <ul>
                  {sinAgendar.map((r) => (
                    <li key={r.id}>
                      <button className={'resp-item' + (r.id === selId ? ' activo' : '')} onClick={() => setSelId(r.id)}>
                        <span className="resp-item-fila">
                          <span className="resp-item-n">{r.paciente?.nombre || 'Sin nombre'}</span>
                          <span className="resp-item-f">{fmtFecha(r.creado)}</span>
                        </span>
                        <span className="resp-item-chips"><Chips r={r} /></span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
          <div className="resp-detalle">
            {sel ? <Detalle r={sel} onEliminar={eliminar} /> : <div className="resp-vacio">Selecciona una paciente de la lista para ver su cuestionario.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function Detalle({ r, onEliminar }) {
  const { cargarRespuesta, irA, origen, resumenes, paciente } = usePaciente();
  const mrs = r.autoReporte?.mrs || {};
  const dolor = r.autoReporte?.dolor || {};
  const hc = r.autoReporte?.hc || {};
  const sintomas = MRS_ITEMS.filter((i) => mrs[i.id] != null && mrs[i.id] > 0);
  const hcEntradas = Object.entries(hc).filter(([k, v]) => !OCULTAR.has(k) && v !== '' && v != null && HC_LABEL[k]);
  // Sugerencias del ruteo clínico que existen en este módulo (vista previa).
  const sugeridos = useMemo(() => {
    try {
      return (ruteoDesdeRespuesta(r).instrumentosSugeridos || [])
        .filter((s) => INSTRUMENTOS.some((i) => i.id === s.instrumento && i.estado === 'activo'));
    } catch (_) { return []; }
  }, [r]);

  const abrir = () => {
    // Si ya hay trabajo en curso (otra respuesta cargada, instrumentos evaluados
    // o una paciente capturada a mano), avisar antes de reemplazarlo.
    const hayTrabajo = origen || Object.keys(resumenes || {}).length > 0
      || (paciente && paciente.demografia && paciente.demografia.nombre);
    if (hayTrabajo && !window.confirm('Vas a reemplazar a la paciente activa en los instrumentos; lo capturado y evaluado se perderá. ¿Continuar?')) return;
    cargarRespuesta(r);
    irA('resumen');
  };

  return (
    <div className="resp-card">
      <div className="resp-card-cab">
        <h2>{r.paciente?.nombre || 'Sin nombre'}</h2>
        <div className="resp-meta">
          {r.paciente?.edad != null && <span>{r.paciente.edad} años</span>}
          {r.paciente?.telefono && <span>Teléfono {r.paciente.telefono}</span>}
          {r.paciente?.correo && <span>{r.paciente.correo}</span>}
          <span>{fmtFecha(r.creado)}</span>
        </div>
        {onEliminar && <button className="resp-eliminar" onClick={() => onEliminar(r.id, r.estudiosFolder)}>Eliminar respuesta</button>}
      </div>

      <div className="resp-abrir-zona">
        <button className="resp-abrir" onClick={abrir}>Abrir en instrumentos</button>
        <p className="resp-abrir-nota">
          Carga a la paciente en los instrumentos con lo que contestó ya prellenado
          {sugeridos.length > 0 && (
            <> · sugiere {sugeridos.map((s) => s.nombre).join(', ')}</>
          )}.
        </p>
      </div>

      <section className="resp-sec">
        <h3>Síntomas reportados</h3>
        {sintomas.length ? (
          <ul className="resp-sintomas">
            {sintomas.map((i) => (
              <li key={i.id}><span>{i.texto}</span><b className={'g' + mrs[i.id]}>{ESCALA[mrs[i.id]] || mrs[i.id]}</b></li>
            ))}
          </ul>
        ) : <p className="resp-nada">Sin síntomas marcados en la escala.</p>}
      </section>

      <section className="resp-sec">
        <h3>Dolor pélvico</h3>
        {dolor.tiene
          ? <p className="resp-dolor">Dolor presente. Intensidad {dolor.intensidad ?? '—'} de 10{dolor.meses != null ? `, desde hace ${dolor.meses} meses` : ''}.</p>
          : <p className="resp-nada">No reportó dolor.</p>}
      </section>

      {hcEntradas.length > 0 && (
        <section className="resp-sec">
          <h3>Historia que compartió</h3>
          <ul className="resp-hc">
            {hcEntradas.map(([k, v]) => <li key={k}><span>{HC_LABEL[k]}</span><b>{fmtValor(v)}</b></li>)}
          </ul>
        </section>
      )}

      {r.estudiosFolder && <EstudiosAdjuntos folder={r.estudiosFolder} />}
    </div>
  );
}

function EstudiosAdjuntos({ folder }) {
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [archivos, setArchivos] = useState([]);

  useEffect(() => {
    let vivo = true;
    setEstado('cargando');
    listarEstudios(folder)
      .then((a) => { if (vivo) { setArchivos(a); setEstado('listo'); } })
      .catch(() => { if (vivo) setEstado('error'); });
    return () => { vivo = false; };
  }, [folder]);

  return (
    <section className="resp-sec">
      <h3>Estudios adjuntos</h3>
      {estado === 'cargando' && <p className="resp-nada">Cargando estudios…</p>}
      {estado === 'error' && <p className="resp-nada">No se pudieron cargar los estudios.</p>}
      {estado === 'listo' && (archivos.length ? (
        <ul className="resp-hc">
          {archivos.map((a) => (
            <li key={a.nombre}>
              <span>{a.nombre}</span>
              <AbrirEstudio ruta={a.ruta} />
            </li>
          ))}
        </ul>
      ) : <p className="resp-nada">No subió estudios.</p>)}
    </section>
  );
}

// Genera el enlace firmado al hacer clic (no al listar), para que no caduque si la
// pestaña queda abierta mucho tiempo. Si la firma falla, avisa y permite reintentar.
function AbrirEstudio({ ruta }) {
  const [estado, setEstado] = useState('listo'); // 'listo' | 'abriendo' | 'error'

  const abrir = async () => {
    setEstado('abriendo');
    // Se abre la pestaña de forma síncrona dentro del gesto del clic (Safari bloquea
    // window.open que ocurre después de un await) y luego se le asigna el enlace ya
    // firmado. Si el navegador la bloqueó (devuelve null), se avisa con estado error.
    const win = window.open('', '_blank', 'noopener,noreferrer');
    try {
      const url = await firmarEstudio(ruta);
      if (win) { win.location = url; setEstado('listo'); }
      else { setEstado('error'); }
    } catch (_) {
      if (win) win.close();
      setEstado('error');
    }
  };

  if (estado === 'error') return <button className="resp-abrir-estudio error" onClick={abrir}><b>No disponible, reintentar</b></button>;
  return <button className="resp-abrir-estudio" onClick={abrir} disabled={estado === 'abriendo'}><b>{estado === 'abriendo' ? 'Abriendo…' : 'Abrir'}</b></button>;
}

/**
 * Puerta de acceso. En modo local de prueba entra directo (no hay clave).
 * En modo consultorio (base de datos conectada) exige iniciar sesión: la paciente
 * solo puede enviar respuestas; únicamente el médico autenticado puede verlas.
 */
export default function Respuestas() {
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'login' | 'panel'

  useEffect(() => {
    sesion().then((s) => setEstado(s ? 'panel' : 'login')).catch(() => setEstado('login'));
  }, []);

  if (estado === 'cargando') return <div className="resp"><div className="resp-cargando">Cargando…</div></div>;
  if (estado === 'login') return <Login onEntrar={() => setEstado('panel')} />;
  return <Panel />;
}

function Login({ onEntrar }) {
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [entrando, setEntrando] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setError('');
    setEntrando(true);
    try { await iniciarSesion(correo, clave); onEntrar(); }
    catch (e) {
      // Un 400 de Supabase es credencial inválida; cualquier otra cosa (sin red,
      // servicio caído) no es culpa de la contraseña y no debe mandar a resetearla.
      const status = e && (e.status || (e.originalError && e.originalError.status));
      const credenciales = status === 400 || /invalid login|credentials|password/i.test((e && e.message) || '');
      setError(credenciales
        ? 'Correo o contraseña incorrectos.'
        : 'No hay conexión con el consultorio. Inténtalo de nuevo en un momento.');
    }
    finally { setEntrando(false); }
  };

  return (
    <div className="resp resp-login">
      <form className="resp-login-card" onSubmit={entrar}>
        <div className="inst-mono" aria-hidden="true" />
        <h2>Acceso del consultorio</h2>
        <p>Entra con tu correo y contraseña para ver las respuestas de tus pacientes.</p>
        <input type="email" placeholder="Correo" value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="username" />
        <input type="password" placeholder="Contraseña" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="current-password" />
        {error && <div className="resp-login-error">{error}</div>}
        <button type="submit" disabled={entrando || !correo || !clave}>{entrando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  );
}
