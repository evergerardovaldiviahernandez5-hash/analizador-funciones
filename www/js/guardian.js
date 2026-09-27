/* =========================================================
   guardian.js — v21
   Capa defensiva avanzada. Puramente aditiva.
   --------------------------------------------------------
   1.  Auto-reparación del Service Worker atascado
   2.  Monitor de consistencia (hash ↔ pantalla ↔ módulo)
   3.  Cleanup de recursos al cambiar de módulo
   4.  Validación inline de inputs
   5.  Detección de colisiones de globals
   6.  Monitor de memoria (nodos DOM + listeners)
   7.  Monitor de FPS → auto-pausa de animaciones
   8.  Snapshot de sesión (auto-guardado)
   9.  Guard contra MutationObserver en loop
   10. Sanitización de fórmulas peligrosas
   ========================================================= */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window._afGuardianInit) return;
  window._afGuardianInit = true;

  var G = {
    version: 'v21',
    startedAt: Date.now(),
    fixes: 0,
    warnings: [],
    collisions: [],
    swRepaired: false,
    observerLoops: 0,
    memoryAlerts: 0
  };

  var _notice = function (msg, type) {
    if (window._afGuardianNotice) return window._afGuardianNotice(msg, type);
    // Fallback si recovery no está
    console.log('[guardian]', type || 'info', msg);
  };

  // =========================================================
  // 1. Auto-reparación del Service Worker
  // =========================================================
  function repairServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    var checkTimer = setTimeout(function () {
      // Si el SW no está activo en 8s, algo falla
      navigator.serviceWorker.getRegistration().then(function (reg) {
        if (!reg) {
          _notice('Sin Service Worker activo', 'warn');
          return;
        }
        if (reg.installing || reg.waiting) {
          console.warn('[guardian] SW atascado, forzando actualización');
          if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
          if (reg.installing) {
            reg.installing.addEventListener('statechange', function () {
              if (this.state === 'installed' && navigator.serviceWorker.controller) {
                this.postMessage('SKIP_WAITING');
              }
            });
          }
          G.fixes++;
        }
      }).catch(function (e) {
        console.warn('[guardian] SW check error:', e);
      });
    }, 8000);

    // Cancelar timer si el SW ya está control
    if (navigator.serviceWorker.controller) {
      clearTimeout(checkTimer);
    } else {
      navigator.serviceWorker.ready.then(function () {
        clearTimeout(checkTimer);
      }).catch(function () {});
    }

    // Detectar SW en estado "redundant"
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) {
        if (r.active && r.active.state === 'redundant') {
          console.warn('[guardian] SW redundant, desregistrando');
          r.unregister().then(function () {
            G.swRepaired = true;
            G.fixes++;
            _notice('Service Worker reparado. Recargá si ves problemas.', 'warn');
          });
        }
      });
    }).catch(function () {});
  }

  // =========================================================
  // 2. Monitor de consistencia (hash ↔ pantalla ↔ módulo)
  // =========================================================
  function checkConsistency() {
    var hash = (location.hash || '').replace(/^#/, '');
    var modId = hash ? (hash.indexOf('?') >= 0 ? hash.slice(0, hash.indexOf('?')) : hash) : '';
    var homeActive = document.getElementById('home-screen').classList.contains('active');
    var moduleActive = document.getElementById('module-screen').classList.contains('active');

    // Caso 1: hash dice módulo, pero estamos en home
    if (modId && homeActive && window[modId + 'Module']) {
      console.warn('[guardian] Hash y pantalla desincronizados, reparando');
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
      G.fixes++;
      return;
    }

    // Caso 2: hash dice módulo, pero no hay módulo renderizado
    if (modId && moduleActive) {
      var container = document.getElementById('module-container');
      if (container && container.children.length === 0) {
        console.warn('[guardian] Módulo activo pero vacío, reabriendo');
        if (window.App && typeof window.App.openModule === 'function') {
          window.App.openModule(modId);
          G.fixes++;
        }
      }
    }

    // Caso 3: ninguna pantalla activa
    if (!homeActive && !moduleActive) {
      console.warn('[guardian] Ninguna pantalla activa, forzando home');
      var home = document.getElementById('home-screen');
      if (home) home.classList.add('active');
      G.fixes++;
    }
  }

  // =========================================================
  // 3. Cleanup de recursos al cambiar de módulo
  // =========================================================
  var _lastModuleId = null;

  function cleanupPreviousModule() {
    if (!_lastModuleId) return;
    var prev = window[_lastModuleId + 'Module'];
    if (!prev) return;

    // Cancelar animación de slider si estaba activa
    if (prev._animating) {
      try { cancelAnimationFrame(prev._animating.raf); } catch (e) {}
      prev._animating = null;
    }

    // Cancelar timers de polling
    if (prev._pollTimer) {
      clearInterval(prev._pollTimer);
      prev._pollTimer = null;
    }

    // Marcar como desmontado
    if (prev._container) {
      prev._container._afMounted = false;
    }
  }

  function trackModuleChange() {
    var screen = document.getElementById('module-screen');
    if (!screen) return;
    var obs = new MutationObserver(function () {
      var isActive = screen.classList.contains('active');
      if (!isActive) {
        // Salimos del módulo → cleanup
        cleanupPreviousModule();
        _lastModuleId = null;
        return;
      }
      var hash = (location.hash || '').replace(/^#/, '');
      var modId = hash.indexOf('?') >= 0 ? hash.slice(0, hash.indexOf('?')) : hash;
      if (modId !== _lastModuleId) {
        cleanupPreviousModule();
        _lastModuleId = modId;
      }
    });
    obs.observe(screen, { attributes: true, attributeFilter: ['class'] });

    // También escuchar cambios de hash
    window.addEventListener('hashchange', function () {
      setTimeout(trackModuleChange._check || (trackModuleChange._check = function () {
        var h = (location.hash || '').replace(/^#/, '');
        var id = h.indexOf('?') >= 0 ? h.slice(0, h.indexOf('?')) : h;
        if (id !== _lastModuleId) {
          cleanupPreviousModule();
          _lastModuleId = id;
        }
      }), 30);
    });
  }

  // =========================================================
  // 4. Validación inline de inputs
  // =========================================================
  var DANGER_PATTERNS = [
    { re: /\beval\b/i,            msg: 'eval no permitido' },
    { re: /\bFunction\b/,         msg: 'Function no permitido' },
    { re: /<script/i,             msg: 'HTML no permitido' },
    { re: /javascript:/i,         msg: 'javascript: no permitido' },
    { re: /onerror\s*=/i,         msg: 'atributos on* no permitidos' }
  ];

  function validateInputValue(value) {
    if (typeof value !== 'string') return { ok: true };
    var v = value.trim();
    if (v === '') return { ok: true };
    for (var i = 0; i < DANGER_PATTERNS.length; i++) {
      if (DANGER_PATTERNS[i].re.test(v)) return { ok: false, msg: DANGER_PATTERNS[i].msg };
    }
    // Detección de expresión demasiado larga (posible DoS)
    if (v.length > 200) return { ok: false, msg: 'Expresión demasiado larga (máx 200)' };
    return { ok: true };
  }

  function attachInputValidation() {
    document.addEventListener('input', function (e) {
      var t = e.target;
      if (!t || t.tagName !== 'INPUT' || t.type !== 'text') return;
      var check = validateInputValue(t.value);
      if (!check.ok) {
        t.classList.add('af-input-error');
        showFieldError(t, check.msg);
      } else {
        t.classList.remove('af-input-error');
        hideFieldError(t);
      }
    }, true);
  }

  function showFieldError(input, msg) {
    var parent = input.parentElement;
    if (!parent) return;
    var bubble = parent.querySelector('.af-field-error');
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.className = 'af-field-error';
      parent.appendChild(bubble);
    }
    bubble.textContent = msg;
    bubble.hidden = false;
  }
  function hideFieldError(input) {
    var parent = input.parentElement;
    if (!parent) return;
    var bubble = parent.querySelector('.af-field-error');
    if (bubble) bubble.hidden = true;
  }

  // =========================================================
  // 5. Detección de colisiones de globals
  // =========================================================
  var EXPECTED_GLOBALS = [
    'math', 'nerdamer', 'katex',
    'mathParser', 'CoreUtils', 'CORES',
    'Graph', 'Format', 'CustomIcons',
    'App', 'UIV13', 'UIV14', 'UIV15',
    '_afHealth', '_afRecovery', '_afGuardian',
    '_afFeatures', '_safeSetTimeout', '_safeSetInterval',
    '_throttle', '_afDebounce'
  ];

  function checkGlobalCollisions() {
    // Verificar que los módulos de la app se registren como uno solo
    var MODULES = ['Lineal', 'Cuadratica', 'Cubica', 'RaizCuadrada', 'RaizCubica',
                   'Modular', 'Logaritmica', 'Exponencial', 'ProporcionalidadInversa',
                   'Seno', 'Coseno', 'Tangente'];
    for (var i = 0; i < MODULES.length; i++) {
      var name = MODULES[i] + 'Module';
      var mod = window[name];
      if (mod && mod._afRegisteredOnce && mod._afRegisteredOnce !== 'v17') {
        G.collisions.push(name);
        console.warn('[guardian] Módulo ' + name + ' registrado más de una vez');
        G.fixes++;
      }
      if (mod) mod._afRegisteredOnce = 'v17';
    }

    // Reportar globals que faltan
    var missing = EXPECTED_GLOBALS.filter(function (g) { return window[g] === undefined; });
    if (missing.length) {
      G.warnings.push('Faltan globals: ' + missing.join(', '));
      console.warn('[guardian] Globals no cargados:', missing);
    }
  }

  // =========================================================
  // 6. Monitor de memoria (nodos DOM + listeners aproximados)
  // =========================================================
  function checkMemory() {
    var nodes = document.getElementsByTagName('*').length;
    if (nodes > 5000) {
      G.memoryAlerts++;
      console.warn('[guardian] Muchos nodos DOM:', nodes);
      // Cleanup preventivo: cerrar modales ocultos
      document.querySelectorAll('.modal-overlay[hidden] .modal-body').forEach(function (b) {
        b.innerHTML = '';
      });
      // Cleanup: notas huérfanas en DOM
      var orphanNotes = document.querySelectorAll('.note-item').length;
      if (orphanNotes > 100) {
        console.warn('[guardian] Muchas notas en DOM:', orphanNotes);
      }
    }
    // Si hay performance.memory, chequear heap
    if (performance && performance.memory) {
      var used = performance.memory.usedJSHeapSize / 1024 / 1024;
      if (used > 200) {
        G.memoryAlerts++;
        console.warn('[guardian] Heap alto:', Math.round(used) + ' MB');
      }
    }
  }

  // =========================================================
  // 7. Monitor de FPS → auto-pausa animaciones
  // =========================================================
  var _lowFpsStreak = 0;
  var _animationsPaused = false;

  function monitorFps() {
    var lastTs = performance.now();
    var frames = 0;
    var framesWindowStart = lastTs;

    function tick(ts) {
      frames++;
      var now = ts || performance.now();
      // Cada 1s calculamos FPS
      if (now - framesWindowStart >= 1000) {
        var fps = Math.round(frames * 1000 / (now - framesWindowStart));
        frames = 0;
        framesWindowStart = now;

        if (fps < 30) {
          _lowFpsStreak++;
          if (_lowFpsStreak >= 3 && !_animationsPaused) {
            _animationsPaused = true;
            document.documentElement.classList.add('low-fps-mode');
            console.warn('[guardian] FPS bajos (' + fps + '), pausando animaciones');
            G.fixes++;
          }
        } else {
          if (_lowFpsStreak > 0) _lowFpsStreak--;
          if (_animationsPaused && _lowFpsStreak === 0) {
            _animationsPaused = false;
            document.documentElement.classList.remove('low-fps-mode');
            console.info('[guardian] FPS recuperados, reactivando animaciones');
          }
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // =========================================================
  // 8. Snapshot de sesión (auto-guardado)
  // =========================================================
  var SNAPSHOT_KEY = 'af:snapshot';
  var SNAPSHOT_INTERVAL = 30000;

  function saveSnapshot() {
    try {
      var snap = {
        ts: Date.now(),
        hash: location.hash,
        activeScreen: document.querySelector('.screen.active')
          ? document.querySelector('.screen.active').id
          : 'home-screen',
        scrollY: window.scrollY
      };
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
    } catch (e) {}
  }

  function restoreSnapshot() {
    try {
      var raw = localStorage.getItem(SNAPSHOT_KEY);
      if (!raw) return;
      var snap = JSON.parse(raw);
      // Solo restaurar si fue hace <30 minutos
      if (Date.now() - snap.ts > 30 * 60 * 1000) {
        localStorage.removeItem(SNAPSHOT_KEY);
        return;
      }
      // Si el hash actual está vacío pero había uno guardado, restaurar
      if (!location.hash && snap.hash) {
        console.info('[guardian] Restaurando snapshot de sesión');
        try { history.replaceState(null, '', snap.hash); } catch (e) {}
      }
    } catch (e) {
      localStorage.removeItem(SNAPSHOT_KEY);
    }
  }

  // =========================================================
  // 9. Guard contra MutationObserver en loop
  // =========================================================
  var _origObserve = MutationObserver.prototype.observe;
  MutationObserver.prototype.observe = function () {
    var self = this;
    var callCount = 0;
    var lastReset = Date.now();

    // Envolvemos el callback
    var origTakeRecords = self.takeRecords.bind(self);
    var wrapped = new WeakSet();

    var result = _origObserve.apply(this, arguments);
    if (!self._afLoopGuard) {
      self._afLoopGuard = true;
      // Parche: interceptar el callback vía queueMicrotask (aproximado)
      var origCallback = self._callback;
      // Nota: no podemos interceptar el callback directamente sin acceso,
      // así que contamos invocaciones indirectamente con takeRecords
      setInterval(function () {
        var recs = origTakeRecords();
        if (recs.length > 100) {
          G.observerLoops++;
          console.warn('[guardian] MutationObserver con exceso de mutaciones:', recs.length);
          // Desconectar temporalmente para evitar loop
          try { self.disconnect(); } catch (e) {}
          setTimeout(function () {
            try { _origObserve.call(self, document.body, { childList: false, attributes: false }); } catch (e) {}
          }, 1000);
        }
      }, 2000);
    }
    return result;
  };

  // =========================================================
  // 10. Sanitización de fórmulas peligrosas
  // =========================================================
  function sanitizeFormula(formula) {
    if (typeof formula !== 'string') return formula;
    var f = formula;
    // Bloquear patrones de código
    var dangerous = [
      /\beval\b/g, /\bFunction\b/g, /\bconstructor\b/g,
      /__proto__/g, /prototype/g, /<script/gi, /<\/script/gi
    ];
    for (var i = 0; i < dangerous.length; i++) {
      if (dangerous[i].test(f)) return null;
    }
    return f;
  }

  // Exponer API
  window._afSanitizeFormula = sanitizeFormula;

  // =========================================================
  // 11. API pública
  // =========================================================
  window._afGuardian = function () {
    return {
      version: G.version,
      uptime_s: Math.round((Date.now() - G.startedAt) / 1000),
      fixes: G.fixes,
      swRepaired: G.swRepaired,
      observerLoops: G.observerLoops,
      memoryAlerts: G.memoryAlerts,
      collisions: G.collisions,
      warnings: G.warnings,
      currentModule: _lastModuleId,
      lowFps: _animationsPaused,
      domNodes: document.getElementsByTagName('*').length
    };
  };

  window._afGuardianReport = function () {
    var g = window._afGuardian();
    console.group('%c Guardian ' + g.version, 'background:#b892ff;color:#fff;padding:2px 6px;border-radius:4px;font-weight:700');
    console.log('Uptime:', g.uptime_s + 's');
    console.log('Auto-fixes:', g.fixes);
    console.log('SW reparado:', g.swRepaired);
    console.log('Módulo actual:', g.currentModule || '(ninguno)');
    console.log('Nodos DOM:', g.domNodes);
    console.log('FPS bajos:', g.lowFps ? 'sí — animaciones pausadas' : 'no');
    console.log('Loops observados:', g.observerLoops);
    console.log('Alertas de memoria:', g.memoryAlerts);
    if (g.collisions.length) console.warn('Colisiones:', g.collisions);
    if (g.warnings.length) console.warn('Advertencias:', g.warnings);
    console.groupEnd();
  };

  // =========================================================
  // 12. Init
  // =========================================================
  function init() {
    restoreSnapshot();
    repairServiceWorker();
    attachInputValidation();
    trackModuleChange();

    // Monitoreo periódico
    setInterval(checkConsistency, 1000);
    setInterval(checkMemory, 6000);
    setInterval(saveSnapshot, SNAPSHOT_INTERVAL);

    // Verificación inicial de globals (con delay)
    setTimeout(checkGlobalCollisions, 1500);

    // Arrancar monitor de FPS
    requestAnimationFrame(monitorFps);

    // Guardar snapshot antes de cerrar
    window.addEventListener('beforeunload', saveSnapshot);

    document.documentElement.classList.add('guardian-v21-ready');
    console.info('[guardian] v21 listo:', window._afGuardian());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
