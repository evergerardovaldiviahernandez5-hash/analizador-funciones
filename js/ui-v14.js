/* =========================================================
   ui-v14.js
   - Navegación unificada (título clickeable + bottom-nav global)
   - Empty state ilustrado
   - Skeleton loader al abrir módulo
   - Long-press en tarjetas → tooltip con ecuación completa
   - Selector de rango X (min/max) en el panel del gráfico
   ========================================================= */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function haptic(ms) { try { navigator.vibrate && navigator.vibrate(ms || 6); } catch (e) {} }

  // =========================================================
  // 1. Título del módulo → clickeable para volver al home
  // =========================================================
  function initClickableTitle() {
    var titleEl = document.getElementById('module-title');
    if (!titleEl || titleEl._afClickable) return;
    titleEl._afClickable = true;
    function goHome() {
      haptic(8);
      if (window.App && window.App.goHome) window.App.goHome();
    }
    titleEl.addEventListener('click', goHome);
    titleEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goHome(); }
    });
  }

  // =========================================================
  // 2. Bottom-nav visible en todas las pantallas
  // =========================================================
  function ensureBottomNavAlwaysVisible() {
    var nav = document.querySelector('.bottom-nav');
    if (!nav) return;
    // El CSS v13 lo ocultaba en >640px. Lo mostramos como pill flotante
    // (el propio CSS de v14 se encarga del estilo "pill")
    document.documentElement.classList.add('ui-v14-bottomnav-global');
  }

  // =========================================================
  // 3. Empty state en la búsqueda
  // =========================================================
  var EMPTY_SVG =
    '<svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">' +
      '<circle cx="52" cy="52" r="34" fill="none" stroke="currentColor" stroke-width="4" opacity="0.35"/>' +
      '<line x1="78" y1="78" x2="102" y2="102" stroke="currentColor" stroke-width="6" stroke-linecap="round" opacity="0.45"/>' +
      '<path d="M40 52 Q 52 40 64 52" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.55"/>' +
      '<circle cx="42" cy="46" r="2.5" fill="currentColor" opacity="0.6"/>' +
      '<circle cx="62" cy="46" r="2.5" fill="currentColor" opacity="0.6"/>' +
    '</svg>';

  function injectEmptyState() {
    var grid = document.getElementById('cards-grid');
    if (!grid) return;
    // Observar si el grid tiene 0 hijos visibles
    var obs = new MutationObserver(checkEmpty);
    obs.observe(grid, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });

    // También detectar cambios de búsqueda
    var search = document.getElementById('cards-search');
    if (search && !search._afEmptyHooked) {
      search._afEmptyHooked = true;
      search.addEventListener('input', function () { setTimeout(checkEmpty, 30); });
    }
    checkEmpty();
  }

  function checkEmpty() {
    var grid = document.getElementById('cards-grid');
    if (!grid) return;
    var cards = qsa('.card', grid);
    var visible = 0;
    for (var i = 0; i < cards.length; i++) if (!cards[i].classList.contains('hidden')) visible++;

    var existing = grid.querySelector('.af-empty-state');
    if (visible === 0 && cards.length > 0) {
      if (!existing) {
        var el = document.createElement('div');
        el.className = 'af-empty-state';
        el.innerHTML = EMPTY_SVG +
          '<p class="af-empty-title">Sin resultados</p>' +
          '<p class="af-empty-desc">Prueba con otro término o busca por categoría:<br>' +
          '<em>lineal, polinomio, raíz, trig, exp, log, racional</em></p>';
        grid.appendChild(el);
      }
    } else if (existing) {
      existing.remove();
    }
  }

  // =========================================================
  // 4. Skeleton loader al abrir un módulo
  // =========================================================
  function installSkeletonOnOpen() {
    if (!window.App || !window.App.openModule) return;
    if (window.App._afSkeletonHooked) return;
    window.App._afSkeletonHooked = true;

    var origOpen = window.App.openModule;
    window.App.openModule = function (id) {
      var container = document.getElementById('module-container');
      if (container) {
        container.innerHTML =
          '<div class="af-skeleton-wrap" aria-hidden="true">' +
            '<div class="panel af-skel-panel"><div class="af-skel af-skel-eq"></div></div>' +
            '<div class="panel af-skel-panel">' +
              '<div class="af-skel af-skel-line short"></div>' +
              '<div class="af-skel af-skel-inputs">' +
                '<div class="af-skel af-skel-input"></div>' +
                '<div class="af-skel af-skel-input"></div>' +
                '<div class="af-skel af-skel-input"></div>' +
              '</div>' +
              '<div class="af-skel af-skel-btn"></div>' +
            '</div>' +
            '<div class="panel af-skel-panel">' +
              '<div class="af-skel af-skel-line"></div>' +
              '<div class="af-skel af-skel-chart"></div>' +
            '</div>' +
          '</div>';
      }
      return origOpen.call(window.App, id);
    };
  }

  // =========================================================
  // 5. Long-press en tarjetas → tooltip ecuación completa
  // =========================================================
  function installLongPress() {
    var PRESS_MS = 500;
    var timer = null, startX = 0, startY = 0, card = null, tooltip = null;

    function clearTooltip() {
      if (tooltip && tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
      tooltip = null;
    }

    function showTooltip(target, text, x, y) {
      clearTooltip();
      tooltip = document.createElement('div');
      tooltip.className = 'af-longpress-tip';
      tooltip.textContent = (window._afI18nFull ? window._afI18nFull.translate(text) : text);
      tooltip.style.left = Math.max(8, Math.min(window.innerWidth - 260, x - 110)) + 'px';
      tooltip.style.top = (y - 50) + 'px';
      document.body.appendChild(tooltip);
      haptic(12);
      setTimeout(clearTooltip, 2400);
    }

    document.addEventListener('pointerdown', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var c = t.closest('#cards-grid .card');
      if (!c) return;
      card = c;
      startX = e.clientX; startY = e.clientY;
      var id = c.getAttribute('data-target');
      var fn = null;
      if (window.App && window.App.FUNCTIONS) {
        for (var i = 0; i < window.App.FUNCTIONS.length; i++) {
          if (window.App.FUNCTIONS[i].id === id) { fn = window.App.FUNCTIONS[i]; break; }
        }
      }
      if (!fn) return;
      var text = fn.name + '  —  ' + fn.eq;
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (!card) return;
        showTooltip(card, text, startX, startY);
        // Evitar el click subsiguiente
        card._afSwallow = true;
      }, PRESS_MS);
    });

    document.addEventListener('pointermove', function (e) {
      if (!timer) return;
      var dx = Math.abs(e.clientX - startX);
      var dy = Math.abs(e.clientY - startY);
      if (dx > 10 || dy > 10) { clearTimeout(timer); timer = null; card = null; }
    });

    document.addEventListener('pointerup', function () {
      clearTimeout(timer); timer = null; card = null;
    });
    document.addEventListener('pointercancel', function () {
      clearTimeout(timer); timer = null; card = null;
    });

    // Interceptar click cuando ya se mostró tooltip
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var c = t.closest('#cards-grid .card');
      if (c && c._afSwallow) {
        c._afSwallow = false;
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  }

  // =========================================================
  // 6. Selector visual de rango X (min/max) en el panel gráfico
  // =========================================================
  function installRangeSelector() {
    var container = document.getElementById('module-container');
    if (!container) return;

    var obs = new MutationObserver(function () {
      var gp = container.querySelector('[id^="graph-panel-"]');
      if (gp && !gp.querySelector('.af-range-ctrl')) injectRangeCtrl(gp);
    });
    obs.observe(container, { childList: true, subtree: true });
    var gp = container.querySelector('[id^="graph-panel-"]');
    if (gp && !gp.querySelector('.af-range-ctrl')) injectRangeCtrl(gp);
  }

  // "" → null ; "∞"/"inf" → ±Infinity ; "1/2" → 0.5 ; texto → NaN
  function parseRangeVal(s) {
    s = String(s == null ? '' : s).trim();
    if (s === '') return null;
    var t = s.toLowerCase()
             .replace(/∞/g, 'inf')
             .replace(/−/g, '-')
             .replace(/\s+/g, '');
    if (t === 'inf' || t === '+inf' || t === 'infinity' || t === '+infinity')
      return Infinity;
    if (t === '-inf' || t === '-infinity')
      return -Infinity;
    // Expresiones tipo 1/2, 3.14, -5
    if (window.mathParser && typeof window.mathParser.evalString === 'function') {
      try {
        var v = window.mathParser.evalString(s, 1);
        if (typeof v === 'number' && isFinite(v)) return v;
      } catch (e) { /* fallback */ }
    }
    var n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }

  function injectRangeCtrl(graphPanel) {
    var id = graphPanel.id.replace('graph-panel-', '');
    var wrap = document.createElement('div');
    wrap.className = 'af-range-ctrl';
    wrap.innerHTML =
      '<span class="af-range-label">Análisis en X:</span>' +
      '<input type="text" class="af-range-min" placeholder="-∞" aria-label="X mínimo" value="" inputmode="text">' +
      '<span class="af-range-sep">—</span>' +
      '<input type="text" class="af-range-max" placeholder="∞" aria-label="X máximo" value="" inputmode="text">' +
      '<button type="button" class="af-range-apply" title="Aplicar rango">Aplicar</button>' +
      '<button type="button" class="af-range-reset" title="Volver a ∞ (rango completo)">∞</button>';

    var actions = graphPanel.querySelector('.graph-actions');
    if (actions && actions.parentNode === graphPanel) {
      graphPanel.insertBefore(wrap, actions);
    } else {
      graphPanel.appendChild(wrap);
    }

    var minInput = wrap.querySelector('.af-range-min');
    var maxInput = wrap.querySelector('.af-range-max');
    var applyBtn = wrap.querySelector('.af-range-apply');
    var resetBtn = wrap.querySelector('.af-range-reset');

    // Guardar la firma del último rango sincronizado para no clobber input del usuario
    var lastSyncedSig = 'init';

    function natBounds() {
      var mod = window[id + 'Module'];
      var r = mod && Array.isArray(mod._baseRange) ? mod._baseRange : null;
      var a = r && isFinite(r[0]) ? r[0] : -10;
      var b = r && isFinite(r[1]) ? r[1] :  10;
      if (a >= b) { a = -10; b = 10; }
      return [a, b];
    }

    function syncInputsFromModule() {
      if (!graphPanel.isConnected) {
        clearInterval(graphPanel._afSyncTimer);
        return;
      }
      var mod = window[id + 'Module'];
      if (!mod) return;
      var r = mod._userRange;
      var sig = Array.isArray(r) ? (r[0] + ',' + r[1]) : 'null';
      if (sig === lastSyncedSig) return;   // nada cambió, no tocar inputs
      lastSyncedSig = sig;

      if (Array.isArray(r) && r.length === 2) {
        // Sólo sincroniza cuando el usuario NO está escribiendo
        if (document.activeElement !== minInput) minInput.value = String(r[0]);
        if (document.activeElement !== maxInput) maxInput.value = String(r[1]);
        wrap.classList.add('has-range');
      } else {
        // No borres lo que el usuario escribió. Sólo quita el badge visual.
        wrap.classList.remove('has-range');
      }
    }

    function flashError() {
      wrap.classList.add('af-range-error');
      setTimeout(function () { wrap.classList.remove('af-range-error'); }, 900);
    }

    function applyRange() {
      var mod = window[id + 'Module'];
      if (!mod) return;

      var rawMin = parseRangeVal(minInput.value);
      var rawMax = parseRangeVal(maxInput.value);

      // Entrada no numérica → flash y no tocar nada
      if (isNaN(rawMin) || isNaN(rawMax)) { flashError(); return; }

      // Resolver bounds: null / ±Infinity → bound natural del módulo
      var nat = natBounds();
      var natMin = nat[0], natMax = nat[1];

      var xmin = (rawMin === null || !isFinite(rawMin)) ? natMin : rawMin;
      var xmax = (rawMax === null || !isFinite(rawMax)) ? natMax : rawMax;

      if (xmin >= xmax) { flashError(); return; }

      // ¿El usuario escribió algo significativo?
      var typed = minInput.value.trim() !== '' || maxInput.value.trim() !== '';
      var isFullRange = (xmin === natMin && xmax === natMax);

      if (!typed || isFullRange) {
        mod._userRange = null;
        wrap.classList.remove('has-range');
        if (mod._recompute) mod._recompute();
        if (window.CoreUtils && window.CoreUtils.announce)
          window.CoreUtils.announce('Rango completo');
        return;
      }

      // Nunca guardar ±Infinity (evita loop infinito en drawGraph)
      mod._userRange = [xmin, xmax];
      lastSyncedSig = xmin + ',' + xmax;   // marcar como sincronizado
      // Actualizar inputs con los valores efectivos
      minInput.value = String(xmin);
      maxInput.value = String(xmax);
      wrap.classList.add('has-range');

      if (mod._recompute) mod._recompute();
      if (window.CoreUtils && window.CoreUtils.announce)
        window.CoreUtils.announce('Rango aplicado: ' + xmin + ' a ' + xmax);
    }

    function resetRange() {
      var mod = window[id + 'Module'];
      if (!mod) return;
      mod._userRange = null;
      lastSyncedSig = 'null';
      minInput.value = '';
      maxInput.value = '';
      wrap.classList.remove('has-range');
      if (mod._recompute) mod._recompute();
      if (window.CoreUtils && window.CoreUtils.announce)
        window.CoreUtils.announce('Rango completo (∞) restaurado');
    }

    applyBtn.addEventListener('click', applyRange);
    resetBtn.addEventListener('click', resetRange);
    minInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); applyRange(); }
    });
    maxInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); applyRange(); }
    });

    // Solo sincroniza si el usuario NO está escribiendo
    minInput.addEventListener('input', function () { wrap.classList.remove('has-range'); });
    maxInput.addEventListener('input', function () { wrap.classList.remove('has-range'); });

    setTimeout(syncInputsFromModule, 120);
    clearInterval(graphPanel._afSyncTimer);
    // Timer con auto-destroy: si el panel se desconecta del DOM, se limpia solo
    graphPanel._afSyncTimer = setInterval(function () {
      if (!graphPanel.isConnected) {
        clearInterval(graphPanel._afSyncTimer);
        graphPanel._afSyncTimer = null;
        return;
      }
      syncInputsFromModule();
    }, 800);
  }

  // =========================================================
  // Init
  // =========================================================
  function init() {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', afterDom);
    else afterDom();
  }
  function afterDom() {
    initClickableTitle();
    ensureBottomNavAlwaysVisible();
    injectEmptyState();
    installSkeletonOnOpen();
    installLongPress();
    installRangeSelector();
    document.documentElement.classList.add('ui-v14-ready');
  }

  init();

  window.UIV14 = { version: 'v14' };
})();
