import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Copy, Inbox, Link2, LogOut, Paperclip, Printer, RefreshCw, Save, Search, Undo2, X } from 'lucide-react';
import { listarRespuestas, eliminarRespuesta, modoAlmacenamiento, cerrarSesion } from './core/respuestas.js';
import { agendaDeHoy, hoyLocal } from './core/agenda.js';
import { construirJornada, revisionVigente, huellaRespuesta } from './core/jornada.js';
import { listarTrabajos } from './core/trabajo.js';
import { filtrarRespuestas, resumenLectura } from './core/lecturaRespuesta.js';
import { eliminarCarpeta, listarEstudios } from './core/estudios.js';
import { usePaciente } from './core/PacienteContext.jsx';
import DetallePreconsulta from './DetallePreconsulta.jsx';

const TITULOS = { jornada: 'Jornada de consulta', pendientes: 'Preconsultas por revisar', pacientes: 'Pacientes' };
const ET_SECCION = { jornada: 'la jornada', pendientes: 'pendientes', pacientes: 'pacientes' };
const fecha = (iso, conHora = false) => {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso + 'T12:00:00' : iso);
  return iso && !Number.isNaN(d.getTime()) ? d.toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}) }) : 'Fecha no registrada';
};
const hora = iso => { const d = new Date(iso); return iso && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : 'Sin hora'; };
const idDe = r => String(r?.id ?? '');
const vinculoDe = t => t?.gestionConsulta?.vinculo?.estado === 'confirmado' ? t.gestionConsulta.vinculo : null;
const revisionConfirmada = (r, t) => !t?._conflicto && revisionVigente(r, t);

export default function PanelConsultorio({ seccion, navegacion, instrumentoId, onCerrarInstrumento, usuario }) {
  const ctx = usePaciente();
  const [lista, setLista] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [trabajos, setTrabajos] = useState({});
  const [dia, setDia] = useState(hoyLocal);
  const [cargando, setCargando] = useState(true);
  const [errorRespuestas, setErrorRespuestas] = useState(false);
  const [errorAgenda, setErrorAgenda] = useState(false);
  const [errorTrabajo, setErrorTrabajo] = useState(false);
  const [actualizado, setActualizado] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('pendientes');
  const [orden, setOrden] = useState('antiguas');
  const [limite, setLimite] = useState(25);
  const [seleccion, setSeleccion] = useState(null);
  const [tab, setTab] = useState('resumen');
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [cargandoCaso, setCargandoCaso] = useState(false);
  const [estadosArchivos, setEstadosArchivos] = useState({});
  const turno = useRef(0);
  const cambioCaso = useRef(0);
  const operacion = useRef(false);
  const scrollLista = useRef(0);
  const tituloRef = useRef(null);
  const modo = modoAlmacenamiento();
  const autorId = usuario?.id || (modo === 'local' ? 'local' : null);

  const recargar = useCallback(async () => {
    if (operacion.current) return;
    const actual = ++turno.current;
    setCargando(true);
    const [respuestas, citas, trabajo] = await Promise.allSettled([listarRespuestas(), agendaDeHoy(dia, { estricto: true }), listarTrabajos()]);
    if (actual !== turno.current) return;
    if (respuestas.status === 'fulfilled') { setLista(respuestas.value || []); setErrorRespuestas(false); }
    else setErrorRespuestas(true);
    if (citas.status === 'fulfilled') { setAgenda(citas.value || []); setErrorAgenda(false); }
    else { setAgenda([]); setErrorAgenda(true); }
    if (trabajo.status === 'fulfilled') {
      const conflictos = new Set(Object.entries(trabajo.value.porClave || {}).filter(([, t]) => t.estado === 'conflicto').map(([id]) => id));
      setTrabajos(Object.fromEntries(Object.entries(trabajo.value.trabajos || {}).map(([id, t]) => [id, { ...t, _conflicto: conflictos.has(id) }])));
      setErrorTrabajo(!!trabajo.value.error || trabajo.value.estado === 'error' || conflictos.size > 0);
    } else setErrorTrabajo(true);
    setActualizado(new Date().toISOString()); setCargando(false);
  }, [dia]);
  useEffect(() => { recargar(); return () => { turno.current++; }; }, [recargar]);
  useEffect(() => {
    cambioCaso.current++; setSeleccion(null); setTab('resumen'); setBusqueda(''); setLimite(25);
  }, [navegacion]);
  useEffect(() => { setLimite(25); }, [busqueda, filtro, orden, seccion]);
  useEffect(() => { if (instrumentoId && seleccion?.respuestaId) setTab('instrumentos'); }, [instrumentoId]);
  useEffect(() => {
    const clave = idDe(ctx.origen);
    if (!clave || ctx.cargandoTrabajo || !ctx.gestionConsulta) return;
    setTrabajos(prev => {
      if (prev[clave] && !ctx.guardadoEn) return prev;
      const conflicto = !!ctx.conflictoTrabajo || !!prev[clave]?._conflicto;
      if (JSON.stringify(prev[clave]?.gestionConsulta) === JSON.stringify(ctx.gestionConsulta) && prev[clave]?.guardadoEn === ctx.guardadoEn && prev[clave]?._conflicto === conflicto) return prev;
      return { ...prev, [clave]: { ...prev[clave], gestionConsulta: ctx.gestionConsulta, guardadoEn: ctx.guardadoEn, _conflicto: conflicto } };
    });
  }, [ctx.origen, ctx.gestionConsulta, ctx.guardadoEn, ctx.cargandoTrabajo, ctx.conflictoTrabajo]);
  const trabajosActuales = useMemo(() => {
    const clave = idDe(ctx.origen);
    if (!clave || ctx.cargandoTrabajo) return trabajos;
    const leido = trabajos[clave];
    if (leido && !ctx.guardadoEn) return trabajos;
    return { ...trabajos, [clave]: { ...leido, gestionConsulta: ctx.gestionConsulta, guardadoEn: ctx.guardadoEn, _conflicto: !!ctx.conflictoTrabajo || !!leido?._conflicto } };
  }, [trabajos, ctx.origen, ctx.gestionConsulta, ctx.guardadoEn, ctx.cargandoTrabajo, ctx.conflictoTrabajo]);
  const jornada = useMemo(() => construirJornada(agenda, lista, Object.fromEntries(Object.entries(trabajosActuales).filter(([, t]) => !t._conflicto))), [agenda, lista, trabajosActuales]);
  const r = lista.find(x => idDe(x) === seleccion?.respuestaId) || null;
  const cita = agenda.find(c => String(c.cita_id) === seleccion?.citaId) || seleccion?.cita || null;
  const grupo = jornada.grupos.find(g => g.respuestas.some(x => idDe(x) === idDe(r)));
  const trabajo = r ? trabajosActuales[idDe(r)] : null;
  const vinculo = grupo?.confirmado ? vinculoDe(trabajo) : null;
  const revisada = r ? revisionConfirmada(r, trabajo) : false;
  const contextoListo = r && !cargandoCaso && !ctx.cargandoTrabajo && idDe(ctx.origen) === idDe(r);

  const abrir = async (respuesta, citaAbierta = null, tabInicial = 'resumen') => {
    if (operacion.current) return;
    if (!seleccion) scrollLista.current = window.scrollY;
    const actual = ++cambioCaso.current;
    onCerrarInstrumento(); setTab(tabInicial); setAviso(null);
    setSeleccion({ respuestaId: respuesta ? idDe(respuesta) : null, citaId: citaAbierta ? String(citaAbierta.cita_id) : null, cita: citaAbierta });
    if (!respuesta) { setCargandoCaso(false); requestAnimationFrame(() => tituloRef.current?.focus()); return; }
    setCargandoCaso(true);
    try { if (!(await ctx.cargarRespuesta(respuesta))) throw new Error('No se pudo abrir esta respuesta.'); }
    catch (_) { if (actual === cambioCaso.current) setAviso({ tipo: 'error', texto: 'No se pudo recuperar el trabajo de esta respuesta. No se cargará el trabajo de otra paciente.' }); }
    finally { if (actual === cambioCaso.current) { setCargandoCaso(false); requestAnimationFrame(() => tituloRef.current?.focus()); } }
  };
  const volver = () => {
    cambioCaso.current++; setSeleccion(null); onCerrarInstrumento();
    requestAnimationFrame(() => window.scrollTo({ top: scrollLista.current, behavior: 'instant' }));
  };
  const guardarGestion = async (parcial, tipo) => {
    if (!contextoListo || operacion.current) return false;
    operacion.current = true; setOcupado(true); setAviso(null);
    try { await ctx.actualizarGestion(parcial, { tipo, autorId }); return true; }
    catch (_) { setAviso({ tipo: 'error', texto: 'No se pudo guardar el cambio. Revisa el estado de guardado y reintenta.' }); return false; }
    finally { operacion.current = false; setOcupado(false); }
  };
  const revisar = () => guardarGestion({ revision: { estado: revisada ? 'pendiente' : 'revisada', fecha: new Date().toISOString(), autorId, versionHuella: huellaRespuesta(r) } }, revisada ? 'revision_reabierta' : 'preconsulta_revisada');
  const eliminar = async () => {
    if (!r || operacion.current || !window.confirm('¿Eliminar permanentemente esta respuesta' + (r.estudiosFolder ? ' y sus estudios' : '') + '? No se puede deshacer.')) return;
    operacion.current = true; turno.current++; setOcupado(true); setCargando(false); setAviso(null);
    try {
      if (r.estudiosFolder) { await eliminarCarpeta(r.estudiosFolder); if ((await listarEstudios(r.estudiosFolder)).length) throw new Error('Quedan archivos.'); }
      await eliminarRespuesta(r.id);
      const restantes = await listarRespuestas();
      if (restantes.some(x => idDe(x) === idDe(r))) throw new Error('Respuesta presente.');
      setLista(restantes); volver(); setAviso({ tipo: 'exito', texto: 'Se comprobó que la respuesta ya no aparece en la bandeja.' });
    } catch (_) { setAviso({ tipo: 'error', texto: 'No se pudo confirmar la eliminación. Actualiza antes de volver a intentarlo.' }); }
    finally { operacion.current = false; setOcupado(false); }
  };
  const copiar = async () => {
    const enlace = window.location.origin + '/';
    try { await navigator.clipboard.writeText(enlace); setAviso({ tipo: 'exito', texto: 'Enlace del cuestionario copiado.' }); }
    catch (_) { setAviso({ tipo: 'error', texto: 'No se pudo copiar. Enlace: ' + enlace }); }
  };
  const salir = async () => {
    if (operacion.current) return;
    operacion.current = true; setOcupado(true); setAviso(null);
    try {
      const resultado = await ctx.guardar();
      if (!resultado?.ok) throw new Error('No se guardaron los cambios.');
      await cerrarSesion();
      window.location.reload();
    } catch (_) { setAviso({ tipo: 'error', texto: 'No se cerró la sesión. No se pudo confirmar el guardado o la salida; reintenta antes de cerrar esta página.' }); }
    finally { operacion.current = false; setOcupado(false); }
  };
  const estadoArchivos = useCallback((id, estado) => setEstadosArchivos(prev => JSON.stringify(prev[id]) === JSON.stringify(estado) ? prev : { ...prev, [id]: estado }), []);
  const filtradas = filtrarRespuestas(lista, { busqueda, orden }).filter(x => seccion !== 'pendientes' || filtro === 'todas' || (filtro === 'revisadas' ? revisionConfirmada(x, trabajosActuales[idDe(x)]) : !revisionConfirmada(x, trabajosActuales[idDe(x)])));
  const idsSinVinculo = new Set(jornada.sinVincular.map(idDe));
  const conVinculo = filtradas.filter(x => !idsSinVinculo.has(idDe(x)));
  const sinVinculo = filtradas.filter(x => idsSinVinculo.has(idDe(x)));
  const coincide = x => !busqueda || filtrarRespuestas([x], { busqueda }).length > 0;
  const citasVisibles = jornada.citas.filter(f => !busqueda || f.respuestas.some(coincide) || coincide({ paciente: { nombre: f.cita.nombre, telefono: f.cita.telefono }, autoReporte: { hc: {} } }));
  const gruposVisibles = jornada.grupos.filter(g => g.confirmado && g.respuestas.some(coincide));
  const cambiarDia = delta => { const d = new Date(dia + 'T12:00:00'); d.setDate(d.getDate() + delta); setDia(hoyLocal(d)); setAgenda([]); };

  return <div className="resp jornada-panel">
    <header className="resp-cab">
      <div>{seleccion ? <button className="resp-text-button" onClick={volver} disabled={ocupado}><ArrowLeft size={17} />Volver a {ET_SECCION[seccion]}</button> : <h1>{TITULOS[seccion]}</h1>}<p>{actualizado ? 'Última lectura ' + hora(actualizado) : 'Preparando lectura'}</p></div>
      <div className="resp-toolbar"><button className="resp-icon" title="Copiar enlace para pacientes" aria-label="Copiar enlace para pacientes" onClick={copiar}><Copy size={17} /></button><button className="resp-icon" title="Actualizar datos" aria-label="Actualizar datos" disabled={cargando || ocupado} onClick={recargar}><RefreshCw size={18} /></button>{modo === 'consultorio' && <button className="resp-icon" title="Cerrar sesión" aria-label="Cerrar sesión" disabled={ocupado} onClick={salir}><LogOut size={18} /></button>}</div>
    </header>
    {modo === 'local' && <p className="resp-local">Prueba local · sin conexión al consultorio.</p>}
    {aviso && <div className={'resp-notice ' + aviso.tipo} role={aviso.tipo === 'error' ? 'alert' : 'status'}>{aviso.texto}<button className="resp-icon" aria-label="Cerrar aviso" onClick={() => setAviso(null)}><X size={16} /></button></div>}
    {errorRespuestas && <div className="resp-notice error" role="alert">No se pudieron actualizar las respuestas. {lista.length ? 'Se conserva la última lectura.' : ''}<button className="resp-button" onClick={recargar}>Reintentar</button></div>}
    {errorTrabajo && <div className="resp-notice error" role="alert">No se pudieron verificar todas las decisiones guardadas. Las revisiones y asociaciones pueden estar incompletas.<button className="resp-button" onClick={recargar}>Reintentar</button></div>}
    {cargando && !lista.length ? <p className="resp-empty" role="status">Cargando jornada y preconsultas…</p> : seleccion ? <>
      <header className="consulta-head">
        <div><h1 ref={tituloRef} tabIndex={-1}>{r?.paciente?.nombre || cita?.nombre || 'Respuesta no disponible'}</h1><div className="resp-record-meta">{r?.paciente?.edad != null && <span>{r.paciente.edad} años</span>}{(r?.paciente?.telefono || cita?.telefono) && <span>{r?.paciente?.telefono || cita.telefono}</span>}{r?.paciente?.correo && <span>{r.paciente.correo}</span>}</div>
          {cita ? <p className="consulta-cita"><CalendarDays size={15} />{fecha(cita.fecha || cita.inicio)} · {hora(cita.inicio)} · {cita.estado || 'Estado no registrado'}</p> : vinculo ? <p className="consulta-cita"><CalendarDays size={15} />{fecha(vinculo.fecha)} · {hora(vinculo.inicio)}</p> : <p className="consulta-cita">Sin cita confirmada</p>}
          {r && <p className="resp-received">Envío del {fecha(r.creado, true)} · Respuesta {idDe(r).slice(0, 8)}{vinculo?.pacienteId ? ' · Identidad del panel ' + vinculo.pacienteId.slice(-8) : ''}</p>}
        </div>
        {r && <div className="consulta-actions"><button className={'resp-button ' + (revisada ? '' : 'primary')} disabled={!contextoListo || ocupado || !autorId} onClick={revisar}>{revisada ? <Undo2 size={16} /> : <Check size={16} />}{revisada ? 'Reabrir revisión' : 'Marcar preconsulta revisada'}</button><button className="resp-icon" onClick={() => window.print()} title="Imprimir resumen de preconsulta" aria-label="Imprimir resumen de preconsulta" disabled={!contextoListo}><Printer size={17} /></button></div>}
      </header>
      {!r && seleccion.respuestaId ? <p className="resp-notice error" role="alert">La respuesta abierta ya no aparece en la última lectura. No se cambió a otra paciente.</p> : !r ? <CitaSinRespuesta cita={cita} lista={lista} fila={jornada.citas.find(f => String(f.cita.cita_id) === String(cita?.cita_id))} onAbrir={respuesta => abrir(respuesta, cita)} /> : !contextoListo ? cargandoCaso || ctx.cargandoTrabajo ? <p className="resp-empty" role="status">Recuperando el trabajo de esta respuesta…</p> : <div className="resp-notice error" role="alert">No se pudo abrir el trabajo de esta respuesta.<button className="resp-button" onClick={() => abrir(r, cita)}>Reintentar apertura</button></div> : <>
        <div className="consulta-status"><span className={revisada ? 'jornada-ok' : 'resp-muted'}>{revisada ? 'Preconsulta revisada · ' + fecha(trabajo.gestionConsulta.revision.fecha, true) : 'Preconsulta pendiente de revisión'}</span><EstadoGuardado ctx={ctx} /></div>
        {(cita || vinculo) && <VincularRespuesta key={idDe(r) + (cita?.cita_id || '') + (vinculo?.confirmadoEn || 'sin-vinculo')} r={r} cita={cita} vinculo={vinculo} grupos={jornada.grupos} ocupado={ocupado} autorId={autorId} onGuardar={guardarGestion} />}
        <DetallePreconsulta r={r} tab={tab} setTab={setTab} instrumentoId={instrumentoId} onCerrarInstrumento={onCerrarInstrumento} onEliminar={eliminar} eliminando={ocupado} historial={grupo?.respuestas || [r]} onAbrirHistoria={respuesta => abrir(respuesta)} onEstadoArchivos={estadoArchivos} />
      </>}
    </> : <div className="jornada-listas" aria-busy={cargando}>
      <div className="jornada-controles">
        {seccion === 'jornada' && <div className="jornada-fecha"><button className="resp-icon" title="Día anterior" aria-label="Día anterior" disabled={cargando} onClick={() => cambiarDia(-1)}><ChevronLeft size={18} /></button><input type="date" aria-label="Fecha de la jornada" value={dia} onChange={e => { if (e.target.value) { setDia(e.target.value); setAgenda([]); } }} /><button className="resp-icon" title="Día siguiente" aria-label="Día siguiente" disabled={cargando} onClick={() => cambiarDia(1)}><ChevronRight size={18} /></button><button className="resp-button" onClick={() => setDia(hoyLocal())}>Hoy</button></div>}
        <div className="resp-search"><Search size={17} aria-hidden="true" /><input type="search" aria-label="Buscar paciente, teléfono o motivo" placeholder="Paciente, teléfono o motivo" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></div>
        {seccion === 'pendientes' && <><label className="jornada-select">Revisión<select aria-label="Filtrar por revisión" value={filtro} onChange={e => setFiltro(e.target.value)}><option value="pendientes">Por revisar</option><option value="revisadas">Revisadas</option><option value="todas">Todas</option></select></label><label className="jornada-select">Orden<select aria-label="Orden de recepción" value={orden} onChange={e => setOrden(e.target.value)}><option value="antiguas">Anteriores primero</option><option value="recientes">Recientes primero</option><option value="nombre">Nombre</option></select></label></>}
      </div>
      {seccion === 'jornada' ? <>
        <div className="jornada-section"><h2>{fecha(dia)}</h2><span role="status">{errorAgenda ? 'Agenda no verificable' : citasVisibles.length + ' citas · orden de horario'}</span></div>
        {errorAgenda ? <div className="resp-notice error" role="alert">No se pudo leer la agenda para esta fecha. No significa que no haya citas.<button className="resp-button" onClick={recargar}>Reintentar</button></div> : !citasVisibles.length ? <div className="resp-empty"><CalendarDays size={28} /><p>{cargando ? 'Consultando la fecha…' : busqueda ? 'No hay citas coincidentes.' : modo === 'local' ? 'No hay citas en esta prueba local.' : 'No hay citas publicadas para esta fecha.'}</p></div> : <table className="jornada-table"><thead><tr><th>Hora</th><th>Paciente / cita</th><th>Preconsulta</th><th>Estudios</th><th>Revisión médica</th><th>Consulta</th></tr></thead><tbody>{citasVisibles.map(f => <tr key={f.cita.cita_id}>
          <td data-label="Hora" className="jornada-hora">{hora(f.cita.inicio)}</td><td data-label="Paciente" className="jornada-persona"><button className="jornada-nombre" onClick={() => abrir(f.principal, f.cita)}>{f.cita.nombre || 'Sin nombre'}</button><small>{f.cita.estado || 'Estado no registrado'}</small></td>
          <td data-label="Preconsulta">{f.principal ? <><span className="jornada-ok">Vinculada</span><small>{fecha(f.principal.creado)} · {f.respuestas.length} envíos</small></> : <span className="jornada-aviso">{f.candidatos.length ? 'Por confirmar' : 'Sin vínculo'}</span>}</td>
          <td data-label="Estudios"><EstadoEstudios r={f.principal} estado={estadosArchivos[idDe(f.principal)]} /></td><td data-label="Revisión médica">{f.principal ? <EstadoRevision r={f.principal} trabajo={trabajosActuales[idDe(f.principal)]} error={errorTrabajo} /> : 'Sin preconsulta vinculada'}</td><td><button className="resp-button" onClick={() => abrir(f.principal, f.cita)}>Abrir <ArrowRight size={16} /></button></td>
        </tr>)}</tbody></table>}
      </> : seccion === 'pendientes' ? <>
        <div className="jornada-section"><h2>{filtro === 'revisadas' ? 'Revisadas' : filtro === 'todas' ? 'Todas las preconsultas' : 'Pendientes de revisión'}</h2><span role="status">{filtradas.length} respuestas</span></div>
        {conVinculo.length > 0 && <TablaRespuestas lista={conVinculo.slice(0, limite)} trabajos={trabajosActuales} errorTrabajo={errorTrabajo} estadosArchivos={estadosArchivos} onAbrir={abrir} />}
        {sinVinculo.length > 0 && <><div className="jornada-section"><h2>Sin cita confirmada</h2><span>{sinVinculo.length} respuestas</span></div><TablaRespuestas lista={sinVinculo.slice(0, limite)} trabajos={trabajosActuales} errorTrabajo={errorTrabajo} estadosArchivos={estadosArchivos} onAbrir={abrir} /></>}
        {!filtradas.length && <div className="resp-empty"><Inbox size={28} /><p>No hay respuestas en este filtro.</p></div>}
        {Math.max(sinVinculo.length, conVinculo.length) > limite && <button className="resp-more" onClick={() => setLimite(n => n + 25)}>Mostrar 25 más por grupo</button>}
      </> : <>
        <div className="jornada-section"><h2>Identidades confirmadas</h2><span role="status">{gruposVisibles.length} pacientes</span></div>
        {gruposVisibles.length ? <table className="jornada-table jornada-pacientes"><thead><tr><th>Paciente</th><th>Último envío</th><th>Historial</th><th>Consulta</th></tr></thead><tbody>{gruposVisibles.slice(0, limite).map(g => <tr key={g.id}><td data-label="Paciente" className="jornada-persona"><button className="jornada-nombre" onClick={() => abrir(g.ultima)}>{g.nombre}</button><small>Identidad del panel · {String(g.pacienteId).slice(-8)}</small></td><td data-label="Último envío">{fecha(g.ultima.creado)}</td><td data-label="Historial">{g.respuestas.length} cuestionarios</td><td><button className="resp-button" onClick={() => abrir(g.ultima, null, 'historial')}>Historial <ArrowRight size={16} /></button></td></tr>)}</tbody></table> : <p className="resp-muted">No hay identidades confirmadas que coincidan.</p>}
        {gruposVisibles.length > limite && <button className="resp-more" onClick={() => setLimite(n => n + 25)}>Mostrar 25 pacientes más</button>}
        <div className="jornada-section"><h2>Respuestas por identificar</h2><span>{sinVinculo.length}</span></div>
        <TablaRespuestas lista={sinVinculo.slice(0, limite)} trabajos={trabajosActuales} errorTrabajo={errorTrabajo} estadosArchivos={estadosArchivos} onAbrir={abrir} />
        {sinVinculo.length > limite && <button className="resp-more" onClick={() => setLimite(n => n + 25)}>Mostrar 25 respuestas más</button>}
      </>}
    </div>}
  </div>;
}

function EstadoRevision({ r, trabajo, error }) {
  return trabajo?._conflicto || (error && !trabajo) ? <span className="jornada-aviso">No verificable</span> : revisionConfirmada(r, trabajo) ? <span className="jornada-ok">Revisada</span> : <span>Por revisar</span>;
}
function EstadoEstudios({ r, estado }) {
  if (!r) return <span className="resp-muted">Sin respuesta vinculada</span>;
  if (estado?.estado === 'error') return <span className="jornada-error">No verificables</span>;
  if (estado?.estado === 'listo') return <><span className={estado.faltantes ? 'jornada-error' : 'jornada-ok'}>{estado.faltantes ? estado.faltantes + ' no encontrados' : estado.disponibles + ' listados'}</span>{estado.discrepancias > 0 && <small className="jornada-error">{estado.discrepancias} con discrepancia</small>}</>;
  const n = Array.isArray(r.adjuntos) ? r.adjuntos.length : 0;
  return n || r.estudiosFolder ? <><span className="jornada-files"><Paperclip size={14} />{n ? n + ' registrados' : 'Carpeta registrada'}</span><small>Disponibilidad por comprobar</small></> : <span className="resp-muted">Sin adjuntos registrados</span>;
}
function TablaRespuestas({ lista, trabajos, errorTrabajo, estadosArchivos, onAbrir }) {
  return <table className="jornada-table"><thead><tr><th>Recibida</th><th>Paciente / motivo</th><th>Estudios</th><th>Revisión médica</th><th>Respuesta</th></tr></thead><tbody>{lista.map(r => <tr key={r.id}><td data-label="Recibida">{fecha(r.creado)}<small>{hora(r.creado)}</small></td><td className="jornada-persona" data-label="Paciente"><button className="jornada-nombre" onClick={() => onAbrir(r)}>{r.paciente?.nombre || 'Sin nombre'}</button><small className="jornada-motivo">{resumenLectura(r).motivo}</small>{resumenLectura(r).alertas.length > 0 && <span className="resp-tag alert">{resumenLectura(r).alertas.length} alertas reportadas</span>}</td><td data-label="Estudios"><EstadoEstudios r={r} estado={estadosArchivos[idDe(r)]} /></td><td data-label="Revisión médica"><EstadoRevision r={r} trabajo={trabajos[idDe(r)]} error={errorTrabajo} /></td><td><button className="resp-button" onClick={() => onAbrir(r)}>Abrir <ArrowRight size={16} /></button></td></tr>)}</tbody></table>;
}
function EstadoGuardado({ ctx }) {
  const [reintentando, setReintentando] = useState(false);
  const reintentar = async () => {
    setReintentando(true);
    try { await ctx.reintentarTrabajo(); }
    finally { setReintentando(false); }
  };
  return <div className="consulta-guardado" role="status"><span>{ctx.estadoNube === 'conflicto' ? 'Conflicto con el trabajo de otro equipo' : ctx.estadoNube === 'error' ? 'Guardado incompleto' : ctx.estadoNube === 'guardando' ? 'Guardando…' : ctx.estadoNube === 'nube' ? 'Guardado en el panel · nube' : ctx.guardadoEn ? 'Guardado solo en este equipo' : 'Sin cambios guardados'}</span>{ctx.errorTrabajo && <span className="jornada-error">{ctx.errorTrabajo.message || 'No se pudo confirmar el guardado.'}</span>}{ctx.errorTrabajo ? <button className="resp-icon" onClick={reintentar} aria-label="Reintentar lectura y guardado" title="Reintentar lectura y guardado" disabled={ctx.cargandoTrabajo || reintentando}><RefreshCw size={17} /></button> : <button className="resp-icon" onClick={() => ctx.guardar()} aria-label="Guardar trabajo de esta respuesta" title="Guardar trabajo de esta respuesta" disabled={ctx.cargandoTrabajo || ctx.estadoNube === 'guardando'}><Save size={17} /></button>}</div>;
}
function CitaSinRespuesta({ cita, lista, fila, onAbrir }) {
  const [busqueda, setBusqueda] = useState('');
  const candidatas = fila?.candidatos || [];
  const resultados = busqueda ? filtrarRespuestas(lista, { busqueda, orden: 'recientes' }).slice(0, 20).map(respuesta => ({ respuesta })) : candidatas;
  return <section className="consulta-asociar"><h2>Sin preconsulta confirmada para esta cita</h2><p className="resp-muted">Cita {cita?.cita_id}. La coincidencia de nombre o teléfono requiere confirmación.</p><div className="resp-search"><Search size={17} /><input aria-label="Buscar respuesta para vincular" type="search" placeholder="Buscar entre las respuestas recibidas" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></div><ul className="consulta-candidatas">{resultados.map(c => <li key={c.respuesta.id}><div><strong>{c.respuesta.paciente?.nombre || 'Sin nombre'}</strong><p>{c.respuesta.paciente?.telefono || 'Sin teléfono'} · {fecha(c.respuesta.creado, true)}</p><small>{c.advertencia || (c.criterio ? 'Posible correspondencia por ' + c.criterio : 'Sin asociación confirmada')}</small></div><button className="resp-button" onClick={() => onAbrir(c.respuesta)}>Revisar <ArrowRight size={16} /></button></li>)}</ul>{!resultados.length && <p className="resp-muted">No hay candidatas coincidentes.</p>}</section>;
}
function VincularRespuesta({ r, cita, vinculo, grupos, ocupado, autorId, onGuardar }) {
  const [identidad, setIdentidad] = useState(vinculo?.pacienteId || 'nueva');
  const [confirmo, setConfirmo] = useState(false);
  const identidadValida = grupos.some(g => g.confirmado && g.pacienteId === identidad) ? identidad : 'nueva';
  const coincide = vinculo && (!cita || String(vinculo.citaId) === String(cita.cita_id));
  if (coincide) return <details className="consulta-vinculo-confirmado"><summary><Link2 size={15} />Cita vinculada · identidad confirmada en el panel</summary><p>Confirmada el {fecha(vinculo.confirmadoEn, true)}. No acredita sincronización con el expediente.</p><button className="resp-button" disabled={ocupado} onClick={() => { if (window.confirm('¿Retirar esta asociación? La respuesta y los estudios se conservan.')) onGuardar({ vinculo: { ...vinculo, estado: 'retirado', retiradoEn: new Date().toISOString() } }, 'vinculo_retirado'); }}><Undo2 size={16} />Retirar asociación</button></details>;
  if (!cita) return null;
  const guardar = async () => {
    const pacienteId = identidadValida === 'nueva' ? 'portal:' + crypto.randomUUID() : identidadValida;
    await onGuardar({ vinculo: { estado: 'confirmado', pacienteId, citaId: String(cita.cita_id), nombre: r.paciente?.nombre || cita.nombre, fecha: cita.fecha || hoyLocal(new Date(cita.inicio)), inicio: cita.inicio, confirmadoEn: new Date().toISOString(), autorId } }, 'vinculo_confirmado');
  };
  return <section className="consulta-vincular"><h2>Confirmar respuesta e identidad</h2><p>Cita: {cita.nombre || 'Sin nombre'} · {cita.telefono || 'Sin teléfono'}</p><p>Respuesta: {r.paciente?.nombre || 'Sin nombre'} · {r.paciente?.telefono || 'Sin teléfono'} · {fecha(r.creado, true)}</p>{vinculo && <p className="jornada-error">Esta respuesta tiene otra cita asociada. Confirmar reemplazará esa asociación, conservando el historial de decisiones.</p>}<label className="jornada-select">Identidad de la paciente<select aria-label="Identidad de la paciente" value={identidadValida} onChange={e => { setIdentidad(e.target.value); setConfirmo(false); }}><option value="nueva">Crear identidad confirmada en el panel</option>{grupos.filter(g => g.confirmado).map(g => <option key={g.id} value={g.pacienteId}>{g.nombre} · {String(g.pacienteId).slice(-8)}</option>)}</select></label><label className="consulta-confirmar"><input type="checkbox" checked={confirmo} onChange={e => setConfirmo(e.target.checked)} />Confirmé que esta paciente y esta respuesta corresponden a la cita seleccionada.</label><button className="resp-button primary" disabled={!confirmo || ocupado || !autorId} onClick={guardar}><Link2 size={16} />Confirmar asociación</button></section>;
}
