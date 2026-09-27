/* =========================================================
   stability.js — v18
   Capa defensiva. No toca lógica de negocio.
   - Error boundary global.
   - Registro central de observadores con cleanup.
   - Límite de notas por módulo (localStorage).
   - Throttle de eventos de input.
   - Bloqueo de doble-tap zoom.
   - Listeners passive donde es seguro.
   - try/catch envoltorios para operaciones críticas.
   ========================================================= */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // ---------- 0. Error boundary global ----------
  var _errorCount = 0;
  var _lastErrorTs = 0;
  window.addEventListener('error', function (ev) {
    // Suprimir errores conocidos y no críticos
    var msg = (ev.message || '') + '';
    if (/Script error|ResizeObserver|Non-Error/.test(msg)) return;
    // Throttle: no mostrar más de 1 mensaje cada 3 s
    var now = Date.now();
    if (now - _lastErrorTs < 3000) return;
    _lastErrorTs = now;
    _errorCount++;
    if (_errorCount <= 3) {
      console.warn('[stability] Error capturado:', msg);
      // Aviso silencioso en aria-live
      var live = document.getElementById('aria-live');
      if (live) live.textContent = 'Aviso: un componente tuvo un problema y fue aislado.';
    }
  });
  window.addEventListener('unhandledrejection', function (ev) {
    console.warn('[stability] Promesa rechazada:', ev.reason);
    ev.preventDefault && ev.preventDefault();
  });

  // ---------- 1. Registro de observadores ----------
  var _observers = new Set();
  var _timers = new Set();
  var _intervals = new Set();

  var _origObserve = MutationObserver.prototype.observe;
  var _origDisconnect = MutationObserver.prototype.disconnect;

  MutationObserver.prototype.observe = function (target, opts) {
    _observers.add(this);
    return _origObserve.call(this, target, opts);
  };
  MutationObserver.prototype.disconnect = function () {
    _observers.delete(this);
    return _origDisconnect.call(this);
  };

  // Guard para MutationObserver viejos que no se desconectan
  window.addEventListener('beforeunload', function () {
    _observers.forEach(function (o) { try { o.disconnect(); } catch (e) {} });
    _timers.forEach(function (t) { clearTimeout(t); });
    _intervals.forEach(function (i) { clearInterval(i); });
  });

  // Exponer helpers seguros
  window._safeSetTimeout = function (fn, ms) {
    var id = setTimeout(function () { _timers.delete(id); try { fn(); } catch (e) {} }, ms);
    _timers.add(id);
    return id;
  };
  window._safeSetInterval = function (fn, ms) {
    var id = setInterval(function () { try { fn(); } catch (e) {} }, ms);
    _intervals.add(id);
    return id;
  };

  // ---------- 2. Límite de notas por módulo ----------
  var NOTES_MAX = 60;
  var _origSetItem = localStorage.setItem.bind(localStorage);
  var _origGetItem = localStorage.getItem.bind(localStorage);

  // Wrapper de setItem para notas: rechaza si excede el límite
  try {
    var _storageProto = Storage.prototype;
    var _setItem = _storageProto.setItem;
    _storageProto.setItem = function (key, value) {
      if (typeof key === 'string' && key.indexOf('af:notes:') === 0) {
        try {
          var arr = JSON.parse(value);
          if (Array.isArray(arr) && arr.length > NOTES_MAX) {
            arr = arr.slice(0, NOTES_MAX);
            value = JSON.stringify(arr);
            console.warn('[stability] Notas recortadas a ' + NOTES_MAX);
          }
        } catch (e) {}
      }
      try { return _setItem.call(this, key, value); }
      catch (e) {
        // QuotaExceededError: limpiar histórico
        try {
          if (key.indexOf('af:notes:') === 0) {
            console.warn('[stability] localStorage lleno, limpiando histórico');
            this.removeItem('af:history');
          }
        } catch (_) {}
        return;
      }
    };
  } catch (e) {}

  // ---------- 3. Throttle de eventos costosos ----------
  function throttle(fn, ms) {
    var last = 0, timer = null;
    return function () {
      var now = Date.now();
      var args = arguments, ctx = this;
      if (now - last >= ms) { last = now; fn.apply(ctx, args); }
      else if (!timer) {
        timer = setTimeout(function () {
          last = Date.now(); timer = null;
          fn.apply(ctx, args);
        }, ms - (now - last));
      }
    };
  }
  window._throttle = throttle;

  // Throttle del evento resize global
  var resizeHandlers = [];
  window.addEventListener('resize', throttle(function () {
    resizeHandlers.forEach(function (h) { try { h(); } catch (e) {} });
  }, 150), { passive: true });

  // ---------- 4. Prevenir doble-tap zoom en iOS ----------
  var lastTouch = 0;
  document.addEventListener('touchend', function (e) {
    var now = Date.now();
    if (now - lastTouch < 300) {
      // Es un doble tap, prevenir zoom
      var t = e.target;
      // Pero permitir en inputs y botones
      if (!t || !t.closest || (!t.closest('input, textarea, button, a, select'))) {
        e.preventDefault();
      }
    }
    lastTouch = now;
  }, { passive: false });

  // ---------- 5. Listeners passive globales ----------
  // Reforzar passive en scroll/touchmove si no lo están
  document.addEventListener('touchmove', function () {}, { passive: true });
  document.addEventListener('scroll', function () {}, { passive: true });

  // ---------- 6. Guard: canvas sin tamaño ----------
  // Algunos bugs venían de canvases con width=0
  var _origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function () {
    if (this.width === 0 || this.height === 0) {
      // Forzar un tamaño mínimo para evitar errores
      var r = this.getBoundingClientRect();
      if (r.width === 0) {
        var dpr = window.devicePixelRatio || 1;
        this.width = Math.max(300, r.width) * dpr;
        this.height = Math.max(200, r.height) * dpr;
      }
    }
    return _origGetContext.apply(this, arguments);
  };

  // ---------- 7. Race condition: no permitir doble openModule ----------
  var _opening = false;
  window.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var c = t.closest('#cards-grid .card, .history-item, .library-item');
    if (!c) return;
    if (_opening) { e.preventDefault(); e.stopPropagation(); return; }
    _opening = true;
    setTimeout(function () { _opening = false; }, 350);
  }, true);

  // ---------- 8. Auto-limpieza: limitar histórico ----------
  try {
    var rawH = _origGetItem('af:history');
    if (rawH) {
      var arr = JSON.parse(rawH);
      if (Array.isArray(arr) && arr.length > 15) {
        _origSetItem('af:history', JSON.stringify(arr.slice(0, 15)));
      }
    }
  } catch (e) {}

  // ---------- 9. Detección de features ----------
  var FEATURES = {
    pointerEvents: 'PointerEvent' in window,
    vibrate: 'vibrate' in navigator,
    clipboard: !!(navigator.clipboard && navigator.clipboard.writeText),
    katex: typeof window.katex !== 'undefined',
    nerdamer: typeof window.nerdamer !== 'undefined',
    math: typeof window.math !== 'undefined'
  };
  window._afFeatures = FEATURES;

  if (!FEATURES.math) console.warn('[stability] math.js no cargó — usando fallback');
  if (!FEATURES.katex) console.warn('[stability] KaTeX no cargó — preview en texto plano');

  document.documentElement.classList.add('stability-v18-ready');
})();
