/**
 * Profundización de SÍNDROME GENITOURINARIO DE LA MENOPAUSIA (salud íntima).
 * Severidad de síntomas vulvovaginales/urinarios + SÍNTOMA MÁS MOLESTO (lista tipo
 * COMMA) + impacto en calidad de vida (estilo DIVA). No usa el índice de salud
 * vaginal (que mide el médico en la exploración). Orientativo; medida basal que se
 * repite a las 8-12 semanas.
 */

export const ID = 'genitourinario';
export const TITULO = "Salud íntima en la menopausia";
export const FUENTE = "Escala de severidad de síntomas tipo MsFLASH (0 a 3) + lista del síntoma más molesto del consorcio COMMA + impacto en calidad de vida tipo DIVA (Day-to-Day Impact of Vaginal Aging); apoyado en el cuestionario de síntomas vulvovaginales (VSQ) y en el Cervantes-GSM (validado en español). No incluye el índice de salud vaginal (VHI), que lo mide el médico en la exploración.";

function num(x) { const n = Number(x); return Number.isFinite(n) ? n : null; }

export function disparador(ar) {
  const mrs = (ar && ar.mrs) || {};
  return (num(mrs.mrs_sequedad) != null && num(mrs.mrs_sequedad) >= 2) || (num(mrs.mrs_sexual) != null && num(mrs.mrs_sexual) >= 2);
}

export const PREGUNTAS = [
  {
    "id": "sequedad",
    "texto": "En las últimas semanas, ¿cómo has sentido la sequedad vaginal?",
    "ayuda": "Sensación de falta de lubricación o de resequedad en la zona íntima.",
    "tipo": "opcion",
    "opciones": [
      {
        "id": "seq0",
        "etiqueta": "No la tengo",
        "valor": 0
      },
      {
        "id": "seq1",
        "etiqueta": "Leve: la noto, pero casi no me molesta",
        "valor": 1
      },
      {
        "id": "seq2",
        "etiqueta": "Moderada: me molesta",
        "valor": 2
      },
      {
        "id": "seq3",
        "etiqueta": "Intensa: me molesta mucho",
        "valor": 3
      }
    ]
  },
  {
    "id": "comezon",
    "texto": "¿Y comezón o irritación en la zona íntima (vulva o entrada de la vagina)?",
    "tipo": "opcion",
    "opciones": [
      {
        "id": "com0",
        "etiqueta": "No la tengo",
        "valor": 0
      },
      {
        "id": "com1",
        "etiqueta": "Leve: la noto, pero casi no me molesta",
        "valor": 1
      },
      {
        "id": "com2",
        "etiqueta": "Moderada: me molesta",
        "valor": 2
      },
      {
        "id": "com3",
        "etiqueta": "Intensa: me molesta mucho",
        "valor": 3
      }
    ]
  },
  {
    "id": "ardor",
    "texto": "¿Sientes ardor o dolor en la vulva o la vagina fuera de las relaciones (por ejemplo al caminar, sentarte o con la ropa)?",
    "tipo": "opcion",
    "opciones": [
      {
        "id": "ard0",
        "etiqueta": "No lo tengo",
        "valor": 0
      },
      {
        "id": "ard1",
        "etiqueta": "Leve: lo noto, pero casi no me molesta",
        "valor": 1
      },
      {
        "id": "ard2",
        "etiqueta": "Moderado: me molesta",
        "valor": 2
      },
      {
        "id": "ard3",
        "etiqueta": "Intenso: me molesta mucho",
        "valor": 3
      }
    ]
  },
  {
    "id": "dolor_sexo",
    "texto": "Durante o después de las relaciones sexuales, ¿tienes dolor o molestia?",
    "ayuda": "Si ahora no tienes relaciones, elige la última opción.",
    "tipo": "opcion",
    "opciones": [
      {
        "id": "dsx0",
        "etiqueta": "No, no me duele",
        "valor": 0
      },
      {
        "id": "dsx1",
        "etiqueta": "Leve: molesta un poco",
        "valor": 1
      },
      {
        "id": "dsx2",
        "etiqueta": "Moderado: me molesta",
        "valor": 2
      },
      {
        "id": "dsx3",
        "etiqueta": "Intenso: me molesta mucho",
        "valor": 3
      },
      {
        "id": "dsx_na",
        "etiqueta": "No tengo relaciones sexuales ahora",
        "valor": -1
      }
    ]
  },
  {
    "id": "urinario",
    "texto": "¿Tienes ardor al orinar, o ganas urgentes o muy frecuentes de ir al baño?",
    "ayuda": "Piensa en las últimas semanas, sin contar cuando has tenido una infección diagnosticada.",
    "tipo": "opcion",
    "opciones": [
      {
        "id": "uri0",
        "etiqueta": "No, casi nunca",
        "valor": 0
      },
      {
        "id": "uri1",
        "etiqueta": "Leve: a veces, pero casi no me molesta",
        "valor": 1
      },
      {
        "id": "uri2",
        "etiqueta": "Moderado: me molesta",
        "valor": 2
      },
      {
        "id": "uri3",
        "etiqueta": "Intenso: me molesta mucho",
        "valor": 3
      }
    ]
  },
  {
    "id": "evita_intimidad",
    "texto": "¿Has dejado o evitas la intimidad por estas molestias?",
    "tipo": "opcion",
    "opciones": [
      {
        "id": "evi_si",
        "etiqueta": "Sí, la he dejado o la evito por esto",
        "valor": 2
      },
      {
        "id": "evi_aveces",
        "etiqueta": "A veces",
        "valor": 1
      },
      {
        "id": "evi_no",
        "etiqueta": "No",
        "valor": 0
      },
      {
        "id": "evi_na",
        "etiqueta": "No aplica en mi caso",
        "valor": -1
      }
    ]
  },
  {
    "id": "mbs",
    "texto": "De todo lo anterior, ¿qué es lo que MÁS te molesta hoy?",
    "ayuda": "Elige solo una, la que más te afecta.",
    "tipo": "opcion",
    "opciones": [
      {
        "id": "mbs_sequedad",
        "etiqueta": "La sequedad vaginal",
        "patron": "sequedad",
        "valor": 0
      },
      {
        "id": "mbs_comezon",
        "etiqueta": "La comezón o irritación",
        "patron": "comezon",
        "valor": 1
      },
      {
        "id": "mbs_ardor",
        "etiqueta": "El ardor o dolor en la zona íntima",
        "patron": "ardor",
        "valor": 2
      },
      {
        "id": "mbs_dolor_sexo",
        "etiqueta": "El dolor en las relaciones sexuales",
        "patron": "dolor_sexo",
        "valor": 3
      },
      {
        "id": "mbs_urinario",
        "etiqueta": "Las molestias al orinar (ardor, urgencia o frecuencia)",
        "patron": "urinario",
        "valor": 4
      },
      {
        "id": "mbs_ninguna",
        "etiqueta": "Ninguna en especial",
        "patron": "ninguna",
        "valor": 5
      }
    ]
  },
  {
    "id": "impacto_dia",
    "texto": "¿Qué tanto afectan estas molestias tu vida diaria (dormir, sentarte, hacer ejercicio, tu ropa)?",
    "tipo": "opcion",
    "opciones": [
      {
        "id": "idi0",
        "etiqueta": "Nada",
        "valor": 0
      },
      {
        "id": "idi1",
        "etiqueta": "Un poco",
        "valor": 1
      },
      {
        "id": "idi2",
        "etiqueta": "Moderadamente",
        "valor": 2
      },
      {
        "id": "idi3",
        "etiqueta": "Bastante",
        "valor": 3
      },
      {
        "id": "idi4",
        "etiqueta": "Muchísimo",
        "valor": 4
      }
    ]
  },
  {
    "id": "impacto_animo",
    "texto": "¿Qué tanto afectan tu ánimo o cómo te sientes contigo misma?",
    "tipo": "opcion",
    "opciones": [
      {
        "id": "ian0",
        "etiqueta": "Nada",
        "valor": 0
      },
      {
        "id": "ian1",
        "etiqueta": "Un poco",
        "valor": 1
      },
      {
        "id": "ian2",
        "etiqueta": "Moderadamente",
        "valor": 2
      },
      {
        "id": "ian3",
        "etiqueta": "Bastante",
        "valor": 3
      },
      {
        "id": "ian4",
        "etiqueta": "Muchísimo",
        "valor": 4
      }
    ]
  },
  {
    "id": "impacto_intimidad",
    "texto": "¿Qué tanto afectan tu vida en pareja o tu intimidad?",
    "ayuda": "Si ahora no tienes pareja o vida sexual, elige la última opción.",
    "tipo": "opcion",
    "opciones": [
      {
        "id": "iin0",
        "etiqueta": "Nada",
        "valor": 0
      },
      {
        "id": "iin1",
        "etiqueta": "Un poco",
        "valor": 1
      },
      {
        "id": "iin2",
        "etiqueta": "Moderadamente",
        "valor": 2
      },
      {
        "id": "iin3",
        "etiqueta": "Bastante",
        "valor": 3
      },
      {
        "id": "iin4",
        "etiqueta": "Muchísimo",
        "valor": 4
      },
      {
        "id": "iin_na",
        "etiqueta": "No aplica en mi caso",
        "valor": -1
      }
    ]
  }
];

const SINTOMAS = ['sequedad', 'comezon', 'ardor', 'dolor_sexo', 'urinario'];
const NOMBRE = { sequedad: 'sequedad vaginal', comezon: 'comezón o irritación', ardor: 'ardor o dolor vulvar', dolor_sexo: 'dolor en las relaciones', urinario: 'molestias urinarias' };

export function evaluar(resp) {
  const r = resp || {};
  const apl = SINTOMAS.filter((id) => { const x = num(r[id]); return x != null && x >= 0; });
  if (!apl.length) return { instrumento: 'GSM', completo: false, resumen: null };

  const suma = apl.reduce((s, id) => s + num(r[id]), 0);
  const maxSev = Math.max(...apl.map((id) => num(r[id])));
  const nMod = apl.filter((id) => num(r[id]) >= 2).length;
  const bandaSint = suma === 0 ? 'sin síntomas' : (maxSev === 1 ? 'leve' : ((maxSev === 3 || nMod >= 3) ? 'intensa' : 'moderada'));

  // Síntoma más molesto: la opción elegida guarda su valor; se mapea a su patrón.
  const mbsOpt = (PREGUNTAS.find((p) => p.id === 'mbs').opciones || []).find((o) => o.valor === num(r.mbs));
  const mbsPat = mbsOpt ? mbsOpt.patron : null;
  let mbsTxt = 'sin uno en especial';
  if (mbsPat && mbsPat !== 'ninguna') {
    const sev = num(r[mbsPat]);
    const nom = NOMBRE[mbsPat] || mbsPat;
    if (mbsPat === 'dolor_sexo' && sev === -1) mbsTxt = `${nom} (lo refiere, pero no tiene relaciones ahora)`;
    else if (sev != null && sev >= 2) mbsTxt = `${nom} (${sev >= 3 ? 'intenso' : 'moderado'})`;
    else mbsTxt = `${nom} (hoy leve)`;
  }

  const IMP = ['impacto_dia', 'impacto_animo', 'impacto_intimidad'];
  const impVals = IMP.map((id) => num(r[id])).filter((x) => x != null && x >= 0);
  const media = impVals.length ? Math.round((impVals.reduce((a, b) => a + b, 0) / impVals.length) * 10) / 10 : null;
  const bandaImp = media == null ? 'sin dato' : (media < 1 ? 'mínimo' : (media < 2 ? 'leve' : (media < 3 ? 'moderado' : 'alto')));

  const evita = num(r.evita_intimidad);
  const evitaTxt = (evita != null && evita >= 1) ? ' Refiere evitar la intimidad por estas molestias.' : '';
  const estado = (bandaSint === 'intensa' || bandaImp === 'alto') ? 'alerta'
    : ((bandaSint === 'moderada' || bandaImp === 'moderado' || (mbsPat && mbsPat !== 'ninguna' && num(r[mbsPat]) >= 2)) ? 'aviso' : 'ok');

  const resumen = `Salud íntima (síndrome genitourinario): lo que más le molesta, ${mbsTxt}. Síntomas ${bandaSint} (${nMod} de ${apl.length} moderados o intensos). Impacto en calidad de vida ${bandaImp}${media != null ? ` (${media} de 4)` : ''}.${evitaTxt} Medida basal; repetir a las 8-12 semanas.`;
  return { instrumento: 'GSM', completo: true, resumen, estado };
}
