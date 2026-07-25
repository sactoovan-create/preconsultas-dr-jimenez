# Cuestionario adaptativo v2

Estado: implementado en formulario `2026.08`, contrato de respuesta `version: 2`
y reglas clínicas `ruteoClinico.version: 2`.

## Decisiones de producto

- El motivo de consulta y los temas elegidos gobiernan el flujo. La escala MRS ya
  no se pregunta a todas las pacientes.
- El camino mínimo es identificación, motivo, seguridad, contexto reproductivo,
  antecedentes, historia y medicamentos, prevención opcional, estudios y envío.
- Sangrado, dolor, ciclos, climaterio, salud urinaria, salud íntima, mama y plan
  reproductivo abren pasos propios solo cuando la paciente los elige.
- Las profundizaciones son opcionales. El portal conserva tanto las respuestas
  como el resumen calculado al momento del envío.
- Una escala incompleta no produce un puntaje. `null` significa que no puede
  interpretarse; cero solo existe cuando todos los reactivos fueron contestados
  como cero.
- La paciente puede recibir orientación para buscar atención urgente, pero nunca
  ve diagnósticos, riesgo calculado, candidatura hormonal ni decisiones del motor.
- El ERP conserva la sugerencia original y la decisión médica por separado.

## Puerta de seguridad

Antes de las preguntas clínicas se registra:

- posibilidad de embarazo;
- dolor súbito o muy intenso;
- sangrado que empapa una toalla o tampón por hora durante dos horas o más;
- mareo intenso, desmayo o debilidad marcada;
- dolor de hombro acompañado de dolor abdominal o sangrado;
- dificultad respiratoria o dolor torácico;
- fiebre con dolor pélvico intenso.

Cuando la paciente elige embarazo/posparto, reporta embarazo confirmado o ya
consta esa etapa, también se revisan cefalea persistente o cambios visuales,
disminución de movimientos fetales, salida de líquido, sangrado mayor que un
manchado leve durante el embarazo, edema marcado, síntomas unilaterales de
trombosis, fiebre de 38 °C o más, hemorragia posparto y pensamientos de hacerse
daño o dañar al bebé. Se registra además la edad gestacional o el tiempo desde el
parto cuando se conoce.

Una combinación de alarma muestra que el formulario no se revisa continuamente y
que la paciente no debe esperar una respuesta del consultorio para acudir a
urgencias. El envío permanece disponible para que el médico reciba el antecedente.

La pantalla de confirmación conserva la advertencia cuando hubo una bandera: que
el envío haya sido recibido nunca se presenta como permiso para esperar. Estas
señales no dependen de vigilancia del consultorio; el texto instruye buscar
atención urgente de inmediato.

## Fuentes clínicas primarias

- ACOG, Well-Woman Visit:
  https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2018/10/well-woman-visit
- ACOG, Abnormal Uterine Bleeding:
  https://www.acog.org/womens-health/faqs/abnormal-uterine-bleeding
- ACOG, Ectopic Pregnancy:
  https://www.acog.org/womens-health/faqs/ectopic-pregnancy
- CDC Hear Her, Urgent Maternal Warning Signs:
  https://www.cdc.gov/hearher/es/maternal-warning-signs/index.html
- NICE NG23, Menopause:
  https://www.nice.org.uk/guidance/ng23/chapter/recommendations
- CDC, U.S. Medical Eligibility Criteria for Contraceptive Use 2024:
  https://www.cdc.gov/contraception/hcp/usmec/
- USPSTF, Osteoporosis Screening 2025:
  https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/osteoporosis-screening
- USPSTF, Breast Cancer Screening 2024:
  https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/breast-cancer-screening
- International evidence-based guideline for PCOS 2023:
  https://www.asrm.org/topics/topics-index/polycystic-ovary-syndrome/

## Pruebas que no deben perderse

- ruta mínima;
- cada ruta temática;
- MRS vacía, parcial y completa;
- alerta de seguridad;
- opción “ninguna” mutuamente exclusiva;
- borrador de sesión y limpieza después de enviar;
- error de red sin pérdida de respuestas;
- archivo preparado, envío conjunto, rollback ante fallo y eliminación;
- hora de recepción del servidor;
- contrato v1 y v2;
- teléfono duplicado sin asociación automática;
- cita o consulta que aparece después del primer sync;
- preservación íntegra de campos desconocidos en `raw_content`.

## Buzón privado de estudios

- La paciente debe aceptar la autorización antes de que se suba el primer archivo.
- La selección permanece local hasta el envío final, para que recargar o cerrar
  antes de enviar no deje estudios huérfanos en el bucket.
- Cada envío conserva UUID, carpeta y manifiesto de archivos ya recibidos durante
  los reintentos y las recargas del borrador. Si el servidor guardó la respuesta
  pero se perdió la confirmación, el segundo intento no la duplica ni vuelve a
  subir los estudios.
- El cron del ERP elimina objetos con más de 24 horas que no estén referenciados
  por ninguna respuesta de Supabase.
- El navegador abre una sesión anónima aislada de Supabase Auth, sin pedir cuenta
  ni contraseña.
- Cada sesión solo puede subir, consultar metadatos y retirar sus propios objetos.
  No puede leer ni borrar estudios de otra paciente, aunque conozca la ruta.
- El médico principal puede listar, abrir mediante enlace firmado y borrar todos
  los estudios desde el panel.
- Antes de publicar el portal se debe ejecutar `supabase/schema-estudios.sql` y
  habilitar **Anonymous Sign-Ins** en Supabase Auth.
