# Contrato de datos — Pre-consulta de la paciente

> El "seam" entre dos sistemas: el **portal de la paciente** (este proyecto, que
> *produce* las respuestas) y el **ERP `consultorio_erp`** (que las *consume* y las
> liga al expediente). Este documento congela la forma de los datos para que ambos
> evolucionen sin romperse. **Si cambias la forma, sube `version` y actualiza aquí.**

Estado: **versión 3** (formulario preparado localmente `2026.10.1`, rama
`claude/cuestionarios-dolor`; **no publicado**: requiere el visto bueno del Dr.). Producido por
`core/registroPreconsulta.js` (`construirRegistro`, módulo puro que usa el envío de
`paciente/PortalPaciente.jsx`), `core/resumenPaciente.js` y `core/cuestionarios/`
(cuestionarios validados, §3).
Almacenado por `core/respuestas.js`.

La versión 2 conserva `paciente`, `autoReporte`, `resumen`, `estudiosFolder` y
`ruteoClinico` para que el ERP pueda migrar gradualmente. Corrige cuatro
ambigüedades de v1: escala incompleta frente a cero real, consentimiento
auditable, hora de servidor frente a reloj del teléfono y carpeta frente a
archivos realmente recibidos.

La versión 3 añade `atribucion` sin cambiar los campos clínicos anteriores.
`booking_channel` identifica el canal de reserva; `acquisition_source` conserva
la evidencia automática del enlace; `patient_reported_source` guarda la respuesta
de la paciente. Desde el formulario `2026.09.2`, ambas preguntas requieren una
opción antes del envío, incluida «No recuerdo / Prefiero no responder»
(`no_recuerdo_prefiero_no_responder`). No se completan ni reescriben respuestas
históricas: un borrador sin esos campos solicitará completarlos al enviar.
Una reserva en Doctoralia o un enlace de WhatsApp no
demuestran por sí solos dónde conoció al médico. Los clics y UTM se conservan
en este objeto privado; no se envían eventos a plataformas publicitarias.
El ERP existente conserva todo el sobre en `raw_content`, sin migración.

---

## 1. Forma canónica de una respuesta

Cada envío de una paciente es **un objeto JSON** con esta forma:

```jsonc
{
  "version": 3,
  "formularioVersion": "2026.09.4",
  "atribucion": {
    "version": 1,
    "booking_channel": "whatsapp",
    "acquisition_source": "google_ads",
    "patient_reported_source": "recomendacion",
    "attribution_captured_at": "2026-09-08T10:00:00Z",
    "lead_id": "uuid-si-el-enlace-lo-incluye",
    "gclid": "identificador-del-click-si-existe"
  },
  "submittedAtClient": "2026-08-01T20:10:50.000Z",
  "id": "uuid|loc_...",         // id único estable del envío
  "creado": "2026-06-23T20:11:05.123Z",  // ISO 8601 UTC, lo asigna el almacén

  "paciente": {
    "nombre":   "María González Ramírez",  // texto libre, puede ser null
    "edad":     52,                          // entero o null
    "telefono": "3312345678",                  // teléfono mexicano, 10 dígitos
    "correo":   "maria@correo.com",          // texto libre o null (opcional)
    "domicilio": {
      "dom_calle_numero": "Av. Vallarta 1234",
      "dom_colonia":      "Americana",
      "dom_cp":           "44160",
      "dom_municipio":    "Guadalajara",
      "dom_estado":       "Jalisco"
    }
  },

  "autoReporte": {
    "mrs":   { /* síntomas de menopausia, ver §3 */ },
    "dolor": { "tiene": true, "intensidad": 6, "meses": 4 },  // ver §3
    "hc":    { /* historia clínica adaptativa, ver §3 */ },
    "profundos": { /* instrumentos dirigidos opcionales, ver §3 */ },
    // Desde 2026.10.1 (§3, «Cuestionarios validados»):
    "phq9": { "version": 1, "respuestas": { "item1": 1, "item9": 0, "dificultad": 1 } },
    "csi":  { "version": 1, "respuestas": { "a1": 2, "a25": 3, "b3": "si", "b3_anio": 2019 } }
  },

  "resumen": {
    "menopausia": {
      "total": 5, "intensidad": "leve",
      "completa": true, "respondidos": 11
    },
    "dolor":      { "intensidad": 6, "meses": 4 },             // o null si no hay
    "profundizaciones": [
      {
        "id": "incontinencia",
        "instrumento": "ICIQ-SF",
        "completo": true,
        "resumen": "ICIQ-SF 8 de 21 (moderada)."
      }
    ]
  },

  "consentimiento": {
    "aceptado": true,
    "aceptadoEnCliente": "2026-08-01T20:10:50.000Z",
    "avisoVersion": "2026-07",
    "finalidades": ["atencion-clinica"]
  },

  "alertaSeguridad": {
    "urgente": false,
    "embarazoConSintomas": false,
    "saludMental": false,
    "senales": [],
    "senalesMaternas": []
  },

  "estudiosFolder": "uuid|null",
  "adjuntos": [
    {
      "nombre": "laboratorios.pdf",
      "ruta": "uuid/archivo.pdf",
      "bytes": 345678,
      "estado": "recibido"
    }
  ],

  "ruteoClinico": {              // opcional/aditivo. Sugerencias, no diagnóstico.
    "version": 5,
    "generadoEn": "2026-06-27T00:00:00.000Z",
    "instrumentosSugeridos": [
      {
        "instrumento": "cardiometabolico",
        "nombre": "Riesgo cardiovascular-renal-metabólico",
        "prioridad": "alta",
        "motivo": "Factores cardiometabólicos: diabetes.",
        "fuente": ["antecedentes"],
        "precarga": {},
        "accionSugerida": "completar_datos"
      }
    ],
    "banderas": [
      {
        "tipo": "roja",
        "mensaje": "Sangrado posmenopáusico: descartar patología endometrial.",
        "instrumentoRelacionado": "hemorragia"
      }
    ]
  }
}
```

`id` y `creado` viven en la fila del almacén, no dentro de `contenido`. El portal
preasigna el UUID para que un reintento por corte de red conserve la misma llave;
el UUID y la carpeta se conservan junto al borrador durante cuatro horas, incluso
si la pestaña se recarga. PostgreSQL lo usa como `id` de la fila. El lector mezcla
ambos campos en el objeto al mostrarlo en el panel. `submittedAtClient` conserva
el reloj del teléfono; la columna `creado` de PostgreSQL es siempre la hora
autoritativa de recepción.

`estudiosFolder`, `adjuntos` y `ruteoClinico` son campos opcionales.
`estudiosDeclaracion` congela la elección explícita de la paciente:
`adjunto_estudios` o `no_los_tengo_ahora`. Permite distinguir una omisión real de
un formulario que todavía no preguntaba por los archivos.
`alertaSeguridad` congela la orientación mostrada a la paciente. Si `urgente` es
verdadero, la pantalla posterior al envío mantiene la indicación de no esperar
la revisión del consultorio y el ERP conserva el dato para revisión prioritaria.
`estudiosFolder` queda `null` si no terminó de subir por lo menos un archivo; el
manifiesto `adjuntos` permite distinguir una carpeta reservada de archivos
confirmados. `estudiosFolder` no es dato personal
por sí mismo, pero es una clave de capacidad que apunta a archivos clínicos privados,
así que **no debe exponerse en claro** fuera del sistema. La idempotencia del ERP
descansa en `source_response_id` (el `id`), no en el hash del contenido, así que
agregar estos campos no la afecta.

`ruteoClinico` es una **sugerencia clínica para el médico**, nunca un diagnóstico
automático ni una indicación definitiva para la paciente. El ERP debe conservar la
diferencia entre la sugerencia original del motor y la decisión médica posterior
(aceptar, quitar, agregar manualmente o marcar revisado).

---

## 2. Mapeo en Supabase (fase A)

Tabla `public.respuestas` (ver `supabase/schema.sql`):

| Columna     | Tipo          | Contenido |
|-------------|---------------|-----------|
| `id`        | `uuid`        | = `id` de la respuesta |
| `creado`    | `timestamptz` | Hora de recepción puesta por PostgreSQL (`default now()`); es la fecha autoritativa |
| `nombre`    | `text`        | = `paciente.nombre` (para listar sin abrir el JSON) |
| `contenido` | `jsonb`       | **el objeto clínico de §1 sin `id`/`creado`** (incluye `version`, `paciente`, `autoReporte`, `resumen`, `consentimiento`) |

Seguridad por filas: el rol anónimo (la paciente) **solo INSERTA**; el médico
autenticado **lee y borra**. Tope de tamaño del `jsonb` como anti-abuso.

---

## 3. Diccionario de `autoReporte`

### `mrs` — síntomas de la Menopause Rating Scale (cada uno entero 0..4)
`mrs_bochornos`, `mrs_cardiaco`, `mrs_sueno`, `mrs_musculo`, `mrs_animo`,
`mrs_irritable`, `mrs_ansiedad`, `mrs_agotamiento`, `mrs_sexual`, `mrs_vejiga`,
`mrs_sequedad`. (0 = nada, 4 = muy intenso. Claves ausentes = no respondidas.)
El portal v2 solo publica total/intensidad cuando `respondidos === 11`; una escala
vacía o parcial produce `total: null`, nunca cero.

### `dolor` — dolor pélvico
`tiene` (booleano), `intensidad` (0..10 o null), `meses` (entero o null).

### `hc` — historia clínica adaptativa
`motivo`, `edadMenarca`, `embarazos`, `partos`, `cesareas`, `abortos`,
`reglasRegulares` (bool), `sangrado` (bool), `anticonceptivo`, `ultimoPap`,
`cirugiasGineco`, `acne` (bool), `hirsutismo` (bool), `caidaCabello` (bool),
`enfDiabetes` (bool), `enfHipertension` (bool), `enfTiroides` (bool),
`enfCorazon` (bool), `enfCancer` (bool), `enfOtra`, `cirugias`, `fuma` (bool),
`alcohol` (bool), `medicamentos`, `alergias`, `famCancerMama` (bool),
`famCancerOvario` (bool), `famDiabetes` (bool), `famHipertension` (bool),
`famOsteoporosis` (bool), `famOtra`. (Etiquetas legibles en `Respuestas.jsx`,
mapa `HC_LABEL`.)

Campos estructurados de v2: `formularioVersion`, `temasConsulta` (lista),
`etapaReproductiva`, `ultimaMenstruacion`, `posibleEmbarazo`,
`senalesUrgencia` (lista), `sangradoTipos` (lista), `sangradoAhora`,
`sangradoDuracionDias`, `sangradoDesde`, `diasEntreReglas`,
`cambiosAndrogenicos` (lista), `sintomasUrinarios` (lista),
`molestiasIntimas` (lista), `sintomasMama` (lista), `objetivoReproductivo`,
`antecedentesSeleccionados` (lista), `tabacoEstado`, `tieneCuelloUterino`,
`ultimoPapFecha`, `ultimoPapResultado`, `ultimaMastografiaFecha`,
`ultimaMastografiaResultado`, `cancerFamiliarTipos` (lista) y
`cancerFamiliarDetalle`.

Desde `2026.08.1` el portal no ofrece atención de embarazo o posparto: retiró ese
motivo, sus etapas y sus preguntas dirigidas. Conserva únicamente
`posibleEmbarazo` como filtro mínimo de seguridad ginecológica. Los campos
`senalesMaternas`, `semanasEmbarazo`, `semanasPosparto` y `lactancia` pueden
existir en respuestas históricas; los envíos nuevos los limpian y el ERP debe
tratarlos como datos heredados de solo lectura.

Las opciones explícitas `ninguna`, `no_se`, `no_aplica` y `prefiero_no` son datos;
una clave ausente sigue significando **no contestada**, no “No”.

### Ampliación local `2026.09.3`: entrevista dirigida

No cambia el sobre v3. `autoReporte.hc.entrevistaVersion` vale `1.0.0`.
El catálogo exacto, etiquetas y opciones viven en `core/entrevista.js`;
captura, revisión y lector usan esos mismos IDs, sin interpretar el texto libre.
Fuentes, alcance y pendientes en `docs/ENTREVISTA-2026-09.md`.

| Módulo | Campos en `hc` |
|---|---|
| Motivo | `consultaTipo`, `consultaPrioridad` |
| Contexto | `causaAusenciaRegla` |
| Sangrado | `sangradoCambios[]`, `sangradoImpacto`, `sangradoTratamientos` |
| Dolor | `dolorFrecuencia`, `dolorImpacto`, `dolorTratamientos` |
| Ciclos | `ciclosInicio`, `ciclosDiagnostico` |
| Climaterio | `climaterioPrioridad`, `climaterioTratamientos` |
| Urinario | `urinarioDesde`, `urinarioVaciado[]`, `urinarioTratamientos` |
| Intimidad | `intimidadImpacto`, `intimidadContexto` |
| Mama | `mamaEstudios` |
| Cervical | `cervicalPruebas[]`, `cervicalFecha`, `cervicalResultado`, `cervicalTratamientoPrevio`, `cervicalTratamientoDetalle`, `cervicalSeguimiento` |
| Vulvar | `vulvarSintomas[]`, `vulvarDesde`, `vulvarRepite`, `vulvarUbicacion`, `vulvarExposicion`, `vulvarTratamientos` |
| Metabólico | `metabolicoObjetivos[]`, `metabolicoEvolucion`, `metabolicoTratamiento`, `metabolicoTolerancia` |
| Piso pélvico | `pisoSintomas[]`, `pisoDesde`, `pisoImpacto`, `pisoTratamientos` |

`[]` indica array de IDs, no parte del nombre de la clave. Los demás campos son
cadenas: texto libre o un ID de las opciones enumeradas por el catálogo. No son
diagnósticos. Ausente/vacío no equivale a negativo ni a escala completa.
Los campos de ramas desmarcadas o condicionales ocultas no se envían.
`cervicalTratamientoDetalle` solo se envía con `cervicalTratamientoPrevio=si`.

Se añaden temas `cervical`, `vulvar`, `piso-pelvico`; `metabolico` ya existía y
ahora tiene entrevista propia. `etapaReproductiva=sin_regla_12m` registra tiempo
sin menstruación, no menopausia confirmada. `causaAusenciaRegla` admite
`menopausia_confirmada`, `hormonas`, `cirugia`, `en_estudio`, `no_se`, `no_aplica`.
El valor histórico `menopausia` se conserva para lectura; no se migran respuestas.
Al retomar un borrador, ese ID antiguo se convierte a `sin_regla_12m` y se ofrece
la pregunta sobre causa, sin modificar el registro original ya enviado.
En el código actual tampoco se pregunta `posibleEmbarazo`: la descripción previa
de `2026.08.1` es histórica; los envíos actuales la dejan en null.

`cervicalFecha`, `ultimoPapFecha` y `ultimaMastografiaFecha` permiten texto de mes
y año aproximados; el consumidor no debe asumir ISO ni fabricar un día. Las
fechas ISO históricas siguen siendo cadenas válidas. No se modifican fechas de
citas ni `ultimaMenstruacion`.

El ruteo nuevo tiene versión **4**: conserva la sugerencia guardada en registros
previos y solo calcula cuando falta. La solicitud metabólica puede sugerir
valoración, y `metabolicoTratamiento` complementa `medicamentos` para reconocer
tratamientos reportados. No hay persistencia longitudinal nueva en el portal.

> Nota: `hc` también lleva `telefono` y `correo` cuando se capturan; la fuente
> autoritativa de contacto es `paciente.telefono` / `paciente.correo`.

### `profundos` — módulos dirigidos opcionales

Objeto cuyas claves son los módulos que realmente seguían activos al enviar
(`incontinencia`, `genitourinario`, `salud-sexual`, `dolor-pelvico` o `sop`). El portal
elimina las respuestas de un módulo si la paciente desmarca el tema que lo abrió.
`resumen.profundizaciones` congela su lectura orientativa para que el ERP no tenga
que recalcular con reglas futuras.

### Cuestionarios validados (formulario `2026.10.1`, no publicado)

Decisión del Dr. del 19/10/2026. Cambio **aditivo**: el sobre sigue en `version: 3`;
`formularioVersion` sube a `2026.10.1` y `ruteoClinico.version` a **6**. Puntajes e
interpretaciones solo con las reglas publicadas de cada versión validada (sin modelos
ni inteligencia artificial). Código: `core/cuestionarios/` (motores puros, pruebas en
`tests/cuestionarios.mjs`). Licencias, fuentes y pendientes del Dr.:
`docs/CUESTIONARIOS-VALIDADOS-2026-10.md`.

**Cuándo se ofrecen.** `phq9`: siempre. `csi`: solo con dolor pélvico, con el mismo
criterio que el ruteo de dolor pélvico y endometriosis (`hc.temasConsulta` incluye
`dolor` o `dolor.tiene === true`). Un cuestionario ofrecido **viaja aunque esté vacío**
(`respuestas: {}`); uno no ofrecido **no tiene clave**. Los registros anteriores a
`2026.10.1` no tienen estas claves: para ellos no existe PHQ-9 (no es «sin dato»).
Si la paciente desmarca el tema que abrió el CSI, sus respuestas se descartan.

**Forma.** `autoReporte.<clave> = { version, respuestas: { <reactivo>: valor } }`.
Claves ausentes = no contestadas (nunca se rellenan con cero).

| Clave | Reactivo | Valores | Puntúa |
|---|---|---|---|
| `phq9` | `item1` … `item9` | entero 0..3 (Para nada, Varios días, Más de la mitad de los días, Casi todos los días) | sí, total 0..27 |
| `phq9` | `dificultad` | entero 0..3 (Para nada difícil … Extremadamente difícil) | no |
| `csi` | `a1` … `a25` (Parte A) | entero 0..4 (Nunca, Pocas Veces, Algunas veces, Continuamente, Siempre) | sí, total 0..100 |
| `csi` | `b1` … `b10` (Parte B) | `"si"` / `"no"` | no |
| `csi` | `b1_anio` … `b10_anio` | entero 1900..año actual; solo existe con `"si"` | no |

**Estas llaves son el contrato** (revisión del 19/10/2026). El ERP no las cambia: las
traduce en una sola función (`instrumentos/contrato_portal.py`,
`normalizar_respuestas_portal`): `itemN` → `"N"`, `aN` → `"N"`, `"si"`/`"no"` → `1`/`0`;
`dificultad` y `bN_anio` pasan igual. Antes de esa traducción el ERP buscaba `"1"…"9"` y
todo PHQ-9 del portal le llegaba como «sin dato de seguridad», aun con el ítem 9 en 3.

**Prueba del contrato.** `tests/fixtures/contrato-cuestionarios.json` trae registros
completos armados con `construirRegistro` (ítem 9 = 0, 1, 2 con CSI, 3, sin respuesta y
total 24 con ítem 9 = 0), lo que el ERP debe concluir de cada uno (`esperadoErp`) y los
textos del PHQ-9 y del CSI-Sp. Lo genera `node scripts/contrato-cuestionarios.mjs`;
`npm test` falla si quedó desactualizado. El ERP guarda una copia idéntica en
`instrumentos/tests/fixtures/contrato_portal_cuestionarios.json` y prueba con ella su
lectura, sus alertas y que su PHQ-9 tenga el mismo texto. **Si cambia el contrato:**
regenerar, copiar el archivo al ERP y correr las dos suites. `npm run test:cuestionarios`
(navegador) comprueba además que lo que guarda el navegador es igual a ese archivo.

**Lectura congelada en `resumen`** (el ERP la muestra sin recalcular; si recalcula,
con las mismas reglas):

- `resumen.phq9`: `instrumento: "PHQ-9"`, `version`, `validado: true`, `completo`,
  `respondidos`, `total` (0..27 o `null` si falta algún reactivo 1-9), `severidad`
  (`minima` 0-4, `leve` 5-9, `moderada` 10-14, `moderadamente_grave` 15-19, `grave`
  20-27; Kroenke 2001) y `severidadEtiqueta`, `item9`, `dificultad`,
  `dificultadEtiqueta`, `seguridad` (`item9`, `positivo`, `alerta`, `sinDatoItem9`,
  `prioridad`, `motivos`; mismas reglas que `alertaSeguridad.phq9`),
  `fuenteCortes` y `resumen` (texto para el médico).
- `resumen.csi`: `instrumento: "CSI-Sp"`, `version`, `validado: true`, `completo`,
  `respondidos`, `total` (0..100 o `null` sin los 25), `nivel` (`subclinico` 0-29,
  `leve` 30-39, `moderado` 40-49, `grave` 50-59, `extremo` 60-100; Neblett 2017) y
  `nivelEtiqueta`, `sobreCorte40` (Neblett 2013; `null` si incompleto), `parteB`
  (lista `{ id, diagnostico, anio }` de los marcados «sí»), `parteBRespondidos`,
  `fuenteCortes` y `resumen`. **Los cortes del CSI vienen de la versión original en
  inglés**; el CSI-Sp solo publicó la media normativa 24.6 ± 12.0. Mostrarlo así.
- Ambos son tamizaje, no diagnóstico. La paciente nunca ve puntajes ni etiquetas.

**Seguridad del PHQ-9 (regla fija).** `alertaSeguridad.phq9` existe cuando se ofreció:

```jsonc
"alertaSeguridad": {
  "urgente": false, "embarazoConSintomas": false, "senales": [], "senalesMaternas": [],
  "saludMental": true,                // true si phq9.alerta
  "phq9": {
    "version": 1,
    "item9": 2,                       // 0..3 o null si no contestó
    "positivo": true,                 // item9 > 0
    "alerta": true,                   // item9 > 0 o total >= 20
    "sinDatoItem9": false,            // ofrecido y sin respuesta en el ítem 9
    "prioridad": "maxima",            // "maxima" (ítem 9 = 2-3 o total >= 20) | "alta" (ítem 9 = 1) | "revisar" (sin dato) | null
    "motivos": ["item9_positivo"],    // y/o "total_grave"
    "total": 6,                       // total del PHQ-9 o null
    "mensaje": "PHQ-9 ítem 9 = 2 (pensamientos de muerte o de lastimarse): contactar a la paciente el mismo día hábil y hacer una evaluación breve de seguridad."
  }
}
```

La misma regla agrega, **al inicio** de `ruteoClinico.banderas`, una bandera con el
mismo `mensaje` y un campo nuevo `codigo`: `tipo: "roja"` con `codigo:
"phq9_item9_positivo"` o `"phq9_total_grave"`; `tipo: "aviso"` con `codigo:
"phq9_sin_dato_item9"`. `instrumentoRelacionado: "phq9"`. El ERP usa
`alertaSeguridad.phq9` y estos `codigo` como segunda línea de defensa: si por cualquier
razón no puede leer las respuestas, la alerta nace igual (solo sube la gravedad, nunca
la baja; el puntaje lo sigue calculando su motor). El ERP actual ya lista las
banderas como pendientes hasta marcarlas revisadas. Para el ERP: alerta roja arriba en
agenda, expediente y panel Instrumentos; no cerrarla sin registrar quién contactó,
cuándo, qué evaluación se hizo y qué plan se acordó; en modo recepción solo «alerta
clínica para el Dr.», sin contenido. El portal muestra a la paciente, en cuanto marca
un ítem 9 > 0, recursos de crisis (911 y Línea de la Vida 800 911 2000, 24 horas) y que
su médico será avisado, sin prometer revisión en tiempo real; nunca bloquea el envío.

**Pendientes de licencia o registro.** `pcs`, `bpi_sf`, `gsrs` e `iciq_ui_sf` están
reservados: hoy **no se emiten**. `core/cuestionarios/pendientes.js` guarda solo la
estructura (sin texto) y el motor de puntaje. Llaves reservadas (el ERP ya las traduce):
`pcs` `item1`…`item13`; `gsrs` `item1`…`item15`; `bpi_sf` `q3`…`q6`, `q8`, `q9a`…`q9g`;
`iciq_ui_sf` `q3`…`q5` y `q6_1`…`q6_8` (`true` = marcada, en el orden del formulario
oficial). La entrevista urinaria local
(`profundos.incontinencia`) sigue siendo una adaptación no validada, no el ICIQ-UI SF.

### `ruteoClinico` — instrumentos sugeridos para revisión médica

Campo aditivo producido por `core/ruteoClinico.js`. El motor es puro: no usa reloj
ni estado; `generadoEn` lo agrega `PortalPaciente.jsx` al construir el registro.

- `instrumentosSugeridos`: lista ya ordenada por prioridad. Cada elemento trae
  `instrumento`, `nombre`, `prioridad`, `motivo`, `fuente`, `precarga` y
  `accionSugerida`.
- `banderas`: alertas para revisión médica. No se borran solas; el ERP debe permitir
  marcarlas como revisadas o descartadas por el médico. Desde ruteo v6 una bandera
  puede traer `codigo` (hoy solo las del PHQ-9) e `instrumentoRelacionado: "phq9"`.
- `instrumento` puede ser: `menopausia`, `cardiometabolico`, `mama`,
  `osea`, `sop`, `hemorragia`, `dolor-pelvico`, `endometriosis`,
  `anticoncepcion`, `incontinencia`.
- `prioridad`: `alta`, `media`, `baja`.
- `accionSugerida`: `revisar_en_consulta`, `completar_datos`.

Estas salidas **no diagnostican** ni obligan a aplicar instrumentos. Son el punto de
partida del plan que el Dr. Iván puede aceptar, quitar o complementar manualmente.

> El seguimiento metabólico longitudinal no se emite desde el portal. Vive en el
> expediente del ERP como fuente única de captura para evitar doble registro de
> peso, grasa, músculo y cintura.

---

## 4. Cómo lo consume el ERP

### Llave de identidad (match a `Patient`)
- **Automática: teléfono mexicano único.** Acepta diez dígitos o los prefijos
  `+52` / `+521`, guarda diez dígitos y cruza contra `Patient.phone_number`.
  Rechaza números de otros países en vez de truncarlos. Solo liga si el teléfono
  pertenece a una sola paciente y el nombre es compatible.
- **Nombre: apoyo visual, no llave automática.** Si falta teléfono, es inválido o
  está duplicado, la preconsulta queda sin asociar para revisión manual. El
  nombre por sí solo nunca adjunta información clínica a un expediente.
- **Cita/consulta:** liga por fecha/hora únicamente cuando existe un solo episodio
  plausible. Si hay dos citas activas en la ventana, no adivina: conserva la
  preconsulta en la ficha de la paciente para que el médico elija.

### Idempotencia
- Usa `id` como **`source_response_id`** único en el ERP: nunca crea un duplicado.
- `row_hash` = SHA256 de `contenido`. Si no cambió, solo escribe cuando debe
  completar `raw_content` o reconciliar una cita/consulta que apareció después.

### Modelo Django sugerido (`preconsultas.PreConsulta`)
```python
class PreConsulta(UUIDReferenceModel):
    source_response_id = models.CharField(max_length=64, unique=True)  # = id
    row_hash           = models.CharField(max_length=64, db_index=True)
    contract_version   = models.PositiveSmallIntegerField(default=1)    # = version
    submitted_at       = models.DateTimeField()                         # = creado
    patient            = models.ForeignKey("patients.Patient", null=True, ...)
    appointment        = models.ForeignKey("encounters.Appointment", null=True, ...)
    encounter          = models.ForeignKey("encounters.Encounter", null=True, ...)
    contact_name       = models.CharField(max_length=200, blank=True)   # paciente.nombre
    contact_phone      = models.CharField(max_length=40, blank=True)    # paciente.telefono
    payload            = models.JSONField()   # autoReporte (respuestas crudas)
    scores             = models.JSONField()   # resumen (totales/intensidades)
    routing            = models.JSONField()   # sugerencia clínica original
    raw_content        = models.JSONField()   # sobre completo, sin pérdida
    studies_folder     = models.CharField(max_length=160, blank=True)
    consent            = models.BooleanField(default=False)             # consentimiento
```

### Comando de jalón (fase A): `sync_preconsultas`
Igual en espíritu a `sync_huli_appointments`: lee de Supabase (REST + service key en
el env del ERP), por cada respuesta nueva crea/actualiza `PreConsulta`, matchea a
`Patient` y liga `Appointment`. Botón "Sincronizar pre-consultas". El portal **nunca**
escribe en tu Postgres.

### Dónde mostrarla
Ficha de `Patient`, la `Appointment` y el `Encounter`, para que llegue **antes/durante**
la consulta.

---

## 5. Política de versión

### Ampliación local 2026.10.1 (no publicada)

- Sobre v3 conservado; `formularioVersion=2026.10.1`; `ruteoClinico.version=6`.
- Campos opcionales nuevos: `autoReporte.phq9`, `autoReporte.csi`, `resumen.phq9`,
  `resumen.csi`, `alertaSeguridad.phq9` y `banderas[].codigo` (§3, «Cuestionarios
  validados»). `alertaSeguridad.saludMental` ya existía y ahora puede valer `true`.
- Marcadores públicos `public/version-preconsulta.json` y `version-panel.json`
  actualizados para la verificación posterior al despliegue que el Dr. autorice.
- Sin migración SQL ni cambios en Supabase; el tope de 60 000 caracteres del `jsonb`
  sobra (PHQ-9 + CSI completos suman menos de 1 KB).

### Ampliación local 2026.09.4 (no publicada)

- Sobre v3 conservado; `autoReporte.hc.entrevistaVersion=2.0.0`,
  `formularioVersion=2026.09.4`, ruteo v5. La sección 2026.09.3 anterior es historial.
- 36 campos opcionales nuevos, tipos y opciones exactos en
  `docs/INVENTARIO-PREGUNTAS-2026-09.json` y `core/entrevista.js`.
  Incluyen fracturas/caídas, antecedentes familiares mamarios específicos,
  tratamientos cardiometabólicos, patrón de dolor y conteos menstruales/urinarios.
- Binarios nuevos: `true` / `false` / `no_se` / `prefiero_no`.
  No convertir los dos últimos a `false`. Valores numéricos desconocidos:
  omitidos o `null`, nunca cero de relleno.
- `resumen.profundizaciones` contiene lecturas nuevas con `version:2` y
  `validado:false`; son descripciones locales, no aplicaciones oficiales de
  FSFI, ENDOPAIN, PCOSQ o DIVA/VSQ. FSFI local no emite total/corte positivo;
  mapa de dolor ya no emite carga global /40. Un consumidor debe leer la versión
  y no suponer un campo numérico. Los registros históricos no se reescriben.
- MRS médica parcial devuelve `total:null` y severidad pendiente. No tratar
  `null` como cero ni publicar severidad mínima por falta de respuestas.
- La precarga clínica v2 reside en trabajo médico, no cambia el autorreporte
  enviado: `paciente.procedencia.campos[]` contiene destino, valor, fuente y
  etiqueta; la transformación por instrumento se obtiene de
  `precargaInstrumento`. `datosInstrumentos[id].__revisionPrecarga` guarda
  versión, fecha y huella de datos revisados; no es firma electrónica.
- Las respuestas se leen sin mutarlas; prevalece cualquier valor médico guardado.
  No hay migración SQL ni verificación del consumidor ERP en esta tarea.

- `version` del sobre es entero. Hoy = **3**. No confundir con `ruteoClinico.version` ni las versiones de cada resumen.
- **Cambios compatibles** (agregar campos opcionales): no subas la versión; el ERP
  ignora lo que no conoce.
- **Cambios incompatibles** (renombrar/quitar campos, cambiar tipos o escalas): sube
  `version` y maneja ambas en el ERP durante la transición.
- El ERP conserva además el sobre completo en `raw_content`; una versión futura
  no debe perder campos aunque todavía no se presenten en pantalla.

### Migración v1 → v2

- Las respuestas v1 permanecen válidas y se muestran con sus campos históricos.
- `consentimiento` v1 era booleano; en v2 es objeto. El ERP acepta ambas formas.
- `resumen.menopausia.total = 0` en v1 puede provenir de una escala vacía. En v2,
  revisar `completa` y `respondidos`.
- `ruteoClinico.version` sube a 2. El ruteo guardado es inmutable; no se reescriben
  sugerencias históricas al cambiar las reglas.

## 6. Privacidad
Son datos clínicos. El portal pide consentimiento y conserva
`consentimiento.aceptadoEnCliente`; Supabase registra por separado la hora
autoritativa de recepción en `creado`. Define una **política de retención** en el
ERP (la fuente final).
Antes de abrir el enlace al público, agrega protección anti-abuso al envío
(captcha tipo Cloudflare Turnstile) además del tope de tamaño ya presente.
