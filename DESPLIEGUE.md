# Cómo poner la aplicación en línea

Aplicación de la consulta del Dr. Iván Jiménez Martínez. Es autónoma: se sube a un
hosting y queda con un enlace público.

- **Las pacientes** entran a la raíz del sitio (`/`), responden desde casa y envían.
- **Tú** entras a `/consultorio`: los instrumentos clínicos y el panel
  **Respuestas de pacientes**.

Sin configurar nada, la app ya funciona en **modo local de prueba** (las respuestas
se guardan solo en ese navegador). Para que las respuestas te lleguen de cualquier
dispositivo, por correo y a un panel privado, se conecta una base de datos. Son
cuatro pasos. Tus claves viven en el hosting; nunca en el código.

---

## 1. Probarla en tu computadora (opcional)

```
npm install
npm run dev
```

Abre `http://localhost:5188/` (portal de la paciente) y
`http://localhost:5188/consultorio` (tu área). Así está ahora mismo, en modo local.

---

## 2. Base de datos (Supabase, gratis)

1. Crea una cuenta en https://supabase.com y un proyecto nuevo (elige la región más
   cercana, por ejemplo este de Estados Unidos).
2. En el proyecto, ve a **SQL Editor → New query**, pega el contenido de
   [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**. Eso crea la tabla
   de respuestas con la seguridad correcta: la paciente solo puede **enviar**, y
   solo tú, autenticado, puedes **leer**.
3. Crea tu usuario de médico en **Authentication → Users → Add user**: tu correo y
   una contraseña. Con esos datos entrarás al panel.
4. En **Project Settings → API**, copia dos valores: **Project URL** y la clave
   **anon public**.

## 3. Conectar la app a la base de datos

Las dos claves del paso anterior se entregan a la app como variables de entorno.
Su formato está en [`.env.example`](.env.example):

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_ANONIMA_PUBLICA
```

En desarrollo: copia `.env.example` a `.env.local` y pega tus valores.
En producción: se ponen en el panel de Vercel (paso 5). En cuanto existen, la app
deja el modo local y empieza a usar la base de datos del consultorio.

## 4. Avisos por correo (Resend)

Para que te llegue un correo cada vez que una paciente responde:

1. Crea una cuenta en https://resend.com y copia tu **API key**. Para pruebas
   puedes usar el remitente `onboarding@resend.dev`; para algo formal, verifica tu
   dominio en Resend y usa un remitente tuyo (por ejemplo `avisos@tudominio.com`).
2. Sube la función de aviso a Supabase (Edge Function). Con la herramienta de
   Supabase instalada:
   ```
   supabase functions deploy notificar-respuesta
   ```
   El código está en
   [`supabase/functions/notificar-respuesta/index.ts`](supabase/functions/notificar-respuesta/index.ts).
3. En **Edge Functions → notificar-respuesta → Secrets**, define:
   `RESEND_API_KEY`, `DESTINO_CORREO` (tu correo), `WEBHOOK_SECRET` (una cadena
   secreta que inventes) y, si lo tienes, `ORIGEN_CORREO`.
4. En **Database → Webhooks → Create a new hook**: tabla `respuestas`, evento
   **Insert**, tipo **Supabase Edge Functions**, apuntando a `notificar-respuesta`.
   En las cabeceras del webhook, agrega `x-webhook-secret` con el mismo valor que
   pusiste en `WEBHOOK_SECRET`, para que solo el webhook pueda disparar el aviso.

Con esto, cada respuesta nueva dispara el correo, y el detalle completo lo ves en el
panel.

## 5. Subir el sitio (Vercel, gratis)

1. Crea una cuenta en https://vercel.com.
2. Importa el proyecto (desde un repositorio de GitHub, o subiendo esta carpeta).
   Si la carpeta del código no es la raíz del repositorio, indica en
   **Root Directory** la carpeta que contiene este `DESPLIEGUE.md`.
3. Vercel detecta Vite solo. En **Environment Variables**, agrega
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (las del paso 2).
4. **Deploy**. Al terminar te da una dirección pública, por ejemplo
   `https://dr-jimenez.vercel.app`.

El archivo [`vercel.json`](vercel.json) ya está incluido para que las rutas internas
funcionen.

---

## Cómo se usa, ya en línea

- **Comparte con tus pacientes** la dirección raíz: `https://tu-sitio/`.
  Puedes ponerla en WhatsApp, en un mensaje de cita o en un código de barras
  cuadrado impreso en el consultorio.
- **Tú entras** a `https://tu-sitio/consultorio`, inicias sesión con tu correo y
  contraseña, y ves las respuestas en **Respuestas de pacientes**.

## Privacidad

Las respuestas son datos clínicos. La app pide el consentimiento de la paciente
antes de enviar (y guarda su fecha), las claves viven en el hosting, y solo tú
(autenticado) puedes leer o borrar las respuestas. Desde el panel puedes eliminar
una respuesta de forma permanente, lo que te permite atender una solicitud de
borrado de datos de la paciente. Conserva tu contraseña segura y revisa el aviso de
privacidad con tu criterio profesional y la normativa aplicable.
