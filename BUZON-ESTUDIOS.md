# Buzón de estudios

Deja que la paciente suba sus laboratorios, ultrasonidos o recetas desde el portal,
antes de la consulta. Los archivos van al **almacenamiento privado de Supabase** (no
público). El navegador crea una sesión anónima aislada sin pedir cuenta ni
contraseña; la paciente solo puede gestionar los archivos que ella misma subió.
Tú, autenticado como médico, puedes abrir todos los estudios.

Se activa cuando el portal tiene Supabase configurado. Por defecto usa el bucket
`estudios`; `VITE_ESTUDIOS_BUCKET` solo hace falta si algún día cambias el nombre
del bucket.

## Cómo se ve

- **Paciente:** al final de la pre-consulta, antes del botón de enviar, aparece
  "¿Tienes estudios? Súbelos aquí (opcional)". Los selecciona y puede quitarlos;
  la transferencia al bucket ocurre únicamente al enviar el cuestionario. Después
  recibe una confirmación clara de que respuestas y estudios llegaron.
- **Tú:** en el panel del médico (`/consultorio`), cada respuesta muestra "Estudios
  adjuntos" con un botón **Abrir** por archivo (enlace firmado que caduca en 1 hora).

## Activarlo (una vez)

1. **Crea el bucket y las políticas:** en el SQL Editor de Supabase, pega y ejecuta
   [`supabase/schema-estudios.sql`](supabase/schema-estudios.sql). Crea el bucket
   privado `estudios` y limita a cada paciente a sus propios objetos.
2. **Habilita las sesiones anónimas:** Supabase → Authentication → Settings →
   **Allow anonymous sign-ins**. No muestra una pantalla de acceso a la paciente;
   únicamente da a cada navegador una identidad temporal para aislar sus archivos.
3. **Enciende el portal:** verifica que Vercel tenga `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_ANON_KEY`, y **vuelve a desplegar**. El bucket usado por defecto
   es `estudios`.

Para usar otro bucket, agrega `VITE_ESTUDIOS_BUCKET=<nombre>`.

## Qué hace que sea barato

- **Compresión en el navegador:** las imágenes se reducen a 1600 px de lado y se
  recomprimen (una foto de laboratorio de 5 MB baja a unos cientos de kilobytes) antes
  de subir. Los PDF se suben tal cual.
- **Límites:** máximo 10 archivos por paciente; 15 MB por archivo. Solo PDF, JPG,
  PNG y WebP. HEIC se bloquea antes de transmitir y explica cómo usar una captura
  de pantalla, JPG o PDF.

Con eso, el primer giga gratis de Supabase dura muchísimo (cientos de pacientes).

## Aviso de uso (cuándo preocuparte)

Revisa de vez en cuando el uso en **Supabase → Storage** (o Settings → Usage). Mientras
estés por debajo de 1 GB, es gratis; pasándolo, ronda dos centavos de dólar por giga al
mes. Cuando te acerques a 1 GB tienes tres caminos: comprimir más, subir de plan (centavos),
o activar el paso a Google Drive (lo dejamos como plan futuro). No hace falta hacer nada
hasta entonces.

## Seguridad: lo que cubre y lo que no

- **Aislamiento por paciente (cubierto):** el bucket es privado y cada sesión
  anónima solo puede subir, consultar metadatos y retirar sus propios objetos.
  No puede ver ni borrar estudios de otra paciente aunque conozca la ruta. Tú,
  autenticado, abres los archivos con enlaces firmados que caducan en una hora.
- **Consentimiento antes de cargar (cubierto):** el selector de archivos permanece
  deshabilitado hasta que la paciente acepte la autorización clínica.
- **Sin archivos huérfanos por abandono (cubierto):** seleccionar un archivo no lo
  transmite. La subida se inicia al presionar el envío final. Un rechazo confirmado
  retira los objetos recién creados; además, el cron del ERP compara el bucket
  contra las respuestas y elimina después de 24 horas cualquier objeto que haya
  quedado sin cuestionario por cierre del navegador o corte de red.
- **El tope de tamaño (15 MB) y los tipos permitidos se hacen cumplir en el servidor**
  (en el bucket), no solo en el navegador.
- **Lo que NO cubre todavía:** una persona puede crear su propia sesión anónima y
  subir basura a su propia carpeta. Los límites de tipo y 15 MB sí viven en el
  servidor, pero el máximo de 10 archivos es de interfaz. Antes de campañas
  públicas masivas, conviene llevar la subida a una función validada con Turnstile
  y cuota por sesión (ver `LANZAMIENTO-PUBLICO.md`).
- El identificador de carpeta (`estudiosFolder`) es dato interno y no debe
  publicarse fuera del sistema.

## Pendiente / futuro

- **Expediente:** los estudios ya se muestran en la app `preconsultas` del ERP,
  ligados por `estudiosFolder`, sin duplicarlos en Render.
- **Paso automático a Google Drive** cuando el almacenamiento se llene (plan futuro).
- **Link por paciente reanudable** para subir estudios en varias sesiones hasta la consulta.
