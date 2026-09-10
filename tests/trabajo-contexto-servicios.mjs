// Solo el servidor privado de la suite resuelve este mock. Nunca se importa en la app.
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms || 0));
const listeners = new Set();
export const qa = window.__qa = {
  usuario: 'medico-sintetico-A', filas: {}, lecturas: {}, escrituras: {}, fallos: {}, llamadas: [],
  ...window.__qaConfig,
  get observadores() { return listeners.size; },
  cuenta(usuario) { this.usuario = usuario; for (const cb of listeners) cb('SIGNED_IN', session()); },
};
function session() { return qa.usuario ? { user: { id: qa.usuario } } : null; }
function tabla() { return qa.filas[qa.usuario] ||= {}; }
const sb = {
  auth: {
    async getSession() { return { data: { session: session() }, error: null }; },
    onAuthStateChange(cb) {
      listeners.add(cb);
      queueMicrotask(() => { if (listeners.has(cb)) cb('INITIAL_SESSION', session()); });
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
    },
  },
  from(nombre) {
    if (nombre !== 'trabajo_clinico') throw Error('La prueba no permite otras tablas.');
    const query = { tipo: 'read', filtros: {}, columnas: '', desde: 0, hasta: Infinity,
      select(columnas) { this.columnas = columnas; return this; },
      eq(campo, valor) { this.filtros[campo] = valor; return this; },
      order() { return this; },
      range(desde, hasta) { this.desde = desde; this.hasta = hasta; return this; },
      update(datos) { this.tipo = 'update'; this.datos = datos; return this; },
      insert(datos) { this.tipo = 'insert'; this.datos = datos; return this; },
      delete() { this.tipo = 'delete'; return this; },
      maybeSingle() { return this.ejecutar(true); },
      then(resolve, reject) { return this.ejecutar(false).then(resolve, reject); },
      async ejecutar(single) {
        const clave = this.filtros.paciente_clave ?? this.datos?.paciente_clave;
        const filas = tabla();
        const lectura = clone(clave ? filas[clave] || null : Object.values(filas));
        qa.llamadas.push({ tipo: this.tipo, clave, columnas: this.columnas, filtros: clone(this.filtros), usuario: qa.usuario });
        await delay((this.tipo === 'read' ? qa.lecturas : qa.escrituras)[clave || '*']);
        if (qa.fallos[this.tipo]) return { data: null, error: { code: 'SIMULADO' } };
        if (this.tipo === 'read') return { data: single ? lectura
          : lectura.sort((a, b) => a.paciente_clave.localeCompare(b.paciente_clave)).slice(this.desde, this.hasta + 1), error: null };
        if (this.tipo === 'insert') {
          if (filas[clave]) return { data: null, error: { code: '23505' } };
          filas[clave] = clone(this.datos);
        } else {
          if (!filas[clave] || filas[clave].actualizado !== this.filtros.actualizado) return { data: null, error: null };
          if (this.tipo === 'delete') { delete filas[clave]; return { data: { paciente_clave: clave }, error: null }; }
          filas[clave] = { ...filas[clave], ...clone(this.datos) };
        }
        return { data: { actualizado: filas[clave].actualizado }, error: null };
      },
    };
    return query;
  },
};
export async function clienteSupabase() { return sb; }
