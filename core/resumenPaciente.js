/**
 * Resumen de la respuesta de la paciente. Función pura: a partir de lo que la
 * paciente auto-reportó, produce el extracto que el panel del médico muestra
 * (intensidad de síntomas de menopausia y dolor). Verificable con pruebas.
 *
 * Contrato consumido por Respuestas.jsx: resumen.menopausia.{total,intensidad}
 * y resumen.dolor (objeto {intensidad,meses} o null).
 */
import { evaluarMrs } from '../instruments/menopausia/engine.js';

export function construirResumen(datos) {
  const mrs = evaluarMrs((datos && datos.mrs) || {});
  const dolor = (datos && datos.dolor) || {};
  return {
    menopausia: { total: mrs.total, intensidad: mrs.sevTotal },
    dolor: dolor.tiene ? { intensidad: dolor.intensidad ?? null, meses: dolor.meses ?? null } : null,
  };
}
