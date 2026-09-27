#!/data/data/com.termux/files/usr/bin/bash
# =========================================================
# prep-apk.sh — Prepara el proyecto para generar APK
#               vía Capacitor + GitHub Actions
# =========================================================
set -u
cd "$(dirname "$0")" || exit 1

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   PREP APK — Capacitor + GitHub Actions                  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ---------- 0. Verificaciones ----------
[ -f index.html ] || { echo "❌ No estás en la raíz."; exit 1; }
[ -d .git ] || { echo "❌ No hay repo git. Corré primero: git init"; exit 1; }

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Falta Node.js"
  echo "   Instalalo con:  pkg install nodejs-lts"
  exit 1
fi

NODE_VER=$(node --version)
echo "  ✓ Node $NODE_VER"

if ! command -v npm >/dev/null 2>&1; then
  echo "❌ Falta npm (viene con nodejs-lts)"
  exit 1
fi

# ---------- 1. .gitignore ----------
echo ""
echo "═══ 1. .gitignore ═══"
cat > .gitignore <<'EOF'
# Node
node_modules/
npm-debug.log*
package-lock.json.bak

# Capacitor / Android build artifacts
android/.gradle/
android/app/build/
android/build/
android/capacitor-cordova-android-plugins/
android/local.properties
android/app/src/main/assets/public/
android/app/src/main/res/xml/config.xml

# Gradle
.gradle/
*.iml
.idea/

# Backups
.backup-*/
*.bak-*

# Sistema
.DS_Store
Thumbs.db
EOF
echo "  ✓ .gitignore creado"

# ---------- 2. package.json ----------
echo ""
echo "═══ 2. package.json ═══"
if [ -f package.json ]; then
  echo "  ⚠ package.json ya existe, lo respaldo"
  cp package.json "package.json.bak-$(date +%H%M%S)"
fi

cat > package.json <<'EOF'
{
  "name": "analizador-funciones",
  "version": "1.0.0",
  "description": "Explora, grafica y analiza funciones matemáticas offline",
  "author": "Ever",
  "license": "MIT",
  "private": true,
  "scripts": {
    "cap:sync": "cap sync android",
    "cap:open": "cap open android"
  },
  "dependencies": {
    "@capacitor/android": "^6.1.2",
    "@capacitor/core": "^6.1.2"
  },
  "devDependencies": {
    "@capacitor/cli": "^6.1.2"
  }
}
EOF
echo "  ✓ package.json creado"

# ---------- 3. capacitor.config.json ----------
echo ""
echo "═══ 3. capacitor.config.json ═══"
cat > capacitor.config.json <<'EOF'
{
  "appId": "com.ever.analizador",
  "appName": "Analizador",
  "webDir": "www",
  "bundledWebRuntime": false,
  "android": {
    "allowMixedContent": false,
    "captureInput": true,
    "webContentsDebuggingEnabled": false,
    "backgroundColor": "#0a0a1a"
  },
  "server": {
    "androidScheme": "https"
  }
}
EOF
echo "  ✓ capacitor.config.json creado"

# ---------- 4. Copiar web a www/ ----------
echo ""
echo "═══ 4. Copiando app a www/ ═══"
rm -rf www
mkdir -p www

# Copiar todo excepto archivos que no van al APK
for item in index.html manifest.json service-worker.js css js icons; do
  if [ -e "$item" ]; then
    cp -r "$item" www/
    echo "  ✓ $item"
  fi
done

# Copiar archivos sueltos opcionales
for f in LICENSE README.md; do
  [ -f "$f" ] && cp "$f" www/
done

# test*.html no van en el APK
rm -f www/test*.html www/test*.js 2>/dev/null
echo "  ✓ tests excluidos del APK"

# ---------- 5. Instalar deps ----------
echo ""
echo "═══ 5. Instalando Capacitor (puede tardar 2-3 min) ═══"
npm install --no-audit --no-fund 2>&1 | tail -3

if [ ! -d node_modules/@capacitor/cli ]; then
  echo "  ❌ Falló la instalación de Capacitor"
  echo "     Probá:  npm install --no-audit --no-fund"
  exit 1
fi
echo "  ✓ Capacitor instalado"

# ---------- 6. Add Android platform ----------
echo ""
echo "═══ 6. Agregando plataforma Android ═══"
if [ -d android ]; then
  echo "  ⚠ android/ ya existe, saltando"
else
  npx cap add android 2>&1 | tail -5
  if [ ! -d android ]; then
    echo "  ❌ No se pudo crear android/"
    exit 1
  fi
  echo "  ✓ Proyecto Android creado"
fi

# Sincronizar
echo ""
echo "═══ 7. Sincronizando web → android ═══"
npx cap sync android 2>&1 | tail -3
echo "  ✓ Sync completo"

# ---------- 8. Workflow de GitHub Actions ----------
echo ""
echo "═══ 8. Workflow de GitHub Actions ═══"
mkdir -p .github/workflows

cat > .github/workflows/build-apk.yml <<'EOF'
name: Build APK

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Install dependencies
        run: npm install --no-audit --no-fund

      - name: Sync Capacitor
        run: npx cap sync android

      - name: Grant execute permission for gradlew
        run: chmod +x android/gradlew

      - name: Build Debug APK
        working-directory: android
        run: ./gradlew assembleDebug --no-daemon

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: analizador-debug-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
          retention-days: 30

      - name: Show APK size
        run: |
          ls -lh android/app/build/outputs/apk/debug/app-debug.apk
EOF

echo "  ✓ .github/workflows/build-apk.yml creado"

# ---------- 9. Commit ----------
echo ""
echo "═══ 9. Commit ═══"
git add .
git status --short | head -20
echo ""
git commit -m "Add Capacitor + GitHub Actions para APK" 2>&1 | tail -3

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ LISTO PARA PUSH"
echo ""
echo "  ▶ Siguiente paso (copiá y pegá):"
echo ""
echo "    git push"
echo ""
echo "  ▶ Después:"
echo ""
echo "    1. Esperá ~3 min"
echo "    2. Andá a:  https://github.com/evergerardovaldiviahernandez5-hash/analizador-funciones/actions"
echo "    3. Click en el workflow 'Build APK' más reciente"
echo "    4. Cuando termine (✅ verde), bajá el 'analizador-debug-apk'"
echo ""
echo "  ▶ O bajalo directo desde Termux (más fácil):"
echo ""
echo "    bash descargar-apk.sh"
echo ""
echo "  (creá ese script en el próximo paso, cuando el build termine)"
echo "═══════════════════════════════════════════════════════════"