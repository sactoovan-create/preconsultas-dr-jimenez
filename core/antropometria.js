/**
 * Índice de masa corporal seguro. Evita que un peso o una talla ausentes,
 * en cero, o capturados en la unidad equivocada (por ejemplo la talla en metros,
 * 1.6, en vez de centímetros, 160) produzcan un índice absurdo (cero, infinito o
 * decenas de miles) que se imprima en una hoja o envenene otros cálculos.
 *
 * Devuelve el índice (kilogramos sobre metro cuadrado) solo cuando peso y talla
 * son números finitos dentro de rangos humanos plausibles; en cualquier otro
 * caso devuelve null (dato no calculable), nunca un número inventado.
 *
 * Función pura y testeable.
 */

// Rangos plausibles. La talla se recibe en centímetros. El límite inferior de 100
// cm cubre a adolescentes y descarta una talla capturada en metros (1.6, 1.70).
const PESO_MIN = 20;   // kilogramos
const PESO_MAX = 400;
const TALLA_MIN = 100; // centímetros
const TALLA_MAX = 230;
const IMC_MIN = 8;     // fuera de este rango, la combinación no es plausible
const IMC_MAX = 100;

export function imcSeguro(peso, tallaCm) {
  const p = Number(peso);
  const t = Number(tallaCm);
  if (!Number.isFinite(p) || !Number.isFinite(t)) return null;
  if (p < PESO_MIN || p > PESO_MAX) return null;
  if (t < TALLA_MIN || t > TALLA_MAX) return null;
  const imc = p / Math.pow(t / 100, 2);
  if (!Number.isFinite(imc) || imc < IMC_MIN || imc > IMC_MAX) return null;
  return imc;
}
