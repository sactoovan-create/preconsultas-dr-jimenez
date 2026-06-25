import React, { useState } from 'react';
import { subirEstudio, MAX_ARCHIVOS } from '../core/estudios.js';

/**
 * Buzón de estudios para la paciente, en la pantalla de agradecimiento. Sube y sigue:
 * cada archivo muestra su estado. Los archivos van al almacenamiento privado; la
 * paciente nunca ve una carpeta ni inicia sesión en nada.
 */

const VERDE = '#1F3A2E';
const DORADO = '#A88B5C';
const TINTA = '#2D2A26';

const ICONO = {
  subiendo: { t: 'Subiendo…', c: DORADO },
  listo: { t: 'Listo', c: '#1d7a52' },
  error: { t: 'No se pudo', c: '#9a3412' },
};

export default function SubirEstudios({ folder }) {
  const [items, setItems] = useState([]);
  const [aviso, setAviso] = useState('');

  const subirUno = (file, id) => {
    setItems((l) => l.map((it) => (it.id === id ? { ...it, estado: 'subiendo', detalle: undefined } : it)));
    subirEstudio(folder, file)
      .then(() => setItems((l) => l.map((it) => (it.id === id ? { ...it, estado: 'listo' } : it))))
      .catch((err) => setItems((l) => l.map((it) => (it.id === id
        ? { ...it, estado: 'error', detalle: err && err.code === 'grande' ? 'Pesa demasiado; intenta una foto más pequeña' : 'No se pudo subir' }
        : it))));
  };

  const onElegir = (e) => {
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

  const subiendo = items.some((i) => i.estado === 'subiendo');
  const listos = items.filter((i) => i.estado === 'listo').length;

  return (
    <div style={{ marginTop: 28, textAlign: 'left', borderTop: `1px solid ${DORADO}33`, paddingTop: 24 }}>
      <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.25rem', color: VERDE, margin: '0 0 6px' }}>
        ¿Tienes estudios? Súbelos aquí <span style={{ fontWeight: 400, color: TINTA }}>(opcional)</span>
      </h2>
      <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: TINTA, marginTop: 0 }}>
        Laboratorios, ultrasonidos o recetas, en PDF o foto. Le ayudan a tu doctor a llegar
        con tu información lista. Puedes cerrar esta ventana cuando terminen de subir.
      </p>

      <label style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        background: VERDE, color: '#fff', borderRadius: 10, padding: '11px 18px',
        fontSize: '0.95rem', fontWeight: 500,
      }}>
        Seleccionar archivos
        <input type="file" multiple accept="application/pdf,image/*" onChange={onElegir} style={{ display: 'none' }} />
      </label>

      {items.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0' }}>
          {items.map((it) => (
            <li key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${DORADO}22`, fontSize: '0.9rem' }}>
              <span style={{ color: TINTA, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.nombre}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
                <span style={{ color: ICONO[it.estado].c, fontWeight: 600 }}>
                  {ICONO[it.estado].t}{it.estado === 'error' && it.detalle ? `: ${it.detalle}` : ''}
                </span>
                {it.estado === 'error' && it.file && (
                  <button onClick={() => subirUno(it.file, it.id)}
                          style={{ border: `1px solid ${DORADO}`, background: 'transparent', color: VERDE, borderRadius: 8, padding: '3px 10px', fontSize: '0.82rem', cursor: 'pointer' }}>
                    Reintentar
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {aviso && <div style={{ marginTop: 12, color: '#9a3412', fontSize: '0.88rem' }}>{aviso}</div>}
      {listos > 0 && !subiendo && (
        <div style={{ marginTop: 14, color: '#1d7a52', fontWeight: 600, fontSize: '0.92rem' }}>
          {listos === 1 ? 'Tu estudio llegó al consultorio.' : `Tus ${listos} estudios llegaron al consultorio.`}
        </div>
      )}
    </div>
  );
}
