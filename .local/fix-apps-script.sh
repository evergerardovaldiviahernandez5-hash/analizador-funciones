#!/data/data/com.termux/files/usr/bin/bash
# =========================================================
# fix-apps-script.sh — Regenera Codigo.gs sin caracteres Unicode
# =========================================================
set -u
cd "$HOME/analizadordefunciones" || { echo "❌ No existe el repo"; exit 1; }

# Configuración (debe coincidir con lo que ya pusiste)
EMAIL_DISTRIBUIDOR='evergerardovaldiviahernandez5@gmail.com'
WHATSAPP_NUMERO='5358101676'
SALT='af-ever-2026-9k2x7b'

mkdir -p apps-script
cp apps-script/Codigo.gs "apps-script/Codigo.gs.bak-$(date +%H%M%S)" 2>/dev/null || true

cat > apps-script/Codigo.gs <<GSEOF
/* =========================================================
   Auto-responder de activaciones - Analizador de Funciones
   ---------------------------------------------------------
   Corre en los servidores de Google cada 1 minuto.
   No requiere Termux ni ninguna maquina encendida.
   ========================================================= */

// CONFIGURACION
var CONFIG = {
  EMAIL_DISTRIBUIDOR: '${EMAIL_DISTRIBUIDOR}',
  SALT:               '${SALT}',
  WHATSAPP:           '${WHATSAPP_NUMERO}',
  ASUNTO:             '[Analizador] Solicitud de activacion',
  LABEL_RESPONDIDOS:  'Activaciones-Respondidas'
};

// =========================================================
// Punto de entrada - corre cada 1 minuto
// =========================================================
function procesarPedidos() {
  var label = obtenerLabel(CONFIG.LABEL_RESPONDIDOS);
  // Solo mails no leidos con el asunto exacto
  var threads = GmailApp.search('is:unread subject:"' + CONFIG.ASUNTO + '"', 0, 20);

  if (threads.length === 0) return;

  console.log(threads.length + ' pedido(s) nuevo(s)');

  threads.forEach(function(thread) {
    var msgs = thread.getMessages();
    msgs.forEach(function(msg) {
      try {
        var body = msg.getPlainBody();
        var emailUsuario = extraerEmail(body);
        if (!emailUsuario) {
          console.warn('No se pudo extraer email del pedido');
          return;
        }

        var codigo = generarCodigo(emailUsuario);
        enviarRespuesta(msg, emailUsuario, codigo);
        console.log('Respondido a ' + emailUsuario + ' -> ' + codigo);
      } catch (e) {
        console.error('Error procesando pedido: ' + e);
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
  var m = body.match(/Mi email:\s*([^\s]+@[^\s]+)/i);
  if (m) return m[1].toLowerCase().trim();

  // Fallback: cualquier email que no sea el distribuidor
  var re = /([\w.+-]+@[\w.-]+\.[a-z]{2,})/gi;
  var match;
  while ((match = re.exec(body)) !== null) {
    var candidate = match[1].toLowerCase();
    if (candidate !== CONFIG.EMAIL_DISTRIBUIDOR.toLowerCase()) {
      return candidate;
    }
  }
  return null;
}

// =========================================================
// Genera el codigo deterministico (mismo algoritmo que la app)
// =========================================================
function generarCodigo(email) {
  var data = email.toLowerCase().trim() + CONFIG.SALT;
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    data,
    Utilities.Charset.UTF_8
  );
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i];
    if (b < 0) b += 256;
    hex += ('0' + b.toString(16)).slice(-2);
  }
  hex = hex.toUpperCase();
  return hex.slice(0, 4) + '-' + hex.slice(4, 8);
}

// =========================================================
// Envia la respuesta al usuario
// =========================================================
function enviarRespuesta(msg, emailUsuario, codigo) {
  var cuerpo = 'Hola!\n\n' +
    'Recibimos tu solicitud. Tu codigo de activacion para ' +
    'Analizador de Funciones es:\n\n' +
    '    ' + codigo + '\n\n' +
    'COMO ACTIVAR:\n' +
    '  1. Abri la app Analizador de Funciones\n' +
    '  2. En el modal, en el campo "Codigo de activacion"\n' +
    '  3. Pega: ' + codigo + '\n' +
    '  4. Toca "Activar app"\n\n' +
    'Listo! Ya podes usar la app sin limites.\n\n' +
    'Si tenes cualquier problema, responde este mail o escribime por ' +
    'WhatsApp al +' + CONFIG.WHATSAPP + '.\n\n' +
    'Gracias por tu compra!\n' +
    '- Ever\n\n' +
    '---\n' +
    'Analizador de Funciones - por Ever\n';

  GmailApp.sendEmail(emailUsuario, 'Tu codigo de activacion - Analizador de Funciones', cuerpo, {
    replyTo: CONFIG.EMAIL_DISTRIBUIDOR,
    name: 'Analizador de Funciones'
  });
}

// =========================================================
// Helper para obtener o crear la etiqueta
// =========================================================
function obtenerLabel(nombre) {
  var label = GmailApp.getUserLabelByName(nombre);
  if (!label) label = GmailApp.createLabel(nombre);
  return label;
}

// =========================================================
// INSTALADOR - Correr UNA sola vez
// =========================================================
function setup() {
  // Borra triggers previos para no duplicar
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) { ScriptApp.deleteTrigger(t); });
  console.log('Triggers previos borrados: ' + triggers.length);

  // Crea trigger cada 1 minuto
  ScriptApp.newTrigger('procesarPedidos')
    .timeBased()
    .everyMinutes(1)
    .create();

  console.log('Trigger creado. Corre cada 1 minuto.');
  console.log('Podes cerrar esta pestana.');
}

// =========================================================
// TEST - Opcional, para verificar que todo funciona
// =========================================================
function test() {
  var testEmail = 'test@example.com';
  var code = generarCodigo(testEmail);
  console.log('Test con ' + testEmail + ' -> ' + code);
  console.log('Si ves un codigo tipo XXXX-XXXX, todo funciona.');
}

// =========================================================
// DIAGNOSTICO - Muestra el estado actual
// =========================================================
function estado() {
  var triggers = ScriptApp.getProjectTriggers();
  console.log('Triggers activos: ' + triggers.length);
  triggers.forEach(function(t) {
    console.log('  - ' + t.getHandlerFunction() + ' (' + t.getEventType() + ')');
  });
  var label = GmailApp.getUserLabelByName(CONFIG.LABEL_RESPONDIDOS);
  if (label) {
    console.log('Mails respondidos: ' + label.getThreads().length);
  } else {
    console.log('Sin mails respondidos todavia');
  }
}
GSEOF

# Verificar que no quedan caracteres non-ASCII
NON_ASCII=$(grep -c -P '[^\x00-\x7F]' apps-script/Codigo.gs 2>/dev/null || echo 0)
echo "  Caracteres no-ASCII: $NON_ASCII"
if [ "$NON_ASCII" != "0" ]; then
    echo "  ⚠ Todavía quedan caracteres raros. Revisar."
    grep -n -P '[^\x00-\x7F]' apps-script/Codigo.gs | head -5
else
    echo "  ✓ Código 100% ASCII puro"
fi

echo "  ✓ apps-script/Codigo.gs regenerado ($(wc -l < apps-script/Codigo.gs) líneas)"
echo ""
echo "  ▶ Ahora copialo al portapapeles:"
echo ""
echo "      cat ~/analizadordefunciones/apps-script/Codigo.gs | termux-clipboard-set"
echo ""
echo "  ▶ Y pegarlo en Google Apps Script reemplazando todo"
echo ""
