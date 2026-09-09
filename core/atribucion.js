// Datos de adquisición y agenda separados del auto-reporte clínico.
// Sin píxeles, eventos publicitarios ni transferencias a redes de anuncios.
export const CANALES_RESERVA = [
  { valor: 'whatsapp', etiqueta: 'WhatsApp' },
  { valor: 'doctoralia', etiqueta: 'Doctoralia' },
  { valor: 'telefono', etiqueta: 'Teléfono' },
  { valor: 'consultorio', etiqueta: 'En el consultorio' },
  { valor: 'otro', etiqueta: 'Otro' },
  { valor: 'no_recuerdo_prefiero_no_responder', etiqueta: 'No recuerdo / Prefiero no responder' },
];
export const FUENTES_DECLARADAS = [
  { valor: 'google_ads', etiqueta: 'Un anuncio en Google' },
  { valor: 'google_maps', etiqueta: 'Google o Google Maps' },
  { valor: 'instagram', etiqueta: 'Instagram' },
  { valor: 'facebook', etiqueta: 'Facebook' },
  { valor: 'doctoralia', etiqueta: 'Doctoralia' },
  { valor: 'recomendacion', etiqueta: 'Recomendación' },
  { valor: 'paciente_previa', etiqueta: 'Ya era paciente' },
  { valor: 'otro', etiqueta: 'Otro' },
  { valor: 'no_recuerdo_prefiero_no_responder', etiqueta: 'No recuerdo / Prefiero no responder' },
];
const TRACKING = ['gclid', 'wbraid', 'gbraid', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'campaign_id', 'ad_group_id', 'creative_id'];
const text = (value, length = 300) => typeof value === 'string' ? value.trim().slice(0, length) : '';

export function normalizarAtribucion(value = {}) {
  const input = value && typeof value === 'object' ? value : {};
  const output = {
    version: 1,
    booking_channel: CANALES_RESERVA.some((x) => x.valor === input.booking_channel) ? input.booking_channel : '',
    patient_reported_source: FUENTES_DECLARADAS.some((x) => x.valor === input.patient_reported_source) ? input.patient_reported_source : '',
    acquisition_source: text(input.acquisition_source, 120) || 'unknown',
    attribution_captured_at: text(input.attribution_captured_at, 40),
    lead_id: text(input.lead_id, 80),
  };
  TRACKING.forEach((key) => { if (text(input[key])) output[key] = text(input[key]); });
  return output;
}

export function validarAtribucion(value) {
  const atribucion = normalizarAtribucion(value);
  if (!atribucion.booking_channel) return {
    ok: false,
    campo: 'canalReserva',
    mensaje: 'Selecciona por dónde reservaste tu cita. También puedes elegir “No recuerdo / Prefiero no responder”.',
  };
  if (!atribucion.patient_reported_source) return {
    ok: false,
    campo: 'fuenteDeclarada',
    mensaje: 'Selecciona dónde conociste al Dr. Jiménez. También puedes elegir “No recuerdo / Prefiero no responder”.',
  };
  return { ok: true };
}

export function atribucionDesdeEnlace(search = globalThis.location?.search || '') {
  const params = new URLSearchParams(search);
  const value = {};
  [...TRACKING, 'booking_channel', 'lead_id'].forEach((key) => { value[key] = params.get(key) || ''; });
  // El enlace enviado por WhatsApp indica el transporte, no demuestra que
  // la paciente haya conocido al médico en WhatsApp.
  const source = text(value.utm_source, 120).toLowerCase();
  value.acquisition_source = value.gclid || value.wbraid || value.gbraid ? 'google_ads' :
    source && !['whatsapp', 'telefono', 'email'].includes(source) ? source :
    value.fbclid ? 'facebook_referral' : 'unknown';
  if (TRACKING.some((key) => value[key])) value.attribution_captured_at = new Date().toISOString();
  return normalizarAtribucion(value);
}

export function etiquetaAtribucion(value, options) {
  return options.find((option) => option.valor === value)?.etiqueta || 'Sin dato';
}
