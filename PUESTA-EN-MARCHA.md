# Puesta en marcha — de punta a punta

Esta es la guía única y ordenada para dejar todo funcionando:

> La paciente responde desde casa → su respuesta llega a la base de datos →
> te llega un correo de aviso → la ves en tu sistema (el expediente), ligada a
> la paciente.

Hay dos piezas, independientes y conectadas solo por la base de datos:

- **Portal** (lo que ve la paciente): React + Supabase, se sube a **Vercel**.
  Su guía detallada es [`DESPLIEGUE.md`](DESPLIEGUE.md).
- **Sistema / expediente** (lo que usas tú): tu Django en **Render**, con una app
  nueva y aislada `preconsultas` que jala las respuestas. Su detalle está en el
  PR `feature/preconsultas-portal` del repositorio `consultorio_erp2` y en su
  `preconsultas/README.md`.

Lo que tú haces se limita a **crear cuentas y pegar claves** (un asistente no puede
hacer eso por ti). Todo lo demás —código, configuración, pruebas— ya está hecho.

---

## Lo que ya quedó listo

- Portal completo (captura de la paciente, panel del médico, diseño, build de
  producción verificado). `vercel.json` y `.env.example` incluidos.
- Esquema de base de datos seguro: [`supabase/schema.sql`](supabase/schema.sql).
- Función de aviso por correo: [`supabase/functions/notificar-respuesta`](supabase/functions/notificar-respuesta/index.ts),
  ya endurecida para no notificar filas vacías (anti-spam).
- Anti-robots discreto en el formulario (campo trampa invisible + tiempo mínimo de
  llenado). Sin captcha ni cuentas extra.
- App `preconsultas` en tu sistema: archiva las respuestas, las liga a la paciente
  por teléfono (con respaldo por nombre), idempotente, con botón **Sincronizar** y
  endpoint para cron. Pruebas en verde. (En el PR, pendiente de tu Merge.)
- Contrato de datos congelado: [`CONTRATO-PRECONSULTA.md`](CONTRATO-PRECONSULTA.md).

---

## Lo que tú haces, en orden (cada fase desbloquea la siguiente)

> En `DESPLIEGUE.md` las secciones están en otro orden; guíate por el **título** de
> la sección, no por su número de posición.

### Fase 1 — Base de datos (Supabase, gratis)
Sigue la sección «**2. Base de datos (Supabase)**» de [`DESPLIEGUE.md`](DESPLIEGUE.md):
crear proyecto, correr `supabase/schema.sql`, crear tu usuario médico, y copiar de
**Project Settings → API**:
- **Project URL**
- clave **anon public** (para el portal)
- clave **service_role** (para el sistema; es secreta, nunca la pongas en el portal)

### Fase 2 — Portal en línea (Vercel, gratis)
Sigue la sección «**5. Subir el sitio (Vercel)**» de [`DESPLIEGUE.md`](DESPLIEGUE.md).
Importante: **Root Directory** = la carpeta que contiene este archivo
(`extraido/codigo`). Pega las dos variables `VITE_SUPABASE_URL` y
`VITE_SUPABASE_ANON_KEY`. **Deploy**. (Estas variables se incrustan al construir el
sitio: si las cambias después, vuelve a desplegar para que surtan efecto.)
- Prueba: abre el sitio, envía una respuesta de prueba, y confirma que aparece una
  fila en la tabla `respuestas` de Supabase (Table Editor).

### Fase 3 — Avisos por correo (Resend, gratis)
Sigue la sección «**4. Avisos por correo (Resend)**» de [`DESPLIEGUE.md`](DESPLIEGUE.md):
cuenta en Resend, subir la Edge Function, definir sus secretos y crear el webhook de
Insert.
- Prueba: envía otra respuesta y confirma que te llega el correo.

### Fase 4 — El expediente consume las respuestas
1. En GitHub (`sactoovan-create/consultorio_erp2`), abre y **fusiona (Merge)** el PR
   `feature/preconsultas-portal` hacia `main`.
2. En el panel de **Render**, en el entorno del servicio, agrega:
   ```
   SUPABASE_URL=https://TU-PROYECTO.supabase.co
   SUPABASE_SERVICE_KEY=la_clave_service_role   (la secreta, NO la anon)
   SUPABASE_PRECONSULTAS_TABLE=respuestas
   ```
   Render vuelve a desplegar y corre la migración de la app.
3. Prueba: entra a tu sistema → menú **Pre-consultas** → botón **Sincronizar**.
   La respuesta de prueba debe entrar y aparecer ligada a la paciente.

### Fase 5 — Sincronización automática (cron, gratis y recomendado)
Para que las respuestas entren solas, sin pulsar **Sincronizar**:
1. Inventa una cadena secreta larga y ponla en Render como
   `PRECONSULTAS_CRON_TOKEN` (mismo panel de la Fase 4).
2. En GitHub → **Settings → Secrets and variables → Actions**, agrega dos secretos:
   `ERP_BASE_URL` (la dirección pública de tu sistema, p. ej.
   `https://consultorio-erp2.onrender.com`) y `PRECONSULTAS_CRON_TOKEN` (la misma
   cadena del paso 1).
3. Agrega el workflow del cron: GitHub → pestaña **Actions → New workflow → set up a
   workflow yourself**, pega el YAML que está en `preconsultas/README.md` (sección
   "Sincronización automática"), nómbralo `sync-preconsultas.yml` y commitea.

   Sin el token (paso 1) el endpoint queda desactivado, así que esto no expone nada
   hasta que tú lo enciendes. Alternativa de pago: un Cron Job en Render.

### Fase 6 — Endurecer y abrir al público
- El anti-robots discreto ya está activo. Si algún día aparece spam persistente,
  enciende el escalamiento de más abajo (Turnstile).
- Comparte el enlace público (`https://tu-sitio/`) por WhatsApp, en el mensaje de
  cita o en un código de barras cuadrado impreso.

---

## Prueba de punta a punta (cuando termines)
1. Abre `https://tu-sitio/` en el teléfono, llena el cuestionario como paciente y
   envía.
2. Llega el correo de aviso (Fase 3). 
3. La fila aparece en Supabase (Table Editor → `respuestas`).
4. En tu sistema, **Pre-consultas** muestra la respuesta ligada a la paciente
   (al pulsar **Sincronizar**, o sola si activaste el cron).
5. Entra al detalle: síntomas, dolor e historia que compartió.

### Verificación rápida por consola (opcional)
Hay un script que comprueba cada pieza sin abrir el navegador: el envío de la
paciente, la lectura del sistema y el endpoint del cron. No guarda secretos; los lees
de variables de entorno que exportas tú. Úsalo después de cada fase para un sí/no claro:

```
export SUPABASE_URL="https://TU-PROYECTO.supabase.co"
export SUPABASE_ANON_KEY="..."         # tras la Fase 1
export SUPABASE_SERVICE_KEY="..."      # tras la Fase 1 (opcional, para leer)
export ERP_BASE_URL="https://consultorio-erp2.onrender.com"   # tras la Fase 4
export PRECONSULTAS_CRON_TOKEN="..."   # tras la Fase 5
bash verificar-en-vivo.sh
```

Deja una fila "PRUEBA - borrar" que eliminas desde el panel cuando termines.

### Secretos que tú generas (no van en ningún archivo)
- `WEBHOOK_SECRET` (Fase 3) y `PRECONSULTAS_CRON_TOKEN` (Fase 5): cadenas largas al
  azar. Genera cada una con `openssl rand -hex 24` y guárdalas en tu gestor de
  contraseñas; nunca las pongas en el código ni en un repositorio.

---

## Escalamiento anti-spam (solo si hace falta): Cloudflare Turnstile

El anti-robots actual (campo trampa + tiempo) frena bots oportunistas. Un atacante
decidido podría usar la clave pública del portal para insertar directo. Si eso
ocurre, la defensa dura es enrutar el envío por una Edge Function que verifique un
token de Cloudflare Turnstile y luego inserte con la clave de servicio, cerrando el
insert anónimo. Pasos, listos para ejecutar el día que se necesiten:

1. Crea un sitio en **Cloudflare Turnstile** (gratis): obtén *site key* y *secret key*.
2. Nueva Edge Function `enviar-respuesta` (hermana de `notificar-respuesta`) que:
   reciba `{ registro, token }`, verifique el token contra
   `https://challenges.cloudflare.com/turnstile/v0/siteverify` con la *secret key*,
   y solo entonces inserte la fila usando la `service_role` key.
3. En `supabase/schema.sql`, revoca la política `paciente_inserta` (que hoy permite
   insertar a cualquier anónimo) y re-ejecútala.
4. En el portal, cambia `guardarEnSupabase` (en `core/respuestas.js`) para llamar a
   `enviar-respuesta` con el token, en vez de insertar directo; y agrega el widget de
   Turnstile en `PreConsulta.jsx` (carga su script en `index.html`).

Mientras no haya evidencia de abuso, no se justifica: añade una cuenta externa y un
punto de falla en el camino de envío. Queda documentado como interruptor.
