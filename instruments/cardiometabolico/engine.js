import { calcularPrevent, egfrCkdEpi2021Mujer } from '../../core/prevent.js';
import { imcSeguro } from '../../core/antropometria.js';

/**
 * Lógica clínica de la calculadora cardiometabólica. Funciones puras: reciben el
 * paciente y devuelven el resultado estructurado. Sin estado ni DOM, aptas para
 * pruebas unitarias.
 *
 * Estadiaje según la Guía 2026 del Síndrome Cardiovascular-Renal-Metabólico
 * (American Heart Association, American College of Cardiology, American Diabetes
 * Association, American Society of Nephrology). El estadiaje aplica umbrales
 * convencionales y es orientativo; la decisión final corresponde al médico.
 */

const v = (x) => x !== null && x !== undefined && !isNaN(x);

export function calcularDerivados(p) {
  const { peso, talla } = p.signos;
  const imc = imcSeguro(peso, talla);
  const { creat, egfr } = p.labs;
  const { edad } = p.demografia;
  // Usar la filtración que el laboratorio ya reporta (por ejemplo OLAB) si está
  // disponible; si no, calcularla de la creatinina con CKD-EPI 2021.
  let filtracion = null;
  if (v(egfr)) filtracion = egfr;
  else if (v(creat) && v(edad)) filtracion = egfrCkdEpi2021Mujer(creat, edad);
  return { imc, filtracion };
}

export function riesgoPrevent(p, derivados) {
  return calcularPrevent({
    edad: p.demografia.edad,
    colesterolTotal: p.labs.ct,
    colesterolHdl: p.labs.hdl,
    sistolica: p.signos.sistolica,
    filtracion: derivados.filtracion,
    imc: derivados.imc,
    diabetes: p.antecedentes.diabetes,
    tabaquismo: p.antecedentes.tabaquismo,
    antihipertensivo: p.antecedentes.antihipertensivo,
    estatina: p.antecedentes.estatina,
  });
}

export function calcularEstadio(p, derivados, prevent) {
  const { imc, filtracion } = derivados;
  const { sistolica, diastolica, circunferencia } = p.signos;
  const { ct, hdl, tg, glu, hba1c, uacr } = p.labs;
  const a = p.antecedentes;

  const adiposidad = (v(imc) && imc >= 25) || (v(circunferencia) && circunferencia >= 80);
  const prediabetes = (v(glu) && glu >= 100 && glu < 126) || (v(hba1c) && hba1c >= 5.7 && hba1c < 6.5);
  const hipertension = (v(sistolica) && sistolica >= 130) || (v(diastolica) && diastolica >= 80) || a.antihipertensivo === true;
  const hipertrig = v(tg) && tg >= 150;
  const hdlBajo = v(hdl) && hdl < 50;
  const diabetes = a.diabetes === true || (v(glu) && glu >= 126) || (v(hba1c) && hba1c >= 6.5);

  let sm = 0;
  if (v(circunferencia) && circunferencia >= 80) sm++;
  if (v(tg) && tg >= 150) sm++;
  if (v(hdl) && hdl < 50) sm++;
  if ((v(sistolica) && sistolica >= 130) || (v(diastolica) && diastolica >= 85) || a.antihipertensivo === true) sm++;
  if ((v(glu) && glu >= 100) || diabetes) sm++;
  const sindromeMetabolico = sm >= 3;

  const erc = (v(filtracion) && filtracion < 60) || (v(uacr) && uacr >= 30);
  const ercMuyAlto = (v(filtracion) && filtracion < 30)
    || (v(filtracion) && filtracion < 45 && v(uacr) && uacr >= 30)
    || (v(uacr) && uacr >= 300);
  const factoresMetabolicos = hipertension || hipertrig || hdlBajo || diabetes || sindromeMetabolico;
  const riesgo20 = prevent && prevent.total10 >= 0.20;

  let numero = 0; let justificacion = '';
  if (a.ecvEstablecida === true) {
    numero = 4; justificacion = 'Enfermedad cardiovascular clínica establecida.';
  } else if (a.ecvSubclinica === true || ercMuyAlto || riesgo20) {
    numero = 3;
    const r = [];
    if (a.ecvSubclinica === true) r.push('enfermedad subclínica documentada');
    if (ercMuyAlto) r.push('enfermedad renal de muy alto riesgo');
    if (riesgo20) r.push('riesgo a diez años igual o mayor al veinte por ciento');
    justificacion = 'Equivalente de riesgo: ' + r.join('; ') + '.';
  } else if (factoresMetabolicos || erc) {
    numero = 2;
    const r = [];
    if (hipertension) r.push('hipertensión');
    if (diabetes) r.push('diabetes tipo 2');
    if (hipertrig) r.push('hipertrigliceridemia');
    if (hdlBajo) r.push('colesterol de alta densidad bajo');
    if (sindromeMetabolico) r.push('síndrome metabólico');
    if (erc) r.push('enfermedad renal crónica');
    justificacion = 'Factores presentes: ' + r.join(', ') + '.';
  } else if (adiposidad || prediabetes) {
    numero = 1;
    const r = [];
    if (v(imc) && imc >= 25) r.push('índice de masa corporal elevado');
    if (v(circunferencia) && circunferencia >= 80) r.push('adiposidad abdominal');
    if (prediabetes) r.push('disglucemia en rango de prediabetes');
    justificacion = r.join(', ') + ', sin factores de estadios superiores.';
  } else {
    justificacion = 'Sin componentes detectados con los datos capturados.';
  }

  return { numero, justificacion, flags: { adiposidad, prediabetes, hipertension, hipertrig, hdlBajo, diabetes, sindromeMetabolico, erc, ercMuyAlto } };
}

export function conductaPorEstadio(estadio, flags, p, derivados) {
  const e = estadio.numero;
  if (e <= 1) {
    const obeso = v(derivados.imc) && derivados.imc >= 30;
    const sop = p.antecedentes.sindromePoliendocrino;
    let t = 'Estilo de vida estructurado: actividad física y nutrición. Reevaluación anual con la batería completa.';
    if (obeso || sop) t += ' Ante obesidad o síndrome poliendocrino metabólico ovárico, considerar agonistas del receptor del péptido similar al glucagón tipo 1, iniciar o derivar para iniciar.';
    return { nivel: 'manejo', etiqueta: 'Manejo en tu consulta', texto: t };
  }
  if (e === 2) {
    let t = 'Coordinar con medicina interna o endocrinología para diabetes y factores metabólicos. Iniciar lo que competa: control de presión, estatina según riesgo.';
    if (flags.erc) t += ' Sumar nefrología por enfermedad renal y, en diabetes con enfermedad renal, inhibidores del cotransportador de sodio-glucosa tipo 2. Designar el punto de coordinación del cuidado.';
    return { nivel: 'coordinar', etiqueta: 'Coordinar manejo', texto: t };
  }
  if (e === 3) {
    return { nivel: 'estratificar', etiqueta: 'Estratificar con cardiología', texto: 'Cardiología para estratificación y manejo intensivo de todos los factores. Punto de coordinación formal entre especialidades.' };
  }
  return { nivel: 'multidisciplinario', etiqueta: 'Manejo multidisciplinario', texto: 'Dirigido por cardiología. Rol ginecológico de soporte y continuidad. Verificar la pertinencia de cualquier terapia hormonal dentro del cuadro establecido.' };
}

export function evaluarTerapiaHormonal(p, prevent) {
  const { etapaReproductiva, edad, edadMenopausia, histerectomia } = p.demografia;
  if (etapaReproductiva !== 'peri' && etapaReproductiva !== 'post') return null;
  const a = p.antecedentes;

  const contra = [];
  if (a.cancerMama) contra.push('cáncer de mama');
  // Verdad-suave (no === true) para coincidir con el motor de menopausia y para
  // fallar del lado seguro si el expediente inyecta la condición como valor
  // verdadero no booleano (por ejemplo 1 o "sí") al mapear pacienteInicial.
  if (a.ecvEstablecida) contra.push('enfermedad cardiovascular establecida');
  if (a.tromboembolismo) contra.push('tromboembolismo venoso o trombofilia');
  if (a.hepatica) contra.push('enfermedad hepática activa');
  if (a.sangradoNoDx) contra.push('sangrado vaginal no diagnosticado');

  const aniosMeno = (v(edadMenopausia) && v(edad) && etapaReproductiva === 'post') ? edad - edadMenopausia : null;
  const enVentana = v(edad) && edad < 60 && (aniosMeno === null || aniosMeno < 10) && etapaReproductiva !== 'pre';
  const asc = prevent ? prevent.ateroesclerotica10 : null;

  if (contra.length) {
    return { tipo: 'contra', titulo: 'Terapia hormonal sistémica no recomendada', detalle: 'Contraindicación presente: ' + contra.join(', ') + '.' };
  }
  if (enVentana) {
    let via = 'oral o transdérmica', clase = 'favorable';
    if (asc != null) {
      if (asc >= 0.10) { via = 'transdérmica, con cautela'; clase = 'cautela'; }
      else if (asc >= 0.05) { via = 'preferentemente transdérmica'; clase = 'cautela'; }
    }
    return {
      tipo: clase, titulo: 'Ventana de oportunidad favorable',
      detalle: 'Menor de sesenta años y dentro de los diez años de la menopausia. Vía sugerida: ' + via + '.',
      progestageno: histerectomia !== true,
    };
  }
  return { tipo: 'cautela', titulo: 'Fuera de la ventana de inicio', detalle: 'No se recomienda iniciar terapia sistémica de rutina por mayor riesgo cardiovascular, de evento vascular cerebral y de tromboembolismo.' };
}

// Filas con interpretación neutra para la hoja de la paciente.
function filasPaciente(p, derivados) {
  const med = [], lab = [];
  const { sistolica, diastolica, circunferencia } = p.signos;
  const { imc, filtracion } = derivados;
  const { ct, hdl, tg, glu, hba1c, uacr } = p.labs;
  const f = (parametro, valor, unidad, meta, ok) => ({ parametro, valor, unidad, meta, ok });

  if (v(sistolica) && v(diastolica)) med.push(f('Presión arterial', `${sistolica}/${diastolica}`, 'mmHg', 'Meta: menor de 130/80', sistolica < 130 && diastolica < 80));
  if (v(imc)) med.push(f('Índice de masa corporal', imc.toFixed(1), 'kg/m²', 'Meta: 18.5 a 24.9', imc >= 18.5 && imc < 25));
  if (v(circunferencia)) med.push(f('Circunferencia abdominal', circunferencia, 'cm', 'Meta: menor de 80', circunferencia < 80));

  if (v(glu)) lab.push(f('Glucosa en ayuno', glu, 'mg/dL', 'Meta: menor de 100', glu < 100));
  if (v(hba1c)) lab.push(f('Hemoglobina glucosilada', hba1c, '%', 'Meta: menor de 5.7', hba1c < 5.7));
  if (v(ct)) lab.push(f('Colesterol total', ct, 'mg/dL', 'Meta: menor de 200', ct < 200));
  if (v(hdl)) lab.push(f('Colesterol de alta densidad', hdl, 'mg/dL', 'Meta: mayor de 50', hdl >= 50));
  if (v(tg)) lab.push(f('Triglicéridos', tg, 'mg/dL', 'Meta: menor de 150', tg < 150));
  if (v(filtracion)) lab.push(f('Función renal (filtración glomerular)', filtracion, 'mL/min', 'Meta: mayor de 60', filtracion >= 60));
  if (v(uacr)) lab.push(f('Albúmina en orina', uacr, 'mg/g', 'Meta: menor de 30', uacr < 30));

  return [
    { titulo: 'Tus mediciones', filas: med },
    { titulo: 'Tus análisis de laboratorio', filas: lab },
  ];
}

/** Evaluación completa. Punto de entrada del motor. */
export function evaluarCardiometabolico(p) {
  const derivados = calcularDerivados(p);
  const prevent = riesgoPrevent(p, derivados);
  const estadio = calcularEstadio(p, derivados, prevent);
  const conducta = conductaPorEstadio(estadio, estadio.flags, p, derivados);
  const terapiaHormonal = evaluarTerapiaHormonal(p, prevent);

  const hojaPaciente = {
    identificacion: { nombre: p.demografia.nombre, edad: p.demografia.edad },
    titulo: 'Resumen de tu evaluación',
    intro: 'Este es el registro de tus mediciones y análisis de hoy. Consérvalo y coméntalo en tu próxima consulta para dar seguimiento a tu salud.',
    secciones: filasPaciente(p, derivados),
    recomendaciones: [
      'Realiza actividad física la mayoría de los días de la semana.',
      'Prefiere verduras, fruta, cereales integrales y proteínas magras; modera azúcares, harinas refinadas y sal.',
      'Si fumas, dejar el tabaco es la medida que más protege tu corazón.',
      'Acude a tus citas de seguimiento y realiza los estudios que se te indiquen.',
    ],
    pie: 'Documento informativo para la paciente. Un valor fuera de meta no representa por sí solo un diagnóstico; su interpretación corresponde a tu médico. Hoja emitida por el consultorio del Dr. Iván Jiménez Martínez.',
  };

  return { derivados, prevent, estadio, conducta, terapiaHormonal, hojaPaciente };
}
