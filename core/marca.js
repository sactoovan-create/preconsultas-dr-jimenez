/**
 * Identidad profesional del médico. Fuente de verdad de la papelería de marca
 * (recetario y tarjeta). Se usa en el pie de las hojas impresas y en el portal,
 * como cinta de crédito discreta: es dato legalmente esperado en un documento
 * médico mexicano y una señal de confianza para la paciente.
 */

export const MEDICO = {
  nombre: 'Dr. Iván Jiménez Martínez',
  especialidad: 'Ginecología',
  cedulaProfesional: '7771863',
  cedulaEspecialidad: '11504573',
  sitio: 'drivanjimenezginecologo.com',
};

/** Cinta de crédito de una línea. Texto estático (sin datos de la paciente). */
export const CREDITO = `${MEDICO.nombre} · ${MEDICO.especialidad} · Cédula profesional ${MEDICO.cedulaProfesional} · Cédula de especialidad ${MEDICO.cedulaEspecialidad}`;
