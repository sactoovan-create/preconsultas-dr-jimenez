# Panel medico: jornada de consulta

## Alcance de la publicacion

Version visible: `jornada-2026-09-10.1` (`/version-panel.json`).
Base de preparacion: `681f7659caf4cafcd1a32015923f44bd99255c4c`.

- Jornada por fecha/hora; pendientes e identidades confirmadas separados.
- Consulta con resumen, respuestas, estudios, valoracion e historial.
- Revision explicita por version y seleccion medica de instrumentos.
- Guardado en `trabajo_clinico` existente, cache por cuenta y control de versiones.
- Proteccion frente a cambios de paciente/cuenta y respuestas de red tardias.
- El manifiesto de estudios no se presenta como comprobacion de contenido.

No cambia el cuestionario publico, su version, las reglas de ruteo, la precarga,
los motores clinicos, los uploads de pacientes ni el esquema de Supabase. El
catalogo `core/entrevista.js` se incluye solo como dependencia del lector; no
activa las preguntas nuevas del formulario que siguen en otra rama local.

La identidad `portal:<UUID>` es propia del panel y requiere confirmacion medica.
No es un ID del ERP ni acredita sincronizacion con el expediente. No hay union
automatica de personas por nombre o telefono.

## Verificacion reproducible

- `npm test`
- `npm run test:panel` (servidor localhost con backend desactivado)
- `npm run test:contexto`
- `npm run test:contexto:local`
- `npm run build`
- `scripts/verificar-panel-remoto.mjs` requiere `PANEL_QA_REMOTO=1`, y credenciales
  via entorno o `PANEL_SECRETS_FILE`. Solo crea/lee/actualiza/elimina una fila
  tecnica identificada por UUID; nunca consulta cuestionarios de pacientes.

Las pruebas de navegador requieren Playwright y Chrome. `PANEL_QA_URL` permite
usar otro puerto loopback. Los transportes simulados bloquean la red externa.
La prueba remota valida permisos anon/medico y escritura condicionada por version,
pero no certifica todas las politicas ni la integridad del almacenamiento de estudios.

## Puesta en marcha y reversion

Publicar mediante PR a `main` y la integracion Vercel existente. Confirmar el
estado de despliegue y la version del dominio productivo despues de la fusion.
No hace falta ejecutar SQL ni cambiar variables o secretos.

Si hay una regresion, revertir el commit del PR por otro PR y verificar el
despliegue anterior. No borrar trabajo clinico ni cache de pacientes para revertir
la interfaz. Las decisiones originales quedan en JSON; conservarlas al conciliar.
