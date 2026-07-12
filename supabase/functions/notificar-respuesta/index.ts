// Función de borde (Supabase Edge Function) que avisa al médico por correo cada
// vez que una paciente envía sus respuestas.
//
// Se dispara con un Database Webhook de Supabase sobre INSERT en public.respuestas
// (Database → Webhooks → Create → tabla respuestas, evento Insert, tipo HTTP
// Request apuntando a esta función). En el webhook, añade una cabecera
// "x-webhook-secret" con el mismo valor que el secreto WEBHOOK_SECRET de abajo,
// para que solo el webhook pueda dispararla.
//
// Variables de entorno (Edge Functions → notificar-respuesta → Secrets):
//   RESEND_API_KEY   clave del servicio de correo Resend (https://resend.com)
//   DESTINO_CORREO   correo del médico que recibe el aviso
//   ORIGEN_CORREO    remitente verificado (por ejemplo avisos@tudominio.com);
//                    si no tienes dominio, usa onboarding@resend.dev para pruebas.
//   WEBHOOK_SECRET   cadena secreta compartida con el webhook (OBLIGATORIO: sin él,
//                    la función rechaza todo, para no aceptar peticiones anónimas).
//
// La credencial vive aquí, en el entorno seguro de Supabase, nunca en el navegador.

Deno.serve(async (req) => {
  // Verifica que la petición provenga del webhook de Supabase (secreto compartido).
  // Falla cerrado: si el secreto no está configurado, se rechaza todo. Antes, un
  // secreto vacío dejaba pasar cualquier POST (podía disparar correos con datos
  // arbitrarios); ahora la ausencia del secreto bloquea en lugar de abrir.
  const secreto = Deno.env.get("WEBHOOK_SECRET");
  if (!secreto || req.headers.get("x-webhook-secret") !== secreto) {
    return new Response("No autorizado", { status: 401 });
  }

  try {
    const cuerpo = await req.json();
    const fila = cuerpo.record ?? cuerpo;

    // Extrae nombre y contacto, tolerando que "contenido" venga como objeto o texto.
    let contenido = fila?.contenido;
    if (typeof contenido === "string") {
      try { contenido = JSON.parse(contenido); } catch { contenido = {}; }
    }
    const pac = (contenido && contenido.paciente) || {};
    const nombreReal = (fila?.nombre ?? pac.nombre ?? "").toString().trim();
    const telefono = (pac.telefono ?? "").toString().trim();
    const correo = (pac.correo ?? "").toString().trim();

    // ¿La fila trae respuestas clínicas reales? (síntomas, dolor o historia).
    const ar = (contenido && contenido.autoReporte) || {};
    const tieneReporte = !!(
      (ar.mrs && Object.keys(ar.mrs).length) ||
      (ar.dolor && ar.dolor.tiene) ||
      (ar.hc && Object.keys(ar.hc).length)
    );

    // Anti-spam: una fila sin nombre, sin contacto y sin ninguna respuesta es ruido
    // de robot. No se envía aviso para no inundar el correo del médico; la fila igual
    // queda en la base y se puede depurar desde el panel.
    if (!nombreReal && !telefono && !correo && !tieneReporte) {
      return new Response("Fila sin datos; no se notifica", { status: 200 });
    }
    const nombre = nombreReal || "una paciente";

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const destino = Deno.env.get("DESTINO_CORREO");
    const origen = Deno.env.get("ORIGEN_CORREO") ?? "Portal de pacientes <onboarding@resend.dev>";
    if (!apiKey || !destino) {
      console.error("Faltan los secretos RESEND_API_KEY o DESTINO_CORREO");
      return new Response("Configuracion incompleta", { status: 500 });
    }

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: origen,
        to: [destino],
        subject: `Nueva respuesta de paciente: ${nombre}`,
        text: `${nombre} respondió el cuestionario previo a la consulta.\n\nEntra a tu panel del consultorio para ver el detalle: la sección "Respuestas de pacientes".`,
      }),
    });

    if (!r.ok) {
      console.error("Resend respondió error:", r.status, await r.text());
      return new Response("No se pudo enviar el aviso", { status: 502 });
    }
    return new Response("ok");
  } catch (e) {
    console.error("Error en notificar-respuesta:", e);
    return new Response("Error interno", { status: 500 });
  }
});
