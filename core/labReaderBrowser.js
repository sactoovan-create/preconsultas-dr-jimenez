/**
 * Obtención de texto de un archivo de reporte en el navegador.
 *
 * Carga pdf.js bajo demanda para documentos con texto, y Tesseract para imágenes
 * o documentos escaneados. Todo ocurre localmente: el archivo no se transmite.
 *
 * PUNTO DE INTEGRACIÓN CON GINEOS:
 * En el proceso principal de GineOS conviene sustituir esta obtención de texto por
 * reconocimiento por visión (el mismo que ya usa el flujo de digitalización), que
 * es más robusto frente a formatos heterogéneos y mantiene la clave del lado del
 * proceso, no expuesta en el navegador. La firma de retorno debe seguir siendo un
 * string de texto plano, para que parseLabs y parseIdent funcionen sin cambios.
 */

function cargarScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[data-src="${src}"]`)) { res(); return; }
    const s = document.createElement('script');
    s.src = src; s.dataset.src = src;
    s.onload = () => res();
    s.onerror = () => rej(new Error('No se pudo cargar la librería de lectura'));
    document.head.appendChild(s);
  });
}

function itemsALineas(items) {
  const filas = {};
  items.forEach((it) => {
    const y = Math.round(it.transform[5]);
    (filas[y] = filas[y] || []).push(it);
  });
  return Object.keys(filas).sort((a, b) => b - a).map((y) =>
    filas[y].sort((a, b) => a.transform[4] - b.transform[4]).map((it) => it.str).join(' ')
  ).join('\n');
}

export async function textoDePdf(file) {
  const base = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  await cargarScript(base + 'pdf.min.js');
  // eslint-disable-next-line no-undef
  pdfjsLib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.js';
  const buf = await file.arrayBuffer();
  // eslint-disable-next-line no-undef
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let txt = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    txt += itemsALineas(content.items) + '\n';
  }
  return txt;
}

export async function textoDeImagen(file, onProgreso) {
  await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js');
  // eslint-disable-next-line no-undef
  const { data } = await Tesseract.recognize(file, 'spa', {
    logger: (m) => { if (m.status === 'recognizing text' && onProgreso) onProgreso(m.progress); },
  });
  return data.text;
}

/** Devuelve el texto de un archivo (documento o imagen) o lanza un error descriptivo. */
export async function textoDeArchivo(file) {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    return textoDePdf(file);
  }
  if (/^image\//.test(file.type)) {
    return textoDeImagen(file);
  }
  throw new Error('Formato no compatible. Usa documento o imagen.');
}
