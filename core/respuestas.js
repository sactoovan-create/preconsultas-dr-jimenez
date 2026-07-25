/**
 * Capa de almacenamiento de las respuestas de las pacientes.
 *
 * Tiene dos implementaciones tras una misma interfaz:
 *  - Local (navegador): funciona de inmediato, sin configurar nada. Útil para
 *    probar el flujo completo en desarrollo.
 *  - Supabase: se activa SOLA cuando existen las variables de entorno
 *    VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. Entonces las respuestas se
 *    guardan en la base de datos del consultorio y alimentan el panel del médico.
 *
 * Las credenciales viven en el entorno del hosting, nunca en este código.
 */

const CLAVE_LOCAL = 'drj_respuestas_v1';

/** UUID estable durante los reintentos de un mismo envío. Evita duplicados si
 * Supabase guardó la fila pero la respuesta de red no alcanzó al teléfono. */
export function nuevaRespuestaId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch (_) { /* usa el fallback */ }
  const hex = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return hex.replace(/[xy]/g, (marca) => {
    const aleatorio = Math.floor(Math.random() * 16);
    return (marca === 'x' ? aleatorio : ((aleatorio & 0x3) | 0x8)).toString(16);
  });
}

function hayBackend() {
  return !!(import.meta.env && import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

/** Guarda una respuesta de paciente. Devuelve el registro guardado. */
export async function guardarRespuesta(registro) {
  if (hayBackend()) return guardarEnSupabase(registro);
  const completo = { ...registro, creado: registro.creado || new Date().toISOString() };
  // En producción NO debe caer en silencio a almacenamiento local: si falta la
  // configuración del consultorio, los datos quedarían solo en el teléfono de la
  // paciente y el médico nunca los vería. Se trata como error explícito.
  if (import.meta.env && import.meta.env.PROD) {
    throw new Error('La base de datos del consultorio no está configurada.');
  }
  return guardarLocal(completo);
}

/** Devuelve todas las respuestas, de la más reciente a la más antigua. */
export async function listarRespuestas() {
  return hayBackend() ? listarDeSupabase() : listarLocal();
}

/** Elimina una respuesta por id (depurar spam o atender un borrado solicitado). */
export async function eliminarRespuesta(id) {
  return hayBackend() ? eliminarEnSupabase(id) : eliminarLocal(id);
}

/** Indica si el almacenamiento es la base de datos del consultorio o solo local. */
export function modoAlmacenamiento() {
  return hayBackend() ? 'consultorio' : 'local';
}

// --- Implementación local (navegador) ---
function listarLocal() {
  try { return JSON.parse(localStorage.getItem(CLAVE_LOCAL) || '[]'); }
  catch (_) { return []; }
}

function eliminarLocal(id) {
  const todas = listarLocal().filter((r) => r.id !== id);
  try { localStorage.setItem(CLAVE_LOCAL, JSON.stringify(todas)); } catch (_) { /* sin almacenamiento */ }
}

function guardarLocal(registro) {
  const id = registro.id || `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const guardado = { ...registro, id };
  try {
    const todas = listarLocal();
    todas.unshift(guardado);
    localStorage.setItem(CLAVE_LOCAL, JSON.stringify(todas));
  } catch (_) {
    // Almacenamiento no disponible (modo privado o cuota llena): no romper el
    // envío en la prueba local; se devuelve el registro de todos modos.
  }
  return guardado;
}

// --- Implementación Supabase (se activa al configurar el entorno) ---
let _cliente = null;
async function cliente() {
  if (_cliente) return _cliente;
  const { createClient } = await import('@supabase/supabase-js');
  _cliente = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
  return _cliente;
}

let _clientePublico = null;
async function clientePublico() {
  if (_clientePublico) return _clientePublico;
  const { createClient } = await import('@supabase/supabase-js');
  // El formulario público nunca hereda la sesión del panel médico aunque ambos
  // vivan en el mismo dominio. Así el INSERT conserva el rol anon previsto por RLS.
  _clientePublico = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  return _clientePublico;
}

/** Cliente de Supabase compartido (lo reutiliza el buzón de estudios). */
export async function clienteSupabase() { return cliente(); }

async function guardarEnSupabase(registro) {
  const sb = await clientePublico();
  const { id: idSolicitado, creado: _creadoLocal, ...contenido } = registro;
  const id = idSolicitado || nuevaRespuestaId();
  const { error } = await sb
    .from('respuestas')
    // `creado` usa el default `now()` de PostgreSQL. El reloj del teléfono queda
    // solo como `submittedAtClient` dentro del contenido y no gobierna auditoría
    // ni el cruce temporal con la agenda.
    .insert({ id, contenido, nombre: contenido.paciente?.nombre || null });
  // Si el primer INSERT sí llegó pero se perdió la respuesta de red, el reintento
  // usa el mismo UUID. La colisión de la llave primaria confirma que ya se guardó.
  const yaGuardada = error?.code === '23505'
    && /respuestas_pkey|duplicate key/i.test(`${error.message || ''} ${error.details || ''}`);
  if (error && !yaGuardada) throw error;
  // La clave anon solo puede insertar; no puede leer la fila insertada. El id
  // estable permite reintentar sin fabricar respuestas duplicadas.
  return { ...contenido, id };
}

async function listarDeSupabase() {
  const sb = await cliente();
  const { data, error } = await sb.from('respuestas').select('*').order('creado', { ascending: false });
  if (error) throw error;
  return (data || []).map((fila) => ({ ...fila.contenido, id: fila.id, creado: fila.creado }));
}

async function eliminarEnSupabase(id) {
  const sb = await cliente();
  const { error } = await sb.from('respuestas').delete().eq('id', id);
  if (error) throw error;
}

// --- Acceso del médico (solo aplica en modo consultorio; en local no hay clave) ---

/** Sesión actual. En modo local devuelve un marcador; en consultorio, la sesión real o null. */
export async function sesion() {
  if (!hayBackend()) return { local: true };
  const sb = await cliente();
  const { data } = await sb.auth.getSession();
  return data.session;
}

/** Inicia sesión del médico con correo y contraseña (modo consultorio). */
export async function iniciarSesion(correo, clave) {
  const sb = await cliente();
  const { data, error } = await sb.auth.signInWithPassword({ email: correo, password: clave });
  if (error) throw error;
  return data.session;
}

/** Cierra la sesión del médico. */
export async function cerrarSesion() {
  if (!hayBackend()) return;
  const sb = await cliente();
  await sb.auth.signOut();
}
