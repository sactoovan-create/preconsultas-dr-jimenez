/**
 * Normalización para emparejar pacientes entre la agenda (Huli, vía expediente) y
 * los cuestionarios del portal. Debe coincidir con `marketing.services` del
 * expediente para que ambos lados crucen con la misma llave.
 *
 * Funciones puras y testeables.
 */

/** Últimos diez dígitos del teléfono. Ignora lada de país (+52 / 521) y formato. */
export function normalizarTelefono(raw) {
  const digitos = String(raw == null ? '' : raw).replace(/\D/g, '');
  return digitos.length >= 10 ? digitos.slice(-10) : digitos;
}

/** Minúsculas, sin acentos, espacios colapsados. Para cruce por nombre. */
export function normalizarNombre(raw) {
  return String(raw == null ? '' : raw)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}
