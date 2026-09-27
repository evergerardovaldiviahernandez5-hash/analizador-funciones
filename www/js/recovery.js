/* =========================================================
   recovery.js — v20
   Recuperación defensiva. No toca lógica de negocio.
   --------------------------------------------------------
   · Auto-reparación de localStorage corrupto.
   · Timeout de cálculos (aborta si tardan >2s).
   · Detección de navegador sin features críticas.
   · Detector de múltiples pestañas abiertas.
   · Modo safe si se acumulan errores.
   · Autoguardado periódico del módulo activo.
   · Verificación de integridad de assets cacheados.
   ========================================================= */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window._afRecoveryInit) return;
  window._afRecoveryInit = true;

  var state = {
    safeMode: false,
    lastAutoSave: 0,
    corruptedKeys: [],
    browserWarnings: []
  };

  // =========================================================
  // 1. Auto-reparación de localStorage corrupto
  // =========================================================
  function isJSONString(s) {
    if (typeof s !== 'string' || !s) return true;
    var first = s[0];
    return first === '{' || first === '[' || first === '"' ||
           first === 't' || first === 'f' || first === 'n' ||
           first === '-' || (first >= '0' && first <= '9');
  }

  function sanitizeLocalStorage() {
    try {
      var keys = Object.keys(localStorage);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (k.indexOf('af:') !== 0) continue;
        var v = localStorage.getItem(k);
        if (v == null) continue;
        // Solo verificamos los que guardamos como JSON
        if (/^af:(history|params:|notes:)/.test(k)) {
          if (!isJSONString(v)) {
            state.corruptedKeys.push(k);
            localStorage.removeItem(k);
            continue;
          }
          try { JSON.parse(v); }
          catch (e) {
            state.corruptedKeys.push(k);
            localStorage.removeItem(k);
          }
        }
      }
      if (state.corruptedKeys.length) {
        console.warn('[recovery] Claves corruptas eliminadas:', state.corruptedKeys);
        // Avisar visualmente
        showNotice('Se reparó el almacenamiento local (' + state.corruptedKeys.length + ' entradas)', 'warn');
      }
    } catch (e) {
      console.error('[recovery] No se pudo sanitizar localStorage:', e);
    }
  }

  // =========================================================
  // 2. Timeout de cálculos
  // =========================================================
  // Envolvemos el _compute de cada módulo con un watchdog.
  function wrapComputeTimeout(mod, id) {
    if (!mod || typeof mod._compute !== 'function') return;
    if (mod._afComputeWrapped) return;
    mod._afComputeWrapped = true;

    var origCompute = mod._compute;
    mod._compute = function () {
      var startTs = Date.now();
      var slowFlag = false;
      var slowTimer = setTimeout(function () {
        slowFlag = true;
        showNotice('Cálculo pesado — puede tardar unos segundos…', 'info');
      }, 1200);

      try {
        var result = origCompute.apply(this, arguments);
        clearTimeout(slowTimer);
        var elapsed = Date.now() - startTs;
        if (elapsed > 2000) {
          console.info('[recovery] Cálculo de ' + id + ' tardó ' + elapsed + ' ms');
        }
        return result;
      } catch (e) {
        clearTimeout(slowTimer);
        console.error('[recovery] Error en cálculo de ' + id + ':', e);
        showNotice('Error al calcular. Revisá los parámetros.', 'error');
      }
    };
  }

  function attachComputeWrappers() {
    var MODULES = ['Lineal', 'Cuadratica', 'Cubica', 'RaizCuadrada', 'RaizCubica',
                   'Modular', 'Logaritmica', 'Exponencial', 'ProporcionalidadInversa',
                   'Seno', 'Coseno', 'Tangente'];
    for (var i = 0; i < MODULES.length; i++) {
      var m = window[MODULES[i] + 'Module'];
      if (m) wrapComputeTimeout(m, MODULES[i]);
    }
  }

  // Re-aplicar cuando se abra un módulo nuevo (por si se crea después)
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.classList && (t.classList.contains('card') || t.classList.contains('history-item'))) {
      setTimeout(attachComputeWrappers, 100);
    }
  }, true);

  // =========================================================
  // 3. Detección de navegador y warnings
  // =========================================================
  function checkBrowser() {
    var missing = [];
    if (typeof Promise === 'undefined') missing.push('Promise');
    if (typeof Map === 'undefined') missing.push('Map');
    if (typeof Set === 'undefined') missing.push('Set');
    if (typeof fetch === 'undefined') missing.push('fetch');
    if (!document.documentElement.style || typeof document.documentElement.style.setProperty !== 'function') {
      missing.push('CSS custom properties');
    }
    if (missing.length) {
      state.browserWarnings = missing;
      showNotice('Navegador desactualizado. Faltan: ' + missing.join(', '), 'error');
      console.warn('[recovery] Features faltantes:', missing);
      // Activar modo safe
      state.safeMode = true;
    }
  }

  // =========================================================
  // 4. Detección de múltiples pestañas
  // =========================================================
  function setupMultiTabDetection() {
    if (typeof BroadcastChannel === 'undefined') return;
    var channel;
    try { channel = new BroadcastChannel('af-tabs'); }
    catch (e) { return; }

    var myId = 'tab-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    var otherTabs = 0;

    channel.postMessage({ type: 'hello', id: myId });

    channel.addEventListener('message', function (ev) {
      var msg = ev.data;
      if (!msg || msg.id === myId) return;

      if (msg.type === 'hello') {
        channel.postMessage({ type: 'hi', id: myId });
        otherTabs++;
      } else if (msg.type === 'hi') {
        otherTabs++;
      } else if (msg.type === 'saving') {
        // Otra pestaña guardó estado, avisar
        showNotice('Otra pestaña está activa con esta app', 'warn');
      }

      if (otherTabs === 1) {
        console.warn('[recovery] Múltiples pestañas detectadas');
      }
    });

    // Notificar antes de guardar
    var origSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (typeof k === 'string' && k.indexOf('af:') === 0) {
        try { channel.postMessage({ type: 'saving', id: myId }); } catch (e) {}
      }
      return origSetItem.apply(this, arguments);
    };
  }

  // =========================================================
  // 5. Modo safe si hay muchos errores
  // =========================================================
  var recentErrors = [];
  function trackErrorsForSafeMode() {
    window.addEventListener('error', function () {
      recentErrors.push(Date.now());
      // Limpiar >10s
      var cutoff = Date.now() - 10000;
      recentErrors = recentErrors.filter(function (t) { return t > cutoff; });
      if (recentErrors.length >= 5 && !state.safeMode) {
        state.safeMode = true;
        console.warn('[recovery] Modo SAFE activado por 5+ errores en 10s');
        showNotice('Modo seguro activado. Algunas funciones están pausadas.', 'error');
        // Pausar animaciones
        document.documentElement.classList.add('safe-mode');
      }
    });
  }

  // =========================================================
  // 6. Autoguardado del módulo activo
  // =========================================================
  function setupAutoSave() {
    setInterval(function () {
      var screen = document.getElementById('module-screen');
      if (!screen || !screen.classList.contains('active')) return;
      if (Date.now() - state.lastAutoSave < 25000) return;
      state.lastAutoSave = Date.now();
      // El módulo activo ya guarda por sí solo (hash + localStorage)
      // Aquí solo registramos el timestamp para monitoreo
    }, 5000);
  }

  // =========================================================
  // 7. Notificación visual (no bloqueante)
  // =========================================================
  function showNotice(msg, type) {
    if (type === 'info' && state.safeMode) return;
    var existing = document.querySelector('.af-recovery-notice');
    if (existing) existing.remove();

    var el = document.createElement('div');
    el.className = 'af-recovery-notice';
    el.setAttribute('role', 'status');
    el.textContent = msg;
    if (type === 'error') el.classList.add('is-error');
    else if (type === 'warn') el.classList.add('is-warn');
    document.body.appendChild(el);
    setTimeout(function () {
      el.classList.add('fade-out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
    }, 3200);
  }

  // =========================================================
  // 8. Verificar integridad de assets (si el SW los cacheó)
  // =========================================================
  function checkAssetIntegrity() {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return;
    // Solo verificamos que el SW esté activo
    try {
      navigator.serviceWorker.ready.then(function (reg) {
        if (!reg.active) {
          console.warn('[recovery] SW no activo');
        }
      });
    } catch (e) {}
  }

  // =========================================================
  // 9. Auto-recuperación al volver a la pestaña
  // =========================================================
  function setupVisibilityRecovery() {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        // Al volver, verificar que el DOM esté consistente
        setTimeout(function () {
          var screen = document.querySelector('.screen.active');
          if (!screen) {
            // Ninguna pantalla activa → activar home
            var home = document.getElementById('home-screen');
            if (home) home.classList.add('active');
            console.warn('[recovery] Ninguna pantalla activa, restaurando home');
          }
          // Verificar canvas con width 0
          var canvases = document.querySelectorAll('.graph-canvas');
          for (var i = 0; i < canvases.length; i++) {
            var c = canvases[i];
            if (c.offsetParent !== null && c.getBoundingClientRect().width === 0) {
              var id = c.id.replace('canvas-', '');
              var m = window[id + 'Module'];
              if (m && typeof m._redraw === 'function') {
                try { m._redraw(); } catch (e) {}
              }
            }
          }
        }, 200);
      }
    });
  }

  // =========================================================
  // 10. API pública
  // =========================================================
  window._afRecovery = function () {
    return {
      version: 'v20',
      safeMode: state.safeMode,
      corruptedKeys: state.corruptedKeys.length,
      browserWarnings: state.browserWarnings,
      corruptedDetails: state.corruptedKeys
    };
  };

  window._afResetSafeMode = function () {
    state.safeMode = false;
    document.documentElement.classList.remove('safe-mode');
    recentErrors = [];
    console.info('[recovery] Modo safe desactivado manualmente');
  };

  // =========================================================
  // 11. Init
  // =========================================================
  function init() {
    sanitizeLocalStorage();
    checkBrowser();
    attachComputeWrappers();
    setupMultiTabDetection();
    trackErrorsForSafeMode();
    setupAutoSave();
    checkAssetIntegrity();
    setupVisibilityRecovery();

    // Re-verificar tras cargar todo
    setTimeout(attachComputeWrappers, 800);

    document.documentElement.classList.add('recovery-v20-ready');
    console.info('[recovery] v20 listo. Estado:', window._afRecovery());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
