# Conducto de conocimiento clinico

Este directorio contiene el contrato y el artefacto versionado para mover
conocimiento clinico aprobado desde Obsidian hacia el codigo. No conecta el
vault en tiempo de ejecucion y no activa preguntas del portal.

## Barreras de publicacion

Una nota solo se considera candidata cuando su frontmatter contiene ambos
sellos exactos:

```yaml
uso_preconsulta: true
estado_clinico: aprobado
```

Despues debe cumplir [`schema.json`](./schema.json). Entre otras cosas exige:

- `id` estable en formato slug.
- `version` semantica entre comillas, por ejemplo `"1.0.0"`.
- `fecha_revision` real en formato `AAAA-MM-DD`.
- `area` normalizada en formato slug.
- arrays estructurados `preguntas`, `gatillos`, `banderas` y `fuentes`.
- al menos una fuente con URL HTTPS o DOI.
- referencias internas validas y IDs sin duplicados.

Las notas sin los dos sellos se ignoran. Una candidata invalida detiene la
generacion completa: nunca se publica parcialmente.

## Privacidad

El generador lee solo el frontmatter inicial de cada Markdown. El cuerpo de la
nota, su titulo libre, sus etiquetas y su ruta local no entran al manifiesto.
Solo se copian los campos enumerados por el contrato.

Antes de emitir, se rechazan patrones obvios de correo, telefono, CURP, RFC,
HTML ejecutable y parametros sensibles en URLs. Esta barrera es complementaria:
el vault no debe contener datos identificables de pacientes y la aprobacion
clinica siempre debe incluir una revision humana de privacidad.

## Flujo de aprobacion

1. Copiar [`NOTA-BORRADOR.md`](./NOTA-BORRADOR.md) al area clinica correcta del vault.
2. Mantener `uso_preconsulta: false` y `estado_clinico: borrador` mientras se edita.
3. Revisar redaccion, fuentes, seguridad clinica y privacidad.
4. Asignar una version semantica y una fecha de revision.
5. Cambiar ambos sellos de publicacion en la misma revision aprobada.
6. Generar el artefacto y revisar su diff:

```bash
npm run knowledge:build
git diff -- clinical-knowledge/manifest.json
```

7. Ejecutar las pruebas completas antes de integrar:

```bash
npm test
npm run knowledge:check
```

Cambiar preguntas, gatillos o banderas requiere subir `version`. Una version
anterior del mismo `id` no debe conservar ambos sellos activos; los IDs
duplicados detienen la compilacion.

## Manifiesto

`manifest.json` es determinista:

- las entradas se ordenan por `id`;
- las claves JSON se ordenan de forma estable;
- el orden clinico de los arrays se conserva;
- no incluye fecha de compilacion ni rutas de la computadora;
- cada entrada y el conjunto completo incluyen un hash SHA-256.

El portal no importa este archivo actualmente. Activar una pregunta requerira
un cambio de codigo independiente, revision clinica y pruebas propias.

## Comandos y rutas

Por defecto el script usa el vault de iCloud del Dr. Jimenez. Se puede sustituir
sin editar codigo:

```bash
OBSIDIAN_VAULT="/ruta/al/vault" npm run knowledge:build
npm run knowledge:build -- --vault "/otra/ruta" --output /tmp/manifest.json
```

`knowledge:check` compara byte por byte el artefacto versionado con lo que
produciria el vault actual y falla si esta desactualizado.
