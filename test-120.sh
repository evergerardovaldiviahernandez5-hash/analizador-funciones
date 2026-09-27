#!/data/data/com.termux/files/usr/bin/bash
# =========================================================
# fix-footer.sh — Limpia el texto del footer
# =========================================================
set -u
cd "$(dirname "$0")" || exit 1

[ -f index.html ] || { echo "❌ No estás en la raíz."; exit 1; }

BK="index.html.bak-$(date +%H%M%S)"
cp -p index.html "$BK"
echo "📦 Backup → $BK"

python3 - <<'PYEOF'
path = 'index.html'
s = open(path, encoding='utf-8').read()
orig = s

# Opción A: dejar solo "Hecho por Ever"
old = '<small>Hecho por <strong>Ever</strong> · Funciona sin conexión · PWA educativa</small>'
new = '<small>Hecho por <strong>Ever</strong></small>'

if new in s:
    print('  ⚠ ya estaba simplificado')
elif old in s:
    s = s.replace(old, new, 1)
    print('  ✓ footer: quitado "Funciona sin conexión · PWA educativa"')
else:
    # Fallback con regex más tolerante
    import re
    s2, n = re.subn(
        r'<small>Hecho por\s*<strong>Ever</strong>.*?</small>',
        '<small>Hecho por <strong>Ever</strong></small>',
        s, count=1, flags=re.DOTALL)
    if n:
        s = s2
        print('  ✓ footer: quitado con regex')
    else:
        print('  ⚠ no encontré el footer — revisá index.html')

if s != orig:
    open(path, 'w', encoding='utf-8').write(s)
PYEOF

# Bump SW
python3 - <<'PYEOF'
import re
path = 'service-worker.js'
s = open(path, encoding='utf-8').read()
m = re.search(r"const CACHE = 'af-cache-v[^']+';", s)
if m:
    old = m.group(0); new = "const CACHE = 'af-cache-v28-0';"
    if old != new:
        s = s.replace(old, new, 1)
        open(path, 'w', encoding='utf-8').write(s)
        print('  ✓ cache bumped: ' + old + ' → ' + new)
PYEOF

echo ""
echo "✅ Listo. Recargá el navegador DOS veces."