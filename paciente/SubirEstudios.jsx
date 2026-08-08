import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  eliminarEstudioPaciente,
  subirEstudio,
  validarArchivoEstudio,
  MAX_ARCHIVOS,
} from '../core/estudios.js';

/**
 * Buzón de estudios para la paciente, al final del cuestionario. Cada archivo se
 * sube en cuanto se selecciona y muestra su estado real. Los archivos van al
 * almacenamiento privado; la paciente no ve una carpeta ni inicia sesión manual.
 */

const VERDE = '#1F3A2E';
const DORADO = '#A88B5C';
const TINTA = '#2D2A26';

const ICONO = {
  pendiente: { t: 'En espera', c: DORADO },
  subiendo: { t: 'Enviando…', c: DORADO },
  listo: { t: 'Recibido', c: 'var(--ok)' },
  error: { t: 'No se pudo', c: 'var(--terracota)' },
};

function detalleError(error) {
  if (error?.code === 'grande') return 'Pesa demasiado; intenta una foto más pequeña';
  if (error?.code === 'formato') return error.message;
  return 'Revisa tu conexión y presiona Reintentar';
}

const SubirEstudios = forwardRef(function SubirEstudios(
  {
    folder,
    habilitado = false,
    bloqueado = false,
    archivosIniciales = [],
    onEstadoCambio,
  },
  ref,
) {
  const inicialesRef = useRef(null);
  if (inicialesRef.current === null) {
    inicialesRef.current = archivosIniciales.map((resultado, indice) => ({
      id: `recuperado-${indice}-${resultado.path}`,
      nombre: resultado.nombre,
      estado: 'listo',
      resultado,
      file: null,
    }));
  }
  const [items, setItems] = useState(inicialesRef.current);
  const itemsRef = useRef(inicialesRef.current);
  const subidasRef = useRef(new Map());
  const vivoRef = useRef(true);
  const [decision, setDecision] = useState(() => (archivosIniciales.length ? 'si' : null));
  const [aviso, setAviso] = useState('');

  const subiendo = items.some((i) => i.estado === 'subiendo');
  const itemsSubidos = items.filter((i) => i.estado === 'listo' && i.resultado);
  const listos = itemsSubidos.length;
  const pendientes = items.filter((i) => i.estado === 'pendiente').length;
  const errores = items.filter((i) => i.estado === 'error').length;

  const cambiarItems = useCallback((actualizador) => {
    if (!vivoRef.current) return;
    const siguientes = actualizador(itemsRef.current);
    itemsRef.current = siguientes;
    setItems(siguientes);
  }, []);

  useEffect(() => {
    // React StrictMode desmonta y vuelve a montar los efectos en desarrollo.
    vivoRef.current = true;
    return () => { vivoRef.current = false; };
  }, []);

  useEffect(() => {
    if (!onEstadoCambio) return;
    onEstadoCambio({
      total: items.length,
      subiendo,
      listos,
      pendientes,
      errores,
      decision,
      archivos: itemsSubidos.map((i) => i.resultado),
    });
  }, [decision, errores, items, listos, onEstadoCambio, pendientes, subiendo]);

  const iniciarSubida = useCallback((item) => {
    if (!item?.file) {
      cambiarItems((lista) => lista.map((actual) => (
        actual.id === item?.id
          ? { ...actual, estado: 'error', detalle: 'Vuelve a seleccionar este archivo' }
          : actual
      )));
      return Promise.resolve(null);
    }
    const existente = subidasRef.current.get(item.id);
    if (existente) return existente;

    cambiarItems((lista) => lista.map((actual) => (
      actual.id === item.id
        ? { ...actual, estado: 'subiendo', detalle: undefined, quitando: false }
        : actual
    )));

    const tarea = (async () => {
      try {
        const resultado = await subirEstudio(folder, item.file);
        cambiarItems((lista) => lista.map((actual) => (
          actual.id === item.id
            ? { ...actual, estado: 'listo', resultado, detalle: undefined }
            : actual
        )));
        return resultado;
      } catch (error) {
        cambiarItems((lista) => lista.map((actual) => (
          actual.id === item.id
            ? { ...actual, estado: 'error', detalle: detalleError(error), resultado: undefined }
            : actual
        )));
        return null;
      } finally {
        subidasRef.current.delete(item.id);
      }
    })();
    subidasRef.current.set(item.id, tarea);
    return tarea;
  }, [cambiarItems, folder]);

  useImperativeHandle(ref, () => ({
    async subirPendientes() {
      const porIniciar = itemsRef.current.filter((item) => item.estado === 'pendiente');
      porIniciar.forEach((item) => iniciarSubida(item));
      if (subidasRef.current.size) {
        await Promise.allSettled(Array.from(subidasRef.current.values()));
      }
      const actuales = itemsRef.current;
      const fallidos = actuales.filter((item) => item.estado === 'error');
      if (fallidos.length) {
        const fallo = new Error(
          fallidos.length === 1
            ? 'Reintenta o quita el estudio que no se pudo subir.'
            : `Reintenta o quita los ${fallidos.length} estudios que no se pudieron subir.`,
        );
        fallo.code = 'estudios';
        throw fallo;
      }
      return actuales
        .filter((item) => item.estado === 'listo' && item.resultado)
        .map((item) => item.resultado);
    },
    restablecerPendientes() {
      cambiarItems((lista) => lista.map((item) => ({
        ...item,
        estado: 'error',
        detalle: item.file
          ? 'Presiona Reintentar para volver a enviar este archivo'
          : 'Vuelve a seleccionar este archivo',
        resultado: undefined,
      })));
    },
  }), [cambiarItems, iniciarSubida]);

  const quitar = async (item) => {
    setAviso('');
    if (item.resultado?.path) {
      cambiarItems((l) => l.map((it) => (it.id === item.id ? { ...it, estado: 'subiendo', quitando: true } : it)));
      try {
        await eliminarEstudioPaciente(item.resultado.path);
      } catch (_) {
        cambiarItems((l) => l.map((it) => (it.id === item.id ? { ...it, estado: 'listo', quitando: false } : it)));
        setAviso('No pudimos quitar ese archivo. Inténtalo de nuevo.');
        return;
      }
    }
    cambiarItems((l) => l.filter((it) => it.id !== item.id));
  };

  const onElegir = (e) => {
    if (!habilitado || bloqueado || decision !== 'si') return;
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setAviso('');
    const activos = itemsRef.current.length;
    const disponibles = MAX_ARCHIVOS - activos;
    if (disponibles <= 0) { setAviso(`Ya alcanzaste el máximo de ${MAX_ARCHIVOS} archivos.`); return; }
    const seleccionados = files.slice(0, disponibles).map((file) => {
      const validacion = validarArchivoEstudio(file);
      return { file, validacion };
    });
    const invalidos = seleccionados.filter(({ validacion }) => !validacion.ok);
    if (files.length > disponibles) setAviso(`Se tomaron ${disponibles}; el máximo es ${MAX_ARCHIVOS} archivos.`);
    else if (invalidos.length) setAviso('Uno o más archivos necesitan atención antes de enviar.');
    const nuevos = seleccionados.map(({ file, validacion }) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      nombre: file.name,
      estado: validacion.ok ? 'pendiente' : 'error',
      detalle: validacion.ok ? undefined : validacion.mensaje,
      file: validacion.ok ? file : null,
    }));
    if (nuevos.length) {
      cambiarItems((lista) => [...lista, ...nuevos]);
      nuevos.filter((item) => item.estado === 'pendiente').forEach((item) => iniciarSubida(item));
    }
  };

  const elegirDecision = (valor) => {
    setAviso('');
    if (valor === 'no' && itemsRef.current.length) {
      setAviso('Quita primero los archivos agregados para indicar que no tienes estudios ahora.');
      return;
    }
    setDecision(valor);
  };

  return (
    <div className="pc-estudios" style={{ marginTop: 28, textAlign: 'left', borderTop: `1px solid ${DORADO}33`, paddingTop: 24 }}>
      <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.25rem', color: VERDE, margin: '0 0 6px' }}>
        ¿Tienes estudios? Súbelos aquí <span style={{ fontWeight: 400, color: TINTA }}>(opcional)</span>
      </h2>
      <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: TINTA, marginTop: 0 }}>
        Laboratorios, ultrasonidos o recetas, en PDF o foto. Se suben de forma
        privada en cuanto los seleccionas; espera a que cada uno diga “Recibido”.
      </p>
      {!habilitado && (
        <p role="status" style={{ fontSize: '0.88rem', color: 'var(--oro-texto)', fontWeight: 700 }}>
          Acepta primero la autorización de arriba para habilitar la subida.
        </p>
      )}

      <fieldset disabled={!habilitado || bloqueado} style={{ border: 0, padding: 0, margin: '16px 0 14px' }}>
        <legend style={{ fontSize: '0.9rem', fontWeight: 700, color: TINTA, marginBottom: 8 }}>
          ¿Tienes algún estudio para compartir? *
        </legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', maxWidth: 430, border: `1px solid ${DORADO}66`, borderRadius: 7, overflow: 'hidden' }}>
          <button
            type="button"
            aria-pressed={decision === 'si'}
            onClick={() => elegirDecision('si')}
            style={{ border: 0, borderRight: `1px solid ${DORADO}66`, padding: '10px 12px', background: decision === 'si' ? VERDE : '#fff', color: decision === 'si' ? '#fff' : VERDE, fontWeight: 700, cursor: habilitado && !bloqueado ? 'pointer' : 'not-allowed' }}
          >
            Sí, los agregaré
          </button>
          <button
            type="button"
            aria-pressed={decision === 'no'}
            onClick={() => elegirDecision('no')}
            style={{ border: 0, padding: '10px 12px', background: decision === 'no' ? VERDE : '#fff', color: decision === 'no' ? '#fff' : VERDE, fontWeight: 700, cursor: habilitado && !bloqueado ? 'pointer' : 'not-allowed' }}
          >
            No los tengo ahora
          </button>
        </div>
      </fieldset>

      {decision === 'si' && (
        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, cursor: habilitado && !bloqueado ? 'pointer' : 'not-allowed',
          background: habilitado && !bloqueado ? VERDE : '#8D968F', color: '#fff', borderRadius: 8, padding: '11px 18px',
          fontSize: '0.95rem', fontWeight: 500,
        }} aria-disabled={!habilitado || bloqueado}>
          Agregar estudios
          <input type="file" multiple disabled={!habilitado || bloqueado} accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,image/heic-sequence,image/heif-sequence" onChange={onElegir} style={{ display: 'none' }} />
        </label>
      )}

      {decision === 'no' && (
        <p role="status" style={{ color: 'var(--ok)', fontWeight: 600, fontSize: '0.92rem', margin: '8px 0 0' }}>
          Entendido. Puedes enviar el cuestionario sin estudios y llevarlos después.
        </p>
      )}

      {items.length > 0 && (
        <ul aria-live="polite" style={{ listStyle: 'none', padding: 0, margin: '16px 0 0' }}>
          {items.map((it) => (
            <li key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${DORADO}22`, fontSize: '0.9rem' }}>
              <span style={{ color: TINTA, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{it.nombre}</span>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10 }}>
                <span style={{ color: ICONO[it.estado].c, fontWeight: 600, textAlign: 'right' }}>
                  {ICONO[it.estado].t}
                </span>
                {it.estado === 'error' && it.detalle && (
                  <span style={{ color: 'var(--terracota)', fontSize: '0.8rem', textAlign: 'right', flexBasis: '100%' }}>{it.detalle}</span>
                )}
                {it.estado === 'error' && it.file && !bloqueado && (
                  <button
                    type="button"
                    onClick={() => iniciarSubida(it)}
                    style={{ border: `1px solid ${DORADO}`, borderRadius: 6, background: '#fff', color: VERDE, padding: '5px 9px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Reintentar
                  </button>
                )}
                {it.estado !== 'subiendo' && !bloqueado && (
                  <button
                    type="button"
                    onClick={() => quitar(it)}
                    style={{ border: 0, background: 'transparent', color: 'var(--terracota)', padding: '4px 2px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Quitar
                  </button>
                )}
                {it.quitando && <span style={{ color: DORADO }}>Quitando…</span>}
              </span>
            </li>
          ))}
        </ul>
      )}

      {aviso && <div role="alert" style={{ marginTop: 12, color: 'var(--terracota)', fontSize: '0.88rem' }}>{aviso}</div>}
      {listos > 0 && !subiendo && (
        <div role="status" aria-live="polite" style={{ marginTop: 14, color: 'var(--ok)', fontWeight: 600, fontSize: '0.92rem' }}>
          {listos === 1
            ? 'Tu estudio ya fue recibido de forma privada. Al enviar el cuestionario quedará ligado a tus respuestas.'
            : `Tus ${listos} estudios ya fueron recibidos de forma privada. Al enviar el cuestionario quedarán ligados a tus respuestas.`}
        </div>
      )}
    </div>
  );
});

export default SubirEstudios;
