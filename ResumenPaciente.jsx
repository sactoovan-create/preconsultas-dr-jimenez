import React from 'react';
import { usePaciente } from './core/PacienteContext.jsx';
import { INSTRUMENTOS } from './registry.js';
import { imprimirInforme } from './core/printReport.js';
import { evidenciaDe } from './core/evidencia.js';
import './ResumenPaciente.css';

/**
 * Panel de resumen del paciente. Consolida en una sola vista el resultado clave
 * de cada instrumento aplicado a la paciente activa, y permite saltar a cualquiera.
 * Los resúmenes los publica cada instrumento en el contexto del paciente.
 */
function fmtFecha(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  // Una cadena corrupta no lanza excepción: da una fecha inválida.
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const PRIORIDAD_ET = { alta: 'Prioridad alta', media: 'Prioridad media', baja: 'Prioridad baja' };

export default function ResumenPaciente() {
  const { paciente, resumenes, irA, origen, ruteo, descartados, descartarSugerencia, restaurarSugerencia, reiniciar } = usePaciente();
  const dem = paciente.demografia;
  const activos = INSTRUMENTOS.filter((i) => i.estado === 'activo');
  const evaluadosLista = activos.filter((i) => resumenes[i.id] && resumenes[i.id].evaluado);
  const evaluados = evaluadosLista.length;

  // Sugerencias del ruteo que existen en este módulo, separadas por decisión del médico.
  const sugerencias = (ruteo && ruteo.instrumentosSugeridos || [])
    .filter((s) => activos.some((i) => i.id === s.instrumento));
  const vigentes = sugerencias.filter((s) => !descartados.includes(s.instrumento));
  const quitadas = sugerencias.filter((s) => descartados.includes(s.instrumento));
  const banderas = (ruteo && ruteo.banderas) || [];

  const generarInforme = () => {
    const items = evaluadosLista.map((i) => ({
      titulo: i.titulo,
      titular: resumenes[i.id].titular,
      detalle: resumenes[i.id].detalle,
      estado: resumenes[i.id].estado,
    }));
    // Fundamento: fuentes únicas de los instrumentos evaluados.
    const fuentes = [];
    evaluadosLista.forEach((i) => {
      const ev = evidenciaDe(i.id);
      if (ev) ev.fuentes.forEach((f) => { if (!fuentes.includes(f)) fuentes.push(f); });
    });
    imprimirInforme({ paciente, items, fundamento: { fuentes, revisado: 'junio de 2026' } });
  };

  return (
    <div className="inst">
      <header className="inst-cab">
        <div>
          <div className="inst-eyebrow">Resumen del paciente</div>
          <h1>{dem.nombre ? dem.nombre : 'Paciente sin identificar'}<small>{dem.edad ? `${dem.edad} años · ` : ''}{evaluados} de {activos.length} instrumentos evaluados</small></h1>
        </div>
        <div className="inst-mono">IJ</div>
      </header>

      <div className="rp-cuerpo">
        {origen && (
          <div className="rp-origen">
            <div>
              <b>{origen.nombre ? `Trabajando con la respuesta de ${origen.nombre}` : 'Trabajando con una respuesta sin nombre'}</b>
              {fmtFecha(origen.fecha) && <span> · enviada el {fmtFecha(origen.fecha)}</span>}
              <span> · los instrumentos se prellenaron con lo que contestó.</span>
            </div>
            <button onClick={() => {
              if (window.confirm('¿Quitar la respuesta cargada? También se borra lo que hayas capturado y evaluado en los instrumentos. No se puede deshacer.')) reiniciar();
            }}>Quitar y capturar manualmente</button>
          </div>
        )}

        {banderas.length > 0 && (
          <div className="rp-banderas" role="alert">
            {banderas.map((b, i) => (
              <div className="rp-bandera" key={i}>
                <span>{b.mensaje}</span>
                {b.instrumentoRelacionado && activos.some((x) => x.id === b.instrumentoRelacionado) && (
                  <button onClick={() => irA(b.instrumentoRelacionado)}>Abrir instrumento</button>
                )}
              </div>
            ))}
          </div>
        )}

        {origen && sugerencias.length > 0 && (
          <section className="rp-sug">
            <div className="rp-sug-cab">
              <h2>Instrumentos que sugiere su pre-consulta</h2>
              <p>Es una sugerencia, no un diagnóstico: tú decides cuáles aplicar, quitar o agregar de la lista completa.</p>
            </div>
            <ul className="rp-sug-lista">
              {vigentes.map((s) => (
                <li className={'rp-sug-item prio-' + s.prioridad} key={s.instrumento}>
                  <span className={'rp-prio ' + s.prioridad}>{PRIORIDAD_ET[s.prioridad] || s.prioridad}</span>
                  <div className="rp-sug-texto">
                    <b>{s.nombre}</b>
                    <span>{s.motivo}</span>
                  </div>
                  <div className="rp-sug-botones">
                    <button className="rp-sug-abrir" onClick={() => irA(s.instrumento)}>Abrir</button>
                    <button className="rp-sug-quitar" onClick={() => descartarSugerencia(s.instrumento)}>Quitar</button>
                  </div>
                </li>
              ))}
            </ul>
            {quitadas.length > 0 && (
              <div className="rp-sug-quitadas">
                Quitaste: {quitadas.map((s) => (
                  <button key={s.instrumento} onClick={() => restaurarSugerencia(s.instrumento)}>
                    {s.nombre} — restaurar
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="rp-acciones">
          <button className="rp-informe" disabled={evaluados === 0} onClick={generarInforme}>
            Imprimir resumen de valoración
          </button>
        </div>

        {evaluados === 0 && !origen && (
          <div className="rp-guia">
            Aún no has evaluado a esta paciente. Abre cualquier instrumento de la lista, captura los datos, y su resultado aparecerá aquí para verlo todo junto. Si la paciente ya contestó la pre-consulta, ábrela desde «Respuestas de pacientes» y todo llegará prellenado.
          </div>
        )}

        {origen && sugerencias.length > 0 && (
          <h2 className="rp-grid-titulo">Todos los instrumentos</h2>
        )}
        <div className="rp-grid">
          {activos.map((i) => {
            const res = resumenes[i.id];
            const evaluado = res && res.evaluado;
            return (
              <button key={i.id} className={'rp-card' + (evaluado ? ' eval ' + (res.estado || 'neutro') : '')} onClick={() => irA(i.id)}>
                <div className="rp-card-cab">
                  <span className="rp-card-titulo">{i.titulo}</span>
                  {evaluado && <span className={'rp-punto ' + (res.estado || 'neutro')} />}
                </div>
                {evaluado ? (
                  <>
                    <div className="rp-card-titular">{res.titular}</div>
                    {res.detalle && <div className="rp-card-detalle">{res.detalle}</div>}
                  </>
                ) : (
                  <div className="rp-card-vacio">Sin evaluar</div>
                )}
                <div className="rp-card-ir">Abrir</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
