/**
 * Profundización del SÍNDROME POLIENDOCRINO METABÓLICO OVÁRICO: impacto en calidad
 * de vida usando los seis dominios del PCOSQ (Cronin 1998 + acné de Barnard 2007)
 * como preguntas de impacto, más la prioridad de la paciente. NO es el PCOSQ
 * completo puntuado ni un diagnóstico: es orientativo, de autoinforme. Escala de
 * impacto 0-4 (inverso al PCOSQ original). Basal para repetir a las 8-12 semanas.
 */

export const ID = 'sop';
export const TITULO = "Cómo te afecta el día a día";
export const FUENTE = "Dominios del PCOSQ (Polycystic Ovary Syndrome Questionnaire; Cronin y cols., 1998) con el dominio de acné del PCOSQ modificado (Barnard y cols., 2007). Se usan los seis dominios como preguntas de impacto en calidad de vida. NO es el PCOSQ de 26/30 reactivos puntuado ni un test diagnóstico: es una versión breve, orientativa, de autoinforme. No existe versión validada al español; el texto es una adaptación propia y debe tratarse como tal.";

function num(x) { const n = Number(x); return Number.isFinite(n) ? n : null; }

export function disparador(ar) {
  const hc = (ar && ar.hc) || {};
  return hc.reglasRegulares === false || hc.acne === true || hc.hirsutismo === true || hc.caidaCabello === true;
}

export const PREGUNTAS = [
  {
    "id": "animo",
    "texto": "En las últimas semanas, ¿qué tanto te han afectado los cambios de ánimo, la tristeza o la preocupación?",
    "tipo": "opcion",
    "opciones": [
      {
        "id": "a0",
        "etiqueta": "Nada",
        "valor": 0,
        "patron": "animo"
      },
      {
        "id": "a1",
        "etiqueta": "Un poco",
        "valor": 1,
        "patron": "animo"
      },
      {
        "id": "a2",
        "etiqueta": "Algo",
        "valor": 2,
        "patron": "animo"
      },
      {
        "id": "a3",
        "etiqueta": "Bastante",
        "valor": 3,
        "patron": "animo"
      },
      {
        "id": "a4",
        "etiqueta": "Muchísimo",
        "valor": 4,
        "patron": "animo"
      }
    ]
  },
  {
    "id": "vello",
    "texto": "¿Qué tanto te molesta el vello no deseado en la cara o el cuerpo?",
    "tipo": "opcion",
    "opciones": [
      {
        "id": "v0",
        "etiqueta": "Nada",
        "valor": 0,
        "patron": "vello"
      },
      {
        "id": "v1",
        "etiqueta": "Un poco",
        "valor": 1,
        "patron": "vello"
      },
      {
        "id": "v2",
        "etiqueta": "Algo",
        "valor": 2,
        "patron": "vello"
      },
      {
        "id": "v3",
        "etiqueta": "Bastante",
        "valor": 3,
        "patron": "vello"
      },
      {
        "id": "v4",
        "etiqueta": "Muchísimo",
        "valor": 4,
        "patron": "vello"
      }
    ]
  },
  {
    "id": "peso",
    "texto": "¿Qué tanto te afecta tu peso o la dificultad para controlarlo?",
    "tipo": "opcion",
    "opciones": [
      {
        "id": "p0",
        "etiqueta": "Nada",
        "valor": 0,
        "patron": "peso"
      },
      {
        "id": "p1",
        "etiqueta": "Un poco",
        "valor": 1,
        "patron": "peso"
      },
      {
        "id": "p2",
        "etiqueta": "Algo",
        "valor": 2,
        "patron": "peso"
      },
      {
        "id": "p3",
        "etiqueta": "Bastante",
        "valor": 3,
        "patron": "peso"
      },
      {
        "id": "p4",
        "etiqueta": "Muchísimo",
        "valor": 4,
        "patron": "peso"
      }
    ]
  },
  {
    "id": "piel",
    "texto": "¿Qué tanto te molestan los granitos o el acné?",
    "tipo": "opcion",
    "opciones": [
      {
        "id": "c0",
        "etiqueta": "Nada",
        "valor": 0,
        "patron": "piel"
      },
      {
        "id": "c1",
        "etiqueta": "Un poco",
        "valor": 1,
        "patron": "piel"
      },
      {
        "id": "c2",
        "etiqueta": "Algo",
        "valor": 2,
        "patron": "piel"
      },
      {
        "id": "c3",
        "etiqueta": "Bastante",
        "valor": 3,
        "patron": "piel"
      },
      {
        "id": "c4",
        "etiqueta": "Muchísimo",
        "valor": 4,
        "patron": "piel"
      }
    ]
  },
  {
    "id": "reglas",
    "texto": "¿Qué tanto te afectan tus reglas, ya sea porque son irregulares, muy espaciadas o difíciles de predecir?",
    "tipo": "opcion",
    "opciones": [
      {
        "id": "r0",
        "etiqueta": "Nada",
        "valor": 0,
        "patron": "reglas"
      },
      {
        "id": "r1",
        "etiqueta": "Un poco",
        "valor": 1,
        "patron": "reglas"
      },
      {
        "id": "r2",
        "etiqueta": "Algo",
        "valor": 2,
        "patron": "reglas"
      },
      {
        "id": "r3",
        "etiqueta": "Bastante",
        "valor": 3,
        "patron": "reglas"
      },
      {
        "id": "r4",
        "etiqueta": "Muchísimo",
        "valor": 4,
        "patron": "reglas"
      }
    ]
  },
  {
    "id": "fertilidad",
    "texto": "Si estás buscando o piensas buscar un embarazo, ¿qué tanto te preocupa poder lograrlo?",
    "ayuda": "Si no aplica en tu caso, elige la última opción.",
    "tipo": "opcion",
    "opciones": [
      {
        "id": "f0",
        "etiqueta": "Nada",
        "valor": 0,
        "patron": "fertilidad"
      },
      {
        "id": "f1",
        "etiqueta": "Un poco",
        "valor": 1,
        "patron": "fertilidad"
      },
      {
        "id": "f2",
        "etiqueta": "Algo",
        "valor": 2,
        "patron": "fertilidad"
      },
      {
        "id": "f3",
        "etiqueta": "Bastante",
        "valor": 3,
        "patron": "fertilidad"
      },
      {
        "id": "f4",
        "etiqueta": "Muchísimo",
        "valor": 4,
        "patron": "fertilidad"
      },
      {
        "id": "fna",
        "etiqueta": "No aplica: no busco embarazo ahora",
        "valor": -1,
        "patron": "na"
      }
    ]
  },
  {
    "id": "prioridad",
    "texto": "De todo lo anterior, ¿qué es lo que más te pesa y te gustaría mejorar primero?",
    "ayuda": "Elige solo una.",
    "tipo": "opcion",
    "opciones": [
      {
        "id": "pr_animo",
        "etiqueta": "Mi estado de ánimo",
        "valor": 0,
        "patron": "animo"
      },
      {
        "id": "pr_vello",
        "etiqueta": "El vello no deseado",
        "valor": 1,
        "patron": "vello"
      },
      {
        "id": "pr_peso",
        "etiqueta": "Mi peso",
        "valor": 2,
        "patron": "peso"
      },
      {
        "id": "pr_piel",
        "etiqueta": "Los granitos o el acné",
        "valor": 3,
        "patron": "piel"
      },
      {
        "id": "pr_reglas",
        "etiqueta": "Mis reglas",
        "valor": 4,
        "patron": "reglas"
      },
      {
        "id": "pr_fertilidad",
        "etiqueta": "Lograr un embarazo",
        "valor": 5,
        "patron": "fertilidad"
      },
      {
        "id": "pr_otra",
        "etiqueta": "Otra cosa / no sé",
        "valor": 6,
        "patron": "otra"
      }
    ]
  }
];

const DOMINIOS = [
  { k: 'animo', n: 'estado de ánimo' }, { k: 'vello', n: 'vello corporal' }, { k: 'peso', n: 'peso' },
  { k: 'piel', n: 'acné o piel' }, { k: 'reglas', n: 'reglas' }, { k: 'fertilidad', n: 'fertilidad' },
];
const PRIOR_N = { animo: 'su estado de ánimo', vello: 'el vello no deseado', peso: 'su peso', piel: 'el acné', reglas: 'sus reglas', fertilidad: 'lograr un embarazo', otra: 'algo más / no definido' };

export function evaluar(resp) {
  const r = resp || {};
  const cont = DOMINIOS.filter((d) => { const v = num(r[d.k]); return v != null && v >= 0; });
  if (!cont.length) return { instrumento: 'PCOSQ', completo: false, resumen: null };

  const suma = cont.reduce((s, d) => s + num(r[d.k]), 0);
  const prom = Math.round((suma / cont.length) * 10) / 10;
  const banda = prom === 0 ? 'sin impacto' : (prom < 1 ? 'leve' : (prom < 2 ? 'moderado' : (prom < 3 ? 'alto' : 'muy alto')));

  const mx = Math.max(...cont.map((d) => num(r[d.k])));
  const dominantes = mx >= 2 ? cont.filter((d) => num(r[d.k]) === mx).map((d) => d.n) : [];
  const domTxt = dominantes.length ? `Lo que más le pesa: ${dominantes.join(', ')} (${mx}/4).` : 'Sin un área claramente predominante.';

  const prOpt = (PREGUNTAS.find((p) => p.id === 'prioridad').opciones || []).find((o) => o.valor === num(r.prioridad));
  const prioridad = prOpt ? (PRIOR_N[prOpt.patron] || 'no definido') : 'no definido';

  const animoV = num(r.animo);
  const banderaAnimo = (animoV != null && animoV >= 3) ? ` Ánimo muy afectado (${animoV}/4): valorar tamizaje formal de ánimo.` : '';

  const resumen = `Impacto en calidad de vida del síndrome poliendocrino (dominios del PCOSQ, autoinforme): impacto global ${banda} (${prom} de 4; ${cont.length} de 6 áreas). ${domTxt} Quiere trabajar primero: ${prioridad}.${banderaAnimo} Orientativo; basal para repetir a las 8-12 semanas.`;
  return { instrumento: 'PCOSQ', completo: cont.length >= 5, resumen, estado: (banda === 'alto' || banda === 'muy alto') ? 'aviso' : 'ok' };
}
