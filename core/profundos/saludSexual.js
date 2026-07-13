/**
 * Profundización de SALUD SEXUAL. Instrumento: Índice de Función Sexual Femenina,
 * versión breve de 6 reactivos (FSFI-6, Isidori 2010; redacción de la adaptación
 * española del FSFI). Total 2-30; corte <= 19 sugiere posible dificultad sexual
 * (sensibilidad 0.96, especificidad 0.91). Orientativo, no diagnóstico. Tema
 * sensible: encuadre cálido, privado; se contesta aunque no haya actividad reciente.
 */

export const ID = 'salud-sexual';
export const TITULO = "Tu vida sexual: una mirada breve y privada";
export const FUENTE = "Índice de Función Sexual Femenina, versión breve de 6 reactivos (FSFI-6, Isidori 2010). Redacción tomada de la adaptación transcultural validada al español del FSFI (Rosen 2000, versión española). Se cita al médico como \"FSFI-6\"; la paciente nunca ve la sigla.";

function num(x) { const n = Number(x); return Number.isFinite(n) ? n : null; }

export function disparador(ar) {
  const mrs = (ar && ar.mrs) || {};
  return (num(mrs.mrs_sexual) != null && num(mrs.mrs_sexual) >= 2) || (num(mrs.mrs_sequedad) != null && num(mrs.mrs_sequedad) >= 2);
}

export const PREGUNTAS = [
  {
    "id": "ss_intro",
    "texto": "Estas preguntas son sobre tu vida sexual en las últimas 4 semanas. Contéstalas con calma; tus respuestas son privadas y le ayudan a tu médico a entenderte mejor. No hace falta que hayas tenido actividad sexual reciente para responder: cuando una pregunta no aplique porque no tuviste actividad, hay una opción para decirlo. Aquí no hay respuestas correctas ni incorrectas.",
    "tipo": "opcion",
    "opciones": [
      {
        "id": "ss_intro_ok",
        "etiqueta": "Entiendo, continuar",
        "valor": 0
      }
    ]
  },
  {
    "id": "ss_deseo",
    "texto": "En las últimas 4 semanas, ¿cómo calificarías tu nivel de deseo o interés sexual?",
    "tipo": "opcion",
    "ayuda": "El deseo es la sensación de querer tener una experiencia sexual o de pensar o fantasear con ello. Esta pregunta se contesta aunque no hayas tenido actividad sexual.",
    "opciones": [
      {
        "id": "ss_deseo_5",
        "etiqueta": "Muy alto",
        "valor": 5,
        "patron": "deseo"
      },
      {
        "id": "ss_deseo_4",
        "etiqueta": "Alto",
        "valor": 4,
        "patron": "deseo"
      },
      {
        "id": "ss_deseo_3",
        "etiqueta": "Moderado",
        "valor": 3,
        "patron": "deseo"
      },
      {
        "id": "ss_deseo_2",
        "etiqueta": "Bajo",
        "valor": 2,
        "patron": "deseo"
      },
      {
        "id": "ss_deseo_1",
        "etiqueta": "Muy bajo o nada",
        "valor": 1,
        "patron": "deseo"
      }
    ]
  },
  {
    "id": "ss_excitacion",
    "texto": "En las últimas 4 semanas, cuando hubo actividad sexual, ¿cómo calificarías tu nivel de excitación (sentirte prendida)?",
    "tipo": "opcion",
    "ayuda": "La excitación incluye sensaciones del cuerpo y de la mente: calor, humedad o pulso en la zona genital. Si no tuviste actividad sexual, elige la primera opción.",
    "opciones": [
      {
        "id": "ss_excitacion_0",
        "etiqueta": "No tuve actividad sexual",
        "valor": 0,
        "patron": "sin_actividad"
      },
      {
        "id": "ss_excitacion_5",
        "etiqueta": "Muy alto",
        "valor": 5,
        "patron": "excitacion"
      },
      {
        "id": "ss_excitacion_4",
        "etiqueta": "Alto",
        "valor": 4,
        "patron": "excitacion"
      },
      {
        "id": "ss_excitacion_3",
        "etiqueta": "Moderado",
        "valor": 3,
        "patron": "excitacion"
      },
      {
        "id": "ss_excitacion_2",
        "etiqueta": "Bajo",
        "valor": 2,
        "patron": "excitacion"
      },
      {
        "id": "ss_excitacion_1",
        "etiqueta": "Muy bajo o nada",
        "valor": 1,
        "patron": "excitacion"
      }
    ]
  },
  {
    "id": "ss_lubricacion",
    "texto": "En las últimas 4 semanas, durante la actividad sexual, ¿con qué frecuencia sentiste lubricación (humedad)?",
    "tipo": "opcion",
    "ayuda": "Si no tuviste actividad sexual, elige la primera opción.",
    "opciones": [
      {
        "id": "ss_lubricacion_0",
        "etiqueta": "No tuve actividad sexual",
        "valor": 0,
        "patron": "sin_actividad"
      },
      {
        "id": "ss_lubricacion_5",
        "etiqueta": "Casi siempre o siempre",
        "valor": 5,
        "patron": "lubricacion"
      },
      {
        "id": "ss_lubricacion_4",
        "etiqueta": "La mayoría de las veces",
        "valor": 4,
        "patron": "lubricacion"
      },
      {
        "id": "ss_lubricacion_3",
        "etiqueta": "Como la mitad de las veces",
        "valor": 3,
        "patron": "lubricacion"
      },
      {
        "id": "ss_lubricacion_2",
        "etiqueta": "Pocas veces",
        "valor": 2,
        "patron": "lubricacion"
      },
      {
        "id": "ss_lubricacion_1",
        "etiqueta": "Casi nunca o nunca",
        "valor": 1,
        "patron": "lubricacion"
      }
    ]
  },
  {
    "id": "ss_orgasmo",
    "texto": "En las últimas 4 semanas, cuando tuviste estimulación sexual o relaciones, ¿con qué frecuencia llegaste al orgasmo (clímax)?",
    "tipo": "opcion",
    "ayuda": "Si no tuviste actividad sexual, elige la primera opción.",
    "opciones": [
      {
        "id": "ss_orgasmo_0",
        "etiqueta": "No tuve actividad sexual",
        "valor": 0,
        "patron": "sin_actividad"
      },
      {
        "id": "ss_orgasmo_5",
        "etiqueta": "Casi siempre o siempre",
        "valor": 5,
        "patron": "orgasmo"
      },
      {
        "id": "ss_orgasmo_4",
        "etiqueta": "La mayoría de las veces",
        "valor": 4,
        "patron": "orgasmo"
      },
      {
        "id": "ss_orgasmo_3",
        "etiqueta": "Como la mitad de las veces",
        "valor": 3,
        "patron": "orgasmo"
      },
      {
        "id": "ss_orgasmo_2",
        "etiqueta": "Pocas veces",
        "valor": 2,
        "patron": "orgasmo"
      },
      {
        "id": "ss_orgasmo_1",
        "etiqueta": "Casi nunca o nunca",
        "valor": 1,
        "patron": "orgasmo"
      }
    ]
  },
  {
    "id": "ss_satisfaccion",
    "texto": "En las últimas 4 semanas, ¿qué tan satisfecha te sentiste con tu vida sexual en general?",
    "tipo": "opcion",
    "ayuda": "Esta pregunta se contesta aunque no hayas tenido actividad sexual; es sobre cómo te sientes con tu vida sexual en conjunto.",
    "opciones": [
      {
        "id": "ss_satisfaccion_5",
        "etiqueta": "Muy satisfecha",
        "valor": 5,
        "patron": "satisfaccion"
      },
      {
        "id": "ss_satisfaccion_4",
        "etiqueta": "Moderadamente satisfecha",
        "valor": 4,
        "patron": "satisfaccion"
      },
      {
        "id": "ss_satisfaccion_3",
        "etiqueta": "Ni satisfecha ni insatisfecha",
        "valor": 3,
        "patron": "satisfaccion"
      },
      {
        "id": "ss_satisfaccion_2",
        "etiqueta": "Moderadamente insatisfecha",
        "valor": 2,
        "patron": "satisfaccion"
      },
      {
        "id": "ss_satisfaccion_1",
        "etiqueta": "Muy insatisfecha",
        "valor": 1,
        "patron": "satisfaccion"
      }
    ]
  },
  {
    "id": "ss_dolor",
    "texto": "En las últimas 4 semanas, ¿con qué frecuencia sentiste molestia o dolor durante la penetración vaginal?",
    "tipo": "opcion",
    "ayuda": "Si no tuviste relaciones con penetración, elige la primera opción. Nota: aquí, sentir dolor casi siempre es lo que puntúa más bajo, y no tener dolor puntúa más alto.",
    "opciones": [
      {
        "id": "ss_dolor_0",
        "etiqueta": "No tuve relaciones con penetración",
        "valor": 0,
        "patron": "sin_actividad"
      },
      {
        "id": "ss_dolor_1",
        "etiqueta": "Casi siempre o siempre",
        "valor": 1,
        "patron": "dolor"
      },
      {
        "id": "ss_dolor_2",
        "etiqueta": "La mayoría de las veces",
        "valor": 2,
        "patron": "dolor"
      },
      {
        "id": "ss_dolor_3",
        "etiqueta": "Como la mitad de las veces",
        "valor": 3,
        "patron": "dolor"
      },
      {
        "id": "ss_dolor_4",
        "etiqueta": "Pocas veces",
        "valor": 4,
        "patron": "dolor"
      },
      {
        "id": "ss_dolor_5",
        "etiqueta": "Casi nunca o nunca",
        "valor": 5,
        "patron": "dolor"
      }
    ]
  }
];

const ITEMS = ['ss_deseo', 'ss_excitacion', 'ss_lubricacion', 'ss_orgasmo', 'ss_satisfaccion', 'ss_dolor'];
const DEPENDEN = ['ss_excitacion', 'ss_lubricacion', 'ss_orgasmo', 'ss_dolor']; // dependen de actividad sexual
const DOM = { ss_deseo: 'deseo', ss_excitacion: 'excitación', ss_lubricacion: 'lubricación', ss_orgasmo: 'orgasmo', ss_satisfaccion: 'satisfacción', ss_dolor: 'dolor' };

export function evaluar(resp) {
  const r = resp || {};
  const v = {}; ITEMS.forEach((id) => { v[id] = num(r[id]); });
  const completo = ITEMS.every((id) => v[id] != null);
  if (!completo) return { instrumento: 'FSFI-6', completo: false, resumen: null };

  const total = ITEMS.reduce((s, id) => s + v[id], 0);
  const sinActividad = DEPENDEN.filter((id) => v[id] === 0).length;
  // Área más afectada: se excluyen los reactivos con 0 por "sin actividad" (no son síntoma).
  const candidatos = ITEMS.filter((id) => !(DEPENDEN.includes(id) && v[id] === 0));
  const minVal = Math.min(...candidatos.map((id) => v[id]));
  const dominios = candidatos.filter((id) => v[id] === minVal).map((id) => DOM[id]);

  const positivo = total <= 19;
  const cautela = sinActividad >= 3 && positivo;
  const banda = cautela
    ? 'tamizaje positivo, probablemente influido por poca actividad sexual reciente (interpretar con cautela)'
    : (positivo ? 'tamizaje positivo: posible dificultad sexual' : 'por arriba del punto de corte');
  const actividad = sinActividad === 0 ? '' : ` No reportó actividad en ${sinActividad} de 4 reactivos que dependen de ella.`;
  const resumen = `Salud sexual (tamizaje breve de 6 reactivos): ${total} de 30. ${banda}. Área más afectada: ${dominios.join(', ')} (${minVal}/5).${actividad} Basal para repetir a las 8-12 semanas.`;
  return { instrumento: 'FSFI-6', completo: true, total, positivo, cautela, dominios, resumen, estado: positivo ? 'aviso' : 'ok' };
}
