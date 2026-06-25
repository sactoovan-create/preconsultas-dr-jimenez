import React from 'react';

/**
 * Aviso de privacidad de la paciente. Página pública, enlazada desde el
 * consentimiento del portal. Por requerirlo el tratamiento de datos de salud, la
 * paciente debe poder leerlo antes de enviar.
 *
 * COMPLETAR antes de abrir al público los tres campos de DATOS (correo de contacto,
 * domicilio y fecha). El resto del texto es un borrador para que lo revises con tu
 * criterio profesional y, si lo consideras, asesoría legal.
 */
const DATOS = {
  responsable: 'Dr. Iván Jiménez Martínez',
  especialidad: 'Ginecología',
  contacto: '[tu correo de contacto]',
  domicilio: '[domicilio del consultorio]',
  actualizado: '[fecha]',
};

const VERDE = '#1F3A2E';
const CREMA = '#F1EADB';
const PAPEL = '#FDFBF6';
const DORADO = '#A88B5C';
const TINTA = '#2D2A26';

function Bloque({ titulo, children }) {
  return (
    <section style={{ marginTop: 26 }}>
      <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.15rem', color: VERDE, margin: '0 0 8px' }}>{titulo}</h2>
      <div style={{ fontSize: '0.98rem', lineHeight: 1.7, color: TINTA }}>{children}</div>
    </section>
  );
}

export default function AvisoPrivacidad() {
  return (
    <div style={{ minHeight: '100vh', background: CREMA, padding: '40px 20px', fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 760, margin: '0 auto', background: PAPEL, borderRadius: 16, padding: '40px 36px', boxShadow: '0 10px 40px rgba(31,58,46,0.08)', borderTop: `3px solid ${DORADO}` }}>
        <a href="/" style={{ color: DORADO, fontSize: '0.9rem', textDecoration: 'none' }}>← Volver</a>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.9rem', color: VERDE, margin: '14px 0 4px' }}>Aviso de privacidad</h1>
        <p style={{ color: '#6F6A60', fontSize: '0.95rem', marginTop: 0 }}>Tus datos de salud son confidenciales y se usan solo para tu atención médica.</p>

        <Bloque titulo="Responsable de tus datos">
          El <strong>{DATOS.responsable}</strong> ({DATOS.especialidad}), con domicilio en {DATOS.domicilio} y
          correo de contacto {DATOS.contacto}, es el responsable del uso y protección de
          tus datos personales, conforme a la Ley Federal de Protección de Datos
          Personales en Posesión de los Particulares.
        </Bloque>

        <Bloque titulo="Qué datos recabamos">
          Cuando respondes el cuestionario previo a tu consulta, recabamos datos de
          identificación y contacto (nombre, edad, teléfono y, si lo proporcionas, correo
          electrónico) y <strong>datos de salud</strong> (síntomas, antecedentes médicos,
          ginecológicos y familiares, medicamentos y demás información clínica que decidas
          compartir). Los datos de salud son datos personales sensibles.
        </Bloque>

        <Bloque titulo="Para qué los usamos">
          Únicamente para tu atención médica: preparar y dar tu consulta, integrar tu
          expediente clínico y darte seguimiento. No los usamos con fines de publicidad ni
          de mercadotecnia, y no los vendemos ni los compartimos con terceros ajenos a tu
          atención sin tu consentimiento. Además, cuando tu médico lo decida después de tu
          consulta, podemos enviarte material educativo relacionado con tu atención al
          teléfono o correo que proporcionaste; si es por WhatsApp, es un servicio de un
          tercero (Meta), el envío siempre lo inicia tu médico de forma manual, y puedes
          pedir que dejemos de hacerlo en cualquier momento.
        </Bloque>

        <Bloque titulo="Consentimiento para datos sensibles">
          Por tratarse de datos de salud, antes de enviar tus respuestas se te pide tu
          consentimiento expreso. Al marcar la casilla y enviar, autorizas su tratamiento
          para las finalidades anteriores. Puedes no contestar las secciones opcionales y
          aun así enviar.
        </Bloque>

        <Bloque titulo="Cómo los protegemos">
          Tus respuestas viajan de forma cifrada y se guardan en una base de datos con
          acceso restringido: solo el personal autorizado del consultorio, mediante usuario
          y contraseña, puede consultarlas. Las claves de acceso se mantienen en un entorno
          seguro y no son públicas.
        </Bloque>

        <Bloque titulo="Tus derechos">
          Tienes derecho a acceder a tus datos, rectificarlos si son inexactos, cancelarlos
          cuando consideres que no se requieren, y oponerte a su uso para fines específicos.
          Para ejercer cualquiera de estos derechos o revocar tu consentimiento, escribe a
          {' '}{DATOS.contacto}. La eliminación de tus respuestas puede realizarse de forma
          permanente a tu solicitud.
        </Bloque>

        <Bloque titulo="Conservación">
          Tus datos clínicos se conservan durante el tiempo necesario para tu atención y por
          los plazos que exige la normativa sanitaria aplicable al expediente clínico.
        </Bloque>

        <Bloque titulo="Cambios a este aviso">
          Este aviso puede actualizarse. Publicaremos la versión vigente en este mismo medio.
        </Bloque>

        <p style={{ color: '#6F6A60', fontSize: '0.85rem', marginTop: 28 }}>Última actualización: {DATOS.actualizado}.</p>
      </div>
    </div>
  );
}
