# Contexto del proyecto y referencias bibliográficas

Documento de traspaso. Sirve para arrancar una conversación nueva con todo el contexto del proyecto de instrumentos clínicos y, sobre todo, con las referencias bibliográficas que sostienen cada instrumento. Revisión de junio de 2026.

---

## Cómo usar este documento

Súbelo a un chat nuevo y el contexto queda disponible de inmediato, sin tener que recontar el proyecto. La sección de referencias está pensada para reutilizarse en otros trabajos: material académico, presentaciones, sustento de protocolos o lo que se necesite.

Sobre el nivel de las citas: las referencias están al nivel de documento, sociedad emisora y año, que es lo verificado y lo utilizable como sustento. Para una cita académica formal completa, con autores, revista, volumen, páginas e identificador de objeto digital, conviene confirmar cada una en la fuente primaria o en la base de datos de la Biblioteca Nacional de Medicina de los Estados Unidos. Ese último nivel de detalle no debe darse de memoria.

---

## Reglas de trabajo del proyecto

Toda la producción se rige por reglas fijas: español en todo, cero emojis, y cero abreviaturas, acrónimos o iniciales, escribiendo siempre el término completo, con la única excepción pragmática de las unidades estándar en hojas de laboratorio. Registro de par clínico, sin explicar lo básico. Las hojas y los reportes para la paciente se entregan limpios, sin contenido dirigido al médico. Marca personal Dr. Iván Jiménez Martínez, con paleta de verde botánico, crema, dorado y terracota, y las tipografías Cormorant Garamond y Manrope. Ginecología sin obstetricia: no se proponen servicios ni materiales de embarazo, control prenatal ni parto. El síndrome de ovario poliquístico se nombra como síndrome poliendocrino metabólico ovárico, con el término histórico entre paréntesis en la primera mención.

---

## La suite de instrumentos clínicos

Suite de diez instrumentos clínicos en React, con una capa común que los une: un paciente compartido, un panel de resumen, puentes entre instrumentos, un informe consolidado, trazabilidad de evidencia, una pre-consulta que llena la paciente, un seguimiento entre visitas y un andamio de lector de laboratorios por visión. Cada instrumento tiene un motor de funciones puras, un componente de interfaz y genera hojas para la paciente. Hay un motor de recomendaciones personalizadas que produce consejos distintos para cada paciente según sus respuestas.

Los diez instrumentos: riesgo cardiometabólico, síndrome poliendocrino metabólico ovárico, hemorragia uterina anormal, endometriosis, dolor pélvico crónico, menopausia, anticoncepción, riesgo de cáncer de mama, salud ósea e incontinencia urinaria.

Estado: la inteligencia clínica está completa y validada. Pendiente el despliegue como aplicación web, con persistencia, envío del cuestionario por enlace y la conexión del lector por visión.

---

## Referencias bibliográficas por instrumento

### 1. Riesgo cardiometabólico

Ecuaciones PREVENT para predecir riesgo de eventos cardiovasculares, de la American Heart Association, publicadas en la revista Circulation en 2024. Reemplazan a las ecuaciones de cohortes agrupadas.

Síndrome cardiovascular-renal-metabólico, declaración de la American Heart Association de 2023.

Estimación de la filtración glomerular con la ecuación de la Chronic Kidney Disease Epidemiology Collaboration de 2021, sin variable de raza.

Calidad y aceptación: el modelo PREVENT es el más moderno y el estándar en los Estados Unidos. Su validación europea, en la cohorte poblacional CoLaus de 2025, mostró que no supera al modelo europeo SCORE2 y que tiende a subestimar el riesgo en mujeres y en personas menores de setenta años. En Europa, las guías de la Sociedad Europea de Cardiología usan el modelo SCORE2. Para México no existe un modelo nacional ampliamente validado; el resultado es orientativo, no una probabilidad calibrada.

### 2. Síndrome poliendocrino metabólico ovárico (ovario poliquístico)

Guía internacional basada en evidencia para la evaluación y el manejo del síndrome de ovario poliquístico, de 2023, coordinada desde Monash University con la European Society of Human Reproduction and Embryology, la American Society for Reproductive Medicine y sociedades internacionales. Es la guía de referencia mundial.

Criterios diagnósticos de Rotterdam, vigentes.

Nota: el renombre de la condición es de 2026 y su adopción está en curso; conviene conservar visible el término histórico.

### 3. Hemorragia uterina anormal

Sistema de clasificación de causas PALM-COEIN, de la Federación Internacional de Ginecología y Obstetricia. Es el estándar universal.

Manejo del sangrado posmenopáusico, con ecografía y muestreo endometrial, del American College of Obstetricians and Gynecologists. La referencia puntual de la actualización citada conviene confirmarla contra la fuente primaria.

Manejo del sangrado uterino anormal agudo, del American College of Obstetricians and Gynecologists.

### 4. Endometriosis

Guía de endometriosis de la European Society of Human Reproduction and Embryology, de 2022. Es la más reciente y la más aceptada internacionalmente.

Estadificación de la American Society for Reproductive Medicine, en su versión revisada.

Índice de fertilidad en endometriosis, de Adamson y Pasta, publicado en la revista Fertility and Sterility en 2010.

Clasificación Enzian para la enfermedad profunda.

Nota: la estadificación de la American Society for Reproductive Medicine correlaciona mal con el dolor y solo de forma parcial con la fertilidad; es una limitación reconocida del propio sistema.

### 5. Dolor pélvico crónico

Guías de mayor calidad metodológica según la evaluación con el instrumento AGREE II: la de la European Association of Urology y la del Royal College of Obstetricians and Gynaecologists.

Marco del American College of Obstetricians and Gynecologists, boletín de práctica número doscientos dieciocho, de 2020.

Revisión publicada en la revista Obstetrics and Gynecology en 2026.

Sistema de clasificación de la Federación Internacional de Ginecología y Obstetricia para el dolor pélvico crónico femenino, de 2025.

### 6. Menopausia

Guía clínica Menopause Practice, A Clinician's Guide, sexta edición, de The Menopause Society, de 2024, con Carolyn Crandall como editora en jefe. Es el manual clínico integral de la sociedad.

Guía de práctica clínica de menopausia de la European Society of Endocrinology, de octubre de 2025, endosada por The Endocrine Society, la European Menopause and Andropause Society y la British Menopause Society.

Recomendaciones de la International Menopause Society, de diciembre de 2025.

Declaración de posición sobre terapia hormonal de The Menopause Society, de 2022, y sobre terapia no hormonal, de 2023.

Escala de síntomas Menopause Rating Scale.

Estadificación del envejecimiento reproductivo según los estadios del Stages of Reproductive Aging Workshop, en su versión más diez.

Nota: la sección de síntomas vasomotores de la guía clínica de 2024 describe a los antagonistas del receptor de neuroquinina, la clase del fezolinetant, como experimentales y no disponibles, lo cual ya quedó atrás, porque el fezolinetant fue aprobado en 2023 y las guías de 2025 lo incorporan.

### 7. Anticoncepción

Criterios médicos de elegibilidad para el uso de anticonceptivos de la Organización Mundial de la Salud, sexta edición, de 2025. Es el estándar mundial.

Criterios médicos de elegibilidad de los Centros para el Control y la Prevención de Enfermedades, de 2024.

### 8. Riesgo de cáncer de mama

Estratificación de riesgo y tamizaje del American College of Obstetricians and Gynecologists, la American Cancer Society y el National Comprehensive Cancer Network.

Criterios de resonancia magnética de tamizaje y de derivación a consejo genético del National Comprehensive Cancer Network.

Modelos cuantitativos de riesgo de por vida: el de Tyrer y Cuzick, también conocido como IBIS, preferente para el riesgo de por vida, y el de Gail.

Nota: la decisión de resonancia de tamizaje o de quimioprevención exige correr un modelo cuantitativo; el instrumento estratifica por criterios y remite a calcularlo, no lo reemplaza.

### 9. Salud ósea

Cribado de osteoporosis de la United States Preventive Services Task Force, de 2025.

Diagnóstico por el puntaje T de la Organización Mundial de la Salud.

Herramienta de evaluación de riesgo de fractura, calibrada por país; se remite a calcularla en su calculadora oficial.

Tratamiento según la American Association of Clinical Endocrinology y la Bone Health and Osteoporosis Foundation. Como complemento, la guía de la Endocrine Society y los criterios de la International Society for Clinical Densitometry.

### 10. Incontinencia urinaria

Severidad e impacto con el International Consultation on Incontinence Questionnaire, en su forma corta. Tiene recomendación de grado A con evidencia de nivel uno, la máxima validación de su tipo.

Clasificación del tipo con la lógica del Questionnaire for Urinary Incontinence Diagnosis; como alternativa equivalente, el cuestionario de tres preguntas.

Diario miccional recomendado por la International Continence Society.

Marco del American College of Obstetricians and Gynecologists. Para el manejo especializado, las guías de la American Urological Association junto con la Society of Urodynamics, Female Pelvic Medicine and Urogenital Reconstruction.

---

## Síntesis de la auditoría bibliográfica

De los diez instrumentos, seis se apoyan en la fuente óptima y más aceptada de su campo sin reserva: síndrome poliendocrino, hemorragia, endometriosis, anticoncepción, salud ósea e incontinencia. Dos descansan en una base correcta pero que conviene complementar con lo más reciente: menopausia, ahora alineada con las guías de 2025 y el manual de 2024, y dolor pélvico, reanclado en las guías de la European Association of Urology y del Royal College of Obstetricians and Gynaecologists. Uno toma una decisión conservadora que se declara con fuerza: riesgo de mama, que remite al modelo cuantitativo. Y uno usa el mejor modelo disponible con una limitación declarada: riesgo cardiometabólico, cuya transportabilidad a población mexicana es incierta.

---

*Documento de traspaso del proyecto de instrumentos clínicos. Las verificaciones de actualidad se hicieron contra publicaciones de 2024 a 2026 de las sociedades y los grupos de trabajo correspondientes. Para citas académicas formales, confirmar cada referencia en su fuente primaria.*
