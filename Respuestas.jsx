import React, { useEffect, useState } from 'react';
import { sesion, iniciarSesion } from './core/respuestas.js';
import PanelConsultorio from './PanelConsultorio.jsx';
import { PacienteProvider } from './core/PacienteContext.jsx';
import { observarCuentaTrabajo, obtenerAmbitoTrabajo } from './core/trabajo.js';
import './Respuestas.css';

export default function Respuestas(props) {
  const [acceso, setAcceso] = useState({ ambito: undefined, estado: 'cargando', usuario: null, generacion: 0 });
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vivo = true, revision = 0, desuscribir;
    const cambiar = ambito => {
      if (!vivo) return;
      revision++;
      setAcceso(prev => prev.ambito === ambito ? prev : { ambito, estado: ambito ? 'cargando' : 'login', usuario: null, generacion: prev.generacion + 1 });
    };
    (async () => {
      let antes = revision;
      try {
        // Invalidar la pantalla en el evento; consultar Auth fuera de su callback.
        desuscribir = await observarCuentaTrabajo(cambiar);
        if (!vivo) { desuscribir(); return; }
        antes = revision;
        const ambito = await obtenerAmbitoTrabajo();
        if (antes === revision) cambiar(ambito);
      } catch (_) { if (vivo && antes === revision) setAcceso(prev => ({ ambito: null, estado: 'login', usuario: null, generacion: prev.generacion + 1 })); }
    })();
    return () => { vivo = false; desuscribir?.(); };
  }, [intento]);
  useEffect(() => {
    if (!acceso.ambito) return;
    let vivo = true;
    const ambito = acceso.ambito;
    const generacion = acceso.generacion;
    (async () => {
      try {
        const s = await sesion();
        const actual = await obtenerAmbitoTrabajo();
        if (!vivo) return;
        if (actual !== ambito) {
          setAcceso(prev => prev.generacion !== generacion ? prev : { ambito: actual, estado: actual ? 'cargando' : 'login', usuario: null, generacion: generacion + 1 });
          return;
        }
        const usuario = s?.user || (s?.local ? { id: 'local' } : null);
        setAcceso(prev => prev.generacion !== generacion ? prev : { ambito, estado: usuario ? 'panel' : 'login', usuario, generacion });
      } catch (_) { if (vivo) setAcceso(prev => prev.generacion !== generacion ? prev : { ambito: null, estado: 'login', usuario: null, generacion: generacion + 1 }); }
    })();
    return () => { vivo = false; };
  }, [acceso.ambito, acceso.generacion, intento]);
  if (acceso.estado === 'cargando') return <div className="resp"><p className="resp-empty" role="status">Comprobando sesión…</p></div>;
  if (acceso.estado === 'login') return <Login onEntrar={() => { setAcceso(prev => ({ ambito: undefined, estado: 'cargando', usuario: null, generacion: prev.generacion + 1 })); setIntento(n => n + 1); }} />;
  return <PacienteProvider key={acceso.ambito + ':' + acceso.generacion} irA={props.irA}><PanelConsultorio {...props} usuario={acceso.usuario} /></PacienteProvider>;
}
function Login({ onEntrar }) {
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [entrando, setEntrando] = useState(false);
  const entrar = async e => {
    e.preventDefault(); setError(''); setEntrando(true);
    try { onEntrar(await iniciarSesion(correo, clave)); }
    catch (e) { setError(e?.status === 400 || /invalid login|credentials|password/i.test(e?.message || '') ? 'Correo o contraseña incorrectos.' : 'No se pudo conectar con el consultorio. Inténtalo de nuevo.'); }
    finally { setEntrando(false); }
  };
  return <div className="resp resp-login"><form onSubmit={entrar}>
    <h1>Acceso del consultorio</h1>
    <label>Correo<input type="email" required value={correo} onChange={e => setCorreo(e.target.value)} autoComplete="username" /></label>
    <label>Contraseña<input type="password" required value={clave} onChange={e => setClave(e.target.value)} autoComplete="current-password" /></label>
    {error && <p className="resp-notice error" role="alert">{error}</p>}
    <button className="resp-button primary" type="submit" disabled={entrando}>{entrando ? 'Entrando…' : 'Entrar'}</button>
  </form></div>;
}
