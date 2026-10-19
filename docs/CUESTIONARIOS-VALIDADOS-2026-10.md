# Cuestionarios validados en la preconsulta (2026-10)

Decisión del Dr. Iván Jiménez Martínez (19/10/2026): agregar al portal y al ERP los
cuestionarios validados que usa otro cirujano de endometriosis. Puntajes e
interpretaciones **solo con las reglas publicadas** de la versión validada en español;
nada de modelos ni inteligencia artificial.

Estado: rama local `claude/cuestionarios-dolor`, formulario `2026.10.1`.
**No publicado**: subir a producción necesita el visto bueno del Dr.

## Qué quedó en el portal

| Cuestionario | Cuándo aparece | Texto | Licencia |
|---|---|---|---|
| PHQ-9 | Siempre, antes de «Tu salud general» | Traducción oficial «Spanish for Mexico» (phqscreeners.com), sin cambios | Libre: «No se requiere permiso para reproducir, traducir, mostrar o distribuir» |
| CSI-Sp, Partes A y B | Con dolor pélvico (tema «dolor» o dolor reportado) | Apéndice de Cuesta-Vargas 2016 | CC BY 4.0: cita, enlace a la licencia y cambios declarados en pantalla |

Cambios declarados al CSI-Sp (exigencia de la CC BY): formato electrónico,
instrucciones adaptadas a selección en pantalla («rodee» por «seleccione»; en la
Parte B se retiró «a la derecha de cada casilla») y corrección tipográfica del
enunciado 6 («pare» por «para»). No se adaptó ninguna palabra al español de México;
los enunciados conservan el masculino genérico de la versión validada.

Ambos se muestran en «usted», como la versión validada; el resto del portal habla de
«tú» y la pantalla lo explica. La paciente nunca ve puntajes ni etiquetas. Ningún
cuestionario bloquea el envío: si falta algo, el portal recuerda una vez y el segundo
«Continuar» avanza.

## Reglas de puntaje (fuente)

- **PHQ-9**: total = suma de los reactivos 1-9 (0-27). Severidad 0-4 mínima, 5-9 leve,
  10-14 moderada, 15-19 moderadamente grave, 20-27 grave (Kroenke K, Spitzer RL,
  Williams JB. J Gen Intern Med 2001;16:606-13). La pregunta de dificultad no puntúa.
  Validación en mujeres mexicanas: Familiar I et al. Int J Methods Psychiatr Res
  2015;24:74-82. Las validaciones mexicanas no fijan cortes distintos.
- **CSI-Sp**: total Parte A = suma de 25 (0-100). Corte ≥ 40 (Neblett R et al. J Pain
  2013;14:438-45) y niveles 0-29 subclínico, 30-39 leve, 40-49 moderado, 50-59 grave,
  60-100 extremo (Neblett R et al. Pain Pract 2017;17:166-75), **derivados de la
  versión original en inglés**; el CSI-Sp publicó solo la media normativa 24.6 ± 12.0.
  Sin los 25 enunciados no hay total (decisión de diseño: no hay regla publicada para
  datos faltantes). La Parte B se registra y no se puntúa.

## Seguridad del PHQ-9 (reactivo 9)

Regla fija: reactivo 9 > 0 activa el protocolo sin importar el total; total ≥ 20
también es prioridad máxima; reactivo 9 sin respuesta queda como «sin dato de
seguridad, revisar».

- La paciente ve, en cuanto marca un valor > 0 y otra vez en «Revisar y enviar» y en
  la pantalla final: mensaje cálido sin puntaje, 911 o urgencias si hay peligro
  inmediato, Línea de la Vida 800 911 2000 (gratuita, 24 horas, 365 días; CONASAMA,
  verificada el 19/10/2026) con botones de llamada, que su médico será avisado y que
  el cuestionario no se revisa en tiempo real, no quedarse sola y alejar medios.
- El registro lleva `alertaSeguridad.saludMental`, `alertaSeguridad.phq9` y una
  bandera al inicio de `ruteoClinico.banderas` (CONTRATO-PRECONSULTA.md, §3).

### Decisiones pendientes del Dr. antes de publicar

1. Aprobar el protocolo clínico del reactivo 9 y nombrar quién atiende la alerta.
2. Definir horario y plazo de revisión (hoy el texto solo dice que no es en tiempo
   real) y el intervalo de sincronización de la Mac, porque el retraso de la alerta en
   el ERP es igual a ese intervalo.
3. Decidir si el correo de aviso (`notificar-respuesta`) dirá «hay una alerta de
   seguridad pendiente», sin datos clínicos ni nombre completo. No se cambió.
4. Opcional, cortesía: escribir a RandyNeblett@pridedallas.com (coautor del CSI y
   de la versión española) para avisar del uso clínico en México.

## Pendientes de licencia o registro (sin texto en el código)

`core/cuestionarios/pendientes.js` guarda la estructura y el motor de puntaje, sin
reactivos ni opciones. No están en el flujo de la paciente.

| Cuestionario | Estado | Qué debe hacer el Dr. |
|---|---|---|
| PCS | Licencia (Mapi/ePROVIDE) | Cuenta gratuita en eprovide.mapi-trust.org; «Submit a request» como médico en práctica privada, versión «Spanish for Mexico», uso electrónico en portal y ERP propios; firmar el acuerdo de e-version; pedir el manual para confirmar el corte ≥ 30. |
| BPI-SF | Licencia (MD Anderson) | Formulario en www4.mdanderson.org/symptomresearch con uso «Clinical practice», BPI-SF en español, electrónico; firmar el License Agreement (posible cargo de trámite de 200 USD); pedir la User Guide a symptomresearch@mdanderson.org. |
| GSRS | Licencia (AstraZeneca vía RWS) | «Order Instrument» en astrazeneca.com/patient-reported-outcomes: GSRS autoadministrado, español (preguntar por México), Web/Electronic, práctica privada no comercial; firmar con RWS y enviar capturas para aprobación; recibir el manual. |
| ICIQ-UI SF | Registro gratuito (iciq.net) | Registrarse y solicitar el módulo en «Clinical use – routine clinical care», versión «Spanish (Mexico)», electrónica; aceptar el User Agreement y esperar aprobación; usar el texto exacto con «© ICIQ Group». |

Al recibir cada licencia: crear su módulo con el texto oficial (como `phq9.js` o
`csi.js`), confirmar las reglas marcadas «confirmar con el manual», añadirlo a
`ACTIVOS` en `core/cuestionarios/index.js` y actualizar el contrato.

## Fuentes

- PHQ-9: https://www.phqscreeners.com/select-screener (PDF «PHQ9_Spanish for Mexico»);
  manual https://www.phqscreeners.com/images/sites/g/files/g10016261/f/201412/instructions.pdf
- CSI-Sp: https://pmc.ncbi.nlm.nih.gov/articles/PMC5074937/ (Apéndice, CC BY 4.0);
  Mayer 2012 https://pmc.ncbi.nlm.nih.gov/articles/PMC3248986/; Neblett 2013
  https://pmc.ncbi.nlm.nih.gov/articles/PMC3644381/; Neblett 2017
  https://pubmed.ncbi.nlm.nih.gov/26989894/
- Línea de la Vida: comunicado 239 de gob.mx/conasama (18/06/2024).
- Licencias pendientes: eprovide.mapi-trust.org, mdanderson.org (Symptom Research),
  astrazeneca.com/patient-reported-outcomes, iciq.net/licences e iciq.net/user-agreement.
