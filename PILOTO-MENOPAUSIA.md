# Contrato del Piloto Menopausia 1.0

> Especificación de integración para un solo tema —**menopausia**— de punta a punta,
> a través de las tres herramientas. Es un contrato ejecutable: fija qué toca cada
> repositorio, la forma de los datos, las reglas de privacidad y los criterios de
> aceptación, sin ambigüedad. No es código; es el molde para escribirlo.
>
> Esta versión incorpora una revisión adversarial (flujo de datos, clínico/privacidad
> y completitud). Los puntos marcados **[bloqueante]** deben resolverse antes de ir en vivo.

## 0. Decisiones a fijar antes de empezar

- **`SALUD_BASE_URL`** **[bloqueante]**: el dominio real del microsite (p. ej.
  `https://salud.draivanjimenez.com`). Es una sola cadena, fuente única, usada por el
  generador del catálogo, por la página y por el sistema. Mientras diga `tudominio`, nada enlaza.
- **Qué es "el material" que recibe la paciente**: por defecto, **la página educativa**
  (`SALUD_BASE_URL/menopausia`), no un PDF por tema. Razón: `scripts/guia.py` genera la
  guía completa, no garantiza un `guia-menopausia.pdf` aislado. El PDF por tema es opcional
  y solo si se añade un paso de extracción.

## 1. Objetivo y alcance

Cerrar el circuito completo para menopausia:

> reel o código → página educativa → portal (pre-consulta) → expediente con el tema de
> entrada → material para la paciente **después de la consulta**, que tú decides enviar.

Toca tres repos con cambios pequeños y **aislados**:
- **Biblioteca de figuras** (Python): genera un catálogo + publica los assets.
- **Portal** (React): captura el tema de origen y lo manda en el registro.
- **Expediente** (app `preconsultas`): guarda el tema, lo muestra y ofrece un botón para
  enviarle material a la paciente.

**Fuera de alcance** (a propósito): los otros 25 temas; fusionar servidores; correr el
generador Python dentro del sistema; cualquier material temático que llegue a la paciente
**antes** de la consulta.

## 2. La clave del tema (vocabulario compartido)

La palabra que une los tres repos es la **clave**. Para el piloto: `menopausia`, en
minúsculas, sin acento. Se escribe igual en los tres lados. `catalogo-recursos.json` (§3)
es la **fuente de verdad** de las claves válidas. Primera fila de una tabla que crecerá:

| clave | figura (archivo) | animación (archivo) | título mostrado |
|---|---|---|---|
| `menopausia` | `climaterio_terapia_hormonal.py` | `transicion_menopausica.py` | Climaterio y terapia hormonal de la menopausia |

El sistema **valida** el tema recibido contra esta lista (minúsculas/sin espacios). Si no
está en la lista, lo trata como "sin tema" (no inventa material).

## 3. Repo 1 — Biblioteca de figuras: catálogo + publicación

**Entregable A: `catalogo-recursos.json`**, generado por un script nuevo
(`scripts/manifest.py`) a partir de `scripts/contenido.py` (ya tiene `FIGURAS`,
`ANIMACIONES`, `ANIM_DE_FIGURA`, `ORDEN`). Forma:

```json
{
  "version": 1,
  "generado": "2026-06-24",
  "base_url": "https://SALUD_BASE_URL",
  "temas": {
    "menopausia": {
      "clave": "menopausia",
      "titulo": "Climaterio y terapia hormonal de la menopausia",
      "pagina": "https://SALUD_BASE_URL/menopausia",
      "figura_png": "https://SALUD_BASE_URL/assets/menopausia.png",
      "animacion_mp4": "https://SALUD_BASE_URL/assets/menopausia.mp4",
      "guia_pdf": null,
      "tags": ["menopausia", "climaterio", "terapia hormonal"],
      "licencia": "propia",
      "revisado": "2026-06-24"
    }
  }
}
```

**Entregable B: publicación.** El microsite ya apunta a un host estático (GitHub Pages o
Netlify). Paso explícito y verificable (va al §10):
`python scripts/manifest.py` → commit de `catalogo-recursos.json` → publicar el host
(la página, los assets y el catálogo). **Solo material genérico y no identificable** en
el host público.

**Entregable C: la página educativa** `SALUD_BASE_URL/menopausia` (la genera
`scripts/sitio.py`) lleva figura + animación + explicación y un botón **"Prepara tu
consulta"** → enlaza al portal con `?tema=menopausia` (§4).

## 4. Repo 2 — Portal: capturar el tema de origen

Cambio mínimo y aditivo en `paciente/PortalPaciente.jsx`. Ojo: `construirRegistro` es una
función de módulo (no clausura del componente), así que el tema se **pasa como argumento**:

1. Ampliar el import: `import React, { useState, useRef } from 'react'`.
2. En `PortalInterno`, leer el parámetro una sola vez (al montar):
   ```js
   const temaRef = useRef(new URLSearchParams(window.location.search).get('tema') || null);
   ```
   (Solo la clave del tema viaja en la dirección; nunca dato personal.)
3. Pasarlo al armar el registro: en `onEnviar`,
   `await guardarRespuesta(construirRegistro(datos, temaRef.current));`
4. Cambiar la firma a `construirRegistro(datos, origen)` y agregar al objeto:
   ```js
   origen: origen || null,   // p. ej. "menopausia"; null si entró directo
   ```

No cambia `core/respuestas.js` ni el esquema de Supabase: `origen` viaja dentro de
`contenido` (jsonb). Validado de punta a punta: `contenido.origen` llega intacto a
`services.py`.

## 5. Repo 3 — Expediente: guardar, mostrar y enviar

App `preconsultas` (rama `feature/preconsultas-portal`).

**Modelo** (`models.py`, `PreConsulta`): agregar
```python
topic_origin = models.CharField(max_length=64, blank=True, db_index=True)
```
y su migración (ver §10 sobre el orden en la rama del PR).

**Servicio** (`services.py`, dict `defaults` de `sync_preconsultas`): agregar
```python
"topic_origin": str(contenido.get("origen") or "").strip().lower()[:64],
```
Aditivo; no toca el cruce a `Patient` ni la idempotencia (la clave sigue siendo
`source_response_id`; `row_hash` se calcula sobre `contenido`, que ya incluye `origen`).

**Vista/plantilla** (`preconsulta_detail.html` y la fila de `preconsulta_list.html`):
- Si `topic_origin` está en la lista válida (§2), mostrar **"Tema de entrada: menopausia"**.
- **"Material sugerido"** es una **pista para ti, no un rótulo que viaja con el envío.**
  Nunca se le muestra ese título a la paciente (ver §6).
- El enlace del material se arma por convención: `SALUD_BASE_URL + "/" + topic_origin`
  (la página). No requiere que el sistema descargue el catálogo en tiempo de ejecución;
  `SALUD_BASE_URL` es una variable de entorno del sistema. (El catálogo es la fuente de
  verdad para la biblioteca y el portal; el expediente solo necesita la convención.)

**Botón "Enviar material"** (§6).

## 6. Flujo del botón "Enviar material"

Principios, todos verificables en el mecanismo:

- **Solo después de la consulta.** Nada temático llega a la paciente antes de que la veas.
  El portal y el microsite muestran educación general; el envío dirigido es post-consulta.
- **Lo inicias tú, una por una, nunca automático.** El sistema solo *prepara* el envío.
- **El mensaje a la paciente es neutro, no temático.** Texto tipo: "El Dr. Iván Jiménez
  Martínez quiere compartir contigo material para tu consulta:" + enlace. **Sin** la palabra
  del tema en el texto visible, sin nombre ni datos clínicos en la URL.

Mecanismo:
- **Vía principal — WhatsApp** (sin infraestructura nueva): el botón abre
  `https://wa.me/52<diez_dígitos>?text=<mensaje codificado>`. El teléfono sale de
  `phone_normalized` (campo **del expediente**, ya normalizado a diez dígitos por
  `normalize_phone`). Antes de armar el enlace, el sistema valida: si `phone_normalized`
  tiene exactamente 10 dígitos, antepone `52` (clave de país de México); si no, **deshabilita
  el botón de WhatsApp** y ofrece las alternativas. `wa.me` solo *abre* WhatsApp con el
  mensaje precargado: tú pulsas enviar.
- **Vía alterna — correo** (solo si el sistema ya tiene salida de correo configurada): el
  enlace al `contact_email`.
- **Último recurso** (sin teléfono válido ni correo): mostrar el enlace para copiar y pegar
  a mano. Nunca queda sin salida.

**Material personalizado (candidatura a terapia hormonal).** A tu criterio y solo tras
verla. **[bloqueante]** Cualquier material derivado del perfil de la paciente **no** se
publica en el host estático público; se sirve desde un recurso con control de acceso o
caducidad. El host público es solo para material genérico no identificable.

**Nota de privacidad operativa:** la URL de `wa.me` lleva el teléfono de la paciente, así
que queda en el historial del navegador del consultorio; ábrela en el equipo del
consultorio y no la compartas.

## 7. Privacidad y consentimiento (canal de retorno)

El consentimiento actual es unidireccional (paciente → consultorio) y el aviso de privacidad
no menciona que el consultorio le **devuelva** material por WhatsApp o correo (WhatsApp es un
servicio de un tercero, Meta). **[bloqueante para enviar material]** Antes de usar el botón:
- Ampliar la finalidad en `AVISO-DE-PRIVACIDAD.md`: "...y, cuando tu médico lo decida tras tu
  consulta, enviarte material educativo por WhatsApp o correo al contacto que diste",
  señalando que WhatsApp es un servicio de un tercero y que el envío lo inicia el médico.
- Ajustar la línea de consentimiento en `PreConsulta.jsx` para cubrir ese canal de retorno.

## 8. Cambio al contrato de datos

`origen` es un campo **opcional y aditivo** dentro de `contenido`. Las respuestas viejas
(sin `origen`) siguen válidas: el sistema lo guarda como cadena vacía. Por eso **no se sube
la versión** del contrato; se documenta el campo opcional en `CONTRATO-PRECONSULTA.md`.

## 9. Criterios de aceptación

1. Abrir `SALUD_BASE_URL/menopausia`, pulsar "Prepara tu consulta": el portal abre con
   `?tema=menopausia`.
2. Contestar y enviar: en Supabase, la fila trae `contenido.origen = "menopausia"`.
3. Sincronizar: la pre-consulta queda ligada a la paciente y muestra "Tema de entrada:
   menopausia". **Re-sincronizar no duplica y conserva `topic_origin`** (idempotencia).
4. Pulsar "Enviar material" con teléfono válido: abre WhatsApp con un mensaje **neutro**
   (sin la palabra "menopausia" visible) y el enlace correcto; **no se envía nada sin tu
   acción manual**.
5. **Teléfono inválido o ausente**: el botón de WhatsApp se deshabilita y aparece la vía de
   correo o el enlace para copiar.
6. **Sin cruce de paciente** (teléfono/nombre no matchea): la pre-consulta no queda rota; el
   tema y el material siguen visibles.
7. Una respuesta que entró **sin** `?tema` (directa): no muestra tema, el botón ofrece
   material genérico o queda neutro, y nada se rompe.

## 10. Lo que NO se hace

- No correr el generador Python en el sistema (assets estáticos + convención de enlace).
- No mostrar material temático a la paciente antes de la consulta.
- No publicar material personalizado por paciente en el host estático público.
- No fusionar React + Django + generador.
- No publicar las cuatro ilustraciones anatómicas de licencia abierta (Cancer Research UK,
  CC BY-SA 4.0) sin revisar atribución y compartir-igual. Para el piloto, preferir assets
  propios; si se usa uno abierto, llevar su crédito.
- No generalizar a los 26 temas antes de validar este.

## 11. Esfuerzo y orden de ejecución

Tres cambios pequeños, verificados por separado:
1. **Figuras** — `scripts/manifest.py`, página de menopausia, y el paso de publicación:
   `python scripts/manifest.py` → commit del catálogo → desplegar el host estático.
2. **Portal** — capturar `?tema` y agregar `origen` (cuatro líneas) + ampliar el
   consentimiento (§7) + `npm run build` y re-desplegar en Vercel.
3. **Expediente** — sobre la rama del PR `feature/preconsultas-portal`: `git rebase` para
   estar al día, agregar `topic_origin`, `makemigrations preconsultas` (revisar que la nueva
   migración quede después de la `0001` existente), mostrar el tema, el botón de WhatsApp con
   la validación de teléfono, y `SALUD_BASE_URL` como variable de entorno. Pruebas mínimas a
   sumar: sync con `origen`, sync sin `origen`, teléfono inválido (botón deshabilitado),
   idempotencia del re-sync conservando `topic_origin`.
4. **Aviso de privacidad** — actualizar `AVISO-DE-PRIVACIDAD.md` con el canal de retorno (§7).

Si el circuito aguanta y la experiencia se siente de una pieza, este documento es el molde
para repetirlo en virus del papiloma humano, dolor pélvico, endometriosis, sangrado uterino
anormal y anticoncepción.
