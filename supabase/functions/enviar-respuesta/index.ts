// Edge Function: enviar-respuesta
//
// Camino BLINDADO para abrir el portal a público masivo. Recibe el registro de la
// paciente y un token de Cloudflare Turnstile, verifica el token del lado servidor y
// —solo si es válido— inserta la respuesta con la clave de servicio (que salta la
// seguridad por filas). Así se puede cerrar el insert anónimo directo.
//
// Se activa cuando el portal tiene definida la variable VITE_TURNSTILE_SITE_KEY; si
// no, el portal sigue insertando directo y esta función no se usa.
//
// Variables de entorno (Edge Functions -> enviar-respuesta -> Secrets):
//   TURNSTILE_SECRET   clave secreta del sitio de Cloudflare Turnstile.
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const secret = Deno.env.get("TURNSTILE_SECRET");
    if (!secret) return json({ error: "Turnstile no configurado en el servidor." }, 500);

    const { registro, token } = await req.json().catch(() => ({}));
    if (!registro || typeof registro !== "object") return json({ error: "Falta el registro." }, 400);
    if (!token) return json({ error: "Falta la verificación anti-robots." }, 400);

    // Tope de tamaño, igual que el CHECK del esquema.
    if (JSON.stringify(registro).length >= 60000) return json({ error: "Respuesta demasiado grande." }, 413);

    // Verifica el token contra Cloudflare, del lado servidor.
    const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: String(token) }),
    });
    const resultado = await verify.json().catch(() => ({ success: false }));
    if (!resultado.success) return json({ error: "Verificación anti-robots fallida." }, 403);

    // Inserta con la clave de servicio (salta la seguridad por filas).
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await sb.from("respuestas").insert({
      contenido: registro,
      creado: registro.creado ?? new Date().toISOString(),
      nombre: registro?.paciente?.nombre ?? null,
    });
    if (error) {
      console.error("Insert falló:", error);
      return json({ error: "No se pudo guardar la respuesta." }, 502);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("Error en enviar-respuesta:", e);
    return json({ error: "Error interno." }, 500);
  }
});
