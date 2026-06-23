/**
 * Registro de la evidencia que sustenta cada instrumento, con la fecha en que se
 * revisó por última vez. Da trazabilidad (de dónde sale cada umbral) y permite
 * vigilar la vigencia: las guías cambian, como ocurrió con el renombre del
 * síndrome poliendocrino. Al actualizar una guía, se ajusta aquí la entrada.
 */

export const EVIDENCIA = {
  cardiometabolico: {
    revisado: 'junio de 2026',
    fuentes: [
      'Ecuaciones PREVENT, American Heart Association (Circulation, 2024)',
      'Síndrome cardiovascular-renal-metabólico, declaración de la American Heart Association (2023)',
      'Estimación de la filtración glomerular CKD-EPI 2021, sin variable de raza',
      'Limitación declarada: las ecuaciones PREVENT se derivaron en población estadounidense; la validación europea (cohorte CoLaus, 2025) mostró que no superan al modelo SCORE2 fuera de los Estados Unidos y que tienden a subestimar el riesgo en mujeres y en menores de setenta años. En población mexicana el resultado es orientativo, no una probabilidad calibrada.',
    ],
  },
  sop: {
    revisado: 'junio de 2026',
    fuentes: [
      'Guía internacional basada en evidencia para el síndrome poliendocrino ovárico (2023)',
      'Criterios de Rotterdam, European Society of Human Reproduction and Embryology (vigentes hasta 2028)',
      'Renombre a síndrome poliendocrino metabólico ovárico, consenso publicado en The Lancet (2026)',
    ],
  },
  hemorragia: {
    revisado: 'junio de 2026',
    fuentes: [
      'Sistema de clasificación PALM-COEIN, International Federation of Gynecology and Obstetrics',
      'Manejo del sangrado posmenopáusico con ecografía y muestreo endometrial, American College of Obstetricians and Gynecologists; referencia puntual por confirmar contra la fuente primaria',
      'Manejo del sangrado uterino anormal agudo, American College of Obstetricians and Gynecologists',
    ],
  },
  endometriosis: {
    revisado: 'junio de 2026',
    fuentes: [
      'Guía de endometriosis, European Society of Human Reproduction and Embryology (2022)',
      'Clasificación revisada de la American Society for Reproductive Medicine, clasificación Enzian e índice de fertilidad de la endometriosis',
    ],
  },
  'dolor-pelvico': {
    revisado: 'junio de 2026',
    fuentes: [
      'Guías de mayor calidad metodológica según el instrumento de evaluación AGREE II: European Association of Urology y Royal College of Obstetricians and Gynaecologists',
      'Marco del American College of Obstetricians and Gynecologists y revisión de Obstetrics and Gynecology (2026)',
      'Sistema de clasificación de la International Federation of Gynecology and Obstetrics para el dolor pélvico crónico femenino (2025)',
    ],
  },
  menopausia: {
    revisado: 'junio de 2026',
    fuentes: [
      'Guía clínica de The Menopause Society: Menopause Practice, A Clinician\u2019s Guide, sexta edición (2024)',
      'Guía de práctica clínica de la European Society of Endocrinology (octubre de 2025), endosada por The Endocrine Society, la European Menopause and Andropause Society y la British Menopause Society',
      'Recomendaciones de la International Menopause Society (diciembre de 2025)',
      'Posición de terapia hormonal de The Menopause Society (2022) y de terapia no hormonal (2023)',
      'Escala de síntomas Menopause Rating Scale; estadificación del envejecimiento reproductivo según los estadios del Stages of Reproductive Aging Workshop',
    ],
  },
  anticoncepcion: {
    revisado: 'junio de 2026',
    fuentes: [
      'Criterios médicos de elegibilidad para el uso de anticonceptivos, Organización Mundial de la Salud, sexta edición (2025, revisión de 2024)',
      'Adaptación de los Centros para el Control y la Prevención de Enfermedades de Estados Unidos (2024)',
    ],
  },
  mama: {
    revisado: 'junio de 2026',
    fuentes: [
      'Estratificación de riesgo y tamizaje, American College of Obstetricians and Gynecologists, American Cancer Society y National Comprehensive Cancer Network',
      'Criterios de resonancia magnética y derivación a consejo genético, National Comprehensive Cancer Network',
      'La decisión de resonancia de tamizaje o de quimioprevención exige estimar el riesgo de por vida con un modelo cuantitativo, el de Tyrer y Cuzick (preferente para riesgo de por vida) o el de Gail. Este instrumento estratifica por criterios y remite a calcular ese riesgo; no lo reemplaza.',
    ],
  },
  osea: {
    revisado: 'junio de 2026',
    fuentes: [
      'Cribado de osteoporosis, United States Preventive Services Task Force (2025)',
      'Diagnóstico por puntaje T, Organización Mundial de la Salud; criterios de tratamiento, American Association of Clinical Endocrinology y Bone Health and Osteoporosis Foundation',
      'Factores clínicos del Fracture Risk Assessment Tool',
    ],
  },
  incontinencia: {
    revisado: 'junio de 2026',
    fuentes: [
      'Evaluación de la incontinencia urinaria, American College of Obstetricians and Gynecologists',
      'Clasificación del tipo con la lógica del Questionnaire for Urinary Incontinence Diagnosis y severidad con el International Consultation on Incontinence Questionnaire (forma corta)',
      'Diario miccional recomendado por la International Continence Society',
    ],
  },
};

export function evidenciaDe(id) {
  return EVIDENCIA[id] || null;
}
