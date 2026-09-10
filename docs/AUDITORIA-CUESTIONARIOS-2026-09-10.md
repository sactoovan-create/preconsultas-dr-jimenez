# Cuestionario, evidencia y precarga clínica

Fecha: 2026-09-10. Estado: **implementación local; no publicada**.
Solicitud: profundizar preguntas con la biblioteca de Obsidian y referencias
internacionales, reutilizar respuestas en calculadoras e identificar áreas con color.

## Dictamen

El problema no era solo falta de preguntas. Había pérdida de información entre
captura y herramientas, datos ausentes interpretados como negativos, inferencias
por edad y adaptaciones locales presentadas como instrumentos validados.
La solución combina entrevista dirigida, equivalencias explícitas, procedencia
y revisión médica. No convierte un cuestionario en diagnóstico automático.

No hay un cuestionario único que sea el más aceptado para toda la ginecología.
Es necesario distinguir anamnesis, medidas de síntomas/calidad de vida,
clasificaciones médicas y modelos de riesgo. Una traducción propia o seis
preguntas inspiradas en una escala no heredan su validación ni su punto de corte.

## Alcance de la revisión

Se inventariaron 3,734 notas Markdown de la bóveda. La búsqueda programática en
3,167 notas clínicas vigentes (excluyendo versiones sustituidas) encontró 729
con términos de cuestionarios, anamnesis o instrumentos. Después se leyeron
las notas pertinentes. **No equivale a lectura manual completa de 3,167 notas**,
ni a revisión sistemática de toda la literatura. No se exportaron cuerpos de
notas, expedientes ni credenciales a la aplicación.

Fuentes internas especialmente relevantes: checklists del libro maestro (71),
amenorrea/hiperandrogenismo (12), transición menopáusica (20), sexología (22),
tamizaje cervical (31), sangrado (52), anamnesis de endometriosis M01-T10,
evaluación de piso pélvico Walters-Karram capítulo 09 y materiales MP-001 a
MP-007. Las notas MP con aprobación pendiente siguen sin autorización pública;
no se cambiaron sus sellos.

`INVENTARIO-PREGUNTAS-2026-09.json` enumera la captura base, los 11 reactivos MRS,
los 75 campos de entrevista dirigida y las preguntas complementarias existentes.
Se regenera con `node scripts/inventario-preguntas.mjs`. Contiene IDs, texto,
controles, fuentes y condiciones; no contiene respuestas de pacientes.

## Matriz de evidencia y decisiones

| Área | Referencia reconocida | Decisión aplicada y límite |
|---|---|---|
| Motivo/prioridad | Checklists 71 y MP-006 | Distinguir primera valoración, seguimiento, resultados y prevención; registrar lo que quiere resolver. No sustituye entrevista abierta. |
| Climaterio | [MRS, centro desarrollador](https://zeg-berlin.de/expertise/diagnostics-tools/menopause-rating-scale/mrs-outcome-measure/); MENQOL como alternativa de calidad de vida | Conservar 11 dominios, no sumar faltantes como cero. Confirmar causa de ausencia menstrual. El texto del portal está adaptado: queda pendiente cotejo ítem por ítem de versión española oficial y periodo de recuerdo. No afirmar equivalencia psicométrica. |
| Escapes urinarios | [ICIQ-UI SF](https://iciq.net/iciq-ui-sf), [condiciones de licencia](https://iciq.net/licences) | Frecuencia, cantidad, repercusión, patrón y vaciamiento separados. Se conserva índice descriptivo local, sin acreditar aplicación oficial. Solicitar/verificar versión y permiso antes de denominarlo ICIQ validado. |
| Piso pélvico | [Comparación de cuestionarios AUGS](https://www.augs.org/wp-content/uploads/2025/06/AUGS-URPS-Questionnaires.pdf): PFDI-20/PFIQ-7 y subescalas | Bulto, presión, maniobras para vaciar, evolución e impacto. No aplicar a todas una batería larga ni inferir POP-Q. Medidas oficiales para seguimiento, después de verificar derechos y versión. |
| Dolor/endometriosis | [ESHRE](https://academic.oup.com/hropen/article/2022/2/hoac009/6537540); [EHP-30/EHP-5, Oxford](https://innovation.ox.ac.uk/licence-details/endometriosis-health-profile-ehp) | Añadir relación con ciclo, penetración profunda, evacuación/orina, movimiento, alivio, tratamientos e interferencia. Retirar total local /40 presentado como ENDOPAIN. EHP mide impacto, no diagnostica; no se copió formulario sujeto a licencia. |
| Sangrado | [NICE NG88](https://www.nice.org.uk/guidance/ng88/chapter/Recommendations), libro maestro 52 | Intervalo y duración, cambios de protección, repercusión y sangrado en otros sitios. No traducir cantidad de toallas a PBAC o mililitros ni deducir PALM-COEIN sin evaluación. |
| Ciclos/hiperandrogenismo | [Guía internacional, Monash](https://www.monash.edu/medicine/mchri/pcos/guideline) | Conteo anual y ciclos >90 días, inicio de cambios y estudios previos. Acné no se convierte en criterio de hiperandrogenismo; no inventar Ferriman-Gallwey. La entrevista de impacto no es PCOSQ puntuado. |
| Sexualidad | [FSFI, formulario de referencia NIDDK](https://repository.niddk.nih.gov/media/studies/mapp_ep/Forms/MAPP_FSFI_v1.0.20090801.pdf), capítulo 22 | Preguntar con permiso, por malestar y contexto. La adaptación breve no aplica corte FSFI-6. Sin actividad no equivale a disfunción. Pendiente elegir versión autorizada si se necesita seguimiento formal. |
| Salud íntima | [Consenso COMMA](https://pubmed.ncbi.nlm.nih.gov/38743907/), capítulo 22 | Síntoma más molesto, impacto y tratamientos; no atribuir una mezcla de ítems a DIVA/VSQ. No diagnosticar SGM por molestias urinarias/sexuales inespecíficas. |
| Mama | [BCRAT/NCI y alcance](https://bcrisktool.cancer.gov/about.html) | Precisar parentesco, edad al diagnóstico, ovario, familiares varones y genética conocida. La herramienta actual no calcula Tyrer-Cuzick ni BCRAT: no se fabrica riesgo porcentual. |
| Ósea | [FRAX](https://www.fraxplus.org/calculation-tool) | Nuevo recorrido de fracturas, mecanismo, sitio, progenitores, caídas, corticoides y densitometría disponible. No inventar BMD/T-score/FRAX ni usar solo duración de corticoide sin dosis para un criterio. |
| Cardiometabólica | [AHA PREVENT](https://professional.heart.org/en/guidelines-and-statements/about-prevent-calculator) | Precargar tabaco, diabetes y tratamientos declarados. Falta presión, IMC, lípidos y función renal comprobados. PREVENT requiere revisar elegibilidad; antecedentes de ECV no son prevención primaria. No es un lector de PDFs. |
| Anticoncepción | [CDC U.S. MEC 2024](https://www.cdc.gov/mmwr/volumes/73/rr/rr7304a1.htm) | Preferencias y experiencias, tabaco/cantidad y antecedentes precisos. No adivinar control de hipertensión o actividad de cáncer. Si falta cantidad de tabaco, no asumir consumo bajo. El motor existente aún requiere auditoría completa de cada categoría. |
| Cuello uterino/VPH | [ASCCP](https://app.asccp.org/?name=Evaluation+of+a+colposcopic+biopsy) | Prueba, fecha, reporte, tratamiento previo y siguiente paso. La respuesta informal no equivale a resultado citológico/histológico ni dispara por sí sola una conducta ASCCP. |
| Vulva/vagina | [CDC sobre síntomas vaginales](https://www.cdc.gov/std/treatment-guidelines/vaginal-discharge.htm) | Localización, recurrencia, exposiciones y respuesta a tratamientos. No etiquetar infección por flujo/color/olor sin estudio. |

Los enlaces son fuentes para contrastar diseño clínico, no autorizaciones de
licencia ni certificaciones de esta implementación. No se obtuvieron licencias
ni se aceptaron términos ni se activaron nuevos servicios de pago.

## Equivalencias y procedencia

`core/precargaClinica.js` centraliza mapeos; `core/precarga.js` traduce el registro
al paciente compartido. Las entradas no se mutan. El contexto común conserva
demografía, antecedentes y reporte original, con origen por campo.

| Instrumento | Datos reutilizados |
|---|---|
| Menopausia | 11 valores válidos de síntomas, tabaco, hipertensión; demografía y antecedentes compartidos |
| Hemorragia | Duración, intervalo, regularidad, sangrado intermenstrual/abundante y otros sangrados; menopausia solo por causa confirmada reportada |
| Ciclos/metabolismo ovárico | Longitud del ciclo, conteo <8/año y ciclo >90 días; lo androgénico queda como contexto hasta verificar criterios |
| Dolor pélvico | Meses, intensidad, relación con ciclo, penetración, alivio vesical y movimiento |
| Endometriosis | Dispareunia profunda, síntomas intestinales/urinarios cíclicos y objetivo reproductivo explícito; no estadio ni infertilidad deducidos |
| Incontinencia | Frecuencia, cantidad convertida explícitamente de ponderación 0/2/4/6 a índice 0/1/2/3, impacto, protección, micciones/nocturia, vaciamiento |
| Mama | Cinco antecedentes familiares/genéticos estructurados; desconocido no se convierte en negativo |
| Ósea | Fractura por bajo impacto, sitio cuando aplica, progenitor, artritis y tabaco; no mediciones inventadas |
| Anticoncepción | Tabaco, cantidad cuando conocida, migraña con aura y trombosis positivas; preferencias como contexto |
| Cardiometabólico | Demografía y antecedentes compartidos, incluido tratamiento antihipertensivo y estatina |

Cada herramienta muestra respuestas importadas, fuente, transformación cuando
la hay, valor médico y contexto pertinente. **La edición médica guardada
prevalece incluso cuando es `false`, `0` o `null`**. No se rellena otra vez lo
que el médico decidió borrar. Marcar datos revisados requiere acción expresa;
el sello deja de ser vigente si cambian los valores comparados. No equivale a
firma clínica ni valida campos que no están en esa lista.

Si un dato existe como texto libre y no tiene equivalencia exacta, se muestra
como contexto; no se pierde, pero tampoco se convierte silenciosamente en una
entrada numérica. Las respuestas antiguas permanecen intactas y conservan su
ruteo congelado; no se migró producción ni se recalcularon resúmenes guardados.

## Experiencia

75 campos dirigidos en 16 grupos, 36 más que la entrevista local anterior.
Preguntas adicionales opcionales y condicionales, con desconocido/preferencia
de hablar en consulta. Ruta nueva ósea; sin atención prenatal o seguimiento
obstétrico. Estudios siguen en el último paso antes de enviar.

Once áreas cromáticas con texto e icono: salud hormonal, ciclos, dolor,
sangrado, vejiga, mama, cardio, ósea, intimidad, prevención y general. No usar
solo color para comunicar. Contraste de texto/fondo de esos tokens comprobado
automáticamente >=4.5:1; no es certificación WCAG de la aplicación entera.

## Verificación local

- `npm test`: pasan los 17 scripts, incluidos 87 controles nuevos de precarga,
  equivalencias, faltantes, cambios médicos, identidad de escalas y contraste.
- `npm run questions:check`: inventario reproducible de 49 controles base,
  11 reactivos MRS, 75 campos dirigidos y 38 preguntas complementarias. No cuenta
  consentimiento, controles de navegación ni implica preguntar todo a cada paciente.
- `npm run test:precarga`: 100 comprobaciones en Chrome/Playwright, cero errores
  React/JS. Precarga en los diez instrumentos, correcciones `0`/`false`/`null`,
  guardar/recargar, aislamiento entre pacientes y revisión explícita.
- Regresiones de navegador: panel 61 + errores 14 + autenticación simulada 57;
  contexto 60 + modo local 9. Junto a precarga: 301 comprobaciones en esta tanda.
- Diez instrumentos y seis etapas del formulario comprobados a 320/390/768/1440 px,
  sin desbordamiento horizontal de documento. Capturas inspeccionadas. Esto no
  sustituye prueba con pacientes ni auditoría de accesibilidad completa.
- Prueba de envío desde el portal real en modo local: consentimiento y decisión
  explícita sin archivos; conserva versiones y datos nuevos, limpia ramas retiradas
  y avisa que no envió al consultorio. No es prueba de recepción en Supabase.
- Corregido durante QA: la nueva etapa ósea caía en el contenido por defecto de
  envío. Ahora ese contenido solo existe en `envio`, después de la revisión.
- Build exitoso, 1,730 módulos. Persiste advertencia por chunk dinámico `heic2any`
  de 1.35 MB; no se midieron Core Web Vitals ni se afirma optimización de carga.
- `git diff --check`: sin errores. No se alteró el árbol de trabajo original.

Evidencia sin datos reales: `../output/entrevista-evidencia-20260910/`, incluido
`precarga-browser.json` y capturas de formulario/herramientas/panel. Las pruebas
usan servicios simulados o almacenamiento local; la red externa queda bloqueada.
Las dos hojas de estilo de Google Fonts se sustituyen por CSS vacío en la prueba
de envío para no confundir el bloqueo intencional con un error de la aplicación.
La carga de fuentes externas no quedó validada por esa prueba.

Para reproducir los guiones de navegador se necesita Playwright y Chrome. En esta
máquina se usó el paquete de Playwright del runtime de Codex mediante `NODE_PATH`,
sin añadir dependencias a producción. Servidor local en `127.0.0.1:5199`, con
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` vacías. No usarlo para datos reales.

## Límite de cierre

Esta entrega no certifica todas las recomendaciones farmacológicas o todos los
motores antiguos. Persisten campos médicos con valores iniciales negativos;
hay que revisar elegibilidad, completitud y vigencia por instrumento antes de
utilizar sus salidas como hoja clínica definitiva. La precarga no valida el dato.
No se probó aquí OCR, recuperación de archivos perdidos, RLS real, ERP/Huli ni
transmisión de datos nuevos a producción. Sin modificaciones SQL o cuentas.

Antes de publicar: revisión clínica del Dr. Iván de redacción/ramas, cotejo de
instrumentos oficiales y permisos, prueba de comprensión con pacientes,
validación extremo a extremo de envío/adjuntos y consumo ERP en entorno de
pruebas, PR revisado y comprobación del SHA desplegado. No publicar esta vista
local configurada sin backend como si recibiera pacientes.

Reversión: trabajo aislado en `codex/entrevista-evidencia-precarga-20260910`
desde `c0f2034d93c66bcef82fef73de5f4c9d5f500582`, sin tocar el árbol sucio original.
Retirar el lote por revisión de diff, nunca resetear trabajo de otros agentes.
