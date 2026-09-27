/* =========================================================
   ui-enhancements.js — v12
   Capa puramente cosmética. No toca matemáticas ni gráficos.
   Añade: ripple, stagger, scroll progress, haptics, chips.
   Se auto-inicializa al cargar.
   ========================================================= */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  // ---------- Helpers ----------
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function on(t, ev, fn, opts) { if (t) t.addEventListener(ev, fn, opts); }

  // ---------- 1. Haptics suaves ----------
  function haptic(ms) {
    if (!navigator.vibrate) return;
    try { navigator.vibrate(ms || 8); } catch (e) {}
  }

  // ---------- 2. Ripple effect (Material) ----------
  function attachRipple(el) {
    if (!el || el._afRipple) return;
    el._afRipple = true;
    el.style.position = el.style.position || 'relative';
    el.style.overflow = 'hidden';
    on(el, 'pointerdown', function (e) {
      var rect = el.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height) * 1.6;
      var span = document.createElement('span');
      span.className = 'af-ripple';
      span.style.width = span.style.height = size + 'px';
      span.style.left = (e.clientX - rect.left - size / 2) + 'px';
      span.style.top  = (e.clientY - rect.top  - size / 2) + 'px';
      el.appendChild(span);
      setTimeout(function () { if (span.parentNode) span.parentNode.removeChild(span); }, 600);
      haptic(6);
    });
  }

  function rippleAll() {
    qsa('.btn-primary, .btn-mini, .card, .preset-btn, .toolbar-btn, .btn-back, .theme-toggle, .update-btn, .modal-close, .slider-play')
      .forEach(attachRipple);
  }

  // ---------- 3. Stagger en tarjetas ----------
  function staggerCards() {
    var cards = qsa('#cards-grid .card');
    cards.forEach(function (c, i) {
      c.style.setProperty('--stagger', i);
    });
  }

  // ---------- 4. Chips visuales en tarjetas ----------
  var CHIPS = {
    Lineal: 'lineal',
    Cuadratica: 'polinomio',
    Cubica: 'polinomio',
    RaizCuadrada: 'raíz',
    RaizCubica: 'raíz',
    Modular: 'valor abs.',
    Logaritmica: 'log',
    Exponencial: 'exp',
    ProporcionalidadInversa: 'racional',
    Seno: 'trig',
    Coseno: 'trig',
    Tangente: 'trig'
  };
  function addCardChips() {
    qsa('#cards-grid .card').forEach(function (c) {
      if (c.querySelector('.card-chip')) return;
      var id = c.getAttribute('data-target');
      var label = CHIPS[id];
      if (!label) return;
      var chip = document.createElement('span');
      chip.className = 'card-chip';
      chip.textContent = label;
      c.appendChild(chip);
    });
  }

  // ---------- 5. Barra de progreso de scroll ----------
  function setupScrollProgress() {
    if (document.querySelector('.af-scroll-progress')) return;
    var bar = document.createElement('div');
    bar.className = 'af-scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    function update() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var pct = h > 0 ? (window.scrollY / h) * 100 : 0;
      bar.style.width = pct + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // ---------- 6. Spinner en botones primarios al calcular ----------
  function attachCalcSpinner() {
    // Detecta clicks en cualquier botón "Calcular Propiedades"
    document.addEventListener('click', function (e) {
      var b = e.target;
      if (!b || !b.id || b.id.indexOf('btn-calc-') !== 0) return;
      if (b._afSpinning) return;
      b._afSpinning = true;
      var orig = b.textContent;
      b.classList.add('btn-spinning');
      b.textContent = '';
      var sp = document.createElement('span');
      sp.className = 'af-spinner';
      b.appendChild(sp);
      // Restaurar tras un instante (el cálculo es síncrono y rápido)
      setTimeout(function () {
        b.classList.remove('btn-spinning');
        b.textContent = orig;
        b._afSpinning = false;
      }, 350);
      haptic(10);
    }, true);
  }

  // ---------- 7. Stagger en propiedades (al aparecer) ----------
  function observeProps() {
    if (typeof MutationObserver === 'undefined') return;
    var targets = document.querySelectorAll('.props-list');
    if (!targets.length) return;
    var obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.type !== 'childList') return;
        var parent = m.target;
        if (!parent.classList || !parent.classList.contains('props-list')) return;
        var items = parent.querySelectorAll('li');
        items.forEach(function (li, i) {
          li.style.setProperty('--stagger', i);
          li.classList.add('af-prop-enter');
        });
      });
    });
    targets.forEach(function (t) { obs.observe(t, { childList: true }); });
    // Re-observar cuando cambia de módulo
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.classList && (t.classList.contains('card') || t.classList.contains('history-item') || t.classList.contains('library-item'))) {
        setTimeout(function () {
          qsa('.props-list').forEach(function (p) {
            if (!p._afObserved) { p._afObserved = true; obs.observe(p, { childList: true }); }
          });
        }, 300);
      }
    });
  }

  // ---------- 8. Fade-in del gráfico ----------
  function fadeInCanvas() {
    if (typeof MutationObserver === 'undefined') return;
    var obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        var t = m.target;
        if (t.style && t.style.display !== 'none' && t.id && t.id.indexOf('graph-panel-') === 0) {
          var cv = t.querySelector('.graph-canvas');
          if (cv) { cv.classList.remove('af-canvas-in'); void cv.offsetWidth; cv.classList.add('af-canvas-in'); }
        }
      });
    });
    document.addEventListener('DOMContentLoaded', function () {
      qsa('[id^="graph-panel-"]').forEach(function (p) {
        obs.observe(p, { attributes: true, attributeFilter: ['style'] });
      });
    });
    // También cuando se renderiza un módulo nuevo
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.classList && t.classList.contains('card')) {
        setTimeout(function () {
          qsa('[id^="graph-panel-"]').forEach(function (p) { obs.observe(p, { attributes: true, attributeFilter: ['style'] }); });
        }, 300);
      }
    });
  }

  // ---------- 9. Interacciones de la home que aparecen dinámicamente ----------
  // (búsqueda en vivo modifica cards) — reaplicar ripple + chips
  function watchHome() {
    if (typeof MutationObserver === 'undefined') return;
    var grid = document.getElementById('cards-grid');
    if (!grid) return;
    var obs = new MutationObserver(function () {
      rippleAll(); staggerCards(); addCardChips();
    });
    obs.observe(grid, { childList: true, subtree: true });
  }

  // ---------- 10. Haptics en acciones del gráfico ----------
  function attachActionHaptics() {
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.classList) return;
      if (t.classList.contains('btn-mini') ||
          t.classList.contains('preset-btn') ||
          t.classList.contains('theme-toggle') ||
          t.classList.contains('slider-play') ||
          t.classList.contains('toolbar-btn')) {
        haptic(8);
      }
    }, true);
  }

  // ---------- 11. Poner acento activo global ----------
  function setupActiveAccent() {
    // Cuando se abre un módulo, propaga su color al root para glows globales
    document.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== document && !(t.classList && t.classList.contains('card'))) t = t.parentNode;
      if (!t || t === document) return;
      var acc = t.style.getPropertyValue('--accent');
      if (acc) document.documentElement.style.setProperty('--active-accent', acc.trim());
    });
  }

  // ---------- 12. Inicialización ----------
  function init() {
    rippleAll();
    staggerCards();
    addCardChips();
    setupScrollProgress();
    attachCalcSpinner();
    observeProps();
    fadeInCanvas();
    watchHome();
    attachActionHaptics();
    setupActiveAccent();

    // Reaplicar ripple cuando se añaden cosas nuevas
    document.addEventListener('click', function () {
      setTimeout(rippleAll, 100);
    });

    // Marcar como listo
    document.documentElement.classList.add('ui-v12-ready');
    if (window.CoreUtils && window.CoreUtils.announce) {
      // silencioso
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.UIEnhancements = { version: 'v12', haptic: haptic, rippleAll: rippleAll };
})();
