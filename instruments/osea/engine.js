/**
 * Lógica del instrumento de Salud Ósea. Funciones puras.
 *
 * Enfoque: cribado densitométrico, diagnóstico por puntaje T e indicación de
 * tratamiento según criterios reproducibles de guía (United States Preventive
 * Services Task Force 2025, American Association of Clinical Endocrinology y Bone
 * Health and Osteoporosis Foundation). Captura los factores del FRAX (Fracture
 * Risk Assessment Tool) pero no reproduce su porcentaje, que es un modelo
 * calibrado por país; en la zona de osteopenia, remite a calcularlo.
 *
 * Cortes diagnósticos (Organización Mundial de la Salud), puntaje T en cuello
 * femoral, cadera total o columna:
 *   mayor o igual a menos uno: normal.
 *   entre menos uno y menos dos punto cinco: masa ósea baja (osteopenia).
 *   menor o igual a menos dos punto cinco: osteoporosis.
 *
 * Cubre mujeres adultas. Instrumento de apoyo a la decisión.
 */

const v = (x) => x !== null && x !== undefined && !isNaN(x);

export function factoresRiesgo(d) {
  const f = [];
  if (d.imcBajo) f.push('Bajo peso corporal');
  if (d.fracturaFragilidad) f.push('Fractura por fragilidad previa');
  if (d.fracturaParental) f.push('Fractura de cadera en un progenitor');
  if (d.tabaquismo) f.push('Tabaquismo activo');
  if (d.glucocorticoides) f.push('Glucocorticoides por tres meses o más');
  if (d.artritisReumatoide) f.push('Artritis reumatoide');
  if (d.osteoporosisSecundaria) f.push('Causa de osteoporosis secundaria');
  if (d.alcohol) f.push('Consumo de alcohol de tres unidades o más al día');
  if (d.menopausiaPrecoz) f.push('Menopausia precoz o insuficiencia ovárica primaria');
  return f;
}

/** ¿Está indicada la densitometría? */
export function evaluarCribado(d, factores) {
  if (d.tieneDensitometria) return { indica: false, motivo: 'Ya cuenta con densitometría; se interpreta su resultado.' };
  if (v(d.edad) && d.edad >= 65) return { indica: true, motivo: 'Mujer de sesenta y cinco años o más: densitometría indicada.' };
  if (d.menopausiaPrecoz) return { indica: true, motivo: 'Menopausia precoz o insuficiencia ovárica: densitometría indicada.' };
  if (d.posmenopausica && factores.length > 0) return { indica: true, motivo: 'Posmenopáusica menor de sesenta y cinco años con factores de riesgo: densitometría indicada. Para afinar el umbral puede usarse el FRAX (referencia de fractura mayor a diez años del ocho punto cuatro por ciento o más).' };
  if (d.posmenopausica) return { indica: false, motivo: 'Posmenopáusica sin factores de riesgo: la densitometría puede diferirse; reevaluar con la edad o ante nuevos factores.' };
  return { indica: false, motivo: 'Sin criterios de cribado por el momento; reforzar medidas de salud ósea.' };
}

/** Interpreta el puntaje T. */
export function interpretarDensitometria(tScore) {
  if (!v(tScore)) return null;
  if (tScore >= -1.0) return { categoria: 'normal', etiqueta: 'Densidad ósea normal', estado: 'ok' };
  if (tScore > -2.5) return { categoria: 'osteopenia', etiqueta: 'Masa ósea baja (osteopenia)', estado: 'aviso' };
  return { categoria: 'osteoporosis', etiqueta: 'Osteoporosis', estado: 'alerta' };
}

/** Indicación de tratamiento farmacológico. */
export function evaluarTratamiento(d, dx) {
  // Fractura de cadera o vértebra: tratar, con independencia del puntaje T.
  if (d.fracturaCaderaVertebra) {
    return { indica: true, base: 'Fractura por fragilidad de cadera o vértebra: el tratamiento está indicado con independencia del puntaje T.' };
  }
  if (dx && dx.categoria === 'osteoporosis') {
    return { indica: true, base: 'Puntaje T de menos dos punto cinco o menor: tratamiento indicado.' };
  }
  if (dx && dx.categoria === 'osteopenia') {
    return { indica: 'condicional', base: 'Masa ósea baja: calcular el FRAX; el tratamiento se indica si la probabilidad a diez años es del veinte por ciento o más para fractura mayor, o del tres por ciento o más para fractura de cadera.' };
  }
  if (dx && dx.categoria === 'normal') {
    return { indica: false, base: 'Densidad normal: no se indica tratamiento farmacológico; mantener medidas y repetir la densitometría según el riesgo.' };
  }
  return { indica: false, base: 'Sin densitometría aún; la indicación se define tras el estudio.' };
}

export function orientacionGeneral(d, dx) {
  const o = [];
  o.push('Calcio y vitamina D suficientes, idealmente desde la alimentación.');
  o.push('Ejercicio con carga de peso y de fortalecimiento, al menos tres días por semana.');
  o.push('Suspender el tabaco y moderar el alcohol.');
  o.push('Prevención de caídas: revisar visión, fármacos sedantes y seguridad del hogar.');
  if (dx && dx.categoria === 'osteoporosis') {
    o.push('Investigar causas secundarias con estudios de laboratorio antes de iniciar el tratamiento.');
  }
  return o;
}

export function evaluarOsea(paciente, datos) {
  const dem = paciente.demografia, sig = paciente.signos;
  let imcBajo = datos.imcBajo;
  if (v(sig.peso) && v(sig.talla)) {
    const imc = sig.peso / Math.pow(sig.talla / 100, 2);
    imcBajo = imc < 19;
  }
  const posmenopausica = datos.posmenopausica || v(dem.edadMenopausia);
  const menopausiaPrecoz = datos.menopausiaPrecoz || (v(dem.edadMenopausia) && dem.edadMenopausia < 45);
  const d = { ...datos, edad: dem.edad, imcBajo, posmenopausica, menopausiaPrecoz };

  const factores = factoresRiesgo(d);
  const cribado = evaluarCribado(d, factores);
  const dx = interpretarDensitometria(d.tieneDensitometria ? d.tScore : null);
  const tratamiento = evaluarTratamiento(d, dx);
  const orientacion = orientacionGeneral(d, dx);
  const hojaPaciente = construirHojaPaciente(paciente, dx, cribado);
  return { factores, cribado, dx, tratamiento, orientacion, hojaPaciente };
}

function construirHojaPaciente(p, dx, cribado) {
  const filas = [];
  const reco = [
    'Cuida tus huesos con suficiente calcio y vitamina D, y con ejercicio que incluya caminar y fortalecer.',
    'Evita el tabaco y modera el alcohol; ambos debilitan el hueso.',
    'Si tienes riesgo de caídas, cuidar la visión y la seguridad en casa ayuda a prevenir fracturas.',
  ];
  if (dx && dx.categoria === 'osteoporosis') reco.unshift('Tus huesos requieren atención y existe tratamiento eficaz; lo revisaremos en consulta.');
  else if (dx && dx.categoria === 'osteopenia') reco.unshift('Tienes una disminución leve de la densidad ósea que conviene vigilar y cuidar.');
  else if (cribado.indica) reco.unshift('Te recomendamos un estudio de densidad ósea para conocer cómo están tus huesos.');

  return {
    identificacion: { nombre: p.demografia.nombre, edad: p.demografia.edad },
    titulo: 'Tu evaluación de salud ósea',
    intro: 'Este es el resumen de tu evaluación de hoy, para cuidar la fortaleza de tus huesos y prevenir fracturas.',
    secciones: filas.length ? [{ titulo: 'Tu resultado', filas }] : [],
    recomendaciones: reco,
    pie: 'Documento informativo para la paciente. La indicación final corresponde a tu médico. Hoja emitida por el consultorio del Dr. Iván Jiménez Martínez.',
  };
}
