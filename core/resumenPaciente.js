/**
 * Resumen de la respuesta de la paciente. Función pura: a partir de lo que la
 * paciente auto-reportó, produce el extracto que el panel del médico muestra
 * (intensidad de síntomas de menopausia y dolor). Verificable con pruebas.
 *
 * Contrato consumido por Respuestas.jsx: resumen.menopausia.{total,intensidad}
 * y resumen.dolor (objeto {intensidad,meses} o null).
 */
import { evaluarMrs } from '../instruments/menopausia/engine.js';
import { evaluarProfundizacion } from './profundos/index.js';

export function construirResumen(datos) {
  const mrs = evaluarMrs((datos && datos.mrs) || {});
  const dolor = (datos && datos.dolor) || {};
  const completa = mrs.respondidos === 11;
  const profundizaciones = Object.entries((datos && datos.profundos) || {})
    .map(([id, respuestas]) => {
      const resultado = evaluarProfundizacion(id, respuestas);
      if (!resultado || !resultado.resumen) return null;
      return {
        id,
        instrumento: resultado.instrumento || id,
        completo: resultado.completo !== false,
        resumen: resultado.resumen,
      };
    })
    .filter(Boolean);
  return {
    // Un cuestionario vacío o parcial no equivale a 0. El total solo se publica
    // cuando están contestados los once reactivos de la escala.
    menopausia: {
      total: completa ? mrs.total : null,
      intensidad: completa ? mrs.sevTotal : null,
      completa,
      respondidos: mrs.respondidos,
    },
    dolor: dolor.tiene ? { intensidad: dolor.intensidad ?? null, meses: dolor.meses ?? null } : null,
    profundizaciones,
  };
}
