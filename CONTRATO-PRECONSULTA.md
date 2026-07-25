# Contrato de datos — Pre-consulta de la paciente

> El "seam" entre dos sistemas: el **portal de la paciente** (este proyecto, que
> *produce* las respuestas) y el **ERP `consultorio_erp`** (que las *consume* y las
> liga al expediente). Este documento congela la forma de los datos para que ambos
> evolucionen sin romperse. **Si cambias la forma, sube `version` y actualiza aquí.**

Estado: **versión 2** (desde formulario `2026.08`). Producido por
`paciente/PortalPaciente.jsx` (`construirRegistro`) y `core/resumenPaciente.js`.
Almacenado por `core/respuestas.js`.

La versión 2 conserva `paciente`, `autoReporte`, `resumen`, `estudiosFolder` y
`ruteoClinico` para que el ERP pueda migrar gradualmente. Corrige cuatro
ambigüedades de v1: escala incompleta frente a cero real, consentimiento
auditable, hora de servidor frente a reloj del teléfono y carpeta frente a
archivos realmente recibidos.

---

## 1. Forma canónica de una respuesta

Cada envío de una paciente es **un objeto JSON** con esta forma:

```jsonc
{
  "version": 2,
  "formularioVersion": "2026.08",
  "submittedAtClient": "2026-08-01T20:10:50.000Z",
  "id": "uuid|loc_...",         // id único de la respuesta (lo asigna el almacén)
  "creado": "2026-06-23T20:11:05.123Z",  // ISO 8601 UTC, lo asigna el almacén

  "paciente": {
    "nombre":   "María González Ramírez",  // texto libre, puede ser null
    "edad":     52,                          // entero o null
    "telefono": "3312345678",                  // teléfono mexicano, 10 dígitos
    "correo":   "maria@correo.com"           // texto libre o null (opcional)
  },

  "autoReporte": {
    "mrs":   { /* síntomas de menopausia, ver §3 */ },
    "dolor": { "tiene": true, "intensidad": 6, "meses": 4 },  // ver §3
    "hc":    { /* historia clínica adaptativa, ver §3 */ },
    "profundos": { /* instrumentos dirigidos opcionales, ver §3 */ }
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
    "version": 2,
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

`id` y `creado` viven en la fila del almacén, no dentro de `contenido`. El lector
los mezcla en el objeto al mostrarlo en el panel. En modo local se generan en el
navegador solo para desarrollo. `submittedAtClient` conserva el reloj del teléfono;
la columna `creado` de PostgreSQL es siempre la hora autoritativa de recepción.

`estudiosFolder`, `adjuntos` y `ruteoClinico` son campos opcionales.
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
`senalesUrgencia` (lista), `senalesMaternas` (lista), `semanasEmbarazo`,
`semanasPosparto`, `lactancia`, `sangradoTipos` (lista), `sangradoAhora`,
`sangradoDuracionDias`, `sangradoDesde`, `diasEntreReglas`,
`cambiosAndrogenicos` (lista), `sintomasUrinarios` (lista),
`molestiasIntimas` (lista), `sintomasMama` (lista), `objetivoReproductivo`,
`antecedentesSeleccionados` (lista), `tabacoEstado`, `tieneCuelloUterino`,
`ultimoPapFecha`, `ultimoPapResultado`, `ultimaMastografiaFecha`,
`ultimaMastografiaResultado`, `cancerFamiliarTipos` (lista) y
`cancerFamiliarDetalle`.

Las opciones explícitas `ninguna`, `no_se`, `no_aplica` y `prefiero_no` son datos;
una clave ausente sigue significando **no contestada**, no “No”.

> Nota: `hc` también lleva `telefono` y `correo` cuando se capturan; la fuente
> autoritativa de contacto es `paciente.telefono` / `paciente.correo`.

### `profundos` — módulos dirigidos opcionales

Objeto cuyas claves son los módulos que realmente seguían activos al enviar
(`incontinencia`, `genitourinario`, `salud-sexual`, `dolor` o `sop`). El portal
elimina las respuestas de un módulo si la paciente desmarca el tema que lo abrió.
`resumen.profundizaciones` congela su lectura orientativa para que el ERP no tenga
que recalcular con reglas futuras.

### `ruteoClinico` — instrumentos sugeridos para revisión médica

Campo aditivo producido por `core/ruteoClinico.js`. El motor es puro: no usa reloj
ni estado; `generadoEn` lo agrega `PortalPaciente.jsx` al construir el registro.

- `instrumentosSugeridos`: lista ya ordenada por prioridad. Cada elemento trae
  `instrumento`, `nombre`, `prioridad`, `motivo`, `fuente`, `precarga` y
  `accionSugerida`.
- `banderas`: alertas para revisión médica. No se borran solas; el ERP debe permitir
  marcarlas como revisadas o descartadas por el médico.
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
- `version` es entero. Hoy = **2**.
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
