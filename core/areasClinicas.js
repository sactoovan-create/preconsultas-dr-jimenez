// Los colores identifican áreas, nunca severidad o diagnóstico.
export const AREAS_CLINICAS = {
  general: { nombre: 'Consulta general', color: '#285743', fondo: '#edf5f0', icono: 'clipboard' },
  hormonal: { nombre: 'Salud hormonal', color: '#765b11', fondo: '#fff8df', icono: 'sun' },
  ciclos: { nombre: 'Ciclos y metabolismo', color: '#5a4995', fondo: '#f3efff', icono: 'cycle' },
  dolor: { nombre: 'Dolor pélvico', color: '#784782', fondo: '#f8eefb', icono: 'activity' },
  sangrado: { nombre: 'Salud menstrual', color: '#954a19', fondo: '#fff1e6', icono: 'drop' },
  urinario: { nombre: 'Vejiga y piso pélvico', color: '#086b73', fondo: '#eaf8f8', icono: 'waves' },
  mama: { nombre: 'Salud mamaria', color: '#9b3861', fondo: '#fff0f6', icono: 'ribbon' },
  cardio: { nombre: 'Salud cardiometabólica', color: '#265f9a', fondo: '#edf5ff', icono: 'heart' },
  osea: { nombre: 'Salud ósea', color: '#5b641c', fondo: '#f5f7e6', icono: 'bone' },
  sexual: { nombre: 'Salud íntima', color: '#825044', fondo: '#fbf1ed', icono: 'flower' },
  prevencion: { nombre: 'Prevención y anticoncepción', color: '#2b6570', fondo: '#edf6f8', icono: 'shield' },
};
const mapa = {
  menopausia: 'hormonal', climaterio: 'hormonal', sop: 'ciclos', ciclos: 'ciclos',
  endometriosis: 'dolor', 'dolor-pelvico': 'dolor', dolor: 'dolor',
  hemorragia: 'sangrado', sangrado: 'sangrado', incontinencia: 'urinario', urinario: 'urinario', 'piso-pelvico': 'urinario',
  cardiometabolico: 'cardio', metabolico: 'cardio', mama: 'mama', osea: 'osea',
  anticoncepcion: 'prevencion', 'plan-reproductivo': 'prevencion', cervical: 'prevencion', prevencion: 'prevencion',
  intimidad: 'sexual', 'salud-sexual': 'sexual', genitourinario: 'sexual', vulvar: 'sexual',
};
export function areaClinica(id) { return AREAS_CLINICAS[mapa[String(id).replace('profundizacion:', '')] || 'general']; }
export function estiloArea(id) {
  const area = areaClinica(id);
  return { '--area-color': area.color, '--area-fondo': area.fondo };
}
