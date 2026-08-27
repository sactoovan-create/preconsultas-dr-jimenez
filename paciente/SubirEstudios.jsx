import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  CircleAlert,
  CircleCheck,
  Clock3,
  FileImage,
  FileText,
  LoaderCircle,
  RotateCw,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  confirmarEstudiosSubidos,
  eliminarEstudioPaciente,
  subirEstudio,
  validarArchivoEstudio,
  MAX_ARCHIVOS,
} from '../core/estudios.js';
import './SubirEstudios.css';

/**
 * Buzón de estudios para la paciente, al final del cuestionario. Cada archivo se
 * sube en cuanto se selecciona y muestra su estado real. Los archivos van al
 * almacenamiento privado; la paciente no ve una carpeta ni inicia sesión manual.
 */

const ICONO = {
  pendiente: { texto: 'En espera', clase: 'espera', Icono: Clock3 },
  en_cola: { texto: 'En espera', clase: 'espera', Icono: Clock3 },
  subiendo: { texto: 'Subiendo…', clase: 'subiendo', Icono: LoaderCircle },
  verificando: { texto: 'Verificando…', clase: 'subiendo', Icono: LoaderCircle },
  listo: { texto: 'Recibido', clase: 'listo', Icono: CircleCheck },
  error: { texto: 'No se pudo', clase: 'error', Icono: CircleAlert },
};

function detalleError(error) {
  if (error?.code === 'grande') return 'Pesa demasiado; intenta una foto más pequeña';
  if (error?.code === 'formato') return error.message;
  if (error?.code === 'confirmacion') return 'No pudimos confirmar el archivo completo; presiona Reintentar';
  return 'Revisa tu conexión y presiona Reintentar';
}

function formatearBytes(bytes) {
  const cantidad = Number(bytes || 0);
  if (!cantidad) return '';
  if (cantidad < 1024 * 1024) return `${Math.max(1, Math.round(cantidad / 1024))} KB`;
  return `${(cantidad / (1024 * 1024)).toFixed(1)} MB`;
}

function puedePrevisualizar(file) {
  return /^image\/(jpeg|png|webp)$/i.test(file?.type || '');
}

const SubirEstudios = forwardRef(function SubirEstudios(
  {
    folder,
    habilitado = false,
    bloqueado = false,
    archivosIniciales = [],
    onEstadoCambio,
  },
  ref,
) {
  const inicialesRef = useRef(null);
  if (inicialesRef.current === null) {
    inicialesRef.current = archivosIniciales.map((resultado, indice) => ({
      id: `recuperado-${indice}-${resultado.path}`,
      nombre: resultado.nombre,
      estado: 'verificando',
      resultado,
      file: null,
    }));
  }
  const [items, setItems] = useState(inicialesRef.current);
  const itemsRef = useRef(inicialesRef.current);
  const subidasRef = useRef(new Map());
  const colaRef = useRef(Promise.resolve());
  const vivoRef = useRef(true);
  const [decision, setDecision] = useState(() => (archivosIniciales.length ? 'si' : null));
  const [aviso, setAviso] = useState('');

  const subiendo = items.some((i) => ['en_cola', 'subiendo', 'verificando'].includes(i.estado));
  const itemsSubidos = items.filter((i) => i.estado === 'listo' && i.resultado);
  // Conserva el comprobante también mientras se verifica o espera reintento. Si
  // la paciente recarga en ese instante, el portal puede volver a consultar el
  // mismo objeto en vez de perder su ruta y dejarlo huérfano.
  const itemsPersistibles = items.filter((i) => i.resultado);
  const listos = itemsSubidos.length;
  const pendientes = items.filter((i) => i.estado === 'pendiente').length;
  const errores = items.filter((i) => i.estado === 'error').length;

  const cambiarItems = useCallback((actualizador) => {
    if (!vivoRef.current) return;
    const siguientes = actualizador(itemsRef.current);
    itemsRef.current = siguientes;
    setItems(siguientes);
  }, []);

  useEffect(() => {
    // React StrictMode desmonta y vuelve a montar los efectos en desarrollo.
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
      itemsRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  useEffect(() => {
    const recuperados = itemsRef.current.filter(
      (item) => item.estado === 'verificando' && item.resultado && !item.file,
    );
    if (!recuperados.length) return undefined;
    let activo = true;

    confirmarEstudiosSubidos(folder, recuperados.map((item) => item.resultado))
      .then((confirmados) => {
        if (!activo) return;
        const porPath = new Map(confirmados.map((resultado) => [resultado.path, resultado]));
        cambiarItems((lista) => lista.map((item) => (
          porPath.has(item.resultado?.path)
            ? { ...item, estado: 'listo', resultado: porPath.get(item.resultado.path), detalle: undefined }
            : item
        )));
      })
      .catch((error) => {
        if (!activo) return;
        const definitivo = error?.code === 'confirmacion' && !error?.cause;
        const rutas = new Set(error?.rutas || []);
        const confirmadoEn = new Date().toISOString();
        cambiarItems((lista) => lista.map((item) => {
          if (!recuperados.some((recuperado) => recuperado.id === item.id)) return item;
          const afectado = !rutas.size || rutas.has(item.resultado?.path);
          if (!afectado) {
            return {
              ...item,
              estado: 'listo',
              resultado: { ...item.resultado, confirmadoEn },
              detalle: undefined,
              requiereSeleccion: false,
            };
          }
          return {
            ...item,
            estado: 'error',
            detalle: definitivo
              ? 'Ya no encontramos este archivo completo; quítalo y vuelve a seleccionarlo'
              : detalleError(error),
            requiereSeleccion: definitivo,
          };
        }));
      });

    return () => { activo = false; };
  }, [cambiarItems, folder]);

  useEffect(() => {
    if (!onEstadoCambio) return;
    onEstadoCambio({
      total: items.length,
      subiendo,
      listos,
      pendientes,
      errores,
      decision,
      archivos: itemsPersistibles.map((i) => i.resultado),
    });
  }, [decision, errores, items, listos, onEstadoCambio, pendientes, subiendo]);

  const iniciarSubida = useCallback((item) => {
    if (!item?.file && !item?.resultado) {
      cambiarItems((lista) => lista.map((actual) => (
        actual.id === item?.id
          ? { ...actual, estado: 'error', detalle: 'Vuelve a seleccionar este archivo' }
          : actual
      )));
      return Promise.resolve(null);
    }
    const existente = subidasRef.current.get(item.id);
    if (existente) return existente;

    // Una sola subida activa evita que Safari/iOS agote memoria al convertir y
    // enviar varias fotos clínicas grandes al mismo tiempo.
    cambiarItems((lista) => lista.map((actual) => (
      actual.id === item.id
        ? { ...actual, estado: 'en_cola', detalle: undefined, quitando: false }
        : actual
    )));
    const ejecutar = async () => {
      let resultado = item.forzarResubida ? undefined : item.resultado;
      try {
        if (item.forzarResubida && item.resultado?.path) {
          await eliminarEstudioPaciente(item.resultado.path).catch(() => {});
        }
        if (!resultado) {
          cambiarItems((lista) => lista.map((actual) => (
            actual.id === item.id
              ? { ...actual, estado: 'subiendo', detalle: undefined, quitando: false }
              : actual
          )));
          resultado = await subirEstudio(folder, item.file);
        }
        cambiarItems((lista) => lista.map((actual) => (
          actual.id === item.id
            ? {
              ...actual,
              estado: 'verificando',
              resultado,
              detalle: undefined,
              quitando: false,
              forzarResubida: false,
              requiereSeleccion: false,
            }
            : actual
        )));
        const [confirmado] = await confirmarEstudiosSubidos(folder, [resultado]);
        cambiarItems((lista) => lista.map((actual) => (
          actual.id === item.id
            ? {
              ...actual,
              estado: 'listo',
              resultado: confirmado,
              detalle: undefined,
              forzarResubida: false,
              requiereSeleccion: false,
            }
            : actual
        )));
        return confirmado;
      } catch (error) {
        const definitivo = error?.code === 'confirmacion' && !error?.cause;
        cambiarItems((lista) => lista.map((actual) => (
          actual.id === item.id
            ? {
              ...actual,
              estado: 'error',
              detalle: definitivo && !item.file
                ? 'Ya no encontramos este archivo completo; quítalo y vuelve a seleccionarlo'
                : detalleError(error),
              resultado,
              forzarResubida: definitivo && !!item.file,
              requiereSeleccion: definitivo && !item.file,
            }
            : actual
        )));
        return null;
      }
    };
    const tarea = colaRef.current.then(ejecutar, ejecutar);
    colaRef.current = tarea.catch(() => null);
    subidasRef.current.set(item.id, tarea);
    tarea.finally(() => subidasRef.current.delete(item.id));
    return tarea;
  }, [cambiarItems, folder]);

  useImperativeHandle(ref, () => ({
    async subirPendientes() {
      const porIniciar = itemsRef.current.filter((item) => item.estado === 'pendiente');
      porIniciar.forEach((item) => iniciarSubida(item));
      if (subidasRef.current.size) {
        await Promise.allSettled(Array.from(subidasRef.current.values()));
      }
      let actuales = itemsRef.current;
      const fallidos = actuales.filter((item) => item.estado === 'error');
      if (fallidos.length) {
        const fallo = new Error(
          fallidos.length === 1
            ? 'Reintenta o quita el estudio que no se pudo subir.'
            : `Reintenta o quita los ${fallidos.length} estudios que no se pudieron subir.`,
        );
        fallo.code = 'estudios';
        throw fallo;
      }
      const listosActuales = actuales.filter((item) => item.estado === 'listo' && item.resultado);
      if (listosActuales.length) {
        cambiarItems((lista) => lista.map((item) => (
          item.estado === 'listo' && item.resultado
            ? { ...item, estado: 'verificando', detalle: undefined }
            : item
        )));
        try {
          const confirmados = await confirmarEstudiosSubidos(
            folder,
            listosActuales.map((item) => item.resultado),
          );
          const porPath = new Map(confirmados.map((resultado) => [resultado.path, resultado]));
          cambiarItems((lista) => lista.map((item) => (
            porPath.has(item.resultado?.path)
              ? { ...item, estado: 'listo', resultado: porPath.get(item.resultado.path), detalle: undefined }
              : item
          )));
        } catch (error) {
          const rutas = new Set(error?.rutas || []);
          const definitivo = error?.code === 'confirmacion' && !error?.cause;
          cambiarItems((lista) => lista.map((item) => (
            item.resultado && (!rutas.size || rutas.has(item.resultado.path))
              ? {
                ...item,
                estado: 'error',
                detalle: definitivo && !item.file
                  ? 'Ya no encontramos este archivo completo; quítalo y vuelve a seleccionarlo'
                  : detalleError(error),
                forzarResubida: definitivo && !!item.file,
                requiereSeleccion: definitivo && !item.file,
              }
              : item
          )));
          const fallo = new Error('El almacenamiento no confirmó todos los estudios. Reintenta o quita el que indique error.');
          fallo.code = 'estudios';
          throw fallo;
        }
        actuales = itemsRef.current;
      }
      return actuales
        .filter((item) => item.estado === 'listo' && item.resultado)
        .map((item) => item.resultado);
    },
    restablecerPendientes() {
      cambiarItems((lista) => lista.map((item) => ({
        ...item,
        estado: 'error',
        detalle: item.file
          ? 'Presiona Reintentar para volver a enviar este archivo'
          : 'Vuelve a seleccionar este archivo',
        resultado: undefined,
      })));
    },
  }), [cambiarItems, iniciarSubida]);

  const quitar = async (item) => {
    setAviso('');
    const estadoAnterior = item.estado;
    if (item.resultado?.path) {
      cambiarItems((l) => l.map((it) => (it.id === item.id ? { ...it, estado: 'subiendo', quitando: true } : it)));
      try {
        await eliminarEstudioPaciente(item.resultado.path);
      } catch (_) {
        cambiarItems((l) => l.map((it) => (
          it.id === item.id ? { ...it, estado: estadoAnterior, quitando: false } : it
        )));
        setAviso('No pudimos quitar ese archivo. Inténtalo de nuevo.');
        return;
      }
    }
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    cambiarItems((l) => l.filter((it) => it.id !== item.id));
  };

  const onElegir = (e) => {
    if (!habilitado || bloqueado || decision !== 'si') return;
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setAviso('');
    const activos = itemsRef.current.length;
    const disponibles = MAX_ARCHIVOS - activos;
    if (disponibles <= 0) { setAviso(`Ya alcanzaste el máximo de ${MAX_ARCHIVOS} archivos.`); return; }
    const seleccionados = files.slice(0, disponibles).map((file) => {
      const validacion = validarArchivoEstudio(file);
      return { file, validacion };
    });
    const invalidos = seleccionados.filter(({ validacion }) => !validacion.ok);
    if (files.length > disponibles) setAviso(`Se tomaron ${disponibles}; el máximo es ${MAX_ARCHIVOS} archivos.`);
    else if (invalidos.length) setAviso('Uno o más archivos necesitan atención antes de enviar.');
    const nuevos = seleccionados.map(({ file, validacion }) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      nombre: file.name,
      estado: validacion.ok ? 'pendiente' : 'error',
      detalle: validacion.ok ? undefined : validacion.mensaje,
      file: validacion.ok ? file : null,
      previewUrl: validacion.ok && puedePrevisualizar(file) ? URL.createObjectURL(file) : null,
    }));
    if (nuevos.length) {
      cambiarItems((lista) => [...lista, ...nuevos]);
      nuevos.filter((item) => item.estado === 'pendiente').forEach((item) => iniciarSubida(item));
    }
  };

  const elegirDecision = (valor) => {
    setAviso('');
    if (valor === 'no' && itemsRef.current.length) {
      setAviso('Quita primero los archivos agregados para indicar que no tienes estudios ahora.');
      return;
    }
    setDecision(valor);
  };

  return (
    <section className="pc-estudios" aria-labelledby="pc-estudios-titulo">
      <header className="pc-estudios-cabecera">
        <span className="pc-estudios-cabecera-icono" aria-hidden="true"><Upload /></span>
        <div>
          <span className="pc-estudios-kicker">Adjuntos opcionales</span>
          <h2 id="pc-estudios-titulo">Estudios médicos</h2>
          <p>Agrega laboratorios, ultrasonidos o recetas en PDF o foto.</p>
        </div>
      </header>

      <div className="pc-estudios-privacidad">
        <ShieldCheck aria-hidden="true" />
        <span>Se guardan de forma privada y solo el consultorio puede abrirlos.</span>
      </div>

      {!habilitado && (
        <div className="pc-estudios-bloqueado" role="status">
          Acepta primero la autorización de arriba para habilitar esta sección.
        </div>
      )}

      <fieldset disabled={!habilitado || bloqueado} className="pc-estudios-pregunta">
        <legend>
          ¿Tienes algún estudio para compartir? *
        </legend>
        <div className="pc-estudios-decision">
          <button
            type="button"
            aria-pressed={decision === 'si'}
            onClick={() => elegirDecision('si')}
            className={decision === 'si' ? 'is-active' : ''}
          >
            Sí, los agregaré
          </button>
          <button
            type="button"
            aria-pressed={decision === 'no'}
            onClick={() => elegirDecision('no')}
            className={decision === 'no' ? 'is-active' : ''}
          >
            No los tengo ahora
          </button>
        </div>
      </fieldset>

      {decision === 'si' && (
        <label className="pc-estudios-selector" aria-disabled={!habilitado || bloqueado}>
          <Upload aria-hidden="true" />
          <span>
            <b>Agregar PDF o fotos</b>
            <small>Hasta {MAX_ARCHIVOS} archivos, máximo 15 MB cada uno</small>
          </span>
          <input className="pc-estudios-input" type="file" multiple disabled={!habilitado || bloqueado} accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,image/heic-sequence,image/heif-sequence" onChange={onElegir} />
        </label>
      )}

      {decision === 'no' && (
        <div className="pc-estudios-sin-adjuntos" role="status">
          <CircleCheck aria-hidden="true" />
          <span>Entendido. Puedes enviar el cuestionario y llevarlos después.</span>
        </div>
      )}

      {items.length > 0 && (
        <ul className="pc-estudios-lista" aria-live="polite">
          {items.map((it) => {
            const estado = ICONO[it.estado];
            const EstadoIcono = estado.Icono;
            const ArchivoIcono = /\.pdf$/i.test(it.nombre) ? FileText : FileImage;
            return (
            <li key={it.id}>
              <span className={`pc-estudios-archivo-icono${it.previewUrl ? ' tiene-preview' : ''}`} aria-hidden="true">
                {it.previewUrl ? <img src={it.previewUrl} alt="" /> : <ArchivoIcono />}
              </span>
              <span className="pc-estudios-archivo-datos">
                <span className="pc-estudios-archivo-nombre" title={it.nombre}>{it.nombre}</span>
                <small>{formatearBytes(it.resultado?.size || it.file?.size)}</small>
              </span>
              <span className="pc-estudios-archivo-controles">
                <span className={`pc-estudios-estado is-${estado.clase}`}>
                  <EstadoIcono className={['subiendo', 'verificando'].includes(it.estado) ? 'is-spinning' : ''} aria-hidden="true" />
                  {it.quitando ? 'Quitando…' : estado.texto}
                </span>
                {it.estado === 'error' && it.detalle && (
                  <span className="pc-estudios-error-detalle">{it.detalle}</span>
                )}
                {it.estado === 'error'
                  && (it.file || (it.resultado && !it.requiereSeleccion))
                  && !bloqueado && (
                  <button
                    type="button"
                    onClick={() => iniciarSubida(it)}
                    className="pc-estudios-accion"
                    aria-label={`Reintentar ${it.nombre}`}
                    title="Reintentar subida"
                  >
                    <RotateCw aria-hidden="true" />
                  </button>
                )}
                {!['en_cola', 'subiendo', 'verificando'].includes(it.estado) && !bloqueado && (
                  <button
                    type="button"
                    onClick={() => quitar(it)}
                    className="pc-estudios-accion is-danger"
                    aria-label={`Quitar ${it.nombre}`}
                    title="Quitar archivo"
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                )}
              </span>
            </li>
            );
          })}
        </ul>
      )}

      {aviso && <div className="pc-estudios-aviso" role="alert"><CircleAlert aria-hidden="true" />{aviso}</div>}
      {listos > 0 && !subiendo && (
        <div className="pc-estudios-confirmacion" role="status" aria-live="polite">
          <CircleCheck aria-hidden="true" />
          <span>{listos === 1
            ? 'Tu estudio fue recibido. Al enviar el cuestionario quedará ligado a tus respuestas.'
            : `Tus ${listos} estudios fueron recibidos. Al enviar el cuestionario quedarán ligados a tus respuestas.`}</span>
        </div>
      )}
    </section>
  );
});

export default SubirEstudios;
