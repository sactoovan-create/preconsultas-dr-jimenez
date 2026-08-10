import {
  construirEnlaceContinuacion,
  nuevoTokenContinuacion,
  tokenContinuacionDesdeHash,
} from '../core/borradores.js';

let ok = 0;
let fail = 0;
const check = (nombre, condicion) => {
  if (condicion) { ok += 1; console.log(`  PASA  ${nombre}`); }
  else { fail += 1; console.log(`  FALLA ${nombre}`); }
};

console.log('\nContinuación privada del cuestionario');
const cryptoFijo = {
  getRandomValues(bytes) {
    bytes.forEach((_, indice) => { bytes[indice] = (indice * 17 + 3) % 256; });
    return bytes;
  },
};
const token = nuevoTokenContinuacion(cryptoFijo);
check('genera un token de 256 bits en base64url', /^[A-Za-z0-9_-]{43}$/.test(token));
const enlace = construirEnlaceContinuacion(token, { origin: 'https://consulta.example', pathname: '/' });
check('el secreto vive en el fragmento y no en la ruta', enlace === `https://consulta.example/#continuar=${token}`);
check('recupera el token de un enlace válido', tokenContinuacionDesdeHash(`#continuar=${token}`) === token);
check('rechaza tokens cortos o manipulados', tokenContinuacionDesdeHash('#continuar=abc') === '');
check('ignora otros parámetros del fragmento', tokenContinuacionDesdeHash('#vista=hola') === '');

console.log(`\nResultado borradores: ${ok} pasan, ${fail} fallan.`);
if (fail > 0) process.exit(1);
