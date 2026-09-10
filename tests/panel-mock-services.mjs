// Browser-test transport only. Loaded by Playwright interception, not by the app.
const qa = () => window.__panelQa;
export const modoAlmacenamiento = () => 'consultorio';
export const sesion = async () => ({ qa: true, user: { id: 'qa-medico' } });
export const iniciarSesion = async () => ({ qa: true, user: { id: 'qa-medico' } });
export const cerrarSesion = async () => {};
export const backendConfigurado = () => true;
export const nuevaRespuestaId = () => 'qa-only-id';
export async function guardarRespuesta() { throw new Error('No writes allowed in this test.'); }
export async function listarRespuestas() {
  if (qa().errorRespuestas) throw new Error('QA network failure');
  const copia = structuredClone(qa().respuestas);
  if (qa().demoraRespuestas) await new Promise(resolve => setTimeout(resolve, qa().demoraRespuestas));
  return copia;
}
export async function eliminarRespuesta(id) {
  qa().respuestas = qa().respuestas.filter(r => r.id !== id);
}
export async function clienteSupabase() {
  return { storage: { from: () => ({
    list: async () => qa().errorEstudios ? { data: null, error: new Error('QA storage failure') }
      : { data: qa().archivos.map(f => ({ name: f.nombre, metadata: { size: f.size } })), error: null },
    remove: async rutas => {
      if (qa().errorBorrado) return { data: [], error: new Error('QA delete failure') };
      qa().archivos = qa().archivos.filter(f => !rutas.some(r => r.endsWith('/' + f.nombre)));
      return { data: rutas.map(name => ({ name })), error: null };
    },
    createSignedUrl: async () => ({ data: null, error: new Error('QA sign failure') }),
  }) } };
}
export const clientePacienteSupabase = clienteSupabase;
