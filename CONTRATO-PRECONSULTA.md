# Contrato de datos — Pre-consulta de la paciente

> El "seam" entre dos sistemas: el **portal de la paciente** (este proyecto, que
> *produce* las respuestas) y el **ERP `consultorio_erp`** (que las *consume* y las
> liga al expediente). Este documento congela la forma de los datos para que ambos
> evolucionen sin romperse. **Si cambias la forma, sube `version` y actualiza aquí.**

Estado: **versión 1**. Producido por `paciente/PortalPaciente.jsx` (`construirRegistro`)
y `core/resumenPaciente.js`. Almacenado por `core/respuestas.js`.

---

## 1. Forma canónica de una respuesta

Cada envío de una paciente es **un objeto JSON** con esta forma:

```jsonc
{
  "version": 1,                 // versión del contrato (entero). Día uno = 1.
  "id": "uuid|loc_...",         // id único de la respuesta (lo asigna el almacén)
  "creado": "2026-06-23T20:11:05.123Z",  // ISO 8601 UTC, lo asigna el almacén

  "paciente": {
    "nombre":   "María González Ramírez",  // texto libre, puede ser null
    "edad":     52,                          // entero o null
    "telefono": "33 1234 5678",              // texto libre, puede ser null
    "correo":   "maria@correo.com"           // texto libre o null (opcional)
  },

  "autoReporte": {
    "mrs":   { /* síntomas de menopausia, ver §3 */ },
    "dolor": { "tiene": true, "intensidad": 6, "meses": 4 },  // ver §3
    "hc":    { /* historia clínica opcional, ver §3 */ }
  },

  "resumen": {                  // derivado (scores), calculado por el portal
    "menopausia": { "total": 5, "intensidad": "leve" },       // total 0..44
    "dolor":      { "intensidad": 6, "meses": 4 }              // o null si no hay
  },

  "consentimiento": true,       // la paciente autorizó compartir (siempre true al enviar)

  "estudiosFolder": "uuid|null", // opcional (aditivo). Carpeta del buzón de estudios en
                                 // Storage; null si el buzón está apagado o no se usó.

  "ruteoClinico": {              // opcional/aditivo. Sugerencias, no diagnóstico.
    "version": 1,
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

`id` y `creado` los pone el almacén (Supabase o local), no el portal. El resto lo
arma el portal.

`estudiosFolder` y `ruteoClinico` son campos **opcionales y aditivos** (no suben
`version`): el ERP los ignora si no los conoce. `estudiosFolder` no es dato personal
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
| `creado`    | `timestamptz` | = `creado` |
| `nombre`    | `text`        | = `paciente.nombre` (para listar sin abrir el JSON) |
| `contenido` | `jsonb`       | **el objeto completo de §1** (incluye `version`, `paciente`, `autoReporte`, `resumen`, `consentimiento`) |

Seguridad por filas: el rol anónimo (la paciente) **solo INSERTA**; el médico
autenticado **lee y borra**. Tope de tamaño del `jsonb` como anti-abuso.

---

## 3. Diccionario de `autoReporte`

### `mrs` — síntomas de la Menopause Rating Scale (cada uno entero 0..4)
`mrs_bochornos`, `mrs_cardiaco`, `mrs_sueno`, `mrs_musculo`, `mrs_animo`,
`mrs_irritable`, `mrs_ansiedad`, `mrs_agotamiento`, `mrs_sexual`, `mrs_vejiga`,
`mrs_sequedad`. (0 = nada, 4 = muy intenso. Claves ausentes = no respondidas.)

### `dolor` — dolor pélvico
`tiene` (booleano), `intensidad` (0..10 o null), `meses` (entero o null).

### `hc` — historia clínica, toda **opcional** (claves ausentes = sin responder)
`motivo`, `edadMenarca`, `embarazos`, `partos`, `cesareas`, `abortos`,
`reglasRegulares` (bool), `sangrado` (bool), `anticonceptivo`, `ultimoPap`,
`cirugiasGineco`, `acne` (bool), `hirsutismo` (bool), `caidaCabello` (bool),
`enfDiabetes` (bool), `enfHipertension` (bool), `enfTiroides` (bool),
`enfCorazon` (bool), `enfCancer` (bool), `enfOtra`, `cirugias`, `fuma` (bool),
`alcohol` (bool), `medicamentos`, `alergias`, `famCancerMama` (bool),
`famCancerOvario` (bool), `famDiabetes` (bool), `famHipertension` (bool),
`famOsteoporosis` (bool), `famOtra`. (Etiquetas legibles en `Respuestas.jsx`,
mapa `HC_LABEL`.)

> Nota: `hc` también lleva `telefono` y `correo` cuando se capturan; la fuente
> autoritativa de contacto es `paciente.telefono` / `paciente.correo`.

### `ruteoClinico` — instrumentos sugeridos para revisión médica

Campo aditivo producido por `core/ruteoClinico.js`. El motor es puro: no usa reloj
ni estado; `generadoEn` lo agrega `PortalPaciente.jsx` al construir el registro.

- `instrumentosSugeridos`: lista ya ordenada por prioridad. Cada elemento trae
  `instrumento`, `nombre`, `prioridad`, `motivo`, `fuente`, `precarga` y
  `accionSugerida`.
- `banderas`: alertas para revisión médica. No se borran solas; el ERP debe permitir
  marcarlas como revisadas o descartadas por el médico.
- `instrumento` puede ser: `menopausia`, `cardiometabolico`,
  `seguimiento-metabolico`, `mama`, `osea`, `sop`, `hemorragia`,
  `dolor-pelvico`, `endometriosis`, `anticoncepcion`, `incontinencia`.
- `prioridad`: `alta`, `media`, `baja`.
- `accionSugerida`: `revisar_en_consulta`, `completar_datos`.

Estas salidas **no diagnostican** ni obligan a aplicar instrumentos. Son el punto de
partida del plan que el Dr. Iván puede aceptar, quitar o complementar manualmente.

---

## 4. Cómo lo consume el ERP

### Llave de identidad (match a `Patient`)
- **Primaria: teléfono.** Normaliza `paciente.telefono` a los **últimos 10 dígitos**
  (quita todo lo no numérico) y cruza contra `Patient.phone_number` normalizado —
  exactamente como `marketing` hace con `phone_normalized`.
- **Respaldo: nombre.** Si no hay match por teléfono, fallback por nombre
  (`paciente.nombre`), igual que el `run_matching` de marketing. Recuerda que
  `Patient.full_name` es `@property` (no se filtra en BD): cruza por `first_name`/
  `last_name` o por nombre completo en memoria.
- **Cita/consulta:** opcionalmente liga a la `Appointment` próxima del paciente
  (por fecha/hora), reusando el patrón de cruce ventas↔agenda.

### Idempotencia
- Usa `id` como **`source_response_id`** único en el ERP: si ya se importó, **salta**.
- Alternativa/extra: `row_hash` = SHA256 del `contenido` (como en `marketing.Lead`).

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
- `version` es entero. Hoy = **1**.
- **Cambios compatibles** (agregar campos opcionales): no subas la versión; el ERP
  ignora lo que no conoce.
- **Cambios incompatibles** (renombrar/quitar campos, cambiar tipos o escalas): sube
  `version` y maneja ambas en el ERP durante la transición.
- El ERP debe tolerar `version` desconocida (registrar y avisar, no romper).

## 6. Privacidad
Son datos clínicos. El portal pide consentimiento (`consentimiento`) y guarda su
fecha (`creado`). Define una **política de retención** en el ERP (la fuente final).
Antes de abrir el enlace al público, agrega protección anti-abuso al envío
(captcha tipo Cloudflare Turnstile) además del tope de tamaño ya presente.
