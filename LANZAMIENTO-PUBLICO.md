# Lanzamiento público: anti-bot fuerte y remitente propio

Para usar el portal en **enlace privado / WhatsApp** no necesitas nada de esto: ya está
listo. Esta guía es para cuando lo pongas en **bio, reels o anuncios** (tráfico
público), donde conviene blindar el envío con Cloudflare Turnstile y verse profesional
con un remitente propio.

Todo el código de Turnstile ya está en el repositorio, **apagado por defecto**: el
portal se comporta exactamente igual que hoy hasta que defines la variable
`VITE_TURNSTILE_SITE_KEY`. Activarlo es la secuencia de abajo, sin tocar código.

---

## A. Cloudflare Turnstile (anti-bot fuerte)

Turnstile es gratis, sin pedirle a la paciente resolver rompecabezas (la mayoría de las
veces es invisible). El token se verifica en el servidor (la Edge Function), así que un
robot no puede saltárselo aunque tenga la clave pública.

**Orden exacto del corte (importante, para no romper los envíos):**

1. **Crea el sitio en Cloudflare Turnstile** (panel de Cloudflare → Turnstile → Add
   site). Te da dos claves: *Site Key* (pública) y *Secret Key* (secreta).
2. **Despliega la Edge Function** nueva:
   ```
   supabase functions deploy enviar-respuesta
   ```
   Su código está en `supabase/functions/enviar-respuesta/index.ts`.
3. **Pon el secreto** en la función: Edge Functions → `enviar-respuesta` → Secrets →
   `TURNSTILE_SECRET` = la *Secret Key* de Cloudflare. (`SUPABASE_URL` y
   `SUPABASE_SERVICE_ROLE_KEY` ya las inyecta Supabase.)
4. **Activa el portal**: en Vercel → Environment Variables, agrega
   `VITE_TURNSTILE_SITE_KEY` = la *Site Key* pública, y **vuelve a desplegar**.
5. **Verifica**: abre el portal, envía una respuesta de prueba. Ahora aparece el widget
   de Turnstile y el envío pasa por la función. Confirma que la fila entra en Supabase y
   que te llega el correo.
6. **Cierra el insert anónimo directo** (último paso, ya verificado el anterior): corre
   en el SQL Editor de Supabase el contenido de `supabase/schema-turnstile.sql`. A partir
   de aquí, solo la Edge Function puede insertar.

Para **revertir**, quita `VITE_TURNSTILE_SITE_KEY` de Vercel (re-despliega) y vuelve a
crear la política `paciente_inserta` (instrucción al final de `schema-turnstile.sql`).

> Mientras `VITE_TURNSTILE_SITE_KEY` no exista, el portal sigue con el envío directo +
> el anti-bot discreto (campo trampa + tiempo) que ya tiene. Cero cambios para la
> paciente.

---

## B. Remitente propio en Resend (verse profesional)

Hoy el aviso al médico sale de `onboarding@resend.dev` (válido para pruebas). Para que
salga de algo tuyo, por ejemplo `avisos@tudominio.com`:

1. En Resend → **Domains → Add Domain**, escribe tu dominio.
2. Resend te da unos registros **DNS** (TXT/CNAME para SPF, DKIM y DMARC). Agrégalos en
   donde administres tu dominio (tu proveedor de hosting/registrador).
3. Espera a que Resend marque el dominio como **Verified**.
4. En la Edge Function `notificar-respuesta` → Secrets, define `ORIGEN_CORREO` =
   `Portal de pacientes <avisos@tudominio.com>`.
5. Envía una respuesta de prueba y confirma que el correo ahora llega desde tu dominio.

Sin dominio propio, el sistema funciona igual; solo el remitente se ve menos formal.

---

## C. Antes de abrir a público masivo

- **Turnstile activado** (sección A).
- **Remitente propio** (sección B), opcional pero recomendado.
- **Revisión legal del aviso de privacidad** (`/privacidad`) con tu criterio
  profesional, por tratarse de datos de salud.
- Confirmar los datos del responsable en el aviso (domicilio, correo de contacto).
