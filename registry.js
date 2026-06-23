/**
 * Registro de instrumentos del módulo.
 *
 * Cada entrada es un apartado de la navegación. Para agregar una calculadora o
 * cuestionario nuevo, basta con crear su componente e incorporarlo aquí; el
 * contenedor (InstrumentosModule) lo lista y lo monta automáticamente.
 *
 * Contrato de un instrumento:
 *   - id:          identificador único (string)
 *   - titulo:      nombre del apartado
 *   - descripcion: una línea para la tarjeta de navegación
 *   - tipo:        'calculadora' (score o modelo) o 'cuestionario' (instrumento
 *                  diagnóstico estructurado con orientación a tratamiento)
 *   - estado:      'activo' o 'construccion'
 *   - Componente:  componente de React. Recibe, vía contexto, el paciente
 *                  compartido (usePaciente). No necesita props.
 */

import Cardiometabolico from './instruments/cardiometabolico/Cardiometabolico.jsx';
import Sop from './instruments/sop/Sop.jsx';
import Endometriosis from './instruments/endometriosis/Endometriosis.jsx';
import Hemorragia from './instruments/hemorragia/Hemorragia.jsx';
import DolorPelvico from './instruments/dolor-pelvico/DolorPelvico.jsx';
import Menopausia from './instruments/menopausia/Menopausia.jsx';
import Anticoncepcion from './instruments/anticoncepcion/Anticoncepcion.jsx';
import Mama from './instruments/mama/Mama.jsx';
import Osea from './instruments/osea/Osea.jsx';
import Incontinencia from './instruments/incontinencia/Incontinencia.jsx';

export const INSTRUMENTOS = [
  {
    id: 'cardiometabolico',
    titulo: 'Riesgo cardiometabólico',
    descripcion: 'Estadiaje del síndrome cardiovascular-renal-metabólico y riesgo a diez y treinta años.',
    tipo: 'calculadora',
    estado: 'activo',
    Componente: Cardiometabolico,
  },
  {
    id: 'sop',
    titulo: 'Síndrome poliendocrino ovárico',
    descripcion: 'Diagnóstico por criterios de Rotterdam, fenotipo, cribado metabólico y orientación a tratamiento.',
    tipo: 'calculadora',
    estado: 'activo',
    Componente: Sop,
  },
  {
    id: 'endometriosis',
    titulo: 'Endometriosis',
    descripcion: 'Diagnóstico clínico, estadificación revisada, Enzian, índice de fertilidad y orientación a tratamiento.',
    tipo: 'cuestionario',
    estado: 'activo',
    Componente: Endometriosis,
  },
  {
    id: 'hemorragia',
    titulo: 'Hemorragia uterina anormal',
    descripcion: 'Sistemas FIGO 1 y 2, manejo agudo y crónico, sangrado posmenopáusico y orientación a tratamiento.',
    tipo: 'cuestionario',
    estado: 'activo',
    Componente: Hemorragia,
  },
  {
    id: 'dolor-pelvico',
    titulo: 'Dolor pélvico crónico',
    descripcion: 'Caracterización, diagnóstico diferencial por sistemas, sensibilización central y tratamiento multimodal.',
    tipo: 'cuestionario',
    estado: 'activo',
    Componente: DolorPelvico,
  },
  {
    id: 'menopausia',
    titulo: 'Menopausia y terapia hormonal',
    descripcion: 'Menopause Rating Scale, candidatura a terapia hormonal, insuficiencia ovárica primaria y alternativas no hormonales.',
    tipo: 'cuestionario',
    estado: 'activo',
    Componente: Menopausia,
  },
  {
    id: 'anticoncepcion',
    titulo: 'Anticoncepción',
    descripcion: 'Elegibilidad por método según los criterios de la Organización Mundial de la Salud, con detección automática de condiciones.',
    tipo: 'cuestionario',
    estado: 'activo',
    Componente: Anticoncepcion,
  },
  {
    id: 'mama',
    titulo: 'Riesgo de cáncer de mama',
    descripcion: 'Estratificación por criterios de guía, conducta de tamizaje, resonancia y derivación a consejo genético.',
    tipo: 'cuestionario',
    estado: 'activo',
    Componente: Mama,
  },
  {
    id: 'osea',
    titulo: 'Salud ósea',
    descripcion: 'Cribado densitométrico, diagnóstico por puntaje T e indicación de tratamiento, con los factores del FRAX.',
    tipo: 'cuestionario',
    estado: 'activo',
    Componente: Osea,
  },
  {
    id: 'incontinencia',
    titulo: 'Incontinencia urinaria',
    descripcion: 'Identificación, clasificación del tipo, severidad, hábitos de vejiga, diario miccional y orientación.',
    tipo: 'cuestionario',
    estado: 'activo',
    Componente: Incontinencia,
  },
];
