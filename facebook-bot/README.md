# Bot de comentarios de Facebook

Contesta en el momento los comentarios que el público deja en la página
`drjimenezginecologia`. Meta avisa a `/api/facebook-webhook` cada vez que alguien
comenta; el bot lee el comentario, redacta con Claude usando solo los datos de
[`conocimiento.js`](conocimiento.js) y publica la respuesta.

**Llega apagado.** Sin `FB_BOT_MODO` no lee ni publica nada.

## Qué hace con cada cosa

| Llega | Qué hace |
|---|---|
| Elogio o agradecimiento | Responde breve y personal, sin enlaces. |
| Costo, ubicación, horarios, cómo agendar | Responde con el dato canónico y un siguiente paso. |
| Duda general de salud | Orientación general, sin diagnosticar, e invita a consulta. |
| Alguien cuenta su caso | No repite sus datos; invita a seguir por WhatsApp o consulta. |
| Datos de alarma | Recomienda urgencias, sin precios ni venta. |
| Queja, paciente actual, desinformación, duda sin dato canónico | **No publica.** Le avisa por correo para que conteste usted. |
| Spam, insultos, solo emojis, etiquetas | No hace nada. |
| Reacciones (me gusta, me encanta) | Solo las cuenta en la bitácora. Meta no permite contestar una reacción ni escribirle a quien reaccionó. |

Candados que no dependen del modelo: no publica si la respuesta trae un precio,
teléfono o enlace que no esté en `conocimiento.js`, emojis, «sin dolor» o promesas;
no contesta dos veces el mismo comentario; cede si usted o el personal ya
contestaron; no se mete en conversaciones entre terceros; no contesta comentarios
de más de 24 horas.

## Modos (`FB_BOT_MODO`)

- `apagado` (por defecto): no hace nada.
- `simulacion`: lee y redacta, **no publica**; le manda por correo lo que habría contestado.
- `activo`: publica.

## Puesta en marcha

1. **App de Meta.** En developers.facebook.com cree una app de tipo negocio, agregue
   el producto Webhooks y genere un token de la página con los permisos
   `pages_read_engagement`, `pages_read_user_content` y `pages_manage_engagement`
   (más `pages_messaging` si quiere el mensaje privado). Para recibir comentarios de
   personas ajenas a la app, Meta puede exigir revisión de la app y verificación del
   negocio; confírmelo en el panel, porque esa regla cambia.
2. **Variables en Vercel** (Settings → Environment Variables), las de `.env.example`.
3. **Publicar** esta rama en producción: el webhook necesita una dirección fija.
4. **Conectar el webhook**: en la app de Meta, objeto Page, URL
   `https://preconsultas-dr-jimenez.vercel.app/api/facebook-webhook`, el mismo
   `FB_VERIFY_TOKEN`, campo `feed`. Luego suscriba la página a la app
   (`POST /{page-id}/subscribed_apps?subscribed_fields=feed`).
5. Ponga `FB_BOT_MODO=simulacion` unos días, revise los correos, y cambie a `activo`.

## Antes de encenderlo

- **Una sola voz.** El operador de la Air (`operador-facebook-e-instagram-air`)
  contesta comentarios de Facebook a las 9:00 y 13:00. Este bot cede cuando ya hay
  respuesta de la página, pero conviene quitarle a la Air los comentarios de
  Facebook para que no haya dos redactores. Instagram no lo cubre este bot.
- **Datos.** `conocimiento.js` salió de la copia en Drive de la nota de datos
  canónicos (precios 5-oct-2026, horarios 22-oct-2026). Si cambian en la bóveda, hay
  que cambiarlos aquí.

## Pruebas

`node tests/facebook-bot.mjs` (sin red; también corre dentro de `npm test`).
No se ha probado contra Meta ni contra la API de Claude reales: faltan las credenciales.
