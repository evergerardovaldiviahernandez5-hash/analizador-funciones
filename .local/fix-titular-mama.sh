#!/data/data/com.termux/files/usr/bin/bash
# =========================================================
# fix-titular-mama.sh — Titular real: Maritany Hernández Gil
# =========================================================
set -u
cd "$HOME/analizadordefunciones" || { echo "❌ No existe el repo"; exit 1; }

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  FIX TITULAR — Maritany Hernández Gil                ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

NOMBRE='Maritany Hernández Gil'

# Backup
TS=$(date +%H%M%S)
cp js/activation.js "js/activation.js.bak-$TS"
echo "  ✓ Backup: js/activation.js.bak-$TS"

# Reemplazar el nombre roto por el real
sed -i "s|TITULAR: *'[^']*',|TITULAR: '$NOMBRE',|" js/activation.js

echo ""
echo "  Verificación:"
grep "TITULAR:" js/activation.js | head -1

echo ""
echo "  Datos completos del modal:"
grep -E "EMAIL:|WHATSAPP:|TRANSFMOVIL_TEL:|TRANSFMOVIL_TARJETA:|TITULAR:|PRECIO:" js/activation.js | sed 's/^ */    /'

node --check js/activation.js && echo ""
echo "  ✓ Sintaxis JS OK"

# Bump del Service Worker
python3 - <<'PYEOF'
import re
p = 'service-worker.js'
s = open(p, encoding='utf-8').read()
m = re.search(r"const CACHE = 'af-cache-v(\d+)-(\d+)';", s)
if m:
    old = m.group(0)
    new = f"const CACHE = 'af-cache-v{int(m.group(1))}-{int(m.group(2)) + 1}';"
    if old != new:
        s = s.replace(old, new, 1)
        print(f'  ✓ cache bumped: {old} → {new}')
open(p, 'w', encoding='utf-8').write(s)
PYEOF

# Commit
git add js/activation.js service-worker.js
git status --short
git commit -m "Titular correcto: Maritany Hernández Gil" >/dev/null 2>&1
echo ""
echo "  ✓ Commit hecho"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ LISTO                                            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  ▶ Push ahora:"
echo "      git push"
echo ""
echo "  ▶ Lo que verá el usuario en el modal:"
echo "      💳 Tarjeta Bandec:  9224 0699 9765 0763"
echo "      👤 Titular:         Maritany Hernández Gil"
echo "      💰 Importe:         50.00 CUP"
echo "      📱 WhatsApp:        +53 58101676"
echo ""
