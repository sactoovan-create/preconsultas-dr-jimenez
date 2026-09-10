// The manifest records the submission; Storage records current availability.
// A missing object is not proof that the patient never uploaded it.
export function conciliarEstudios(folder, adjuntos = [], disponibles = []) {
  const manifiesto = Array.isArray(adjuntos) ? adjuntos : [];
  const actuales = Array.isArray(disponibles) ? disponibles : [];
  const porRuta = new Map();
  for (const archivo of actuales) {
    if (!archivo?.ruta || !folder || !archivo.ruta.startsWith(folder + '/')) continue;
    porRuta.set(archivo.ruta, { ...archivo, disponible: true });
  }
  for (const [indice, archivo] of manifiesto.entries()) {
    if (!archivo || typeof archivo !== 'object') continue;
    const asociacionValida = !!(typeof archivo.ruta === 'string' && folder && archivo.ruta.startsWith(folder + '/'));
    if (!asociacionValida) {
      porRuta.set('sin-asociacion-' + indice, { ...archivo, ruta: 'sin-asociacion-' + indice, nombre: archivo.nombre || 'Archivo sin nombre', disponible: false, asociacionValida: false });
      continue;
    }
    const actual = porRuta.get(archivo.ruta);
    porRuta.set(archivo.ruta, {
      ...archivo, ...actual,
      nombre: archivo.nombre || actual?.nombre || archivo.ruta.split('/').pop(),
      size: actual?.size ?? archivo.bytes,
      disponible: !!actual,
      asociacionValida: true,
      integridad: !actual ? 'sin_verificar' : actual.size === 0 ? 'vacio'
        : typeof actual.size === 'number' && typeof archivo.bytes === 'number'
          ? actual.size === archivo.bytes ? 'coincide' : 'diferente' : 'sin_verificar',
    });
  }
  return [...porRuta.values()];
}

export function descripcionEstudios(r) {
  const n = Array.isArray(r?.adjuntos) ? r.adjuntos.length : 0;
  if (n) return `${n} archivo${n === 1 ? '' : 's'} en el registro de envío; disponibilidad por comprobar.`;
  if (r?.estudiosFolder) return 'Carpeta asociada; disponibilidad por comprobar.';
  if (r?.estudiosDeclaracion === 'no_los_tengo_ahora') return 'La paciente indicó que no tenía estudios para adjuntar.';
  if (r?.estudiosDeclaracion === 'adjunto_estudios') return 'Declaró adjuntar estudios, pero no hay carpeta asociada.';
  return 'Sin registro de adjuntos en esta respuesta.';
}
