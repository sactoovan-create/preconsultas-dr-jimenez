import React from 'react';
import { usePaciente } from './core/PacienteContext.jsx';
import { INSTRUMENTOS } from './registry.js';
import './Seguimiento.css';

/**
 * Seguimiento del paciente. Grafica la evolución de las métricas seguibles que
 * cada instrumento publica (intensidad de síntomas, dolor, riesgo, puntaje T). El
 * punto de hoy proviene del dato real capturado en el instrumento; los puntos
 * previos son ilustrativos en este lienzo. En GineOS, la serie completa se llena
 * con las mediciones reales guardadas en el expediente a lo largo del tiempo.
 */

function fechaRel(mesesAtras) {
  const d = new Date(2026, 5, 15);
  d.setMonth(d.getMonth() - mesesAtras);
  return d.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
}

// Historial ilustrativo por métrica: [meses atrás, valor].
const EJEMPLO = {
  mrs: [[6, 30], [3, 21]],
  dolor: [[4, 8], [2, 6]],
  riesgo10: [[12, 12], [6, 10]],
  tscore: [[24, -2.2]],
};

function tendencia(serie, mejorAbajo) {
  if (serie.length < 2) return { txt: 'Primer registro', dir: 'estable' };
  const a = serie[0].valor, b = serie[serie.length - 1].valor;
  if (a === b) return { txt: 'Estable', dir: 'estable' };
  const baja = b < a;
  const mejora = mejorAbajo ? baja : !baja;
  return mejora ? { txt: 'Mejorando', dir: 'mejor' } : { txt: 'Empeorando', dir: 'peor' };
}

function Grafica({ serie, min, max }) {
  const W = 320, H = 120, mx = 34, myTop = 16, myBot = 28;
  const innerW = W - mx - 12, innerH = H - myTop - myBot;
  const n = serie.length;
  const px = (i) => mx + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const py = (v) => myTop + (max - v) / (max - min) * innerH;
  const puntos = serie.map((p, i) => ({ x: px(i), y: py(p.valor), ...p }));
  const linea = puntos.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="seg-svg" preserveAspectRatio="xMidYMid meet">
      {/* marco base */}
      <line x1={mx} y1={myTop} x2={mx} y2={H - myBot} className="seg-eje" />
      <line x1={mx} y1={H - myBot} x2={W - 12} y2={H - myBot} className="seg-eje" />
      {/* línea de evolución */}
      {n > 1 && <polyline points={linea} className="seg-linea" />}
      {/* puntos */}
      {puntos.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={i === n - 1 ? 5 : 3.5} className={'seg-punto' + (i === n - 1 ? ' hoy' : '')} />
          <text x={p.x} y={p.y - 10} className="seg-val" textAnchor="middle">{p.valor}</text>
          <text x={p.x} y={H - myBot + 15} className="seg-fecha" textAnchor="middle">{p.fecha}</text>
        </g>
      ))}
    </svg>
  );
}

export default function Seguimiento() {
  const { paciente, resumenes } = usePaciente();
  const dem = paciente.demografia;

  const conMetrica = INSTRUMENTOS.filter((i) => resumenes[i.id] && resumenes[i.id].metrica);

  const construirSerie = (m) => {
    const previos = (EJEMPLO[m.clave] || []).map(([mes, v]) => ({ fecha: fechaRel(mes), valor: v }));
    return [...previos, { fecha: 'Hoy', valor: m.valor }];
  };

  return (
    <div className="inst">
      <header className="inst-cab">
        <div>
          <div className="inst-eyebrow">Seguimiento del paciente</div>
          <h1>{dem.nombre ? dem.nombre : 'Paciente sin identificar'}<small>evolución de las métricas entre visitas</small></h1>
        </div>
        <div className="inst-mono">IJ</div>
      </header>

      <div className="seg-cuerpo">
        <div className="seg-nota">
          El último punto, marcado como hoy, proviene de lo que capturaste en el instrumento. Los puntos previos son ilustrativos en esta vista previa; al integrarse con GineOS, la línea se llena con las mediciones reales guardadas en el expediente.
        </div>

        {conMetrica.length === 0 ? (
          <div className="seg-guia">
            Aún no hay métricas para seguir. Abre un instrumento con un valor seguible, como menopausia, dolor pélvico, riesgo cardiometabólico o salud ósea, captura los datos, y aquí verás su evolución.
          </div>
        ) : (
          <div className="seg-grid">
            {conMetrica.map((i) => {
              const m = resumenes[i.id].metrica;
              const serie = construirSerie(m);
              const t = tendencia(serie, m.mejorAbajo);
              return (
                <div className="seg-card" key={i.id}>
                  <div className="seg-card-cab">
                    <div>
                      <div className="seg-card-t">{m.nombre}</div>
                      <div className="seg-card-actual">Hoy: {m.valor} {m.unidad}</div>
                    </div>
                    <div className={'seg-tend ' + t.dir}>{t.txt}</div>
                  </div>
                  <Grafica serie={serie} min={m.min} max={m.max} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
