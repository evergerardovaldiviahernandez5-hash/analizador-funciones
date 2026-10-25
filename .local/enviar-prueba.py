#!/usr/bin/env python3
# =========================================================
# enviar-prueba.py — Envía un mail de prueba y lo deja
# como NO LEÍDO para que el Apps Script lo detecte.
# =========================================================
import smtplib, imaplib, time, sys
from email.mime.text import MIMEText

EMAIL = 'evergerardovaldiviahernandez5@gmail.com'
APP_PASS = input('App Password (16 chars, sin espacios): ').replace(' ', '')

if len(APP_PASS) != 16:
    print(f'⚠ Longitud inesperada: {len(APP_PASS)} chars')
    if input('Continuar? [s/N] ').lower() != 's':
        sys.exit(1)

ASUNTO = '[Analizador] Solicitud de activación'
CUERPO = """Hola,

Quiero activar la app.

Mi email: evergerardovaldiviahernandez5@gmail.com
Últimos 4 dígitos: 1234

Gracias.
"""

print('\n📧 Enviando mail de prueba…')
msg = MIMEText(CUERPO, 'plain', 'utf-8')
msg['Subject'] = ASUNTO
msg['From'] = EMAIL
msg['To'] = EMAIL

with smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=30) as s:
    s.login(EMAIL, APP_PASS)
    s.send_message(msg)
print('  ✓ Mail enviado')

# Esperar un momento
time.sleep(3)

# Marcar como no leído con IMAP
print('\n🔓 Marcando como NO LEÍDO…')
with imaplib.IMAP4_SSL('imap.gmail.com', 993) as M:
    M.login(EMAIL, APP_PASS)
    M.select('INBOX')
    # Buscar por asunto
    _, data = M.search(None, f'(SUBJECT "{ASUNTO}")')
    ids = data[0].split()
    if not ids:
        print('  ⚠ No se encontró el mail recién enviado (Gmail tarda en indexar)')
        print('    Probá ejecutar de nuevo, o buscalo y marcalo como no leído a mano')
    else:
        # El más reciente
        latest = ids[-1]
        M.store(latest, '-FLAGS', '\\Seen')
        print(f'  ✓ Mail {latest.decode()} marcado como no leído')
        M.logout()

print('\n✅ Listo. Ahora ejecutá "procesarPedidos" en Apps Script.')
