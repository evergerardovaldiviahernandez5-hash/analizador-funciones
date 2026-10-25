#!/data/data/com.termux/files/usr/bin/bash
# =========================================================
# add-activation.sh
#   · Clona/actualiza el repo
#   · Crea js/activation.js (sistema de activación por email)
#   · Crea generar-codigo.py (para el distribuidor)
#   · Modifica index.html (agrega <script>)
#   · Modifica service-worker.js (precache + bump)
#   · Verifica con node --check
#   · Commit listo para push
# =========================================================
set -u

REPO="https://github.com/evergerardovaldiviahernandez5-hash/analizador-funciones.git"
WORK="$HOME/analizadordefunciones"

# 👇 CONFIGURÁ ACÁ ANTES DE CORRER
EMAIL_DISTRIBUIDOR='evergerardovaldiviahernandez5@gmail.com'
SALT='af-ever-2026-9k2x7b'

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   ADD ACTIVATION — Sistema de activación por email   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  Email distribuidor: $EMAIL_DISTRIBUIDOR"
echo "  Salt:               ${SALT:0:6}… (oculto)"
echo ""
read -p "  ¿Continuar? [s/N] " OK
[[ "$OK" == "s" || "$OK" == "S" ]] || { echo "Cancelado."; exit 0; }

# ---------- 1. Repo ----------
echo ""
echo "═══ 1. Repo ═══"
if [ -d "$WORK/.git" ]; then
    cd "$WORK"
    git fetch origin main >/dev/null 2>&1
    git reset --hard origin/main >/dev/null 2>&1
    echo "  ✓ Actualizado a origin/main"
else
    rm -rf "$WORK"
    git clone "$REPO" "$WORK" >/dev/null 2>&1
    cd "$WORK"
    echo "  ✓ Clonado"
fi
git config --global --add safe.directory "$WORK" 2>/dev/null || true

# ---------- 2. Backups ----------
echo ""
echo "═══ 2. Backups ═══"
TS=$(date +%H%M%S)
for f in index.html service-worker.js js/activation.js generar-codigo.py; do
    [ -f "$f" ] && cp "$f" "$f.bak-$TS" && echo "  ✓ $f → $f.bak-$TS"
done

# ---------- 3. js/activation.js ----------
echo ""
echo "═══ 3. js/activation.js ═══"

cat > js/activation.js <<ACT_EOF
/* =========================================================
   activation.js — Sistema de activación por email
   ---------------------------------------------------------
   Flujo:
     1. Primera apertura → bloquea la app con un modal.
     2. Pide el email del usuario.
     3. Abre el cliente de correo con un mensaje prellenado
        para el distribuidor.
     4. El distribuidor genera un código (offline, con
        generar-codigo.py) y lo envía al usuario.
     5. El usuario ingresa el código → se valida SHA-256 →
        se guarda en localStorage → nunca más se pide.

   Configuración: cambiar las dos constantes de abajo.
   ========================================================= */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window._afActivationInit) return;
  window._afActivationInit = true;

  // ⚙️ CONFIGURACIÓN ⚙️
  var EMAIL_DISTRIBUIDOR = '${EMAIL_DISTRIBUIDOR}';
  var SALT               = '${SALT}';
  var STORAGE_KEY        = 'af:activated';
  var PENDING_KEY        = 'af:pending-email';

  // =========================================================
  // 0. ¿Ya activado?
  // =========================================================
  function isActivated() {
    if (window._afDevMode === true) return true; // bypass dev
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var obj = JSON.parse(raw);
      return !!(obj && obj.email && obj.code);
    } catch (e) { return false; }
  }

  // =========================================================
  // 1. Generación del código (igual que generar-codigo.py)
  // =========================================================
  function generateCode(email) {
    var data = (email || '').toLowerCase().trim() + SALT;
    // SHA-256 vía Web Crypto (asíncrono)
    if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
      var enc = new TextEncoder().encode(data);
      return window.crypto.subtle.digest('SHA-256', enc).then(function (buf) {
        var arr = Array.from(new Uint8Array(buf));
        var hex = arr.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('').toUpperCase();
        return hex.slice(0, 4) + '-' + hex.slice(4, 8);
      });
    }
    // Fallback sincrónico (no recomendado, pero por si acaso)
    return Promise.resolve(fallbackHash(data));
  }

  // Fallback: DJB2 en hex, 8 chars. Solo se usa si crypto.subtle no existe (nunca en Android 5+)
  function fallbackHash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) + h) + str.charCodeAt(i);
      h = h & 0xFFFFFFFF;
    }
    var hex = (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
    return hex.slice(0, 4) + '-' + hex.slice(4, 8);
  }

  // =========================================================
  // 2. Estilos del modal (inyectados una sola vez)
  // =========================================================
  function injectStyles() {
    if (document.getElementById('af-activation-styles')) return;
    var css = document.createElement('style');
    css.id = 'af-activation-styles';
    css.textContent = \`
      .af-act-overlay {
        position: fixed; inset: 0; z-index: 999999;
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
        background: var(--bg-1, #0a0a1a);
        background-image: linear-gradient(-45deg, #0a0a1a, #2d2b55, #1a1740, #0a0a1a);
        background-size: 400% 400%;
        animation: afActBg 22s ease infinite;
        font-family: var(--font, system-ui, sans-serif);
        color: var(--text, #eef0ff);
        overflow-y: auto;
      }
      @keyframes afActBg {
        0%,100% { background-position: 0% 50%; }
        50%     { background-position: 100% 50%; }
      }
      .af-act-card {
        width: 100%; max-width: 420px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.16);
        border-radius: 20px;
        padding: 28px 22px 22px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.5);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        animation: afActIn 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      @keyframes afActIn {
        from { opacity: 0; transform: translateY(10px) scale(0.98); }
        to   { opacity: 1; transform: none; }
      }
      .af-act-logo {
        text-align: center;
        margin-bottom: 18px;
      }
      .af-act-logo-icon {
        display: inline-flex;
        align-items: center; justify-content: center;
        width: 60px; height: 60px;
        border-radius: 16px;
        background: linear-gradient(135deg, #4be1ec, #b892ff);
        font-size: 30px;
        box-shadow: 0 6px 20px rgba(75,225,236,0.35);
        margin-bottom: 10px;
      }
      .af-act-title {
        font-size: 1.15rem;
        font-weight: 700;
        margin: 0 0 6px;
        letter-spacing: -0.01em;
        text-align: center;
        background: linear-gradient(90deg, #4be1ec, #b892ff, #ff6b81);
        -webkit-background-clip: text; background-clip: text;
        color: transparent;
      }
      .af-act-sub {
        font-size: 0.86rem;
        color: var(--text-dim, #a7aac7);
        text-align: center;
        margin: 0 0 18px;
        line-height: 1.5;
      }
      .af-act-step { display: none; }
      .af-act-step.active { display: block; }
      .af-act-label {
        display: block;
        font-size: 0.78rem;
        color: var(--text-dim, #a7aac7);
        margin-bottom: 6px;
      }
      .af-act-input {
        width: 100%;
        padding: 12px 14px;
        font-family: inherit;
        font-size: 0.95rem;
        color: var(--text, #eef0ff);
        background: rgba(0,0,0,0.35);
        border: 1px solid rgba(255,255,255,0.16);
        border-radius: 12px;
        margin-bottom: 14px;
        outline: none;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      .af-act-input:focus {
        border-color: #4be1ec;
        box-shadow: 0 0 0 3px rgba(75,225,236,0.15);
      }
      .af-act-input.code {
        font-family: ui-monospace, monospace;
        text-align: center;
        letter-spacing: 0.15em;
        font-size: 1.15rem;
        text-transform: uppercase;
      }
      .af-act-btn {
        width: 100%;
        padding: 13px 16px;
        font-family: inherit;
        font-size: 0.95rem;
        font-weight: 600;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        transition: filter 0.15s, transform 0.1s;
        margin-bottom: 8px;
      }
      .af-act-btn.primary {
        background: linear-gradient(135deg, #4be1ec, #b892ff);
        color: #0a0a1a;
      }
      .af-act-btn.primary:hover { filter: brightness(1.1); }
      .af-act-btn.primary:active { transform: scale(0.98); }
      .af-act-btn.secondary {
        background: transparent;
        color: var(--text-dim, #a7aac7);
        border: 1px solid rgba(255,255,255,0.16);
        font-weight: 500;
      }
      .af-act-btn.secondary:hover {
        background: rgba(255,255,255,0.06);
        color: var(--text, #eef0ff);
      }
      .af-act-msg {
        font-size: 0.82rem;
        padding: 10px 12px;
        border-radius: 10px;
        margin-bottom: 12px;
        display: none;
        line-height: 1.4;
      }
      .af-act-msg.show { display: block; }
      .af-act-msg.err {
        background: rgba(255,107,129,0.15);
        border: 1px solid rgba(255,107,129,0.4);
        color: #ff9aa8;
      }
      .af-act-msg.ok {
        background: rgba(75,225,236,0.15);
        border: 1px solid rgba(75,225,236,0.4);
        color: #4be1ec;
      }
      .af-act-footer {
        text-align: center;
        font-size: 0.72rem;
        color: var(--text-dim, #a7aac7);
        margin-top: 14px;
        opacity: 0.7;
      }
      .af-act-copy {
        display: block;
        margin-top: 6px;
        font-family: ui-monospace, monospace;
        font-size: 0.78rem;
        color: #4be1ec;
        cursor: pointer;
        word-break: break-all;
        padding: 6px 8px;
        border-radius: 8px;
        background: rgba(75,225,236,0.08);
        border: 1px dashed rgba(75,225,236,0.3);
        text-align: center;
      }
      .af-act-copy:hover { background: rgba(75,225,236,0.15); }
      .af-act-success {
        text-align: center;
        padding: 20px 0;
      }
      .af-act-success-icon {
        font-size: 48px;
        margin-bottom: 10px;
        display: block;
        animation: afActPop 0.4s cubic-bezier(0.3, 1.5, 0.6, 1);
      }
      @keyframes afActPop {
        from { transform: scale(0.5); opacity: 0; }
        to   { transform: none; opacity: 1; }
      }
    \`;
    document.head.appendChild(css);
  }

  // =========================================================
  // 3. Construcción del modal
  // =========================================================
  function buildModal() {
    var overlay = document.createElement('div');
    overlay.id = 'af-activation-overlay';
    overlay.className = 'af-act-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = \`
      <div class="af-act-card">
        <div class="af-act-logo">
          <div class="af-act-logo-icon">ƒ</div>
        </div>
        <h2 class="af-act-title">Activación requerida</h2>
        <p class="af-act-sub">Esta es la primera vez que abrís la app. Pedí tu código de activación para continuar.</p>

        <div id="af-act-msg" class="af-act-msg"></div>

        <!-- Paso 1: email -->
        <div class="af-act-step active" data-step="email">
          <label class="af-act-label" for="af-act-email">Tu correo electrónico</label>
          <input type="email" id="af-act-email" class="af-act-input" placeholder="tu@email.com" autocomplete="email" inputmode="email">
          <button type="button" id="af-act-send" class="af-act-btn primary">📧 Solicitar código</button>
          <button type="button" id="af-act-have" class="af-act-btn secondary">Ya tengo un código</button>
        </div>

        <!-- Paso 2: código -->
        <div class="af-act-step" data-step="code">
          <label class="af-act-label" for="af-act-code">Código de activación</label>
          <input type="text" id="af-act-code" class="af-act-input code" placeholder="XXXX-XXXX" maxlength="9" autocomplete="off" autocapitalize="characters">
          <button type="button" id="af-act-verify" class="af-act-btn primary">✅ Activar</button>
          <button type="button" id="af-act-back" class="af-act-btn secondary">← Volver</button>
        </div>

        <!-- Paso 3: éxito -->
        <div class="af-act-step" data-step="ok">
          <div class="af-act-success">
            <span class="af-act-success-icon">🎉</span>
            <p style="margin:0;font-size:0.95rem;">¡Listo! Ya podés usar la app.</p>
          </div>
        </div>

        <div class="af-act-footer">Analizador de Funciones · por Ever</div>
      </div>
    \`;
    document.body.appendChild(overlay);
    return overlay;
  }

  // =========================================================
  // 4. Helpers del modal
  // =========================================================
  function showStep(name) {
    var steps = document.querySelectorAll('.af-act-step');
    for (var i = 0; i < steps.length; i++) {
      steps[i].classList.toggle('active', steps[i].getAttribute('data-step') === name);
    }
  }

  function showMsg(text, type) {
    var el = document.getElementById('af-act-msg');
    if (!el) return;
    el.textContent = text;
    el.className = 'af-act-msg show ' + (type || 'err');
  }

  function clearMsg() {
    var el = document.getElementById('af-act-msg');
    if (el) el.className = 'af-act-msg';
  }

  function isValidEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  // =========================================================
  // 5. Acciones
  // =========================================================
  function solicitarCodigo() {
    var email = (document.getElementById('af-act-email').value || '').trim().toLowerCase();
    if (!isValidEmail(email)) {
      showMsg('Ingresá un email válido.', 'err');
      return;
    }
    localStorage.setItem(PENDING_KEY, email);

    var subject = encodeURIComponent('[Analizador] Solicitud de activación');
    var body = encodeURIComponent(
      'Hola,\\n\\n' +
      'Quiero activar la app "Analizador de Funciones".\\n\\n' +
      'Mi email: ' + email + '\\n' +
      'Device: ' + (navigator.userAgent || 'desconocido') + '\\n' +
      'Fecha: ' + new Date().toISOString() + '\\n\\n' +
      'Por favor enviame mi código de activación.\\n\\n' +
      'Gracias.'
    );
    var mailto = 'mailto:' + EMAIL_DISTRIBUIDOR + '?subject=' + subject + '&body=' + body;

    showMsg('Se va a abrir tu app de correo. Si no se abre, copiá el email del distribuidor abajo.', 'ok');

    // Añadir bloque copiable
    var card = document.querySelector('.af-act-card');
    if (card && !card.querySelector('.af-act-copy')) {
      var copy = document.createElement('span');
      copy.className = 'af-act-copy';
      copy.textContent = '📋 ' + EMAIL_DISTRIBUIDOR;
      copy.title = 'Toca para copiar';
      copy.addEventListener('click', function () {
        copyToClipboard(EMAIL_DISTRIBUIDOR);
        copy.textContent = '✅ Copiado!';
        setTimeout(function () { copy.textContent = '📋 ' + EMAIL_DISTRIBUIDOR; }, 1500);
      });
      card.querySelector('[data-step="email"]').appendChild(copy);
    }

    // Abrir el cliente de correo
    try {
      window.location.href = mailto;
    } catch (e) {
      // fallback: solo mostramos el email
    }

    // Después de un momento, mostrar el paso del código
    setTimeout(function () { showStep('code'); }, 800);
  }

  function verificarCodigo() {
    var code = (document.getElementById('af-act-code').value || '').toUpperCase().trim();
    if (!/^[A-F0-9]{4}-[A-F0-9]{4}$/.test(code)) {
      showMsg('Formato inválido. Debe ser XXXX-XXXX.', 'err');
      return;
    }
    var email = localStorage.getItem(PENDING_KEY);
    if (!email) {
      showMsg('Primero pedí tu código con tu email.', 'err');
      showStep('email');
      return;
    }

    showMsg('Verificando…', 'ok');
    generateCode(email).then(function (expected) {
      if (code === expected) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          email: email,
          code: code,
          ts: Date.now()
        }));
        localStorage.removeItem(PENDING_KEY);
        showStep('ok');
        setTimeout(function () {
          var ov = document.getElementById('af-activation-overlay');
          if (ov) ov.remove();
          document.body.style.overflow = '';
        }, 1200);
      } else {
        showMsg('Código incorrecto. Revisá que lo hayas copiado bien.', 'err');
      }
    }).catch(function () {
      showMsg('Error al verificar. Intentá de nuevo.', 'err');
    });
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {});
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  // =========================================================
  // 6. Arranque
  // =========================================================
  function start() {
    if (isActivated()) return;
    injectStyles();
    var overlay = buildModal();
    document.body.style.overflow = 'hidden';

    document.getElementById('af-act-send').addEventListener('click', solicitarCodigo);
    document.getElementById('af-act-have').addEventListener('click', function () {
      var stored = localStorage.getItem(PENDING_KEY);
      if (stored) {
        var inp = document.getElementById('af-act-email');
        if (inp) inp.value = stored;
      }
      clearMsg();
      showStep('code');
    });
    document.getElementById('af-act-verify').addEventListener('click', verificarCodigo);
    document.getElementById('af-act-back').addEventListener('click', function () {
      clearMsg();
      showStep('email');
    });

    // Enter en los inputs
    var emailInput = document.getElementById('af-act-email');
    if (emailInput) emailInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); solicitarCodigo(); }
    });
    var codeInput = document.getElementById('af-act-code');
    if (codeInput) codeInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); verificarCodigo(); }
    });
    // Auto-formato: añadir guion
    if (codeInput) codeInput.addEventListener('input', function () {
      var v = codeInput.value.replace(/[^A-F0-9]/gi, '').toUpperCase();
      if (v.length > 4) v = v.slice(0, 4) + '-' + v.slice(4, 8);
      codeInput.value = v;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  // API pública (para debugging / dev)
  window._afActivation = {
    isActivated: isActivated,
    reset: function () {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PENDING_KEY);
      location.reload();
    },
    generateCode: generateCode
  };
})();
ACT_EOF

node --check js/activation.js && echo "  ✓ js/activation.js OK ($(wc -l < js/activation.js) líneas)"

# ---------- 4. generar-codigo.py ----------
echo ""
echo "═══ 4. generar-codigo.py ═══"

cat > generar-codigo.py <<PY_EOF
#!/usr/bin/env python3
# =========================================================
# generar-codigo.py
#   Uso: python generar-codigo.py usuario@email.com
#   Genera el código de activación para ese email.
#   Mismo algoritmo que js/activation.js
# =========================================================
import sys
import hashlib

# ⚠️ DEBE COINCIDIR CON js/activation.js
SALT = '${SALT}'

def generar(email: str) -> str:
    data = email.lower().strip() + SALT
    h = hashlib.sha256(data.encode('utf-8')).hexdigest().upper()
    return h[:4] + '-' + h[4:8]

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Uso: python generar-codigo.py usuario@email.com')
        sys.exit(1)
    email = sys.argv[1]
    print(generar(email))
PY_EOF

chmod +x generar-codigo.py
python3 generar-codigo.py test@test.com 2>/dev/null && echo "  ✓ generar-codigo.py OK"

# ---------- 5. index.html ----------
echo ""
echo "═══ 5. index.html ═══"
if grep -q 'js/activation.js' index.html; then
    echo "  ⚠ ya tiene activation.js, saltando"
else
    python3 - <<'PYEOF'
import re
p = 'index.html'
s = open(p, encoding='utf-8').read()

# Insertar <script src="js/activation.js"></script> justo antes del <script> inline del SW
anchor = '<script>\n  if (\'serviceWorker\' in navigator)'
if anchor not in s:
    # fallback: antes de </body>
    anchor = '</body>'
    s = s.replace(anchor, '<script src="js/activation.js"></script>\n\n' + anchor, 1)
else:
    s = s.replace(anchor, '<script src="js/activation.js"></script>\n\n' + anchor, 1)

open(p, 'w', encoding='utf-8').write(s)
print('  ✓ activation.js agregado')
PYEOF
fi

# ---------- 6. service-worker.js ----------
echo ""
echo "═══ 6. service-worker.js ═══"
python3 - <<'PYEOF'
import re
p = 'service-worker.js'
s = open(p, encoding='utf-8').read()

# Bump de versión
m = re.search(r"const CACHE = 'af-cache-v(\d+)-(\d+)';", s)
if m:
    old = m.group(0)
    new = f"const CACHE = 'af-cache-v{int(m.group(1))}-{int(m.group(2)) + 1}';"
    if old != new:
        s = s.replace(old, new, 1)
        print(f'  ✓ cache bumped: {old} → {new}')

# Agregar activation.js al PRECACHE
if "'./js/activation.js'" not in s:
    s = s.replace(
        "  './js/ui-v15.js',",
        "  './js/ui-v15.js',\n  './js/activation.js',",
        1
    )
    print('  ✓ js/activation.js agregado al PRECACHE')

open(p, 'w', encoding='utf-8').write(s)
PYEOF

node --check service-worker.js && echo "  ✓ service-worker.js OK"

# ---------- 7. .gitignore para generar-codigo.py ----------
echo ""
echo "═══ 7. Aviso de seguridad ═══"
echo "  ⚠  generar-codigo.py NO se va a subir al repo público."
echo "     Lo dejamos solo local para vos."
if ! grep -q '^generar-codigo.py$' .gitignore 2>/dev/null; then
    echo 'generar-codigo.py' >> .gitignore
    echo '  ✓ .gitignore actualizado'
fi

# ---------- 8. Commit ----------
echo ""
echo "═══ 8. Commit ═══"
git add js/activation.js index.html service-worker.js .gitignore
git status --short

if git diff --cached --quiet; then
    echo "  ⚠  Nada cambió"
else
    git commit -m "Sistema de activación por email (primera apertura)" >/dev/null 2>&1
    echo "  ✓ Commit hecho"
fi

# ---------- Resumen ----------
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ LISTO                                                ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  ▶ Push ahora:"
echo ""
echo "      cd $WORK && git push"
echo ""
echo "  ▶ Cómo generar códigos (solo vos, en Termux):"
echo ""
echo "      cd $WORK"
echo "      python generar-codigo.py usuario@ejemplo.com"
echo ""
echo "  ▶ Flujo del usuario final:"
echo ""
echo "      1. Abre la app → ve modal de activación"
echo "      2. Escribe su email → se abre su app de correo"
echo "      3. Te llega el mail a $EMAIL_DISTRIBUIDOR"
echo "      4. Vos corrés: python generar-codigo.py su@email.com"
echo "      5. Le pasás el código (mail, WhatsApp, etc.)"
echo "      6. Ingresa el código → ¡lista la app!"
echo ""
echo "  ⚠  IMPORTANTE:"
echo "      · Si algún día querés saltar la activación en dev:"
echo "        abrí la consola del navegador y poné:"
echo "          window._afDevMode = true; location.reload()"
echo "      · Para resetear la activación:"
echo "          window._afActivation.reset()"
echo ""
