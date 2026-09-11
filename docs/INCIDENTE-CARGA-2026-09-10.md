# Incidente: panel vacio despues de publicar

## Evidencia

El usuario reporto carga permanente tras la publicacion de la entrevista.
Se reprodujo una pantalla vacia en su pestana de Chrome de `/consultorio`.
La consola registro un fallo de importacion dinamica de
`InstrumentosModule-Cjp9xsDW.js`, solicitado por el antiguo `index-DTN_4bI3.js`.
Ese archivo retirado devolvia HTTP 200 con `text/html` debido al rewrite global.
El documento vigente ya referenciaba `index-CwM-3zVI.js`.

Una recarga recupero el panel autenticado; no fue necesario borrar almacenamiento,
cerrar sesion ni modificar datos. No se atribuye el incidente a Supabase o a perdida
de estudios: la evidencia corresponde a la carga de codigo tras un despliegue.

## Correccion

- `core/EstadoCarga.jsx` y `App.jsx`: frontera de errores de React y aviso de
  carga lenta con accion explicita para recargar, sin bucles automaticos.
- `index.html`: contenido inicial recuperable incluso si falla el JS principal;
  estado y boton legibles sin depender del CSS de un instrumento.
- `vercel.json`: revalidacion del documento HTML; rewrites solo para las rutas
  reales `consultorio` y `privacidad`. Un recurso inexistente no se presenta como
  si fuera HTML valido del portal. Otras rutas inexistentes pasan a HTTP 404.
- Marcadores: release `entrevista-2026-09-10.2`, carga `recuperacion-2026-09-10.1`.
  No cambia formulario `2026.09.4`, entrevista, precarga, contratos o motores.

No se borra cache, cookies, localStorage ni sessionStorage. Recargar sigue siendo
una decision del usuario: no se afirma que recupere ediciones nunca guardadas.
Una pestana con codigo anterior al arreglo necesita una recarga para recibirlo.

## Pruebas

`npm run build`, `npm test` (17 scripts) y `git diff --check` correctos.
`tests/carga-browser.mjs` prueba el build compilado con red externa bloqueada:
24 comprobaciones, incluyendo JS/CSS fallidos, HTML en vez de JS, entrada JS
bloqueada, recurso retenido, navegador sin JS, recuperacion manual, persistencia
de dos marcadores ficticios y carga normal de las tres rutas. Captura a 320 px
inspeccionada, sin desbordamiento. No se usa ni envia un expediente.

La primera ejecucion conto eventos de historial como recargas; se corrigio el
guion para contar solicitudes de navegacion del documento y se repitio completo.
La validacion local no acredita headers del CDN: se comprobaran despues del
despliegue. Resultado y SHA finales se registran en la nota viva de Obsidian.

## Referencias y limites

- [Vite: errores de carga tras despliegues](https://vite.dev/guide/build#load-error-handling).
- [Vercel: configuracion estatica de headers y rewrites](https://vercel.com/docs/project-configuration/vercel-json).

No se modificaron autenticacion, permisos, SQL, estudios ni contenido clinico.
No es prueba de disponibilidad universal, de redes de otras pacientes ni del
guardado remoto. No se agregaron servicios ni dependencias.
Reversion mediante PR del commit correctivo; no mediante borrado de datos.
