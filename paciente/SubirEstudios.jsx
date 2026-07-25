import React, { useEffect, useState } from 'react';
import { eliminarEstudio, subirEstudio, MAX_ARCHIVOS } from '../core/estudios.js';

/**
 * Buzón de estudios para la paciente, al final del cuestionario. Sube y sigue:
 * cada archivo muestra su estado. Los archivos van al almacenamiento privado; la
 * paciente no ve una carpeta ni inicia sesión manualmente en nada.
 */

const VERDE = '#1F3A2E';
const DORADO = '#A88B5C';
const TINTA = '#2D2A26';

const ICONO = {
  subiendo: { t: 'Subiendo…', c: DORADO },
  listo: { t: 'Listo', c: 'var(--ok)' },
  error: { t: 'No se pudo', c: 'var(--terracota)' },
};

export default function SubirEstudios({ folder, habilitado = false, onEstadoCambio }) {
  const [items, setItems] = useState([]);
  const [aviso, setAviso] = useState('');

  const subiendo = items.some((i) => i.estado === 'subiendo');
  const itemsListos = items.filter((i) => i.estado === 'listo' && i.resultado);
  const listos = itemsListos.length;
  const errores = items.filter((i) => i.estado === 'error').length;

  useEffect(() => {
    if (!onEstadoCambio) return;
    onEstadoCambio({
      total: items.length,
      subiendo,
      listos,
      errores,
      archivos: itemsListos.map((i) => i.resultado),
    });
  }, [errores, items.length, listos, onEstadoCambio, subiendo]);

  const subirUno = (file, id) => {
    setItems((l) => l.map((it) => (it.id === id ? { ...it, estado: 'subiendo', detalle: undefined } : it)));
    subirEstudio(folder, file)
      .then((resultado) => setItems((l) => l.map((it) => (it.id === id ? { ...it, estado: 'listo', resultado } : it))))
      .catch((err) => setItems((l) => l.map((it) => (it.id === id
        ? { ...it, estado: 'error', detalle: err && err.code === 'grande' ? 'Pesa demasiado; intenta una foto más pequeña' : 'No se pudo subir' }
        : it))));
  };

  const quitar = async (item) => {
    setAviso('');
    if (item.resultado?.path) {
      setItems((l) => l.map((it) => (it.id === item.id ? { ...it, estado: 'subiendo', quitando: true } : it)));
      try {
        await eliminarEstudio(item.resultado.path);
      } catch (_) {
        setItems((l) => l.map((it) => (it.id === item.id ? { ...it, estado: 'listo', quitando: false } : it)));
        setAviso('No pudimos quitar ese archivo. Inténtalo de nuevo.');
        return;
      }
    }
    setItems((l) => l.filter((it) => it.id !== item.id));
  };

  const onElegir = (e) => {
    if (!habilitado) return;
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setAviso('');
    const activos = items.filter((i) => i.estado !== 'error').length;
    const disponibles = MAX_ARCHIVOS - activos;
    if (disponibles <= 0) { setAviso(`Ya alcanzaste el máximo de ${MAX_ARCHIVOS} archivos.`); return; }
    const aSubir = files.slice(0, disponibles);
    if (files.length > disponibles) setAviso(`Se tomaron ${disponibles}; el máximo es ${MAX_ARCHIVOS} archivos.`);
    aSubir.forEach((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((l) => [...l, { id, nombre: file.name, estado: 'subiendo', file }]);
      subirUno(file, id);
    });
  };

  return (
    <div className="pc-estudios" style={{ marginTop: 28, textAlign: 'left', borderTop: `1px solid ${DORADO}33`, paddingTop: 24 }}>
      <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.25rem', color: VERDE, margin: '0 0 6px' }}>
        ¿Tienes estudios? Súbelos aquí <span style={{ fontWeight: 400, color: TINTA }}>(opcional)</span>
      </h2>
      <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: TINTA, marginTop: 0 }}>
        Laboratorios, ultrasonidos o recetas, en PDF o foto. Le ayudan a tu doctor a llegar
        con tu información lista. Cuando terminen de subir, presiona “Enviar cuestionario y estudios”.
      </p>
      {!habilitado && (
        <p role="status" style={{ fontSize: '0.88rem', color: 'var(--oro-texto)', fontWeight: 700 }}>
          Acepta primero la autorización de arriba para habilitar la subida.
        </p>
      )}

      <label style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, cursor: habilitado ? 'pointer' : 'not-allowed',
        background: habilitado ? VERDE : '#8D968F', color: '#fff', borderRadius: 8, padding: '11px 18px',
        fontSize: '0.95rem', fontWeight: 500,
      }} aria-disabled={!habilitado}>
        Seleccionar archivos
        <input type="file" multiple disabled={!habilitado} accept="application/pdf,image/*" onChange={onElegir} style={{ display: 'none' }} />
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
                {it.estado === 'error' && it.file && (
                  <button type="button" onClick={() => subirUno(it.file, it.id)}
                          style={{ border: `1px solid ${DORADO}`, background: 'transparent', color: VERDE, borderRadius: 8, padding: '3px 10px', fontSize: '0.82rem', cursor: 'pointer' }}>
                    Reintentar
                  </button>
                )}
                {it.estado !== 'subiendo' && (
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
          {listos === 1 ? 'Tu estudio llegó al consultorio.' : `Tus ${listos} estudios llegaron al consultorio.`}
        </div>
      )}
    </div>
  );
}
