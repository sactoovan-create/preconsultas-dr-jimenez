/**
 * Escape de valores dinámicos que se interpolan en las ventanas de impresión.
 *
 * Las hojas y el informe se arman como cadenas de HTML y se escriben con
 * document.write. Cualquier valor que provenga de captura manual o de extracción
 * automática (nombre de la paciente leído por reconocimiento óptico o por visión)
 * debe escaparse antes de interpolarse, para que no inyecte marcado en la ventana.
 *
 * Función pura. Solo se aplica a los valores, nunca a la plantilla de HTML.
 */
export function escaparHtml(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
