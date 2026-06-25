# Buzón de estudios

Deja que la paciente suba sus laboratorios, ultrasonidos o recetas desde el portal,
antes de la consulta. Los archivos van al **almacenamiento privado de Supabase** (no
público); la paciente nunca ve una carpeta ni inicia sesión en nada, y solo tú,
autenticado, los abres.

Está **apagado por defecto**: el portal funciona igual que hoy hasta que defines
`VITE_ESTUDIOS_BUCKET`.

## Cómo se ve

- **Paciente:** al terminar la pre-consulta, en la pantalla de "Gracias" aparece
  "¿Tienes estudios? Súbelos aquí (opcional)". Sube y sigue, con estado por archivo.
- **Tú:** en el panel del médico (`/consultorio`), cada respuesta muestra "Estudios
  adjuntos" con un botón **Abrir** por archivo (enlace firmado que caduca en 1 hora).

## Activarlo (una vez)

1. **Crea el bucket y las políticas:** en el SQL Editor de Supabase, pega y ejecuta
   [`supabase/schema-estudios.sql`](supabase/schema-estudios.sql). Crea un bucket privado
   `estudios` donde la paciente (anon) **solo puede subir**, y solo tú (autenticado)
   lees y borras.
2. **Enciende el portal:** en Vercel → Environment Variables, agrega
   `VITE_ESTUDIOS_BUCKET=estudios` y **vuelve a desplegar**.

Para apagarlo, quita esa variable y re-despliega.

## Qué hace que sea barato

- **Compresión en el navegador:** las imágenes se reducen a 1600 px de lado y se
  recomprimen (una foto de laboratorio de 5 MB baja a unos cientos de kilobytes) antes
  de subir. Los PDF se suben tal cual.
- **Límites:** máximo 10 archivos por paciente; 15 MB por archivo. Solo PDF e imágenes.

Con eso, el primer giga gratis de Supabase dura muchísimo (cientos de pacientes).

## Aviso de uso (cuándo preocuparte)

Revisa de vez en cuando el uso en **Supabase → Storage** (o Settings → Usage). Mientras
estés por debajo de 1 GB, es gratis; pasándolo, ronda dos centavos de dólar por giga al
mes. Cuando te acerques a 1 GB tienes tres caminos: comprimir más, subir de plan (centavos),
o activar el paso a Google Drive (lo dejamos como plan futuro). No hace falta hacer nada
hasta entonces.

## Seguridad: lo que cubre y lo que no

- **Privacidad de lectura (cubierto):** el bucket es privado y la paciente (clave
  anónima) **solo puede subir; nunca leer ni listar**. Solo tú, autenticado, abres los
  archivos, con enlaces firmados que caducan en una hora. Una paciente no puede ver los
  estudios de otra.
- **El tope de tamaño (15 MB) y los tipos permitidos se hacen cumplir en el servidor**
  (en el bucket), no solo en el navegador.
- **Lo que NO cubre todavía (igual que el envío del cuestionario):** la subida usa la
  clave anónima pública directo al almacenamiento. Para un enlace privado por WhatsApp el
  riesgo es bajo, pero un actor que tenga esa clave podría subir basura (llenar el bucket)
  o, si conoce el identificador de carpeta de una paciente, plantarle archivos. El tope de
  10 archivos es solo del navegador. Por eso: **antes de abrir el portal a público masivo,
  la subida debe pasar por la misma Edge Function blindada con Cloudflare Turnstile que el
  cuestionario** (ver `LANZAMIENTO-PUBLICO.md`), y ahí se cierra el acceso anónimo directo.
- El identificador de carpeta (`estudiosFolder`) es una clave de capacidad: no lo
  expongas en claro fuera del sistema.

## Pendiente / futuro

- **Verlo dentro del expediente (sistema):** hoy los estudios se ven en el panel del
  portal (`/consultorio`). El siguiente paso es mostrarlos también en la app
  `preconsultas` del sistema, ligados por el campo `estudiosFolder` que ya viaja en el
  contrato de datos.
- **Paso automático a Google Drive** cuando el almacenamiento se llene (plan futuro).
- **Link por paciente reanudable** para subir estudios en varias sesiones hasta la consulta.
