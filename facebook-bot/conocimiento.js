/**
 * Lo único que el bot puede afirmar en público. Es una copia destilada de la nota
 * de la bóveda «Datos canonicos de contacto y canales» (revisión de precios
 * 2026-10-05, de horarios 2026-10-22). Si esa nota cambia, este archivo se
 * actualiza a mano: el bot corre en la nube y no lee Obsidian.
 *
 * PRECIOS_PERMITIDOS se usa además como candado: una respuesta que mencione una
 * cantidad que no esté aquí no se publica.
 */

export const PRECIOS_PERMITIDOS = [1500, 1200, 2500, 3800, 4400, 6000];

export const ENLACES = {
  preconsulta: 'https://preconsultas-dr-jimenez.vercel.app/',
  sitio: 'https://drivanjimenezginecologo.com/',
};

export const TELEFONO_PUBLICO = '55 3048 5448';

export const CONOCIMIENTO = `
IDENTIDAD
- Dr. Iván Jiménez Martínez, Ginecología de Alta Especialidad.
- No se ofrece obstetricia: ni control prenatal, ni ultrasonido obstétrico, ni seguimiento de embarazo.
- No se anuncian convenios con aseguradoras.

UBICACIÓN
- Hospital Star Médica Tlalnepantla, Torre de Consultorios, piso 9, consultorio 915.
  Av. Sor Juana Inés de la Cruz 280, Tlalnepantla de Baz, Estado de México.

HORARIOS (por cita, sujetos a disponibilidad; nunca prometer un lugar libre)
- Consulta presencial: martes, jueves y viernes de 9:00 a 12:00; sábado de 9:00 a 14:00.
- Videoconsulta: lunes y miércoles de 8:00 a 13:00.
- Domingo cerrado.

PRECIOS
- Consulta ginecológica presencial: $1,500, 60 minutos. Incluye historia clínica, revisión de
  estudios, exploración si se requiere, ultrasonido ginecológico cuando aplica y plan de manejo.
- Videoconsulta: $1,200, 40 minutos.
- Ultrasonido ginecológico independiente: $1,200.
- Mapeo de endometriosis: $2,500.
- Chequeo clásico: $2,500 (consulta, exploración, colposcopia, Papanicolaou convencional y ultrasonido ginecológico).
- Chequeo molecular: $3,800 (consulta, exploración, colposcopia, ultrasonido, citología en base líquida y prueba de virus del papiloma de alto riesgo).
- Chequeo molecular con cultivo: $4,400 (lo anterior más cultivo vaginal).
- Paquete premium: $6,000 (lo anterior más panel de infecciones de transmisión sexual).
- Cirugías, procedimientos, láser, DIU, implante y promociones: NO hay precio público. Se explica
  que el costo se define después de la valoración.

CÓMO AGENDAR
- Por WhatsApp o llamada al {{TELEFONO}}.
- Cuestionario previo a la consulta (opcional, ordena el caso): ${ENLACES.preconsulta}
- Información de temas y enfoque: ${ENLACES.sitio}
`.trim();
