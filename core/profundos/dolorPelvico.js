/**
 * Profundización de DOLOR PÉLVICO / ENDOMETRIOSIS: mapa de cuatro dimensiones
 * (dolor menstrual, dolor no menstrual, dolor en relaciones profundas, dolor al
 * obrar/orinar), basado en ENDOPAIN-4D y en la escala numérica por dimensión de la
 * American Society for Reproductive Medicine. Identifica el patrón dominante y
 * banderas; ES UN MAPA ORIENTATIVO, no una etiqueta de endometriosis. Basal 8-12 sem.
 */

export const ID = 'dolor-pelvico';
export const TITULO = "Mapa de tu dolor pélvico";
export const FUENTE = "ENDOPAIN-4D (Puchar A, et al. J Clin Med. 2021;10(15):3216) para las cuatro dimensiones del dolor asociado a endometriosis; escala numérica de 11 puntos (0-10) recomendada por la American Society for Reproductive Medicine y por el consenso Art and Science of Endometriosis para medir el dolor por dimensión. No se localizó una versión validada al español al momento de construir el módulo; es una adaptación clínica al español de México del marco de cuatro dimensiones, con umbrales de severidad tomados de la escala numérica estándar. Se cita al médico como marco de referencia, no como prueba validada en español.";

function num(x) { const n = Number(x); return Number.isFinite(n) ? n : null; }

export function disparador(ar) {
  const dolor = (ar && ar.dolor) || {};
  return dolor.tiene === true;
}

export const PREGUNTAS = [
  {
    "id": "dismenorrea_aplica",
    "texto": "¿Todavía tienes tu regla (menstruación)?",
    "tipo": "opcion",
    "ayuda": "Esto es solo para saber si la siguiente pregunta aplica para ti.",
    "opciones": [
      {
        "id": "menstrua_si",
        "etiqueta": "Sí, todavía menstrúo",
        "valor": 1
      },
      {
        "id": "menstrua_no",
        "etiqueta": "No, ya no tengo regla",
        "valor": 0
      }
    ]
  },
  {
    "id": "dismenorrea_int",
    "texto": "Cuando estás en tu regla, ¿qué tan fuerte es el dolor de cólico?",
    "tipo": "escala",
    "min": 0,
    "max": 10,
    "etiquetaMin": "Sin dolor",
    "etiquetaMax": "El peor dolor imaginable",
    "ayuda": "Piensa en tus últimas reglas. Si ya no menstrúas, deja esta en cero y sigue."
  },
  {
    "id": "no_menstrual_int",
    "texto": "Fuera de tu regla, en tu día a día, ¿qué tan fuerte es el dolor en la parte baja del vientre?",
    "tipo": "escala",
    "min": 0,
    "max": 10,
    "etiquetaMin": "Sin dolor",
    "etiquetaMax": "El peor dolor imaginable",
    "ayuda": "Nos referimos al dolor que aparece en cualquier momento del mes, no solo en la regla."
  },
  {
    "id": "dispareunia_aplica",
    "texto": "En los últimos meses, ¿has tenido relaciones sexuales con penetración?",
    "tipo": "opcion",
    "ayuda": "Puedes saltar la siguiente pregunta si prefieres no contestar.",
    "opciones": [
      {
        "id": "rel_si",
        "etiqueta": "Sí",
        "valor": 1
      },
      {
        "id": "rel_no",
        "etiqueta": "No he tenido relaciones últimamente",
        "valor": 0
      },
      {
        "id": "rel_prefiero_no",
        "etiqueta": "Prefiero no contestar",
        "valor": -1
      }
    ]
  },
  {
    "id": "dispareunia_int",
    "texto": "Durante las relaciones, ¿qué tan fuerte es el dolor profundo (adentro, no en la entrada)?",
    "tipo": "escala",
    "min": 0,
    "max": 10,
    "etiquetaMin": "Sin dolor",
    "etiquetaMax": "El peor dolor imaginable",
    "ayuda": "Nos interesa el dolor de adentro, en el fondo, no la molestia en la entrada. Si no aplica, deja en cero."
  },
  {
    "id": "disquecia_int",
    "texto": "Al obrar (evacuar), sobre todo cuando estás en tu regla, ¿qué tan fuerte es el dolor?",
    "tipo": "escala",
    "min": 0,
    "max": 10,
    "etiquetaMin": "Sin dolor",
    "etiquetaMax": "El peor dolor imaginable",
    "ayuda": "Si nunca te duele al obrar, deja en cero."
  },
  {
    "id": "disuria_int",
    "texto": "Al orinar, sobre todo cuando estás en tu regla, ¿qué tan fuerte es el dolor?",
    "tipo": "escala",
    "min": 0,
    "max": 10,
    "etiquetaMin": "Sin dolor",
    "etiquetaMax": "El peor dolor imaginable",
    "ayuda": "Nos referimos a dolor al orinar, no a las ganas frecuentes. Si nunca te duele, deja en cero."
  },
  {
    "id": "impacto",
    "texto": "En general, ¿cuánto afecta este dolor tu vida diaria (trabajo, ánimo, actividades, descanso)?",
    "tipo": "escala",
    "min": 0,
    "max": 10,
    "etiquetaMin": "No la afecta",
    "etiquetaMax": "La afecta por completo"
  },
  {
    "id": "mas_molesto",
    "texto": "De todos, ¿cuál dolor es el que más te molesta?",
    "tipo": "opcion",
    "ayuda": "Elige el que más pesa en tu vida.",
    "opciones": [
      {
        "id": "mm_dismenorrea",
        "etiqueta": "El cólico de la regla",
        "valor": 1,
        "patron": "dismenorrea"
      },
      {
        "id": "mm_no_menstrual",
        "etiqueta": "El dolor de todos los días",
        "valor": 2,
        "patron": "no_menstrual"
      },
      {
        "id": "mm_dispareunia",
        "etiqueta": "El dolor en las relaciones",
        "valor": 3,
        "patron": "dispareunia"
      },
      {
        "id": "mm_genitourinario",
        "etiqueta": "El dolor al obrar o al orinar",
        "valor": 4,
        "patron": "genitourinario"
      },
      {
        "id": "mm_mixto",
        "etiqueta": "Varios por igual",
        "valor": 5,
        "patron": "mixto"
      }
    ]
  },
  {
    "id": "banderas",
    "texto": "¿Has notado alguna de estas situaciones? Marca todas las que apliquen.",
    "tipo": "multiple",
    "ayuda": "Si ninguna te pasa, marca la última opción.",
    "opciones": [
      {
        "id": "b_sangre_obrar",
        "etiqueta": "Sangre al obrar cuando estoy en mi regla",
        "valor": 1,
        "patron": "intestinal"
      },
      {
        "id": "b_sangre_orina",
        "etiqueta": "Sangre en la orina cuando estoy en mi regla",
        "valor": 1,
        "patron": "vesical"
      },
      {
        "id": "b_refractario",
        "etiqueta": "El dolor no se quita ni con pastillas para el dolor",
        "valor": 1,
        "patron": "refractario"
      },
      {
        "id": "b_discapacita",
        "etiqueta": "El dolor me hace faltar al trabajo, la escuela o mis actividades",
        "valor": 1,
        "patron": "discapacitante"
      },
      {
        "id": "b_fertilidad",
        "etiqueta": "Estoy buscando embarazo y no lo he logrado",
        "valor": 1,
        "patron": "fertilidad"
      },
      {
        "id": "b_ninguna",
        "etiqueta": "Ninguna de las anteriores",
        "valor": 0
      }
    ]
  }
];

const banda = (x) => x == null ? 'no aplica' : (x === 0 ? 'sin dolor' : (x <= 3 ? 'leve' : (x <= 6 ? 'moderado' : 'intenso')));

export function evaluar(resp) {
  const r = resp || {};
  const D1 = num(r.dismenorrea_aplica) === 0 ? null : num(r.dismenorrea_int);
  const D2 = num(r.no_menstrual_int);
  const D3 = num(r.dispareunia_aplica) !== 1 ? null : num(r.dispareunia_int);
  const disq = num(r.disquecia_int), disu = num(r.disuria_int);
  const D4 = (disq == null && disu == null) ? null : Math.max(disq || 0, disu || 0);

  const dims = [
    { k: 'dismenorrea', n: 'dolor menstrual', v: D1 },
    { k: 'no_menstrual', n: 'dolor pélvico no menstrual', v: D2 },
    { k: 'dispareunia', n: 'dolor en las relaciones profundas', v: D3 },
    { k: 'genitourinario', n: 'dolor al obrar u orinar', v: D4 },
  ];
  const conDolor = dims.filter((x) => x.v != null && x.v >= 1);
  if (!conDolor.length) return { instrumento: 'ENDOPAIN-4D', completo: true, resumen: 'Mapa del dolor pélvico: sin dolor mapeable con los datos de hoy.', estado: 'ok' };

  const carga = dims.reduce((s, x) => s + (x.v || 0), 0);
  const bandaCarga = carga <= 9 ? 'leve' : (carga <= 19 ? 'moderada' : (carga <= 29 ? 'alta' : 'muy alta'));

  const mx = Math.max(...conDolor.map((x) => x.v));
  const top = conDolor.filter((x) => x.v === mx);
  let dominante;
  if (top.length === 1) dominante = top[0];
  else {
    const mm = (PREGUNTAS.find((p) => p.id === 'mas_molesto').opciones || []).find((o) => o.valor === num(r.mas_molesto));
    const match = mm ? top.find((x) => x.k === mm.patron) : null;
    dominante = match || { n: 'patrón mixto', v: mx, k: 'mixto' };
  }

  const bans = Array.isArray(r.banderas) ? r.banderas : [];
  const bTxt = [];
  if (bans.includes('b_refractario')) bTxt.push('dolor que no cede con analgésicos');
  if (bans.includes('b_discapacita')) bTxt.push('falta a sus actividades');
  if (bans.includes('b_sangre_obrar')) bTxt.push('sangre al obrar durante la regla');
  if (bans.includes('b_sangre_orina')) bTxt.push('sangre en la orina durante la regla');
  if (bans.includes('b_fertilidad')) bTxt.push('busca embarazo sin lograrlo');

  const impacto = num(r.impacto);
  const dimsTxt = dims.filter((x) => x.v != null).map((x) => `${x.n} ${x.v}/10 (${banda(x.v)})`).join('; ');
  const estado = dominante.v >= 7 ? 'alerta' : (dominante.v >= 4 ? 'aviso' : 'ok');
  const resumen = `Mapa del dolor pélvico (orientativo): patrón dominante ${dominante.n}${dominante.v ? ` (${dominante.v}/10)` : ''}. Dimensiones: ${dimsTxt}.${impacto != null ? ` Impacto ${impacto}/10.` : ''} Carga del mapa ${carga}/40 (${bandaCarga}).${bTxt.length ? ` Banderas: ${bTxt.join(', ')}.` : ''} Basal para repetir a las 8-12 semanas.`;
  return { instrumento: 'ENDOPAIN-4D', completo: true, dominante: dominante.k, carga, resumen, estado };
}
