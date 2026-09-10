// Opt-in smoke test: only a unique synthetic trabajo_clinico row is written.
// PANEL_SECRETS_FILE points to a local env file; no credentials are logged.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';

assert.equal(process.env.PANEL_QA_REMOTO, '1', 'Set PANEL_QA_REMOTO=1 explicitly.');
const env = process.env.PANEL_SECRETS_FILE
  ? parseEnv(await readFile(process.env.PANEL_SECRETS_FILE, 'utf8')) : process.env;
for (const key of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_DOCTOR_EMAIL', 'SUPABASE_DOCTOR_PASSWORD']) {
  assert.ok(env[key], `Missing ${key}`);
}
const base = new URL(env.SUPABASE_URL);
assert.equal(base.protocol, 'https:');
assert.ok(base.hostname.endsWith('.supabase.co'));
const clave = 'qa-jornada-' + randomUUID();
const ruta = '/rest/v1/trabajo_clinico';
const filtro = '?paciente_clave=eq.' + encodeURIComponent(clave);
let token, creado = false;
const comprobaciones = [];
async function pedir(path, { metodo = 'GET', contenido, anon = false, prefer } = {}) {
  const respuesta = await fetch(new URL(path, base), {
    method: metodo, signal: AbortSignal.timeout(25000),
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + (anon ? env.SUPABASE_ANON_KEY : token),
      'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    ...(contenido !== undefined ? { body: JSON.stringify(contenido) } : {}),
  });
  const texto = await respuesta.text();
  let data; try { data = texto ? JSON.parse(texto) : null; } catch { data = null; }
  return { status: respuesta.status, ok: respuesta.ok, data };
}
function comprobar(nombre, condicion) { assert.ok(condicion, nombre); comprobaciones.push(nombre); }
const contenido = { paciente: { demografia: { nombre: 'PRUEBA TECNICA FICTICIA' } }, origen: { id: clave },
  gestionConsulta: { seleccion: [], revision: { estado: 'pendiente' }, vinculo: null, auditoria: [] } };
try {
  const auth = await fetch(new URL('/auth/v1/token?grant_type=password', base), {
    method: 'POST', signal: AbortSignal.timeout(25000), headers: { apikey: env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.SUPABASE_DOCTOR_EMAIL, password: env.SUPABASE_DOCTOR_PASSWORD }),
  });
  const sesion = await auth.json();
  comprobar('Sesion medica valida', auth.ok && !!sesion.access_token);
  token = sesion.access_token;
  const principal = await pedir('/rest/v1/rpc/es_medico_principal', { metodo: 'POST', contenido: {} });
  comprobar('RLS reconoce medico principal', principal.ok && principal.data === true);
  const inicial = await pedir(ruta + filtro + '&select=paciente_clave');
  comprobar('Tabla y lectura autenticada disponibles', inicial.ok && Array.isArray(inicial.data) && inicial.data.length === 0);
  const anonInsert = await pedir(ruta, { metodo: 'POST', anon: true, contenido: { paciente_clave: clave, contenido }, prefer: 'return=minimal' });
  // If the policy is unexpectedly permissive, remove only this synthetic row.
  creado = anonInsert.ok;
  comprobar('Anon no puede escribir trabajo medico', [401, 403].includes(anonInsert.status));
  creado = true; // Also attempt cleanup after an uncertain network outcome.
  const alta = await pedir(ruta, { metodo: 'POST', contenido: { paciente_clave: clave, contenido }, prefer: 'return=representation' });
  comprobar('Alta medica confirmada', alta.ok && alta.data?.length === 1 && !!alta.data[0].actualizado);
  const v1 = alta.data[0].actualizado;
  const publico = await pedir(ruta + filtro + '&select=paciente_clave', { anon: true });
  comprobar('Anon no puede leer trabajo existente', [401, 403].includes(publico.status) || (publico.ok && Array.isArray(publico.data) && publico.data.length === 0));
  const lectura = await pedir(ruta + filtro + '&select=contenido,actualizado');
  comprobar('Lectura recupera exactamente la prueba', lectura.ok && lectura.data?.length === 1 && lectura.data[0].contenido.origen.id === clave);
  const v2 = new Date(Math.max(Date.now(), Date.parse(v1) + 1000)).toISOString();
  const editado = { ...contenido, gestionConsulta: { ...contenido.gestionConsulta, seleccion: ['mama'] } };
  const cambio = await pedir(ruta + filtro + '&actualizado=eq.' + encodeURIComponent(v1), { metodo: 'PATCH', contenido: { contenido: editado, actualizado: v2 }, prefer: 'return=representation' });
  comprobar('Guardado condicionado por version funciona', cambio.ok && cambio.data?.length === 1 && cambio.data[0].contenido.gestionConsulta.seleccion[0] === 'mama');
  const obsoleto = await pedir(ruta + filtro + '&actualizado=eq.' + encodeURIComponent(v1), { metodo: 'PATCH', contenido: { contenido }, prefer: 'return=representation' });
  comprobar('Version antigua no sobrescribe', obsoleto.ok && Array.isArray(obsoleto.data) && obsoleto.data.length === 0);
  const final = await pedir(ruta + filtro + '&select=contenido');
  comprobar('Recarga conserva la seleccion medica', final.ok && final.data?.[0]?.contenido.gestionConsulta.seleccion[0] === 'mama');
} finally {
  if (token && creado) {
    const limpieza = await pedir(ruta + filtro, { metodo: 'DELETE', prefer: 'return=representation' });
    comprobar('Se elimina solo la fila sintetica', limpieza.ok);
    const ausente = await pedir(ruta + filtro + '&select=paciente_clave');
    comprobar('Limpieza verificada', ausente.ok && Array.isArray(ausente.data) && ausente.data.length === 0);
  }
  console.log(JSON.stringify({ host: base.hostname, comprobaciones, total: comprobaciones.length,
    alcance: 'RLS anon/medico y CRUD de una fila tecnica; sin leer respuestas de pacientes ni cambiar politicas.' }));
}
