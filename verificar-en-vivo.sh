#!/usr/bin/env bash
# Comprueba en vivo que las piezas del sistema de pre-consulta quedaron bien
# conectadas. No guarda secretos: los lee de variables de entorno que TÚ exportas
# en la terminal antes de correrlo. Corre cada prueba solo si tiene lo que necesita.
#
# Uso:
#   export SUPABASE_URL="https://TU-PROYECTO.supabase.co"
#   export SUPABASE_ANON_KEY="..."          # clave anon public
#   export SUPABASE_SERVICE_KEY="..."       # opcional: clave service_role (para leer)
#   export ERP_BASE_URL="https://consultorio-erp2.onrender.com"   # opcional
#   export PRECONSULTAS_CRON_TOKEN="..."    # opcional: el token del cron
#   bash verificar-en-vivo.sh
#
# Deja una fila de prueba marcada "PRUEBA - borrar"; bórrala desde el panel del médico
# o desde Supabase cuando termines.

set -u
ahora="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
ok=0; fallas=0

linea() { printf '%s\n' "------------------------------------------------------------"; }

# --- Prueba 1: la paciente puede enviar (insert anónimo a Supabase) ---
if [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_ANON_KEY:-}" ]; then
  linea; echo "Prueba 1: envío de la paciente (insert con la clave anon)"
  body="{\"nombre\":\"PRUEBA - borrar\",\"creado\":\"$ahora\",\"contenido\":{\"version\":1,\"paciente\":{\"nombre\":\"PRUEBA - borrar\"},\"autoReporte\":{},\"resumen\":{},\"consentimiento\":false}}"
  code=$(curl -sS -o /tmp/humo1.json -w "%{http_code}" -X POST "${SUPABASE_URL%/}/rest/v1/respuestas" \
    -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" -H "Prefer: return=minimal" \
    --data "$body" --max-time 30 || echo "000")
  if [ "$code" = "201" ]; then echo "  OK ($code): la respuesta se guardó. La fila 'PRUEBA - borrar' debe estar en Supabase."; ok=$((ok+1))
  else echo "  FALLA ($code): no se pudo insertar. Revisa el esquema y la política RLS."; cat /tmp/humo1.json 2>/dev/null; fallas=$((fallas+1)); fi
else
  linea; echo "Prueba 1: OMITIDA (faltan SUPABASE_URL y/o SUPABASE_ANON_KEY)"
fi

# --- Prueba 1b: la paciente NO puede LEER lo enviado (la RLS bloquea el select anónimo) ---
if [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_ANON_KEY:-}" ]; then
  linea; echo "Prueba 1b: privacidad (la clave anon NO debe poder leer respuestas)"
  code=$(curl -sS -o /tmp/humo1b.json -w "%{http_code}" \
    "${SUPABASE_URL%/}/rest/v1/respuestas?select=id,nombre&limit=5" \
    -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY" --max-time 30 || echo "000")
  cuerpo="$(cat /tmp/humo1b.json 2>/dev/null)"
  if grep -q '"id"' /tmp/humo1b.json 2>/dev/null; then
    echo "  FALLA ($code): la clave anon PUDO leer respuestas. NO debe existir una política de SELECT para 'anon'."; fallas=$((fallas+1))
  else
    echo "  OK ($code): la clave anon no puede leer (respuesta: ${cuerpo:-vacía}). La seguridad por filas funciona."; ok=$((ok+1))
  fi
else
  linea; echo "Prueba 1b: OMITIDA (faltan SUPABASE_URL y/o SUPABASE_ANON_KEY)"
fi

# --- Prueba 2: el sistema puede leer (select con la service_role) ---
if [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_SERVICE_KEY:-}" ]; then
  linea; echo "Prueba 2: lectura del sistema (select con la clave service_role)"
  code=$(curl -sS -o /tmp/humo2.json -w "%{http_code}" \
    "${SUPABASE_URL%/}/rest/v1/respuestas?select=id,nombre,creado&order=creado.desc&limit=3" \
    -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    --max-time 30 || echo "000")
  if [ "$code" = "200" ]; then echo "  OK ($code): el sistema puede leer las respuestas. Últimas 3:"; cat /tmp/humo2.json 2>/dev/null; echo
    ok=$((ok+1))
  else echo "  FALLA ($code): la service_role no pudo leer. Revisa la clave."; cat /tmp/humo2.json 2>/dev/null; fallas=$((fallas+1)); fi
else
  linea; echo "Prueba 2: OMITIDA (falta SUPABASE_SERVICE_KEY)"
fi

# --- Prueba 3: el endpoint de cron del sistema responde ---
if [ -n "${ERP_BASE_URL:-}" ] && [ -n "${PRECONSULTAS_CRON_TOKEN:-}" ]; then
  linea; echo "Prueba 3: endpoint de sincronización del sistema"
  code=$(curl -sS -o /tmp/humo3.json -w "%{http_code}" -X POST "${ERP_BASE_URL%/}/preconsultas/cron-sync/" \
    -H "Authorization: Bearer $PRECONSULTAS_CRON_TOKEN" --max-time 60 || echo "000")
  case "$code" in
    200) echo "  OK ($code): sincronizó. Conteos:"; cat /tmp/humo3.json 2>/dev/null; echo; ok=$((ok+1));;
    401) echo "  FALLA ($code): token no coincide con el del servidor."; fallas=$((fallas+1));;
    503) echo "  AVISO ($code): endpoint desactivado (falta PRECONSULTAS_CRON_TOKEN en Render).";;
    *)   echo "  FALLA ($code): respuesta inesperada."; cat /tmp/humo3.json 2>/dev/null; fallas=$((fallas+1));;
  esac
else
  linea; echo "Prueba 3: OMITIDA (faltan ERP_BASE_URL y/o PRECONSULTAS_CRON_TOKEN)"
fi

linea
echo "Resumen: $ok correctas, $fallas con falla."
echo "Recuerda borrar la fila 'PRUEBA - borrar' cuando termines."
[ "$fallas" -eq 0 ]
