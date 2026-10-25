#!/data/data/com.termux/files/usr/bin/bash
# =========================================================
# responder.sh — Genera el código y abre WhatsApp prellenado
# Uso: bash responder.sh usuario@email.com
# =========================================================
set -u
if [ $# -lt 1 ]; then echo "Uso: bash responder.sh usuario@email.com"; exit 1; fi

EMAIL="$1"
cd "$(dirname "$0")" || exit 1
WHATSAPP_NUMERO="5358101676"
PRECIO_CUP="50"

CODE=$(python3 generar-codigo.py "$EMAIL" 2>/dev/null)
if [ -z "$CODE" ]; then echo "❌ No se pudo generar el código"; exit 1; fi

MSG="✅ *Pago verificado*

Tu código de activación para *Analizador de Funciones* es:

\`\`\`
$CODE
\`\`\`

*Cómo activar:*
1. Abrí la app
2. En el modal, ingresá el código arriba
3. Tocá *🔓 Activar app*

¡Listo! Ya podés usarla sin límites.

Cualquier problema, escribime acá.

— Ever"

ENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$MSG")

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  CÓDIGO GENERADO                             ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  📧 Email:  $EMAIL"
echo "  🔑 Código: $CODE"
echo "  💰 Pago:   $PRECIO_CUP CUP"
echo ""

if command -v termux-clipboard-set >/dev/null 2>&1; then
  echo "$CODE" | termux-clipboard-set
  echo "  ✓ Código copiado al portapapeles"
fi

WA_URL="https://wa.me/$WHATSAPP_NUMERO?text=$ENC"
echo "  → Abriendo WhatsApp…"
if command -v termux-open-url >/dev/null 2>&1; then
  termux-open-url "$WA_URL"
else
  am start -a android.intent.action.VIEW -d "$WA_URL" >/dev/null 2>&1
fi
echo ""
