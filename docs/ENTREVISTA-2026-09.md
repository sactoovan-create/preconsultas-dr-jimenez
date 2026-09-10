# Entrevista dirigida y reorganizacion de la preconsulta

Fecha: 2026-09-09. Estado: implementacion local, no publicada.
Rama: `codex/preconsulta-entrevista-organizada`.
Base: `681f7659caf4cafcd1a32015923f44bd99255c4c`.

## Alcance y autorizacion

El Dr. Ivan solicito auditar, corregir preguntas ambiguas y mejorar organizacion
y estetica contrastando con su Obsidian. Esta entrega modifica el portal, no el
ERP, Huli ni las cuentas de infraestructura. No cambia las decisiones medicas,
no incluye atencion prenatal y no convierte la entrevista en un diagnostico.

Se hizo busqueda transversal por temas de anamnesis en la boveda viva (213 notas
coincidentes), seguida de lectura dirigida de las fuentes pertinentes y de la
auditoria previa. Buscar un corpus no equivale a leer todos sus documentos.
No se incorporaron expedientes, identificadores de pacientes ni secretos.

## Problemas corregidos en este lote

- Faltaban recorridos explicitos para resultados cervicales, molestias vulvares
  y piso pelvico; metabolismo estaba entre los motivos pero no tenia su paso.
- Faltaban evolucion, impacto, tratamientos intentados, tolerancia y prioridades.
- El resumen final no permitia revisar cada seccion y afirmaba apartados revisados
  sin comprobarlo. Ahora expone respuestas y opciones de editar, sin sellos falsos.
- La interfaz duplicaba encuadres y reservaba demasiado espacio al encabezado.
  Ahora usa cinco grupos de navegacion, logo existente, contenido sin tarjetas
  anidadas, controles legibles y atribucion en dos selectores compactos.
- El lector medico presenta motivo y estudios antes del detalle; organiza las
  nuevas respuestas por tema y pliega antecedentes secundarios y marketing.
- `null` y cadena vacia ya no completan MRS ni intensidad de dolor en la validacion
  del recorrido. No se afirma que todos los motores antiguos hayan sido corregidos.
- Cancer de mama y trombosis afirmados sobreviven la precarga. Un antecedente
  cardiaco/hepatico amplio queda por precisar. La candidatura hormonal devuelve
  `incompleta` si faltan antecedentes esenciales y no genera alternativas no
  hormonales por el simple hecho de estar incompleta.
- Los nuevos reportes distinguen 12 meses sin regla de menopausia confirmada por
  el medico. Los registros historicos no se reinterpretan en masa.
- La alerta de seguridad se calcula con el mismo reporte normalizado que se envia.
- El manifiesto de adjuntos usado al remontar el buzon es el ultimo conocido,
  no la instantanea inicial. Un fallo parcial de verificacion deja los otros
  archivos previamente confirmados fuera del estado interminable `verificando`.
  Esto NO demuestra reparacion de los incidentes historicos en Storage.

## Catalogo y fuentes

`core/entrevista.js` es el catalogo compartido por captura, revision y lector.
Son **39 campos de anamnesis propia**, no 39 preguntas obligatorias para todas,
ni una escala psicometrica nueva o validada. Version de entrevista `1.0.0`.
Las ramas se activan por temas y conservan opciones de incertidumbre o de hablar
en consulta. Las preguntas condicionales inactivas se eliminan del envio.

| Grupo | Que agrega | Base de contraste en Obsidian |
|---|---|---|
| Motivo | Tipo de visita y prioridad personal | MP-006; checklist 71 |
| Contexto | Explicacion conocida de ausencia menstrual | Libro maestro 12 y 20 |
| Sangrado | Cambios de proteccion, impacto, tratamientos | MP-001; checklist 71 |
| Dolor | Frecuencia, impacto y respuesta al tratamiento | MP-002 |
| Ciclos | Inicio de cambios y estudios/diagnosticos previos | Libro maestro 12 |
| Climaterio | Molestia prioritaria y tratamiento previo | Libro maestro 20 y 71 |
| Urinario | Evolucion, vaciamiento y tratamientos | MP-004; Walters-Karram 09 |
| Intimidad | Malestar personal, preferencias y contexto | Libro maestro 22 |
| Mama | Estudios/biopsia y seguimiento indicado | MP-007; checklist 71 |
| Cervical | Tipo de prueba, fecha aproximada, resultado, tratamiento y plan | MP-005; libro maestro 31 |
| Vulvar | Sintomas, localizacion, recurrencia, exposicion y tratamiento | MP-003; CDC |
| Metabolico | Objetivo, evolucion, tratamiento y tolerancia | MP-007; historia metabolica del corpus |
| Piso pelvico | Bulto/presion, vaciamiento, impacto y tratamientos | Walters-Karram 09 |

Referencias locales de lectura: materiales MP-001 a MP-007 en
`05 - Consultorio/Educacion para pacientes/Materiales practicos`; libro maestro
en `01 - Conocimiento clinico/Clinicfem - Master/90 - Libro clinico maestro`;
capitulo 09 de la coleccion Walters-Karram de Uroginecologia.
La nota de auditoria integral del 2026-09-09 documenta el contraste anterior.

Contraste externo puntual con fuentes primarias:

- [CDC: sintomas vaginales](https://www.cdc.gov/std/treatment-guidelines/vaginal-discharge.htm):
  la historia orienta la evaluacion, pero no sustituye exploracion y pruebas para
  determinar la causa. Se agrega contexto de productos y tratamientos, no un
  diagnostico de infeccion por seleccionar sintomas.
- [NCI: resultados anormales de VPH/Pap](https://www.cancer.gov/types/cervical/screening/abnormal-hpv-pap-test-results):
  distinguir pruebas y recuperar antecedentes/seguimiento; el portal no asigna
  una conducta terapeutica ni interpreta patologia automaticamente.

Los materiales MP consultados conservan `uso_publico: false` y su revision
clinica pendiente. No se modificaron sus permisos ni se exportaron sus cuerpos.
Esta redaccion es una propuesta implementada localmente: debe revisarse por el
Dr. Ivan antes de publicar. El importador aprobado de Obsidian no se elude ni se
presenta este catalogo manual como notas ya aprobadas.

## Contrato y trazabilidad

El sobre sigue en version 3 (aditivo); `formularioVersion=2026.09.3`,
`autoReporte.hc.entrevistaVersion=1.0.0` y `ruteoClinico.version=4`.
La cadena es catalogo -> componente -> `autoReporte.hc` -> revision -> lector;
el registro conserva esos campos en el sobre que consume el ERP. La recepcion
real y presentacion de estos campos en el ERP NO se verificaron en este lote.
Vease `CONTRATO-PRECONSULTA.md` para IDs, tipos y compatibilidad.

Las sugerencias siguen siendo revisables por el medico. El seguimiento
longitudinal permanece en ERP. No se agregaron calculadoras cervicales o
vulvares ni nuevas indicaciones farmacologicas. Las figuras/material didactico
no se publicaron automaticamente.

## Verificacion y limites

- Suite completa `npm test`: 12 scripts pasan, incluido `tests/entrevista.mjs`.
  Los 39 son campos, no el numero de pruebas independientes.
- Build Vite y `git diff --check`: revisar evidencia del cierre en Obsidian.
- Recorrido sintetico local con cuatro temas: captura, condicional de tratamiento
  cervical, edicion desde revision, regreso directo, envio y lectura por el medico.
  El texto corregido y las respuestas nuevas llegaron al lector local.
- Anchos 320, 390, 768 y 1440 px: medicion del contenedor, controles y etiquetas.
  El input trampa esta fuera de pantalla deliberadamente; no es un desbordamiento
  visible. Se inspeccionaron capturas en navegador. No es ensayo con pacientes,
  prueba de lector de pantalla, todos los navegadores ni auditoria WCAG completa.
- Supabase desactivado expresamente en el servidor de prueba. No hay prueba de
  subida/descarga real, RLS, red interrumpida, borrado en produccion o recuperacion
  de archivos historicos. No se debe anunciar que esos problemas quedaron resueltos.

## Pendientes que impiden un cierre global

Permanecen los H02 (colision UUID no demuestra igualdad del contenido), H04
(banderas de dolor sin intensidad), parte de H05 (borrado comprobado/adjuntos
restaurados), H07-H09 (ICIQ, identidad de instrumentos propios y FSFI), parte de
H06 (motores historicos) y compatibilidad completa de H10. Sus detalles y casos
estan en la auditoria integral de Obsidian. Ninguna suite verde los invalida.

Antes de desplegar: revision clinica, resolver los bloqueadores de integridad,
prueba E2E protegida con PDF e imagen sinteticos y verificacion de recepcion en
ERP, despues PR revisado y prueba del SHA efectivamente publicado.

Reversion: cambios aislados en la rama local; no hay migraciones ni datos remotos
que revertir. Revisar el diff antes de retirar cambios, conservando trabajo ajeno.
