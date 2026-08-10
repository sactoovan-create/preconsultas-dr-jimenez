---
id: reemplazar-con-id-estable
uso_preconsulta: false
estado_clinico: borrador
version: "0.1.0"
fecha_revision: 2026-08-10
area: reemplazar-area
preguntas: []
gatillos: []
banderas: []
fuentes: []
---

# Borrador de conocimiento para preconsulta

Esta plantilla no se publica. Completarla dentro del vault y mantener ambos
sellos en estado de borrador hasta terminar la revision clinica y de privacidad.

Ejemplo de las formas permitidas, solo como referencia de autor:

```yaml
preguntas:
  - id: ejemplo-pregunta
    texto: "Texto revisado de la pregunta"
    tipo: booleano
    requerida: false
gatillos:
  - id: ejemplo-gatillo
    pregunta_id: ejemplo-pregunta
    operador: igual
    valor: true
    efecto:
      tipo: marcar-revision-medica
      destino: ejemplo-revision
banderas:
  - id: ejemplo-bandera
    pregunta_id: ejemplo-pregunta
    operador: igual
    valor: true
    prioridad: media
    mensaje_medico: "Mensaje interno revisado por el medico"
fuentes:
  - titulo: "Referencia clinica revisada"
    anio: 2026
    url: "https://example.org/referencia"
```

No cambiar los sellos a `true` y `aprobado` usando contenido de ejemplo.
