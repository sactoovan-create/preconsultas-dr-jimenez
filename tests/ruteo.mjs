import { instrumentosPara } from '../core/ruteoClinico.js';
let ok = 0, fail = 0;
const has = (r, id) => r.instrumentosSugeridos.some((s) => s.instrumento === id);
const prio = (r, id) => (r.instrumentosSugeridos.find((s) => s.instrumento === id) || {}).prioridad;
function t(nombre, cond) { if (cond) { ok++; console.log('  PASA ', nombre); } else { fail++; console.log('  FALLA', nombre); } }

// 1) Posmenopáusica con síntomas + diabetes
const r1 = instrumentosPara({ paciente: { edad: 54 }, autoReporte: { mrs: { mrs_bochornos: 4, mrs_sueno: 3, mrs_animo: 3, mrs_musculo: 3, mrs_sequedad: 3 }, dolor: {}, hc: { enfDiabetes: true } }, resumen: {} });
console.log('\n[1] Posmenopáusica 54 con MRS alto + diabetes:'); r1.instrumentosSugeridos.forEach((s) => console.log(`   - ${s.prioridad.toUpperCase()} · ${s.nombre} — ${s.motivo}`));
t('sugiere menopausia', has(r1, 'menopausia'));
t('cardiometabolico ALTA por diabetes', prio(r1, 'cardiometabolico') === 'alta');
t('osea por edad', has(r1, 'osea'));

// 2) Joven con dolor pélvico + ciclos irregulares + acné
const r2 = instrumentosPara({ paciente: { edad: 26 }, autoReporte: { mrs: {}, dolor: { tiene: true, intensidad: 7, meses: 8 }, hc: { reglasRegulares: false, acne: true } } });
console.log('\n[2] Joven 26 con dolor 7/10 + ciclos irregulares + acné:'); r2.instrumentosSugeridos.forEach((s) => console.log(`   - ${s.prioridad.toUpperCase()} · ${s.nombre} — ${s.motivo}`));
t('dolor-pelvico ALTA', prio(r2, 'dolor-pelvico') === 'alta');
t('endometriosis sugerida', has(r2, 'endometriosis'));
t('sop ALTA (ciclos + androgénico)', prio(r2, 'sop') === 'alta');

// 3) En tirzepatida
const r3 = instrumentosPara({ paciente: { edad: 45 }, autoReporte: { mrs: {}, dolor: {}, hc: { medicamentos: 'Mounjaro 5 mg subcutáneo semanal' } } });
console.log('\n[3] 45 en Mounjaro:'); r3.instrumentosSugeridos.forEach((s) => console.log(`   - ${s.prioridad.toUpperCase()} · ${s.nombre} — ${s.motivo}`));
t('seguimiento-metabolico ALTA', prio(r3, 'seguimiento-metabolico') === 'alta');
t('cardiometabolico ALTA', prio(r3, 'cardiometabolico') === 'alta');

// 4) Sangrado posmenopáusico -> bandera roja
const r4 = instrumentosPara({ paciente: { edad: 58 }, autoReporte: { mrs: {}, dolor: {}, hc: { sangrado: true } } });
console.log('\n[4] 58 con sangrado:'); console.log('   Banderas:', JSON.stringify(r4.banderas));
t('bandera roja sangrado posmenopáusico', r4.banderas.some((b) => b.tipo === 'roja' && /posmenop/i.test(b.mensaje)));
t('hemorragia ALTA', prio(r4, 'hemorragia') === 'alta');

// 5) Pureza: misma entrada -> misma salida, sin timestamp dentro
const a = JSON.stringify(instrumentosPara({ paciente: { edad: 50 }, autoReporte: {} }));
const b = JSON.stringify(instrumentosPara({ paciente: { edad: 50 }, autoReporte: {} }));
t('función pura (determinista)', a === b);
t('no incluye timestamp interno', !/generadoEn|Date/.test(a));

console.log(`\nResultado: ${ok} pasan, ${fail} fallan.`);
process.exit(fail ? 1 : 0);
