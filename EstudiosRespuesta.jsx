import React, { useEffect, useState } from 'react';
import { FileText, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { listarEstudios, eliminarEstudio, firmarEstudio, prepararVisorEstudio, navegarVisorEstudio } from './core/estudios.js';
import { modoAlmacenamiento } from './core/respuestas.js';
import { conciliarEstudios, descripcionEstudios } from './core/lecturaEstudios.js';

export default function EstudiosRespuesta({ respuesta, onEstado }) {
  const { estudiosFolder: folder, adjuntos } = respuesta;
  const [estado, setEstado] = useState('cargando');
  const [actuales, setActuales] = useState([]);
  const [recarga, setRecarga] = useState(0);
  const [eliminando, setEliminando] = useState('');
  const [descartados, setDescartados] = useState([]);
  const [aviso, setAviso] = useState(null);
  const local = modoAlmacenamiento() === 'local';

  useEffect(() => {
    if (!folder || local) { setEstado('sin_conexion'); return; }
    let vivo = true;
    setEstado('cargando');
    listarEstudios(folder).then(a => {
      if (vivo) { setActuales(a); setEstado('listo'); }
    }).catch(() => { if (vivo) setEstado('error'); });
    return () => { vivo = false; };
  }, [folder, recarga, local]);

  const descartar = async (archivo) => {
    if (!window.confirm(`¿Eliminar permanentemente "${archivo.nombre}"? Se conserva la respuesta y el registro original del envío.`)) return;
    setEliminando(archivo.ruta);
    setAviso(null);
    try {
      await eliminarEstudio(archivo.ruta);
      const restantes = await listarEstudios(folder);
      if (restantes.some(a => a.ruta === archivo.ruta)) throw new Error('El archivo sigue presente.');
      setActuales(restantes);
      setDescartados(prev => [...prev, archivo.ruta]);
      setAviso({ tipo: 'exito', texto: 'Se comprobó que el archivo ya no aparece en la carpeta.' });
    } catch (_) {
      setAviso({ tipo: 'error', texto: 'No se pudo confirmar la eliminación. Actualiza los archivos antes de volver a intentarlo.' });
    } finally { setEliminando(''); }
  };
  const archivos = conciliarEstudios(folder, adjuntos, actuales);
  useEffect(() => {
    const conciliados = conciliarEstudios(folder, adjuntos, actuales);
    onEstado?.(String(respuesta.id), { estado,
      disponibles: conciliados.filter(a => a.disponible).length,
      faltantes: conciliados.filter(a => !a.disponible && !descartados.includes(a.ruta)).length,
      discrepancias: conciliados.filter(a => ['diferente', 'vacio'].includes(a.integridad)).length });
  }, [estado, actuales, folder, adjuntos, descartados, respuesta.id, onEstado]);
  return <section className="resp-sec">
    <div className="resp-section-heading">
      <h3>Estudios de esta preconsulta</h3>
      {folder && !local && <button className="resp-icon" title="Actualizar archivos" aria-label="Actualizar archivos" disabled={estado === 'cargando' || !!eliminando} onClick={() => setRecarga(n => n + 1)}><RefreshCw size={17} /></button>}
    </div>
    <p className="resp-muted">{descripcionEstudios(respuesta)}</p>
    {local && folder && <p className="resp-notice">Vista local: no se consultó el almacenamiento privado.</p>}
    {estado === 'cargando' && <p role="status">Consultando almacenamiento…</p>}
    {estado === 'error' && <div className="resp-notice error" role="alert">No se pudo consultar la carpeta. Esto no significa que no haya estudios.<button className="resp-button" onClick={() => setRecarga(n => n + 1)}>Reintentar</button></div>}
    {aviso && <p className={'resp-notice ' + aviso.tipo} role={aviso.tipo === 'error' ? 'alert' : 'status'}>{aviso.texto}</p>}
    {estado === 'listo' && archivos.length === 0 && <p className="resp-notice">La carpeta está vacía actualmente. No permite concluir si hubo archivos antes.</p>}
    {archivos.length > 0 && <ul className="resp-files">
      {archivos.map(a => <li key={a.ruta}>
        <FileText size={22} aria-hidden="true" />
        <div className="resp-file-info">
          <strong>{a.nombre.replace(/^\d{10,}-/, '')}</strong>
          <span>{a.size > 0 ? (a.size / 1048576).toFixed(2) + ' MB · ' : ''}
            {a.asociacionValida === false ? 'Sin asociación verificable con esta carpeta' : estado !== 'listo' ? 'Disponibilidad no comprobada' : a.disponible ? 'Listado en almacenamiento' : descartados.includes(a.ruta) ? 'Retirado en esta sesión' : 'No encontrado en la carpeta actual'}</span>
          {a.integridad === 'diferente' && <span className="danger">El tamaño informado no coincide con el registro de envío.</span>}
          {a.integridad === 'vacio' && <span className="danger">El almacenamiento informa un archivo de cero bytes.</span>}
        </div>
        {estado === 'listo' && a.disponible && <div className="resp-file-actions">
          <AbrirEstudio ruta={a.ruta} />
          <button className="resp-icon danger" title={'Eliminar ' + a.nombre} aria-label={'Eliminar ' + a.nombre} onClick={() => descartar(a)} disabled={!!eliminando}><Trash2 size={17} /></button>
        </div>}
      </li>)}
    </ul>}
  </section>;
}

function AbrirEstudio({ ruta }) {
  const [estado, setEstado] = useState('listo');
  const [enlace, setEnlace] = useState('');
  const abrir = async () => {
    setEstado('abriendo'); setEnlace('');
    const visor = prepararVisorEstudio();
    try {
      const url = await firmarEstudio(ruta);
      if (navegarVisorEstudio(visor, url)) setEstado('listo');
      else { setEnlace(url); setEstado('enlace'); }
    } catch (_) {
      try { visor?.close(); } catch (_error) { /* already closed */ }
      setEstado('error');
    }
  };
  if (estado === 'enlace') return <a className="resp-button" href={enlace} target="_blank" rel="noopener noreferrer" onClick={() => { setEstado('listo'); setEnlace(''); }}><ExternalLink size={16} />Abrir estudio</a>;
  return <button className={'resp-button' + (estado === 'error' ? ' danger' : '')} onClick={abrir} disabled={estado === 'abriendo'}>
    <ExternalLink size={16} aria-hidden="true" />{estado === 'abriendo' ? 'Abriendo…' : estado === 'error' ? 'Reintentar apertura' : 'Abrir'}
  </button>;
}
