/**
 * Buzón privado de estudios. La paciente sube sus laboratorios, ultrasonidos o
 * recetas desde el portal; los archivos van al almacenamiento PRIVADO de Supabase
 * (no público), y solo el médico autenticado los abre con enlaces firmados.
 *
 * Se activa cuando el portal tiene Supabase configurado. Por defecto usa el bucket
 * privado "estudios"; VITE_ESTUDIOS_BUCKET queda como override si algún día cambia.
 *
 * Las imágenes se comprimen en el navegador (con canvas, sin dependencias) para que
 * el almacenamiento se llene muy despacio. Los PDF se suben tal cual.
 */
import { clienteSupabase } from './respuestas.js';

export const MAX_ARCHIVOS = 10;
export const MAX_BYTES = 15 * 1024 * 1024; // 15 MB por archivo (tras comprimir imágenes)
const MAX_LADO = 1600; // px: lado mayor al que se reduce una imagen
const MIME_EXTENSION = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MIME_POR_EXTENSION = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function buzonActivo() {
  return !!(import.meta.env && import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
function bucket() {
  return import.meta.env.VITE_ESTUDIOS_BUCKET || 'estudios';
}

let _clientePaciente = null;
async function clientePacienteEstudios() {
  if (_clientePaciente) return _clientePaciente;
  const { createClient } = await import('@supabase/supabase-js');
  _clientePaciente = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        storage: window.sessionStorage,
        storageKey: 'drj-estudios-paciente',
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    },
  );
  const { data } = await _clientePaciente.auth.getSession();
  if (!data.session) {
    const { error } = await _clientePaciente.auth.signInAnonymously();
    if (error) throw error;
  }
  return _clientePaciente;
}

/** Identificador de carpeta para ligar los estudios a una preconsulta. */
export function nuevaCarpeta() {
  try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (_) { /* sin crypto */ }
  return `est_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nombreSeguro(nombre) {
  return String(nombre || 'archivo')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.\-]+/g, '_').slice(0, 80);
}

export function validarArchivoEstudio(file = {}) {
  const nombre = String(file.name || '');
  const extension = (nombre.match(/\.([^.]+)$/)?.[1] || '').toLowerCase();
  const mimeDeclarado = String(file.type || '').toLowerCase();
  const mime = MIME_EXTENSION[mimeDeclarado] ? mimeDeclarado : MIME_POR_EXTENSION[extension];

  if (['heic', 'heif'].includes(extension) || ['image/heic', 'image/heif'].includes(mimeDeclarado)) {
    return {
      ok: false,
      code: 'formato',
      mensaje: 'La foto está en formato HEIC. En iPhone, envía una captura de pantalla o guárdala como JPG o PDF.',
    };
  }
  if (!mime) {
    return {
      ok: false,
      code: 'formato',
      mensaje: 'Solo se aceptan archivos PDF o imágenes JPG, PNG y WebP.',
    };
  }
  if (mime === 'application/pdf' && Number(file.size || 0) > MAX_BYTES) {
    return {
      ok: false,
      code: 'grande',
      mensaje: 'El PDF pesa más de 15 MB. Comprímelo o divídelo antes de adjuntarlo.',
    };
  }
  return { ok: true, mime };
}

/** Comprime una imagen en el navegador. Si no mejora, deja el original. */
async function comprimirImagen(file) {
  if (!file.type || !file.type.startsWith('image/')) return file;
  try {
    const dataUrl = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file);
    });
    const img = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl;
    });
    let { width, height } = img;
    const mayor = Math.max(width, height);
    if (mayor > MAX_LADO) { const f = MAX_LADO / mayor; width = Math.round(width * f); height = Math.round(height * f); }
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.72));
    if (!blob || blob.size >= file.size) return file; // si no mejora, deja el original
    const base = nombreSeguro(file.name).replace(/\.[^.]+$/i, '');
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } catch (_) {
    return file;
  }
}

/** Sube un archivo al buzón. Devuelve {path, nombre, size}. Lanza error con code='grande' si excede el tope. */
export async function subirEstudio(folder, archivo) {
  const validacion = validarArchivoEstudio(archivo);
  if (!validacion.ok) {
    const error = new Error(validacion.mensaje);
    error.code = validacion.code;
    throw error;
  }
  const sb = await clientePacienteEstudios();
  let f = archivo;
  try { f = await comprimirImagen(archivo); } catch (_) { f = archivo; }
  if (!f.type && validacion.mime) {
    f = new File([f], f.name, { type: validacion.mime });
  }
  if (f.size > MAX_BYTES) { const e = new Error('Archivo demasiado grande'); e.code = 'grande'; throw e; }
  const mime = f.type || validacion.mime;
  const base = nombreSeguro(f.name).replace(/\.[^.]+$/i, '') || 'archivo';
  const extension = MIME_EXTENSION[mime] || 'bin';
  const path = `${folder}/${Date.now()}-${base}.${extension}`;
  const { error } = await sb.storage.from(bucket()).upload(path, f, { contentType: mime, upsert: false });
  if (error) throw error;
  return { path, nombre: archivo.name, size: f.size };
}

/** Lista los estudios de una carpeta (panel médico autenticado). El enlace firmado se
 *  genera al momento de abrir cada archivo (ver firmarEstudio), no aquí, para que no
 *  caduque si el médico deja la pestaña abierta más de una hora. */
export async function listarEstudios(folder) {
  if (!folder) return [];
  const sb = await clienteSupabase();
  const { data, error } = await sb.storage.from(bucket()).list(folder, { limit: 50, sortBy: { column: 'name', order: 'asc' } });
  if (error) throw error;
  const archivos = (data || []).filter((o) => o.name && !o.name.startsWith('.'));
  return archivos.map((o) => ({ nombre: o.name, ruta: `${folder}/${o.name}`, size: o.metadata && o.metadata.size }));
}

/** Genera un enlace firmado vigente para abrir un archivo. Se llama al hacer clic,
 *  no al listar, para evitar enlaces caducados. Lanza error si la firma falla. */
export async function firmarEstudio(ruta, expiraSegundos = 3600) {
  const sb = await clienteSupabase();
  const { data, error } = await sb.storage.from(bucket()).createSignedUrl(ruta, expiraSegundos);
  if (error) throw error;
  if (!data || !data.signedUrl) throw new Error('No se pudo generar el enlace del estudio.');
  return data.signedUrl;
}

/** Borra un estudio desde el panel médico autenticado. */
export async function eliminarEstudio(ruta) {
  if (!ruta || !buzonActivo()) return;
  const sb = await clienteSupabase();
  const { error } = await sb.storage.from(bucket()).remove([ruta]);
  if (error) throw error;
}

/** Borra un estudio con la sesión anónima que lo subió. */
export async function eliminarEstudioPaciente(ruta) {
  if (!ruta || !buzonActivo()) return;
  const sb = await clientePacienteEstudios();
  const { data, error } = await sb.storage.from(bucket()).remove([ruta]);
  if (error) throw error;
  // Storage puede responder sin error cuando RLS deja la operación en cero filas.
  // Solo retiramos el archivo de la pantalla después de una confirmación explícita.
  if (!Array.isArray(data) || !data.some((objeto) => objeto && objeto.name === ruta)) {
    throw new Error('Supabase no confirmó la eliminación del estudio.');
  }
}

/** Borra todos los archivos de una carpeta de estudios. Se usa al eliminar una
 *  respuesta para no dejar datos de salud huérfanos (e irrecuperables, pues el
 *  identificador de la carpeta vive solo en la fila). Mejor esfuerzo. */
export async function eliminarCarpeta(folder) {
  if (!folder || !buzonActivo()) return;
  const sb = await clienteSupabase();
  const { data, error } = await sb.storage.from(bucket()).list(folder, { limit: 100 });
  if (error) throw error;
  const rutas = (data || []).filter((o) => o.name && !o.name.startsWith('.')).map((o) => `${folder}/${o.name}`);
  if (rutas.length) {
    const { error: err2 } = await sb.storage.from(bucket()).remove(rutas);
    if (err2) throw err2;
  }
}
