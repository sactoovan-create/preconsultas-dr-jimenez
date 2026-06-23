/**
 * Motor de las ecuaciones PREVENT (modelo base, coeficientes femeninos).
 *
 * Fuente: Khan SS y cols., Circulation 2024. Coeficientes extraídos del paquete
 * de referencia "preventr" y validados contra su caso de prueba canónico
 * (mujer de 50 años, presión 160, tratamiento antihipertensivo, colesterol total
 * 200, colesterol de alta densidad 45, diabetes, no fumadora, filtración 90,
 * índice de masa corporal 35 -> riesgo cardiovascular total a 10 años 0.147,
 * a 30 años 0.530). La transportabilidad a población mexicana debe interpretarse
 * con criterio clínico.
 *
 * Función pura: no toca el DOM. Apta para pruebas unitarias.
 */

// Coeficientes femeninos, modelo base. Orden de términos:
// age, [age^2 solo 30 años], non_hdl_c, hdl_c, sbp_lt_110, sbp_gte_110, dm,
// smoking, bmi_lt_30, bmi_gte_30, egfr_lt_60, egfr_gte_60, bp_tx, statin,
// bp_tx*sbp_gte_110, statin*non_hdl_c, age*non_hdl_c, age*hdl_c, age*sbp_gte_110,
// age*dm, age*smoking, age*bmi_gte_30, age*egfr_lt_60, constant
const COEF = {
  '10_total_cvd':[0.793933,0.030524,-0.160686,-0.2394,0.360078,0.86676,0.536074,0,0,0.604592,0.043377,0.315167,-0.147765,-0.066361,0.119788,-0.081972,0.030677,-0.094635,-0.27057,-0.078715,0,-0.163781,-3.307728],
  '10_ascvd':[0.719883,0.117697,-0.151185,-0.083536,0.359285,0.834858,0.483108,0,0,0.486462,0.039778,0.226531,-0.059237,-0.039576,0.084442,-0.056784,0.032569,-0.103598,-0.241754,-0.079114,0,-0.167149,-3.819975],
  '10_hf':[0.899823,0,0,-0.455977,0.35765,1.038346,0.583916,-0.007229,0.299771,0.745164,0.055709,0.353444,0,-0.098151,0,0,0,-0.094666,-0.358104,-0.115945,-0.003878,-0.188429,-4.310409],
  '30_total_cvd':[0.550308,-0.092837,0.040979,-0.166331,-0.162865,0.32995,0.679389,0.319611,0,0,0.18571,0.055353,0.2894,-0.075688,-0.056367,0.107102,-0.075144,0.030179,-0.099878,-0.320617,-0.160786,0,-0.145079,-1.318827],
  '30_ascvd':[0.46692,-0.089312,0.12569,-0.154225,-0.001809,0.322949,0.629671,0.268292,0,0,0.100106,0.049966,0.187529,0.015248,-0.027612,0.073615,-0.052196,0.031692,-0.10461,-0.272779,-0.153091,0,-0.129915,-1.974074],
  '30_hf':[0.625437,-0.098304,0,0,-0.391924,0.314229,0.833079,0.343865,0.059487,0.252554,0.298164,0.066716,0.333921,0,-0.089318,0,0,0,-0.09743,-0.404855,-0.198299,-0.003562,-0.156421,-2.205379]
};

const MG_DL_A_MMOL = 0.02586; // factor de conversión de colesterol

function terminos(d, treintaAnios) {
  const A = (d.edad - 55) / 10;
  const nonHdl = ((d.colesterolTotal - d.colesterolHdl) * MG_DL_A_MMOL) - 3.5;
  const hdl = ((d.colesterolHdl * MG_DL_A_MMOL) - 1.3) / 0.3;
  const sbpLt = (Math.min(d.sistolica, 110) - 110) / 20;
  const sbpGe = (Math.max(d.sistolica, 110) - 130) / 20;
  const bmiLt = (Math.min(d.imc, 30) - 25) / 5;
  const bmiGe = (Math.max(d.imc, 30) - 30) / 5;
  const egfrLt = (Math.min(d.filtracion, 60) - 60) / -15;
  const egfrGe = (Math.max(d.filtracion, 60) - 90) / -15;
  const dm = d.diabetes ? 1 : 0;
  const fuma = d.tabaquismo ? 1 : 0;
  const bpTx = d.antihipertensivo ? 1 : 0;
  const statin = d.estatina ? 1 : 0;

  const t = [A];
  if (treintaAnios) t.push(A * A);
  t.push(nonHdl, hdl, sbpLt, sbpGe, dm, fuma, bmiLt, bmiGe, egfrLt, egfrGe,
    bpTx, statin, bpTx * sbpGe, statin * nonHdl, A * nonHdl, A * hdl, A * sbpGe,
    A * dm, A * fuma, A * bmiGe, A * egfrLt, 1);
  return t;
}

function riesgo(coef, t) {
  let logit = 0;
  for (let i = 0; i < coef.length; i++) logit += coef[i] * t[i];
  return Math.exp(logit) / (1 + Math.exp(logit));
}

/**
 * Filtración glomerular estimada por la ecuación CKD-EPI 2021 (sin raza), mujer.
 */
export function egfrCkdEpi2021Mujer(creatinina, edad) {
  const k = 0.7, a1 = -0.241, a2 = -1.2;
  const v = 142 * Math.pow(Math.min(creatinina / k, 1), a1)
    * Math.pow(Math.max(creatinina / k, 1), a2)
    * Math.pow(0.9938, edad) * 1.012;
  return Math.round(v);
}

/**
 * Calcula el riesgo PREVENT a 10 y 30 años para los tres desenlaces.
 * @param {object} d Datos del paciente. Campos en unidades convencionales
 *   (miligramos por decilitro, milímetros de mercurio, mililitros por minuto).
 *   Requiere: edad, colesterolTotal, colesterolHdl, sistolica, filtracion,
 *   diabetes, tabaquismo. Opcionales: imc (necesario para insuficiencia
 *   cardiaca), antihipertensivo, estatina.
 * @returns {object|null} Riesgos en proporción (0 a 1) o null si faltan datos
 *   obligatorios o la edad está fuera del rango validado (30 a 79 años).
 */
export function calcularPrevent(d) {
  const obligatorios = ['edad', 'colesterolTotal', 'colesterolHdl', 'sistolica', 'filtracion'];
  for (const k of obligatorios) {
    if (d[k] === null || d[k] === undefined || isNaN(d[k])) return null;
  }
  if (d.diabetes === null || d.tabaquismo === null) return null;
  if (d.edad < 30 || d.edad > 79) return null;

  const datos = { ...d, imc: (d.imc ?? 25) };
  const t10 = terminos(datos, false);
  const t30 = terminos(datos, true);
  const tieneImc = d.imc !== null && d.imc !== undefined && !isNaN(d.imc);

  return {
    total10: riesgo(COEF['10_total_cvd'], t10),
    ateroesclerotica10: riesgo(COEF['10_ascvd'], t10),
    insuficienciaCardiaca10: tieneImc ? riesgo(COEF['10_hf'], t10) : null,
    total30: riesgo(COEF['30_total_cvd'], t30),
    ateroesclerotica30: riesgo(COEF['30_ascvd'], t30),
    insuficienciaCardiaca30: tieneImc ? riesgo(COEF['30_hf'], t30) : null,
  };
}
