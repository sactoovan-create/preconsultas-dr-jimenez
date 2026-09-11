import React, { Component, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

export function EstadoCarga({ fallo = false }) {
  const [lenta, setLenta] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setLenta(true), 8000);
    return () => clearTimeout(timer);
  }, []);
  return <main className="app-load">
    <img src="/marca/logo_maestro_web.svg" alt="dr. jiménez, ginecología" width="148" height="64" />
    <div role={fallo ? 'alert' : 'status'}>
      <h1>{fallo ? 'No se pudo abrir la página' : lenta ? 'La carga está tardando más de lo esperado' : 'Cargando…'}</h1>
      {(fallo || lenta) && <p>Puede haber una interrupción de conexión o una actualización pendiente.</p>}
    </div>
    {(fallo || lenta) && <button type="button" onClick={() => window.location.reload()}><RefreshCw size={18} aria-hidden="true" />Volver a cargar</button>}
  </main>;
}

// No recargar automáticamente: puede haber una entrevista o edición sin guardar.
export class ProteccionCarga extends Component {
  state = { fallo: false };
  static getDerivedStateFromError() { return { fallo: true }; }
  render() { return this.state.fallo ? <EstadoCarga fallo /> : this.props.children; }
}
