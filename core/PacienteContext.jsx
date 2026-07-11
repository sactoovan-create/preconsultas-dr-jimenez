import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { pacienteDesdeRespuesta, ruteoDesdeRespuesta } from './precarga.js';

/**
 * Estado del paciente compartido por todos los instrumentos del módulo.
 *
 * Un solo paciente vive en este contexto, de modo que al pasar de un apartado a
 * otro (por ejemplo, del riesgo cardiometabólico al síndrome poliendocrino) no se
 * recapturan los datos comunes: demografía, signos y laboratorios se conservan.
 *
 * PUNTO DE INTEGRACIÓN CON GINEOS:
 * El proveedor acepta `pacienteInicial`. GineOS debe inyectar aquí el paciente
 * abierto en el expediente, mapeando sus campos a la forma de abajo. Si no se
 * inyecta nada, el módulo funciona de forma autónoma con captura manual.
 * Para persistir resultados en el expediente, pasar `onGuardarResultado`.
 */

const formaVacia = () => ({
  demografia: { nombre: '', edad: null, etapaReproductiva: 'pre', edadMenopausia: null, histerectomia: null },
  signos: { sistolica: null, diastolica: null, peso: null, talla: null, circunferencia: null },
  labs: { ct: null, hdl: null, tg: null, glu: null, hba1c: null, creat: null, egfr: null, uacr: null },
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

const PacienteContext = createContext(null);

export function PacienteProvider({ children, pacienteInicial, onGuardarResultado, irA }) {
  const [paciente, setPaciente] = useState(() => ({ ...formaVacia(), ...(pacienteInicial || {}) }));
  // Resumen clave que cada instrumento publica para el panel del paciente.
  const [resumenes, setResumenes] = useState({});
  // De dónde viene la paciente activa: null = captura manual;
  // { id, nombre, fecha } = se cargó desde una respuesta de pre-consulta.
  const [origen, setOrigen] = useState(null);
  // Ruteo clínico de la respuesta cargada (sugerencia inmutable del motor) y la
  // capa de decisión del médico (qué sugerencias quitó). La sugerencia nunca se
  // modifica; solo se marca como descartada y se puede restaurar.
  const [ruteo, setRuteo] = useState(null);
  const [descartados, setDescartados] = useState([]);

  // El auto-reporte de la paciente vive DENTRO del paciente compartido: es lo
  // que leen los instrumentos para prellenar. Una sola fuente de verdad.
  const guardarAutoReporte = useCallback((parcial) => {
    setPaciente((p) => ({ ...p, autoReporte: { ...(p.autoReporte || {}), ...parcial } }));
  }, []);

  // Carga una respuesta de pre-consulta como paciente activa: demografía,
  // antecedentes afirmados y auto-reporte, más su ruteo de instrumentos
  // sugeridos. Reinicia resúmenes y decisiones previas.
  const cargarRespuesta = useCallback((registro) => {
    const parcial = pacienteDesdeRespuesta(registro);
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
    setRuteo(ruteoDesdeRespuesta(registro));
    setDescartados([]);
    setOrigen({
      id: registro && registro.id,
      nombre: (registro && registro.paciente && registro.paciente.nombre) || null,
      fecha: (registro && registro.creado) || null,
    });
  }, []);

  // Decisión del médico sobre las sugerencias: quitar y restaurar.
  const descartarSugerencia = useCallback((instrumento) => {
    setDescartados((d) => (d.includes(instrumento) ? d : [...d, instrumento]));
  }, []);
  const restaurarSugerencia = useCallback((instrumento) => {
    setDescartados((d) => d.filter((x) => x !== instrumento));
  }, []);

  // Actualiza un campo de un grupo: actualizar('labs', 'glu', 92)
  const actualizar = useCallback((grupo, campo, valor) => {
    setPaciente((p) => ({ ...p, [grupo]: { ...p[grupo], [campo]: valor } }));
  }, []);

  // Mezcla un conjunto de campos en un grupo: por ejemplo, lo extraído por el lector.
  const mezclar = useCallback((grupo, parcial) => {
    setPaciente((p) => ({ ...p, [grupo]: { ...p[grupo], ...parcial } }));
  }, []);

  const reiniciar = useCallback(() => {
    setPaciente(formaVacia()); setResumenes({});
    setOrigen(null); setRuteo(null); setDescartados([]);
  }, []);

  const guardarResultado = useCallback((instrumentoId, resultado) => {
    if (onGuardarResultado) onGuardarResultado({ instrumentoId, resultado, paciente });
  }, [onGuardarResultado, paciente]);

  // Cada instrumento publica aquí su resultado clave. Se ignora si no cambió,
  // para no provocar renders en cadena.
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
  }), [paciente, actualizar, mezclar, reiniciar, guardarResultado, resumenes, publicarResumen, irA,
    guardarAutoReporte, origen, ruteo, descartados, cargarRespuesta, descartarSugerencia, restaurarSugerencia]);

  return <PacienteContext.Provider value={valor}>{children}</PacienteContext.Provider>;
}

export function usePaciente() {
  const ctx = useContext(PacienteContext);
  if (!ctx) throw new Error('usePaciente debe usarse dentro de PacienteProvider');
  return ctx;
}
