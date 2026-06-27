/**
 * Lector de reportes de laboratorio.
 *
 * Extrae analitos e identificación de la paciente a partir del texto plano de un
 * reporte (obtenido con pdf.js para documentos o con reconocimiento óptico para
 * imágenes). Validado contra reportes reales de Salud Digna, OLAB (Estudios
 * Clínicos Dr. T.J. Oriard) y Chopo.
 *
 * Funciones puras: reciben texto y devuelven objetos. No tocan el DOM ni cargan
 * librerías; la obtención del texto se hace fuera (ver core/labReaderBrowser.js
 * o el equivalente en el proceso de GineOS, que puede usar reconocimiento por
 * visión para mayor robustez).
 */

export function sinAcentos(s) {
  return s.toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u');
}

function primerNumero(s) {
  const m = s.match(/\d+[.,]\d+|\d+/g);
  if (!m) return null;
  for (const c of m) {
    const n = parseFloat(c.replace(',', '.'));
    if (!isNaN(n)) return n;
  }
  return null;
}

function valorEnLinea(lineas, incluir, excluir, limpiar) {
  for (const ln of lineas) {
    if (incluir.test(ln) && (!excluir || !excluir.test(ln))) {
      const linea = limpiar ? ln.replace(limpiar, ' ') : ln;
      const n = primerNumero(linea);
      if (n !== null) return n;
    }
  }
  return null;
}

/**
 * Extrae los analitos del cuerpo del reporte.
 * @returns {object} { ct, hdl, tg, glu, hba1c, creat, uacr } con valor numérico
 *   o null por cada uno.
 */
export function parseLabs(txt) {
  let lineas = txt.split(/\n+/).map((l) => sinAcentos(l).trim());
  // Cortar el bloque de histórico comparativo (formato Salud Digna): sus primeros
  // números son valores de visitas previas, no el resultado actual.
  const corte = lineas.findIndex((l) =>
    /resumen comparativo|tres estudios mas recientes|historico de resultados/.test(l));
  if (corte >= 0) lineas = lineas.slice(0, corte);
  lineas = lineas.filter((l) => l.length > 2 && /\d/.test(l));

  return {
    ct: valorEnLinea(lineas, /colesterol\s*total|col\.?\s*total/, /hdl|ldl|vldl/),
    hdl: valorEnLinea(lineas, /colesterol\s*hdl|c[\s-]?hdl|\bhdl\b|alta densidad/, /no\s*-?\s*hdl|ldl|vldl/),
    tg: valorEnLinea(lineas, /triglicerid/, null),
    glu: valorEnLinea(lineas, /glucosa|glucemia/, /post|2\s*h|orin|gl[iu]cosilada|promedio/),
    insulina: valorEnLinea(lineas, /insulina/, /post|2\s*h|curva|tolerancia|estimul/),
    hba1c: valorEnLinea(lineas, /hemoglobina\s*gl[iu]cosilada|\bhba1?c\b|\ba1c\b/, /promedio|estimada/, /hba1c|a1c/g),
    creat: valorEnLinea(lineas, /creatinina/, /orin|urin|relacion|cociente|indice|albumina|depuracion|clearance/),
    uacr: valorEnLinea(lineas, /microalbuminuria|album\w*\s*[/\- ]\s*creatinina|(?:relacion|cociente|indice|razon)\s+album\w*.{0,18}creatinina|\buacr\b|\brac\b|\bacr\b/, /globulina/),
  };
}

/**
 * Extrae nombre y edad de la paciente del encabezado del reporte.
 * @returns {object} { nombre, edad }
 */
export function parseIdent(txt) {
  let nombre = null, edad = null;
  const me = txt.match(/edad\s*:?\s*(\d{1,3})\s*a/i);
  if (me) edad = parseInt(me[1], 10);
  const mn = txt.match(/paciente\s*:?\s*([A-Za-zÁÉÍÓÚÑáéíóúñ][^\n]*?)(?:\s+(?:sexo|edad|fecha|folio|fec\.|n[°ºo]\s*cliente)\b|$)/i);
  if (mn) {
    let n = mn[1].trim().replace(/\s{2,}/g, ' ');
    if (n.includes(',')) {
      const p = n.split(',');
      n = ((p[1] || '').trim() + ' ' + (p[0] || '').trim()).trim();
    }
    try { nombre = n.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase()); }
    catch (e) { nombre = n; }
  }
  return { nombre, edad };
}

export const ETIQUETAS_LAB = {
  ct: 'Colesterol total',
  hdl: 'Colesterol de alta densidad',
  tg: 'Triglicéridos',
  glu: 'Glucosa en ayuno',
  insulina: 'Insulina basal en ayuno',
  hba1c: 'Hemoglobina glucosilada',
  creat: 'Creatinina sérica',
  uacr: 'Cociente albúmina-creatinina',
};
