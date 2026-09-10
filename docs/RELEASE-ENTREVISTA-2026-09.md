# Release de entrevista y precarga

## Autorización y alcance

2026-09-10: el Dr. Iván revisó la vista local y autorizó continuar: "me gusto, dale".
Se prepara publicación del lote auditado en `AUDITORIA-CUESTIONARIOS-2026-09-10.md`.
Este documento registra la preparación; el resultado real de despliegue y el SHA
se registran en la bitácora de Obsidian y en el PR, no se presuponen aquí.

Versiones: formulario `2026.09.4`, entrevista/precarga `2.0.0`, ruteo 5, sobre 3.
Marcador público `version-preconsulta.json`, release `entrevista-2026-09-10.1`.
El panel conserva la distribución de Jornada publicada en el release anterior.

Incluye las preguntas dirigidas pendientes, precarga en diez instrumentos,
procedencia/corrección médica, colores por área, faltantes sin falsos ceros,
identificación honesta de entrevistas locales y etiquetas accesibles en los
controles compartidos. No añade servicios de pago, SQL, seguimiento obstétrico,
OCR, ni cambios de algoritmos del ERP/Huli. No recupera estudios antiguos.

La aprobación de publicación no es certificación psicométrica, autorización de
licencias o auditoría de todas las recomendaciones de los motores históricos.
Las adaptaciones siguen identificadas como locales, no escalas oficiales validadas.

## Verificación reproducible

- Suite `npm test`, inventario `npm run questions:check`, build con las dos
  variables públicas de Supabase. Claves privadas nunca en el bundle.
- Navegador local: `test:panel`, `test:contexto`, `test:contexto:local`, `test:precarga`.
- `scripts/verificar-preconsulta-remota.mjs` requiere `PRECONSULTA_QA_REMOTO=1`,
  `PANEL_SECRETS_FILE` apuntando a un archivo privado y Playwright en `NODE_PATH`.
  `PRECONSULTA_QA_URL` admite únicamente localhost o el dominio productivo conocido.
  No ejecutarlo en CI automáticamente: crea una respuesta ficticia y puede avisar
  al médico mediante el webhook existente. No cambia configuración del webhook.
- Ese guion comprueba PDF/PNG reales en Storage privado, corte de red inducido,
  reintento, recuperación tras recarga, asociación exacta del manifiesto,
  descarga/hash/bytes, lectura anónima denegada y precarga/corrección/revisión
  persistida por el médico. Limpia solo IDs generados en esa ejecución.
- El guion guarda `identificadores-prueba.json` y `qa-remoto.json` en el directorio
  de salida, nunca credenciales. Si falla la limpieza, no darla por concluida.
  No prueba HEIC, caída de red después de un INSERT aceptado, otros dispositivos,
  roles adicionales ni todos los errores posibles de Storage.
- ERP: pruebas en checkout limpio de `origin/main` y SQLite temporal. El JSON de
  la respuesta ficticia recibida en Supabase se inyecta al importador con transporte
  simulado. Se comprueba sobre completo, campos/ruteo, archivos y decisión médica.
  No se dispara cron ni se afirma sincronización real con Render/Huli.

## Publicación y reversión

Subir la rama `codex/entrevista-evidencia-precarga-20260910`, revisar el PR contra
`main` y dejar que la integración GitHub/Vercel existente compile. No sustituir
el proyecto ni subir un build local sin configuración. Comprobar el SHA y el
marcador público, después repetir la prueba remota en el dominio productivo.

Si aparece una regresión del release, revertir su merge mediante un PR hacia el
estado base `c0f2034d93c66bcef82fef73de5f4c9d5f500582`. No borrar respuestas,
trabajo médico ni objetos reales para revertir la interfaz. Las respuestas nuevas
son aditivas y se conservan. No hay migración SQL que deshacer.

Persisten los límites clínicos y de integridad detallados en la auditoría: no
confundir una prueba de recepción con garantía universal sobre estudios ni con
una validación completa de los modelos de riesgo.
