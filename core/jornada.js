/**
 * Jornada e identidades del panel, sin red, almacenamiento ni lectura clinica.
 * agenda: filas de agenda_dia; respuestas: sobres de listarRespuestas (id, creado).
 * trabajos[String(respuesta.id)]: contenido medico o fila { contenido }.
 * Solo gestionConsulta.vinculo confirmado, con autor/fecha e IDs, es autoridad.
 * agenda_dia no publica patient_id ni un enlace ERP verificado a la respuesta:
 * no se confia en IDs incluidos en el sobre publico, nombres o telefonos.
 * Un pacienteId portal:* significa identidad confirmada EN EL PANEL, no en ERP.
 *
 * construirJornada -> { citas, grupos, sinVincular }
 * citas: { cita, respuestas, principal, candidatos, confirmada }[].
 * candidatos: { respuesta, criterio, advertencia }[] (pueden sugerir varias citas).
 * grupos: { id, nombre, pacienteId, respuestas, ultima, confirmado,
 *           etiquetaIdentidad, citas }[]. IDs p:<pacienteId> o r:<respuesta.id>.
 * Todos los campos respuesta/respuestas/principal/ultima conservan los originales.
 * grupo.citas contiene filas originales de agenda o snapshots del vinculo con
 * { cita_id, nombre, fecha, inicio, origen: 'vinculo-guardado' }, ultima cita primero.
 * sinVincular contiene respuestas sin vinculo valido, no historicos ya vinculados.
 * Las citas de jornada van por inicio ascendente; respuestas por creado descendente
 * (fecha del servidor, nunca submittedAtClient); fechas invalidas al final.
 * Los grupos siguen el orden de su ultima respuesta. No se mutan entradas.
 */
import { normalizarNombre, normalizarTelefono } from './emparejar.js';

const esObjeto = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const objeto = v => esObjeto(v) ? v : {};
const lista = v => Array.isArray(v) ? v.filter(esObjeto) : [];
const texto = v => typeof v === 'string' ? v.trim() : '';
const comparar = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const id = v => typeof v === 'string' && v.trim() ? v
  : Number.isSafeInteger(v) && v >= 0 ? String(v) : null;

function instante(v) {
  // Rechaza horas sin zona para no depender de la zona horaria del navegador.
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d))?$/.test(v)) return NaN;
  const fecha = v.slice(0, 10), dia = Date.parse(fecha);
  if (!Number.isFinite(dia) || new Date(dia).toISOString().slice(0, 10) !== fecha) return NaN;
  return Date.parse(v);
}

function porFecha(a, b, campo, direccion) {
  const fa = instante(a[campo]), fb = instante(b[campo]);
  const va = Number.isFinite(fa), vb = Number.isFinite(fb);
  if (va !== vb) return va ? -1 : 1;
  return va && fa !== fb ? direccion * (fa - fb) : 0;
}

const porRespuesta = (a, b) => porFecha(a, b, 'creado', -1)
  || comparar(id(a.id) ?? '', id(b.id) ?? '');
const porCita = (a, b, direccion = 1) => porFecha(a, b, 'inicio', direccion)
  || comparar(texto(a.fecha), texto(b.fecha)) || comparar(id(a.cita_id) ?? '', id(b.cita_id) ?? '');

function gestion(trabajo) {
  const t = objeto(trabajo);
  return objeto((Object.hasOwn(t, 'contenido') ? objeto(t.contenido) : t).gestionConsulta);
}

/**
 * Serializacion canonica completa, versionada y sin colisiones para valores JSON.
 * Conserva tipos, texto literal, orden de arrays, claves desconocidas e id/creado;
 * solo ignora el orden de claves de objetos. Rechaza ciclos y valores no JSON en
 * vez de omitirlos/coaccionarlos y autorizar por error una revision de otro valor.
 * NO es hash ni anonimiza: contiene el sobre completo. Solo comparacion privada
 * dentro del trabajo medico protegido; no logs, analitica, URLs ni Obsidian.
 */
export function huellaRespuesta(r) {
  const visitando = new Set();
  function serializar(v) {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
    if (typeof v === 'number' && Number.isFinite(v)) return Object.is(v, -0) ? '-0' : JSON.stringify(v);
    if (!esObjeto(v) && !Array.isArray(v)) throw new TypeError('La huella requiere contenido JSON.');
    const proto = Object.getPrototypeOf(v);
    if (!Array.isArray(v) && proto !== Object.prototype && proto !== null) throw new TypeError('La huella requiere objetos JSON.');
    if (visitando.has(v)) throw new TypeError('La huella no admite ciclos.');
    const claves = Reflect.ownKeys(v).filter(k => !(Array.isArray(v) && k === 'length'));
    for (const k of claves) {
      const descriptor = Object.getOwnPropertyDescriptor(v, k);
      if (typeof k === 'symbol' || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
        throw new TypeError('La huella requiere propiedades JSON enumerables, sin getters ni simbolos.');
      }
    }
    visitando.add(v);
    let resultado;
    if (Array.isArray(v)) {
      if (claves.length !== v.length || claves.some((k, i) => k !== String(i))) throw new TypeError('La huella requiere arrays JSON densos.');
      resultado = `[${Array.from(v, serializar).join(',')}]`;
    } else {
      resultado = `{${claves.sort(comparar).map(k => `${JSON.stringify(k)}:${serializar(v[k])}`).join(',')}}`;
    }
    visitando.delete(v);
    return resultado;
  }
  return `respuesta-json-v1:${serializar(r)}`;
}

/**
 * trabajo es UNA entrada de trabajos, no el indice entero. No marca por abrir.
 * vigente: decision auditada que corresponde exactamente a este sobre (tambien
 * puede ser una decision explicita 'pendiente'). Si no, estado siempre pendiente.
 * fecha/autorId/versionHuella conservan el sello guardado aunque ya no sea vigente.
 */
export function revisionRespuesta(r, trabajo = {}) {
  const revision = objeto(gestion(trabajo).revision);
  const resultado = {
    estado: 'pendiente', fecha: texto(revision.fecha) || null,
    autorId: id(revision.autorId), versionHuella: typeof revision.versionHuella === 'string' ? revision.versionHuella : null,
    vigente: false, motivo: 'sin-revision',
  };
  if (!Object.keys(revision).length) return resultado;
  if (!['revisada', 'pendiente'].includes(revision.estado)
    || !resultado.autorId || !Number.isFinite(instante(resultado.fecha)) || !resultado.versionHuella) {
    return { ...resultado, motivo: 'revision-incompleta' };
  }
  let huella;
  try { huella = huellaRespuesta(r); }
  catch (_) { return { ...resultado, motivo: 'contenido-no-comparable' }; }
  if (huella !== resultado.versionHuella) return { ...resultado, motivo: 'version-distinta' };
  return { ...resultado, estado: revision.estado, vigente: true, motivo: 'revision-explicita' };
}

/** Booleano para la UI: pendiente explicita, otra version o sello ausente = false. */
export function revisionVigente(r, trabajo = {}) {
  const revision = revisionRespuesta(r, trabajo);
  return revision.estado === 'revisada' && revision.vigente;
}

function leerVinculo(trabajo) {
  const v = objeto(gestion(trabajo).vinculo);
  if (v.estado !== 'confirmado' || !id(v.citaId) || !id(v.pacienteId)
    || !id(v.autorId) || !Number.isFinite(instante(v.confirmadoEn))) return null;
  return { ...v, citaId: id(v.citaId), pacienteId: id(v.pacienteId) };
}

function contacto(r) {
  // Solo identidad/contacto, incluido el formato legado. Nunca motivo o clinica.
  const p = objeto(r.paciente), hc = objeto(r.autoReporte?.hc);
  const nombre = texto(p.nombre ?? hc.nombre);
  const telefono = normalizarTelefono(p.telefono ?? hc.telefono);
  return { nombre, normalizado: normalizarNombre(nombre), telefono: telefono.length === 10 ? telefono : '' };
}

function sugerencia(cita, entrada, contactos, telefonosAgenda) {
  if (entrada.vinculo) return null;
  const { respuesta, contacto: p, trabajo } = entrada;
  const v = objeto(gestion(trabajo).vinculo);
  const citaId = id(cita.cita_id);
  const tel = normalizarTelefono(cita.telefono);
  const nom = normalizarNombre(texto(cita.nombre));
  const porTelefono = tel.length === 10 && tel === p.telefono;
  const porNombre = Boolean(nom && nom === p.normalizado);
  const enlacePendiente = citaId !== null && citaId === id(v.citaId) && v.estado === 'confirmado';
  if (!porTelefono && !porNombre && !enlacePendiente) return null;
  const avisos = ['Coincidencia sugerida; confirma identidad y cita.'];
  if (entrada.conflicto) avisos.push('Vinculos contradictorios para la misma cita; requiere conciliacion.');
  else if (enlacePendiente) avisos.push('Vinculo incompleto o cita duplicada; no se considera confirmado.');
  if (v.estado === 'retirado') avisos.push('El vinculo guardado fue retirado.');
  if (porTelefono && ((contactos.get(tel)?.size ?? 0) > 1 || (telefonosAgenda.get(tel) ?? 0) > 1)) avisos.push('Telefono compartido o varias citas posibles.');
  if (porTelefono && nom && p.normalizado && nom !== p.normalizado) avisos.push('El nombre es distinto.');
  if (porNombre && tel && p.telefono && tel !== p.telefono) avisos.push('Mismo nombre con telefono diferente.');
  avisos.push('La fecha de envio no determina la cita.');
  return {
    respuesta,
    criterio: porTelefono ? (porNombre ? 'tel\u00e9fono y nombre' : 'tel\u00e9fono') : porNombre ? 'nombre' : 'vinculo por conciliar',
    advertencia: avisos.join(' '),
  };
}

export function construirJornada(agenda, respuestas, trabajos = {}) {
  const indice = objeto(trabajos);
  const originales = lista(respuestas).slice().sort(porRespuesta);
  const citasPorId = new Map(), citasDuplicadas = new Set();
  const citas = [];
  for (const cita of lista(agenda)) {
    const clave = id(cita.cita_id);
    if (clave !== null && citasPorId.has(clave)) {
      citasDuplicadas.add(clave);
      continue;
    }
    const fila = { cita, respuestas: [], principal: null, candidatos: [], confirmada: false };
    citas.push(fila);
    if (clave !== null) citasPorId.set(clave, fila);
  }
  citas.sort((a, b) => porCita(a.cita, b.cita));

  const pacientesPorCita = new Map(), contactos = new Map(), telefonosAgenda = new Map();
  const entradas = originales.map(respuesta => {
    const clave = id(respuesta.id);
    const trabajo = clave !== null && Object.hasOwn(indice, clave) ? indice[clave] : {};
    const vinculo = leerVinculo(trabajo);
    if (vinculo) {
      if (!pacientesPorCita.has(vinculo.citaId)) pacientesPorCita.set(vinculo.citaId, new Set());
      pacientesPorCita.get(vinculo.citaId).add(vinculo.pacienteId);
    }
    const p = contacto(respuesta);
    if (p.telefono) {
      if (!contactos.has(p.telefono)) contactos.set(p.telefono, new Set());
      contactos.get(p.telefono).add(p.normalizado);
    }
    return { respuesta, trabajo, vinculo, contacto: p, conflicto: false };
  });
  for (const { cita } of citas) {
    const tel = normalizarTelefono(cita.telefono);
    if (tel.length === 10) telefonosAgenda.set(tel, (telefonosAgenda.get(tel) ?? 0) + 1);
  }
  // No elegimos arbitrariamente una identidad cuando dos confirmaciones discrepan.
  for (const entrada of entradas) {
    const v = entrada.vinculo;
    if (!v) continue;
    entrada.conflicto = pacientesPorCita.get(v.citaId).size > 1;
    if (entrada.conflicto || citasDuplicadas.has(v.citaId)) entrada.vinculo = null;
  }

  const gruposPorId = new Map(), historiaPorGrupo = new Map(), sinVincular = [];
  const clavesReservadas = new Set(originales.map(r => id(r.id)).filter(v => v !== null).map(v => `r:${v}`));
  entradas.forEach((entrada, posicion) => {
    const { respuesta, vinculo: v, contacto: p } = entrada;
    let clave = v ? `p:${v.pacienteId}` : id(respuesta.id) !== null ? `r:${id(respuesta.id)}` : `r:sin-id:${posicion}`;
    if (!v && id(respuesta.id) === null) {
      while (clavesReservadas.has(clave)) clave += ':';
      clavesReservadas.add(clave);
    }
    if (!gruposPorId.has(clave)) {
      gruposPorId.set(clave, {
        id: clave, nombre: (v && texto(v.nombre)) || p.nombre || 'Sin nombre',
        pacienteId: v?.pacienteId ?? null, respuestas: [], ultima: respuesta,
        confirmado: Boolean(v), etiquetaIdentidad: v ? 'Identidad confirmada en el panel' : 'Por identificar', citas: [],
      });
      historiaPorGrupo.set(clave, new Map());
    }
    gruposPorId.get(clave).respuestas.push(respuesta);
    if (!v) { sinVincular.push(respuesta); return; }
    const fila = citasPorId.get(v.citaId);
    if (fila) fila.respuestas.push(respuesta);
    const historia = historiaPorGrupo.get(clave);
    const previa = historia.get(v.citaId);
    if (!previa || instante(v.confirmadoEn) > instante(previa.confirmadoEn)) {
      historia.set(v.citaId, {
        confirmadoEn: v.confirmadoEn,
        cita: fila?.cita ?? {
          cita_id: v.citaId, nombre: texto(v.nombre) || p.nombre || null,
          fecha: texto(v.fecha) || null, inicio: texto(v.inicio) || null, origen: 'vinculo-guardado',
        },
      });
    }
  });
  for (const fila of citas) {
    fila.principal = fila.respuestas[0] ?? null;
    fila.confirmada = fila.respuestas.length > 0;
    fila.candidatos = entradas.map(e => sugerencia(fila.cita, e, contactos, telefonosAgenda)).filter(Boolean);
    if (fila.candidatos.length > 1) fila.candidatos = fila.candidatos.map(c => ({
      ...c, advertencia: `${c.advertencia} Hay varias respuestas candidatas.`,
    }));
  }
  const grupos = [...gruposPorId.values()];
  for (const grupo of grupos) grupo.citas = [...historiaPorGrupo.get(grupo.id).values()]
    .map(v => v.cita).sort((a, b) => porCita(a, b, -1));
  return { citas, grupos, sinVincular };
}
