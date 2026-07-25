import { instrumentosPara } from '../core/ruteoClinico.js';
let ok = 0, fail = 0;
const has = (r, id) => r.instrumentosSugeridos.some((s) => s.instrumento === id);
const prio = (r, id) => (r.instrumentosSugeridos.find((s) => s.instrumento === id) || {}).prioridad;
function t(nombre, cond) { if (cond) { ok++; console.log('  PASA ', nombre); } else { fail++; console.log('  FALLA', nombre); } }

// 1) Posmenopáusica con síntomas + diabetes
const r1 = instrumentosPara({ paciente: { edad: 54 }, autoReporte: { mrs: {
  mrs_bochornos: 4, mrs_cardiaco: 0, mrs_sueno: 3, mrs_musculo: 3,
  mrs_animo: 3, mrs_irritable: 0, mrs_ansiedad: 0, mrs_agotamiento: 0,
  mrs_sexual: 0, mrs_vejiga: 0, mrs_sequedad: 3,
}, dolor: {}, hc: { enfDiabetes: true, etapaReproductiva: 'menopausia' } }, resumen: {} });
console.log('\n[1] Posmenopáusica 54 con MRS alto + diabetes:'); r1.instrumentosSugeridos.forEach((s) => console.log(`   - ${s.prioridad.toUpperCase()} · ${s.nombre} — ${s.motivo}`));
t('sugiere menopausia', has(r1, 'menopausia'));
t('cardiometabolico ALTA por diabetes', prio(r1, 'cardiometabolico') === 'alta');
t('no sugiere ósea universal antes de 65 sin factor', !has(r1, 'osea'));

// 2) Joven con dolor pélvico + ciclos irregulares + acné
const r2 = instrumentosPara({ paciente: { edad: 26 }, autoReporte: { mrs: {}, dolor: { tiene: true, intensidad: 7, meses: 8, asociados: ['menstruacion'] }, hc: { reglasRegulares: false, acne: true } } });
console.log('\n[2] Joven 26 con dolor 7/10 + ciclos irregulares + acné:'); r2.instrumentosSugeridos.forEach((s) => console.log(`   - ${s.prioridad.toUpperCase()} · ${s.nombre} — ${s.motivo}`));
t('dolor-pelvico ALTA', prio(r2, 'dolor-pelvico') === 'alta');
t('endometriosis sugerida', has(r2, 'endometriosis'));
t('sop ALTA (ciclos + androgénico)', prio(r2, 'sop') === 'alta');

// 3) En tirzepatida
const r3 = instrumentosPara({ paciente: { edad: 45 }, autoReporte: { mrs: {}, dolor: {}, hc: { medicamentos: 'Mounjaro 5 mg subcutáneo semanal' } } });
console.log('\n[3] 45 en Mounjaro:'); r3.instrumentosSugeridos.forEach((s) => console.log(`   - ${s.prioridad.toUpperCase()} · ${s.nombre} — ${s.motivo}`));
t('no sugiere seguimiento-metabolico (vive en ERP)', !has(r3, 'seguimiento-metabolico'));
t('cardiometabolico ALTA', prio(r3, 'cardiometabolico') === 'alta');

// 4) Sangrado posmenopáusico -> bandera roja
const r4 = instrumentosPara({ paciente: { edad: 58 }, autoReporte: { mrs: {}, dolor: {}, hc: { sangrado: true } } });
const r4Etapa = instrumentosPara({ paciente: { edad: 58 }, autoReporte: { mrs: {}, dolor: {}, hc: { sangrado: true, etapaReproductiva: 'menopausia' } } });
console.log('\n[4] 58 con sangrado:'); console.log('   Banderas:', JSON.stringify(r4.banderas));
t('edad sola no inventa posmenopausia', !r4.banderas.some((b) => /posmenop/i.test(b.mensaje)));
t('etapa explícita sí activa bandera posmenopáusica', r4Etapa.banderas.some((b) => b.tipo === 'roja' && /posmenop/i.test(b.mensaje)));
t('hemorragia ALTA', prio(r4, 'hemorragia') === 'alta');

const r5 = instrumentosPara({ paciente: { edad: 28 }, autoReporte: { hc: {} } });
t('edad reproductiva sola no sugiere anticoncepción', !has(r5, 'anticoncepcion'));
const r6 = instrumentosPara({ paciente: { edad: 28 }, autoReporte: { hc: { objetivoReproductivo: 'evitar' } } });
t('objetivo de evitar embarazo sí sugiere anticoncepción', has(r6, 'anticoncepcion'));
const r7 = instrumentosPara({ paciente: { edad: 66 }, autoReporte: { hc: {} } });
t('tamizaje óseo por edad comienza a los 65', has(r7, 'osea'));
const r8 = instrumentosPara({ paciente: { edad: 25 }, autoReporte: { hc: { sintomasMama: ['bolita'] } } });
t('bolita mamaria nueva prioriza valoración de mama', prio(r8, 'mama') === 'alta');
const r9 = instrumentosPara({ paciente: { edad: 90 }, autoReporte: { hc: {} } });
t('PREVENT no se sugiere fuera del límite superior de 79 años', !has(r9, 'cardiometabolico'));
const r10 = instrumentosPara({ paciente: { edad: 60 }, autoReporte: { hc: { enfCorazon: true } } });
t('enfermedad cardiovascular previa no se presenta como PREVENT',
  has(r10, 'cardiometabolico') && !/por edad|PREVENT\) por edad/i.test(r10.instrumentosSugeridos.find((s) => s.instrumento === 'cardiometabolico').motivo));
const r11 = instrumentosPara({
  paciente: { edad: 48 },
  autoReporte: { hc: { etapaReproductiva: 'menopausia', reglasRegulares: false, acne: true } },
});
t('datos menstruales incompatibles no sugieren SOP en menopausia', !has(r11, 'sop'));
const r12 = instrumentosPara({
  paciente: { edad: 31 },
  autoReporte: { hc: { etapaReproductiva: 'posparto', senalesMaternas: ['cefalea_vision'] } },
});
t('señal materna urgente llega como bandera al tablero',
  r12.banderas.some((x) => x.tipo === 'roja' && /materna urgente/i.test(x.mensaje)));
const r13 = instrumentosPara({
  paciente: { edad: 31 },
  autoReporte: { hc: { etapaReproductiva: 'posparto', senalesMaternas: ['ideas_dano'] } },
});
t('señal materna de salud mental queda identificada en la bandera',
  r13.banderas.some((x) => x.tipo === 'roja' && /salud mental/i.test(x.mensaje)));

// 5) Pureza: misma entrada -> misma salida, sin timestamp dentro
const a = JSON.stringify(instrumentosPara({ paciente: { edad: 50 }, autoReporte: {} }));
const b = JSON.stringify(instrumentosPara({ paciente: { edad: 50 }, autoReporte: {} }));
t('función pura (determinista)', a === b);
t('no incluye timestamp interno', !/generadoEn|Date/.test(a));

console.log(`\nResultado: ${ok} pasan, ${fail} fallan.`);
process.exit(fail ? 1 : 0);
