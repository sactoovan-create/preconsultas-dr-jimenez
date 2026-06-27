# Módulo de instrumentos clínicos · GineOS

Suite de calculadoras y cuestionarios para la consulta ginecológica. Cada
patología es un apartado independiente que comparte el mismo paciente, el mismo
lector de laboratorios y el mismo patrón de salida (resultado clínico para el
médico y hoja imprimible para la paciente).

El primer instrumento, **riesgo cardiometabólico**, está completo y validado
contra el caso de prueba canónico de las ecuaciones PREVENT. Los demás apartados
están registrados y listos para llenarse.

---

## Filosofía

- **Un paciente, muchos instrumentos.** Los datos demográficos, los signos y los
  laboratorios se capturan una vez y se conservan al pasar de un apartado a otro.
- **Lógica separada de la interfaz.** Toda la lógica clínica vive en archivos
  `engine.js` como funciones puras, sin estado ni interfaz. Esto las hace
  verificables con pruebas y portables.
- **Dos tipos de instrumento.** Unos son *calculadoras* (un modelo o score, como
  PREVENT o los criterios de Rotterdam); otros son *cuestionarios* diagnósticos
  estructurados con orientación a tratamiento (endometriosis, hemorragia uterina
  anormal, dolor pélvico). El módulo trata ambos por igual.
- **La hoja de la paciente nunca lleva contenido dirigido al médico.** Sin
  estadiaje técnico, sin derivaciones, sin fármacos. Solo sus valores, una
  interpretación neutra y recomendaciones generales.
- **Los instrumentos se unen en el paciente.** Cada instrumento publica su
  resultado clave en el paciente compartido mediante `publicarResumen(id, {...})`.
  El panel `ResumenPaciente` consolida esos resultados en una sola vista y permite
  saltar a cualquier apartado con `irA(id)`. La consolidación es la base del
  informe único del paciente y, en GineOS, del historial por expediente.

### Contrato del resumen que publica cada instrumento

Dentro del componente, un `useEffect` que depende del resultado calculado publica:

```js
useEffect(() => {
  publicarResumen('id-del-instrumento', {
    evaluado,            // booleano: hay datos suficientes para mostrar algo
    estado,              // 'ok' | 'aviso' | 'alerta' | 'neutro' (color del punto)
    titular,             // el resultado clave, una línea (p. ej. "Estadio 2")
    detalle,             // contexto opcional (p. ej. "Riesgo a diez años 14.7 por ciento")
  });
}, [r, publicarResumen]);
```

`publicarResumen` ignora la publicación si el resumen no cambió, de modo que el
`useEffect` no provoca renders en cadena.

### Puentes clínicos entre instrumentos

Donde la evidencia lo justifica, un instrumento sugiere continuar en otro con el
componente `Puente`, que navega con `irA(id)` llevando el mismo paciente. Los
puentes vigentes:

- Síndrome poliendocrino positivo → riesgo cardiometabólico (comparten cribado).
- Dolor pélvico con eje ginecológico implicado → endometriosis.
- Endometriosis con dolor pero sin datos cardinales → dolor pélvico multisistémico.
- Hemorragia con disfunción ovulatoria (AUB-O) → síndrome poliendocrino.
- Menopausia con candidatura a terapia hormonal → riesgo cardiovascular (define la vía).
- Cardiometabólico con antecedente de síndrome poliendocrino → ese instrumento; en peri o posmenopausia → menopausia.

### Auditoría bibliográfica

El documento `AUDITORIA-BIBLIOGRAFICA.md` revisa, instrumento por instrumento, si
cada fuente es la de mejor calidad metodológica y la más aceptada en su
subespecialidad. Las fuentes de `core/evidencia.js` y las advertencias en pantalla
reflejan sus hallazgos (revisión de junio de 2026).

### Pre-consulta

La **pre-consulta** (`PreConsulta.jsx`) es un modo en lenguaje de paciente donde
ella auto-reporta las escalas que puede responder (síntomas de menopausia y dolor).
Las respuestas quedan en el auto-reporte del paciente compartido (`autoReporte`) y
prellenan los instrumentos del médico al abrirlos.

El **seguimiento metabólico longitudinal** vive solo en el expediente del ERP. Este
portal conserva calculadoras puntuales y hojas clínicas, pero no captura series de
peso, grasa, músculo o cintura para evitar doble registro.

### Informe consolidado y trazabilidad

El panel del paciente genera, con `core/printReport.js`, un **informe de valoración
integral**: un documento clínico para el expediente (no para la paciente) que reúne
el resultado clave de cada instrumento evaluado y el fundamento de evidencia.

Cada instrumento muestra, con el componente `BaseEvidencia`, un bloque plegable con
las guías que lo sustentan y la fecha de revisión de su vigencia. Las fuentes viven
en `core/evidencia.js`; al actualizar una guía se ajusta ahí su entrada.

---

## Estructura de archivos

```
instrumentos/
  InstrumentosModule.jsx      Contenedor: navegación lateral + montaje del apartado activo. Punto de entrada.
  InstrumentosModule.css
  registry.js                 Registro de instrumentos (la lista de apartados).
  core/
    PacienteContext.jsx       Estado del paciente compartido + punto de integración con el expediente.
    prevent.js                Motor PREVENT validado + filtración CKD-EPI 2021. Función pura.
    labParser.js              Lector de reportes (parseLabs, parseIdent). Funciones puras, validadas.
    labReaderBrowser.js       Obtención de texto del archivo (pdf.js / reconocimiento óptico). Sustituible por visión en GineOS.
    printSheet.js             Generador de la hoja imprimible para la paciente. Compartido.
    ui.jsx / ui.css           Componentes de formulario reutilizables (campos, interruptores, secciones).
    designTokens.css          Variables de marca (color, tipografía). Se importa una sola vez.
  instruments/
    cardiometabolico/         Primer instrumento, completo y validado.
      engine.js               Lógica clínica (estadiaje, conducta, terapia hormonal, datos de la hoja).
      Cardiometabolico.jsx    Interfaz: captura + lector + resultados + impresión.
      Cardiometabolico.css
    sop/ endometriosis/ hemorragia/ dolor-pelvico/ menopausia/
                              Apartados registrados, en construcción. Cada archivo lleva en
                              comentario la especificación clínica prevista.
```

---

## Integración con GineOS

El módulo se monta como un componente y es autónomo: funciona con o sin conexión
al expediente.

```jsx
import InstrumentosModule from './instrumentos/InstrumentosModule.jsx';

<InstrumentosModule
  pacienteInicial={mapearExpediente(expedienteAbierto)}   // opcional
  onGuardarResultado={({ instrumentoId, resultado, paciente }) => {
    // persistir en SQLite / expediente
  }}                                                       // opcional
/>
```

Sin `pacienteInicial`, el módulo arranca vacío y el médico captura a mano. Esto
permite probarlo aislado antes de conectarlo.

### Mapeo del expediente

`pacienteInicial` debe seguir la forma del modelo (ver `core/PacienteContext.jsx`):

```js
{
  demografia: { nombre, edad, etapaReproductiva: 'pre'|'peri'|'post', edadMenopausia, histerectomia },
  signos:     { sistolica, diastolica, peso, talla, circunferencia },
  labs:       { ct, hdl, tg, glu, hba1c, creat, egfr, uacr },
  antecedentes: { diabetes, tabaquismo, antihipertensivo, estatina,
                  ecvEstablecida, ecvSubclinica,
                  cancerMama, tromboembolismo, hepatica, sangradoNoDx,
                  preeclampsia, diabetesGestacional,
                  partoPretermino, sindromePoliendocrino }
}
```

Escribe una función `mapearExpediente` que traduzca los campos de tu esquema de
SQLite a esta forma. Solo necesitas llenar lo que tengas; el resto queda en
`null` y los instrumentos lo piden.

### Lector de laboratorios en producción

En este lienzo, el lector usa reconocimiento óptico de texto (`core/labReaderBrowser.js`).
En GineOS se reemplaza por el **andamio de visión** (`core/labReaderVision.js`), que
manda la imagen del laboratorio a un modelo de visión y devuelve los valores
estructurados, listos para `mezclar('labs', ...)`.

Seguridad: ese módulo no maneja credenciales. Recibe una función de transporte
`enviar` que GineOS implementa con su clave y su endpoint, de modo que la credencial
vive en el entorno seguro de GineOS y nunca en el código del módulo. El módulo solo
arma la petición, delega el envío e interpreta la respuesta.

`core/labReaderBrowser.js` lee el texto con pdf.js o reconocimiento óptico en el
navegador. En GineOS conviene sustituir esa obtención de texto por el
reconocimiento por visión que ya usas en la digitalización: es más robusto con
formatos heterogéneos y mantiene las credenciales del lado del proceso. El
contrato es simple: devolver un string de texto plano. `parseLabs` y `parseIdent`
no cambian.

---

## Cómo agregar una calculadora o cuestionario nuevo

Tres pasos. Tomemos el síndrome poliendocrino ovárico como ejemplo.

1. **La lógica, en un motor puro.** Crea `instruments/sop/engine.js` con funciones
   que reciben el paciente y devuelven el resultado. Sin interfaz. Si necesitas
   laboratorios, ya están en `paciente.labs`. Verifica el motor con un caso
   conocido antes de tocar la interfaz.

   ```js
   export function evaluarSop(p) {
     // criterios de Rotterdam, fenotipo, cribado metabólico...
     return { fenotipo, criterios, hojaPaciente: { ... } };
   }
   ```

2. **La interfaz.** Crea `instruments/sop/Sop.jsx`. Lee el paciente con
   `usePaciente()`, captura con los componentes de `core/ui.jsx`, calcula con
   `useMemo`, e imprime con `imprimirHoja(resultado.hojaPaciente)`. Usa
   `Cardiometabolico.jsx` como plantilla.

   ```jsx
   const { paciente, actualizar } = usePaciente();
   const r = useMemo(() => evaluarSop(paciente), [paciente]);
   ```

3. **Regístralo.** En `registry.js`, importa el componente y cambia su entrada de
   `estado: 'construccion'` a `estado: 'activo'`. El contenedor lo lista y lo
   monta solo.

Para un cuestionario diagnóstico (endometriosis, dolor pélvico), el patrón es el
mismo; lo que cambia es que el motor pondera respuestas en vez de calcular un
modelo, y la salida es una probabilidad clínica con orientación a estudio y
tratamiento en lugar de un score.

---

## Notas técnicas

- **Lenguaje.** Está en JavaScript con JSX para que corra en cualquier
  configuración de React. Si GineOS usa TypeScript, tipar es directo: los objetos
  de paciente y de resultado ya tienen forma estable; puedo entregar las
  definiciones de tipo cuando quieras.
- **Estilos.** CSS plano con variables de marca, sin dependencia de librerías de
  estilo. Si GineOS usa otro sistema, los tokens de `designTokens.css` se trasladan
  sin fricción.
- **Navegación.** El módulo maneja su navegación interna con estado local, sin
  asumir un enrutador. Se integra como una sola vista dentro de la navegación de
  GineOS.
- **Tipografías.** En el prototipo se cargan de una red externa; en producción
  conviene servirlas localmente.
- **Impresión.** La hoja de la paciente se abre en una ventana propia y se imprime
  desde ahí, aislada del resto de la aplicación.
- **Validación del motor.** El motor cardiometabólico reproduce el caso canónico
  de PREVENT (riesgo total a diez años 14.7 por ciento, a treinta años 53 por
  ciento) y el estadiaje esperado. Mantén esa prueba al modificarlo.

---

## Estado actual

| Apartado | Tipo | Estado |
| --- | --- | --- |
| Riesgo cardiometabólico | Calculadora | Completo y validado |
| Síndrome poliendocrino ovárico | Calculadora | Completo y validado |
| Endometriosis | Cuestionario | Completo y validado |
| Hemorragia uterina anormal | Cuestionario | Completo y validado |
| Dolor pélvico crónico | Cuestionario | Completo y validado |
| Menopausia y terapia hormonal | Cuestionario | Completo y validado |
| Anticoncepción | Cuestionario | Completo y validado |
| Riesgo de cáncer de mama | Cuestionario | Completo y validado |
| Salud ósea | Cuestionario | Completo y validado |
| Incontinencia urinaria | Cuestionario | Completo y validado |
