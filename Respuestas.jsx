import React, { useEffect, useState } from 'react';
import { listarRespuestas, eliminarRespuesta, modoAlmacenamiento, sesion, iniciarSesion, cerrarSesion } from './core/respuestas.js';
import { listarEstudios } from './core/estudios.js';
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
  try { return new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch (_) { return iso; }
}
function fmtValor(v) { if (v === true) return 'Sí'; if (v === false) return 'No'; return String(v); }

function Panel() {
  const [lista, setLista] = useState(null);
  const [selId, setSelId] = useState(null);
  const [enlace, setEnlace] = useState('');

  useEffect(() => {
    listarRespuestas().then((r) => { setLista(r); if (r.length) setSelId(r[0].id); }).catch(() => setLista([]));
    try { setEnlace(window.location.origin + '/'); } catch (_) { /* sin window */ }
  }, []);

  if (lista === null) return <div className="resp"><div className="resp-cargando">Cargando respuestas…</div></div>;
  const sel = lista.find((r) => r.id === selId) || null;
  const modo = modoAlmacenamiento();

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar esta respuesta de forma permanente? No se puede deshacer.')) return;
    try {
      await eliminarRespuesta(id);
      setLista((l) => l.filter((r) => r.id !== id));
      setSelId((s) => (s === id ? null : s));
    } catch (_) {
      window.alert('No se pudo eliminar la respuesta.');
    }
  };

  return (
    <div className="resp">
      <header className="resp-cab">
        <div>
          <div className="resp-eyebrow">Respuestas de pacientes</div>
          <h1>Lo que respondieron tus pacientes<small>{lista.length} {lista.length === 1 ? 'respuesta recibida' : 'respuestas recibidas'}</small></h1>
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

      {lista.length === 0 ? (
        <div className="resp-vacio">Aún no hay respuestas. Comparte el enlace con tus pacientes; cuando una responda, aparecerá aquí.</div>
      ) : (
        <div className="resp-grid">
          <ul className="resp-lista">
            {lista.map((r) => (
              <li key={r.id}>
                <button className={'resp-item' + (r.id === selId ? ' activo' : '')} onClick={() => setSelId(r.id)}>
                  <span className="resp-item-n">{r.paciente?.nombre || 'Sin nombre'}</span>
                  <span className="resp-item-f">{fmtFecha(r.creado)}</span>
                  {r.resumen?.menopausia?.total > 0 && <span className="resp-chip">Síntomas: intensidad {r.resumen.menopausia.intensidad}</span>}
                  {r.resumen?.dolor && <span className="resp-chip alerta">{r.resumen.dolor.intensidad != null ? `Dolor ${r.resumen.dolor.intensidad}/10` : 'Dolor presente'}</span>}
                </button>
              </li>
            ))}
          </ul>
          <div className="resp-detalle">
            {sel ? <Detalle r={sel} onEliminar={eliminar} /> : <div className="resp-vacio">Selecciona una respuesta de la lista.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function Detalle({ r, onEliminar }) {
  const mrs = r.autoReporte?.mrs || {};
  const dolor = r.autoReporte?.dolor || {};
  const hc = r.autoReporte?.hc || {};
  const sintomas = MRS_ITEMS.filter((i) => mrs[i.id] != null && mrs[i.id] > 0);
  const hcEntradas = Object.entries(hc).filter(([k, v]) => !OCULTAR.has(k) && v !== '' && v != null && HC_LABEL[k]);

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
        {onEliminar && <button className="resp-eliminar" onClick={() => onEliminar(r.id)}>Eliminar respuesta</button>}
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
              {a.url
                ? <a href={a.url} target="_blank" rel="noopener noreferrer"><b>Abrir</b></a>
                : <b>—</b>}
            </li>
          ))}
        </ul>
      ) : <p className="resp-nada">No subió estudios.</p>)}
    </section>
  );
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
    catch (_) { setError('Correo o contraseña incorrectos.'); }
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
