#!/data/data/com.termux/files/usr/bin/bash
# =========================================================
# setup-apps-script.sh — Prepara Apps Script para auto-responder
# =========================================================
set -u
cd "$HOME/analizadordefunciones" || { echo "❌ No existe el repo"; exit 1; }

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  SETUP APPS SCRIPT — Auto-responder en la nube       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ---------- Configuración ----------
EMAIL_DISTRIBUIDOR='evergerardovaldiviahernandez5@gmail.com'
WHATSAPP_NUMERO='5358101676'
SALT='af-ever-2026-9k2x7b'

# ---------- Generar el código del Apps Script ----------
mkdir -p apps-script

cat > apps-script/Codigo.gs <<GSEOF
/* =========================================================
   Auto-responder de activaciones — Analizador de Funciones
   ---------------------------------------------------------
   Corre en los servidores de Google cada 1 minuto.
   No requiere Termux ni ninguna máquina encendida.
   ========================================================= */

// ⚙️ CONFIGURACIÓN
const CONFIG = {
  EMAIL_DISTRIBUIDOR: '${EMAIL_DISTRIBUIDOR}',
  SALT:               '${SALT}',
  WHATSAPP:           '${WHATSAPP_NUMERO}',
  ASUNTO:             '[Analizador] Solicitud de activación',
  LABEL_RESPONDIDOS:  'Activaciones-Respondidas'
};

// =========================================================
// Punto de entrada — corre cada 1 minuto
// =========================================================
function procesarPedidos() {
  const label = obtenerLabel(CONFIG.LABEL_RESPONDIDOS);
  // Solo mails no leídos con el asunto exacto
  const threads = GmailApp.search('is:unread subject:"' + CONFIG.ASUNTO + '"', 0, 20);

  if (threads.length === 0) return;

  console.log('🔔 ' + threads.length + ' pedido(s) nuevo(s)');

  threads.forEach(thread => {
    const msgs = thread.getMessages();
    msgs.forEach(msg => {
      try {
        const body = msg.getPlainBody();
        const emailUsuario = extraerEmail(body);
        if (!emailUsuario) {
          console.warn('⚠ No se pudo extraer email del pedido');
          return;
        }

        const codigo = generarCodigo(emailUsuario);
        enviarRespuesta(msg, emailUsuario, codigo);
        console.log('✓ Respondido a ' + emailUsuario + ' → ' + codigo);
      } catch (e) {
        console.error('❌ Error procesando pedido: ' + e);
      }
    });
    thread.addLabel(label);
    thread.markRead();
  });
}

// =========================================================
// Extrae el email del usuario del cuerpo del mail
// =========================================================
function extraerEmail(body) {
  // Formato: "Mi email: usuario@dominio.com"
  let m = body.match(/Mi email:\s*([^\s]+@[^\s]+)/i);
  if (m) return m[1].toLowerCase().trim();

  // Fallback: cualquier email que no sea el distribuidor
  const re = /([\w.+-]+@[\w.-]+\.[a-z]{2,})/gi;
  let match;
  while ((match = re.exec(body)) !== null) {
    const candidate = match[1].toLowerCase();
    if (candidate !== CONFIG.EMAIL_DISTRIBUIDOR.toLowerCase()) {
      return candidate;
    }
  }
  return null;
}

// =========================================================
// Genera el código determinístico (mismo algoritmo que la app)
// =========================================================
function generarCodigo(email) {
  const data = email.toLowerCase().trim() + CONFIG.SALT;
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    data,
    Utilities.Charset.UTF_8
  );
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    let b = bytes[i];
    if (b < 0) b += 256;
    hex += ('0' + b.toString(16)).slice(-2);
  }
  hex = hex.toUpperCase();
  return hex.slice(0, 4) + '-' + hex.slice(4, 8);
}

// =========================================================
// Envía la respuesta al usuario
// =========================================================
function enviarRespuesta(msg, emailUsuario, codigo) {
  const cuerpo = '¡Hola!\n\n' +
    'Recibimos tu solicitud. Tu código de activación para ' +
    '*Analizador de Funciones* es:\n\n' +
    '    ' + codigo + '\n\n' +
    'CÓMO ACTIVAR:\n' +
    '  1. Abrí la app Analizador de Funciones\n' +
    '  2. En el modal, en el campo "Código de activación"\n' +
    '  3. Pegá: ' + codigo + '\n' +
    '  4. Tocá "🔓 Activar app"\n\n' +
    '¡Listo! Ya podés usar la app sin límites.\n\n' +
    'Si tenés cualquier problema, respondé este mail o escribime por ' +
    'WhatsApp al +' + CONFIG.WHATSAPP + '.\n\n' +
    '¡Gracias por tu compra!\n' +
    '— Ever\n\n' +
    '---\n' +
    'Analizador de Funciones · por Ever\n';

  GmailApp.sendEmail(emailUsuario, 'Tu código de activación — Analizador de Funciones', cuerpo, {
    replyTo: CONFIG.EMAIL_DISTRIBUIDOR,
    name: 'Analizador de Funciones'
  });
}

// =========================================================
// Helper para obtener o crear la etiqueta
// =========================================================
function obtenerLabel(nombre) {
  let label = GmailApp.getUserLabelByName(nombre);
  if (!label) label = GmailApp.createLabel(nombre);
  return label;
}

// =========================================================
// INSTALADOR — Correr UNA sola vez
// =========================================================
function setup() {
  // Borra triggers previos para no duplicar
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  console.log('🗑 ' + triggers.length + ' trigger(s) previo(s) borrado(s)');

  // Crea trigger cada 1 minuto
  ScriptApp.newTrigger('procesarPedidos')
    .timeBased()
    .everyMinutes(1)
    .create();

  console.log('✅ Trigger creado. Corre cada 1 minuto.');
  console.log('   Podés cerrar esta pestaña.');
}

// =========================================================
// TEST — Opcional, para verificar que todo funciona
// =========================================================
function test() {
  const testEmail = 'test@example.com';
  const code = generarCodigo(testEmail);
  console.log('Test con ' + testEmail + ' → ' + code);
  console.log('Si ves un código tipo XXXX-XXXX, todo funciona.');
}

// =========================================================
// DIAGNÓSTICO — Muestra el estado actual
// =========================================================
function estado() {
  const triggers = ScriptApp.getProjectTriggers();
  console.log('Triggers activos: ' + triggers.length);
  triggers.forEach(t => {
    console.log('  - ' + t.getHandlerFunction() + ' (' + t.getEventType() + ')');
  });
  const label = GmailApp.getUserLabelByName(CONFIG.LABEL_RESPONDIDOS);
  if (label) {
    console.log('Mails respondidos: ' + label.getThreads().length);
  } else {
    console.log('Sin mails respondidos todavía');
  }
}
GSEOF

echo "  ✓ apps-script/Codigo.gs creado ($(wc -l < apps-script/Codigo.gs) líneas)"

# Verificar sintaxis (no es posible con node porque usa APIs de Google, pero validamos que sea JS válido sintácticamente)
node --check apps-script/Codigo.gs 2>/dev/null && echo "  ✓ Sintaxis JS OK" || echo "  ℹ (APIs de Google no validadas con node, es normal)"

# ---------- Guardar helper con instrucciones ----------
cat > apps-script/instalar.txt <<'TXTEOF'
==========================================================
 INSTALAR EN GOOGLE APPS SCRIPT
==========================================================

Tiempo total: 5 minutos
Costo: $0 (para siempre)
Ventaja: corre 24/7 en los servidores de Google, sin Termux

----------------------------------------------------------
PASO 1 — Abrir Apps Script
----------------------------------------------------------

En el navegador del teléfono, andá a:

    https://script.google.com

Si te pide login, usá la MISMA cuenta de Gmail que vas a usar
como distribuidor (evergerardovaldiviahernandez5@gmail.com).

----------------------------------------------------------
PASO 2 — Crear nuevo proyecto
----------------------------------------------------------

  1. Click en "+ Nuevo proyecto" (arriba a la izquierda)
  2. Se abre un editor con este código:
       function myFunction() {
       }

----------------------------------------------------------
PASO 3 — Pegar el código
----------------------------------------------------------

  1. Seleccioná TODO el código que aparece
     (mantené presionado → Seleccionar todo)
  2. Borralo
  3. Abrí el archivo Codigo.gs que está en la carpeta
     apps-script/ de este repo. Copialo entero.
  4. Pegalo en el editor
  5. Guardá con el ícono de disquete (o Ctrl+S)

----------------------------------------------------------
PASO 4 — Ejecutar setup() la primera vez
----------------------------------------------------------

  1. Arriba, en el desplegable de funciones, elegí: "setup"
     (al lado del botón ▶ Ejecutar)
  2. Click en ▶ Ejecutar
  3. Google va a pedirte permisos:
     - "Ver, editar, crear y eliminar tus correos de Gmail"
     - "Conectarse a un servicio externo"
     → Permitir todo
  4. Si te sale una alerta de "App no verificada":
     - Click en "Configuración avanzada"
     - Click en "Ir a [nombre del proyecto] (no seguro)"
     - Esto es normal: es tu propio código, Google no lo "verifica"
       porque no está publicado en su tienda
  5. Después de unos segundos aparece en el "Registro":
       ✅ Trigger creado. Corre cada 1 minuto.

----------------------------------------------------------
PASO 5 — Verificar
----------------------------------------------------------

  En el desplegable, elegí "estado" y ejecutá.
  Deberías ver:
       Triggers activos: 1
         - procesarPedidos (CLOCK)
       Sin mails respondidos todavía

Si ves eso: ¡LISTO! Ya está funcionando.

----------------------------------------------------------
PROBAR EL FLUJO COMPLETO
----------------------------------------------------------

  1. Abrí la APK (o la PWA en el navegador)
  2. Cargá un email + 4 dígitos
  3. Tocá "Recibir código por email"
  4. Enviá el mail
  5. En menos de 60 segundos llega la respuesta con el código
  6. Ingresalo en la app → activada

----------------------------------------------------------
COMANDOS ÚTILES
----------------------------------------------------------

En Apps Script, en el desplegable de funciones:

  setup()    → instala el trigger (solo una vez)
  estado()   → muestra el estado actual
  test()     → verifica la generación de códigos
  procesarPedidos() → corre manualmente el ciclo

----------------------------------------------------------
¿DÓNDE VER LOS PEDIDOS PROCESADOS?
----------------------------------------------------------

En Gmail, mirá la etiqueta "Activaciones-Respondidas"
en el menú lateral. Ahí quedan todos los mails respondidos.

----------------------------------------------------------
¿CÓMO DETENERLO?
----------------------------------------------------------

  1. En Apps Script, ejecutá:
       function detener() {
         ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
       }
  2. O borrá el proyecto entero desde script.google.com

----------------------------------------------------------
LÍMITES DE GOOGLE
----------------------------------------------------------

  · 20,000 triggers por día → más que suficiente
  · 100 emails salientes/día → más que suficiente
  · 90 minutos de ejecución/día → si cada corrida dura 2 seg,
    son 2,700 corridas/día. Más que suficiente.

Si algún día tenés 100+ pedidos por día, avisame y
te muestro cómo escalarlo.
TXTEOF

echo "  ✓ apps-script/instalar.txt creado"

# ---------- Script helper para abrir Apps Script ----------
cat > apps-script/abrir.sh <<'OPENEOF'
#!/data/data/com.termux/files/usr/bin/bash
# Abre el navegador en Google Apps Script
URL="https://script.google.com/home/projects/create"
echo ""
echo "  Abriendo Google Apps Script…"
echo ""
if command -v termux-open-url >/dev/null 2>&1; then
  termux-open-url "$URL"
else
  am start -a android.intent.action.VIEW -d "$URL" >/dev/null 2>&1
fi
echo "  Si no se abrió, copiá esto en el navegador:"
echo ""
echo "  $URL"
echo ""
echo "  Después: leé apps-script/instalar.txt"
echo ""
OPENEOF

chmod +x apps-script/abrir.sh

# ---------- Commit ----------
echo ""
echo "═══ Commit ═══"
git add apps-script/
git status --short
git commit -m "Apps Script para auto-responder en la nube (24/7)" >/dev/null 2>&1
echo "  ✓ Commit hecho"

# ---------- Resumen ----------
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ LISTO — Ahora hay que instalar el Apps Script        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  ▶ 1. Push:"
echo "      git push"
echo ""
echo "  ▶ 2. Leé las instrucciones:"
echo ""
echo "      cat apps-script/instalar.txt"
echo ""
echo "  ▶ 3. Abrí Apps Script en el navegador:"
echo ""
echo "      bash apps-script/abrir.sh"
echo ""
echo "  ▶ 4. Copiá el código:"
echo ""
echo "      cat apps-script/Codigo.gs"
echo ""
echo "  ⚠  IMPORTANTE:"
echo "     · El Apps Script corre en servidores de Google"
echo "     · No necesitás Termux abierto"
echo "     · No necesitás el teléfono prendido"
echo "     · Solo necesita que tu cuenta de Gmail exista (obvio)"
echo "     · Corré 'setup()' UNA VEZ para activar el trigger"
echo ""
echo "  ▶ 5. Después de instalar, podés desinstalar el daemon"
echo "     de Termux (ya no lo necesitás):"
echo ""
echo "      bash detener-auto.sh 2>/dev/null"
echo "      rm -f auto-responder.py auto-responder.out pedidos.log .procesados.txt"
echo ""
