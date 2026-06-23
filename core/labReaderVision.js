/**
 * Andamio del lector de laboratorios por reconocimiento de visión.
 *
 * Reemplaza, en GineOS, al lector de texto basado en reconocimiento óptico
 * (core/labReaderBrowser.js) por un modelo de visión, que lee la fotografía o el
 * archivo del laboratorio y devuelve los valores estructurados.
 *
 * Diseño y seguridad:
 *  - Este módulo NO contiene ni maneja credenciales. Recibe una función de
 *    transporte `enviar`, que GineOS implementa con su propia clave y su endpoint.
 *    Así, la credencial vive en el entorno seguro de GineOS y nunca en este código.
 *  - El módulo arma la petición (instrucciones más imagen), delega el envío a
 *    `enviar`, y se encarga de interpretar la respuesta y mapearla al paciente.
 *
 * Conexión en GineOS (ejemplo):
 *   import { extraerLabsPorVision, mapearAPaciente } from './core/labReaderVision.js';
 *   const enviar = async (peticion) => {
 *     // GineOS hace aquí la llamada real al modelo de visión con su credencial,
 *     // ya sea por su backend o por el canal que use el resto de la aplicación,
 *     // y devuelve el texto de respuesta del modelo.
 *     return await miCanalDeVision(peticion);
 *   };
 *   const valores = await extraerLabsPorVision(imagenBase64, 'image/jpeg', enviar);
 *   mezclar('labs', mapearAPaciente(valores));
 */

// Analitos que los instrumentos consumen, con su unidad esperada.
export const ESQUEMA_LABS = {
  colesterolTotal: 'miligramos por decilitro',
  colesterolHdl: 'miligramos por decilitro',
  trigliceridos: 'miligramos por decilitro',
  glucosa: 'miligramos por decilitro',
  hemoglobinaGlucosilada: 'por ciento',
  creatinina: 'miligramos por decilitro',
  filtracionGlomerular: 'mililitros por minuto',
  relacionAlbuminaCreatinina: 'miligramos por gramo',
  hemoglobina: 'gramos por decilitro',
  testosteronaTotal: 'nanogramos por mililitro',
  globulinaFijadora: 'nanomoles por litro',
  tirotropina: 'microunidades por mililitro',
  prolactina: 'nanogramos por mililitro',
  diecisieteHidroxiprogesterona: 'nanogramos por mililitro',
  hormonaAntimulleriana: 'nanogramos por mililitro',
};

// Correspondencia entre las claves del esquema y los campos del paciente compartido.
const A_PACIENTE = {
  colesterolTotal: 'ct', colesterolHdl: 'hdl', trigliceridos: 'tg', glucosa: 'glu',
  hemoglobinaGlucosilada: 'hba1c', creatinina: 'creat', filtracionGlomerular: 'egfr',
  relacionAlbuminaCreatinina: 'uacr', hemoglobina: 'hb',
};

/** Instrucciones para el modelo de visión. Pide una respuesta solo en JSON. */
export function promptVision() {
  const campos = Object.entries(ESQUEMA_LABS).map(([k, u]) => `  "${k}": número en ${u} o null`).join(',\n');
  return [
    'Eres un asistente que transcribe resultados de laboratorio clínico a partir de una imagen.',
    'Lee la imagen del reporte y extrae únicamente los valores numéricos de los siguientes analitos.',
    'Responde solo con un objeto JSON, sin texto adicional, sin explicaciones y sin marcas de código.',
    'Si un analito no aparece en el reporte, su valor es null. No inventes valores.',
    'Convierte cada valor a la unidad indicada cuando sea posible.',
    '',
    'Esquema de respuesta:',
    '{',
    campos,
    '}',
  ].join('\n');
}

/**
 * Arma la petición para el modelo de visión, en una forma neutra (instrucciones e
 * imagen). El transporte de GineOS la adapta a su canal.
 */
export function construirPeticion(imagenBase64, mediaType = 'image/jpeg') {
  return {
    instrucciones: promptVision(),
    imagen: { base64: imagenBase64, mediaType },
    // Forma de mensajes habitual para modelos de visión, por si el transporte la usa directamente.
    mensajes: [
      {
        rol: 'usuario',
        contenido: [
          { tipo: 'imagen', fuente: { tipo: 'base64', mediaType, datos: imagenBase64 } },
          { tipo: 'texto', texto: promptVision() },
        ],
      },
    ],
  };
}

/** Extrae el primer objeto JSON de un texto, tolerante a texto alrededor. */
export function parsearRespuesta(texto) {
  if (!texto) return null;
  const limpio = String(texto).replace(/```json|```/g, '').trim();
  try { return JSON.parse(limpio); } catch (_) { /* continúa */ }
  const i = limpio.indexOf('{'), j = limpio.lastIndexOf('}');
  if (i >= 0 && j > i) {
    try { return JSON.parse(limpio.slice(i, j + 1)); } catch (_) { return null; }
  }
  return null;
}

/**
 * Extrae los valores de laboratorio de una imagen.
 * @param {string} imagenBase64 - imagen en base64 (sin el prefijo data:).
 * @param {string} mediaType - tipo de la imagen.
 * @param {function} enviar - función async inyectada por GineOS: recibe la petición
 *                            y devuelve el texto de respuesta del modelo.
 * @returns {Promise<object|null>} valores según ESQUEMA_LABS, o null si falla.
 */
export async function extraerLabsPorVision(imagenBase64, mediaType, enviar) {
  if (typeof enviar !== 'function') {
    throw new Error('Falta la función de transporte `enviar`, que GineOS provee con su credencial.');
  }
  const peticion = construirPeticion(imagenBase64, mediaType);
  const respuesta = await enviar(peticion);
  const valores = parsearRespuesta(respuesta);
  if (!valores) return null;
  // Conserva solo claves del esquema con valor numérico.
  const limpio = {};
  for (const k of Object.keys(ESQUEMA_LABS)) {
    const val = valores[k];
    if (val !== null && val !== undefined && !isNaN(Number(val))) limpio[k] = Number(val);
  }
  return limpio;
}

/** Mapea los valores extraídos a los campos del paciente compartido (grupo labs). */
export function mapearAPaciente(valores) {
  if (!valores) return {};
  const labs = {};
  for (const [clave, campo] of Object.entries(A_PACIENTE)) {
    if (valores[clave] !== undefined) labs[campo] = valores[clave];
  }
  // Los analitos hormonales conservan su clave; se usan directamente en sus instrumentos.
  for (const k of ['testosteronaTotal', 'globulinaFijadora', 'tirotropina', 'prolactina', 'diecisieteHidroxiprogesterona', 'hormonaAntimulleriana']) {
    if (valores[k] !== undefined) labs[k] = valores[k];
  }
  return labs;
}
