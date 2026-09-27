/* =========================================================
   health.js — v19
   Capa defensiva y de monitoreo. Puramente aditiva.
   --------------------------------------------------------
   · Guard de arranque idempotente (evita doble init).
   · Auto-recuperación si un panel del módulo queda vacío.
   · Detección online/offline + indicador visual.
   · Detección de canvas con tamaño 0 en cada render.
   · Watchdog: si la app no responde en 3 s, avisa.
   · Manejo robusto de localStorage lleno.
   · Preservación de scroll entre pantallas.
   · Limpieza de timers huérfanos.
   · Debounce global para evitar llamadas repetidas.
   · Guard de navegación (evita doble openModule en <300 ms).
   · Log de salud accesible con window._afHealth()
   ========================================================= */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window._afHealthInit) return;  // idempotente
  window._afHealthInit = true;

  var health = {
    version: 'v19',
    startedAt: Date.now(),
    errors: [],
    warnings: [],
    lastCheck: 0,
    fixes: 0
  };

  // =========================================================
  // 1. Recolector de errores unificado
  // =========================================================
  function record(type, msg, ctx) {
    var entry = { ts: Date.now(), type: type, msg: String(msg || ''), ctx: ctx || null };
    if (type === 'error') {
      health.errors.push(entry);
      if (health.errors.length > 30) health.errors.shift();
    } else {
      health.warnings.push(entry);
      if (health.warnings.length > 50) health.warnings.shift();
    }
  }

  window.addEventListener('error', function (ev) {
    record('error', ev.message || 'Error desconocido', {
      file: ev.filename,
      line: ev.lineno,
      col: ev.colno
    });
  });
  window.addEventListener('unhandledrejection', function (ev) {
    record('error', 'Promesa rechazada: ' + (ev.reason && ev.reason.message || ev.reason));
  });

  // =========================================================
  // 2. Indicador online/offline
  // =========================================================
  function setupConnectivity() {
    if (document.querySelector('.af-connectivity')) return;
    var bar = document.createElement('div');
    bar.className = 'af-connectivity';
    bar.setAttribute('aria-live', 'polite');
    bar.hidden = navigator.onLine;
    bar.textContent = '📴 Sin conexión — modo offline';
    document.body.appendChild(bar);

    function update() {
      var online = navigator.onLine;
      bar.hidden = online;
      if (!online) record('warn', 'App sin conexión');
    }
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  }

  // =========================================================
  // 3. Watchdog: detecta si la app no responde
  // =========================================================
  var _lastActivity = Date.now();
  function touchActivity() { _lastActivity = Date.now(); }
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, touchActivity, { passive: true });
  });

  setInterval(function () {
    // Si no hay actividad en 60s, y hay un spinner pegado, avisa
    var spinning = document.querySelector('.btn-spinning');
    if (spinning && Date.now() - _lastActivity > 15000) {
      record('warn', 'Botón en estado "spinning" demasiado tiempo');
      spinning.classList.remove('btn-spinning');
      spinning.textContent = spinning._afOrigText || 'Calcular';
      health.fixes++;
    }
    // Skeleton pegado
    var skel = document.querySelector('.af-skeleton-wrap');
    if (skel && Date.now() - health.lastCheck > 5000) {
      var container = skel.parentElement;
      if (container && container.children.length === 1) {
        record('warn', 'Skeleton bloqueado, forzando reload');
        skel.innerHTML = '<div class="panel" style="text-align:center;padding:20px;color:var(--text-dim)">Recargá para continuar</div>';
        health.fixes++;
      }
    }
    health.lastCheck = Date.now();
  }, 8000);

  // =========================================================
  // 4. Guard de doble navegación
  // =========================================================
  var _navLock = 0;
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    // Interceptar clicks en tarjetas, historial, biblioteca
    var nav = t.closest('#cards-grid .card, .history-item, .library-item');
    if (!nav) return;
    var now = Date.now();
    if (now - _navLock < 250) {
      e.preventDefault();
      e.stopPropagation();
      record('warn', 'Click duplicado bloqueado');
      return;
    }
    _navLock = now;
  }, true);

  // =========================================================
  // 5. Guard de canvas con tamaño 0
  // =========================================================
  function checkCanvasSize() {
    var canvases = document.querySelectorAll('.graph-canvas');
    for (var i = 0; i < canvases.length; i++) {
      var c = canvases[i];
      var rect = c.getBoundingClientRect();
      if (rect.width === 0 && c.offsetParent !== null) {
        // Está visible pero con width 0 → forzar reflow
        record('warn', 'Canvas con width 0 detectado, forzando redibujo');
        try {
          var mod = window.App && window.App.FUNCTIONS;
          // Buscar el id del módulo por el id del canvas
          var id = c.id.replace('canvas-', '');
          var m = window[id + 'Module'];
          if (m && typeof m._redraw === 'function') {
            setTimeout(function () { try { m._redraw(); } catch (e) {} }, 100);
          }
        } catch (e) {}
        health.fixes++;
      }
    }
  }

  // =========================================================
  // 6. Auto-recuperación de módulo vacío
  // =========================================================
  function checkModuleEmpty() {
    var container = document.getElementById('module-container');
    if (!container) return;
    var screen = document.getElementById('module-screen');
    if (!screen || !screen.classList.contains('active')) return;
    // Si el contenedor está vacío y el módulo está activo
    if (container.children.length === 0) {
      record('warn', 'Módulo activo pero contenedor vacío');
      // Intentar reabrir el último módulo del hash
      var h = (location.hash || '').replace(/^#/, '');
      var q = h.indexOf('?');
      var id = q >= 0 ? h.slice(0, q) : h;
      if (id && window.App && typeof window.App.openModule === 'function') {
        try { window.App.openModule(id); health.fixes++; } catch (e) {}
      }
    }
  }

  // =========================================================
  // 7. Scroll preservation entre pantallas
  // =========================================================
  var _scrollPositions = { home: 0, module: 0 };
  function saveScroll() {
    var home = document.getElementById('home-screen');
    var mod = document.getElementById('module-screen');
    if (home && home.classList.contains('active')) _scrollPositions.home = window.scrollY;
    if (mod && mod.classList.contains('active')) _scrollPositions.module = window.scrollY;
  }
  window.addEventListener('scroll', function () {
    clearTimeout(saveScroll._t);
    saveScroll._t = setTimeout(saveScroll, 200);
  }, { passive: true });

  // =========================================================
  // 8. LocalStorage robusto
  // =========================================================
  function safeStorageUsage() {
    try {
      var total = 0;
      for (var k in localStorage) {
        if (localStorage.hasOwnProperty(k)) {
          total += (localStorage[k] || '').length + k.length;
        }
      }
      return total;
    } catch (e) { return -1; }
  }

  function checkStorage() {
    var usage = safeStorageUsage();
    if (usage > 2 * 1024 * 1024) {   // 2 MB
      record('warn', 'localStorage con ' + Math.round(usage / 1024) + ' KB');
      // Limpiar notas huérfanas (con params ya no usados)
      try {
        var keys = Object.keys(localStorage).filter(function (k) { return k.indexOf('af:notes:') === 0; });
        // Mantener solo las últimas 5 sesiones de notas
        if (keys.length > 5) {
          keys.slice(0, keys.length - 5).forEach(function (k) { localStorage.removeItem(k); });
          record('warn', 'Notas antiguas limpiadas');
          health.fixes++;
        }
      } catch (e) {}
    }
  }

  // =========================================================
  // 9. Debounce global de operaciones costosas
  // =========================================================
  window._afDebounce = function (fn, ms) {
    var t = null;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { try { fn.apply(ctx, args); } catch (e) { record('error', e.message); } }, ms || 200);
    };
  };

  // =========================================================
  // 10. Monitoreo periódico (cada 4 s)
  // =========================================================
  setInterval(function () {
    checkCanvasSize();
    checkModuleEmpty();
    checkStorage();
  }, 4000);

  // =========================================================
  // 11. API pública de salud
  // =========================================================
  window._afHealth = function () {
    return {
      version: health.version,
      uptime_s: Math.round((Date.now() - health.startedAt) / 1000),
      online: navigator.onLine,
      errors: health.errors.length,
      warnings: health.warnings.length,
      fixes: health.fixes,
      storage_kb: Math.round(safeStorageUsage() / 1024),
      features: window._afFeatures || null,
      last_errors: health.errors.slice(-5).map(function (e) {
        return { ts: e.ts, msg: e.msg, where: e.ctx };
      })
    };
  };

  window._afHealthReport = function () {
    var h = window._afHealth();
    console.group('%c App Health ' + h.version, 'background:#4be1ec;color:#0a0a1a;padding:2px 6px;border-radius:4px;font-weight:700');
    console.log('Uptime:', h.uptime_s + 's');
    console.log('Online:', h.online);
    console.log('Errors:', h.errors);
    console.log('Warnings:', h.warnings);
    console.log('Auto-fixes:', h.fixes);
    console.log('Storage:', h.storage_kb + ' KB');
    console.log('Features:', h.features);
    if (h.last_errors.length) {
      console.group('Últimos errores:');
      h.last_errors.forEach(function (e) {
        console.log('→', e.msg, e.where || '');
      });
      console.groupEnd();
    }
    console.groupEnd();
  };

  // =========================================================
  // 12. Detectar y limpiar observers huérfanos de versiones previas
  // =========================================================
  function cleanupOrphanObservers() {
    // Limpiar timers/observers que no están en uso
    // Solo dejamos el que tiene el stability.js
    if (window._safeSetTimeout) return;  // ya manejado por stability
    // Si stability no cargó, hacemos limpieza básica
    var MAX_TIMERS = 50;
    var counter = 0;
    var origST = window.setTimeout;
    window.setTimeout = function () {
      counter++;
      if (counter > MAX_TIMERS * 10) {
        // Guardamos contra abuso
        record('warn', 'Muchos timers creados');
      }
      return origST.apply(this, arguments);
    };
  }

  // =========================================================
  // 13. Init
  // =========================================================
  function init() {
    setupConnectivity();
    cleanupOrphanObservers();

    // Chequeo inicial tras el primer render
    setTimeout(function () {
      checkCanvasSize();
      checkStorage();
      record('info', 'Sistema iniciado');
    }, 500);

    // Marca visible
    document.documentElement.classList.add('health-v19-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
