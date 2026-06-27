import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

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

const PacienteContext = createContext(null);

export function PacienteProvider({ children, pacienteInicial, onGuardarResultado, irA }) {
  const [paciente, setPaciente] = useState(() => ({ ...formaVacia(), ...(pacienteInicial || {}) }));
  // Resumen clave que cada instrumento publica para el panel del paciente.
  const [resumenes, setResumenes] = useState({});
  // Respuestas que la paciente deja en la pre-consulta; prellenan los instrumentos.
  const [autoReporte, setAutoReporte] = useState((pacienteInicial && pacienteInicial.autoReporte) || {});

  const guardarAutoReporte = useCallback((parcial) => {
    setAutoReporte((prev) => ({ ...prev, ...parcial }));
  }, []);

  // Actualiza un campo de un grupo: actualizar('labs', 'glu', 92)
  const actualizar = useCallback((grupo, campo, valor) => {
    setPaciente((p) => ({ ...p, [grupo]: { ...p[grupo], [campo]: valor } }));
  }, []);

  // Mezcla un conjunto de campos en un grupo: por ejemplo, lo extraído por el lector.
  const mezclar = useCallback((grupo, parcial) => {
    setPaciente((p) => ({ ...p, [grupo]: { ...p[grupo], ...parcial } }));
  }, []);

  const reiniciar = useCallback(() => { setPaciente(formaVacia()); setResumenes({}); }, []);

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
    autoReporte, guardarAutoReporte,
  }), [paciente, actualizar, mezclar, reiniciar, guardarResultado, resumenes, publicarResumen, irA, autoReporte, guardarAutoReporte]);

  return <PacienteContext.Provider value={valor}>{children}</PacienteContext.Provider>;
}

export function usePaciente() {
  const ctx = useContext(PacienteContext);
  if (!ctx) throw new Error('usePaciente debe usarse dentro de PacienteProvider');
  return ctx;
}
