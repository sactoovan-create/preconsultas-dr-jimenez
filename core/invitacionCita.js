// La referencia opaca solo vincula un envío en el ERP. No da acceso al expediente.
const TOKEN_CITA = /^[0-9a-f]{64}$/;
export function invitacionCitaDesdeHash(hash = globalThis.location?.hash || '') {
  const parametros = new URLSearchParams(String(hash).replace(/^#/, ''));
  const valores = parametros.getAll('cita');
  if (!valores.length) return '';
  // Un enlace dañado sigue identificado como invitación; el ERP lo deja en revisión.
  return valores.length === 1 && TOKEN_CITA.test(valores[0]) ? valores[0] : 'invalida';
}
export function invitacionDelBorrador(borrador) {
  if (!borrador || !Object.hasOwn(borrador, 'invitacionCita')) return '';
  return TOKEN_CITA.test(borrador.invitacionCita) ? borrador.invitacionCita : 'invalida';
}
