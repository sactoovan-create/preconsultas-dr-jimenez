import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { pacienteDesdeRespuesta, ruteoDesdeRespuesta } from './precarga.js';
import { precargaInstrumento, combinarPrecarga } from './precargaClinica.js';
import {
  nubeActiva, cargarTrabajoNube, guardarTrabajoNube, borrarTrabajoNube, errorTrabajo,
  leerTrabajoLocal, escribirTrabajoLocal, borrarTrabajoLocal, claveTrabajoActiva,
  activarTrabajoLocal, obtenerAmbitoTrabajo, observarCuentaTrabajo,
} from './trabajo.js';

const formaVacia = () => ({
  demografia: { nombre: '', edad: null, etapaReproductiva: 'pre', edadMenopausia: null, histerectomia: null },
  signos: { sistolica: null, diastolica: null, peso: null, talla: null, circunferencia: null },
  labs: { ct: null, hdl: null, tg: null, glu: null, insulina: null, hba1c: null, creat: null, egfr: null, uacr: null },
  antecedentes: {
    diabetes: null, tabaquismo: null, antihipertensivo: null, estatina: null,
    ecvEstablecida: null, ecvSubclinica: null,
    cancerMama: null, tromboembolismo: null, hepatica: null, sangradoNoDx: null,
    preeclampsia: false, diabetesGestacional: false, partoPretermino: false,
    restriccionCrecimiento: false, sindromePoliendocrino: false,
  },
});

export function gestionConsultaVacia() {
  return { revision: { estado: 'pendiente', fecha: null, autorId: null, versionHuella: null },
    vinculo: null, seleccion: [], auditoria: [] };
}

function normalizarTrabajo(t = {}) {
  const vacio = formaVacia();
  const paciente = { ...vacio, ...t.paciente };
  for (const grupo of Object.keys(vacio)) paciente[grupo] = { ...vacio[grupo], ...t.paciente?.[grupo] };
  const gestion = gestionConsultaVacia();
  return { ...t, paciente, resumenes: t.resumenes || {}, datosInstrumentos: t.datosInstrumentos || {},
    origen: t.origen || null, ruteo: t.ruteo || null, descartados: t.descartados || [],
    gestionConsulta: { ...gestion, ...t.gestionConsulta,
      revision: { ...gestion.revision, ...t.gestionConsulta?.revision },
      seleccion: Array.isArray(t.gestionConsulta?.seleccion) ? t.gestionConsulta.seleccion : [],
      auditoria: Array.isArray(t.gestionConsulta?.auditoria) ? t.gestionConsulta.auditoria : [] } };
}

function desdeRespuesta(registro) {
  return normalizarTrabajo({ paciente: pacienteDesdeRespuesta(registro), ruteo: ruteoDesdeRespuesta(registro),
    origen: { id: registro.id, nombre: registro.paciente?.nombre || null, fecha: registro.creado || null } });
}

function crearSesion(clave, trabajo, ambito, token) {
  const t = normalizarTrabajo(trabajo);
  return { clave, trabajo: t, ambito, token, revision: 0, restauracion: 0,
    versionNube: t._persistencia?.versionNube,
    pendienteNube: !!t._persistencia?.pendienteNube,
    revisionLocal: t.guardadoEn ? 0 : -1,
    revisionNube: t._persistencia?.versionNube && !t._persistencia.pendienteNube ? 0 : -1,
    guardadoEn: t.guardadoEn || null, cuando: t.guardadoEn || new Date().toISOString(),
    cargando: false, lista: true, timer: null, guardando: null, lectura: null,
    errorLocal: null, errorNube: null, errorCarga: null, conflicto: null,
    edicionClinica: false, bloqueada: false };
}

function instantanea(s) {
  const errorGuardado = s.errorLocal || s.errorNube;
  const guardando = !!(s.guardando || s.timer);
  const estadoNube = s.conflicto ? 'conflicto' : guardando ? 'guardando'
    : s.revisionNube === s.revision ? 'nube' : s.revisionLocal === s.revision ? 'local'
      : errorGuardado ? 'error' : null;
  return { ...s.trabajo, claveTrabajo: s.clave, instanciaTrabajo: s.token,
    revisionRestauracion: s.restauracion, guardadoEn: s.guardadoEn, estadoNube,
    guardando, cargandoTrabajo: s.cargando || s.bloqueada || !s.lista, errorGuardado,
    errorTrabajo: s.errorCarga || errorGuardado, conflictoTrabajo: s.conflicto };
}

const PacienteContext = createContext(null);

export function PacienteProvider({ children, pacienteInicial, onGuardarResultado, irA, persistirTrabajo = true }) {
  const control = useRef({ token: 0, peticion: 0, ambito: undefined, montado: true, pendientes: new Map() });
  const sesion = useRef(null);
  if (!sesion.current) {
    sesion.current = crearSesion(pacienteInicial ? null : 'manual', { paciente: pacienteInicial }, undefined, 0);
    sesion.current.lista = !persistirTrabajo;
  }
  const [vista, setVista] = useState(() => instantanea(sesion.current));

  const publicar = useCallback((s) => {
    if (control.current.montado && sesion.current === s) setVista(instantanea(s));
  }, []);

  const local = useCallback((s) => {
    if (!persistirTrabajo || s.clave === null) return false;
    try {
      const contenido = { ...s.trabajo, guardadoEn: s.cuando,
        _persistencia: { pendienteNube: s.pendienteNube, versionNube: s.versionNube } };
      escribirTrabajoLocal(s.clave, contenido, s.ambito);
      if (sesion.current === s) activarTrabajoLocal(s.clave, s.ambito);
      s.revisionLocal = s.revision;
      s.guardadoEn = s.cuando;
      s.errorLocal = null;
      return true;
    } catch (error) { s.errorLocal = error; return false; }
  }, [persistirTrabajo]);

  const puedeNube = useCallback(s => persistirTrabajo && nubeActiva() && !!s.ambito
    && s.clave !== null && s.clave !== 'manual', [persistirTrabajo]);

  const guardarSesion = useCallback(async (s) => {
    clearTimeout(s.timer); s.timer = null;
    if (!persistirTrabajo || s.clave === null) return { ok: true, local: false, nube: false, persistido: false };
    local(s);
    if (s.guardando) { await s.guardando; return guardarSesion(s); }
    if (puedeNube(s) && s.revisionNube !== s.revision) {
      const ejecutar = async () => {
        try {
          if (s.lectura) await s.lectura;
          if (s.conflicto) throw s.conflicto;
          if (s.versionNube === undefined) throw s.errorCarga || errorTrabajo('VERSION_DESCONOCIDA', 'Reintenta la lectura de nube antes de guardar.');
          // Las ediciones que lleguen durante el transporte se guardan en una segunda CAS.
          while (s.revisionNube !== s.revision) {
            const revision = s.revision;
            const contenido = { ...s.trabajo, guardadoEn: s.cuando };
            const resultado = await guardarTrabajoNube(s.clave, contenido,
              { versionEsperada: s.versionNube, ambito: s.ambito });
            s.versionNube = resultado.actualizado;
            s.revisionNube = revision;
            s.errorNube = null;
            s.pendienteNube = revision !== s.revision;
            if (!s.pendienteNube) s.guardadoEn = resultado.actualizado;
            // Nunca escribir una instantanea antigua sobre una edicion mas reciente.
            local(s);
          }
        } catch (error) {
          s.errorNube = error;
          if (error.code === 'CONFLICTO_TRABAJO') s.conflicto = error;
        }
      };
      s.guardando = ejecutar();
      control.current.pendientes.set(`${s.ambito}:${s.clave}`, s.guardando);
      publicar(s);
      await s.guardando;
      control.current.pendientes.delete(`${s.ambito}:${s.clave}`);
      s.guardando = null;
    }
    publicar(s);
    return { ok: s.revisionLocal === s.revision || s.revisionNube === s.revision,
      local: s.revisionLocal === s.revision, nube: s.revisionNube === s.revision,
      conflicto: !!s.conflicto, error: s.errorLocal || s.errorNube || null };
  }, [local, persistirTrabajo, puedeNube, publicar]);

  const leerNube = useCallback((s) => {
    if (!puedeNube(s)) { s.cargando = false; publicar(s); return Promise.resolve(); }
    const revision = s.revision;
    s.cargando = true;
    publicar(s);
    s.lectura = (async () => {
      try {
        const nube = await cargarTrabajoNube(s.clave, { ambito: s.ambito });
        const version = nube?._persistencia?.versionNube ?? null;
        const editado = s.revision !== revision || s.pendienteNube;
        if (editado) {
          if (s.versionNube !== version && !(s.versionNube === undefined && version === null)) {
            s.conflicto = errorTrabajo('CONFLICTO_TRABAJO', 'Hay otra version en nube. La edicion local no fue reemplazada.');
            s.errorNube = s.conflicto;
          } else { s.versionNube = version; s.conflicto = null; s.errorNube = null; }
        } else if (sesion.current === s && nube) {
          s.trabajo = normalizarTrabajo(nube);
          s.versionNube = version;
          s.restauracion += 1;
          s.revisionNube = s.revision;
          s.cuando = nube.guardadoEn;
          s.guardadoEn = nube.guardadoEn;
          s.pendienteNube = false;
          s.edicionClinica = false;
          s.conflicto = null;
          s.errorNube = null;
          local(s);
        } else {
          s.versionNube = version;
          if (!nube) { s.revisionNube = -1; s.pendienteNube = s.revisionLocal >= 0; }
        }
        s.errorCarga = null;
      } catch (error) { s.errorCarga = error; }
      finally { s.cargando = false; s.lectura = null; publicar(s); }
    })();
    return s.lectura;
  }, [local, puedeNube, publicar]);

  // Guardar local antes de salir. La subida de A puede terminar mientras B esta abierta.
  const flush = useCallback(async (s) => {
    clearTimeout(s.timer); s.timer = null;
    if (!persistirTrabajo || s.clave === null || (!s.pendienteNube && s.revision === 0)) return true;
    const localOk = local(s);
    const guardado = guardarSesion(s);
    if (localOk) return true;
    return (await guardado).ok;
  }, [guardarSesion, local, persistirTrabajo]);

  const abrir = useCallback(async (clave, base, restaurar = true) => {
    const peticion = ++control.current.peticion;
    const anterior = sesion.current;
    anterior.cargando = true; publicar(anterior);
    if (!await flush(anterior)) {
      anterior.cargando = false; publicar(anterior); return false;
    }
    if (peticion !== control.current.peticion) return false;
    const ambito = persistirTrabajo ? await obtenerAmbitoTrabajo() : 'efimero';
    if (peticion !== control.current.peticion) return false;
    if (persistirTrabajo && !ambito) throw errorTrabajo('SIN_SESION', 'Inicia sesion antes de abrir trabajo del panel.');
    const pendiente = control.current.pendientes.get(`${ambito}:${clave}`);
    if (pendiente) await pendiente;
    if (peticion !== control.current.peticion) return false;
    let trabajo = base;
    let errorLocal = null;
    if (persistirTrabajo && restaurar && clave !== null) {
      try { trabajo = leerTrabajoLocal(clave, ambito) || base; }
      catch (error) { errorLocal = error; }
    }
    const s = crearSesion(clave, trabajo, ambito, ++control.current.token);
    s.errorLocal = errorLocal;
    sesion.current = s;
    control.current.ambito = ambito;
    if (persistirTrabajo && clave !== null) {
      try { activarTrabajoLocal(clave, ambito); }
      catch (error) { s.errorLocal = error; }
    }
    publicar(s);
    await leerNube(s);
    return sesion.current === s && peticion === control.current.peticion;
  }, [flush, leerNube, persistirTrabajo, publicar]);

  const cargarRespuesta = useCallback(async (registro) => {
    const peticion = control.current.peticion + 1;
    try {
      if (!registro || registro.id == null) throw errorTrabajo('RESPUESTA_INVALIDA', 'La respuesta necesita un identificador estable.');
      return await abrir(String(registro.id), desdeRespuesta(registro));
    } catch (error) {
      if (peticion < control.current.peticion) return false;
      const s = sesion.current; s.errorCarga = error; s.cargando = false; publicar(s); return false;
    }
  }, [abrir, publicar]);

  useEffect(() => {
    let cancelado = false;
    let desuscribir = () => {};
    let versionCuenta = 0;
    let cambioCuenta = false;
    control.current.montado = true;
    const inicializar = async () => {
      let peticion = control.current.peticion;
      try {
        if (!persistirTrabajo) return;
        // Auth debe seguir observado aunque falle el cache o se demore la restauracion.
        desuscribir = await observarCuentaTrabajo((nuevoAmbito) => {
          if (cancelado) return;
          versionCuenta += 1;
          if (control.current.ambito === undefined) {
            control.current.ambito = nuevoAmbito;
            sesion.current.ambito = nuevoAmbito;
            return;
          }
          if (nuevoAmbito === control.current.ambito) return;
          // No ejecutar llamadas auth dentro del callback de Supabase.
          cambioCuenta = true;
          const vieja = sesion.current;
          clearTimeout(vieja.timer); vieja.timer = null;
          control.current.peticion += 1;
          control.current.ambito = nuevoAmbito;
          const s = crearSesion('manual', {}, nuevoAmbito, ++control.current.token);
          s.errorCarga = errorTrabajo('CAMBIO_CUENTA', 'La sesion cambio. Abre de nuevo una respuesta de esta cuenta.');
          sesion.current = s;
          publicar(s);
        });
        if (cancelado) { desuscribir(); return; }
        const versionAntesDeLeer = versionCuenta;
        const ambitoLeido = await obtenerAmbitoTrabajo();
        if (cancelado || cambioCuenta || peticion !== control.current.peticion) return;
        // Un evento recibido durante getSession prevalece sobre esa lectura anterior.
        const ambito = versionAntesDeLeer === versionCuenta ? ambitoLeido : control.current.ambito;
        control.current.ambito = ambito;
        sesion.current.ambito = ambito;
        if (ambito && !pacienteInicial && peticion === 0) {
          const clave = claveTrabajoActiva(ambito);
          if (clave) {
            const restauracion = abrir(clave, normalizarTrabajo());
            peticion = control.current.peticion;
            await restauracion;
          }
        }
        if (cancelado || cambioCuenta || peticion !== control.current.peticion) return;
        sesion.current.lista = true;
        publicar(sesion.current);
      } catch (error) {
        if (!cancelado && !cambioCuenta && peticion === control.current.peticion) {
          sesion.current.lista = true; sesion.current.errorCarga = error; publicar(sesion.current);
        }
      }
    };
    void inicializar();
    const antesSalir = (evento) => {
      const s = sesion.current;
      if (s.revision > 0 && !local(s)) { evento.preventDefault(); evento.returnValue = ''; }
    };
    if (persistirTrabajo) window.addEventListener('beforeunload', antesSalir);
    return () => {
      cancelado = true; desuscribir(); control.current.montado = false;
      clearTimeout(sesion.current.timer); sesion.current.timer = null;
      if (persistirTrabajo && sesion.current.revision > 0) local(sesion.current);
      window.removeEventListener('beforeunload', antesSalir);
    };
  }, [abrir, local, pacienteInicial, persistirTrabajo, publicar]);

  const inicialRef = useRef(pacienteInicial);
  useEffect(() => {
    if (inicialRef.current === pacienteInicial) return;
    inicialRef.current = pacienteInicial;
    // Sin id de respuesta, la inyeccion se mantiene efimera y nunca usa el cajon manual.
    void abrir(pacienteInicial ? null : 'manual', normalizarTrabajo({ paciente: pacienteInicial }), false)
      .catch(error => { sesion.current.errorCarga = error; publicar(sesion.current); });
  }, [abrir, pacienteInicial, publicar]);

  // Cada callback de edicion queda ligado a la instancia que lo entrego a la UI.
  const token = vista.instanciaTrabajo;
  const editar = useCallback((transformar, automatico = false, clinico = false) => {
    const s = sesion.current;
    if (s.token !== token || !s.lista || s.bloqueada || (automatico && s.cargando)) return null;
    const siguiente = transformar(s.trabajo);
    if (siguiente === s.trabajo) return s.trabajo;
    s.trabajo = siguiente;
    s.revision += 1;
    if (clinico) s.edicionClinica = true;
    s.cuando = new Date().toISOString();
    s.pendienteNube = puedeNube(s);
    if (persistirTrabajo && s.clave !== null) {
      local(s);
      if (puedeNube(s)) {
        clearTimeout(s.timer);
        s.timer = setTimeout(() => { s.timer = null; void guardarSesion(s); }, 2000);
      }
    }
    publicar(s);
    return siguiente;
  }, [guardarSesion, local, persistirTrabajo, puedeNube, publicar, token]);

  const guardar = useCallback(() => guardarSesion(sesion.current), [guardarSesion]);
  const reintentarTrabajo = useCallback(async () => {
    const s = sesion.current;
    if (s.guardando) await s.guardando;
    if (s.lectura) await s.lectura;
    if (sesion.current !== s) return false;
    await leerNube(s);
    if (sesion.current !== s || s.errorCarga || s.conflicto) return false;
    if (s.pendienteNube || s.errorLocal || s.errorNube) {
      const resultado = await guardarSesion(s);
      return sesion.current === s && resultado.ok && (!puedeNube(s) || resultado.nube);
    }
    return true;
  }, [guardarSesion, leerNube, puedeNube]);
  const actualizarGestion = useCallback(async (parcial, evento) => {
    const s = sesion.current;
    const trabajo = editar((t) => {
      const anterior = t.gestionConsulta;
      const patch = typeof parcial === 'function' ? parcial(anterior) : parcial;
      if (!patch || typeof patch !== 'object') throw errorTrabajo('GESTION_INVALIDA', 'La gestion necesita un objeto de cambios.');
      if (patch.seleccion !== undefined && (!Array.isArray(patch.seleccion) || patch.seleccion.some(id => typeof id !== 'string'))) {
        throw errorTrabajo('GESTION_INVALIDA', 'La seleccion debe contener identificadores de instrumentos.');
      }
      const vinculo = patch.vinculo === undefined ? anterior.vinculo
        : patch.vinculo === null ? null : { ...anterior.vinculo, ...patch.vinculo };
      if (vinculo && !['confirmado', 'retirado'].includes(vinculo.estado)) {
        throw errorTrabajo('GESTION_INVALIDA', 'El vinculo requiere estado confirmado o retirado.');
      }
      const fecha = new Date().toISOString();
      const nuevosEventos = Array.isArray(patch.auditoria) ? patch.auditoria : [];
      // El ultimo segmento del ambito cuenta:<URL>:<user.id> es el autor autenticado.
      const autorId = evento?.autorId ?? (s.ambito?.startsWith('cuenta:') ? s.ambito.slice(s.ambito.lastIndexOf(':') + 1) : null);
      const siguiente = {
        revision: patch.revision ? { ...anterior.revision, ...patch.revision } : anterior.revision,
        vinculo, seleccion: patch.seleccion ? [...new Set(patch.seleccion)] : anterior.seleccion };
      const antes = {}, despues = {};
      for (const campo of ['revision', 'vinculo', 'seleccion']) {
        if (patch[campo] !== undefined) { antes[campo] = anterior[campo]; despues[campo] = siguiente[campo]; }
      }
      const eventoFinal = { tipo: evento?.tipo || 'gestion_actualizada', fecha, ...evento, autorId,
        respuestaId: s.clave, anterior: JSON.parse(JSON.stringify(antes)), nuevo: JSON.parse(JSON.stringify(despues)) };
      return { ...t, gestionConsulta: { ...anterior, ...siguiente,
        auditoria: [...anterior.auditoria, ...nuevosEventos, eventoFinal] } };
    });
    if (!trabajo) throw errorTrabajo('CONTEXTO_OBSOLETO', 'La paciente activa cambio antes de aplicar esta gestion.');
    const resultado = await guardarSesion(s);
    if (!resultado.ok) throw resultado.error || errorTrabajo('SIN_GUARDAR', 'La gestion sigue en memoria y no se pudo guardar.');
    return trabajo.gestionConsulta;
  }, [editar, guardarSesion]);

  const actualizar = useCallback((grupo, campo, valor) => editar(t => ({ ...t,
    paciente: { ...t.paciente, [grupo]: { ...t.paciente[grupo], [campo]: valor } } }), false, true), [editar]);
  const mezclar = useCallback((grupo, parcial) => editar(t => ({ ...t,
    paciente: { ...t.paciente, [grupo]: { ...t.paciente[grupo], ...parcial } } }), false, true), [editar]);
  const guardarAutoReporte = useCallback(parcial => mezclar('autoReporte', parcial), [mezclar]);
  const setDatosInstrumento = useCallback((id, d, automatico = false) => editar(t => {
    const datos = typeof d === 'function' ? d(t.datosInstrumentos[id]) : d;
    if (JSON.stringify(t.datosInstrumentos[id]) === JSON.stringify(datos)) return t;
    return { ...t, datosInstrumentos: { ...t.datosInstrumentos, [id]: datos } };
  }, automatico, !automatico), [editar]);
  const publicarResumen = useCallback((id, resumen) => {
    if (!sesion.current.edicionClinica) return;
    return editar(t => {
    if (JSON.stringify(t.resumenes[id]) === JSON.stringify(resumen)) return t;
    return { ...t, resumenes: { ...t.resumenes, [id]: resumen } };
    }, true);
  }, [editar, vista.cargandoTrabajo]); // Abrir no recalcula el resumen persistido.
  const cambiarSugerencia = useCallback((id, descartar) => editar(t => {
    if (t.descartados.includes(id) === descartar) return t;
    const descartados = descartar ? [...t.descartados, id] : t.descartados.filter(x => x !== id);
    const s = sesion.current;
    const autorId = s.ambito?.startsWith('cuenta:') ? s.ambito.slice(s.ambito.lastIndexOf(':') + 1)
      : s.ambito === 'local' ? 'local' : null;
    const evento = { tipo: descartar ? 'sugerencia_descartada' : 'sugerencia_restaurada',
      autorId, fecha: new Date().toISOString(), respuestaId: s.clave, instrumentoId: id,
      anterior: { descartados: [...t.descartados] }, nuevo: { descartados: [...descartados] } };
    return { ...t, descartados, gestionConsulta: { ...t.gestionConsulta,
      auditoria: [...t.gestionConsulta.auditoria, evento] } };
  }), [editar]);
  const descartarSugerencia = useCallback(id => cambiarSugerencia(id, true), [cambiarSugerencia]);
  const restaurarSugerencia = useCallback(id => cambiarSugerencia(id, false), [cambiarSugerencia]);

  const reiniciar = useCallback(async () => {
    const s = sesion.current;
    ++control.current.peticion;
    clearTimeout(s.timer); s.timer = null;
    s.bloqueada = true;
    s.cargando = true; publicar(s);
    try {
      if (s.guardando) await s.guardando;
      if (s.lectura) await s.lectura;
      if (sesion.current !== s) return false;
      if (puedeNube(s)) await borrarTrabajoNube(s.clave, { versionEsperada: s.versionNube, ambito: s.ambito });
      if (persistirTrabajo && s.clave !== null) borrarTrabajoLocal(s.clave, s.ambito);
      if (sesion.current !== s) return false;
      sesion.current = crearSesion('manual', {}, s.ambito, ++control.current.token);
      publicar(sesion.current);
      return true;
    } catch (error) { s.errorNube = error; return false; }
    finally { s.cargando = false; s.bloqueada = false; publicar(s); }
  }, [persistirTrabajo, puedeNube, publicar]);

  const guardarResultado = useCallback((instrumentoId, resultado) => {
    if (sesion.current.token === token) onGuardarResultado?.({ instrumentoId, resultado, paciente: sesion.current.trabajo.paciente });
  }, [onGuardarResultado, token]);

  const valor = useMemo(() => ({ ...vista, error: vista.errorTrabajo,
    paciente: vista.paciente, actualizar, mezclar, reiniciar, guardarResultado, publicarResumen,
    irA: irA || (() => {}), autoReporte: vista.paciente.autoReporte || {}, guardarAutoReporte,
    cargarRespuesta, descartarSugerencia, restaurarSugerencia, setDatosInstrumento, guardar, actualizarGestion, reintentarTrabajo,
  }), [vista, actualizar, mezclar, reiniciar, guardarResultado, publicarResumen, irA, guardarAutoReporte,
    cargarRespuesta, descartarSugerencia, restaurarSugerencia, setDatosInstrumento, guardar, actualizarGestion, reintentarTrabajo]);
  return <PacienteContext.Provider value={valor}>{children}</PacienteContext.Provider>;
}

export function usePaciente() {
  const ctx = useContext(PacienteContext);
  if (!ctx) throw new Error('usePaciente debe usarse dentro de PacienteProvider');
  return ctx;
}

/** Una sola fuente de datos: no hay un useState del instrumento que sobreviva a A -> B. */
export function useInstrumento(id, factory) {
  const ctx = usePaciente();
  const fabrica = useRef(factory);
  fabrica.current = factory;
  const inicial = useMemo(() => combinarPrecarga(fabrica.current(), precargaInstrumento(id, ctx.paciente).valores), [id, ctx.instanciaTrabajo, ctx.revisionRestauracion, ctx.paciente.autoReporte]);
  const d = useMemo(() => combinarPrecarga(inicial, {}, ctx.datosInstrumentos[id]), [inicial, ctx.datosInstrumentos[id]]);
  const setDatos = ctx.setDatosInstrumento;
  const setD = useCallback(upd => setDatos(id, anterior => typeof upd === 'function'
    ? upd(combinarPrecarga(inicial, {}, anterior)) : upd), [id, inicial, setDatos]);
  return [d, setD];
}
