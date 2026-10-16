// Domicilio de la paciente como aparece en su INE para receta médica.
// Reglas alineadas con encounters/controlados.py (CAMPOS_DOMICILIO y limpiar_domicilio).

export const ENTIDADES_FEDERATIVAS = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de México',
  'Coahuila',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas',
];

export const OPCIONES_ENTIDADES_FEDERATIVAS = ENTIDADES_FEDERATIVAS.map((nombre) => ({
  valor: nombre,
  etiqueta: nombre,
}));

export const CAMPOS_DOMICILIO = [
  ['dom_calle_numero', 200],
  ['dom_colonia', 120],
  ['dom_municipio', 120],
  ['dom_estado', 80],
  ['dom_cp', 5],
];

function limpiarTexto(valor, limite) {
  if (typeof valor !== 'string' && typeof valor !== 'number') return '';
  return String(valor).trim().replace(/\s+/g, ' ').slice(0, limite);
}

export function normalizarCp(valor = '') {
  if (typeof valor !== 'string' && typeof valor !== 'number') return '';
  return String(valor).trim().replace(/[\s-]+/g, '');
}

export function limpiarEntradaCp(valor = '') {
  return normalizarCp(valor).slice(0, 5);
}

export function cpValido(valor = '') {
  return /^\d{5}$/.test(normalizarCp(valor));
}

function extraerFuenteDomicilio(origen = {}) {
  if (!origen || typeof origen !== 'object') return {};
  if (origen.domicilio && typeof origen.domicilio === 'object') {
    return { ...origen, ...origen.domicilio };
  }
  return origen;
}

export function tieneDatosDomicilio(origen = {}) {
  const src = extraerFuenteDomicilio(origen);
  return Boolean(
    limpiarTexto(src.dom_calle_numero ?? src.calle_numero ?? src.calleNumero ?? '', 200)
    || limpiarTexto(src.dom_colonia ?? src.colonia ?? '', 120)
    || normalizarCp(src.dom_cp ?? src.cp ?? src.codigo_postal ?? src.codigoPostal ?? '')
    || limpiarTexto(src.dom_municipio ?? src.municipio ?? src.alcaldia ?? '', 120)
    || limpiarTexto(src.dom_estado ?? src.estado ?? '', 80)
  );
}

export function normalizarDomicilio(origen = {}) {
  const src = extraerFuenteDomicilio(origen);
  const calle = limpiarTexto(src.dom_calle_numero ?? src.calle_numero ?? src.calleNumero ?? '', 200);
  const colonia = limpiarTexto(src.dom_colonia ?? src.colonia ?? '', 120);
  const municipio = limpiarTexto(src.dom_municipio ?? src.municipio ?? src.alcaldia ?? '', 120);
  const estadoRaw = limpiarTexto(src.dom_estado ?? src.estado ?? '', 80);
  const estado = ENTIDADES_FEDERATIVAS.includes(estadoRaw) ? estadoRaw : '';
  const cpRaw = normalizarCp(src.dom_cp ?? src.cp ?? src.codigo_postal ?? src.codigoPostal ?? '');
  const cp = /^\d{5}$/.test(cpRaw) ? cpRaw : '';
  return {
    dom_calle_numero: calle,
    dom_colonia: colonia,
    dom_cp: cp,
    dom_municipio: municipio,
    dom_estado: estado,
  };
}

export function validarDomicilio(datos = {}, { requerido = true } = {}) {
  const src = extraerFuenteDomicilio(datos);
  if (!requerido && !tieneDatosDomicilio(src)) {
    return { ok: true };
  }
  const colonia = limpiarTexto(src.dom_colonia ?? src.colonia ?? '', 120);
  const cpRaw = normalizarCp(src.dom_cp ?? src.cp ?? src.codigo_postal ?? src.codigoPostal ?? '');
  const municipio = limpiarTexto(src.dom_municipio ?? src.municipio ?? src.alcaldia ?? '', 120);
  const estado = limpiarTexto(src.dom_estado ?? src.estado ?? '', 80);

  if (!colonia) {
    return {
      ok: false,
      campo: 'dom_colonia',
      mensaje: 'Escribe tu colonia como aparece en tu INE.',
    };
  }
  if (!cpValido(cpRaw)) {
    return {
      ok: false,
      campo: 'dom_cp',
      mensaje: 'Escribe un código postal válido de 5 dígitos (por ejemplo, 06700).',
    };
  }
  if (!municipio) {
    return {
      ok: false,
      campo: 'dom_municipio',
      mensaje: 'Escribe tu municipio o alcaldía como aparece en tu INE.',
    };
  }
  if (!ENTIDADES_FEDERATIVAS.includes(estado)) {
    return {
      ok: false,
      campo: 'dom_estado',
      mensaje: 'Selecciona tu estado de la lista como aparece en tu INE.',
    };
  }
  return { ok: true };
}

export function formatearDomicilio(origen = {}) {
  const dom = normalizarDomicilio(origen);
  const partes = [
    dom.dom_calle_numero,
    dom.dom_colonia ? `Col. ${dom.dom_colonia}` : '',
    dom.dom_cp ? `C.P. ${dom.dom_cp}` : '',
    dom.dom_municipio,
    dom.dom_estado,
  ].filter(Boolean);
  return partes.join(', ');
}
