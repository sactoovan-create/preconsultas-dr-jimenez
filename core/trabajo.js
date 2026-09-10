import { clienteSupabase } from './respuestas.js';

// Trabajo del panel por respuesta. No sincroniza expedientes ni modifica el ERP.
const TABLA = 'trabajo_clinico';
const PREFIJO = 'drj_trabajo_v2:';
const LEGADO = 'drj_trabajo_';

export function errorTrabajo(codigo, mensaje) {
  return Object.assign(new Error(mensaje), { code: codigo });
}

export function nubeActiva() {
  return !!(import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY);
}

function ambitoUsuario(id) {
  return `cuenta:${import.meta.env.VITE_SUPABASE_URL}:${id}`;
}

export async function obtenerAmbitoTrabajo() {
  if (!nubeActiva()) return 'local';
  const sb = await clienteSupabase();
  const { data, error } = await sb.auth.getSession();
  if (error) throw errorTrabajo('SESION_TRABAJO', 'No se pudo comprobar la sesion del trabajo.');
  return data.session?.user?.id ? ambitoUsuario(data.session.user.id) : null;
}

export async function observarCuentaTrabajo(onCambio) {
  if (!nubeActiva()) return () => {};
  const sb = await clienteSupabase();
  const { data } = sb.auth.onAuthStateChange((_evento, sesion) => {
    onCambio(sesion?.user?.id ? ambitoUsuario(sesion.user.id) : null);
  });
  return () => data.subscription.unsubscribe();
}

function prefijo(ambito) {
  if (!ambito) throw errorTrabajo('SIN_SESION', 'Inicia sesion para recuperar el trabajo de esta cuenta.');
  return `${PREFIJO}${encodeURIComponent(ambito)}:`;
}

function almacenamiento(operacion) {
  try { return operacion(globalThis.localStorage); }
  catch (e) {
    if (e?.code === 'TRABAJO_INVALIDO') throw e;
    throw errorTrabajo('ALMACENAMIENTO_LOCAL', 'No se pudo leer o guardar el trabajo en este navegador.');
  }
}

function validarContenido(contenido, clave) {
  if (!contenido || typeof contenido !== 'object' || Array.isArray(contenido)
    || !contenido.paciente || typeof contenido.paciente !== 'object'
    || (contenido.origen?.id != null && String(contenido.origen.id) !== String(clave))) {
    throw errorTrabajo('TRABAJO_INVALIDO', 'El trabajo guardado no corresponde a esta respuesta o no es valido.');
  }
  return contenido;
}

export function leerTrabajoLocal(clave, ambito) {
  const p = prefijo(ambito);
  return almacenamiento((ls) => {
    // El namespace antiguo no tenia cuenta: nunca se importa a una sesion autenticada.
    const texto = ls.getItem(`${p}registro:${encodeURIComponent(clave)}`)
      ?? (ambito === 'local' ? ls.getItem(LEGADO + clave) : null);
    return texto == null ? null : validarContenido(JSON.parse(texto), clave);
  });
}

export function escribirTrabajoLocal(clave, contenido, ambito) {
  const p = prefijo(ambito);
  validarContenido(contenido, clave);
  almacenamiento(ls => ls.setItem(`${p}registro:${encodeURIComponent(clave)}`, JSON.stringify(contenido)));
}

export function claveTrabajoActiva(ambito) {
  const p = prefijo(ambito);
  return almacenamiento(ls => ls.getItem(p + 'activa')
    ?? (ambito === 'local' ? ls.getItem(LEGADO + 'activa') : null));
}

export function activarTrabajoLocal(clave, ambito) {
  const p = prefijo(ambito);
  almacenamiento(ls => clave == null ? ls.removeItem(p + 'activa') : ls.setItem(p + 'activa', clave));
}

export function borrarTrabajoLocal(clave, ambito) {
  const p = prefijo(ambito);
  almacenamiento((ls) => {
    ls.removeItem(`${p}registro:${encodeURIComponent(clave)}`);
    if (ls.getItem(p + 'activa') === clave) ls.removeItem(p + 'activa');
    if (ambito === 'local') {
      ls.removeItem(LEGADO + clave);
      if (ls.getItem(LEGADO + 'activa') === clave) ls.removeItem(LEGADO + 'activa');
    }
  });
}

async function clienteCuenta(ambito) {
  if (!nubeActiva()) throw errorTrabajo('SIN_NUBE', 'No hay nube configurada para el trabajo del panel.');
  const actual = await obtenerAmbitoTrabajo();
  if (!actual || (ambito !== undefined && actual !== ambito)) {
    throw errorTrabajo('CAMBIO_CUENTA', 'La sesion cambio. No se aplico esta operacion a otra cuenta.');
  }
  return { sb: await clienteSupabase(), ambito: actual };
}

async function comprobarCuenta(ambito) {
  if (await obtenerAmbitoTrabajo() !== ambito) {
    throw errorTrabajo('CAMBIO_CUENTA', 'La sesion cambio durante la operacion del trabajo.');
  }
}

function desdeFila(fila, clave) {
  if (!fila) return null;
  if (typeof fila.actualizado !== 'string' || !Number.isFinite(Date.parse(fila.actualizado))) {
    throw errorTrabajo('TRABAJO_INVALIDO', 'La nube no devolvio una version valida del trabajo.');
  }
  return { ...validarContenido(fila.contenido, clave), guardadoEn: fila.actualizado,
    _persistencia: { pendienteNube: false, versionNube: fila.actualizado } };
}

/** Lectura estricta: null significa fila ausente; los fallos rechazan la promesa. */
export async function cargarTrabajoNube(clave, { ambito } = {}) {
  const cuenta = await clienteCuenta(ambito);
  const { data, error } = await cuenta.sb.from(TABLA).select('contenido, actualizado')
    .eq('paciente_clave', String(clave)).maybeSingle();
  await comprobarCuenta(cuenta.ambito);
  if (error) throw errorTrabajo('LECTURA_NUBE', 'No se pudo leer el trabajo en la nube.');
  return desdeFila(data, clave);
}

/** CAS sobre la columna existente. null = INSERT; undefined nunca autoriza sobrescribir. */
export async function guardarTrabajoNube(clave, contenido, { versionEsperada, ambito } = {}) {
  if (versionEsperada === undefined) throw errorTrabajo('VERSION_DESCONOCIDA', 'Falta comprobar la version en la nube antes de guardar.');
  validarContenido(contenido, clave);
  const cuenta = await clienteCuenta(ambito);
  const { _persistencia: _local, ...datos } = contenido;
  // El sello actua como token CAS, no como prueba de hora clinica del servidor.
  const actualizado = new Date(Math.max(Date.now(), (Date.parse(versionEsperada) || 0) + 1)).toISOString();
  const fila = { paciente_clave: String(clave), contenido: datos, actualizado };
  const query = versionEsperada === null
    ? cuenta.sb.from(TABLA).insert(fila)
    : cuenta.sb.from(TABLA).update({ contenido: datos, actualizado })
      .eq('paciente_clave', String(clave)).eq('actualizado', versionEsperada);
  const { data, error } = await query.select('actualizado').maybeSingle();
  await comprobarCuenta(cuenta.ambito);
  if (error?.code === '23505' || (!error && !data)) {
    throw errorTrabajo('CONFLICTO_TRABAJO', 'El trabajo cambio en otro lugar. Se conserva la edicion local; revisa ambas versiones.');
  }
  if (error) throw errorTrabajo('GUARDADO_NUBE', 'No se pudo confirmar el guardado del trabajo en la nube.');
  if (!data.actualizado) throw errorTrabajo('GUARDADO_NUBE', 'La nube no confirmo la version guardada.');
  return { ok: true, actualizado: data.actualizado };
}

export async function borrarTrabajoNube(clave, { versionEsperada, ambito } = {}) {
  if (versionEsperada === undefined) throw errorTrabajo('VERSION_DESCONOCIDA', 'Falta comprobar la version antes de borrar.');
  const cuenta = await clienteCuenta(ambito);
  if (versionEsperada === null) {
    if (await cargarTrabajoNube(clave, { ambito: cuenta.ambito })) {
      throw errorTrabajo('CONFLICTO_TRABAJO', 'Existe trabajo remoto nuevo. No se borro.');
    }
    return { ok: true };
  }
  const { data, error } = await cuenta.sb.from(TABLA).delete()
    .eq('paciente_clave', String(clave)).eq('actualizado', versionEsperada)
    .select('paciente_clave').maybeSingle();
  await comprobarCuenta(cuenta.ambito);
  if (error) throw errorTrabajo('BORRADO_NUBE', 'No se pudo confirmar el borrado en la nube.');
  if (!data) throw errorTrabajo('CONFLICTO_TRABAJO', 'El trabajo remoto cambio. No se borro.');
  return { ok: true };
}

/** Indice del trabajo existente, con fuentes y errores explicitos. No lista respuestas. */
function resultadoIndice(porClave, estado, errores = []) {
  return { trabajos: Object.fromEntries(Object.entries(porClave).map(([clave, item]) => [clave, item.contenido])),
    porClave, estado, error: errores[0]?.error || null, errores };
}

export async function listarTrabajos() {
  const errores = [];
  let ambito;
  try { ambito = await obtenerAmbitoTrabajo(); }
  catch (error) { return resultadoIndice({}, 'error', [{ origen: 'sesion', error }]); }
  if (!ambito) return resultadoIndice({}, 'error', [{ origen: 'sesion', error: errorTrabajo('SIN_SESION', 'No hay sesion para leer trabajo del panel.') }]);
  const porClave = Object.create(null);
  let localLeido = false;
  let nubeLeida = false;
  try {
    const p = prefijo(ambito) + 'registro:';
    const claves = almacenamiento(ls => Array.from({ length: ls.length }, (_, i) => ls.key(i)));
    const ids = new Set();
    for (const k of claves) {
      if (k?.startsWith(p)) ids.add(decodeURIComponent(k.slice(p.length)));
      else if (ambito === 'local' && k?.startsWith(LEGADO) && k !== LEGADO + 'activa' && !k.startsWith(PREFIJO)) ids.add(k.slice(LEGADO.length));
    }
    for (const clave of ids) {
      try {
        const contenido = leerTrabajoLocal(clave, ambito);
        if (contenido) porClave[clave] = { paciente_clave: clave, contenido, origenDatos: 'local',
          estado: contenido._persistencia?.pendienteNube ? 'pendiente' : 'local' };
      } catch (error) { errores.push({ origen: 'local', clave, error }); }
    }
    localLeido = true;
  } catch (error) { errores.push({ origen: 'local', error }); }
  if (nubeActiva()) {
    try {
      const cuenta = await clienteCuenta(ambito);
      // Pagina estable por PK: no presentar el limite por defecto como un indice completo.
      for (let inicio = 0; ; inicio += 500) {
        const { data, error } = await cuenta.sb.from(TABLA).select('paciente_clave, contenido, actualizado')
          .order('paciente_clave', { ascending: true }).range(inicio, inicio + 499);
        if (error || !Array.isArray(data)) throw errorTrabajo('LECTURA_NUBE', 'No se pudo completar el indice de trabajo en la nube.');
        for (const fila of data) {
          const clave = fila.paciente_clave;
          const nube = desdeFila(fila, clave);
          const local = porClave[clave];
          if (local?.contenido._persistencia?.pendienteNube) {
            const conflicto = local.contenido._persistencia.versionNube !== fila.actualizado;
            porClave[clave] = { ...local, estado: conflicto ? 'conflicto' : 'pendiente',
              origenDatos: 'local', contenidoNube: nube };
          } else if (local && Date.parse(local.contenido.guardadoEn) > Date.parse(nube.guardadoEn)) {
            porClave[clave] = { ...local, estado: 'conflicto', contenidoNube: nube };
          } else porClave[clave] = { paciente_clave: clave, contenido: nube, origenDatos: 'nube', estado: 'nube' };
        }
        if (data.length < 500) break;
      }
      await comprobarCuenta(ambito);
      nubeLeida = true;
    } catch (error) {
      if (error.code === 'CAMBIO_CUENTA') return resultadoIndice({}, 'error', [{ origen: 'sesion', error }]);
      errores.push({ origen: 'nube', error });
    }
  }
  try {
    if (nubeActiva()) await comprobarCuenta(ambito);
  } catch (error) { return resultadoIndice({}, 'error', [{ origen: 'sesion', error }]); }
  const trabajos = Object.values(porClave);
  const estado = errores.length ? 'error'
    : nubeLeida && !trabajos.some(t => t.origenDatos === 'local') ? 'nube' : 'local';
  return { ...resultadoIndice(porClave, estado, errores), parcial: errores.length > 0 && (localLeido || nubeLeida) };
}
