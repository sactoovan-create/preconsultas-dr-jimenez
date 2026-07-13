/**
 * Identidad profesional del médico. Fuente de verdad de la papelería de marca
 * (recetario y tarjeta). Se usa en el pie de las hojas impresas y en el portal,
 * como cinta de crédito discreta: es dato legalmente esperado en un documento
 * médico mexicano y una señal de confianza para la paciente.
 */

export const MEDICO = {
  nombre: 'Dr. Iván Jiménez Martínez',
  especialidad: 'Ginecología',
  cedulaMedicoGeneral: '7771863',
  cedulaEspecialista: '11504573',
  sitio: 'drivanjimenezginecologo.com',
};

/** Cinta de crédito de una línea. Texto estático (sin datos de la paciente).
 *  Ambas cédulas: la de médico general y la de especialista. */
export const CREDITO = `${MEDICO.nombre} · ${MEDICO.especialidad} · Cédula de médico general ${MEDICO.cedulaMedicoGeneral} · Cédula de especialista ${MEDICO.cedulaEspecialista}`;
