#!/data/data/com.termux/files/usr/bin/bash
set -u
cd "$(dirname "$0")" || exit 1

while true; do
  clear
  echo ""
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║   PANEL — Analizador de Funciones                    ║"
  echo "╚══════════════════════════════════════════════════════╝"
  echo ""
  echo "  1) 📱 Generar código y responder por WhatsApp"
  echo "  2) 🔍 Solo ver el código (sin enviar)"
  echo "  3) ❌ Salir"
  echo ""
  read -p "  Opción: " OPT

  case "$OPT" in
    1)
      echo ""
      read -p "  Email del cliente: " EMAIL
      if [ -n "$EMAIL" ]; then bash responder.sh "$EMAIL"; echo ""; read -p "  Enter para continuar..." _; fi
      ;;
    2)
      echo ""
      read -p "  Email: " EMAIL
      if [ -n "$EMAIL" ]; then
        echo ""
        echo "  🔑 Código: $(python3 generar-codigo.py "$EMAIL" 2>/dev/null)"
        echo ""
        read -p "  Enter para continuar..." _
      fi
      ;;
    3) echo ""; exit 0 ;;
    *) sleep 1 ;;
  esac
done
