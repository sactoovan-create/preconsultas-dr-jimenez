import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
  eliminarEstudioPaciente,
  subirEstudio,
  validarArchivoEstudio,
  MAX_ARCHIVOS,
} from '../core/estudios.js';

/**
 * Buzón de estudios para la paciente, al final del cuestionario. Sube y sigue:
 * cada archivo muestra su estado. Los archivos van al almacenamiento privado; la
 * paciente no ve una carpeta ni inicia sesión manualmente en nada.
 */

const VERDE = '#1F3A2E';
const DORADO = '#A88B5C';
const TINTA = '#2D2A26';

const ICONO = {
  pendiente: { t: 'Listo para enviar', c: 'var(--ok)' },
  subiendo: { t: 'Enviando…', c: DORADO },
  listo: { t: 'Recibido', c: 'var(--ok)' },
  error: { t: 'No se pudo', c: 'var(--terracota)' },
};

function detalleError(error) {
  if (error?.code === 'grande') return 'Pesa demasiado; intenta una foto más pequeña';
  if (error?.code === 'formato') return error.message;
  return 'No se pudo subir; vuelve a presionar Enviar';
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
  const [items, setItems] = useState(() => archivosIniciales.map((resultado, indice) => ({
    id: `recuperado-${indice}-${resultado.path}`,
    nombre: resultado.nombre,
    estado: 'listo',
    resultado,
    file: null,
  })));
  const [aviso, setAviso] = useState('');

  const subiendo = items.some((i) => i.estado === 'subiendo');
  const itemsSubidos = items.filter((i) => i.estado === 'listo' && i.resultado);
  const preparados = items.filter((i) => ['pendiente', 'listo'].includes(i.estado));
  const listos = preparados.length;
  const errores = items.filter((i) => i.estado === 'error').length;

  useEffect(() => {
    if (!onEstadoCambio) return;
    onEstadoCambio({
      total: items.length,
      subiendo,
      listos,
      errores,
      archivos: itemsSubidos.map((i) => i.resultado),
    });
  }, [errores, items.length, listos, onEstadoCambio, subiendo]);

  useImperativeHandle(ref, () => ({
    async subirPendientes() {
      if (!items.length) return [];
      const resultados = [];
      const subidosEnIntento = [];

      for (const item of items) {
        if (item.estado === 'listo' && item.resultado) {
          resultados.push({ id: item.id, resultado: item.resultado });
          continue;
        }
        setItems((lista) => lista.map((actual) => (
          actual.id === item.id
            ? { ...actual, estado: 'subiendo', detalle: undefined, resultado: undefined }
            : actual
        )));
        try {
          const resultado = await subirEstudio(folder, item.file);
          const subido = { id: item.id, resultado };
          resultados.push(subido);
          subidosEnIntento.push(subido);
          setItems((lista) => lista.map((actual) => (
            actual.id === item.id ? { ...actual, estado: 'listo', resultado } : actual
          )));
        } catch (error) {
          await Promise.allSettled(
            subidosEnIntento.map(({ resultado }) => eliminarEstudioPaciente(resultado.path)),
          );
          const idsRevertidos = new Set(subidosEnIntento.map(({ id }) => id));
          setItems((lista) => lista.map((actual) => {
            if (actual.id === item.id) {
              return { ...actual, estado: 'error', detalle: detalleError(error), resultado: undefined };
            }
            if (idsRevertidos.has(actual.id)) {
              return { ...actual, estado: 'pendiente', detalle: undefined, resultado: undefined };
            }
            return actual;
          }));
          const fallo = new Error(detalleError(error));
          fallo.code = 'estudios';
          throw fallo;
        }
      }
      return resultados.map(({ resultado }) => resultado);
    },
    restablecerPendientes() {
      setItems((lista) => lista.map((item) => ({
        ...item,
        estado: 'pendiente',
        detalle: undefined,
        resultado: undefined,
      })));
    },
  }), [folder, items]);

  const quitar = async (item) => {
    setAviso('');
    if (item.resultado?.path) {
      setItems((l) => l.map((it) => (it.id === item.id ? { ...it, estado: 'subiendo', quitando: true } : it)));
      try {
        await eliminarEstudioPaciente(item.resultado.path);
      } catch (_) {
        setItems((l) => l.map((it) => (it.id === item.id ? { ...it, estado: 'listo', quitando: false } : it)));
        setAviso('No pudimos quitar ese archivo. Inténtalo de nuevo.');
        return;
      }
    }
    setItems((l) => l.filter((it) => it.id !== item.id));
  };

  const onElegir = (e) => {
    if (!habilitado || bloqueado) return;
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setAviso('');
    const activos = items.length;
    const disponibles = MAX_ARCHIVOS - activos;
    if (disponibles <= 0) { setAviso(`Ya alcanzaste el máximo de ${MAX_ARCHIVOS} archivos.`); return; }
    const validos = [];
    const invalidos = [];
    files.forEach((file) => {
      const validacion = validarArchivoEstudio(file);
      if (validacion.ok) validos.push(file);
      else invalidos.push(validacion.mensaje);
    });
    const aPreparar = validos.slice(0, disponibles);
    if (invalidos.length) setAviso(invalidos[0]);
    else if (validos.length > disponibles) setAviso(`Se tomaron ${disponibles}; el máximo es ${MAX_ARCHIVOS} archivos.`);
    aPreparar.forEach((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((lista) => [...lista, {
        id,
        nombre: file.name,
        estado: 'pendiente',
        file,
      }]);
    });
  };

  return (
    <div className="pc-estudios" style={{ marginTop: 28, textAlign: 'left', borderTop: `1px solid ${DORADO}33`, paddingTop: 24 }}>
      <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.25rem', color: VERDE, margin: '0 0 6px' }}>
        ¿Tienes estudios? Súbelos aquí <span style={{ fontWeight: 400, color: TINTA }}>(opcional)</span>
      </h2>
      <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: TINTA, marginTop: 0 }}>
        Laboratorios, ultrasonidos o recetas, en PDF o foto. Se enviarán junto con
        tus respuestas cuando presiones “Enviar cuestionario y estudios”.
      </p>
      {!habilitado && (
        <p role="status" style={{ fontSize: '0.88rem', color: 'var(--oro-texto)', fontWeight: 700 }}>
          Acepta primero la autorización de arriba para habilitar la subida.
        </p>
      )}

      <label style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, cursor: habilitado && !bloqueado ? 'pointer' : 'not-allowed',
        background: habilitado && !bloqueado ? VERDE : '#8D968F', color: '#fff', borderRadius: 8, padding: '11px 18px',
        fontSize: '0.95rem', fontWeight: 500,
      }} aria-disabled={!habilitado || bloqueado}>
        Seleccionar archivos
        <input type="file" multiple disabled={!habilitado || bloqueado} accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={onElegir} style={{ display: 'none' }} />
      </label>

      {items.length > 0 && (
        <ul aria-live="polite" style={{ listStyle: 'none', padding: 0, margin: '16px 0 0' }}>
          {items.map((it) => (
            <li key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${DORADO}22`, fontSize: '0.9rem' }}>
              <span style={{ color: TINTA, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.nombre}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
                <span style={{ color: ICONO[it.estado].c, fontWeight: 600 }}>
                  {ICONO[it.estado].t}{it.estado === 'error' && it.detalle ? `: ${it.detalle}` : ''}
                </span>
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
          {itemsSubidos.length
            ? 'Estudios recibidos; estamos terminando de enviar tu cuestionario.'
            : (listos === 1
              ? 'Tu estudio está listo para enviarse con el cuestionario.'
              : `Tus ${listos} estudios están listos para enviarse con el cuestionario.`)}
        </div>
      )}
    </div>
  );
});

export default SubirEstudios;
