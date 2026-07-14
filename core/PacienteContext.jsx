import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { pacienteDesdeRespuesta, ruteoDesdeRespuesta } from './precarga.js';
import { nubeActiva, cargarTrabajoNube, guardarTrabajoNube, borrarTrabajoNube } from './trabajo.js';

/**
 * Estado del paciente compartido por todos los instrumentos del módulo.
 *
 * Un solo paciente vive en este contexto, de modo que al pasar de un apartado a
 * otro (por ejemplo, del riesgo cardiometabólico al síndrome poliendocrino) no se
 * recapturan los datos comunes: demografía, signos y laboratorios se conservan.
 *
 * PERSISTENCIA: todo el trabajo del médico (datos capturados, resultados y datos
 * de cada instrumento) se guarda SOLO en este navegador, por paciente, de forma
 * automática. Al reabrir a la misma paciente o al recargar la página, se restaura.
 * Así no se pierde lo capturado en una consulta anterior. (Más adelante, esto puede
 * moverse al expediente vía onGuardarResultado.)
 */

const formaVacia = () => ({
  demografia: { nombre: '', edad: null, etapaReproductiva: 'pre', edadMenopausia: null, histerectomia: null },
  signos: { sistolica: null, diastolica: null, peso: null, talla: null, circunferencia: null },
  labs: { ct: null, hdl: null, tg: null, glu: null, insulina: null, hba1c: null, creat: null, egfr: null, uacr: null },
  antecedentes: {
    diabetes: null, tabaquismo: null, antihipertensivo: null, estatina: null,
    ecvEstablecida: null, ecvSubclinica: null,
    // Contraindicaciones de terapia hormonal sistémica. Fuente única compartida:
    // las capturan y leen tanto el instrumento de menopausia como el cardiometabólico.
    cancerMama: null, tromboembolismo: null, hepatica: null, sangradoNoDx: null,
    preeclampsia: false, diabetesGestacional: false, partoPretermino: false,
    restriccionCrecimiento: false, sindromePoliendocrino: false,
  },
});

// --- Almacenamiento local del trabajo del médico (por paciente) ---
const PREFIJO = 'drj_trabajo_';
const CLAVE_ACTIVA = 'drj_trabajo_activa';
function leerTrabajo(clave) {
  try { const s = localStorage.getItem(PREFIJO + clave); return s ? JSON.parse(s) : null; } catch (_) { return null; }
}
function escribirTrabajo(clave, datos) {
  try { localStorage.setItem(PREFIJO + clave, JSON.stringify(datos)); localStorage.setItem(CLAVE_ACTIVA, clave); } catch (_) { /* sin almacenamiento */ }
}
function borrarTrabajo(clave) {
  try { localStorage.removeItem(PREFIJO + clave); if (localStorage.getItem(CLAVE_ACTIVA) === clave) localStorage.removeItem(CLAVE_ACTIVA); } catch (_) { /* sin almacenamiento */ }
}
function claveActiva() { try { return localStorage.getItem(CLAVE_ACTIVA); } catch (_) { return null; } }
// ¿La fecha a es más nueva que b? (b nulo = a gana). Para preferir el trabajo más
// reciente entre el local y el de la nube.
function esMasNuevo(a, b) {
  if (!a) return false;
  if (!b) return true;
  try { return new Date(a).getTime() > new Date(b).getTime(); } catch (_) { return false; }
}

const PacienteContext = createContext(null);

export function PacienteProvider({ children, pacienteInicial, onGuardarResultado, irA }) {
  const [paciente, setPaciente] = useState(() => ({ ...formaVacia(), ...(pacienteInicial || {}) }));
  // Resumen clave que cada instrumento publica para el panel del paciente.
  const [resumenes, setResumenes] = useState({});
  // Datos crudos capturados en cada instrumento (por id). Es lo que se perdía al
  // recargar; ahora vive aquí y se persiste. Los instrumentos lo leen y escriben
  // vía el hook useInstrumento.
  const [datosInstrumentos, setDatosInstrumentos] = useState({});
  // De dónde viene la paciente activa: null = captura manual;
  // { id, nombre, fecha } = se cargó desde una respuesta de pre-consulta.
  const [origen, setOrigen] = useState(null);
  const [ruteo, setRuteo] = useState(null);
  const [descartados, setDescartados] = useState([]);
  // Momento del último guardado (para el indicador "Guardado").
  const [guardadoEn, setGuardadoEn] = useState(null);
  // Estado de la nube: null (sin nube) | 'guardando' | 'nube' (guardado en la nube)
  // | 'local' (solo se pudo guardar en este equipo).
  const [estadoNube, setEstadoNube] = useState(null);

  const claveRef = useRef('manual');       // clave de almacenamiento del paciente activo
  const restaurandoRef = useRef(false);    // evita auto-guardar mientras se restaura
  const montadoRef = useRef(false);
  const nubeTimerRef = useRef(null);       // espera breve antes de subir a la nube

  const setDatosInstrumento = useCallback((id, d) => {
    setDatosInstrumentos((prev) => ({ ...prev, [id]: d }));
  }, []);

  // Aplica un trabajo (local o de la nube) al estado, sin disparar auto-guardado.
  const aplicarTrabajo = useCallback((t) => {
    if (!t || !t.paciente) return;
    restaurandoRef.current = true;
    setPaciente(t.paciente);
    setResumenes(t.resumenes || {});
    setDatosInstrumentos(t.datosInstrumentos || {});
    if (t.origen !== undefined) setOrigen(t.origen);
    if (t.ruteo !== undefined) setRuteo(t.ruteo);
    setDescartados(t.descartados || []);
    setGuardadoEn(t.guardadoEn || null);
    setTimeout(() => { restaurandoRef.current = false; }, 0);
  }, []);

  // Restaura el trabajo activo al montar (recarga de página o reapertura de pestaña).
  // No aplica si GineOS inyecta un paciente inicial.
  useEffect(() => {
    if (!pacienteInicial) {
      const clave = claveActiva();
      const local = clave ? leerTrabajo(clave) : null;
      if (local && local.paciente) { claveRef.current = clave; aplicarTrabajo(local); }
      // Refresca desde la nube si hay algo más reciente para esta paciente.
      if (nubeActiva() && clave && clave !== 'manual') {
        cargarTrabajoNube(clave).then((nube) => {
          if (nube && nube.paciente && esMasNuevo(nube.guardadoEn, local && local.guardadoEn)) {
            claveRef.current = clave; aplicarTrabajo(nube); setEstadoNube('nube');
          }
        });
      }
    }
    montadoRef.current = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Guardado automático: cada cambio se persiste en el navegador, por paciente.
  useEffect(() => {
    if (!montadoRef.current || restaurandoRef.current) return;
    const hayContenido = origen || Object.keys(resumenes).length > 0
      || Object.keys(datosInstrumentos).length > 0
      || (paciente.demografia && paciente.demografia.nombre);
    if (!hayContenido) return;
    const clave = origen && origen.id != null ? String(origen.id) : 'manual';
    claveRef.current = clave;
    const cuando = new Date().toISOString();
    const contenido = { paciente, resumenes, datosInstrumentos, origen, ruteo, descartados, guardadoEn: cuando };
    escribirTrabajo(clave, contenido);
    setGuardadoEn(cuando);
    // Sube a la nube tras una breve espera (no en cada tecla). Solo con paciente real.
    if (nubeActiva() && origen && origen.id != null) {
      setEstadoNube('guardando');
      if (nubeTimerRef.current) clearTimeout(nubeTimerRef.current);
      nubeTimerRef.current = setTimeout(async () => {
        const ok = await guardarTrabajoNube(clave, contenido);
        setEstadoNube(ok ? 'nube' : 'local');
      }, 2000);
    }
  }, [paciente, resumenes, datosInstrumentos, origen, ruteo, descartados]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guardado manual (el botón "Guardar"). Fuerza la escritura local y, de inmediato,
  // la subida a la nube.
  const guardar = useCallback(() => {
    const clave = origen && origen.id != null ? String(origen.id) : 'manual';
    const cuando = new Date().toISOString();
    const contenido = { paciente, resumenes, datosInstrumentos, origen, ruteo, descartados, guardadoEn: cuando };
    escribirTrabajo(clave, contenido);
    setGuardadoEn(cuando);
    if (nubeActiva() && origen && origen.id != null) {
      setEstadoNube('guardando');
      if (nubeTimerRef.current) clearTimeout(nubeTimerRef.current);
      guardarTrabajoNube(clave, contenido).then((ok) => setEstadoNube(ok ? 'nube' : 'local'));
    }
  }, [paciente, resumenes, datosInstrumentos, origen, ruteo, descartados]);

  const guardarAutoReporte = useCallback((parcial) => {
    setPaciente((p) => ({ ...p, autoReporte: { ...(p.autoReporte || {}), ...parcial } }));
  }, []);

  // Carga una respuesta de pre-consulta como paciente activa. Si esa paciente ya
  // tiene trabajo guardado (una consulta previa), lo restaura tal cual; si no, la
  // arma desde la respuesta (demografía, antecedentes afirmados, auto-reporte, ruteo).
  const cargarRespuesta = useCallback((registro) => {
    const clave = registro && registro.id != null ? String(registro.id) : 'manual';
    claveRef.current = clave;
    const local = leerTrabajo(clave);
    const baseGuardadoEn = local && local.paciente ? (local.guardadoEn || null) : null;
    if (local && local.paciente) {
      aplicarTrabajo(local);
    } else {
      // Sin trabajo previo local: armar desde la respuesta.
      const parcial = pacienteDesdeRespuesta(registro);
      restaurandoRef.current = true;
      setPaciente(() => {
        const v = formaVacia();
        return {
          ...v,
          demografia: { ...v.demografia, ...parcial.demografia },
          antecedentes: { ...v.antecedentes, ...parcial.antecedentes },
          autoReporte: parcial.autoReporte,
        };
      });
      setResumenes({});
      setDatosInstrumentos({});
      setRuteo(ruteoDesdeRespuesta(registro));
      setDescartados([]);
      setGuardadoEn(null);
      setOrigen({
        id: registro && registro.id,
        nombre: (registro && registro.paciente && registro.paciente.nombre) || null,
        fecha: (registro && registro.creado) || null,
      });
      setTimeout(() => { restaurandoRef.current = false; }, 0);
    }
    try { localStorage.setItem(CLAVE_ACTIVA, clave); } catch (_) { /* sin almacenamiento */ }
    // La nube manda si tiene algo más reciente (trabajo desde otro equipo).
    if (nubeActiva() && clave !== 'manual') {
      cargarTrabajoNube(clave).then((nube) => {
        if (nube && nube.paciente && esMasNuevo(nube.guardadoEn, baseGuardadoEn)) {
          aplicarTrabajo(nube); setEstadoNube('nube');
        }
      });
    }
  }, [aplicarTrabajo]);

  const descartarSugerencia = useCallback((instrumento) => {
    setDescartados((d) => (d.includes(instrumento) ? d : [...d, instrumento]));
  }, []);
  const restaurarSugerencia = useCallback((instrumento) => {
    setDescartados((d) => d.filter((x) => x !== instrumento));
  }, []);

  const actualizar = useCallback((grupo, campo, valor) => {
    setPaciente((p) => ({ ...p, [grupo]: { ...p[grupo], [campo]: valor } }));
  }, []);

  const mezclar = useCallback((grupo, parcial) => {
    setPaciente((p) => ({ ...p, [grupo]: { ...p[grupo], ...parcial } }));
  }, []);

  // Vacía el lienzo y borra el trabajo guardado de esta paciente.
  const reiniciar = useCallback(() => {
    const clave = claveRef.current;
    borrarTrabajo(clave);
    if (nubeActiva() && clave && clave !== 'manual') borrarTrabajoNube(clave);
    claveRef.current = 'manual';
    setPaciente(formaVacia()); setResumenes({}); setDatosInstrumentos({});
    setOrigen(null); setRuteo(null); setDescartados([]); setGuardadoEn(null); setEstadoNube(null);
  }, []);

  const guardarResultado = useCallback((instrumentoId, resultado) => {
    if (onGuardarResultado) onGuardarResultado({ instrumentoId, resultado, paciente });
  }, [onGuardarResultado, paciente]);

  const publicarResumen = useCallback((id, resumen) => {
    setResumenes((prev) => {
      const ant = prev[id];
      if (ant && JSON.stringify(ant) === JSON.stringify(resumen)) return prev;
      return { ...prev, [id]: resumen };
    });
  }, []);

  const valor = useMemo(() => ({
    paciente, actualizar, mezclar, reiniciar, guardarResultado,
    resumenes, publicarResumen, irA: irA || (() => {}),
    autoReporte: paciente.autoReporte || {}, guardarAutoReporte,
    origen, ruteo, descartados, cargarRespuesta, descartarSugerencia, restaurarSugerencia,
    datosInstrumentos, setDatosInstrumento, guardar, guardadoEn, estadoNube,
  }), [paciente, actualizar, mezclar, reiniciar, guardarResultado, resumenes, publicarResumen, irA,
    guardarAutoReporte, origen, ruteo, descartados, cargarRespuesta, descartarSugerencia, restaurarSugerencia,
    datosInstrumentos, setDatosInstrumento, guardar, guardadoEn, estadoNube]);

  return <PacienteContext.Provider value={valor}>{children}</PacienteContext.Provider>;
}

export function usePaciente() {
  const ctx = useContext(PacienteContext);
  if (!ctx) throw new Error('usePaciente debe usarse dentro de PacienteProvider');
  return ctx;
}

/**
 * Estado local de un instrumento, PERSISTIDO. Reemplaza a useState en cada
 * instrumento: al montar lee lo ya capturado para esa paciente (si existe); cada
 * cambio se guarda en el contexto (y de ahí, automáticamente, en el navegador).
 */
export function useInstrumento(id, factory) {
  const { datosInstrumentos, setDatosInstrumento } = usePaciente();
  const [d, setDLocal] = useState(() => {
    const g = datosInstrumentos[id];
    return (g !== undefined && g !== null) ? g : factory();
  });
  // Persiste el estado inicial una vez, para que quede capturado aunque no se edite.
  useEffect(() => {
    if (datosInstrumentos[id] === undefined) setDatosInstrumento(id, d);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const setD = useCallback((upd) => {
    setDLocal((prev) => {
      const next = typeof upd === 'function' ? upd(prev) : upd;
      setDatosInstrumento(id, next);
      return next;
    });
  }, [id, setDatosInstrumento]);
  return [d, setD];
}
