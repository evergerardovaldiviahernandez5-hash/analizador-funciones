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
SALT = 'af-ever-2026-9k2x7b'

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
