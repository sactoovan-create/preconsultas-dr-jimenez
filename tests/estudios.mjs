import { revisarConfirmacionEstudios } from '../core/estudios.js';

let ok = 0;
let fail = 0;
function t(nombre, condicion) {
  if (condicion) { ok++; console.log(`  PASA  ${nombre}`); }
  else { fail++; console.log(`  FALLA ${nombre}`); }
}

console.log('\nConfirmación de estudios privados');

const resultado = {
  path: 'folder-qa/1700000000000-laboratorio.pdf',
  nombre: 'laboratorio.pdf',
  size: 1280,
};
const remoto = {
  name: '1700000000000-laboratorio.pdf',
  metadata: { size: 1280 },
};

t('confirma únicamente nombre y tamaño exactos',
  revisarConfirmacionEstudios('folder-qa', [resultado], [remoto]).length === 0);
t('rechaza una respuesta de upload cuyo objeto no aparece',
  revisarConfirmacionEstudios('folder-qa', [resultado], []).some((fila) => fila.motivo === 'ausente'));
t('rechaza objetos de cero bytes',
  revisarConfirmacionEstudios('folder-qa', [resultado], [{ ...remoto, metadata: { size: 0 } }])
    .some((fila) => fila.motivo === 'vacio'));
t('rechaza archivos truncados aunque el nombre coincida',
  revisarConfirmacionEstudios('folder-qa', [resultado], [{ ...remoto, metadata: { size: 640 } }])
    .some((fila) => fila.motivo === 'tamano'));
t('rechaza rutas que intentan salir de la carpeta del cuestionario',
  revisarConfirmacionEstudios('folder-qa', [{ ...resultado, path: 'otra/laboratorio.pdf' }], [remoto])
    .some((fila) => fila.motivo === 'ruta'));
const otro = { path: 'folder-qa/1700000000001-ultrasonido.jpg', nombre: 'ultrasonido.jpg', size: 900 };
t('un archivo ausente no invalida los demás de la misma selección',
  revisarConfirmacionEstudios('folder-qa', [resultado, otro], [remoto]).map((fila) => fila.path)
    .join(',') === otro.path);

console.log(`\nResultado estudios: ${ok} pasan, ${fail} fallan.`);
if (fail) process.exit(1);
