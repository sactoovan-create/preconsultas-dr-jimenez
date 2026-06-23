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
export default function ResumenPaciente() {
  const { paciente, resumenes, irA } = usePaciente();
  const dem = paciente.demografia;
  const activos = INSTRUMENTOS.filter((i) => i.estado === 'activo');
  const evaluadosLista = activos.filter((i) => resumenes[i.id] && resumenes[i.id].evaluado);
  const evaluados = evaluadosLista.length;

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
        <div className="rp-acciones">
          <button className="rp-informe" disabled={evaluados === 0} onClick={generarInforme}>
            Imprimir resumen de valoración
          </button>
        </div>

        {evaluados === 0 && (
          <div className="rp-guia">
            Aún no has evaluado a esta paciente. Abre cualquier instrumento de la lista, captura los datos, y su resultado aparecerá aquí para verlo todo junto.
          </div>
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
