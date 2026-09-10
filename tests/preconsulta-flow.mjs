import {
  alternarOpcion,
  alertaUrgente,
  expandirPasosProfundos,
  filtrarHistoriaActiva,
  mrsCompleta,
  normalizarTelefonoMexicano,
  pasosPara,
  porcentajePaso,
  TEMAS_CONSULTA,
  telefonoValido,
  validarPaso,
} from '../core/preconsultaFlow.js';

let ok = 0;
let fail = 0;
function t(nombre, condicion) {
  if (condicion) { ok++; console.log(`  PASA  ${nombre}`); }
  else { fail++; console.log(`  FALLA ${nombre}`); }
}

console.log('\nPreconsulta adaptativa v2');

const base = {
  demografia: { nombre: 'Ana López', edad: 43 },
  hc: {
    telefono: '+52 55 1234 5678',
    correo: 'ana@example.com',
    motivo: 'Quiero revisar sangrado irregular',
    temasConsulta: ['sangrado'],
  },
  mrs: {},
  dolor: {},
};

t('teléfono mexicano con prefijo es válido', telefonoValido(base.hc.telefono));
t('teléfono mexicano se congela en diez dígitos', normalizarTelefonoMexicano(base.hc.telefono) === '5512345678');
t('teléfono extranjero no se trunca como mexicano', !telefonoValido('+1 551 234 5678'));
t('teléfono corto no es válido', !telefonoValido('12345'));
t('inicio completo pasa', validarPaso('inicio', base).ok);
t('paso de motivo exige tema clínico', !validarPaso('motivo', { ...base, hc: { ...base.hc, temasConsulta: [] } }).ok);
t('solo agrega el módulo elegido', pasosPara(base).some((p) => p.id === 'sangrado')
  && !pasosPara(base).some((p) => p.id === 'climaterio'));
t('anticoncepción agrega plan reproductivo', pasosPara({ ...base, hc: { ...base.hc, temasConsulta: ['anticoncepcion'] } }).some((p) => p.id === 'plan-reproductivo'));
t('el portal ya no ofrece embarazo o posparto como motivo',
  !TEMAS_CONSULTA.some((tema) => tema.id === 'embarazo'));
t('un tema obstétrico heredado no abre plan reproductivo',
  !pasosPara({ ...base, hc: { ...base.hc, temasConsulta: ['embarazo'] } })
    .some((p) => p.id === 'plan-reproductivo'));
t('progreso representa la ruta activa y no envío confirmado',
  porcentajePaso('envio', pasosPara(base)) === 95 && porcentajePaso('inicio', pasosPara(base)) === 0);
const rutaClimaterioSimple = pasosPara({
  ...base,
  hc: { ...base.hc, temasConsulta: ['climaterio'] },
  mrs: {},
});
const rutaClimaterioProfunda = pasosPara({
  ...base,
  hc: { ...base.hc, temasConsulta: ['climaterio'] },
  mrs: { mrs_sequedad: 4 },
});
t('abrir preguntas específicas conserva el módulo de climaterio',
  rutaClimaterioProfunda.some((p) => p.id === 'profundizaciones')
  && rutaClimaterioProfunda.some(p => p.id === 'climaterio'));
const rutaSeparada = expandirPasosProfundos(rutaClimaterioProfunda, [
  { id: 'genitourinario', titulo: 'Salud genitourinaria' },
  { id: 'salud-sexual', titulo: 'Salud sexual' },
]);
t('cada escala profunda ocupa una etapa independiente',
  rutaSeparada.some((p) => p.id === 'profundizacion:genitourinario')
  && rutaSeparada.some((p) => p.id === 'profundizacion:salud-sexual')
  && !rutaSeparada.some((p) => p.id === 'profundizaciones'));
t('cada profundización avanza dentro de la ruta real',
  porcentajePaso('profundizacion:salud-sexual', rutaSeparada) > porcentajePaso('profundizacion:genitourinario', rutaSeparada));
t('salud general e historia viven en pasos separados y consecutivos',
  rutaClimaterioSimple.findIndex((p) => p.id === 'historia')
  === rutaClimaterioSimple.findIndex((p) => p.id === 'antecedentes') + 1);
t('dolor urgente abre su módulo aunque no se haya elegido como tema',
  pasosPara({ ...base, hc: { ...base.hc, temasConsulta: ['control'], senalesUrgencia: ['dolor_subito_intenso'] } })
    .some((p) => p.id === 'dolor'));
t('sangrado urgente abre su módulo aunque no se haya elegido como tema',
  pasosPara({ ...base, hc: { ...base.hc, temasConsulta: ['control'], senalesUrgencia: ['sangrado_abundante'] } })
    .some((p) => p.id === 'sangrado'));

let opciones = alternarOpcion([], 'dolor');
opciones = alternarOpcion(opciones, 'ninguna');
t('ninguna limpia otras opciones', opciones.length === 1 && opciones[0] === 'ninguna');
opciones = alternarOpcion(opciones, 'sangrado');
t('una opción real limpia ninguna', opciones.length === 1 && opciones[0] === 'sangrado');

const historiaSinSangrado = filtrarHistoriaActiva({
  temasConsulta: ['control'],
  sangrado: true,
  sangradoTipos: ['despues_menopausia'],
  sangradoAhora: true,
});
t('un tema desmarcado no conserva respuestas clínicas ocultas',
  historiaSinSangrado.sangrado === false
  && historiaSinSangrado.sangradoTipos.length === 0
  && historiaSinSangrado.sangradoAhora == null);
const historiaSangradoUrgente = filtrarHistoriaActiva({
  temasConsulta: ['control'],
  senalesUrgencia: ['sangrado_abundante'],
  sangradoTipos: ['muy_abundante'],
});
t('una señal urgente conserva el módulo forzado',
  historiaSangradoUrgente.sangradoTipos[0] === 'muy_abundante');

const mrsCompleto = {
  mrs_bochornos: 0, mrs_cardiaco: 0, mrs_sueno: 1, mrs_musculo: 0,
  mrs_animo: 0, mrs_irritable: 0, mrs_ansiedad: 0, mrs_agotamiento: 1,
  mrs_sexual: 0, mrs_vejiga: 0, mrs_sequedad: 0,
};
t('MRS parcial no se considera completo', !mrsCompleta({ mrs_bochornos: 0 }));
t('MRS con once respuestas sí está completo', mrsCompleta(mrsCompleto));
t('paso MRS bloquea escala parcial', !validarPaso('climaterio', { ...base, mrs: { mrs_bochornos: 0 } }).ok);
t('antecedentes exige selección explícita o ninguna',
  !validarPaso('antecedentes', { ...base, hc: { ...base.hc, antecedentesRevisados: true, antecedentesSeleccionados: [] } }).ok);

const urgente = alertaUrgente({
  hc: { senalesUrgencia: ['dolor_hombro'] },
  dolor: { intensidad: 7 },
});
t('dolor de hombro muestra orientación urgente sin ruta obstétrica', urgente.urgente && !urgente.embarazoConSintomas);
t('ninguna señal no genera alerta', !alertaUrgente({ hc: { senalesUrgencia: ['ninguna'] } }).urgente);
const alertaMaternaHeredada = alertaUrgente({
  hc: { senalesUrgencia: ['ninguna'], senalesMaternas: ['cefalea_vision'] },
});
t('las señales maternas heredadas ya no activan una ruta obstétrica',
  !alertaMaternaHeredada.urgente && alertaMaternaHeredada.senalesMaternas.length === 0);
const historiaObstetricaHeredada = filtrarHistoriaActiva({
  temasConsulta: ['embarazo', 'control'],
  etapaReproductiva: 'embarazada',
  semanasEmbarazo: 10,
  semanasPosparto: 6,
  lactancia: true,
  senalesMaternas: ['cefalea_vision'],
  posibleEmbarazo: 'confirmado',
  objetivoReproductivo: 'embarazada',
});
t('los borradores obstétricos se limpian sin borrar el resto de la historia',
  historiaObstetricaHeredada.temasConsulta.length === 1
  && historiaObstetricaHeredada.temasConsulta[0] === 'control'
  && historiaObstetricaHeredada.etapaReproductiva == null
  && historiaObstetricaHeredada.posibleEmbarazo == null
  && historiaObstetricaHeredada.semanasEmbarazo == null
  && historiaObstetricaHeredada.semanasPosparto == null
  && historiaObstetricaHeredada.lactancia == null
  && historiaObstetricaHeredada.senalesMaternas.length === 0
  && historiaObstetricaHeredada.objetivoReproductivo == null);
t('validación rechaza etapa embarazada cuando la posibilidad se marcó como no',
  !validarPaso('contexto', {
    ...base,
    hc: { ...base.hc, etapaReproductiva: 'embarazada' },
  }).ok);
t('el filtro de seguridad pasa sin preguntar por embarazo',
  validarPaso('seguridad', {
    ...base,
    hc: {
      ...base.hc,
      temasConsulta: ['control'],
      senalesUrgencia: ['ninguna'],
    },
  }).ok);
t('el contexto no depende de una respuesta de embarazo',
  validarPaso('contexto', {
    ...base,
    hc: { ...base.hc, etapaReproductiva: 'menstrua_regular' },
  }).ok);

console.log(`\nResultado flujo v2: ${ok} pasan, ${fail} fallan.`);
if (fail) process.exit(1);
